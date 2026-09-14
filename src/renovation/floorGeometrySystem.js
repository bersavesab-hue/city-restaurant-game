'use strict';

// V48_DYNAMIC_FLOOR_GEOMETRY
//
// Pure geometry layer:
// property data -> real-meter polygon -> obstacles -> capacity factors -> render slots.
//
// It deliberately contains no UI and no save-state mutation.

function clamp(
  value,
  min,
  max
) {
  return Math.max(
    min,
    Math.min(
      max,
      value
    )
  );
}

function hashText(text) {
  let h =
    2166136261;

  const source =
    String(
      text || ''
    );

  for (
    let i = 0;
    i <
    source.length;
    i++
  ) {
    h ^=
      source.charCodeAt(i);

    h =
      Math.imul(
        h,
        16777619
      );
  }

  return h >>> 0;
}

function polygonArea(
  polygon
) {
  let sum =
    0;

  for (
    let i = 0;
    i <
    polygon.length;
    i++
  ) {
    const a =
      polygon[i];

    const b =
      polygon[
        (
          i + 1
        ) %
        polygon.length
      ];

    sum +=
      a.x * b.y -
      b.x * a.y;
  }

  return Math.abs(
    sum
  ) / 2;
}

function pointInPolygon(
  point,
  polygon
) {
  let inside =
    false;

  for (
    let i = 0,
        j =
          polygon.length -
          1;
    i <
    polygon.length;
    j = i++
  ) {
    const xi =
      polygon[i].x;

    const yi =
      polygon[i].y;

    const xj =
      polygon[j].x;

    const yj =
      polygon[j].y;

    const intersect =
      (
        (
          yi >
          point.y
        ) !==
        (
          yj >
          point.y
        )
      ) &&
      (
        point.x <
        (
          (
            xj - xi
          ) *
          (
            point.y - yi
          )
        ) /
          (
            yj -
            yi ||
            1e-9
          ) +
        xi
      );

    if (intersect) {
      inside =
        !inside;
    }
  }

  return inside;
}

function inferLayoutId(
  shop
) {
  if (
    shop &&
    shop.layoutTypeId
  ) {
    return String(
      shop.layoutTypeId
    );
  }

  const name =
    String(
      shop &&
      shop.layoutTypeName ||
      ''
    );

  const byName = [
    ['狭长', 'long_narrow'],
    ['双开间', 'double_bay'],
    ['前店后厨', 'front_back'],
    ['L型', 'corner_l'],
    ['转角', 'corner_l'],
    ['前后通铺', 'through_shop'],
    ['上下两层', 'duplex_layout'],
    ['挑高', 'high_ceiling'],
    ['商场矩形', 'mall_rect'],
    ['档口', 'stall'],
    ['单开间', 'single_bay']
  ];

  for (
    let i = 0;
    i <
    byName.length;
    i++
  ) {
    if (
      name.indexOf(
        byName[i][0]
      ) >= 0
    ) {
      return byName[i][1];
    }
  }

  return '';
}

function inferShape(
  shop,
  floorArea
) {
  const layoutId =
    inferLayoutId(
      shop
    );

  // Explicit layout metadata always wins.
  if (
    layoutId ===
      'corner_l'
  ) {
    return 'l_shape';
  }

  if (
    layoutId ===
      'long_narrow'
  ) {
    return 'narrow';
  }

  if (
    layoutId ===
      'double_bay' ||
    layoutId ===
      'mall_rect'
  ) {
    return 'wide';
  }

  if (
    layoutId ===
      'front_back'
  ) {
    return 'front_narrow';
  }

  if (
    layoutId ===
      'through_shop'
  ) {
    return 'through';
  }

  if (
    layoutId ===
      'stall'
  ) {
    return 'stall';
  }

  // Old saves and early tests may have no frontage metadata.
  // Unknown geometry defaults to standard instead of inventing a 2.4m frontage.
  const rawFrontage =
    Number(
      shop &&
      shop.frontage
    );

  if (
    !Number.isFinite(
      rawFrontage
    ) ||
    rawFrontage <= 0
  ) {
    return 'standard';
  }

  const frontage =
    Math.max(
      2.4,
      rawFrontage
    );

  const impliedDepth =
    floorArea /
    Math.max(
      frontage,
      0.1
    );

  const aspect =
    impliedDepth /
    frontage;

  if (
    aspect >=
      2.15
  ) {
    return 'narrow';
  }

  if (
    aspect <=
      0.78
  ) {
    return 'wide';
  }

  return 'standard';
}

