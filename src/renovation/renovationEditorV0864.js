'use strict';

// V0864_RENOVATION_PLAYER_EXPERIENCE
// Compact mobile renovation editor layered over V0.8.63. The canvas is the
// primary surface; furniture uses the V0.8.64 real-space model instead of
// fixed slot snapping.

const spatial = require('./renovationSpatialV0864.js');
const v0862 = require('./renovationEditorV0862.js');

const VERSION = 'V0864_RENOVATION_PLAYER_EXPERIENCE';

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function shortText(value, max) {
  const text = String(value == null ? '' : value);
  return text.length <= max ? text : text.slice(0, Math.max(1, max - 1)) + '…';
}

function money(value) {
  const n = Number(value) || 0;
  const sign = n < 0 ? '-' : '';
  const abs = Math.abs(n);

  if (abs >= 100000000) {
    return sign + '¥' + (abs / 100000000).toFixed(abs >= 1000000000 ? 1 : 2).replace(/\.0+$/, '') + '亿';
  }

  if (abs >= 10000) {
    return sign + '¥' + (abs / 10000).toFixed(abs >= 1000000 ? 0 : 1).replace(/\.0$/, '') + '万';
  }

  return sign + '¥' + Math.round(abs).toLocaleString();
}

function modeOf(scene) {
  return scene._editorMode || 'zones';
}

function selectedPlacement(scene) {
  const plan = scene.getPlan();
  if (!plan || !scene._editorSelectedId) return null;

  for (let floorIndex = 0; floorIndex < (plan.floors || []).length; floorIndex++) {
    const floor = plan.floors[floorIndex];
    const item = (floor.editorPlacements || [])
      .find(row => row.id === scene._editorSelectedId);

    if (item) {
      return { item, floorIndex };
    }
  }

  return null;
}

function nextPlacementId(plan, floorIndex, kind) {
  plan.editorPlacementSeq = Math.max(0, Number(plan.editorPlacementSeq) || 0) + 1;
  return 'reno_item_' + floorIndex + '_' + kind + '_' + plan.editorPlacementSeq;
}

function syncSignature(plan) {
  plan.editorPlacementVersion = 3;
  plan.editorPlacementSignature = v0862.makeSignature(plan);
}

function floorContext(scene, deps, floorIndex) {
  const plan = scene.getPlan();
  const shop = scene.getShop();
  const metrics = scene.getMetrics();

  if (!plan || !shop || !metrics) return null;

  const index = clamp(
    Number.isFinite(Number(floorIndex)) ? Number(floorIndex) : Number(plan.activeFloor) || 0,
    0,
    plan.floors.length - 1
  );

  const floor = plan.floors[index];
  const metric = metrics.floors.find(row => row.index === index) || metrics.floors[index];
  const geometry = metric && metric.geometry || deps.floorGeometrySystem.getFloorGeometry(
    shop,
    index,
    floor.area,
    plan.floors.length
  );

  return { plan, shop, metrics, floor, metric, geometry, index };
}

function addSpatialPlacement(scene, deps, kind) {
  const ctx = floorContext(scene, deps);
  if (!ctx) return { ok: false, message: '装修数据暂不可用' };

  const spec = spatial.specFor(kind);
  if (!spec) return { ok: false, message: '未知家具类型' };

  const placements = ctx.floor.editorPlacements || [];
  const found = spatial.findFirstValidPosition({
    kind,
    floor: ctx.floor,
    geometry: ctx.geometry,
    placements,
    floorGeometrySystem: deps.floorGeometrySystem,
    clearDepthM: deps.renovationConfig.zoneRules.entranceClearDepthM,
    rotation: kind === 'table6' || kind === 'table8' ? 90 : 0
  });

  if (!found) {
    return {
      ok: false,
      message: isTableKind(kind)
        ? spec.label + '需要约' + spec.floorArea.toFixed(1) + '㎡使用空间，当前没有合法位置'
        : '当前没有适合放置' + spec.label + '的位置'
    };
  }

  let createdId = null;

  deps.renovationSystem.mutatePlan(
    scene.shopId,
    plan => {
      const floor = plan.floors[ctx.index];
      if (!Array.isArray(floor.editorPlacements)) floor.editorPlacements = [];

      createdId = nextPlacementId(plan, ctx.index, kind);
      floor.editorPlacements.push({
        id: createdId,
        kind,
        mx: found.x,
        my: found.y,
        rotation: found.rotation || 0
      });

      if (isTableKind(kind)) {
        const key = kind.replace('table', '');
        floor.tables[key] = Math.max(0, Number(floor.tables[key]) || 0) + 1;
      } else {
        if (!plan.decorCounts) plan.decorCounts = {};
        plan.decorCounts[kind] = Math.max(0, Number(plan.decorCounts[kind]) || 0) + 1;
      }

      syncSignature(plan);
    }
  );

  scene._editorSelectedId = createdId;
  deps.saveSystem.autoSave(true);
  scene.requestRenderNow();

  return {
    ok: true,
    id: createdId,
    message: '已放置' + spec.label + ' · 0.25m网格吸附'
  };
}

