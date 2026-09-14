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

const negotiation =
  fs.readFileSync(
    path.join(
      ROOT,
      'src/property/propertyNegotiationSystem.js'
    ),
    'utf8'
  );

function hasField(
  source,
  field
) {
  return source.includes(
    field
  );
}

assert.ok(
  scene.includes(
    'V47_RENOVATION_REFERENCE_REBUILD'
  ) &&
  scene.includes(
    'V48_DYNAMIC_FLOOR_GEOMETRY_UI'
  ),
  'V48必须包含V47重构页面'
);

assert.ok(
  scene.includes(
    "require('../renovation/floorGeometrySystem.js')"
  ),
  '装修UI必须读取真实房型几何'
);

for (
  const token
  of [
    'getGeometryFrame(',
    'geometryPath(',
    'drawGeometryShell('
  ]
) {
  assert.ok(
    scene.includes(token),
    '动态房型渲染缺失：' +
      token
  );
}

for (
  const field
  of [
    'shapeName',
    'widthM',
    'depthM',
    'diningSlots',
    'obstacles',
    'entrances'
  ]
) {
  assert.ok(
    hasField(
      scene,
      field
    ),
    '动态房型字段缺失：' +
      field
  );
}

assert.ok(
  !scene.includes(
    "'v45_layout_dining'"
  ) &&
  !scene.includes(
    "'v45_layout_kitchen'"
  ),
  '主平面图禁止再次放大小型布局缩略图'
);

assert.ok(
  system.includes(
    'V48_DYNAMIC_FLOOR_GEOMETRY_SYSTEM'
  ) &&
  system.includes(
    "require('./floorGeometrySystem.js')"
  ),
  '装修计算系统必须接入房型几何'
);

assert.ok(
  system.includes(
    'effectiveDiningArea'
  ),
  '房型必须实际影响可用堂食面积'
);

assert.ok(
  /\\.efficiency\\b/.test(
    system
  ),
  '房型效率必须参与装修计算'
);

assert.ok(
  negotiation.includes(
    'V48_PROPERTY_GEOMETRY_FIELDS'
  ),
  '新签门店必须写入房型几何字段'
);

for (
  const field
  of [
    'layoutTypeId',
    'propertyTypeId',
    'independentToilet',
    'loadingAccess'
  ]
) {
  assert.ok(
    negotiation.includes(
      field
    ),
    '签约门店缺少房型字段：' +
      field
  );
}

console.log(
  'V48 dynamic floor integration tests passed'
);
