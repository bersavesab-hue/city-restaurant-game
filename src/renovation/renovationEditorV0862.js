'use strict';

// V0862_PRO_RENOVATION_EDITOR
//
// Turns the old count-based renovation page into a real mobile editor layer.
// Tables and soft decor become persistent placement objects. Table placement
// snaps to the actual usable dining slots generated from property geometry.

const VERSION = 'V0862_PRO_RENOVATION_EDITOR';

const TABLE_KINDS = ['table2', 'table4', 'table6', 'table8'];
const DECOR_KINDS = ['plant', 'sofa', 'screen', 'pendant'];

const TABLE_SEATS = {
  table2: '2',
  table4: '4',
  table6: '6',
  table8: '8'
};

const DECOR_LABELS = {
  plant: '绿植',
  sofa: '沙发',
  screen: '屏风',
  pendant: '吊灯'
};

const ASSET_KEYS = {
  table2: 'reno_table_2',
  table4: 'reno_table_4',
  table6: 'reno_table_6',
  table8: 'reno_table_8',
  plant: 'reno_plant_1',
  sofa: 'reno_sofa',
  screen: 'reno_screen',
  pendant: 'reno_pendant'
};

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}


function formatMoney(value) {
  const n = Math.max(0, Number(value) || 0);

  if (n >= 100000000) {
    return '¥' + (n / 100000000).toFixed(n >= 1000000000 ? 1 : 2).replace(/\.0+$/, '') + '亿';
  }

  if (n >= 10000) {
    return '¥' + (n / 10000).toFixed(n >= 1000000 ? 0 : 1).replace(/\.0$/, '') + '万';
  }

  return '¥' + Math.round(n).toLocaleString();
}

function isTableKind(kind) {
  return TABLE_KINDS.includes(kind);
}

function isDecorKind(kind) {
  return DECOR_KINDS.includes(kind);
}

function kindLabel(kind) {
  if (isTableKind(kind)) {
    return TABLE_SEATS[kind] + '人桌';
  }

  return DECOR_LABELS[kind] || kind;
}

function makeSignature(plan) {
  if (!plan) return '';

  const tablePart = (plan.floors || [])
    .map(floor => {
      const tables = floor.tables || {};
      return ['2', '4', '6', '8']
        .map(key => Math.max(0, Number(tables[key]) || 0))
        .join(',');
    })
    .join('|');

  const decor = plan.decorCounts || {};

  const decorPart = DECOR_KINDS
    .map(key => Math.max(0, Number(decor[key]) || 0))
    .join(',');

  return tablePart + '::' + decorPart;
}

function nextId(plan, floorIndex, kind) {
  plan.editorPlacementSeq =
    Math.max(0, Number(plan.editorPlacementSeq) || 0) + 1;

  return (
    'reno_item_' +
    floorIndex +
    '_' +
    kind +
    '_' +
    plan.editorPlacementSeq
  );
}

function tablePlacementCount(placements, key) {
  const kind = 'table' + key;
  return placements.filter(item => item.kind === kind).length;
}

function decorPlacementCount(plan, kind) {
  let count = 0;

  for (const floor of plan.floors || []) {
    count += (floor.editorPlacements || [])
      .filter(item => item.kind === kind)
      .length;
  }

  return count;
}

function distanceSquared(a, b) {
  const dx = Number(a.mx) - Number(b.x);
  const dy = Number(a.my) - Number(b.y);
  return dx * dx + dy * dy;
}

function occupiedSlot(slot, placements, ignoreId) {
  return placements.some(item => {
    if (
      !isTableKind(item.kind) ||
      item.id === ignoreId
    ) {
      return false;
    }

    const dx = Number(item.mx) - Number(slot.x);
    const dy = Number(item.my) - Number(slot.y);

    return Math.sqrt(dx * dx + dy * dy) < 0.58;
  });
}

function nearestFreeSlot(slots, placements, target, ignoreId) {
  const open = (slots || [])
    .filter(slot => !occupiedSlot(slot, placements, ignoreId));

  if (!open.length) return null;

  const point = target || open[0];

  return open
    .slice()
    .sort((a, b) => {
      const da =
        Math.pow(Number(a.x) - Number(point.mx ?? point.x), 2) +
        Math.pow(Number(a.y) - Number(point.my ?? point.y), 2);

      const db =
        Math.pow(Number(b.x) - Number(point.mx ?? point.x), 2) +
        Math.pow(Number(b.y) - Number(point.my ?? point.y), 2);

      return da - db;
    })[0];
}

function decorCandidates(geometry) {
  const width = Math.max(1, Number(geometry.widthM) || 1);
  const depth = Math.max(1, Number(geometry.depthM) || 1);

  return [
    { x: width * 0.86, y: depth * 0.84 },
    { x: width * 0.72, y: depth * 0.84 },
    { x: width * 0.16, y: depth * 0.84 },
    { x: width * 0.88, y: depth * 0.62 },
    { x: width * 0.20, y: depth * 0.62 },
    { x: width * 0.56, y: depth * 0.82 },
    { x: width * 0.42, y: depth * 0.82 },
    { x: width * 0.82, y: depth * 0.50 }
  ];
}

function collidesWithObstacle(point, obstacle) {
  if (!obstacle) return false;

  if (obstacle.type === 'column') {
    const dx = Number(point.x) - Number(obstacle.x);
    const dy = Number(point.y) - Number(obstacle.y);
    return Math.sqrt(dx * dx + dy * dy) <
      (Number(obstacle.radius) || 0.22) + 0.45;
  }

  return (
    Number(point.x) >= Number(obstacle.x) - 0.35 &&
    Number(point.x) <= Number(obstacle.x) + Number(obstacle.w || 0) + 0.35 &&
    Number(point.y) >= Number(obstacle.y) - 0.35 &&
    Number(point.y) <= Number(obstacle.y) + Number(obstacle.h || 0) + 0.35
  );
}

function safeDecorPoint(point, geometry, floorGeometrySystem) {
  if (
    !point ||
    !geometry ||
    !floorGeometrySystem.pointInPolygon(
      { x: Number(point.x), y: Number(point.y) },
      geometry.polygon || []
    )
  ) {
    return false;
  }

  for (const obstacle of geometry.obstacles || []) {
    if (collidesWithObstacle(point, obstacle)) {
      return false;
    }
  }

  for (const entrance of geometry.entrances || []) {
    const dx = Math.abs(Number(point.x) - Number(entrance.x));
    const dy = Math.abs(Number(point.y) - Number(entrance.y));

    if (
      dx < (Number(entrance.width) || 1.2) * 0.6 &&
      dy < 1.15
    ) {
      return false;
    }
  }

  return true;
}

function findDecorPoint(geometry, placements, floorGeometrySystem) {
  const candidates = decorCandidates(geometry);

  for (const point of candidates) {
    if (!safeDecorPoint(point, geometry, floorGeometrySystem)) {
      continue;
    }

    const crowded = (placements || []).some(item => {
      const dx = Number(item.mx) - Number(point.x);
      const dy = Number(item.my) - Number(point.y);
      return Math.sqrt(dx * dx + dy * dy) < 0.8;
    });

    if (!crowded) {
      return point;
    }
  }

  const fallback = {
    x: Math.max(0.7, Number(geometry.widthM) * 0.75),
    y: Math.max(0.7, Number(geometry.depthM) * 0.75)
  };

  return safeDecorPoint(fallback, geometry, floorGeometrySystem)
    ? fallback
    : null;
}