function isTableKind(kind) {
  return spatial.isTable(kind);
}

function rotateSpatialPlacement(scene, deps) {
  const selected = selectedPlacement(scene);
  if (!selected) return { ok: false, message: '请先选中一个家具' };

  const ctx = floorContext(scene, deps, selected.floorIndex);
  if (!ctx) return { ok: false, message: '空间数据不可用' };

  const candidate = {
    ...selected.item,
    rotation: ((Number(selected.item.rotation) || 0) + 90) % 180
  };

  const state = spatial.validateCandidate({
    item: candidate,
    floor: ctx.floor,
    geometry: ctx.geometry,
    placements: ctx.floor.editorPlacements || [],
    floorGeometrySystem: deps.floorGeometrySystem,
    clearDepthM: deps.renovationConfig.zoneRules.entranceClearDepthM,
    ignoreId: selected.item.id
  });

  if (!state.valid) {
    return {
      ok: false,
      message: state.issues[0] ? state.issues[0].message : '旋转后空间不足'
    };
  }

  deps.renovationSystem.mutatePlan(
    scene.shopId,
    plan => {
      const item = plan.floors[selected.floorIndex]
        .editorPlacements
        .find(row => row.id === selected.item.id);

      if (!item) return;
      item.rotation = candidate.rotation;
      syncSignature(plan);
    }
  );

  deps.saveSystem.autoSave(true);
  scene.requestRenderNow();

  return {
    ok: true,
    message: state.status === 'yellow' ? '已旋转 · 当前摆放会影响服务动线' : '已旋转90°'
  };
}

function buildAutoLayout(scene, deps) {
  const ctx = floorContext(scene, deps);
  if (!ctx) return { ok: false, message: '装修数据暂不可用' };

  const floor = JSON.parse(JSON.stringify(ctx.floor));
  const nonTables = (floor.editorPlacements || []).filter(item => !isTableKind(item.kind));
  floor.editorPlacements = nonTables.slice();
  floor.tables = { 2: 0, 4: 0, 6: 0, 8: 0 };

  const frontArea = Math.max(0, Number(ctx.metric && ctx.metric.effectiveDiningArea) || 0);
  let targetSeats = 0;

  if (ctx.floor.area >= 24) targetSeats = 2;
  if (ctx.floor.area >= 40) targetSeats = 6;
  if (ctx.floor.area >= 65) targetSeats = 10;
  if (ctx.floor.area >= 90) targetSeats = 16;
  if (ctx.floor.area >= 130) targetSeats = 24;
  if (ctx.floor.area >= 190) targetSeats = 32;

  targetSeats = Math.min(
    targetSeats,
    Math.max(0, Math.floor(frontArea / 2.4) * 2)
  );

  const planned = [];
  let seats = 0;

  while (seats < targetSeats) {
    const remaining = targetSeats - seats;
    const kind = remaining >= 4 ? 'table4' : 'table2';
    const found = spatial.findFirstValidPosition({
      kind,
      floor,
      geometry: ctx.geometry,
      placements: floor.editorPlacements,
      floorGeometrySystem: deps.floorGeometrySystem,
      clearDepthM: deps.renovationConfig.zoneRules.entranceClearDepthM,
      rotation: 0
    });

    if (!found) break;

    const probe = {
      id: '__auto_' + planned.length,
      kind,
      mx: found.x,
      my: found.y,
      rotation: found.rotation || 0
    };

    floor.editorPlacements.push(probe);
    floor.tables[kind.replace('table', '')] += 1;

    const areaMetrics = deps.renovationSystem.calculateFloorArea(
      ctx.shop,
      { ...ctx.plan, floors: ctx.plan.floors.map((row, index) => index === ctx.index ? floor : row) },
      floor,
      ctx.index
    );

    const analysis = spatial.analyzeFloor({
      floor,
      geometry: ctx.geometry,
      areaMetrics,
      floorGeometrySystem: deps.floorGeometrySystem,
      clearDepthM: deps.renovationConfig.zoneRules.entranceClearDepthM
    });

    if (!analysis.valid) {
      floor.editorPlacements.pop();
      floor.tables[kind.replace('table', '')] -= 1;
      break;
    }

    planned.push(probe);
    seats += spatial.specFor(kind).seats;
  }

  deps.renovationSystem.mutatePlan(
    scene.shopId,
    plan => {
      const target = plan.floors[ctx.index];
      const keep = (target.editorPlacements || []).filter(item => !isTableKind(item.kind));
      target.editorPlacements = keep;
      target.tables = { 2: 0, 4: 0, 6: 0, 8: 0 };

      for (const item of planned) {
        const kind = item.kind;
        const key = kind.replace('table', '');
        const id = nextPlacementId(plan, ctx.index, kind);
        target.editorPlacements.push({
          id,
          kind,
          mx: item.mx,
          my: item.my,
          rotation: item.rotation || 0
        });
        target.tables[key] += 1;
      }

      syncSignature(plan);
    }
  );

  scene._editorSelectedId = null;
  deps.saveSystem.autoSave(true);
  scene.requestRenderNow();

  if (!planned.length) {
    return {
      ok: true,
      message: ctx.floor.area < 24
        ? '面积较小，已保留空场布局；可尝试外带/少量堂食'
        : '已生成合法空场，请按需要手动摆桌'
    };
  }

  return {
    ok: true,
    message: '自动布局完成 · ' + seats + '席 · 已通过空间与通道校验'
  };
}

