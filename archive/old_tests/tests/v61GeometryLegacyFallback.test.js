'use strict';

const assert =
  require('assert');

const geometry =
  require(
    '../src/renovation/floorGeometrySystem.js'
  );

const legacyShop = {
  id:
    'legacy_without_frontage',
  usableArea:
    150,
  floor:
    '1-2层'
};

const floor =
  geometry
    .getFloorGeometry(
      legacyShop,
      0,
      75,
      2
    );

assert.strictEqual(
  floor.shapeId,
  'standard',
  '没有面宽和房型元数据的旧门店不能被误判成狭长铺'
);

assert.strictEqual(
  floor.efficiency.dining,
  1,
  '旧门店缺少几何元数据时应采用标准空间效率'
);

console.log(
  'v61GeometryLegacyFallback.test.js PASS'
);