const SHAPES = {
  standard: {
    name: '标准方正',
    factor: 1,
    dining: 1,
    service: 1,
    polygon: [
      [0, 0],
      [1, 0],
      [1, 1],
      [0, 1]
    ]
  },

  narrow: {
    name: '狭长型',
    factor: 1,
    dining: 0.90,
    service: 0.92,
    polygon: [
      [0, 0],
      [1, 0],
      [1, 1],
      [0, 1]
    ]
  },

  wide: {
    name: '宽开间',
    factor: 1,
    dining: 1.02,
    service: 1.01,
    polygon: [
      [0, 0],
      [1, 0],
      [1, 1],
      [0, 1]
    ]
  },

  l_shape: {
    name: 'L型转角',
    factor: 0.8404,
    dining: 0.88,
    service: 0.90,
    polygon: [
      [0, 0],
      [1, 0],
      [1, 0.58],
      [0.62, 0.58],
      [0.62, 1],
      [0, 1]
    ]
  },

  front_narrow: {
    name: '前窄后宽',
    factor: 0.9104,
    dining: 0.91,
    service: 0.95,
    polygon: [
      [0, 0],
      [1, 0],
      [1, 0.68],
      [0.72, 1],
      [0.28, 1],
      [0, 0.68]
    ]
  },

  through: {
    name: '前后通铺',
    factor: 1,
    dining: 1.01,
    service: 1.05,
    polygon: [
      [0, 0],
      [1, 0],
      [1, 1],
      [0, 1]
    ]
  },

  stall: {
    name: '档口型',
    factor: 1,
    dining: 0.62,
    service: 1.06,
    polygon: [
      [0, 0],
      [1, 0],
      [1, 1],
      [0, 1]
    ]
  }
};

function scalePolygon(
  normalized,
  width,
  depth
) {
  return normalized.map(
    pair => ({
      x:
        Number(
          (
            pair[0] *
            width
          ).toFixed(3)
        ),

      y:
        Number(
          (
            pair[1] *
            depth
          ).toFixed(3)
        )
    })
  );
}

function makeObstacles(
  shop,
  shapeId,
  width,
  depth,
  floorIndex,
  floorCount,
  floorArea
) {
  const result =
    [];

  const seed =
    hashText(
      (
        shop &&
        shop.id ||
        shop &&
        shop.address ||
        'shop'
      ) +
      ':' +
      floorIndex
    );

  // Structural columns appear only in larger spaces.
  const columnCount =
    floorArea >= 260
      ? 4
      : floorArea >= 160
        ? 2
        : floorArea >= 95 &&
          seed % 3 === 0
          ? 1
          : 0;

  const candidates = [
    [0.36, 0.42],
    [0.64, 0.42],
    [0.36, 0.70],
    [0.64, 0.70]
  ];

  for (
    let i = 0;
    i <
    columnCount;
    i++
  ) {
    const pair =
      candidates[i];

    result.push({
      type:
        'column',
      x:
        width *
        pair[0],
      y:
        depth *
        pair[1],
      radius:
        0.22
    });
  }

  if (
    shop &&
    shop.independentToilet
  ) {
    result.push({
      type:
        'toilet',
      x:
        width * 0.06,
      y:
        depth * 0.06,
      w:
        Math.min(
          2.2,
          width * 0.22
        ),
      h:
        Math.min(
          2.4,
          depth * 0.16
        )
    });
  }

  if (
    floorCount > 1
  ) {
    result.push({
      type:
        'stair',
      x:
        width *
        (
          shapeId ===
            'narrow'
            ? 0.06
            : 0.76
        ),
      y:
        depth * 0.10,
      w:
        Math.min(
          2.0,
          width * 0.20
        ),
      h:
        Math.min(
          3.0,
          depth * 0.18
        )
    });
  }

  return result;
}

function makeDiningSlots(
  polygon,
  obstacles,
  width,
  depth,
  shapeId
) {
  const slots =
    [];

  const yStart =
    shapeId ===
      'stall'
      ? 0.56
      : 0.42;

  const stepX =
    clamp(
      width / 4.2,
      1.8,
      3.2
    );

  const stepY =
    clamp(
      depth / 6.2,
      1.8,
      3.1
    );

  for (
    let y =
      depth * yStart;
    y <=
      depth - 0.9;
    y += stepY
  ) {
    for (
      let x =
        0.9;
      x <=
        width - 0.9;
      x += stepX
    ) {
      const point = {
        x,
        y
      };

      if (
        !pointInPolygon(
          point,
          polygon
        )
      ) {
        continue;
      }

      let blocked =
        false;

      for (
        let i = 0;
        i <
        obstacles.length;
        i++
      ) {
        const o =
          obstacles[i];

        if (
          o.type ===
            'column'
        ) {
          const dx =
            point.x -
            o.x;

          const dy =
            point.y -
            o.y;

          if (
            Math.sqrt(
              dx * dx +
              dy * dy
            ) <
            1.0
          ) {
            blocked =
              true;

            break;
          }
        } else if (
          point.x >=
            o.x - 0.4 &&
          point.x <=
            o.x +
            o.w +
            0.4 &&
          point.y >=
            o.y - 0.4 &&
          point.y <=
            o.y +
            o.h +
            0.4
        ) {
          blocked =
            true;

          break;
        }
      }

      if (!blocked) {
        slots.push({
          x:
            Number(
              x.toFixed(2)
            ),
          y:
            Number(
              y.toFixed(2)
            )
        });
      }
    }
  }

  return slots;
}