function migrateLegacySpatialLayout(scene, deps) {
  const current = scene.getPlan();
  const shop = scene.getShop();

  if (
    !current ||
    !shop ||
    current.status === 'constructing' ||
    current.status === 'completed' ||
    Number(current.editorPlacementVersion) >= 4
  ) {
    return false;
  }

  deps.renovationSystem.mutatePlan(
    scene.shopId,
    plan => {
      for (let floorIndex = 0; floorIndex < plan.floors.length; floorIndex++) {
        const floor = plan.floors[floorIndex];
        const wanted = { ...floor.tables };
        const keep = (floor.editorPlacements || [])
          .filter(item => !isTableKind(item.kind));

        floor.editorPlacements = keep;
        floor.tables = { 2: 0, 4: 0, 6: 0, 8: 0 };

        const geometry = deps.floorGeometrySystem.getFloorGeometry(
          shop,
          floorIndex,
          floor.area,
          plan.floors.length
        );

        for (const key of ['8', '6', '4', '2']) {
          const desired = Math.max(0, Number(wanted[key]) || 0);

          for (let i = 0; i < desired; i++) {
            const rotations = Number(key) >= 6 ? [90, 0] : [0, 90];
            let placed = false;

            for (const rotation of rotations) {
              const found = spatial.findFirstValidPosition({
                kind: 'table' + key,
                floor,
                geometry,
                placements: floor.editorPlacements,
                floorGeometrySystem: deps.floorGeometrySystem,
                clearDepthM: deps.renovationConfig.zoneRules.entranceClearDepthM,
                rotation
              });

              if (!found) continue;

              const item = {
                id: nextPlacementId(plan, floorIndex, 'table' + key),
                kind: 'table' + key,
                mx: found.x,
                my: found.y,
                rotation: found.rotation || rotation
              };

              floor.editorPlacements.push(item);
              floor.tables[key] += 1;

              const areaMetrics = deps.renovationSystem.calculateFloorArea(
                shop,
                plan,
                floor,
                floorIndex
              );

              const analysis = spatial.analyzeFloor({
                floor,
                geometry,
                areaMetrics,
                floorGeometrySystem: deps.floorGeometrySystem,
                clearDepthM: deps.renovationConfig.zoneRules.entranceClearDepthM
              });

              if (analysis.valid) {
                placed = true;
                break;
              }

              floor.editorPlacements.pop();
              floor.tables[key] -= 1;
            }

            if (!placed) break;
          }
        }
      }

      plan.editorPlacementVersion = 4;
      syncSignature(plan);
      plan.editorPlacementVersion = 4;
    },
    { skipHistory: true }
  );

  deps.saveSystem.autoSave(true);
  return true;
}

function screenRect(frame, rect) {
  return {
    x: frame.x + rect.x * frame.scale,
    y: frame.y + rect.y * frame.scale,
    w: rect.w * frame.scale,
    h: rect.h * frame.scale
  };
}

function drawOutline(ctx, rect, fill, stroke, dash) {
  ctx.save();
  if (dash && ctx.setLineDash) ctx.setLineDash(dash);
  ctx.fillStyle = fill;
  ctx.strokeStyle = stroke;
  ctx.lineWidth = 1.5;
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  ctx.strokeRect(rect.x, rect.y, rect.w, rect.h);
  ctx.restore();
}

