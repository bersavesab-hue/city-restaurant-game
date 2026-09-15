'use strict';

// V46_RENOVATION_PLAYABILITY_SYSTEM
// V48_DYNAMIC_FLOOR_GEOMETRY_SYSTEM

const gameState =
  require('../core/gameState.js');

const simulationSystem =
  require('../core/simulationSystem.js');

const shopLifecycle =
  require('../core/shopLifecycleV0816.js');

const database =
  require('./renovationEquipmentDatabaseV0817.js');

const config =
  database.renovationConfig;

const floorGeometrySystem =
  require('./floorGeometrySystem.js');

// V0864_SPATIAL_VALIDATION_INTEGRATION
const renovationSpatial =
  require('./renovationSpatialV0864.js');

function clone(value) {
  return JSON.parse(
    JSON.stringify(value)
  );
}

function clamp(value, min, max) {
  return Math.max(
    min,
    Math.min(max, value)
  );
}

function hashFloat(text) {
  let h = 2166136261;
  const source = String(text);

  for (let i = 0; i < source.length; i++) {
    h ^= source.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }

  return ((h >>> 0) % 100000) / 100000;
}

class RenovationSystem {
  constructor() {
    this.history =
      {};
  }

  getHistory(shopId) {
    if (
      !this.history[
        shopId
      ]
    ) {
      this.history[
        shopId
      ] = {
        undo: [],
        redo: []
      };
    }

    return this.history[
      shopId
    ];
  }

  getShop(shopId) {
    const business =
      gameState.getBusiness();

    return business.shops.find(
      item =>
        item.id === shopId
    ) || null;
  }

  getStore() {
    return gameState.getRenovations();
  }

  getMaxFloors(shop) {
    const raw =
      String(
        shop.floor || ''
      );

    if (
      raw.indexOf('1-3') >= 0
    ) {
      return 3;
    }

    if (
      raw.indexOf('1-2') >= 0
    ) {
      return 2;
    }

    return 1;
  }

  getAuthoritativeUsableArea(shop) {
    return Math.max(
      8,
      Number(
        shop &&
        shop.usableArea
      ) ||
      Number(
        shop &&
        shop.grossArea
      ) ||
      60
    );
  }

  normalizeFloorAreas(
    plan,
    shop
  ) {
    if (
      !plan ||
      !Array.isArray(
        plan.floors
      ) ||
      !plan.floors.length
    ) {
      return;
    }

    const authoritative =
      this.getAuthoritativeUsableArea(
        shop
      );

    const rawTotal =
      plan.floors.reduce(
        (sum, floor) =>
          sum +
          Math.max(
            0,
            Number(
              floor.area
            ) || 0
          ),
        0
      );

    let allocated = 0;

    for (
      let i = 0;
      i < plan.floors.length;
      i++
    ) {
      const floor =
        plan.floors[i];

      const weight =
        rawTotal > 0
          ? Math.max(
              0,
              Number(
                floor.area
              ) || 0
            ) /
            rawTotal
          : 1 /
            plan.floors.length;

      const area =
        i ===
        plan.floors.length - 1
          ? authoritative -
            allocated
          : Number(
              (
                authoritative *
                weight
              ).toFixed(1)
            );

      floor.area =
        Number(
          Math.max(
            0.1,
            area
          ).toFixed(1)
        );

      allocated +=
        floor.area;
    }
  }

  createFloor(
    index,
    area
  ) {
    // V0864_LEGAL_EMPTY_START
    // Never create an illegal restaurant and ask the player to repair it.
    // New floors start as a valid empty shell; the one-tap auto-layout or the
    // furniture editor adds only placements that pass the spatial validator.
    return {
      index,
      name:
        '第' +
        (index + 1) +
        '层',

      area:
        Number(
          area.toFixed(1)
        ),

      kitchenRatio:
        index === 0
          ? 0.27
          : 0.18,

      storageRatio:
        0.08,

      serviceRatio:
        0.11,

      aisleMode:
        'standard',

      tables: {
        2: 0,
        4: 0,
        6: 0,
        8: 0
      },

      editorPlacements: [],
      privateRooms: []
    };
  }

  ensurePlan(shopId) {
    const shop =
      this.getShop(shopId);

    if (!shop) {
      return null;
    }

    const store =
      this.getStore();

    if (!store[shopId]) {
      const maxFloors =
        this.getMaxFloors(shop);

      const usable =
        Math.max(
          1,
          Number(
            shop.usableArea ||
            shop.grossArea ||
            60
          )
        );

      const perFloor =
        usable /
        maxFloors;

      const floors = [];

      for (
        let i = 0;
        i < maxFloors;
        i++
      ) {
        floors.push(
          this.createFloor(
            i,
            perFloor
          )
        );
      }

      store[shopId] = {
        shopId,

        status:
          'draft',

        activeFloor:
          0,

        hallStyle:
          'simple',

        materialGrade:
          'budget',

        lightingLevel:
          'basic',

        decorCounts: {
          plant: 0,
          pendant: 0,
          screen: 0,
          sofa: 0
        },

        floors,

        selectedContractorId:
          null,

        construction:
          null
      };
    }

    if (
      !store[shopId]
        .decorCounts
    ) {
      store[shopId]
        .decorCounts = {
          plant: 0,
          pendant: 0,
          screen: 0,
          sofa: 0
        };
    }

    // Old saves could carry rounded or stale per-floor areas. The property
    // usable area is authoritative; floor allocations must add up to it.
    this.normalizeFloorAreas(
      store[shopId],
      shop
    );

    return clone(
      store[shopId]
    );
  }

  mutatePlan(
    shopId,
    callback,
    options
  ) {
    this.ensurePlan(shopId);

    const plan =
      this.getStore()[shopId];

    const opts =
      options ||
      {};

    if (
      !opts.skipHistory &&
      plan.status !==
        'constructing' &&
      plan.status !==
        'completed'
    ) {
      const history =
        this.getHistory(
          shopId
        );

      history.undo.push(
        clone(
          plan
        )
      );

      if (
        history.undo.length >
        20
      ) {
        history.undo.shift();
      }

      history.redo =
        [];
    }

    callback(plan);

    return clone(plan);
  }

