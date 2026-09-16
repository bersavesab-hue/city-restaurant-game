'use strict';

const assert =
  require('assert');

const fs =
  require('fs');

const path =
  require('path');

const ROOT =
  path.resolve(
    __dirname,
    '..'
  );

const scene =
  fs.readFileSync(
    path.join(
      ROOT,
      'src/scenes/renovationScene.js'
    ),
    'utf8'
  );

const system =
  fs.readFileSync(
    path.join(
      ROOT,
      'src/renovation/renovationSystem.js'
    ),
    'utf8'
  );

const geometrySystem =
  require(
    '../src/renovation/floorGeometrySystem.js'
  );

assert.ok(
  scene.includes(
    'V47_RENOVATION_REFERENCE_REBUILD'
  ),
  'V47 页面重构没有落地'
);

assert.ok(
  scene.includes(
    'V48_DYNAMIC_FLOOR_GEOMETRY_UI'
  ),
  'V48 动态房型 UI 没有落地'
);

assert.ok(
  system.includes(
    'V48_DYNAMIC_FLOOR_GEOMETRY_SYSTEM'
  ),
  'V48 装修计算系统没有接入房型几何'
);

const shapes = [
  {
    id: 'single_bay',
    expected: 'standard'
  },
  {
    id: 'long_narrow',
    expected: 'narrow'
  },
  {
    id: 'double_bay',
    expected: 'wide'
  },
  {
    id: 'corner_l',
    expected: 'l_shape'
  },
  {
    id: 'front_back',
    expected: 'front_narrow'
  },
  {
    id: 'through_shop',
    expected: 'through'
  },
  {
    id: 'stall',
    expected: 'stall'
  }
];

for (
  let i = 0;
  i < shapes.length;
  i++
) {
  const item =
    geometrySystem
      .getFloorGeometry(
        {
          id:
            'shape_' +
            i,
          usableArea:
            100,
          frontage:
            8,
          layoutTypeId:
            shapes[i].id
        },
        0,
        100,
        1
      );

  assert.strictEqual(
    item.shapeId,
    shapes[i].expected,
    '房型映射错误：' +
      shapes[i].id
  );
}

assert.ok(
  system.includes(
    'effectiveDiningArea'
  ),
  '房型效率没有参与实际家具容量计算'
);

console.log(
  'V47+V48 combined package tests passed'
);
