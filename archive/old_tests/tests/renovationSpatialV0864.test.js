'use strict';

const assert = require('assert');
const spatial = require('../src/renovation/renovationSpatialV0864.js');

assert.equal(spatial.GRID_M, 0.25, '逻辑网格必须为0.25m');
assert.equal(spatial.VISIBLE_GRID_M, 0.5, '可视网格必须为0.5m');
assert.equal(spatial.FURNITURE_SPECS.table4.floorArea, 3.6, '4人桌使用空间必须为3.6㎡');
assert.ok(
  spatial.FURNITURE_SPECS.table8.useW > spatial.FURNITURE_SPECS.table2.useW,
  '大桌必须拥有更大的真实使用空间'
);

const pointInPolygon = (point, polygon) => {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].x;
    const yi = polygon[i].y;
    const xj = polygon[j].x;
    const yj = polygon[j].y;
    const intersect =
      ((yi > point.y) !== (yj > point.y)) &&
      (point.x < ((xj - xi) * (point.y - yi)) / ((yj - yi) || 1e-9) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
};

const floorGeometrySystem = { pointInPolygon };
const geometry = {
  widthM: 8,
  depthM: 10,
  polygon: [
    { x: 0, y: 0 },
    { x: 8, y: 0 },
    { x: 8, y: 10 },
    { x: 0, y: 10 }
  ],
  obstacles: [
    { type: 'column', x: 6, y: 6, radius: 0.25 }
  ],
  entrances: [
    { side: 'south', x: 4, y: 10, width: 1.4 }
  ],
  diningSlots: []
};

const floor = {
  index: 0,
  area: 80,
  kitchenRatio: 0.20,
  storageRatio: 0.05,
  serviceRatio: 0.10,
  tables: { 2: 0, 4: 0, 6: 0, 8: 0 },
  editorPlacements: []
};

const legal = spatial.validateCandidate({
  item: { id: 'legal', kind: 'table4', mx: 4.8, my: 6.8, rotation: 0 },
  floor,
  geometry,
  placements: [],
  floorGeometrySystem,
  clearDepthM: 1.2,
  ignoreId: 'legal'
});
assert.ok(legal.valid, '正常4人桌应该存在合法摆位');

const entranceBlocked = spatial.validateCandidate({
  item: { id: 'door', kind: 'table4', mx: 4, my: 9.1, rotation: 0 },
  floor,
  geometry,
  placements: [],
  floorGeometrySystem,
  clearDepthM: 1.2,
  ignoreId: 'door'
});
assert.equal(entranceBlocked.status, 'red', '堵门必须为红色不可放');
assert.ok(
  entranceBlocked.issues.some(row => row.code === 'ENTRANCE_CLEARANCE'),
  '堵门必须给出入口净空原因'
);

const collision = spatial.validateCandidate({
  item: { id: 'b', kind: 'table2', mx: 5.5, my: 6.5, rotation: 0 },
  floor,
  geometry,
  placements: [
    { id: 'a', kind: 'table4', mx: 5.5, my: 6.5, rotation: 0 }
  ],
  floorGeometrySystem,
  clearDepthM: 1.2,
  ignoreId: 'b'
});
assert.equal(collision.status, 'red', '家具本体重叠必须禁止');
assert.ok(collision.issues.some(row => row.code === 'FURNITURE_COLLISION'));

const snapped = spatial.snap(3.13);
assert.equal(snapped, 3.25, '拖动坐标必须吸附0.25m网格');

const found = spatial.findFirstValidPosition({
  kind: 'table4',
  floor,
  geometry,
  placements: [],
  floorGeometrySystem,
  clearDepthM: 1.2
});
assert.ok(found, '正常门店必须能寻找合法4人桌位置');
assert.equal((found.x * 4) % 1, 0, '自动摆位X必须落在0.25m网格');
assert.equal((found.y * 4) % 1, 0, '自动摆位Y必须落在0.25m网格');