function visualSize(kind, scale) {
  const s = Math.max(8, Number(scale) || 12);

  if (kind === 'table8') {
    return {
      w: clamp(s * 3.25, 34, 64),
      h: clamp(s * 2.10, 25, 48)
    };
  }

  if (kind === 'table6') {
    return {
      w: clamp(s * 2.90, 32, 58),
      h: clamp(s * 2.05, 24, 45)
    };
  }

  if (kind === 'table4') {
    return {
      w: clamp(s * 2.50, 30, 50),
      h: clamp(s * 2.15, 26, 46)
    };
  }

  if (kind === 'table2') {
    return {
      w: clamp(s * 2.15, 28, 45),
      h: clamp(s * 1.90, 24, 40)
    };
  }

  if (kind === 'sofa') {
    return {
      w: clamp(s * 2.7, 34, 54),
      h: clamp(s * 1.45, 21, 34)
    };
  }

  if (kind === 'screen') {
    return {
      w: clamp(s * 1.65, 24, 36),
      h: clamp(s * 2.25, 30, 46)
    };
  }

  return {
    w: clamp(s * 1.65, 22, 34),
    h: clamp(s * 1.80, 23, 38)
  };
}

function syncPlacements(scene, deps) {
  if (!scene || !scene.shopId) return false;

  const current = scene.getPlan();

  if (
    !current ||
    current.status === 'constructing' ||
    current.status === 'completed'
  ) {
    return false;
  }

  const expected = makeSignature(current);

  if (
    Number(current.editorPlacementVersion) >= 2 &&
    current.editorPlacementSignature === expected
  ) {
    return false;
  }

  const shop = scene.getShop();

  deps.renovationSystem.mutatePlan(
    scene.shopId,
    plan => {
      plan.editorPlacementVersion = 2;
      plan.editorPlacementSeq =
        Math.max(0, Number(plan.editorPlacementSeq) || 0);

      for (let floorIndex = 0; floorIndex < plan.floors.length; floorIndex++) {
        const floor = plan.floors[floorIndex];

        if (!Array.isArray(floor.editorPlacements)) {
          floor.editorPlacements = [];
        }

        const geometry =
          deps.floorGeometrySystem.getFloorGeometry(
            shop,
            floorIndex,
            floor.area,
            plan.floors.length
          );

        const slots =
          deps.renovationSystem.getUsableDiningSlots(
            geometry,
            floor
          );

        for (const key of ['2', '4', '6', '8']) {
          const desired =
            Math.max(0, Number(floor.tables && floor.tables[key]) || 0);

          let actual =
            tablePlacementCount(floor.editorPlacements, key);

          while (actual > desired) {
            const index =
              floor.editorPlacements
                .map((item, idx) => ({ item, idx }))
                .reverse()
                .find(row => row.item.kind === 'table' + key);

            if (!index) break;

            floor.editorPlacements.splice(index.idx, 1);
            actual--;
          }

          while (actual < desired) {
            const slot =
              nearestFreeSlot(
                slots,
                floor.editorPlacements,
                slots[Math.min(actual, Math.max(0, slots.length - 1))]
              );

            if (!slot) break;

            floor.editorPlacements.push({
              id: nextId(plan, floorIndex, 'table' + key),
              kind: 'table' + key,
              mx: Number(slot.x),
              my: Number(slot.y),
              rotation: key === '8' || key === '6' ? 90 : 0
            });

            actual++;
          }
        }
      }

      for (const kind of DECOR_KINDS) {
        const desired =
          Math.max(0, Number(plan.decorCounts && plan.decorCounts[kind]) || 0);

        let actual =
          decorPlacementCount(plan, kind);

        while (actual > desired) {
          let removed = false;

          for (
            let floorIndex = plan.floors.length - 1;
            floorIndex >= 0 && !removed;
            floorIndex--
          ) {
            const list = plan.floors[floorIndex].editorPlacements || [];
            const idx =
              list.map((item, index) => ({ item, index }))
                .reverse()
                .find(row => row.item.kind === kind);

            if (idx) {
              list.splice(idx.index, 1);
              removed = true;
              actual--;
            }
          }

          if (!removed) break;
        }

        while (actual < desired) {
          const floorIndex =
            clamp(
              Number(plan.activeFloor) || 0,
              0,
              plan.floors.length - 1
            );

          const floor = plan.floors[floorIndex];
          const geometry =
            deps.floorGeometrySystem.getFloorGeometry(
              shop,
              floorIndex,
              floor.area,
              plan.floors.length
            );

          const point =
            findDecorPoint(
              geometry,
              floor.editorPlacements || [],
              deps.floorGeometrySystem
            );

          if (!point) break;

          floor.editorPlacements.push({
            id: nextId(plan, floorIndex, kind),
            kind,
            mx: Number(point.x),
            my: Number(point.y),
            rotation: 0
          });

          actual++;
        }
      }

      plan.editorPlacementSignature = makeSignature(plan);
    },
    { skipHistory: true }
  );

  return true;
}

function currentPlacement(scene) {
  const plan = scene.getPlan();

  if (!plan || !scene._editorSelectedId) return null;

  for (const floor of plan.floors || []) {
    const item = (floor.editorPlacements || [])
      .find(row => row.id === scene._editorSelectedId);

    if (item) {
      return {
        item,
        floorIndex: floor.index
      };
    }
  }

  return null;
}

function currentMode(scene) {
  return scene._editorMode || 'zones';
}

