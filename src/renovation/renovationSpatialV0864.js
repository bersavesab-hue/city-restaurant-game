'use strict';

// V0864_RENOVATION_SPATIAL_MODEL
// Real-space renovation validation. The editor uses a 0.25m logical grid,
// while the visible grid may be coarser. Furniture is validated by body size,
// operating envelope, structural obstacles, entrance clearance and main aisle.

const VERSION = 'V0864_RENOVATION_SPATIAL_MODEL';
const GRID_M = 0.25;
const VISIBLE_GRID_M = 0.5;

const FURNITURE_SPECS = Object.freeze({
  table2: {
    label: '2人桌',
    bodyW: 0.75,
    bodyD: 0.75,
    useW: 1.50,
    useD: 1.60,
    seats: 2,
    floorArea: 2.4
  },
  table4: {
    label: '4人桌',
    bodyW: 1.20,
    bodyD: 0.75,
    useW: 2.00,
    useD: 1.80,
    seats: 4,
    floorArea: 3.6
  },
  table6: {
    label: '6人桌',
    bodyW: 1.60,
    bodyD: 0.82,
    useW: 2.40,
    useD: 2.00,
    seats: 6,
    floorArea: 4.8
  },
  table8: {
    label: '8人桌',
    bodyW: 2.10,
    bodyD: 0.88,
    useW: 3.00,
    useD: 2.00,
    seats: 8,
    floorArea: 6.0
  },
  plant: {
    label: '绿植',
    bodyW: 0.45,
    bodyD: 0.45,
    useW: 0.55,
    useD: 0.55,
    floorArea: 0.3
  },
  sofa: {
    label: '等候沙发',
    bodyW: 1.80,
    bodyD: 0.72,
    useW: 2.00,
    useD: 1.15,
    floorArea: 2.3
  },
  screen: {
    label: '屏风',
    bodyW: 1.50,
    bodyD: 0.18,
    useW: 1.65,
    useD: 0.50,
    floorArea: 0.8
  },
  pendant: {
    label: '吊灯',
    bodyW: 0.35,
    bodyD: 0.35,
    useW: 0.35,
    useD: 0.35,
    floorArea: 0.1,
    overhead: true
  }
});

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function round2(value) {
  return Number((Number(value) || 0).toFixed(2));
}

function snap(value, step = GRID_M) {
  return round2(Math.round((Number(value) || 0) / step) * step);
}

function isTable(kind) {
  return /^table(?:2|4|6|8)$/.test(String(kind || ''));
}

function specFor(kind) {
  return FURNITURE_SPECS[kind] || null;
}

function dimensionsFor(item, useEnvelope) {
  const spec = specFor(item && item.kind);

  if (!spec) {
    return { w: 0.5, d: 0.5 };
  }

  let w = useEnvelope ? spec.useW : spec.bodyW;
  let d = useEnvelope ? spec.useD : spec.bodyD;
  const rotation = ((Number(item && item.rotation) || 0) % 180 + 180) % 180;

  if (rotation === 90) {
    const temp = w;
    w = d;
    d = temp;
  }

  return { w, d };
}

function rectFor(item, useEnvelope) {
  const size = dimensionsFor(item, useEnvelope);
  const cx = Number(item && (item.mx ?? item.x)) || 0;
  const cy = Number(item && (item.my ?? item.y)) || 0;

  return {
    x: cx - size.w / 2,
    y: cy - size.d / 2,
    w: size.w,
    h: size.d,
    cx,
    cy
  };
}

function inflateRect(rect, amount) {
  return {
    x: rect.x - amount,
    y: rect.y - amount,
    w: rect.w + amount * 2,
    h: rect.h + amount * 2,
    cx: rect.cx,
    cy: rect.cy
  };
}

function rectsOverlap(a, b, epsilon = 0.001) {
  return (
    a.x < b.x + b.w - epsilon &&
    a.x + a.w > b.x + epsilon &&
    a.y < b.y + b.h - epsilon &&
    a.y + a.h > b.y + epsilon
  );
}

function rectPoints(rect) {
  return [
    { x: rect.x, y: rect.y },
    { x: rect.x + rect.w, y: rect.y },
    { x: rect.x + rect.w, y: rect.y + rect.h },
    { x: rect.x, y: rect.y + rect.h },
    { x: rect.x + rect.w / 2, y: rect.y },
    { x: rect.x + rect.w / 2, y: rect.y + rect.h },
    { x: rect.x, y: rect.y + rect.h / 2 },
    { x: rect.x + rect.w, y: rect.y + rect.h / 2 },
    { x: rect.x + rect.w / 2, y: rect.y + rect.h / 2 }
  ];
}

