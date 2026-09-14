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

const geometry =
  fs.readFileSync(
    path.join(
      ROOT,
      'src/renovation/floorGeometrySystem.js'
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
  geometry.includes(
    'V48_DYNAMIC_FLOOR_GEOMETRY'
  ),
  'V48 房型几何引擎不存在'
);

assert.ok(
  system.includes(
    'V48_DYNAMIC_FLOOR_GEOMETRY_SYSTEM'
  ),
  'V48 装修计算系统没有接入房型几何'
);

for (
  const token
  of [
    'standard',
    'narrow',
    'wide',
    'l_shape',
    'front_narrow',
    'through',
    'stall'
  ]
) {
  assert.ok(
    geometry.includes(
      token
    ),
    '动态房型缺失：' +
      token
  );
}

assert.ok(
  /\\.diningSlots\\b/.test(
    scene
  ),
  '餐桌没有使用动态房型候选点'
);

assert.ok(
  system.includes(
    'effectiveDiningArea'
  ),
  '房型效率没有参与实际家具容量计算'
);

console.log(
  'V47+V48 combined package tests passed'
);