function addPlacement(scene, deps, kind) {
  syncPlacements(scene, deps);

  const metrics = scene.getMetrics();
  const plan = scene.getPlan();
  const shop = scene.getShop();

  if (!metrics || !plan || !shop) {
    return { ok: false, message: '装修数据暂不可用' };
  }

  const floorIndex =
    clamp(Number(plan.activeFloor) || 0, 0, plan.floors.length - 1);

  const floor = plan.floors[floorIndex];
  const metric =
    metrics.floors.find(row => row.index === floorIndex) ||
    metrics.floors[floorIndex];

  if (isTableKind(kind)) {
    const key = TABLE_SEATS[kind];

    const extraArea =
      (Number(deps.renovationConfig.tableFootprint[key]) || 0) *
      Number(metric && metric.aisle && metric.aisle.areaFactor || 1);

    const placements = floor.editorPlacements || [];
    const slots = metric && metric.usableDiningSlots || [];
    const slot = nearestFreeSlot(slots, placements, null);

    if (
      !slot ||
      Number(metric.remainingArea) + 0.01 < extraArea
    ) {
      return {
        ok: false,
        message:
          !slot
            ? '餐桌落位点已满，请先扩大堂食区'
            : '堂食剩余面积不足，无法继续摆桌'
      };
    }

    let createdId = null;

    deps.renovationSystem.mutatePlan(
      scene.shopId,
      mutable => {
        const target = mutable.floors[floorIndex];

        if (!Array.isArray(target.editorPlacements)) {
          target.editorPlacements = [];
        }

        target.tables[key] =
          Math.max(0, Number(target.tables[key]) || 0) + 1;

        createdId = nextId(mutable, floorIndex, kind);

        target.editorPlacements.push({
          id: createdId,
          kind,
          mx: Number(slot.x),
          my: Number(slot.y),
          rotation: key === '8' || key === '6' ? 90 : 0
        });

        mutable.editorPlacementVersion = 2;
        mutable.editorPlacementSignature = makeSignature(mutable);
      }
    );

    scene._editorSelectedId = createdId;
    deps.saveSystem.autoSave(true);
    scene.requestRenderNow();

    return {
      ok: true,
      id: createdId,
      message: '已放置' + kindLabel(kind) + '，可以直接拖动'
    };
  }

  if (isDecorKind(kind)) {
    const configItem =
      (deps.renovationConfig.decorItems || [])
        .find(item => item.id === kind);

    const current =
      Math.max(0, Number(plan.decorCounts && plan.decorCounts[kind]) || 0);

    if (configItem && current >= Number(configItem.max || 0)) {
      return {
        ok: false,
        message: kindLabel(kind) + '已达到上限'
      };
    }

    const geometry =
      deps.floorGeometrySystem.getFloorGeometry(
        shop,
        floorIndex,
        floor.area,
        plan.floors.length
      );

    const point =
      findDecorPoint(
        geometry,
        floor.editorPlacements || [],
        deps.floorGeometrySystem
      );

    if (!point) {
      return {
        ok: false,
        message: '当前平面没有合适的软装落位点'
      };
    }

    let createdId = null;

    deps.renovationSystem.mutatePlan(
      scene.shopId,
      mutable => {
        const target = mutable.floors[floorIndex];

        if (!Array.isArray(target.editorPlacements)) {
          target.editorPlacements = [];
        }

        if (!mutable.decorCounts) {
          mutable.decorCounts = {};
        }

        mutable.decorCounts[kind] =
          Math.max(0, Number(mutable.decorCounts[kind]) || 0) + 1;

        createdId = nextId(mutable, floorIndex, kind);

        target.editorPlacements.push({
          id: createdId,
          kind,
          mx: Number(point.x),
          my: Number(point.y),
          rotation: 0
        });

        mutable.editorPlacementVersion = 2;
        mutable.editorPlacementSignature = makeSignature(mutable);
      }
    );

    scene._editorSelectedId = createdId;
    deps.saveSystem.autoSave(true);
    scene.requestRenderNow();

    return {
      ok: true,
      id: createdId,
      message: '已放置' + kindLabel(kind)
    };
  }

  return { ok: false, message: '未知家具类型' };
}

function deleteSelected(scene, deps) {
  const selected = currentPlacement(scene);

  if (!selected) {
    return {
      ok: false,
      message: '请先选中一个家具'
    };
  }

  deps.renovationSystem.mutatePlan(
    scene.shopId,
    plan => {
      const floor = plan.floors[selected.floorIndex];
      const item = (floor.editorPlacements || [])
        .find(row => row.id === selected.item.id);

      if (!item) return;

      if (isTableKind(item.kind)) {
        const key = TABLE_SEATS[item.kind];
        floor.tables[key] =
          Math.max(0, Number(floor.tables[key]) || 0) - 1;
      } else if (isDecorKind(item.kind)) {
        if (!plan.decorCounts) plan.decorCounts = {};
        plan.decorCounts[item.kind] =
          Math.max(0, Number(plan.decorCounts[item.kind]) || 0) - 1;
      }

      floor.editorPlacements =
        (floor.editorPlacements || [])
          .filter(row => row.id !== item.id);

      plan.editorPlacementSignature = makeSignature(plan);
    }
  );

  scene._editorSelectedId = null;
  deps.saveSystem.autoSave(true);
  scene.requestRenderNow();

  return {
    ok: true,
    message: '已删除家具'
  };
}

function rotateSelected(scene, deps) {
  const selected = currentPlacement(scene);

  if (!selected) {
    return {
      ok: false,
      message: '请先选中一个家具'
    };
  }

  deps.renovationSystem.mutatePlan(
    scene.shopId,
    plan => {
      const item =
        plan.floors[selected.floorIndex]
          .editorPlacements
          .find(row => row.id === selected.item.id);

      if (!item) return;

      item.rotation =
        ((Number(item.rotation) || 0) + 90) % 180;
    }
  );

  deps.saveSystem.autoSave(true);
  scene.requestRenderNow();

  return {
    ok: true,
    message: '已旋转90°'
  };
}

function resnapTables(scene, deps) {
  const plan = scene.getPlan();
  const shop = scene.getShop();

  if (!plan || !shop) return false;

  deps.renovationSystem.mutatePlan(
    scene.shopId,
    mutable => {
      for (let floorIndex = 0; floorIndex < mutable.floors.length; floorIndex++) {
        const floor = mutable.floors[floorIndex];

        if (!Array.isArray(floor.editorPlacements)) continue;

        const geometry =
          deps.floorGeometrySystem.getFloorGeometry(
            shop,
            floorIndex,
            floor.area,
            mutable.floors.length
          );

        const slots =
          deps.renovationSystem.getUsableDiningSlots(
            geometry,
            floor
          );

        const tables =
          floor.editorPlacements.filter(item => isTableKind(item.kind));

        const assigned = [];

        for (const item of tables) {
          const slot =
            nearestFreeSlot(
              slots,
              assigned,
              { mx: item.mx, my: item.my },
              null
            );

          if (!slot) continue;

          item.mx = Number(slot.x);
          item.my = Number(slot.y);

          assigned.push({
            id: item.id,
            kind: item.kind,
            mx: item.mx,
            my: item.my
          });
        }
      }
    },
    { skipHistory: true }
  );

  return true;
}

function drawRect(ctx, x, y, w, h, fill, stroke, radius) {
  ctx.save();
  ctx.beginPath();

  if (typeof ctx.roundRect === 'function') {
    ctx.roundRect(x, y, w, h, radius || 8);
  } else {
    ctx.rect(x, y, w, h);
  }

  if (fill) {
    ctx.fillStyle = fill;
    ctx.fill();
  }

  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  ctx.restore();
}

function drawZoneFill(scene, ctx, geometry, frame, floor) {
  const kitchenRatio =
    clamp(Number(floor.kitchenRatio) || 0, 0, 1);

  const storageRatio =
    clamp(Number(floor.storageRatio) || 0, 0, 1);

  const serviceRatio =
    clamp(Number(floor.serviceRatio) || 0, 0, 1);

  const diningRatio =
    Math.max(0, 1 - kitchenRatio - storageRatio - serviceRatio);

  const backRatio =
    clamp(kitchenRatio + storageRatio, 0.01, 0.88);

  const kitchenWidthRatio =
    clamp(kitchenRatio / backRatio, 0.08, 0.92);

  const lowerRatio =
    Math.max(0.01, serviceRatio + diningRatio);

  const serviceWidthRatio =
    clamp(serviceRatio / lowerRatio, 0.05, 0.72);

  ctx.save();
  scene.geometryPath(ctx, geometry, frame);
  ctx.clip();

  ctx.fillStyle = 'rgba(74,91,98,0.18)';
  ctx.fillRect(
    frame.x,
    frame.y,
    frame.w * kitchenWidthRatio,
    frame.h * backRatio
  );

  ctx.fillStyle = 'rgba(155,123,78,0.16)';
  ctx.fillRect(
    frame.x + frame.w * kitchenWidthRatio,
    frame.y,
    frame.w * (1 - kitchenWidthRatio),
    frame.h * backRatio
  );

  ctx.fillStyle = 'rgba(66,137,154,0.12)';
  ctx.fillRect(
    frame.x,
    frame.y + frame.h * backRatio,
    frame.w * serviceWidthRatio,
    frame.h * (1 - backRatio)
  );

  ctx.fillStyle = 'rgba(248,208,119,0.12)';
  ctx.fillRect(
    frame.x + frame.w * serviceWidthRatio,
    frame.y + frame.h * backRatio,
    frame.w * (1 - serviceWidthRatio),
    frame.h * (1 - backRatio)
  );

  ctx.restore();

  return {
    backRatio,
    kitchenWidthRatio,
    serviceWidthRatio
  };
}