function rectInsidePolygon(rect, polygon, pointInPolygon) {
  if (!Array.isArray(polygon) || polygon.length < 3) return false;
  return rectPoints(rect).every(point => pointInPolygon(point, polygon));
}

function circleIntersectsRect(circle, rect, padding = 0) {
  const radius = Math.max(0, Number(circle.radius) || 0) + padding;
  const cx = Number(circle.x) || 0;
  const cy = Number(circle.y) || 0;
  const nearestX = clamp(cx, rect.x, rect.x + rect.w);
  const nearestY = clamp(cy, rect.y, rect.y + rect.h);
  const dx = cx - nearestX;
  const dy = cy - nearestY;
  return dx * dx + dy * dy < radius * radius;
}

function obstacleRect(obstacle) {
  return {
    x: Number(obstacle.x) || 0,
    y: Number(obstacle.y) || 0,
    w: Math.max(0, Number(obstacle.w) || 0),
    h: Math.max(0, Number(obstacle.h) || 0)
  };
}

function zoneGeometry(floor, geometry) {
  const kitchenRatio = clamp(Number(floor.kitchenRatio) || 0, 0, 1);
  const storageRatio = clamp(Number(floor.storageRatio) || 0, 0, 1);
  const serviceRatio = clamp(Number(floor.serviceRatio) || 0, 0, 1);
  const diningRatio = Math.max(0, 1 - kitchenRatio - storageRatio - serviceRatio);
  const backRatio = clamp(kitchenRatio + storageRatio, 0.01, 0.88);
  const lowerRatio = Math.max(0.01, serviceRatio + diningRatio);
  const serviceWidthRatio = clamp(serviceRatio / lowerRatio, 0.05, 0.72);

  return {
    backRatio,
    serviceWidthRatio,
    dining: {
      x: Number(geometry.widthM) * serviceWidthRatio,
      y: Number(geometry.depthM) * backRatio,
      w: Number(geometry.widthM) * (1 - serviceWidthRatio),
      h: Number(geometry.depthM) * (1 - backRatio)
    }
  };
}

function entranceRect(entrance, geometry, clearDepthM) {
  const width = Math.max(0.9, Number(entrance.width) || 1.2) + 0.5;
  const half = width / 2;
  const depth = Math.max(1.0, Number(clearDepthM) || 1.2);
  const ex = Number(entrance.x) || 0;
  const ey = Number(entrance.y) || 0;

  if (entrance.side === 'north') {
    return {
      x: ex - half,
      y: Math.max(0, ey),
      w: width,
      h: depth
    };
  }

  if (entrance.side === 'east') {
    return {
      x: Math.max(0, ex - depth),
      y: ey - half,
      w: depth,
      h: width
    };
  }

  if (entrance.side === 'west') {
    return {
      x: ex,
      y: ey - half,
      w: depth,
      h: width
    };
  }

  return {
    x: ex - half,
    y: Math.max(0, Number(geometry.depthM) - depth),
    w: width,
    h: depth
  };
}

function rectInsideRect(inner, outer, epsilon = 0.001) {
  return (
    inner.x >= outer.x - epsilon &&
    inner.y >= outer.y - epsilon &&
    inner.x + inner.w <= outer.x + outer.w + epsilon &&
    inner.y + inner.h <= outer.y + outer.h + epsilon
  );
}

function pushIssue(list, level, code, message, detail) {
  list.push({
    level,
    code,
    message,
    detail: detail || null
  });
}

