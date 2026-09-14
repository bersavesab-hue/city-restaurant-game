'use strict';

const fs =
  require('fs');

const path =
  require('path');

const ROOT =
  path.resolve(
    __dirname,
    '..'
  );

function replaceOnce(
  source,
  needle,
  replacement,
  label
) {
  if (
    !source.includes(
      needle
    )
  ) {
    throw new Error(
      'V48：找不到替换位置：' +
      label
    );
  }

  return source.replace(
    needle,
    replacement
  );
}

function patchRenovationSystem() {
  const file =
    path.join(
      ROOT,
      'src/renovation/renovationSystem.js'
    );

  let source =
    fs.readFileSync(
      file,
      'utf8'
    );

  if (
    source.includes(
      'V48_DYNAMIC_FLOOR_GEOMETRY_SYSTEM'
    )
  ) {
    return;
  }

  source =
    source.replace(
      '// V46_RENOVATION_PLAYABILITY_SYSTEM',
      '// V46_RENOVATION_PLAYABILITY_SYSTEM\n// V48_DYNAMIC_FLOOR_GEOMETRY_SYSTEM'
    );

  const requireNeedle =
`const config =
  require('./renovationConfig.js');`;

  const requireReplacement =
`const config =
  require('./renovationConfig.js');

const floorGeometrySystem =
  require('./floorGeometrySystem.js');`;

  source =
    replaceOnce(
      source,
      requireNeedle,
      requireReplacement,
      'floorGeometrySystem require'
    );

  // Capacity-aware table addition.
  const adjustStart =
    source.indexOf(
      '  adjustTable('
    );

  const decorStart =
    source.indexOf(
      '\n  adjustDecor(',
      adjustStart
    );

  if (
    adjustStart < 0 ||
    decorStart < 0
  ) {
    throw new Error(
      'V48：找不到 adjustTable'
    );
  }

  const adjustTable =
`  adjustTable(
    shopId,
    floorIndex,
    seats,
    delta
  ) {
    const key =
      String(seats);

    if (
      !config
        .tableFootprint[
          key
        ]
    ) {
      return null;
    }

    const shop =
      this.getShop(
        shopId
      );

    return this.mutatePlan(
      shopId,
      plan => {
        const floor =
          plan.floors[
            clamp(
              floorIndex,
              0,
              plan.floors.length -
                1
            )
          ];

        const current =
          Number(
            floor.tables[
              key
            ]
          ) || 0;

        if (
          delta > 0
        ) {
          const aisle =
            config
              .aisleModes[
                floor.aisleMode
              ];

          const geometry =
            floorGeometrySystem
              .getFloorGeometry(
                shop,
                floor.index,
                floor.area,
                plan.floors.length
              );

          const zoneRatio =
            floor.kitchenRatio +
            floor.storageRatio +
            floor.serviceRatio;

          const rawDining =
            Math.max(
              0,
              floor.area *
              (
                1 -
                zoneRatio
              )
            );

          const effectiveDining =
            rawDining *
            geometry
              .efficiency
              .dining;

          let used =
            0;

          Object.keys(
            floor.tables
          ).forEach(
            tableKey => {
              used +=
                (
                  Number(
                    floor.tables[
                      tableKey
                    ]
                  ) ||
                  0
                ) *
                config
                  .tableFootprint[
                    tableKey
                  ] *
                aisle.areaFactor;
            }
          );

          for (
            let i = 0;
            i <
            floor
              .privateRooms
              .length;
            i++
          ) {
            const room =
              floor
                .privateRooms[i];

            used +=
              7 +
              room.seats *
              1.55;
          }

          const nextUsed =
            used +
            config
              .tableFootprint[
                key
              ] *
            aisle.areaFactor;

          if (
            nextUsed >
            effectiveDining +
              0.01
          ) {
            return;
          }
        }

        floor.tables[
          key
        ] =
          Math.max(
            0,
            Math.min(
              40,
              current +
              delta
            )
          );
      }
    );
  }`;

  source =
    source.slice(
      0,
      adjustStart
    ) +
    adjustTable +
    source.slice(
      decorStart
    );

  // Geometry-aware metrics.
  const aisleNeedle =
`      const floor =
        plan.floors[i];

      const aisle =
        config
          .aisleModes[
            floor.aisleMode
          ];`;

  const aisleReplacement =
`      const floor =
        plan.floors[i];

      const aisle =
        config
          .aisleModes[
            floor.aisleMode
          ];

      const geometry =
        floorGeometrySystem
          .getFloorGeometry(
            shop,
            i,
            floor.area,
            plan.floors.length
          );`;

  source =
    replaceOnce(
      source,
      aisleNeedle,
      aisleReplacement,
      'geometry metrics'
    );

  const diningNeedle =
`      const diningArea =
        Math.max(
          0,
          floor.area *
          (
            1 -
            zoneRatio
          )
        );`;

  const diningReplacement =
`      const diningArea =
        Math.max(
          0,
          floor.area *
          (
            1 -
            zoneRatio
          )
        );

      const effectiveDiningArea =
        diningArea *
        geometry
          .efficiency
          .dining;`;

  source =
    replaceOnce(
      source,
      diningNeedle,
      diningReplacement,
      'effectiveDiningArea'
    );

  source =
    replaceOnce(
      source,
`      const remaining =
        diningArea -
        used;`,
`      const remaining =
        effectiveDiningArea -
        used;`,
      'remaining geometry'
    );

  source =
    replaceOnce(
      source,
`      const crowding =
        diningArea >
        0
          ? used /
            diningArea
          : 99;`,
`      const crowding =
        effectiveDiningArea >
        0
          ? used /
            effectiveDiningArea
          : 99;`,
      'crowding geometry'
    );

  source =
    replaceOnce(
      source,
`        diningArea:
          Number(
            diningArea.toFixed(1)
          ),`,
`        diningArea:
          Number(
            diningArea.toFixed(1)
          ),

        effectiveDiningArea:
          Number(
            effectiveDiningArea
              .toFixed(1)
          ),

        geometry,`,
      'floor metrics geometry'
    );

  source =
    replaceOnce(
      source,
`      serviceScore +=
        aisle
          .serviceEfficiency;`,
`      serviceScore +=
        aisle
          .serviceEfficiency *
        geometry
          .efficiency
          .service;`,
      'service efficiency geometry'
    );

  fs.writeFileSync(
    file,
    source,
    'utf8'
  );
}