function drawGrid(scene, ctx, geometry, frame) {
  ctx.save();
  scene.geometryPath(ctx, geometry, frame);
  ctx.clip();

  ctx.strokeStyle = 'rgba(70,89,98,0.09)';
  ctx.lineWidth = 0.8;

  const step = Math.max(12, frame.scale);

  for (let x = frame.x; x <= frame.x + frame.w; x += step) {
    ctx.beginPath();
    ctx.moveTo(x, frame.y);
    ctx.lineTo(x, frame.y + frame.h);
    ctx.stroke();
  }

  for (let y = frame.y; y <= frame.y + frame.h; y += step) {
    ctx.beginPath();
    ctx.moveTo(frame.x, y);
    ctx.lineTo(frame.x + frame.w, y);
    ctx.stroke();
  }

  ctx.restore();
}

function drawObstacles(scene, ctx, geometry, frame, colors) {
  for (const obstacle of geometry.obstacles || []) {
    if (obstacle.type === 'column') {
      const p = scene.mapGeometryPoint(frame, obstacle);

      ctx.save();
      ctx.beginPath();
      ctx.arc(
        p.x,
        p.y,
        Math.max(4, Number(obstacle.radius || 0.22) * frame.scale),
        0,
        Math.PI * 2
      );
      ctx.fillStyle = '#5E6668';
      ctx.fill();
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 1.2;
      ctx.stroke();
      ctx.restore();

      continue;
    }

    const x = frame.x + Number(obstacle.x) * frame.scale;
    const y = frame.y + Number(obstacle.y) * frame.scale;
    const w = Number(obstacle.w || 0) * frame.scale;
    const h = Number(obstacle.h || 0) * frame.scale;

    drawRect(
      ctx,
      x,
      y,
      w,
      h,
      'rgba(91,99,101,0.22)',
      '#707A7D',
      4
    );

    scene.text(
      ctx,
      obstacle.type === 'toilet' ? '卫生间' : '楼梯',
      x + w / 2,
      y + h / 2,
      4.4,
      colors.navy,
      '800',
      'center'
    );
  }
}

function drawEntrances(scene, ctx, geometry, frame, mode) {
  for (let i = 0; i < (geometry.entrances || []).length; i++) {
    const entrance = geometry.entrances[i];
    const p = scene.mapGeometryPoint(frame, entrance);
    const widthPx =
      Math.max(12, Number(entrance.width || 1.2) * frame.scale);

    ctx.save();
    ctx.strokeStyle = i === 0 ? '#D85C4E' : '#2D91BD';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(p.x - widthPx / 2, p.y);
    ctx.lineTo(p.x + widthPx / 2, p.y);
    ctx.stroke();

    if (mode === 'furniture') {
      ctx.setLineDash([3, 3]);
      ctx.strokeStyle = 'rgba(216,92,78,0.48)';
      ctx.lineWidth = 1;
      ctx.strokeRect(
        p.x - widthPx / 2 - 4,
        p.y - Math.max(18, frame.scale * 1.2),
        widthPx + 8,
        Math.max(18, frame.scale * 1.2)
      );
    }

    ctx.restore();
  }
}

function drawFixedEquipment(scene, ctx, frame, ratios) {
  const kitchenBottom =
    frame.y + frame.h * ratios.backRatio;

  const kitchenTop =
    frame.y + 5;

  const kitchenH =
    Math.max(24, kitchenBottom - kitchenTop - 10);

  const iconH =
    Math.min(36, Math.max(22, kitchenH * 0.48));

  scene.drawImageContain(
    ctx,
    'reno_stove',
    frame.x + 7,
    kitchenTop + 4,
    Math.min(45, frame.w * 0.16),
    iconH,
    1
  );

  scene.drawImageContain(
    ctx,
    'reno_prep',
    frame.x + Math.min(55, frame.w * 0.19),
    kitchenTop + 4,
    Math.min(46, frame.w * 0.16),
    iconH,
    1
  );

  scene.drawImageContain(
    ctx,
    'reno_sink',
    frame.x + Math.min(106, frame.w * 0.36),
    kitchenTop + 4,
    Math.min(34, frame.w * 0.11),
    iconH,
    1
  );

  scene.drawImageContain(
    ctx,
    'reno_storage_shelf',
    frame.x + frame.w * 0.76,
    kitchenTop + 3,
    Math.min(46, frame.w * 0.18),
    iconH,
    1
  );

  scene.drawImageContain(
    ctx,
    'reno_cashier',
    frame.x + 6,
    frame.y + frame.h * ratios.backRatio + 10,
    Math.min(42, frame.w * 0.15),
    Math.min(35, frame.h * 0.16),
    1
  );
}

function drawZoneLines(scene, ctx, frame, floor, ratios, colors, active) {
  const horizontalY =
    frame.y + frame.h * ratios.backRatio;

  const topSplitX =
    frame.x + frame.w * ratios.kitchenWidthRatio;

  const serviceSplitX =
    frame.x + frame.w * ratios.serviceWidthRatio;

  ctx.save();
  ctx.strokeStyle =
    active
      ? 'rgba(255,255,255,0.96)'
      : 'rgba(255,255,255,0.45)';
  ctx.lineWidth = active ? 2.2 : 1.2;
  ctx.setLineDash(active ? [6, 4] : [3, 4]);

  ctx.beginPath();
  ctx.moveTo(frame.x, horizontalY);
  ctx.lineTo(frame.x + frame.w, horizontalY);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(topSplitX, frame.y);
  ctx.lineTo(topSplitX, horizontalY);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(serviceSplitX, horizontalY);
  ctx.lineTo(serviceSplitX, frame.y + frame.h);
  ctx.stroke();

  ctx.restore();

  if (!active) return;

  const handles = [
    {
      type: 'back',
      x: frame.x + frame.w * 0.54,
      y: horizontalY
    },
    {
      type: 'kitchen-storage',
      x: topSplitX,
      y: frame.y + frame.h * ratios.backRatio * 0.5
    },
    {
      type: 'service',
      x: serviceSplitX,
      y: horizontalY + (frame.y + frame.h - horizontalY) * 0.5
    }
  ];

  for (const handle of handles) {
    const dragging =
      scene.areaDrag &&
      scene.areaDrag.type === handle.type;

    ctx.save();
    ctx.beginPath();
    ctx.arc(handle.x, handle.y, dragging ? 8 : 6.5, 0, Math.PI * 2);
    ctx.fillStyle = dragging ? '#FFAD00' : '#FFD957';
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 2;
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }
}