function validateCandidate(args) {
  const {
    item,
    floor,
    geometry,
    placements = [],
    floorGeometrySystem,
    clearDepthM = 1.2,
    ignoreId = null
  } = args || {};

  const spec = specFor(item && item.kind);
  const issues = [];

  if (!item || !spec || !floor || !geometry || !floorGeometrySystem) {
    return {
      status: 'red',
      valid: false,
      issues: [{ level: 'red', code: 'INVALID_DATA', message: '家具数据不完整' }]
    };
  }

  const snapped = {
    ...item,
    mx: snap(item.mx),
    my: snap(item.my),
    rotation: ((Number(item.rotation) || 0) % 180 + 180) % 180
  };

  const body = rectFor(snapped, false);
  const use = rectFor(snapped, true);
  const zones = zoneGeometry(floor, geometry);

  if (!rectInsidePolygon(body, geometry.polygon, floorGeometrySystem.pointInPolygon)) {
    pushIssue(issues, 'red', 'OUTSIDE_PROPERTY', spec.label + '超出门店边界');
  }

  if (!spec.overhead) {
    if (!rectInsidePolygon(use, geometry.polygon, floorGeometrySystem.pointInPolygon)) {
      pushIssue(issues, 'red', 'USE_SPACE_OUTSIDE', spec.label + '的使用空间超出墙体边界');
    }

    if (isTable(snapped.kind) && !rectInsideRect(use, zones.dining)) {
      pushIssue(
        issues,
        'red',
        'OUTSIDE_DINING_ZONE',
        spec.label + '需要约' + spec.floorArea.toFixed(1) + '㎡使用空间，当前位置侵入后厨/仓储/服务区'
      );
    }
  }

  for (const obstacle of geometry.obstacles || []) {
    if (obstacle.type === 'column') {
      if (circleIntersectsRect(obstacle, body, 0.05)) {
        pushIssue(issues, 'red', 'COLUMN_BODY_COLLISION', '与柱体发生碰撞');
      } else if (!spec.overhead && circleIntersectsRect(obstacle, use, 0.10)) {
        pushIssue(issues, 'yellow', 'COLUMN_CLEARANCE_TIGHT', '椅子/使用空间贴近柱体，服务会受影响');
      }
    } else {
      const obstacleBox = obstacleRect(obstacle);

      if (rectsOverlap(body, obstacleBox)) {
        pushIssue(
          issues,
          'red',
          'FIXED_STRUCTURE_COLLISION',
          '与' + (obstacle.type === 'toilet' ? '卫生间' : obstacle.type === 'stair' ? '楼梯' : '固定结构') + '发生碰撞'
        );
      } else if (!spec.overhead && rectsOverlap(use, inflateRect(obstacleBox, 0.15))) {
        pushIssue(issues, 'yellow', 'FIXED_CLEARANCE_TIGHT', '使用空间贴近固定结构');
      }
    }
  }

  if (!spec.overhead) {
    for (const entrance of geometry.entrances || []) {
      const clearRect = entranceRect(entrance, geometry, clearDepthM);

      if (rectsOverlap(body, clearRect) || rectsOverlap(use, clearRect)) {
        pushIssue(issues, 'red', 'ENTRANCE_CLEARANCE', '占用入口/消防疏散净空');
      }
    }
  }

  for (const other of placements || []) {
    if (!other || other.id === ignoreId || other.id === item.id) continue;

    const otherSpec = specFor(other.kind);
    if (!otherSpec) continue;

    const otherBody = rectFor(other, false);
    const otherUse = rectFor(other, true);

    if (!spec.overhead && !otherSpec.overhead && rectsOverlap(body, otherBody)) {
      pushIssue(issues, 'red', 'FURNITURE_COLLISION', '与' + otherSpec.label + '本体重叠');
      continue;
    }

    if (!spec.overhead && !otherSpec.overhead && rectsOverlap(use, otherUse)) {
      pushIssue(issues, 'yellow', 'USE_SPACE_OVERLAP', '与' + otherSpec.label + '的使用/服务空间重叠');
    }
  }

  const red = issues.some(issue => issue.level === 'red');
  const yellow = !red && issues.some(issue => issue.level === 'yellow');

  return {
    item: snapped,
    body,
    use,
    issues,
    status: red ? 'red' : yellow ? 'yellow' : 'green',
    valid: !red
  };
}

function cellInside(point, radius, geometry, floorGeometrySystem, zone) {
  const samples = [
    [0, 0],
    [radius, 0],
    [-radius, 0],
    [0, radius],
    [0, -radius],
    [radius * 0.7, radius * 0.7],
    [-radius * 0.7, radius * 0.7],
    [radius * 0.7, -radius * 0.7],
    [-radius * 0.7, -radius * 0.7]
  ];

  for (const pair of samples) {
    const p = { x: point.x + pair[0], y: point.y + pair[1] };

    if (!floorGeometrySystem.pointInPolygon(p, geometry.polygon || [])) {
      return false;
    }

    if (
      p.x < zone.x ||
      p.y < zone.y ||
      p.x > zone.x + zone.w ||
      p.y > zone.y + zone.h
    ) {
      return false;
    }
  }

  return true;
}