function tone(status) {
  if (status === 'red') {
    return {
      fill: 'rgba(211,75,66,0.18)',
      stroke: '#D34B42',
      label: '不可放'
    };
  }

  if (status === 'yellow') {
    return {
      fill: 'rgba(226,164,42,0.18)',
      stroke: '#D99B19',
      label: '影响动线'
    };
  }

  return {
    fill: 'rgba(32,166,107,0.16)',
    stroke: '#20A66B',
    label: '可放'
  };
}

function install(options) {
  const {
    RenovationScene,
    renovationSystem,
    renovationConfig,
    floorGeometrySystem,
    saveSystem,
    gameState,
    ui,
    COLORS
  } = options || {};

  if (!RenovationScene || RenovationScene.prototype.__v0864Installed) {
    return false;
  }

  const proto = RenovationScene.prototype;
  proto.__v0864Installed = true;

  const deps = {
    renovationSystem,
    renovationConfig,
    floorGeometrySystem,
    saveSystem,
    gameState,
    ui,
    COLORS
  };

  const oldEnter = proto.enter;
  const oldDrawFloorCanvas = proto.drawFloorCanvas;
  const oldHandleTap = proto.handleTap;
  const oldTouchStart = proto.handleTouchStart;
  const oldTouchMove = proto.handleTouchMove;
  const oldTouchEnd = proto.handleTouchEnd;

  proto.enter = function enterV0864(payload) {
    oldEnter.call(this, payload);
    migrateLegacySpatialLayout(this, deps);
    this.requestRenderNow();
  };

  proto.getMainGeometry = function getMainGeometryV0864() {
    const y = 94;
    const footerH = 45;
    const lowerH = this.viewH < 700 ? 60 : 68;
    const available = Math.max(330, this.contentBottom - y);
    const planH = Math.max(
      250,
      available - lowerH - footerH - 14
    );
    const lowerY = y + planH + 7;
    const footerY = this.contentBottom - footerH;

    return {
      y,
      planH,
      lowerY,
      lowerH: Math.max(54, Math.min(lowerH, footerY - lowerY - 5)),
      footerY,
      footerH
    };
  };

  proto.drawHeader = function drawHeaderV0864(ctx, shop) {
    const metrics = this.getMetrics();
    const cash = gameState && gameState.getPlayer ? gameState.getPlayer().cash : 0;

    ctx.save();
    ctx.fillStyle = '#F7F1E7';
    ctx.fillRect(0, 0, 390, 58);
    ctx.fillStyle = '#153E3D';
    ctx.fillRect(0, 56, 390, 2);

    ui.card(ctx, 8, 10, 36, 36, {
      radius: 10,
      fill: '#153E3D',
      stroke: false,
      shadow: false
    });

    this.text(ctx, '‹', 26, 28, 18, '#FFF6E5', '800', 'center');
    this.addButton('back', 4, 6, 44, 44);

    this.text(ctx, shortText(shop.name || '我的餐厅', 10), 55, 18, 9.0, '#173C3B', '800');
    this.text(
      ctx,
      '当前资金 ' + money(cash) + ' · 预算 ' + money(metrics && metrics.totalCost),
      55,
      39,
      4.8,
      '#6F7C78',
      '700'
    );

    ui.card(ctx, 319, 12, 63, 32, {
      radius: 10,
      fill: '#FFFDF7',
      stroke: '#CFC5B6',
      shadow: false
    });
    this.text(ctx, '模板/更多', 350.5, 28, 4.8, '#355754', '800', 'center');
    this.addButton('page:templates', 315, 8, 71, 40);
    ctx.restore();
  };

  proto.drawFloorCanvas = function drawFloorCanvasV0864(ctx, metrics, floor, x, y, w, h) {
    const originalMode = this._editorMode;

    // V0.8.63 draws fixed legal slot dots in furniture mode. V0.8.64 uses an
    // arbitrary 0.25m grid, so suppress the old dots while retaining the real
    // property shell, structures and persistent furniture rendering.
    if (originalMode === 'furniture') {
      this._editorMode = 'spatial_furniture';
    }

    oldDrawFloorCanvas.call(this, ctx, metrics, floor, x, y, w, h);
    this._editorMode = originalMode;

    const interaction = this.floorCanvasInteraction;
    if (!interaction || !interaction.frame) return;

    const frame = interaction.frame;
    const floorMetric = metrics.floors.find(row => row.index === floor.index) || metrics.floors[metrics.plan.activeFloor];
    const geometry = floorMetric.geometry;

    if (originalMode === 'furniture') {
      // Visible 0.5m grid; internal snapping remains 0.25m.
      ctx.save();
      this.geometryPath(ctx, geometry, frame);
      ctx.clip();
      ctx.strokeStyle = 'rgba(58,84,82,0.13)';
      ctx.lineWidth = 0.65;
      const step = Math.max(5, spatial.VISIBLE_GRID_M * frame.scale);
      for (let gx = frame.x; gx <= frame.x + frame.w; gx += step) {
        ctx.beginPath();
        ctx.moveTo(gx, frame.y);
        ctx.lineTo(gx, frame.y + frame.h);
        ctx.stroke();
      }
      for (let gy = frame.y; gy <= frame.y + frame.h; gy += step) {
        ctx.beginPath();
        ctx.moveTo(frame.x, gy);
        ctx.lineTo(frame.x + frame.w, gy);
        ctx.stroke();
      }
      ctx.restore();

      // Entry/fire-clearance overlay.
      for (const entrance of geometry.entrances || []) {
        const r = spatial.entranceRect(
          entrance,
          geometry,
          renovationConfig.zoneRules.entranceClearDepthM
        );
        drawOutline(
          ctx,
          screenRect(frame, r),
          'rgba(211,75,66,0.06)',
          'rgba(211,75,66,0.45)',
          [4, 3]
        );
      }
    }

    const selected = selectedPlacement(this);
    if (!selected || selected.floorIndex !== floor.index) return;

    const item = {
      ...selected.item,
      ...(this._editorDragPreview && this._editorDragPreview.id === selected.item.id
        ? {
            mx: this._editorDragPreview.mx,
            my: this._editorDragPreview.my
          }
        : {})
    };

    const validation =
      this._v0863PreviewValidation ||
      spatial.validateCandidate({
        item,
        floor,
        geometry,
        placements: floor.editorPlacements || [],
        floorGeometrySystem,
        clearDepthM: renovationConfig.zoneRules.entranceClearDepthM,
        ignoreId: selected.item.id
      });

    const t = tone(validation.status);
    const useRect = screenRect(frame, validation.use);
    const bodyRect = screenRect(frame, validation.body);

    drawOutline(ctx, useRect, t.fill, t.stroke, [5, 3]);
    drawOutline(ctx, bodyRect, 'rgba(255,255,255,0.03)', t.stroke, null);

    ui.card(ctx, frame.x + 6, frame.y + frame.h - 28, Math.min(230, frame.w - 12), 22, {
      radius: 9,
      fill: validation.status === 'red' ? '#FFF0EA' : validation.status === 'yellow' ? '#FFF6D9' : '#EAF7F0',
      stroke: false,
      shadow: false
    });

    const issue = validation.issues[0];
    this.text(
      ctx,
      t.label + (issue ? ' · ' + shortText(issue.message, 23) : ' · 0.25m吸附'),
      frame.x + 15,
      frame.y + frame.h - 17,
      4.5,
      validation.status === 'red' ? '#B9473F' : validation.status === 'yellow' ? '#A16D10' : '#207A52',
      '800'
    );
  };

  proto.drawFloorPlan = function drawFloorPlanV0863(ctx, metrics, floor, geometry) {
    const mode = modeOf(this);
    const y = geometry.y;
    const h = geometry.planH;

    // Mode strip lives in the space freed by the compact header.
    const tabs = [
      ['zones', '分区', 'page:zones'],
      ['furniture', '家具', 'page:furniture'],
      ['style', '风格', 'page:style'],
      ['rooms', '包厢', 'page:rooms']
    ];
    const tabY = 61;
    const tabW = 58;
    const gap = 5;

    for (let i = 0; i < tabs.length; i++) {
      const bx = 14 + i * (tabW + gap);
      const active = mode === tabs[i][0];
      ui.card(ctx, bx, tabY, tabW, 29, {
        radius: 9,
        fill: active ? '#244E4B' : '#F4EFE6',
        stroke: active ? '#244E4B' : '#D7CDBE',
        shadow: false
      });
      this.text(ctx, tabs[i][1], bx + tabW / 2, tabY + 14.5, 5.1, active ? '#FFF8E9' : '#4C6662', '800', 'center');
      this.addButton(tabs[i][2], bx, tabY, tabW, 29);
    }

    ui.card(ctx, 273, tabY, 103, 29, {
      radius: 9,
      fill: '#FFF9ED',
      stroke: '#CDBFAD',
      shadow: false
    });
    this.text(ctx, '自动布局', 324.5, tabY + 14.5, 5.1, '#345A55', '800', 'center');
    this.addButton('editor:auto-layout', 273, tabY, 103, 29);

    ui.card(ctx, 7, y, 376, h, {
      radius: 14,
      fill: '#FFFDF8',
      stroke: '#D8CEBF',
      shadow: false
    });

    this.text(ctx, mode === 'furniture' ? '家具摆放' : mode === 'zones' ? '空间分区' : mode === 'style' ? '风格预览' : '包厢规划', 18, y + 17, 8.0, '#193F3D', '800');

    this.text(ctx, (metrics.plan.activeFloor + 1) + 'F', 231, y + 17, 5.2, '#345A55', '800', 'center');
    this.addButton('floor:next', 212, y + 1, 38, 32);
    this.text(ctx, '↶', 269, y + 17, 9, '#345A55', '800', 'center');
    this.text(ctx, '↷', 306, y + 17, 9, '#345A55', '800', 'center');
    this.addButton('history:undo', 251, y + 1, 36, 32);
    this.addButton('history:redo', 288, y + 1, 36, 32);

    ui.card(ctx, 330, y + 4, 44, 26, {
      radius: 9,
      fill: '#F4EFE6',
      stroke: '#D4C8B7',
      shadow: false
    });
    this.text(ctx, '预览', 352, y + 17, 4.8, '#345A55', '800', 'center');
    this.addButton('preview', 326, y, 52, 34);

    const contextH = mode === 'furniture' ? 55 : 42;
    const canvasY = y + 35;
    const contextY = y + h - contextH - 6;
    const canvasH = Math.max(165, contextY - canvasY - 5);

    this.drawFloorCanvas(ctx, metrics, floor, 13, canvasY, 364, canvasH);

    if (mode === 'furniture') {
      const selected = selectedPlacement(this);
      if (selected) {
        const actions = [
          ['editor:rotate', '旋转'],
          ['editor:duplicate', '复制'],
          ['editor:delete', '删除'],
          ['editor:done', '完成']
        ];
        const bw = 82;
        const actionGap = 7;
        this.text(ctx, (spatial.specFor(selected.item.kind) || {}).label + ' 已选中', 18, contextY + 8, 4.6, '#355A55', '800');
        for (let i = 0; i < actions.length; i++) {
          const bx = 18 + i * (bw + actionGap);
          ui.card(ctx, bx, contextY + 15, bw, 34, {
            radius: 9,
            fill: actions[i][0] === 'editor:delete' ? '#FFF0EA' : actions[i][0] === 'editor:done' ? '#F3E3A9' : '#F4EFE7',
            stroke: '#D6CBBB',
            shadow: false
          });
          this.text(ctx, actions[i][1], bx + bw / 2, contextY + 32, 5.0, actions[i][0] === 'editor:delete' ? '#B94A42' : '#355A55', '800', 'center');
          this.addButton(actions[i][0], bx, contextY + 15, bw, 34);
        }
      } else {
        const palette = [
          ['table2', '2人桌'],
          ['table4', '4人桌'],
          ['table6', '6人桌'],
          ['table8', '8人桌'],
          ['plant', '绿植'],
          ['sofa', '沙发']
        ];
        const bw = 54;
        const pg = 5;
        for (let i = 0; i < palette.length; i++) {
          const bx = 18 + i * (bw + pg);
          ui.card(ctx, bx, contextY + 5, bw, 44, {
            radius: 9,
            fill: '#F8F3EB',
            stroke: '#D8CDBE',
            shadow: false
          });
          this.text(ctx, '+ ' + palette[i][1], bx + bw / 2, contextY + 27, 4.4, '#355A55', '800', 'center');
          this.addButton('editor:add:' + palette[i][0], bx, contextY + 5, bw, 44);
        }
      }
    } else {
      const floorMetric = metrics.floors.find(row => row.index === floor.index) || metrics.floors[metrics.plan.activeFloor];
      const message =
        mode === 'zones'
          ? '拖动黄色控制点调整区域 · 堂食 ' + Math.round(floorMetric.diningArea) + '㎡'
          : mode === 'style'
            ? '风格直接作用于当前平面预览；模板已移到右上角二级入口'
            : '包厢占用前厅空间，新增后会参与真实施工校验';
      this.text(ctx, message, 20, contextY + contextH / 2, 4.8, '#657773', '700');
      if (mode === 'rooms') {
        ui.card(ctx, 276, contextY + 5, 94, 31, {
          radius: 9,
          fill: '#F4EFE6',
          stroke: '#D4C8B7',
          shadow: false
        });
        this.text(ctx, '管理包厢 ›', 323, contextY + 20.5, 4.8, '#355A55', '800', 'center');
        this.addButton('editor:rooms:manage', 276, contextY + 5, 94, 31);
      }
    }
  };

  proto.drawTablePicker = function drawSpatialDiagnosis(ctx, floor, geometry) {
    const metrics = this.getMetrics();
    const floorMetric = metrics.floors.find(row => row.index === floor.index) || metrics.floors[metrics.plan.activeFloor];
    const spatialResult = floorMetric.spatial || {};
    const x = 7;
    const y = geometry.lowerY;
    const w = 207;
    const h = geometry.lowerH;

    ui.card(ctx, x, y, w, h, {
      radius: 12,
      fill: '#FFFDF8',
      stroke: '#D8CEBF',
      shadow: false
    });

    this.text(ctx, '空间诊断', x + 11, y + 14, 6.8, '#193F3D', '800');
    this.text(
      ctx,
      '前厅有效 ' + Number(spatialResult.frontArea || floorMetric.effectiveDiningArea || 0).toFixed(1) + '㎡ · 家具使用 ' + Number(spatialResult.furnitureUseArea || 0).toFixed(1) + '㎡',
      x + 11,
      y + 34,
      4.5,
      '#5F7470',
      '700'
    );

    const primary = spatialResult.primaryIssue;
    const status = spatialResult.status || (floorMetric.valid ? 'green' : 'red');
    const line = primary
      ? primary.message
      : '主通道≥' + Number(spatialResult.mainAisleWidthM || 0).toFixed(2) + 'm · 当前布局可施工';

    this.text(
      ctx,
      shortText(line, 31),
      x + 11,
      y + h - 13,
      4.5,
      status === 'red' ? '#B84941' : status === 'yellow' ? '#A47417' : '#237854',
      '800'
    );
  };

  proto.drawMetrics = function drawSpatialMetrics(ctx, metrics, geometry) {
    const x = 219;
    const y = geometry.lowerY;
    const w = 164;
    const h = geometry.lowerH;
    const floor = metrics.floors[metrics.plan.activeFloor];
    const spatialResult = floor.spatial || {};

    ui.card(ctx, x, y, w, h, {
      radius: 12,
      fill: '#FFFDF8',
      stroke: '#D8CEBF',
      shadow: false
    });

    this.text(ctx, '方案结果', x + 10, y + 14, 6.8, '#193F3D', '800');
    const badge = spatialResult.status === 'yellow' ? '可用/偏挤' : floor.valid ? '可施工' : '需调整';
    this.text(
      ctx,
      badge,
      x + w - 9,
      y + 14,
      4.4,
      floor.valid ? (spatialResult.status === 'yellow' ? '#A47417' : '#237854') : '#B84941',
      '800',
      'right'
    );

    const rows = [
      ['席位', metrics.totalSeats + '席'],
      ['预算', money(metrics.totalCost)],
      ['工期', metrics.buildDays + '天']
    ];

    for (let i = 0; i < rows.length; i++) {
      const ry = y + 33 + i * 18;
      this.text(ctx, rows[i][0], x + 10, ry, 4.4, '#788681', '700');
      this.text(ctx, rows[i][1], x + w - 9, ry, 5.0, '#254C49', '800', 'right');
    }
  };

  proto.drawFooter = function drawFooterV0863(ctx, metrics, geometry) {
    const y = geometry.footerY + 4;
    const floor = metrics.floors[metrics.plan.activeFloor];
    const spatialResult = floor.spatial || {};
    const primary = spatialResult.primaryIssue || (floor.areaWarnings && floor.areaWarnings[0] ? { message: floor.areaWarnings[0] } : null);

    ui.card(ctx, 9, y, 82, 35, {
      radius: 10,
      fill: '#FFFDF8',
      stroke: '#D8CEBF',
      shadow: false
    });
    this.text(ctx, '预览', 50, y + 17.5, 5.2, '#355A55', '800', 'center');
    this.addButton('preview', 7, y - 2, 86, 39);

    ui.card(ctx, 99, y, 283, 35, {
      radius: 10,
      fill: metrics.valid ? '#E1B944' : '#E2DDD3',
      stroke: metrics.valid ? '#C89B25' : '#CCC3B6',
      shadow: false
    });

    this.text(
      ctx,
      metrics.valid ? '确认方案 · 选择施工队  ›' : shortText(primary ? primary.message : '当前布局存在问题', 25),
      240.5,
      y + 17.5,
      metrics.valid ? 5.8 : 4.6,
      metrics.valid ? '#2E433F' : '#786F65',
      '800',
      'center'
    );

    if (metrics.valid) {
      this.addButton('construction:start', 97, y - 2, 287, 39);
    }
  };

  proto.handleTap = function handleTapV0864(x, y) {
    const hit = this.hitButton(x, y);

    if (hit) {
      const id = hit.id;

      if (/^page:(zones|furniture|style|rooms)$/.test(id)) {
        this.page = 'layout';
        this._editorMode = id.slice('page:'.length);
        this._editorSelectedId = null;
        this._editorPlacementDrag = null;
        this._editorDragPreview = null;
        this._v0863PreviewValidation = null;
        this.requestRenderNow();
        return true;
      }

      if (id === 'editor:auto-layout') {
        const result = buildAutoLayout(this, deps);
        this.showToast(result.message);
        return true;
      }

      if (id.indexOf('editor:add:') === 0) {
        const result = addSpatialPlacement(this, deps, id.slice('editor:add:'.length));
        this.showToast(result.message);
        return true;
      }

      if (id === 'editor:rotate') {
        const result = rotateSpatialPlacement(this, deps);
        this.showToast(result.message);
        return true;
      }

      if (id === 'editor:duplicate') {
        const selected = selectedPlacement(this);
        const result = selected
          ? addSpatialPlacement(this, deps, selected.item.kind)
          : { ok: false, message: '请先选中一个家具' };
        this.showToast(result.message);
        return true;
      }

      if (id === 'editor:rooms:manage') {
        this.page = 'rooms';
        this.requestRenderNow();
        return true;
      }
    }

    return oldHandleTap.call(this, x, y);
  };

  proto.handleTouchStart = function handleTouchStartV0864(x, y) {
    this._v0863PreviewValidation = null;
    return oldTouchStart.call(this, x, y);
  };

  proto.handleTouchMove = function handleTouchMoveV0864(x, y) {
    if (this._editorPlacementDrag && this.floorCanvasInteraction) {
      const frame = this.floorCanvasInteraction.frame;
      const selected = selectedPlacement(this);
      const ctx = selected && floorContext(this, deps, selected.floorIndex);

      if (!selected || !ctx) return true;

      const mx = spatial.snap(
        clamp(
          (x - frame.x) / Math.max(0.01, frame.scale),
          0,
          ctx.geometry.widthM
        )
      );
      const my = spatial.snap(
        clamp(
          (y - frame.y) / Math.max(0.01, frame.scale),
          0,
          ctx.geometry.depthM
        )
      );

      const candidate = {
        ...selected.item,
        mx,
        my
      };

      this._editorDragPreview = {
        id: selected.item.id,
        mx,
        my
      };

      this._v0863PreviewValidation = spatial.validateCandidate({
        item: candidate,
        floor: ctx.floor,
        geometry: ctx.geometry,
        placements: ctx.floor.editorPlacements || [],
        floorGeometrySystem,
        clearDepthM: renovationConfig.zoneRules.entranceClearDepthM,
        ignoreId: selected.item.id
      });

      this.requestRenderNow();
      return true;
    }

    return oldTouchMove.call(this, x, y);
  };

  proto.handleTouchEnd = function handleTouchEndV0864() {
    if (this._editorPlacementDrag) {
      const drag = this._editorPlacementDrag;
      const preview = this._editorDragPreview;
      const selected = selectedPlacement(this);
      const ctx = selected && floorContext(this, deps, selected.floorIndex);
      const validation = this._v0863PreviewValidation;

      if (selected && ctx && preview && validation && validation.valid) {
        deps.renovationSystem.mutatePlan(
          this.shopId,
          plan => {
            const item = plan.floors[selected.floorIndex]
              .editorPlacements
              .find(row => row.id === selected.item.id);
            if (!item) return;
            item.mx = spatial.snap(preview.mx);
            item.my = spatial.snap(preview.my);
            syncSignature(plan);
          },
          { skipHistory: true }
        );

        if (validation.status === 'yellow' && validation.issues[0]) {
          this.showToast('已放置，但' + validation.issues[0].message);
        }
      } else if (validation && validation.issues[0]) {
        this.showToast('不能放这里：' + validation.issues[0].message);
      }

      this._editorPlacementDrag = null;
      this._editorDragPreview = null;
      this._v0863PreviewValidation = null;
      deps.saveSystem.autoSave(true);
      this.requestRenderNow();
      return true;
    }

    const result = oldTouchEnd.call(this);
    this._v0863PreviewValidation = null;
    return result;
  };

  return true;
}

module.exports = {
  VERSION,
  install,
  addSpatialPlacement,
  buildAutoLayout,
  rotateSpatialPlacement
};