function drawZoneBadges(scene, ctx, frame, floorMetric, colors) {
  const rows = [
    ['后厨', Number(floorMetric.kitchenArea || 0), frame.x + 7, frame.y + 10],
    ['仓储', Number(floorMetric.storageArea || 0), frame.x + frame.w - 70, frame.y + 10],
    ['服务', Number(floorMetric.serviceArea || 0), frame.x + 7, frame.y + frame.h - 27],
    ['堂食', Number(floorMetric.diningArea || 0), frame.x + frame.w - 70, frame.y + frame.h - 27]
  ];

  for (const row of rows) {
    drawRect(
      ctx,
      row[2],
      row[3],
      63,
      21,
      'rgba(18,45,58,0.78)',
      'rgba(255,255,255,0.18)',
      8
    );

    scene.text(
      ctx,
      row[0] + ' ' + Math.round(row[1]) + '㎡',
      row[2] + 31.5,
      row[3] + 10.5,
      4.7,
      colors.white,
      '800',
      'center'
    );
  }
}

function drawSlots(scene, ctx, slots, placements, frame, colors) {
  for (const slot of slots || []) {
    if (occupiedSlot(slot, placements, null)) continue;

    const p = scene.mapGeometryPoint(frame, slot);

    ctx.save();
    ctx.beginPath();
    ctx.arc(p.x, p.y, 4.2, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,226,129,0.64)';
    ctx.strokeStyle = 'rgba(216,161,29,0.72)';
    ctx.lineWidth = 1;
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }
}

function drawPlacements(scene, ctx, floor, frame, mode, colors) {
  const placements = floor.editorPlacements || [];
  const rects = [];

  for (const item of placements) {
    let mx = Number(item.mx);
    let my = Number(item.my);

    if (
      scene._editorDragPreview &&
      scene._editorDragPreview.id === item.id
    ) {
      mx = Number(scene._editorDragPreview.mx);
      my = Number(scene._editorDragPreview.my);
    }

    const point =
      scene.mapGeometryPoint(
        frame,
        { x: mx, y: my }
      );

    const size =
      visualSize(item.kind, frame.scale);

    const selected =
      scene._editorSelectedId === item.id;

    if (selected) {
      drawRect(
        ctx,
        point.x - size.w / 2 - 5,
        point.y - size.h / 2 - 5,
        size.w + 10,
        size.h + 10,
        'rgba(255,232,154,0.22)',
        '#F1B826',
        9
      );
    }

    ctx.save();
    ctx.translate(point.x, point.y);
    ctx.rotate((Number(item.rotation) || 0) * Math.PI / 180);

    scene.drawImageContain(
      ctx,
      ASSET_KEYS[item.kind] || 'reno_table_4',
      -size.w / 2,
      -size.h / 2,
      size.w,
      size.h,
      1
    );

    ctx.restore();

    if (selected && mode === 'furniture') {
      drawRect(
        ctx,
        point.x - 20,
        point.y - size.h / 2 - 19,
        40,
        16,
        '#FFF4C8',
        '#E2B43E',
        7
      );

      scene.text(
        ctx,
        '拖动',
        point.x,
        point.y - size.h / 2 - 11,
        4.4,
        colors.navy,
        '800',
        'center'
      );
    }

    rects.push({
      id: item.id,
      kind: item.kind,
      floorIndex: floor.index,
      x: point.x - Math.max(20, size.w / 2 + 7),
      y: point.y - Math.max(20, size.h / 2 + 7),
      w: Math.max(40, size.w + 14),
      h: Math.max(40, size.h + 14)
    });
  }

  scene._editorPlacementRects = rects;
}

function drawModeTabs(scene, ctx, y, colors, ui) {
  const tabs = [
    ['zones', '分区', 'page:zones'],
    ['furniture', '家具', 'page:furniture'],
    ['style', '风格', 'page:style'],
    ['rooms', '包厢', 'page:rooms'],
    ['templates', '模板', 'page:templates']
  ];

  const gap = 4;
  const x0 = 14;
  const totalW = 356;
  const w = (totalW - gap * 4) / 5;
  const mode = currentMode(scene);

  for (let i = 0; i < tabs.length; i++) {
    const x = x0 + i * (w + gap);
    const active =
      tabs[i][0] === mode &&
      tabs[i][0] !== 'templates';

    ui.card(
      ctx,
      x,
      y,
      w,
      32,
      {
        radius: 11,
        fill: active ? '#FFE59B' : '#F7F3EC',
        stroke: active ? '#E2B53B' : '#DED5C7',
        shadow: false
      }
    );

    scene.text(
      ctx,
      tabs[i][1],
      x + w / 2,
      y + 16,
      5.4,
      active ? colors.navy : colors.muted,
      '800',
      'center'
    );

    scene.addButton(
      tabs[i][2],
      x,
      y,
      w,
      32
    );
  }
}

function drawFurnitureContext(scene, ctx, metrics, floor, x, y, w, h, colors, ui) {
  const selected = currentPlacement(scene);

  if (selected) {
    const actions = [
      ['editor:rotate', '旋转'],
      ['editor:duplicate', '复制'],
      ['editor:delete', '删除'],
      ['editor:done', '完成']
    ];

    const gap = 6;
    const bw = (w - gap * 3) / 4;

    scene.text(
      ctx,
      kindLabel(selected.item.kind) + ' 已选中',
      x,
      y - 8,
      5.0,
      colors.navy,
      '800'
    );

    for (let i = 0; i < actions.length; i++) {
      const bx = x + i * (bw + gap);

      ui.card(
        ctx,
        bx,
        y,
        bw,
        h,
        {
          radius: 10,
          fill:
            actions[i][0] === 'editor:delete'
              ? '#FFF0EA'
              : actions[i][0] === 'editor:done'
                ? '#FFE49A'
                : '#F4F0E9',
          stroke:
            actions[i][0] === 'editor:delete'
              ? '#E3B1A7'
              : '#DDD2C3',
          shadow: false
        }
      );

      scene.text(
        ctx,
        actions[i][1],
        bx + bw / 2,
        y + h / 2,
        5.1,
        actions[i][0] === 'editor:delete'
          ? colors.red
          : colors.navy,
        '800',
        'center'
      );

      scene.addButton(actions[i][0], bx, y, bw, h);
    }

    return;
  }

  const palette = [
    ['table2', '2人', 'reno_table_2'],
    ['table4', '4人', 'reno_table_4'],
    ['table6', '6人', 'reno_table_6'],
    ['table8', '8人', 'reno_table_8'],
    ['plant', '绿植', 'reno_plant_1'],
    ['sofa', '沙发', 'reno_sofa']
  ];

  const gap = 5;
  const bw = (w - gap * 5) / 6;

  for (let i = 0; i < palette.length; i++) {
    const bx = x + i * (bw + gap);

    ui.card(
      ctx,
      bx,
      y,
      bw,
      h,
      {
        radius: 9,
        fill: '#FFF9EF',
        stroke: '#DDD2C3',
        shadow: false
      }
    );

    scene.drawImageContain(
      ctx,
      palette[i][2],
      bx + 5,
      y + 4,
      bw - 10,
      Math.max(19, h - 23),
      1
    );

    scene.text(
      ctx,
      palette[i][1],
      bx + bw / 2,
      y + h - 9,
      4.4,
      colors.navy,
      '800',
      'center'
    );

    scene.addButton(
      'editor:add:' + palette[i][0],
      bx,
      y,
      bw,
      h
    );
  }
}