function cellBlocked(point, radius, geometry, placements) {
  const probe = {
    x: point.x - radius,
    y: point.y - radius,
    w: radius * 2,
    h: radius * 2
  };

  for (const obstacle of geometry.obstacles || []) {
    if (obstacle.type === 'column') {
      if (circleIntersectsRect(obstacle, probe, 0.10)) return true;
    } else if (rectsOverlap(probe, inflateRect(obstacleRect(obstacle), 0.12))) {
      return true;
    }
  }

  for (const item of placements || []) {
    const spec = specFor(item.kind);
    if (!spec || spec.overhead) continue;

    if (rectsOverlap(probe, inflateRect(rectFor(item, true), 0.05))) {
      return true;
    }
  }

  return false;
}

function pathExists(args, widthM) {
  const {
    floor,
    geometry,
    placements,
    floorGeometrySystem
  } = args;

  const primaryEntrance = (geometry.entrances || [])[0];
  if (!primaryEntrance) return true;

  const zones = zoneGeometry(floor, geometry);
  const zone = zones.dining;
  const radius = Math.max(0.35, Number(widthM) / 2);
  const step = GRID_M;
  const cols = Math.max(1, Math.ceil(Number(geometry.widthM) / step));
  const rows = Math.max(1, Math.ceil(Number(geometry.depthM) / step));

  function key(ix, iy) {
    return ix + ':' + iy;
  }

  function point(ix, iy) {
    return {
      x: Math.min(Number(geometry.widthM) - step / 2, (ix + 0.5) * step),
      y: Math.min(Number(geometry.depthM) - step / 2, (iy + 0.5) * step)
    };
  }

  function free(ix, iy) {
    if (ix < 0 || iy < 0 || ix >= cols || iy >= rows) return false;
    const p = point(ix, iy);
    return (
      cellInside(p, radius, geometry, floorGeometrySystem, zone) &&
      !cellBlocked(p, radius, geometry, placements)
    );
  }

  const entranceX = clamp(Number(primaryEntrance.x) || zone.x + zone.w / 2, zone.x + radius, zone.x + zone.w - radius);
  const entranceY =
    primaryEntrance.side === 'north'
      ? zone.y + radius + 0.15
      : zone.y + zone.h - radius - 0.15;

  const start = {
    ix: clamp(Math.floor(entranceX / step), 0, cols - 1),
    iy: clamp(Math.floor(entranceY / step), 0, rows - 1)
  };

  const targetY = zone.y + radius + 0.2;
  const targetRow = clamp(Math.floor(targetY / step), 0, rows - 1);

  const queue = [];
  const visited = new Set();

  // Search a small band around the theoretical entrance point so a door near
  // a wall does not fail only because the nearest grid center is invalid.
  for (let dx = -4; dx <= 4; dx++) {
    for (let dy = -4; dy <= 4; dy++) {
      const ix = start.ix + dx;
      const iy = start.iy + dy;
      if (!free(ix, iy)) continue;
      queue.push({ ix, iy });
      visited.add(key(ix, iy));
    }
  }

  if (!queue.length) return false;

  const dirs = [
    [1, 0], [-1, 0], [0, 1], [0, -1]
  ];

  for (let cursor = 0; cursor < queue.length; cursor++) {
    const cur = queue[cursor];

    if (cur.iy <= targetRow + 1) {
      return true;
    }

    for (const dir of dirs) {
      const nx = cur.ix + dir[0];
      const ny = cur.iy + dir[1];
      const k = key(nx, ny);
      if (visited.has(k) || !free(nx, ny)) continue;
      visited.add(k);
      queue.push({ ix: nx, iy: ny });
    }
  }

  return false;
}