  canUndo(shopId) {
    return (
      this.getHistory(
        shopId
      ).undo.length >
      0
    );
  }

  canRedo(shopId) {
    return (
      this.getHistory(
        shopId
      ).redo.length >
      0
    );
  }

  undo(shopId) {
    const store =
      this.getStore();

    const current =
      store[
        shopId
      ];

    if (
      !current ||
      current.status ===
        'constructing' ||
      current.status ===
        'completed'
    ) {
      return null;
    }

    const history =
      this.getHistory(
        shopId
      );

    const previous =
      history.undo.pop();

    if (!previous) {
      return null;
    }

    history.redo.push(
      clone(
        current
      )
    );

    store[
      shopId
    ] =
      clone(
        previous
      );

    return clone(
      store[
        shopId
      ]
    );
  }

  redo(shopId) {
    const store =
      this.getStore();

    const current =
      store[
        shopId
      ];

    if (
      !current ||
      current.status ===
        'constructing' ||
      current.status ===
        'completed'
    ) {
      return null;
    }

    const history =
      this.getHistory(
        shopId
      );

    const next =
      history.redo.pop();

    if (!next) {
      return null;
    }

    history.undo.push(
      clone(
        current
      )
    );

    store[
      shopId
    ] =
      clone(
        next
      );

    return clone(
      store[
        shopId
      ]
    );
  }

  setActiveFloor(
    shopId,
    index
  ) {
    return this.mutatePlan(
      shopId,
      plan => {
        plan.activeFloor =
          clamp(
            Math.floor(index),
            0,
            plan.floors.length - 1
          );
      }
    );
  }

  adjustZone(
    shopId,
    floorIndex,
    key,
    delta
  ) {
    const rules =
      config.zoneRules;

    const range = {
      kitchenRatio: [
        rules.minKitchenRatio,
        rules.maxKitchenRatio
      ],
      storageRatio: [
        rules.minStorageRatio,
        rules.maxStorageRatio
      ],
      serviceRatio: [
        rules.minServiceRatio,
        rules.maxServiceRatio
      ]
    }[key];

    if (!range) {
      return null;
    }

    return this.mutatePlan(
      shopId,
      plan => {
        const floor =
          plan.floors[
            clamp(
              floorIndex,
              0,
              plan.floors.length - 1
            )
          ];

        const otherZoneRatio =
          floor.kitchenRatio +
          floor.storageRatio +
          floor.serviceRatio -
          floor[key];

        const area =
          this.calculateFloorArea(
            this.getShop(shopId),
            plan,
            floor,
            floor.index
          );

        const requiredDiningRatio =
          Math.max(
            config.zoneRules
              .minDiningRatio,
            config.zoneRules
              .minDiningAreaM2 /
              floor.area,
            (
              area.occupiedArea /
              Math.max(
                0.01,
                Math.min(
                  1,
                  area.geometry
                    .efficiency
                    .dining
                )
              ) +
              area
                .structuralReservedArea
            ) /
            floor.area
          );

        const maxByDining =
          1 -
          requiredDiningRatio -
          otherZoneRatio;

        floor[key] =
          Number(
            clamp(
              floor[key] +
              delta,
              range[0],
              Math.max(
                range[0],
                Math.min(
                  range[1],
                  maxByDining
                )
              )
            ).toFixed(2)
          );
      }
    );
  }

  setZoneRatios(
    shopId,
    floorIndex,
    values,
    options
  ) {
    const rules =
      config.zoneRules;

    const shop =
      this.getShop(shopId);

    return this.mutatePlan(
      shopId,
      plan => {
        const floor =
          plan.floors[
            clamp(
              floorIndex,
              0,
              plan.floors.length - 1
            )
          ];

        const next = {
          kitchenRatio:
            clamp(
              Number(
                values.kitchenRatio
              ),
              rules.minKitchenRatio,
              rules.maxKitchenRatio
            ),
          storageRatio:
            clamp(
              Number(
                values.storageRatio
              ),
              rules.minStorageRatio,
              rules.maxStorageRatio
            ),
          serviceRatio:
            clamp(
              Number(
                values.serviceRatio
              ),
              rules.minServiceRatio,
              rules.maxServiceRatio
            )
        };

        const currentArea =
          this.calculateFloorArea(
            shop,
            plan,
            floor,
            floor.index
          );

        const requiredDiningRatio =
          Math.max(
            rules.minDiningRatio,
            rules.minDiningAreaM2 /
              floor.area,
            (
              currentArea
                .occupiedArea /
              Math.max(
                0.01,
                Math.min(
                  1,
                  currentArea
                    .geometry
                    .efficiency
                    .dining
                )
              ) +
              currentArea
                .structuralReservedArea
            ) /
            floor.area
          );

        const maxZones =
          Math.max(
            rules.minKitchenRatio +
            rules.minStorageRatio +
            rules.minServiceRatio,
            1 -
            requiredDiningRatio
          );

        const total =
          next.kitchenRatio +
          next.storageRatio +
          next.serviceRatio;

        if (total > maxZones) {
          let overflow =
            total -
            maxZones;

          const kitchenReduction =
            Math.min(
              overflow,
              next.kitchenRatio -
              rules.minKitchenRatio
            );

          next.kitchenRatio =
            next.kitchenRatio -
            kitchenReduction;

          overflow -=
            kitchenReduction;

          const storageReduction =
            Math.min(
              overflow,
              next.storageRatio -
              rules.minStorageRatio
            );

          next.storageRatio -=
            storageReduction;

          overflow -=
            storageReduction;

          next.serviceRatio =
            Math.max(
              rules.minServiceRatio,
              next.serviceRatio -
              overflow
            );
        }

        floor.kitchenRatio =
          Number(
            next.kitchenRatio
              .toFixed(3)
          );

        floor.storageRatio =
          Number(
            next.storageRatio
              .toFixed(3)
          );

        floor.serviceRatio =
          Number(
            next.serviceRatio
              .toFixed(3)
          );
      },
      options
    );
  }