function drawStyleContext(scene, ctx, metrics, x, y, w, h, colors, ui) {
  const styles = [
    ['wood', '原木', 'reno_style_natural'],
    ['modern_cn', '新中式', 'reno_style_chinese'],
    ['premium', '商务', 'reno_style_business']
  ];

  const gap = 7;
  const bw = (w - gap * 2) / 3;

  for (let i = 0; i < styles.length; i++) {
    const bx = x + i * (bw + gap);
    const active =
      metrics.plan.hallStyle === styles[i][0];

    ui.card(
      ctx,
      bx,
      y,
      bw,
      h,
      {
        radius: 10,
        fill: active ? '#FFF0BD' : '#FFF9EF',
        stroke: active ? '#E1B33B' : '#DDD3C5',
        lineWidth: active ? 1.5 : 1,
        shadow: false
      }
    );

    scene.drawImageCover(
      ctx,
      styles[i][2],
      bx + 3,
      y + 3,
      bw - 6,
      h - 20,
      7,
      null
    );

    scene.text(
      ctx,
      styles[i][1],
      bx + bw / 2,
      y + h - 9,
      4.8,
      colors.navy,
      '800',
      'center'
    );

    scene.addButton(
      'builtin:style:' + styles[i][0],
      bx,
      y,
      bw,
      h
    );
  }
}

function drawRoomsContext(scene, ctx, floor, x, y, w, h, colors, ui) {
  const count = (floor.privateRooms || []).length;
  const seats = (floor.privateRooms || [])
    .reduce((sum, room) => sum + Math.max(0, Number(room.seats) || 0), 0);

  scene.text(
    ctx,
    '当前 ' + count + ' 间包厢 · ' + seats + ' 个包厢席位',
    x,
    y + h / 2,
    5.4,
    colors.navy,
    '800'
  );

  ui.card(
    ctx,
    x + w - 130,
    y,
    130,
    h,
    {
      radius: 10,
      fill: '#FFE49A',
      stroke: '#E0B33C',
      shadow: false
    }
  );

  scene.text(
    ctx,
    '进入包厢管理 ›',
    x + w - 65,
    y + h / 2,
    5.2,
    colors.navy,
    '800',
    'center'
  );

  scene.addButton(
    'editor:rooms:manage',
    x + w - 130,
    y,
    130,
    h
  );
}