function legacyPlacements(
  floor,
  geometry,
  slots,
  floorGeometrySystem,
  clearDepthM
) {
  const actual = Array.isArray(floor.editorPlacements)
    ? floor.editorPlacements.slice()
    : [];

  const wanted = floor.tables || {};
  const counts = { 2: 0, 4: 0, 6: 0, 8: 0 };

  for (const item of actual) {
    const m = /^table(2|4|6|8)$/.exec(String(item.kind || ''));
    if (m) counts[m[1]] += 1;
  }

  // V0864_R2_LEGACY_SPATIAL_MIGRATION
  // Old saves and compatibility APIs can contain table counts without
  // persistent placements. Never synthesize those tables from the old fixed
  // slot list: those points can sit too close to the kitchen divider, walls or
  // entrance once real chair/service envelopes are considered. Instead, find
  // an actually legal 0.25m-grid position for every missing table.
  for (const key of ['8', '6', '4', '2']) {
    const missing = Math.max(0, Number(wanted[key]) || 0) - counts[key];

    for (let i = 0; i < missing; i++) {
      let found = null;

      if (floorGeometrySystem) {
        found = findFirstValidPosition({
          kind: 'table' + key,
          floor,
          geometry,
          placements: actual,
          floorGeometrySystem,
          clearDepthM: clearDepthM || 1.2,
          rotation: Number(key) >= 6 ? 90 : 0
        });

        if (!found && Number(key) >= 4) {
          found = findFirstValidPosition({
            kind: 'table' + key,
            floor,
            geometry,
            placements: actual,
            floorGeometrySystem,
            clearDepthM: clearDepthM || 1.2,
            rotation: Number(key) >= 6 ? 0 : 90
          });
        }
      }

      // Fallback is retained only for isolated callers that do not supply the
      // geometry helper. Normal game/runtime analysis always supplies it.
      if (!found) {
        const slot = (slots || []).find(candidate => {
          return !actual.some(item => {
            if (!isTable(item.kind)) return false;
            const dx = Number(item.mx) - Number(candidate.x);
            const dy = Number(item.my) - Number(candidate.y);
            return Math.sqrt(dx * dx + dy * dy) < 0.6;
          });
        });

        if (slot && !floorGeometrySystem) {
          found = {
            x: Number(slot.x),
            y: Number(slot.y),
            rotation: Number(key) >= 6 ? 90 : 0
          };
        }
      }

      if (!found) break;

      actual.push({
        id: '__legacy_' + key + '_' + i,
        kind: 'table' + key,
        mx: Number(found.x),
        my: Number(found.y),
        rotation: Number(found.rotation) || 0,
        synthetic: true
      });
    }
  }

  return actual;
}

function analyzeFloor(args) {
  const {
    floor,
    geometry,
    areaMetrics,
    floorGeometrySystem,
    clearDepthM = 1.2
  } = args || {};

  if (!floor || !geometry || !floorGeometrySystem) {
    return {
      valid: false,
      status: 'red',
      issues: [{ level: 'red', code: 'NO_GEOMETRY', message: '空间数据不可用' }],
      itemStates: {},
      serviceFactor: 0.75,
      mainAisleWidthM: 0,
      furnitureUseArea: 0,
      remainingFrontArea: 0
    };
  }

  const slots = areaMetrics && areaMetrics.usableDiningSlots || geometry.diningSlots || [];
  const placements = legacyPlacements(
    floor,
    geometry,
    slots,
    floorGeometrySystem,
    clearDepthM
  );
  const itemStates = {};
  const issues = [];
  let furnitureUseArea = 0;

  const expectedTables = ['2', '4', '6', '8'].reduce(
    (sum, key) => sum + Math.max(0, Number(floor.tables && floor.tables[key]) || 0),
    0
  );
  const materializedTables = placements.filter(item => isTable(item.kind)).length;

  if (materializedTables < expectedTables) {
    const missing = expectedTables - materializedTables;
    pushIssue(
      issues,
      'red',
      'UNPLACEABLE_TABLE_COUNT',
      '有' + missing + '张餐桌无法找到合法位置，请减少桌数或扩大堂食区'
    );
  }

  for (const item of placements) {
    const state = validateCandidate({
      item,
      floor,
      geometry,
      placements,
      floorGeometrySystem,
      clearDepthM,
      ignoreId: item.id
    });

    itemStates[item.id] = state;

    const spec = specFor(item.kind);
    if (spec && !spec.overhead) {
      furnitureUseArea += spec.floorArea || (spec.useW * spec.useD);
    }

    for (const issue of state.issues) {
      issues.push({
        ...issue,
        itemId: item.id,
        itemKind: item.kind,
        itemLabel: spec && spec.label || item.kind
      });
    }
  }

  const hasRequiredPath = pathExists({ floor, geometry, placements, floorGeometrySystem }, 0.90);
  const hasComfortPath = hasRequiredPath && pathExists({ floor, geometry, placements, floorGeometrySystem }, 1.10);

  if (!hasRequiredPath) {
    pushIssue(issues, 'red', 'MAIN_AISLE_BLOCKED', '主通道不足0.90m或被家具阻断');
  } else if (!hasComfortPath) {
    pushIssue(issues, 'yellow', 'MAIN_AISLE_TIGHT', '主通道可通行，但不足1.10m，服务效率会下降');
  }

  // De-duplicate repeated pair-level messages. Keep exact item-level reasons in
  // itemStates, while the floor summary stays readable.
  const unique = [];
  const seen = new Set();

  for (const issue of issues) {
    const token = issue.code + ':' + (issue.itemId || '') + ':' + issue.message;
    if (seen.has(token)) continue;
    seen.add(token);
    unique.push(issue);
  }

  const redCount = unique.filter(issue => issue.level === 'red').length;
  const yellowCount = unique.filter(issue => issue.level === 'yellow').length;
  const frontArea = Math.max(0, Number(areaMetrics && areaMetrics.effectiveDiningArea) || 0);
  const remainingFrontArea = round2(frontArea - furnitureUseArea);

  return {
    version: VERSION,
    gridM: GRID_M,
    visibleGridM: VISIBLE_GRID_M,
    placements,
    itemStates,
    issues: unique,
    primaryIssue: unique.find(issue => issue.level === 'red') || unique[0] || null,
    redCount,
    yellowCount,
    status: redCount ? 'red' : yellowCount ? 'yellow' : 'green',
    valid: redCount === 0,
    mainAisleWidthM: hasComfortPath ? 1.10 : hasRequiredPath ? 0.90 : 0,
    serviceFactor: redCount ? 0.75 : yellowCount ? Math.max(0.88, 0.97 - yellowCount * 0.015) : 1,
    furnitureUseArea: round2(furnitureUseArea),
    frontArea: round2(frontArea),
    remainingFrontArea,
    tableUseArea: round2(
      placements
        .filter(item => isTable(item.kind))
        .reduce((sum, item) => sum + (specFor(item.kind).floorArea || 0), 0)
    )
  };
}

