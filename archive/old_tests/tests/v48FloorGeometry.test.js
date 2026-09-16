'use strict';

const assert =
  require('assert');

const geometry =
  require('../src/renovation/floorGeometrySystem.js');

function approx(
  a,
  b,
  tolerance
) {
  return (
    Math.abs(
      a - b
    ) <=
    tolerance
  );
}

const narrow =
  geometry.getFloorGeometry(
    {
      id:
        'narrow',
      usableArea:
        75,
      frontage:
        3.5,
      depth:
        21.4,
      layoutTypeId:
        'long_narrow',
      layoutTypeName:
        '狭长型'
    },
    0,
    75,
    1
  );

assert.strictEqual(
  narrow.shapeId,
  'narrow'
);

assert.ok(
  narrow.depthM >
    narrow.widthM *
    2,
  '75㎡狭长铺必须明显体现狭长比例'
);

assert.ok(
  narrow.efficiency.dining <
    1,
  '狭长铺必须有实际空间效率损失'
);

const wide =
  geometry.getFloorGeometry(
    {
      id:
        'wide',
      usableArea:
        180,
      frontage:
        12,
      layoutTypeId:
        'double_bay',
      layoutTypeName:
        '双开间'
    },
    0,
    180,
    1
  );

assert.strictEqual(
  wide.shapeId,
  'wide'
);

assert.ok(
  wide.widthM >
    narrow.widthM,
  '大双开间必须比小狭长铺更宽'
);

const lshape =
  geometry.getFloorGeometry(
    {
      id:
        'l',
      usableArea:
        120,
      frontage:
        9,
      layoutTypeId:
        'corner_l',
      layoutTypeName:
        'L型转角'
    },
    0,
    120,
    1
  );

assert.strictEqual(
  lshape.shapeId,
  'l_shape'
);

assert.ok(
  lshape.polygon.length >
    4,
  'L型铺不能仍然是四点矩形'
);

assert.ok(
  approx(
    geometry.polygonArea(
      lshape.polygon
    ),
    120,
    0.8
  ),
  '生成多边形面积必须接近真实楼层面积'
);

const multi =
  geometry.getFloorGeometry(
    {
      id:
        'multi',
      usableArea:
        220,
      frontage:
        8,
      layoutTypeId:
        'duplex_layout',
      layoutTypeName:
        '上下两层'
    },
    1,
    110,
    2
  );

assert.ok(
  multi.obstacles.some(
    item =>
      item.type ===
      'stair'
  ),
  '多层店必须生成楼梯核心'
);

assert.ok(
  narrow.diningSlots.length >
    0 &&
  wide.diningSlots.length >
    narrow.diningSlots.length,
  '更大的宽店应提供更多可摆餐桌候选点'
);

console.log(
  'V48 floor geometry engine tests passed'
);