function patchNegotiation() {
  const file =
    path.join(
      ROOT,
      'src/property/propertyNegotiationSystem.js'
    );

  let source =
    fs.readFileSync(
      file,
      'utf8'
    );

  if (
    source.includes(
      'V48_PROPERTY_GEOMETRY_FIELDS'
    )
  ) {
    return;
  }

  source =
    source.replace(
      "'use strict';",
      "'use strict';\n\n// V48_PROPERTY_GEOMETRY_FIELDS"
    );

  source =
    replaceOnce(
      source,
`      propertyTypeName:
        listing.propertyTypeName,

      layoutTypeName:
        listing.layoutTypeName,`,
`      propertyTypeId:
        listing.propertyTypeId,

      propertyTypeName:
        listing.propertyTypeName,

      layoutTypeId:
        listing.layoutTypeId,

      layoutTypeName:
        listing.layoutTypeName,`,
      'property/layout ids'
    );

  source =
    replaceOnce(
      source,
`      ceilingHeight:
        listing.ceilingHeight,

      exhaust:`,
`      ceilingHeight:
        listing.ceilingHeight,

      corner:
        Boolean(
          listing.corner
        ),

      independentToilet:
        Boolean(
          listing.independentToilet
        ),

      loadingAccess:
        listing.loadingAccess,

      propertyShapeVersion:
        1,

      exhaust:`,
      'geometry property fields'
    );

  fs.writeFileSync(
    file,
    source,
    'utf8'
  );
}

patchRenovationSystem();
patchNegotiation();

console.log(
  'V48 dynamic floor geometry patches applied'
);