function candidateGrid(floor, geometry) {
  const zones = zoneGeometry(floor, geometry);
  const points = [];
  const step = VISIBLE_GRID_M;

  for (let y = zones.dining.y + step / 2; y <= zones.dining.y + zones.dining.h - step / 2; y += step) {
    for (let x = zones.dining.x + step / 2; x <= zones.dining.x + zones.dining.w - step / 2; x += step) {
      points.push({ x: snap(x), y: snap(y) });
    }
  }

  const cx = zones.dining.x + zones.dining.w / 2;
  const cy = zones.dining.y + zones.dining.h / 2;

  return points.sort((a, b) => {
    const da = Math.pow(a.x - cx, 2) + Math.pow(a.y - cy, 2);
    const db = Math.pow(b.x - cx, 2) + Math.pow(b.y - cy, 2);
    return da - db;
  });
}

function findFirstValidPosition(args) {
  const {
    kind,
    floor,
    geometry,
    placements = [],
    floorGeometrySystem,
    clearDepthM = 1.2,
    rotation = 0
  } = args || {};

  if (!specFor(kind)) return null;

  for (const point of candidateGrid(floor, geometry)) {
    const item = {
      id: '__candidate__',
      kind,
      mx: point.x,
      my: point.y,
      rotation
    };

    const state = validateCandidate({
      item,
      floor,
      geometry,
      placements,
      floorGeometrySystem,
      clearDepthM,
      ignoreId: '__candidate__'
    });

    if (state.status === 'green') {
      return { ...point, rotation, state };
    }
  }

  for (const point of candidateGrid(floor, geometry)) {
    const item = {
      id: '__candidate__',
      kind,
      mx: point.x,
      my: point.y,
      rotation
    };

    const state = validateCandidate({
      item,
      floor,
      geometry,
      placements,
      floorGeometrySystem,
      clearDepthM,
      ignoreId: '__candidate__'
    });

    if (state.valid) {
      return { ...point, rotation, state };
    }
  }

  return null;
}

module.exports = {
  VERSION,
  GRID_M,
  VISIBLE_GRID_M,
  FURNITURE_SPECS,
  snap,
  isTable,
  specFor,
  dimensionsFor,
  rectFor,
  rectsOverlap,
  zoneGeometry,
  entranceRect,
  validateCandidate,
  analyzeFloor,
  findFirstValidPosition,
  materializeLegacyPlacements: legacyPlacements,
  pathExists
};