  getStructuralReservedArea(
    geometry,
    floor
  ) {
    let obstacleArea = 0;

    const backRatio =
      clamp(
        floor.kitchenRatio +
        floor.storageRatio,
        0,
        0.8
      );

    const serviceWidthRatio =
      clamp(
        floor.serviceRatio /
        Math.max(
          0.01,
          1 -
          backRatio
        ),
        0,
        0.72
      );

    const obstacles =
      geometry.obstacles ||
      [];

    for (
      let i = 0;
      i < obstacles.length;
      i++
    ) {
      const item =
        obstacles[i];

      const centerX =
        item.type ===
          'column'
          ? item.x
          : item.x +
            (
              Number(item.w) ||
              0
            ) /
            2;

      const centerY =
        item.type ===
          'column'
          ? item.y
          : item.y +
            (
              Number(item.h) ||
              0
            ) /
            2;

      // Back-of-house and service-zone structures are already accounted for
      // by their zone area and must not be deducted from dining a second time.
      if (
        centerY /
          geometry.depthM <
          backRatio ||
        centerX /
          geometry.widthM <
          serviceWidthRatio
      ) {
        continue;
      }

      obstacleArea +=
        item.type ===
          'column'
          ? Math.PI *
            Math.pow(
              Number(
                item.radius
              ) || 0.22,
              2
            )
          : Math.max(
              0,
              Number(item.w) || 0
            ) *
            Math.max(
              0,
              Number(item.h) || 0
            );
    }

    const entranceArea =
      (
        geometry.entrances ||
        []
      ).reduce(
        (sum, entrance) =>
          sum +
          Math.max(
            0.9,
            Number(
              entrance.width
            ) || 0
          ) *
          config.zoneRules
            .entranceClearDepthM,
        0
      );

    return Number(
      (
        obstacleArea +
        entranceArea
      ).toFixed(1)
    );
  }

  getUsableDiningSlots(
    geometry,
    floor
  ) {
    const backRatio =
      clamp(
        floor.kitchenRatio +
        floor.storageRatio,
        0,
        0.8
      );

    const lowerRatio =
      Math.max(
        0.01,
        1 -
        backRatio
      );

    const serviceWidthRatio =
      clamp(
        floor.serviceRatio /
        lowerRatio,
        0,
        0.72
      );

    return (
      geometry.diningSlots ||
      []
    ).filter(point => {
      const yRatio =
        point.y /
        Math.max(
          0.1,
          geometry.depthM
        );

      const xRatio =
        point.x /
        Math.max(
          0.1,
          geometry.widthM
        );

      if (
        yRatio <
          backRatio + 0.025 ||
        xRatio <
          serviceWidthRatio + 0.025
      ) {
        return false;
      }

      const entrances =
        geometry.entrances ||
        [];

      for (
        let i = 0;
        i < entrances.length;
        i++
      ) {
        const entrance =
          entrances[i];

        if (
          entrance.side ===
            'south' &&
          point.y >
            geometry.depthM -
            config.zoneRules
              .entranceClearDepthM &&
          Math.abs(
            point.x -
            entrance.x
          ) <
            entrance.width /
              2 +
            0.45
        ) {
          return false;
        }
      }

      return true;
    });
  }

  calculateFloorArea(
    shop,
    plan,
    floor,
    floorIndex
  ) {
    const aisle =
      config.aisleModes[
        floor.aisleMode
      ] ||
      config.aisleModes
        .standard;

    const geometry =
      floorGeometrySystem
        .getFloorGeometry(
          shop,
          floorIndex,
          floor.area,
          plan.floors.length
        );

    const kitchenArea =
      floor.area *
      floor.kitchenRatio;

    const storageArea =
      floor.area *
      floor.storageRatio;

    const serviceArea =
      floor.area *
      floor.serviceRatio;

    const diningArea =
      Math.max(
        0,
        floor.area -
        kitchenArea -
        storageArea -
        serviceArea
      );

    const structuralReservedArea =
      this.getStructuralReservedArea(
        geometry,
        floor
      );

    const usableDiningSlots =
      this.getUsableDiningSlots(
        geometry,
        floor
      );

    // Shape efficiency may reduce capacity but must never manufacture area.
    const effectiveDiningArea =
      Math.max(
        0,
        diningArea -
        structuralReservedArea
      ) *
      Math.min(
        1,
        geometry.efficiency
          .dining
      );

    let tableArea = 0;
    let tableSeats = 0;

    Object.keys(
      floor.tables
    ).forEach(key => {
      const count =
        Math.max(
          0,
          Number(
            floor.tables[key]
          ) || 0
        );

      tableArea +=
        count *
        config.tableFootprint[
          key
        ] *
        aisle.areaFactor;

      tableSeats +=
        count *
        Number(key);
    });

    let privateRoomArea = 0;
    let privateRoomSeats = 0;

    for (
      let i = 0;
      i < floor.privateRooms.length;
      i++
    ) {
      const room =
        floor.privateRooms[i];

      privateRoomArea +=
        7 +
        room.seats *
        1.55;

      privateRoomSeats +=
        room.seats;
    }

    const occupiedArea =
      tableArea +
      privateRoomArea;

    const remainingArea =
      effectiveDiningArea -
      occupiedArea;

    const zoneTotal =
      kitchenArea +
      storageArea +
      serviceArea +
      diningArea;

    const minimumDining =
      Math.max(
        config.zoneRules
          .minDiningAreaM2,
        floor.area *
        config.zoneRules
          .minDiningRatio
      );

    const warnings = [];

    if (
      diningArea + 0.01 <
      minimumDining
    ) {
      warnings.push(
        '堂食区低于最小面积'
      );
    }

    if (remainingArea < -0.01) {
      warnings.push(
        '家具与包厢超出可摆面积'
      );
    }

    if (
      tableArea > 0 &&
      (
        usableDiningSlots
      ).length <
      Object.keys(
        floor.tables
      ).reduce(
        (sum, key) =>
          sum +
          Number(
            floor.tables[key]
          ),
        0
      )
    ) {
      warnings.push(
        '可落位餐桌点不足'
      );
    }

    return {
      aisle,
      geometry,
      usableDiningSlots,
      kitchenArea,
      storageArea,
      serviceArea,
      diningArea,
      structuralReservedArea,
      effectiveDiningArea,
      tableArea,
      tableSeats,
      privateRoomArea,
      privateRoomSeats,
      occupiedArea,
      remainingArea,
      zoneTotal,
      minimumDining,
      areaUtilization:
        effectiveDiningArea > 0
          ? occupiedArea /
            effectiveDiningArea
          : 99,
      warnings,
      valid:
        warnings.length === 0 &&
        Math.abs(
          zoneTotal -
          floor.area
        ) <= 0.11
    };
  }