const analysis = spatial.analyzeFloor({
  floor: {
    ...floor,
    editorPlacements: [
      { id: 't1', kind: 'table4', mx: found.x, my: found.y, rotation: 0 }
    ],
    tables: { 2: 0, 4: 1, 6: 0, 8: 0 }
  },
  geometry,
  areaMetrics: {
    effectiveDiningArea: 45,
    usableDiningSlots: []
  },
  floorGeometrySystem,
  clearDepthM: 1.2
});
assert.ok(['green', 'yellow'].includes(analysis.status), '合法方案只能为绿/黄状态');
assert.ok(analysis.furnitureUseArea >= 3.6, '空间诊断必须计算真实家具使用面积');
assert.ok(analysis.mainAisleWidthM >= 0.9, '合法方案必须保留至少0.9m主通道');

// Regression for the real CI failure from tests/renovation.test.js: old
// count-only tables used to be materialized onto legacy slot points too close
// to the kitchen divider, making an otherwise valid 150㎡ two-floor shop fail
// construction after V0.8.64. They must now be synthesized onto real legal
// 0.25m-grid positions.
const legacyGeometry = {
  widthM: 8.66,
  depthM: 8.66,
  polygon: [
    { x: 0, y: 0 },
    { x: 8.66, y: 0 },
    { x: 8.66, y: 8.66 },
    { x: 0, y: 8.66 }
  ],
  obstacles: [],
  entrances: [
    { side: 'south', x: 4.33, y: 8.66, width: 1.56 }
  ],
  diningSlots: [
    { x: 2.96, y: 3.64 },
    { x: 5.02, y: 3.64 },
    { x: 7.08, y: 3.64 },
    { x: 2.96, y: 5.44 },
    { x: 5.02, y: 5.44 },
    { x: 7.08, y: 5.44 },
    { x: 2.96, y: 7.24 },
    { x: 5.02, y: 7.24 },
    { x: 7.08, y: 7.24 }
  ]
};

const legacyFloor = {
  index: 0,
  area: 75,
  kitchenRatio: 0.27,
  storageRatio: 0.08,
  serviceRatio: 0.11,
  tables: { 2: 0, 4: 2, 6: 0, 8: 0 },
  editorPlacements: []
};

const legacyAnalysis = spatial.analyzeFloor({
  floor: legacyFloor,
  geometry: legacyGeometry,
  areaMetrics: {
    effectiveDiningArea: 39.8,
    usableDiningSlots: legacyGeometry.diningSlots
  },
  floorGeometrySystem,
  clearDepthM: 1.2
});

assert.ok(
  legacyAnalysis.valid,
  '旧数量式餐桌必须自动迁移到真实合法位置，不能让兼容门店无故无法开工'
);
assert.equal(
  legacyAnalysis.placements.filter(item => spatial.isTable(item.kind)).length,
  2,
  '2张旧4人桌必须全部物化为真实空间对象'
);
assert.ok(
  legacyAnalysis.placements.every(item => !spatial.isTable(item.kind) || item.my >= 4),
  '兼容迁移不得继续使用贴着后厨分界线的旧餐位点'
);

console.log('V0.8.64 renovation spatial model tests passed');

// Repository integration checks run in CI after the patch is applied.
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');

const systemPath = path.join(ROOT, 'src/renovation/renovationSystem.js');
const scenePath = path.join(ROOT, 'src/scenes/renovationScene.js');

if (fs.existsSync(systemPath) && fs.existsSync(scenePath)) {
  const systemSource = fs.readFileSync(systemPath, 'utf8');
  const sceneSource = fs.readFileSync(scenePath, 'utf8');

  assert.ok(systemSource.includes('V0864_SPATIAL_VALIDATION_INTEGRATION'), '空间模型必须接入装修核心指标');
  assert.ok(sceneSource.includes('V0864_RENOVATION_PLAYER_EXPERIENCE_INSTALL'), 'V0.8.64编辑器必须接入主场景');
  assert.ok(systemSource.includes("require('./renovationSpatialV0864.js')"), '装修核心必须读取统一空间模型');

  const renovationSystem = require('../src/renovation/renovationSystem.js');
  const tiny = renovationSystem.createFloor(0, 12);
  const tinyTables = Object.values(tiny.tables).reduce((sum, value) => sum + Number(value || 0), 0);
  assert.equal(tinyTables, 0, '12㎡小店不得再默认塞入8个座位');
}