function install(options) {
  const {
    RenovationScene,
    renovationSystem,
    renovationConfig,
    floorGeometrySystem,
    saveSystem,
    runtime,
    ui,
    COLORS,
    V45_HALL_STYLE_VISUAL
  } = options || {};

  if (!RenovationScene || RenovationScene.prototype.__v0862Installed) {
    return false;
  }

  const deps = {
    renovationSystem,
    renovationConfig,
    floorGeometrySystem,
    saveSystem,
    runtime,
    ui,
    COLORS,
    V45_HALL_STYLE_VISUAL
  };

  const proto = RenovationScene.prototype;

  proto.__v0862Installed = true;

  const oldEnter = proto.enter;
  const oldExit = proto.exit;
  const oldRender = proto.render;
  const oldHandleTap = proto.handleTap;
  const oldTouchStart = proto.handleTouchStart;
  const oldTouchMove = proto.handleTouchMove;
  const oldTouchEnd = proto.handleTouchEnd;

  proto.enter = function enterV0862(payload) {
    oldEnter.call(this, payload);

    const requested =
      payload && payload.page;

    if (
      ['zones', 'furniture', 'style', 'rooms'].includes(requested)
    ) {
      this.page = 'layout';
      this._editorMode = requested;
    } else {
      this._editorMode = 'zones';
    }

    this._editorSelectedId = null;
    this._editorPlacementDrag = null;
    this._editorDragPreview = null;
    this._editorPlacementRects = [];

    syncPlacements(this, deps);
  };

  proto.exit = function exitV0862() {
    this._editorSelectedId = null;
    this._editorPlacementDrag = null;
    this._editorDragPreview = null;
    this._editorPlacementRects = [];
    oldExit.call(this);
  };

  proto.render = function renderV0862(ctx) {
    if (
      this.shopId &&
      this.page === 'layout'
    ) {
      syncPlacements(this, deps);
    }

    return oldRender.call(this, ctx);
  };

  proto.drawFloorCanvas = function drawFloorCanvasV0862(
    ctx,
    metrics,
    floor,
    x,
    y,
    w,
    h
  ) {
    const geometry =
      floor.geometry ||
      floorGeometrySystem.getFloorGeometry(
        this.getShop(),
        floor.index,
        floor.area,
        metrics.plan.floors.length
      );

    const frame =
      this.getGeometryFrame(
        geometry,
        x + 5,
        y + 5,
        w - 10,
        h - 10
      );

    const mode = currentMode(this);

    drawRect(
      ctx,
      x,
      y,
      w,
      h,
      '#F6F3EC',
      '#D7CEC1',
      11
    );

    ctx.save();
    this.geometryPath(ctx, geometry, frame);
    ctx.clip();

    ctx.fillStyle = '#F9F6EF';
    ctx.fillRect(frame.x, frame.y, frame.w, frame.h);

    const styleKey =
      V45_HALL_STYLE_VISUAL[metrics.plan.hallStyle] ||
      'reno_style_natural';

    ctx.globalAlpha = 0.10;

    this.drawImageCover(
      ctx,
      styleKey,
      frame.x,
      frame.y,
      frame.w,
      frame.h,
      0,
      null
    );

    ctx.restore();

    drawGrid(this, ctx, geometry, frame);

    const ratios =
      drawZoneFill(
        this,
        ctx,
        geometry,
        frame,
        floor
      );

    this.drawGeometryShell(ctx, geometry, frame);

    drawObstacles(this, ctx, geometry, frame, COLORS);
    drawEntrances(this, ctx, geometry, frame, mode);
    drawFixedEquipment(this, ctx, frame, ratios);

    const floorMetric =
      metrics.floors.find(row => row.index === floor.index) ||
      metrics.floors[metrics.plan.activeFloor];

    const placements =
      floor.editorPlacements || [];

    const slots =
      floorMetric && floorMetric.usableDiningSlots || [];

    if (mode === 'furniture') {
      drawSlots(
        this,
        ctx,
        slots,
        placements,
        frame,
        COLORS
      );
    }

    drawPlacements(
      this,
      ctx,
      floor,
      frame,
      mode,
      COLORS
    );

    drawZoneLines(
      this,
      ctx,
      frame,
      floor,
      ratios,
      COLORS,
      mode === 'zones'
    );

    if (mode === 'zones') {
      drawZoneBadges(
        this,
        ctx,
        frame,
        floorMetric,
        COLORS
      );
    }

    this.floorCanvasInteraction = {
      frame,
      floorIndex: floor.index,
      backRatio: ratios.backRatio,
      kitchenWidthRatio: ratios.kitchenWidthRatio,
      serviceWidthRatio: ratios.serviceWidthRatio
    };

    this.text(
      ctx,
      geometry.shapeName +
        ' · ' +
        geometry.widthM.toFixed(1) +
        'm × ' +
        geometry.depthM.toFixed(1) +
        'm · ' +
        geometry.areaM2.toFixed(0) +
        '㎡',
      x + w / 2,
      y + h - 8,
      4.5,
      COLORS.navy,
      '800',
      'center'
    );
  };

  proto.drawFloorPlan = function drawFloorPlanV0862(
    ctx,
    metrics,
    floor,
    geometry
  ) {
    const y = geometry.y;
    const h = geometry.planH;
    const mode = currentMode(this);

    ui.card(
      ctx,
      7,
      y,
      376,
      h,
      {
        radius: 15,
        fill: COLORS.panel,
        stroke: '#D8CEBF',
        shadow: false
      }
    );

    this.text(
      ctx,
      '门店空间编辑器',
      18,
      y + 18,
      9.4,
      COLORS.text,
      '800'
    );

    this.text(
      ctx,
      mode === 'furniture'
        ? '点选家具后可拖动 · 餐桌自动吸附合法落位点'
        : mode === 'style'
          ? '风格实时预览，不再跳出平面图'
          : mode === 'rooms'
            ? '包厢和堂食面积实时联动'
            : '拖动黄点/虚线调面积 · 真实户型约束',
      122,
      y + 18,
      4.6,
      COLORS.muted,
      '700'
    );

    ui.card(
      ctx,
      183,
      y + 4,
      47,
      28,
      {
        radius: 11,
        fill: '#E9F3F6',
        stroke: '#B9D2DB',
        shadow: false
      }
    );

    this.text(
      ctx,
      (metrics.plan.activeFloor + 1) + 'F',
      206.5,
      y + 18,
      5.8,
      COLORS.navy,
      '800',
      'center'
    );

    this.addButton('floor:next', 181, y + 2, 51, 32);

    this.text(ctx, '↶', 253, y + 18, 9.5, COLORS.navy, '800', 'center');
    this.text(ctx, '↷', 292, y + 18, 9.5, COLORS.navy, '800', 'center');

    this.addButton('history:undo', 235, y + 1, 36, 34);
    this.addButton('history:redo', 274, y + 1, 36, 34);

    ui.card(
      ctx,
      317,
      y + 4,
      57,
      28,
      {
        radius: 11,
        fill: '#FFF0B8',
        stroke: '#E0B33C',
        shadow: false
      }
    );

    this.text(
      ctx,
      '预览',
      345.5,
      y + 18,
      5.3,
      COLORS.navy,
      '800',
      'center'
    );

    this.addButton('preview', 315, y + 2, 61, 32);

    drawModeTabs(
      this,
      ctx,
      y + 39,
      COLORS,
      ui
    );

    let contextH = 47;

    if (mode === 'furniture') {
      contextH = 57;
    } else if (mode === 'style') {
      contextH = 60;
    }

    const canvasY = y + 77;
    const contextY = y + h - contextH - 7;
    const canvasH = Math.max(145, contextY - canvasY - 6);

    this.drawFloorCanvas(
      ctx,
      metrics,
      floor,
      14,
      canvasY,
      362,
      canvasH
    );

    if (mode === 'furniture') {
      drawFurnitureContext(
        this,
        ctx,
        metrics,
        floor,
        18,
        contextY,
        354,
        contextH,
        COLORS,
        ui
      );
    } else if (mode === 'style') {
      drawStyleContext(
        this,
        ctx,
        metrics,
        18,
        contextY,
        354,
        contextH,
        COLORS,
        ui
      );
    } else if (mode === 'rooms') {
      drawRoomsContext(
        this,
        ctx,
        floor,
        18,
        contextY + 5,
        354,
        contextH - 10,
        COLORS,
        ui
      );
    } else {
      const floorMetric =
        metrics.floors.find(row => row.index === floor.index) ||
        metrics.floors[metrics.plan.activeFloor];

      const labels = [
        ['后厨', floorMetric.kitchenArea],
        ['仓储', floorMetric.storageArea],
        ['服务', floorMetric.serviceArea],
        ['堂食', floorMetric.diningArea]
      ];

      const chipW = 80;
      const gap = 8;

      for (let i = 0; i < labels.length; i++) {
        const bx = 18 + i * (chipW + gap);

        ui.card(
          ctx,
          bx,
          contextY + 5,
          chipW,
          contextH - 10,
          {
            radius: 10,
            fill: i === 3 ? '#FFF1C2' : '#F5F1EA',
            stroke: '#DDD2C4',
            shadow: false
          }
        );

        this.text(
          ctx,
          labels[i][0],
          bx + 10,
          contextY + 17,
          4.4,
          COLORS.muted,
          '700'
        );

        this.text(
          ctx,
          Math.round(Number(labels[i][1]) || 0) + '㎡',
          bx + chipW - 9,
          contextY + 17,
          5.2,
          COLORS.navy,
          '800',
          'right'
        );
      }
    }
  };

  proto.drawTablePicker = function drawTablePickerV0862(
    ctx,
    floor,
    geometry
  ) {
    const x = 7;
    const y = geometry.lowerY;
    const w = 207;
    const h = geometry.lowerH;
    const mode = currentMode(this);
    const metrics = this.getMetrics();
    const floorMetric =
      metrics.floors.find(row => row.index === floor.index) ||
      metrics.floors[metrics.plan.activeFloor];

    ui.card(
      ctx,
      x,
      y,
      w,
      h,
      {
        radius: 13,
        fill: COLORS.panel,
        stroke: COLORS.line,
        shadow: false
      }
    );

    this.text(
      ctx,
      mode === 'furniture'
        ? '家具编辑'
        : mode === 'style'
          ? '当前风格'
          : mode === 'rooms'
            ? '包厢状态'
            : '分区状态',
      x + 11,
      y + 15,
      7.5,
      COLORS.text,
      '800'
    );

    if (mode === 'furniture') {
      const total =
        (floor.editorPlacements || []).length;
      const selected = currentPlacement(this);

      this.text(
        ctx,
        '本层已放 ' + total + ' 件 · ' +
          (selected
            ? '当前：' + kindLabel(selected.item.kind)
            : '点家具即可选中'),
        x + 11,
        y + 38,
        5.0,
        COLORS.navy,
        '800'
      );

      this.text(
        ctx,
        '空心黄点 = 可放餐桌位置；拖动后自动吸附',
        x + 11,
        y + 62,
        4.5,
        COLORS.muted,
        '700'
      );
    } else if (mode === 'style') {
      this.text(
        ctx,
        this.getName(
          renovationConfig.hallStyles,
          metrics.plan.hallStyle
        ) +
          ' · ' +
          this.getName(
            renovationConfig.materialGrades,
            metrics.plan.materialGrade
          ),
        x + 11,
        y + 42,
        5.5,
        COLORS.orange,
        '800'
      );
    } else if (mode === 'rooms') {
      const rooms = floor.privateRooms || [];
      const seats =
        rooms.reduce(
          (sum, room) => sum + Math.max(0, Number(room.seats) || 0),
          0
        );

      this.text(
        ctx,
        rooms.length + '间包厢 · ' + seats + '席',
        x + 11,
        y + 42,
        5.7,
        COLORS.navy,
        '800'
      );
    } else {
      this.text(
        ctx,
        '堂食 ' + Math.round(floorMetric.diningArea) + '㎡ · ' +
          '可摆 ' + floorMetric.effectiveDiningArea + '㎡',
        x + 11,
        y + 39,
        5.2,
        COLORS.navy,
        '800'
      );

      this.text(
        ctx,
        '直接拖动平面图中的黄色控制点',
        x + 11,
        y + 64,
        4.6,
        COLORS.muted,
        '700'
      );
    }
  };

  proto.drawMetrics = function drawMetricsV0862(
    ctx,
    metrics,
    geometry
  ) {
    const x = 219;
    const y = geometry.lowerY;
    const w = 164;
    const h = geometry.lowerH;
    const floor =
      metrics.floors[metrics.plan.activeFloor];

    ui.card(
      ctx,
      x,
      y,
      w,
      h,
      {
        radius: 13,
        fill: COLORS.panel,
        stroke: COLORS.line,
        shadow: false
      }
    );

    this.text(
      ctx,
      '方案结果',
      x + 11,
      y + 15,
      7.5,
      COLORS.text,
      '800'
    );

    ui.card(
      ctx,
      x + 104,
      y + 6,
      48,
      20,
      {
        radius: 10,
        fill: floor.valid ? '#E7F6ED' : '#FFF0EA',
        stroke: floor.valid ? '#B8DCC6' : '#E5B0A6',
        shadow: false
      }
    );

    this.text(
      ctx,
      floor.valid ? '可施工' : '需调整',
      x + 128,
      y + 16,
      4.5,
      floor.valid ? COLORS.green : COLORS.red,
      '800',
      'center'
    );

    const rows = [
      ['总席位', metrics.totalSeats + '席'],
      ['装修预算', formatMoney(metrics.totalCost)],
      ['装修评分', String(metrics.renovationScore)]
    ];

    for (let i = 0; i < rows.length; i++) {
      const ry = y + 37 + i * 21;

      this.text(
        ctx,
        rows[i][0],
        x + 11,
        ry,
        4.6,
        COLORS.muted,
        '700'
      );

      this.text(
        ctx,
        rows[i][1],
        x + w - 10,
        ry,
        5.5,
        i === 2 ? COLORS.orange : COLORS.navy,
        '800',
        'right'
      );
    }
  };

  proto.handleTap = function handleTapV0862(x, y) {
    const item = this.hitButton(x, y);

    if (item) {
      const id = item.id;

      if (
        id === 'page:zones' ||
        id === 'page:furniture' ||
        id === 'page:style' ||
        id === 'page:rooms'
      ) {
        this.page = 'layout';
        this._editorMode = id.slice('page:'.length);
        this._editorSelectedId = null;
        this._editorPlacementDrag = null;
        this._editorDragPreview = null;
        this.requestRenderNow();
        return true;
      }

      if (id === 'editor:rooms:manage') {
        this.page = 'rooms';
        this.requestRenderNow();
        return true;
      }

      if (id.indexOf('editor:add:') === 0) {
        const result =
          addPlacement(
            this,
            deps,
            id.slice('editor:add:'.length)
          );

        this.showToast(result.message);
        return true;
      }

      if (id === 'editor:rotate') {
        const result = rotateSelected(this, deps);
        this.showToast(result.message);
        return true;
      }

      if (id === 'editor:duplicate') {
        const selected = currentPlacement(this);

        const result =
          selected
            ? addPlacement(this, deps, selected.item.kind)
            : { ok: false, message: '请先选中一个家具' };

        this.showToast(result.message);
        return true;
      }

      if (id === 'editor:delete') {
        const result = deleteSelected(this, deps);
        this.showToast(result.message);
        return true;
      }

      if (id === 'editor:done') {
        this._editorSelectedId = null;
        this._editorPlacementDrag = null;
        this._editorDragPreview = null;
        this.requestRenderNow();
        return true;
      }
    }

    return oldHandleTap.call(this, x, y);
  };

  proto.handleTouchStart = function handleTouchStartV0862(x, y) {
    if (
      this.page === 'layout' &&
      currentMode(this) === 'furniture'
    ) {
      const rects = this._editorPlacementRects || [];

      for (let i = rects.length - 1; i >= 0; i--) {
        const rect = rects[i];

        if (
          x >= rect.x &&
          x <= rect.x + rect.w &&
          y >= rect.y &&
          y <= rect.y + rect.h
        ) {
          const selected = currentPlacement(this);

          if (
            !selected ||
            selected.item.id !== rect.id
          ) {
            this._editorSelectedId = rect.id;
          }

          const now = currentPlacement(this);

          if (!now) return true;

          renovationSystem.mutatePlan(
            this.shopId,
            () => {},
            { skipHistory: false }
          );

          this._editorPlacementDrag = {
            id: now.item.id,
            floorIndex: now.floorIndex,
            start: {
              mx: Number(now.item.mx),
              my: Number(now.item.my)
            }
          };

          this._editorDragPreview = {
            id: now.item.id,
            mx: Number(now.item.mx),
            my: Number(now.item.my)
          };

          this.requestRenderNow();
          return true;
        }
      }

      this._editorSelectedId = null;
      this._editorPlacementDrag = null;
      this._editorDragPreview = null;
      this.requestRenderNow();
      return false;
    }

    return oldTouchStart.call(this, x, y);
  };

  proto.handleTouchMove = function handleTouchMoveV0862(x, y) {
    if (
      this._editorPlacementDrag &&
      this.floorCanvasInteraction
    ) {
      const frame = this.floorCanvasInteraction.frame;

      const mx =
        clamp(
          (x - frame.x) / Math.max(0.01, frame.scale),
          0,
          frame.w / Math.max(0.01, frame.scale)
        );

      const my =
        clamp(
          (y - frame.y) / Math.max(0.01, frame.scale),
          0,
          frame.h / Math.max(0.01, frame.scale)
        );

      this._editorDragPreview = {
        id: this._editorPlacementDrag.id,
        mx,
        my
      };

      this.requestRenderNow();
      return true;
    }

    return oldTouchMove.call(this, x, y);
  };

  proto.handleTouchEnd = function handleTouchEndV0862() {
    if (this._editorPlacementDrag) {
      const drag = this._editorPlacementDrag;
      const preview = this._editorDragPreview;

      const plan = this.getPlan();
      const shop = this.getShop();

      const floor =
        plan && plan.floors[drag.floorIndex];

      const placement =
        floor &&
        (floor.editorPlacements || [])
          .find(item => item.id === drag.id);

      let target = null;

      if (floor && placement && preview) {
        const geometry =
          floorGeometrySystem.getFloorGeometry(
            shop,
            drag.floorIndex,
            floor.area,
            plan.floors.length
          );

        if (isTableKind(placement.kind)) {
          const slots =
            renovationSystem.getUsableDiningSlots(
              geometry,
              floor
            );

          target =
            nearestFreeSlot(
              slots,
              floor.editorPlacements || [],
              preview,
              placement.id
            );
        } else if (
          safeDecorPoint(
            { x: preview.mx, y: preview.my },
            geometry,
            floorGeometrySystem
          )
        ) {
          target = {
            x: preview.mx,
            y: preview.my
          };
        }

        if (target) {
          renovationSystem.mutatePlan(
            this.shopId,
            mutable => {
              const item =
                mutable.floors[drag.floorIndex]
                  .editorPlacements
                  .find(row => row.id === drag.id);

              if (!item) return;

              item.mx = Number(target.x);
              item.my = Number(target.y);
            },
            { skipHistory: true }
          );
        }
      }

      this._editorPlacementDrag = null;
      this._editorDragPreview = null;
      saveSystem.autoSave(true);
      this.requestRenderNow();
      return true;
    }

    const hadAreaDrag = !!this.areaDrag;
    const result = oldTouchEnd.call(this);

    if (hadAreaDrag && result) {
      resnapTables(this, deps);
    }

    return result;
  };

  return true;
}

module.exports = {
  VERSION,
  TABLE_KINDS,
  DECOR_KINDS,
  makeSignature,
  nearestFreeSlot,
  safeDecorPoint,
  visualSize,
  syncPlacements,
  addPlacement,
  install
};