  cycleAisle(
    shopId,
    floorIndex
  ) {
    const ids =
      Object.keys(
        config.aisleModes
      );

    return this.mutatePlan(
      shopId,
      plan => {
        const floor =
          plan.floors[floorIndex];

        const current =
          ids.indexOf(
            floor.aisleMode
          );

        floor.aisleMode =
          ids[
            (
              current + 1
            ) %
            ids.length
          ];
      }
    );
  }

  adjustTable(
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
        const index =
          clamp(
            floorIndex,
            0,
            plan.floors.length -
              1
          );

        const floor =
          plan.floors[index];

        if (!Array.isArray(floor.editorPlacements)) {
          floor.editorPlacements = [];
        }

        // Materialize old count-only tables into legal real-space objects
        // before applying the requested delta.
        const baseArea =
          this.calculateFloorArea(
            shop,
            plan,
            floor,
            index
          );

        const materialized =
          renovationSpatial
            .materializeLegacyPlacements(
              floor,
              baseArea.geometry,
              baseArea.usableDiningSlots,
              floorGeometrySystem,
              config.zoneRules
                .entranceClearDepthM
            );

        const expectedCount =
          Object.keys(floor.tables)
            .reduce(
              (sum, tableKey) =>
                sum +
                Math.max(
                  0,
                  Number(floor.tables[tableKey]) || 0
                ),
              0
            );

        const actualCount =
          floor.editorPlacements
            .filter(
              item =>
                renovationSpatial
                  .isTable(item.kind)
            )
            .length;

        if (actualCount < expectedCount) {
          plan.editorPlacementSeq =
            Math.max(0, Number(plan.editorPlacementSeq) || 0);

          floor.editorPlacements =
            materialized.map(
              item => {
                if (!item.synthetic) {
                  return item;
                }

                plan.editorPlacementSeq += 1;

                return {
                  ...item,
                  id:
                    'reno_compat_' +
                    index +
                    '_' +
                    item.kind +
                    '_' +
                    plan.editorPlacementSeq,
                  synthetic: false
                };
              }
            );
        }

        const amount =
          Math.max(
            1,
            Math.floor(
              Math.abs(
                Number(delta) || 0
              )
            )
          );

        if (Number(delta) > 0) {
          for (let step = 0; step < amount; step++) {
            const area =
              this.calculateFloorArea(
                shop,
                plan,
                floor,
                index
              );

            const currentTableCount =
              Object.keys(floor.tables)
                .reduce(
                  (sum, tableKey) =>
                    sum +
                    Math.max(
                      0,
                      Number(floor.tables[tableKey]) || 0
                    ),
                  0
                );

            const extraArea =
              config.tableFootprint[key] *
              area.aisle.areaFactor;

            if (
              area.occupiedArea +
                extraArea >
                area.effectiveDiningArea +
                0.01 ||
              currentTableCount >=
                area.usableDiningSlots.length
            ) {
              break;
            }

            const rotations =
              Number(key) >= 6
                ? [90, 0]
                : [0, 90];

            let committed =
              false;

            for (
              let rotationIndex = 0;
              rotationIndex < rotations.length;
              rotationIndex++
            ) {
              const rotation =
                rotations[rotationIndex];

              const found =
                renovationSpatial
                  .findFirstValidPosition({
                    kind:
                      'table' +
                      key,
                    floor,
                    geometry:
                      area.geometry,
                    placements:
                      floor.editorPlacements,
                    floorGeometrySystem,
                    clearDepthM:
                      config.zoneRules
                        .entranceClearDepthM,
                    rotation
                  });

              if (!found) {
                continue;
              }

              plan.editorPlacementSeq =
                Math.max(0, Number(plan.editorPlacementSeq) || 0) +
                1;

              const placement = {
                id:
                  'reno_compat_' +
                  index +
                  '_table' +
                  key +
                  '_' +
                  plan.editorPlacementSeq,
                kind:
                  'table' +
                  key,
                mx:
                  Number(found.x),
                my:
                  Number(found.y),
                rotation:
                  Number(found.rotation) ||
                  rotation
              };

              floor.editorPlacements
                .push(placement);

              floor.tables[key] =
                Math.min(
                  40,
                  Math.max(
                    0,
                    Number(floor.tables[key]) || 0
                  ) +
                    1
                );

              const afterArea =
                this.calculateFloorArea(
                  shop,
                  plan,
                  floor,
                  index
                );

              const spatialCheck =
                renovationSpatial
                  .analyzeFloor({
                    floor,
                    geometry:
                      afterArea.geometry,
                    areaMetrics:
                      afterArea,
                    floorGeometrySystem,
                    clearDepthM:
                      config.zoneRules
                        .entranceClearDepthM
                  });

              if (spatialCheck.valid) {
                committed =
                  true;
                break;
              }

              floor.editorPlacements
                .pop();

              floor.tables[key] =
                Math.max(
                  0,
                  Number(floor.tables[key]) -
                    1
                );
            }

            if (!committed) {
              break;
            }
          }
        } else if (Number(delta) < 0) {
          for (let step = 0; step < amount; step++) {
            if (
              Math.max(0, Number(floor.tables[key]) || 0) <= 0
            ) {
              break;
            }

            let removeIndex =
              -1;

            for (
              let i = floor.editorPlacements.length - 1;
              i >= 0;
              i--
            ) {
              if (
                floor.editorPlacements[i].kind ===
                  'table' +
                  key
              ) {
                removeIndex =
                  i;
                break;
              }
            }

            if (removeIndex >= 0) {
              floor.editorPlacements
                .splice(
                  removeIndex,
                  1
                );
            }

            floor.tables[key] =
              Math.max(
                0,
                Number(floor.tables[key]) -
                  1
              );
          }
        }

        plan.editorPlacementVersion =
          Math.max(
            4,
            Number(plan.editorPlacementVersion) || 0
          );

        // V0.8.62 signature code will refresh this lazily if the old editor is
        // ever opened through a compatibility route.
        plan.editorPlacementSignature =
          null;
      }
    );
  }
  adjustDecor(
    shopId,
    decorId,
    delta
  ) {
    const item =
      config.decorItems
        .find(
          value =>
            value.id ===
            decorId
        );

    if (!item) {
      return null;
    }

    return this.mutatePlan(
      shopId,
      plan => {
        if (!plan.decorCounts) {
          plan.decorCounts = {};
        }

        const current =
          Number(
            plan.decorCounts[
              decorId
            ]
          ) || 0;

        plan.decorCounts[
          decorId
        ] =
          clamp(
            current +
              Number(delta || 0),
            0,
            item.max
          );
      }
    );
  }

  addPrivateRoom(
    shopId,
    floorIndex
  ) {
    const shop =
      this.getShop(shopId);

    return this.mutatePlan(
      shopId,
      plan => {
        const floor =
          plan.floors[floorIndex];

        const area =
          this.calculateFloorArea(
            shop,
            plan,
            floor,
            floorIndex
          );

        if (
          floor
            .privateRooms
            .length >=
            Math.min(
              8,
              area.geometry
                .recommendedMaxRooms
            ) ||
          area.remainingArea <
            7 +
            6 *
            1.55
        ) {
          return;
        }

        const id =
          'room_' +
          (
            Date.now() %
            1000000
          ) +
          '_' +
          floor
            .privateRooms
            .length;

        floor
          .privateRooms
          .push({
            id,
            name:
              '包厢' +
              (
                floor
                  .privateRooms
                  .length +
                1
              ),
            seats: 6,
            style: 'wood'
          });
      }
    );
  }

  removePrivateRoom(
    shopId,
    floorIndex,
    roomId
  ) {
    return this.mutatePlan(
      shopId,
      plan => {
        const floor =
          plan.floors[floorIndex];

        floor.privateRooms =
          floor
            .privateRooms
            .filter(
              item =>
                item.id !==
                roomId
            );
      }
    );
  }

  cycleRoomSeats(
    shopId,
    floorIndex,
    roomId
  ) {
    const options =
      config.privateRoomSeatOptions;

    const shop =
      this.getShop(shopId);

    return this.mutatePlan(
      shopId,
      plan => {
        const room =
          plan
            .floors[
              floorIndex
            ]
            .privateRooms
            .find(
              item =>
                item.id ===
                roomId
            );

        if (!room) {
          return;
        }

        const current =
          options.indexOf(
            room.seats
          );

        const nextSeats =
          options[
            (
              current + 1
            ) %
            options.length
          ];

        const area =
          this.calculateFloorArea(
            shop,
            plan,
            plan.floors[
              floorIndex
            ],
            floorIndex
          );

        const addedArea =
          (
            nextSeats -
            room.seats
          ) *
          1.55;

        if (
          addedArea > 0 &&
          area.remainingArea +
            0.01 <
          addedArea
        ) {
          return;
        }

        room.seats =
          nextSeats;
      }
    );
  }

  cycleRoomStyle(
    shopId,
    floorIndex,
    roomId
  ) {
    const styles =
      config
        .privateRoomStyles;

    return this.mutatePlan(
      shopId,
      plan => {
        const room =
          plan
            .floors[
              floorIndex
            ]
            .privateRooms
            .find(
              item =>
                item.id ===
                roomId
            );

        if (!room) {
          return;
        }

        const current =
          styles.findIndex(
            item =>
              item.id ===
              room.style
          );

        room.style =
          styles[
            (
              current + 1
            ) %
            styles.length
          ].id;
      }
    );
  }

  cycleGlobal(
    shopId,
    key
  ) {
    const source =
      key ===
        'hallStyle'
        ? config
            .hallStyles
        : key ===
            'materialGrade'
          ? config
              .materialGrades
          : config
              .lightingLevels;

    return this.mutatePlan(
      shopId,
      plan => {
        const current =
          source.findIndex(
            item =>
              item.id ===
              plan[key]
          );

        plan[key] =
          source[
            (
              current + 1
            ) %
            source.length
          ].id;
      }
    );
  }

  getById(
    list,
    id
  ) {
    return (
      list.find(
        item =>
          item.id === id
      ) ||
      list[0]
    );
  }

  getMetrics(
    shopId
  ) {
    const shop =
      this.getShop(shopId);

    const plan =
      this.ensurePlan(shopId);

    if (
      !shop ||
      !plan
    ) {
      return null;
    }

    const hallStyle =
      this.getById(
        config.hallStyles,
        plan.hallStyle
      );

    const material =
      this.getById(
        config.materialGrades,
        plan.materialGrade
      );

    const lighting =
      this.getById(
        config.lightingLevels,
        plan.lightingLevel
      );

    let totalSeats = 0;
    let totalDiningArea = 0;
    let totalFurnitureArea = 0;
    let privateRoomArea = 0;
    let privateRoomSeats = 0;
    let roomAppeal = 0;
    let roomCount = 0;
    let kitchenArea = 0;
    let storageArea = 0;
    let serviceArea = 0;
    let comfortScore = 0;
    let serviceScore = 0;
    let invalidFloorCount = 0;

    const floorMetrics = [];

    for (
      let i = 0;
      i < plan.floors.length;
      i++
    ) {
      const floor =
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
          );

      const areaMetrics =
        this.calculateFloorArea(
          shop,
          plan,
          floor,
          i
        );

      const spatialAnalysis =
        renovationSpatial
          .analyzeFloor({
            floor,
            geometry,
            areaMetrics,
            floorGeometrySystem,
            clearDepthM:
              config
                .zoneRules
                .entranceClearDepthM
          });

      const zoneRatio =
        floor.kitchenRatio +
        floor.storageRatio +
        floor.serviceRatio;

      const diningArea =
        Math.max(
          0,
          floor.area *
          (
            1 -
            zoneRatio
          )
        );

      const effectiveDiningArea =
        areaMetrics
          .effectiveDiningArea;

      let tableArea = 0;
      let tableSeats = 0;

      Object.keys(
        floor.tables
      ).forEach(
        key => {
          const count =
            floor.tables[key];

          tableArea +=
            count *
            config
              .tableFootprint[
                key
              ] *
            aisle.areaFactor;

          tableSeats +=
            count *
            Number(key);
        }
      );

      let roomArea =
        0;

      let roomSeats =
        0;

      let floorRoomAppeal =
        0;

      for (
        let j = 0;
        j <
        floor
          .privateRooms
          .length;
        j++
      ) {
        const room =
          floor
            .privateRooms[
              j
            ];

        const style =
          this.getById(
            config
              .privateRoomStyles,
            room.style
          );

        const area =
          7 +
          room.seats *
            1.55;

        roomArea +=
          area;

        roomSeats +=
          room.seats;

        floorRoomAppeal +=
          style.appeal;
      }

      const used =
        tableArea +
        roomArea;

      const remaining =
        effectiveDiningArea -
        used;

      const crowding =
        effectiveDiningArea >
        0
          ? used /
            effectiveDiningArea
          : 99;

      const valid =
        areaMetrics.valid &&
        spatialAnalysis.valid;

      if (!valid) {
        invalidFloorCount +=
          1;
      }

      floorMetrics.push({
        ...floor,
        diningArea:
          Number(
            diningArea.toFixed(1)
          ),

        effectiveDiningArea:
          Number(
            effectiveDiningArea
              .toFixed(1)
          ),

        kitchenArea:
          Number(
            areaMetrics
              .kitchenArea
              .toFixed(1)
          ),

        storageArea:
          Number(
            areaMetrics
              .storageArea
              .toFixed(1)
          ),

        serviceArea:
          Number(
            areaMetrics
              .serviceArea
              .toFixed(1)
          ),

        structuralReservedArea:
          areaMetrics
            .structuralReservedArea,

        geometry,
        tableArea:
          Number(
            tableArea.toFixed(1)
          ),
        privateRoomArea:
          Number(
            roomArea.toFixed(1)
          ),
        remainingArea:
          Number(
            remaining.toFixed(1)
          ),

        occupiedArea:
          Number(
            used.toFixed(1)
          ),

        minimumDiningArea:
          Number(
            areaMetrics
              .minimumDining
              .toFixed(1)
          ),

        areaUtilization:
          areaMetrics
            .areaUtilization,

        areaWarnings:
          [
            ...areaMetrics
              .warnings,
            ...spatialAnalysis
              .issues
              .map(
                issue =>
                  issue.message
              )
          ],

        spatial:
          spatialAnalysis,

        spatialRemainingArea:
          spatialAnalysis
            .remainingFrontArea,

        usableDiningSlots:
          areaMetrics
            .usableDiningSlots,
        seats:
          tableSeats +
          roomSeats,
        crowding,
        valid
      });

      totalSeats +=
        tableSeats +
        roomSeats;

      totalDiningArea +=
        diningArea;

      totalFurnitureArea +=
        tableArea;

      privateRoomArea +=
        roomArea;

      privateRoomSeats +=
        roomSeats;

      roomAppeal +=
        floorRoomAppeal;

      roomCount +=
        floor
          .privateRooms
          .length;

      kitchenArea +=
        floor.area *
        floor.kitchenRatio;

      storageArea +=
        floor.area *
        floor.storageRatio;

      serviceArea +=
        floor.area *
        floor.serviceRatio;

      comfortScore +=
        aisle.comfort;

      serviceScore +=
        aisle
          .serviceEfficiency *
        geometry
          .efficiency
          .service *
        spatialAnalysis
          .serviceFactor;
    }

    const totalArea =
      plan.floors
        .reduce(
          (
            sum,
            item
          ) =>
            sum +
            item.area,
          0
        );

    const furnitureCost =
      plan.floors.reduce(
        (
          sum,
          floor
        ) => {
          return sum +
            Object.keys(
              floor.tables
            ).reduce(
              (
                inner,
                key
              ) =>
                inner +
                floor.tables[key] *
                (
                  420 +
                  Number(key) *
                  165
                ),
              0
            );
        },
        0
      );

    let roomCost =
      0;

    for (
      let i = 0;
      i < plan.floors.length;
      i++
    ) {
      const floor =
        plan.floors[i];

      for (
        let j = 0;
        j <
        floor
          .privateRooms
          .length;
        j++
      ) {
        const room =
          floor
            .privateRooms[
              j
            ];

        const style =
          this.getById(
            config
              .privateRoomStyles,
            room.style
          );

        const area =
          7 +
          room.seats *
            1.55;

        roomCost +=
          area *
          style.costPerSqm;
      }
    }

    const constructionBase =
      totalArea *
      config
        .baseConstructionCostPerSqm *
      hallStyle
        .costFactor *
      material
        .costFactor;

    const lightingCost =
      totalArea *
      lighting
        .costPerSqm;

    const kitchenComplexity =
      kitchenArea *
      (
        210 +
        totalSeats *
          1.8
      );

    const decorCounts =
      plan.decorCounts ||
      {};

    let decorCost =
      0;

    let decorComfortBonus =
      0;

    let decorAppealBonus =
      0;

    for (
      let i = 0;
      i <
      config.decorItems.length;
      i++
    ) {
      const item =
        config.decorItems[i];

      const count =
        clamp(
          Number(
            decorCounts[
              item.id
            ]
          ) || 0,
          0,
          item.max
        );

      decorCost +=
        count *
        item.cost;

      decorComfortBonus +=
        count *
        item.comfort;

      decorAppealBonus +=
        count *
        item.appeal;
    }

    const totalCost =
      Math.round(
        constructionBase +
        lightingCost +
        furnitureCost +
        roomCost +
        kitchenComplexity +
        decorCost
      );

    const averageComfort =
      comfortScore /
      Math.max(
        1,
        plan.floors.length
      );

    const averageService =
      serviceScore /
      Math.max(
        1,
        plan.floors.length
      );

    const kitchenLoad =
      totalSeats /
      Math.max(
        1,
        kitchenArea *
          2.65
      );

    const comfort =
      clamp(
        averageComfort *
        material.quality *
        lighting.appeal *
        (
          1 +
          decorComfortBonus
        ) *
        (
          1 -
          Math.max(
            0,
            (
              totalFurnitureArea +
              privateRoomArea
            ) /
            Math.max(
              1,
              totalDiningArea
            ) -
            0.78
          ) *
            0.8
        ),
        0.35,
        1.35
      );

    const appeal =
      clamp(
        hallStyle.appeal *
        lighting.appeal *
        material.quality *
        (
          1 +
          decorAppealBonus
        ) *
        (
          roomCount
            ? roomAppeal /
              roomCount
            : 1
        ),
        0.55,
        1.55
      );

    const operationalEfficiency =
      clamp(
        averageService *
        (
          1 -
          Math.max(
            0,
            kitchenLoad -
            1
          ) *
            0.32
        ) *
        (
          1 +
          storageArea /
            Math.max(
              1,
              totalArea
            ) *
            0.22
        ),
        0.45,
        1.35
      );

    const renovationScore =
      Math.round(
        clamp(
          (
            comfort /
            1.35
          ) *
            32 +
          (
            appeal /
            1.55
          ) *
            32 +
          (
            operationalEfficiency /
            1.35
          ) *
            26 +
          (
            invalidFloorCount === 0
              ? 10
              : 0
          ),
          0,
          100
        )
      );

    const operatingImpact = {
      trafficFactor:
        Number(
          clamp(
            0.86 +
              appeal *
                0.14,
            0.90,
            1.18
          ).toFixed(3)
        ),

      spendFactor:
        Number(
          clamp(
            0.92 +
              comfort *
                0.08,
            0.95,
            1.12
          ).toFixed(3)
        ),

      serviceFactor:
        Number(
          clamp(
            0.88 +
              operationalEfficiency *
                0.12,
            0.92,
            1.10
          ).toFixed(3)
        )
    };

    const buildDays =
      Math.max(
        5,
        Math.round(
          Math.sqrt(
            totalArea
          ) *
            1.4 *
            hallStyle
              .costFactor +
          roomCount *
            1.8 +
          plan.floors.length *
            2
        )
      );

    return {
      shopId,
      plan,
      floors:
        floorMetrics,
      totalArea:
        Number(
          totalArea.toFixed(1)
        ),
      totalSeats,
      privateRoomSeats,
      roomCount,
      kitchenArea:
        Number(
          kitchenArea.toFixed(1)
        ),
      storageArea:
        Number(
          storageArea.toFixed(1)
        ),
      serviceArea:
        Number(
          serviceArea.toFixed(1)
        ),
      totalDiningArea:
        Number(
          totalDiningArea.toFixed(1)
        ),

      decorCost:
        Math.round(
          decorCost
        ),

      decorCounts:
        clone(
          decorCounts
        ),

      renovationScore,

      operatingImpact,

      invalidFloorCount,
      valid:
        invalidFloorCount ===
        0 &&
        kitchenLoad <=
          1.28,
      kitchenLoad,
      comfort,
      appeal,
      operationalEfficiency,
      totalCost,

      constructionBreakdown:
        database
          .estimateConstructionBreakdown({
            totalArea,
            kitchenArea,
            totalCost,
            buildDays
          }),

      buildDays
    };
  }

  getContractorQuotes(
    shopId
  ) {
    const metrics =
      this.getMetrics(
        shopId
      );

    if (!metrics) {
      return [];
    }

    const seed =
      gameState
        .getSimulation()
        .seed ||
      1;

    const quotes =
      database
        .quoteContractors(
          metrics,
          shopId,
          seed
        );

    if (
      !metrics.plan
        .isUpgrade ||
      !metrics.plan
        .previousSnapshot
    ) {
      return quotes;
    }

    const oldCost =
      Math.max(
        0,
        Number(
          metrics.plan
            .previousSnapshot
            .totalCost
        ) || 0
      );

    const baseDelta =
      Math.max(
        metrics.totalCost *
          0.12,
        Math.abs(
          metrics.totalCost -
          oldCost
        ) +
          metrics.totalCost *
          0.08
      );

    return quotes.map(
      quote => ({
        ...quote,
        price:
          Math.round(
            baseDelta *
            (
              quote.price /
              Math.max(
                1,
                metrics.totalCost
              )
            ) /
            100
          ) *
          100
      })
    );
  }

  beginUpgrade(
    shopId
  ) {
    const shop =
      this.getShop(shopId);

    const stored =
      this.getStore()[shopId];

    if (
      !shop ||
      !stored ||
      stored.status !==
        'completed'
    ) {
      return {
        ok: false,
        message:
          '当前装修还不能升级'
      };
    }

    stored.previousSnapshot =
      clone(
        stored.construction &&
        stored.construction
          .snapshot ||
        shop.layoutMetrics ||
        this.getMetrics(
          shopId
        )
      );

    stored.upgradeOriginalShopStatus =
      shop.status;

    stored.isUpgrade =
      true;

    stored.status =
      'draft';

    stored.construction =
      null;

    this.history[shopId] = {
      undo: [],
      redo: []
    };

    return {
      ok: true,
      message:
        '已进入升级装修，费用按改造差额计算'
    };
  }

  selectContractor(
    shopId,
    contractorId
  ) {
    const quotes =
      this.getContractorQuotes(
        shopId
      );

    const found =
      quotes.find(
        item =>
          item.id ===
          contractorId
      );

    if (!found) {
      return null;
    }

    return this.mutatePlan(
      shopId,
      plan => {
        plan.selectedContractorId =
          contractorId;
      }
    );
  }

  startConstruction(
    shopId
  ) {
    const shop =
      this.getShop(
        shopId
      );

    const metrics =
      this.getMetrics(
        shopId
      );

    if (
      !shop ||
      !metrics
    ) {
      return {
        ok:
          false,
        message:
          '门店不存在'
      };
    }

    if (!metrics.valid) {
      const spatialIssue =
        metrics
          .floors
          .map(
            floor =>
              floor &&
              floor.spatial &&
              floor.spatial
                .primaryIssue
          )
          .find(Boolean);

      return {
        ok:
          false,
        message:
          spatialIssue
            ? '当前布局不能施工：' +
              spatialIssue.message
            : '当前布局存在面积或后厨承载问题'
      };
    }

    const plan =
      this.getStore()[shopId];

    if (
      !plan.isUpgrade &&
      !shopLifecycle
        .canAction(
          shop,
          'start_renovation',
          {
            renovationStatus:
              plan &&
              plan.status
          }
        )
    ) {
      return {
        ok:false,
        message:
          shop &&
          shop.status ===
            'closed'
            ? '门店已经关闭，不能开始装修'
            : '当前门店状态不能重复开始装修'
      };
    }

    const quotes =
      this.getContractorQuotes(
        shopId
      );

    const quote =
      quotes.find(
        item =>
          item.id ===
          plan
            .selectedContractorId
      ) ||
      quotes[0];

    if (
      gameState
        .getPlayer()
        .cash <
      quote.price
    ) {
      return {
        ok:
          false,
        message:
          '装修资金不足，还差¥' +
          (
            quote.price -
            gameState
              .getPlayer()
              .cash
          ).toLocaleString()
      };
    }

    gameState
      .spendCash(
        quote.price
      );

    const currentTime =
      gameState
        .getTime();

    const currentDay =
      simulationSystem
        .getDayOrdinal(
          currentTime
        );

    const startMinute =
      currentDay *
        1440 +
      Number(
        currentTime.hour ||
        0
      ) *
        60 +
      Number(
        currentTime.minute ||
        0
      );

    plan.status =
      'constructing';

    plan.construction = {
      contractor:
        clone(quote),
      startDay:
        currentDay,
      finishDay:
        currentDay +
        quote.days,
      startMinute,
      finishMinute:
        startMinute +
        quote.days *
          1440,
      paid:
        quote.price,
      upgrade:
        plan.isUpgrade ===
        true,
      originalShopStatus:
        plan
          .upgradeOriginalShopStatus ||
        null,
      snapshot:
        clone(metrics)
    };

    shop.status =
      'renovating';

    shopLifecycle
      .syncShop(
        shop,
        {
          renovationStatus:
            'constructing'
        },
        {
          reason:
            'renovation-started'
        }
      );

    shop.renovationCost =
      quote.price;

    shop.renovationFinishDay =
      plan
        .construction
        .finishDay;

    return {
      ok:
        true,
      quote:
        clone(quote),
      finishDay:
        plan
          .construction
          .finishDay
    };
  }

  getConstructionProgress(
    shopId
  ) {
    const plan =
      this.ensurePlan(
        shopId
      );

    if (
      !plan ||
      !plan.construction
    ) {
      return {
        status:
          plan
            ? plan.status
            : 'draft',
        progress:
          plan &&
          plan.status ===
            'completed'
            ? 1
            : 0,
        elapsedMinutes:0,
        totalMinutes:0,
        remainingMinutes:0,
        startMinute:null,
        finishMinute:null
      };
    }

    const time =
      gameState
        .getTime();

    const currentMinute =
      simulationSystem
        .getDayOrdinal(
          time
        ) *
        1440 +
      Number(
        time.hour ||
        0
      ) *
        60 +
      Number(
        time.minute ||
        0
      );

    const legacyStart =
      Number(
        plan
          .construction
          .startDay
      ) *
      1440;

    const legacyFinish =
      Number(
        plan
          .construction
          .finishDay
      ) *
      1440;

    const startMinute =
      Number.isFinite(
        Number(
          plan
            .construction
            .startMinute
        )
      )
        ? Number(
            plan
              .construction
              .startMinute
          )
        : legacyStart;

    const finishMinute =
      Number.isFinite(
        Number(
          plan
            .construction
            .finishMinute
        )
      )
        ? Number(
            plan
              .construction
              .finishMinute
          )
        : legacyFinish;

    const totalMinutes =
      Math.max(
        1,
        finishMinute -
        startMinute
      );

    const elapsedMinutes =
      Math.max(
        0,
        Math.min(
          totalMinutes,
          currentMinute -
          startMinute
        )
      );

    const progress =
      plan.status ===
        'completed'
        ? 1
        : Math.max(
            0,
            Math.min(
              1,
              elapsedMinutes /
              totalMinutes
            )
          );

    return {
      status:
        plan.status,
      progress,
      elapsedMinutes,
      totalMinutes,
      remainingMinutes:
        Math.max(
          0,
          finishMinute -
          currentMinute
        ),
      startMinute,
      finishMinute,
      startDay:
        plan
          .construction
          .startDay,
      finishDay:
        plan
          .construction
          .finishDay
    };
  }

  updateShop(
    shopId
  ) {
    const shop =
      this.getShop(
        shopId
      );

    const plan =
      this.ensurePlan(
        shopId
      );

    if (
      !shop ||
      !plan ||
      plan.status !==
        'constructing' ||
      !plan.construction
    ) {
      return false;
    }

    const progress =
      this.getConstructionProgress(
        shopId
      );

    if (
      progress.progress <
      1
    ) {
      return false;
    }

    const stored =
      this.getStore()[
        shopId
      ];

    stored.status =
      'completed';

    const wasUpgrade =
      stored.construction &&
      stored.construction
        .upgrade;

    shop.status =
      wasUpgrade
        ? stored.construction
            .originalShopStatus ||
          'open'
        : 'renovated_pending_license';

    stored.isUpgrade =
      false;

    shopLifecycle
      .syncShop(
        shop,
        {
          renovationStatus:
            'completed'
        },
        {
          reason:
            'renovation-completed'
        }
      );

    shop.layoutMetrics =
      clone(
        stored
          .construction
          .snapshot
      );

    return true;
  }
}

module.exports =
  new RenovationSystem();
