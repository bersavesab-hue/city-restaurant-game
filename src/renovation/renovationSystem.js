'use strict';

// V46_RENOVATION_PLAYABILITY_SYSTEM

const gameState =
  require('../core/gameState.js');

const simulationSystem =
  require('../core/simulationSystem.js');

const config =
  require('./renovationConfig.js');

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

  createFloor(
    index,
    area
  ) {
    const diningArea =
      area * 0.56;

    const table4 =
      Math.max(
        1,
        Math.floor(
          diningArea /
          16
        )
      );

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
        2: 2,
        4: table4,
        6: 0,
        8: 0
      },

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

        floor[key] =
          Number(
            clamp(
              floor[key] +
              delta,
              range[0],
              range[1]
            ).toFixed(2)
          );
      }
    );
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

    return this.mutatePlan(
      shopId,
      plan => {
        const floor =
          plan.floors[floorIndex];

        floor.tables[key] =
          Math.max(
            0,
            Math.min(
              40,
              (
                floor.tables[
                  key
                ] ||
                0
              ) +
              delta
            )
          );
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
    return this.mutatePlan(
      shopId,
      plan => {
        const floor =
          plan.floors[floorIndex];

        if (
          floor
            .privateRooms
            .length >=
          8
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

        room.seats =
          options[
            (
              current + 1
            ) %
            options.length
          ];
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
        diningArea -
        used;

      const crowding =
        diningArea >
        0
          ? used /
            diningArea
          : 99;

      const valid =
        remaining >=
          -0.01 &&
        zoneRatio <
          0.78;

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
          .serviceEfficiency;
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

    const quotes = [];

    for (
      let i = 0;
      i < 3;
      i++
    ) {
      const r1 =
        hashFloat(
          shopId +
          ':contractor:' +
          seed +
          ':' +
          i
        );

      const r2 =
        hashFloat(
          shopId +
          ':contractor2:' +
          seed +
          ':' +
          i
        );

      const prefix =
        config
          .contractorNameParts
          .prefix[
            Math.floor(
              r1 *
              config
                .contractorNameParts
                .prefix.length
            ) %
            config
              .contractorNameParts
              .prefix.length
          ];

      const suffix =
        config
          .contractorNameParts
          .suffix[
            Math.floor(
              r2 *
              config
                .contractorNameParts
                .suffix.length
            ) %
            config
              .contractorNameParts
              .suffix.length
          ];

      const priceFactor =
        0.88 +
        r1 *
          0.30;

      const speedFactor =
        0.84 +
        r2 *
          0.30;

      const reliability =
        Math.round(
          68 +
          (
            r1 *
              0.45 +
            r2 *
              0.55
          ) *
            29
        );

      quotes.push({
        id:
          'contractor_' +
          i,
        name:
          prefix +
          suffix,
        price:
          Math.round(
            metrics.totalCost *
            priceFactor
          ),
        days:
          Math.max(
            4,
            Math.round(
              metrics.buildDays *
              speedFactor
            )
          ),
        reliability,
        quality:
          Math.round(
            65 +
            r2 *
              32
          )
      });
    }

    return quotes.sort(
      (
        a,
        b
      ) =>
        a.price -
        b.price
    );
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
      return {
        ok:
          false,
        message:
          '当前布局存在面积或后厨承载问题'
      };
    }

    const plan =
      this.getStore()[shopId];

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

    const currentDay =
      simulationSystem
        .getDayOrdinal(
          gameState
            .getTime()
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
      paid:
        quote.price,
      snapshot:
        clone(metrics)
    };

    shop.status =
      'renovating';

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

    const currentDay =
      simulationSystem
        .getDayOrdinal(
          gameState
            .getTime()
        );

    if (
      currentDay <
      plan
        .construction
        .finishDay
    ) {
      return false;
    }

    const stored =
      this.getStore()[
        shopId
      ];

    stored.status =
      'completed';

    shop.status =
      'renovated_pending_license';

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