function getFloorGeometry(
  shop,
  floorIndex,
  floorArea,
  floorCount
) {
  const area =
    Math.max(
      8,
      Number(
        floorArea
      ) ||
      Number(
        shop &&
        shop.usableArea
      ) ||
      60
    );

  const shapeId =
    inferShape(
      shop,
      area
    );

  const shape =
    SHAPES[
      shapeId
    ] ||
    SHAPES.standard;

  let width =
    Math.max(
      2.8,
      Number(
        shop &&
        shop.frontage
      ) ||
      Math.sqrt(
        area
      )
    );

  // A single floor may only carry part of a multi-floor property's usable area.
  // Limit absurd width when the original frontage came from the whole gross shell.
  const maxReasonableWidth =
    Math.sqrt(
      area
    ) *
    (
      shapeId ===
        'wide'
        ? 2.15
        : 1.72
    );

  width =
    Math.min(
      width,
      Math.max(
        3.2,
        maxReasonableWidth
      )
    );

  if (
    shapeId ===
      'narrow'
  ) {
    width =
      Math.min(
        width,
        Math.max(
          3.0,
          Math.sqrt(
            area /
            2.25
          )
        )
      );
  }

  if (
    shapeId ===
      'wide'
  ) {
    width =
      Math.max(
        width,
        Math.sqrt(
          area *
          1.45
        )
      );
  }

  const depth =
    area /
    Math.max(
      0.1,
      width *
      shape.factor
    );

  const polygon =
    scalePolygon(
      shape.polygon,
      width,
      depth
    );

  const actualArea =
    polygonArea(
      polygon
    );

  const obstacles =
    makeObstacles(
      shop,
      shapeId,
      width,
      depth,
      floorIndex,
      floorCount,
      area
    );

  const diningSlots =
    makeDiningSlots(
      polygon,
      obstacles,
      width,
      depth,
      shapeId
    );

  const frontage =
    width;

  const entrances = [
    {
      side:
        'south',
      x:
        width * 0.50,
      y:
        depth,
      width:
        Math.min(
          1.8,
          Math.max(
            0.9,
            frontage * 0.18
          )
        )
    }
  ];

  if (
    shapeId ===
      'through'
  ) {
    entrances.push({
      side:
        'north',
      x:
        width * 0.52,
      y:
        0,
      width:
        Math.min(
          1.5,
          Math.max(
            0.8,
            frontage * 0.16
          )
        )
    });
  }

  return {
    version:
      1,

    shapeId,

    shapeName:
      shape.name,

    floorIndex,

    floorCount,

    widthM:
      Number(
        width.toFixed(2)
      ),

    depthM:
      Number(
        depth.toFixed(2)
      ),

    areaM2:
      Number(
        actualArea.toFixed(1)
      ),

    polygon,

    obstacles,

    entrances,

    diningSlots,

    efficiency: {
      dining:
        shape.dining,

      service:
        shape.service
    },

    canPrivateRoom:
      area >= 62 &&
      width >= 4.8 &&
      shapeId !==
        'stall',

    recommendedMaxRooms:
      shapeId ===
        'narrow'
        ? Math.max(
            0,
            Math.floor(
              area / 70
            )
          )
        : Math.max(
            0,
            Math.floor(
              area / 45
            )
          ),

    source: {
      grossArea:
        Number(
          shop &&
          shop.grossArea
        ) || null,

      usableArea:
        Number(
          shop &&
          shop.usableArea
        ) || null,

      frontage:
        Number(
          shop &&
          shop.frontage
        ) || null,

      depth:
        Number(
          shop &&
          shop.depth
        ) || null,

      layoutTypeId:
        inferLayoutId(
          shop
        ),

      layoutTypeName:
        shop &&
        shop.layoutTypeName ||
        ''
    }
  };
}

module.exports = {
  inferLayoutId,
  inferShape,
  polygonArea,
  pointInPolygon,
  getFloorGeometry
};
