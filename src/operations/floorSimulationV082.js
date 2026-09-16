'use strict';

const gameState =
  require('../core/gameState.js');

const customerEngine =
  require('../customer/customerEngineV10.js');

const food =
  require('../food/foodPackV10.js');

const recipeEngine =
  require('../food/recipeEngineV10.js');

const menuEngine =
  require('../food/menuEngineV10.js');

const inventoryEngine =
  require('../inventory/inventoryEngineV10.js');

const orderEngine =
  require('../order/orderEngineV10.js');

const kitchenEngine =
  require('../kitchen/kitchenEngineV10.js');

const serviceEngine =
  require('../service/serviceEngineV10.js');

const settlementEngine =
  require('./settlementEngineV10.js');

const retentionEngine =
  require('./retentionEngineV10.js');

const deliveryEngine =
  require('./deliveryEngineV10.js');

function clamp(
  value,
  min,
  max
) {
  return Math.max(
    min,
    Math.min(
      max,
      Number(value) || 0
    )
  );
}

function defaultMetrics() {
  return {
    arrivedToday:0,
    seatedToday:0,
    completedOrdersToday:0,
    walkawaysToday:0,
    stockoutsToday:0,
    mistakesToday:0,
    returnsToday:0,
    deliveriesToday:0,
    pickupOrdersToday:0,
    peakQueueToday:0,
    maxKitchenQueueToday:0,
    waitMinutesTotal:0,
    waitSamples:0,
    cookMinutesTotal:0,
    cookSamples:0,
    repeatGuestsToday:0,
    newGuestsToday:0,
    priceWalkawaysToday:0,
    repeatIntentTotalToday:0,
    repeatIntentSamplesToday:0,
    repeatLikelyVisitsToday:0,
    churnRiskVisitsToday:0,
    dishOrdersToday:{},
    dishRevenueToday:{}
  };
}

function createState() {
  return {
    version:'0.8.2',
    sequence:0,
    parties:{},
    orders:{},
    ticketMeta:{},
    activeLines:[],
    tableSessions:{},
    pickupQueue:[],
    deliveries:[],
    history:[],
    metrics:defaultMetrics(),
    lastMinute:null
  };
}

function ensureState(
  runtime
) {
  if (
    !runtime.floor ||
    typeof runtime.floor !==
      'object'
  ) {
    runtime.floor =
      createState();
  }

  runtime.floor.version =
    '0.8.2';

  runtime.floor.parties =
    runtime.floor.parties ||
    {};

  runtime.floor.orders =
    runtime.floor.orders ||
    {};

  runtime.floor.ticketMeta =
    runtime.floor.ticketMeta ||
    {};

  runtime.floor.activeLines =
    Array.isArray(
      runtime.floor.activeLines
    )
      ? runtime.floor.activeLines
      : [];

  runtime.floor.tableSessions =
    runtime.floor.tableSessions ||
    {};

  runtime.floor.pickupQueue =
    Array.isArray(
      runtime.floor.pickupQueue
    )
      ? runtime.floor.pickupQueue
      : [];

  runtime.floor.deliveries =
    Array.isArray(
      runtime.floor.deliveries
    )
      ? runtime.floor.deliveries
      : [];

  runtime.floor.history =
    Array.isArray(
      runtime.floor.history
    )
      ? runtime.floor.history
      : [];

  runtime.floor.metrics =
    {
      ...defaultMetrics(),
      ...(
        runtime.floor.metrics ||
        {}
      )
    };

  return runtime.floor;
}

function totalSeats(
  room
) {
  return (
    room.tables ||
    []
  ).reduce(
    (
      sum,
      table
    ) =>
      sum +
      Number(
        table.seats ||
        0
      ),
    0
  );
}

function desiredTableCounts(
  seats
) {
  const target =
    Math.max(
      8,
      Math.round(
        Number(seats) ||
        36
      )
    );

  let remaining =
    target;

  const counts = {
    two:0,
    four:0,
    six:0,
    eight:0
  };

  counts.eight =
    Math.max(
      0,
      Math.floor(
        target /
        48
      )
    );

  remaining -=
    counts.eight *
    8;

  counts.six =
    Math.max(
      1,
      Math.floor(
        remaining /
        30
      )
    );

  remaining -=
    counts.six *
    6;

  counts.two =
    Math.max(
      2,
      Math.min(
        5,
        Math.floor(
          remaining /
          10
        )
      )
    );

  remaining -=
    counts.two *
    2;

  counts.four =
    Math.max(
      1,
      Math.ceil(
        Math.max(
          0,
          remaining
        ) /
        4
      )
    );

  return counts;
}

function syncTables(
  runtime,
  seats
) {
  const room =
    runtime.diningRoom;

  const occupied =
    (
      room.tables ||
      []
    ).some(
      table =>
        table.status !==
        'free'
    );

  const current =
    totalSeats(
      room
    );

  const target =
    Math.max(
      8,
      Number(seats) ||
      current ||
      36
    );

  const drift =
    Math.abs(
      current -
      target
    ) /
    Math.max(
      1,
      target
    );

  if (
    !occupied &&
    (
      !room.tables ||
      !room.tables.length ||
      drift >
        0.22
    )
  ) {
    runtime.diningRoom =
      serviceEngine
        .createDiningRoom({
          tableCounts:
            desiredTableCounts(
              target
            )
        });
  }

  return runtime.diningRoom;
}

function profileById(
  runtime,
  id
) {
  return (
    runtime.customers &&
    runtime.customers[
      id
    ] ||
    null
  );
}

function customerReturnScore(
  profile,
  shopId
) {
  const memory =
    profile &&
    profile.memory &&
    typeof profile.memory ===
      'object'
      ? profile.memory
      : {};

  const row =
    memory.visitedStores &&
    memory.visitedStores[
      shopId
    ];

  const visits =
    Math.max(
      0,
      Number(
        row &&
        row.visits
      ) ||
      0
    );

  if (
    visits <=
    0
  ) {
    return 0;
  }

  const satisfaction =
    clamp(
      Number(
        row.avgSatisfaction
      ) ||
      50,
      0,
      100
    ) /
    100;

  const loyalty =
    clamp(
      Number(
        profile &&
        profile.traits &&
        profile.traits.loyalty
      ) ||
      50,
      0,
      100
    ) /
    100;

  const favorite =
    Array.isArray(
      memory.favoriteStoreIds
    ) &&
    memory.favoriteStoreIds
      .includes(
        shopId
      );

  const disliked =
    Array.isArray(
      memory.dislikedStoreIds
    ) &&
    memory.dislikedStoreIds
      .includes(
        shopId
      );

  return clamp(
    0.08 +
    satisfaction *
      0.50 +
    loyalty *
      0.22 +
    Math.min(
      5,
      visits
    ) *
      0.04 +
    (
      favorite
        ? 0.15
        : 0
    ) -
    (
      disliked
        ? 0.45
        : 0
    ),
    0,
    1
  );
}

function createCustomer(
  runtime,
  districtId,
  shop
) {
  const existing =
    Object.values(
      runtime.customers ||
      {}
    );

  const shopId =
    shop &&
    shop.id;

  const candidates =
    shopId
      ? existing
          .map(
            profile => ({
              profile,
              score:
                customerReturnScore(
                  profile,
                  shopId
                )
            })
          )
          .filter(
            item =>
              item.score >
              0.02
          )
          .sort(
            (a,b) =>
              b.score -
              a.score
          )
      : [];

  if (
    candidates.length
  ) {
    const sample =
      candidates.slice(
        0,
        12
      );

    const avgStrength =
      sample.reduce(
        (
          total,
          item
        ) =>
          total +
          item.score,
        0
      ) /
      Math.max(
        1,
        sample.length
      );

    const ratingBoost =
      Math.max(
        0,
        (
          Number(
            runtime.shop &&
            runtime.shop.rating
          ) ||
          4
        ) -
        4
      ) *
      0.08;

    const wordBoost =
      Math.max(
        0,
        Number(
          runtime.shop &&
          runtime.shop.wordOfMouth
        ) ||
        0
      ) *
      0.12;

    const repeatChance =
      clamp(
        0.06 +
        avgStrength *
          0.52 +
        ratingBoost +
        wordBoost,
        0.05,
        0.68
      );

    if (
      runtime.rng.next() <
      repeatChance
    ) {
      const totalWeight =
        sample.reduce(
          (
            total,
            item
          ) =>
            total +
            Math.max(
              0.01,
              item.score
            ),
          0
        );

      let roll =
        runtime.rng.next() *
        totalWeight;

      for (
        const item
        of sample
      ) {
        roll -=
          Math.max(
            0.01,
            item.score
          );

        if (
          roll <=
          0
        ) {
          return item.profile;
        }
      }

      return sample[0]
        .profile;
    }
  }

  const profile =
    customerEngine
      .createSegmentProfile(
        runtime.rng,
        {
          districtId
        }
      );

  runtime.customers[
    profile.id
  ] =
    profile;

  const ids =
    Object.keys(
      runtime.customers
    );

  if (
    ids.length >
    300
  ) {
    delete runtime
      .customers[
        ids[0]
      ];
  }

  return profile;
}

function menuChoices(
  runtime
) {
  const stock =
    inventoryEngine
      .stockSummary(
        runtime.inventory
      )
      .byIngredient;

  return (
    runtime.menu ||
    []
  ).map(
    item => {
      const recipe =
        food.RECIPE_BY_ID[
          item.recipeId
        ];

      const craftable =
        item.active ===
          false
          ? 0
          : recipeEngine
              .maxCraftableMenuItem(
                item,
                stock
              );

      return {
        id:item.id,
        menuItem:item,
        price:
          Number(
            item.listPrice
          ) ||
          0,
        available:
          item.active !==
            false &&
          craftable >
            0,
        tasteFit:
          item.customDish
            ? clamp(
                62 +
                (
                  Number(
                    item.customDish
                      .acceptance
                  ) ||
                  65
                ) *
                  0.22,
                45,
                92
              )
            : 66,
        qualityScore:
          item.customDish
            ? clamp(
                Number(
                  item.customDish
                    .score
                ) ||
                65,
                0,
                100
              )
            : 64 +
              Math.min(
                20,
                (
                  item.stats &&
                  Number(
                    item.stats
                      .ratingCount
                  ) >
                    0
                    ? Number(
                        item.stats
                          .ratingSum
                      ) /
                      Number(
                        item.stats
                          .ratingCount
                      )
                    : 0
                ) *
                  3
              ),
        popularity:
          Math.min(
            100,
            42 +
            Math.log10(
              Math.max(
                1,
                Number(
                  item.stats &&
                  item.stats.orders
                ) ||
                1
              )
            ) *
              18 +
            (
              item.customDish
                ? Math.max(
                    0,
                    (
                      Number(
                        item.customDish
                          .innovation
                      ) ||
                      50
                    ) -
                    50
                  ) *
                    0.18
                : 0
            )
          ),
        signature:
          !!item.featured,
        triedBefore:false
      };
    }
  );
}

function queueEstimate(
  runtime,
  partySize
) {
  const room =
    runtime.diningRoom;

  const free =
    serviceEngine
      .findTable(
        room,
        partySize
      );

  if (free) {
    return 0;
  }

  const queueAhead =
    (
      room.queue ||
      []
    ).length;

  const avgEat =
    34;

  const tables =
    Math.max(
      1,
      (
        room.tables ||
        []
      ).length
    );

  return Math.round(
    6 +
    queueAhead *
      avgEat /
      tables *
      2.6
  );
}

function priceRejectProbability(
  profile,
  visit,
  menuItem
) {
  const budget =
    Math.max(
      1,
      Number(
        visit &&
        visit.budget
      ) ||
      1
    );

  const price =
    Math.max(
      0,
      Number(
        menuItem &&
        menuItem.listPrice
      ) ||
      0
    );

  const ratio =
    price /
    budget;

  if (
    ratio <=
    1.02
  ) {
    return 0;
  }

  const sensitivity =
    clamp(
      Number(
        profile &&
        profile.traits &&
        profile.traits
          .priceSensitivity
      ) ||
      50,
      0,
      100
    ) /
    100;

  const overBudget =
    Math.max(
      0,
      ratio -
      1
    );

  return clamp(
    overBudget *
      0.70 +
    sensitivity *
      0.18 +
    Math.max(
      0,
      ratio -
      1.35
    ) *
      0.60,
    0,
    0.85
  );
}

function buildOrder(
  runtime,
  floor,
  shop,
  profile,
  visit,
  minute,
  tableId,
  waitMinutes,
  ctx
) {
  const chosen =
    customerEngine
      .chooseDish(
        profile,
        visit,
        menuChoices(
          runtime
        ),
        runtime.rng,
        {}
      );

  if (
    !chosen ||
    !chosen.dish
  ) {
    floor.metrics
      .stockoutsToday +=
      1;

    floor.history.unshift({
      minute,
      type:'stockout',
      profileId:
        profile.id,
      visitId:
        visit.id
    });

    return {
      ok:false,
      reason:'缺货'
    };
  }

  const rejectProbability =
    priceRejectProbability(
      profile,
      visit,
      chosen.dish.menuItem
    );

  if (
    rejectProbability >
      0 &&
    runtime.rng.next() <
      rejectProbability
  ) {
    const lost =
      Math.max(
        1,
        Number(
          visit.partySize
        ) ||
        1
      );

    floor.metrics
      .priceWalkawaysToday +=
      lost;

    floor.history.unshift({
      minute,
      type:'price_walkaway',
      profileId:
        profile.id,
      visitId:
        visit.id,
      menuItemId:
        chosen.dish
          .menuItem
          .id,
      price:
        Number(
          chosen.dish
            .menuItem
            .listPrice
        ) ||
        0,
      budget:
        Number(
          visit.budget
        ) ||
        0,
      rejectProbability
    });

    return {
      ok:false,
      reason:'价格超预算'
    };
  }

  floor.sequence +=
    1;

  const order =
    orderEngine
      .createOrder({
        id:
          `floor_order_${runtime.day}_${floor.sequence}`,
        shopId:
          shop.id,
        customerId:
          profile.id,
        channel:
          visit.channel,
        partySize:
          visit.partySize,
        createdMinute:
          minute,
        tableId:
          tableId ||
          null,
        meta:{
          visitId:
            visit.id,
          profileId:
            profile.id,
          waitMinutes:
            Number(
              waitMinutes ||
              0
            ),
          quality:0,
          foodCost:0,
          cookMinutes:0,
          staffCoverage:
            Number(
              ctx.staffCoverage ||
              1
            )
        }
      });

  orderEngine
    .addItem(
      order,
      chosen.dish.menuItem,
      Math.max(
        1,
        visit.partySize
      )
    );

  orderEngine
    .transition(
      order,
      'submitted'
    );

  const ticket =
    kitchenEngine
      .createTicket(
        runtime.kitchen,
        order,
        minute
      );

  floor.orders[
    order.id
  ] = {
    order,
    visit,
    profileId:
      profile.id,
    tableId:
      tableId ||
      null,
    status:'kitchen',
    createdMinute:
      minute
  };

  floor.ticketMeta[
    ticket.id
  ] = {
    orderId:
      order.id,
    foodCost:0,
    qualityWeighted:0,
    quantityWeight:0,
    startedMinute:null,
    readyMinute:null
  };

  return {
    ok:true,
    order,
    ticket
  };
}

function enqueueArrival(
  runtime,
  shop,
  minute,
  ctx={}
) {
  const floor =
    ensureState(
      runtime
    );

  const profile =
    createCustomer(
      runtime,
      shop.districtId,
      shop
    );

  const hour =
    Math.floor(
      (
        minute %
        1440 +
        1440
      ) %
      1440 /
      60
    );

  const previousVisits =
    Math.max(
      0,
      Number(
        profile &&
        profile.memory &&
        profile.memory
          .visitedStores &&
        profile.memory
          .visitedStores[
            shop.id
          ] &&
        profile.memory
          .visitedStores[
            shop.id
          ].visits
      ) ||
      0
    );

  const visit =
    customerEngine
      .generateVisit(
        profile,
        runtime.rng,
        {
          hour,
          day:
            runtime.day,
          rain:
            ctx.weather ===
              'rain' ||
            ctx.weather ===
              'heavyRain'
        }
      );

  const partyCount =
    Math.max(
      1,
      Number(
        visit.partySize
      ) ||
      1
    );

  if (
    previousVisits >
    0
  ) {
    floor.metrics
      .repeatGuestsToday +=
      partyCount;
  } else {
    floor.metrics
      .newGuestsToday +=
      partyCount;
  }

  // V083_DYNAMIC_MODIFIERS
  const deliveryDemandMultiplier =
    clamp(
      Number(
        ctx.deliveryDemandMultiplier
      ) || 1,
      0.5,
      1.8
    );

  if (
    visit.channel === 'dine_in' &&
    deliveryDemandMultiplier > 1 &&
    runtime.rng.next() <
      Math.min(
        0.35,
        (
          deliveryDemandMultiplier -
          1
        ) *
        0.45
      )
  ) {
    visit.channel = 'delivery';
  } else if (
    visit.channel === 'delivery' &&
    deliveryDemandMultiplier < 1 &&
    runtime.rng.next() <
      Math.min(
        0.75,
        (
          1 -
          deliveryDemandMultiplier
        ) *
        0.9
      )
  ) {
    visit.channel =
      runtime.rng.next() < 0.35
        ? 'pickup'
        : 'dine_in';
  }

  floor.metrics
    .arrivedToday +=
    Math.max(
      1,
      visit.partySize
    );

  if (
    visit.channel !==
    'dine_in'
  ) {
    const created =
      buildOrder(
        runtime,
        floor,
        shop,
        profile,
        visit,
        minute,
        null,
        0,
        ctx
      );

    if (!created.ok) {
      floor.history.unshift({
        minute,
        type:'lost',
        reason:
          created.reason,
        channel:
          visit.channel
      });

      return false;
    }

    if (
      visit.channel ===
      'pickup'
    ) {
      floor.metrics
        .pickupOrdersToday +=
        1;
    }

    return true;
  }

  const wait =
    queueEstimate(
      runtime,
      visit.partySize
    );

  const decision =
    customerEngine
      .queueDecision(
        profile,
        visit,
        {
          id:shop.id,
          waitMinutes:
            wait
        }
      );

  const patience =
    Math.max(
      4,
      Math.round(
        Number(
          decision
            .toleranceMinutes
        ) ||
        12
      )
    );

  floor.sequence +=
    1;

  const party = {
    id:
      `party_${runtime.day}_${floor.sequence}`,
    profileId:
      profile.id,
    visit,
    partySize:
      visit.partySize,
    queuedMinute:
      minute,
    patienceMinutes:
      patience,
    expectedWait:
      wait
  };

  floor.parties[
    party.id
  ] =
    party;

  serviceEngine
    .enqueue(
      runtime.diningRoom,
      party
    );

  floor.metrics
    .peakQueueToday =
    Math.max(
      floor.metrics
        .peakQueueToday,
      runtime
        .diningRoom
        .queue
        .length
    );

  return true;
}

function removeAbandoned(
  runtime,
  minute
) {
  const floor =
    ensureState(
      runtime
    );

  const room =
    runtime.diningRoom;

  const keep = [];

  for (
    const party
    of room.queue ||
    []
  ) {
    const waited =
      Math.max(
        0,
        minute -
        Number(
          party.queuedMinute ||
          minute
        )
      );

    const tolerance =
      Math.max(
        4,
        Number(
          party.patienceMinutes ||
          12
        )
      );

    if (
      waited >
      tolerance
    ) {
      floor.metrics
        .walkawaysToday +=
        1;

      room.walkaways =
        Number(
          room.walkaways ||
          0
        ) +
        1;

      floor.history.unshift({
        minute,
        type:'walkaway',
        partyId:
          party.id,
        waited
      });

      delete floor.parties[
        party.id
      ];
    } else {
      keep.push(
        party
      );
    }
  }

  room.queue =
    keep;
}

function seatWaiting(
  runtime,
  shop,
  minute,
  ctx={}
) {
  const floor =
    ensureState(
      runtime
    );

  let guard =
    0;

  while (
    runtime
      .diningRoom
      .queue
      .length &&
    guard <
      50
  ) {
    guard +=
      1;

    const seated =
      serviceEngine
        .seatNext(
          runtime.diningRoom,
          minute
        );

    if (!seated.ok) {
      break;
    }

    const party =
      seated.party;

    const profile =
      profileById(
        runtime,
        party.profileId
      );

    if (!profile) {
      serviceEngine
        .releaseTable(
          runtime.diningRoom,
          seated.table.id
        );

      continue;
    }

    floor.metrics
      .seatedToday +=
      Math.max(
        1,
        party.partySize
      );

    floor.metrics
      .waitMinutesTotal +=
      seated.waitMinutes;

    floor.metrics
      .waitSamples +=
      1;

    const created =
      buildOrder(
        runtime,
        floor,
        shop,
        profile,
        party.visit,
        minute,
        seated.table.id,
        seated.waitMinutes,
        ctx
      );

    if (!created.ok) {
      serviceEngine
        .releaseTable(
          runtime.diningRoom,
          seated.table.id
        );

      delete floor.parties[
        party.id
      ];

      continue;
    }

    delete floor.parties[
      party.id
    ];
  }
}

function stationActiveCount(
  floor,
  station
) {
  return floor.activeLines
    .filter(
      line =>
        line.station ===
        station
    )
    .length;
}

function startKitchenLines(
  runtime,
  minute,
  ctx={}
) {
  const floor =
    ensureState(
      runtime
    );

  const capacityFactor =
    clamp(
      (
        Number(
          ctx.staffCoverage ||
          1
        ) *
        Number(
          ctx.capacityMultiplier ||
          1
        )
      ),
      0.45,
      1.35
    );

  for (
    const ticket
    of runtime
        .kitchen
        .queue ||
      []
  ) {
    if (
      ticket.status ===
      'blocked' ||
      ticket.status ===
      'ready'
    ) {
      continue;
    }

    let startedAny =
      false;

    for (
      const line
      of ticket.lines ||
      []
    ) {
      if (
        line.status !==
        'queued'
      ) {
        continue;
      }

      const station =
        line.station ||
        'assembly';

      const maxSlots =
        Math.max(
          1,
          Number(
            runtime
              .kitchen
              .stations[
                station
              ] ||
            1
          )
        );

      if (
        stationActiveCount(
          floor,
          station
        ) >=
        maxSlots
      ) {
        continue;
      }

      const check =
        kitchenEngine
          .canProduceLine(
            line,
            runtime.inventory
          );

      if (!check.ok) {
        ticket.status =
          'blocked';

        const meta =
          floor.ticketMeta[
            ticket.id
          ];

        const entry =
          meta &&
          floor.orders[
            meta.orderId
          ];

        if (
          entry &&
          entry.order.status !==
            'cancelled'
        ) {
          orderEngine
            .transition(
              entry.order,
              'cancelled'
            );

          floor.metrics
            .stockoutsToday +=
            1;

          if (
            entry.tableId
          ) {
            serviceEngine
              .releaseTable(
                runtime.diningRoom,
                entry.tableId
              );
          }

          entry.status =
            'cancelled';

          floor.history.unshift({
            minute,
            type:
              'kitchen_stockout',
            orderId:
              entry.order.id
          });
        }

        break;
      }

      const used =
        inventoryEngine
          .consumeRequirements(
            runtime.inventory,
            check.requirements,
            {
              reason:
                `order:${
                  floor.ticketMeta[
                    ticket.id
                  ].orderId
                }`
            }
          );

      if (!used.ok) {
        continue;
      }

      const quality =
        recipeEngine
          .qualityScore(
            line.item.recipeId,
            {
              freshness:
                used.avgQuality,
              staffSkill:
                runtime
                  .kitchen
                  .staffSkill,
              equipmentScore:
                runtime
                  .kitchen
                  .equipmentScore,
              executionConsistency:
                68 +
                capacityFactor *
                  8
            }
          );

      const base =
        Math.max(
          1,
          Number(
            line.estimatedMinutes ||
            8
          )
        );

      const duration =
        Math.max(
          1,
          Math.round(
            base /
            capacityFactor
          )
        );

      line.status =
        'cooking';

      const active = {
        ticketId:
          ticket.id,
        lineId:
          line.id,
        station,
        startedMinute:
          minute,
        finishMinute:
          minute +
          duration,
        duration,
        foodCost:
          Number(
            used.cost ||
            0
          ),
        quality:
          Number(
            quality ||
            60
          ),
        qty:
          Math.max(
            1,
            Number(
              line.item.qty ||
              1
            )
          )
      };

      floor.activeLines.push(
        active
      );

      const meta =
        floor.ticketMeta[
          ticket.id
        ];

      if (
        meta &&
        meta.startedMinute ==
        null
      ) {
        meta.startedMinute =
          minute;
      }

      startedAny =
        true;
    }

    if (startedAny) {
      ticket.status =
        'cooking';
    }
  }

  floor.metrics
    .maxKitchenQueueToday =
    Math.max(
      floor.metrics
        .maxKitchenQueueToday,
      kitchenQueueCount(
        runtime
      )
    );
}

function finalizeReadyOrder(
  runtime,
  shop,
  entry,
  minute,
  ctx={}
) {
  const floor =
    ensureState(
      runtime
    );

  const order =
    entry.order;

  if (
    order.status ===
    'cooking'
  ) {
    orderEngine
      .transition(
        order,
        'ready'
      );
  }

  entry.readyMinute =
    minute;

  if (
    order.channel ===
    'dine_in'
  ) {
    orderEngine
      .transition(
        order,
        'served'
      );

    const eatMinutes =
      runtime.rng.int(
        20,
        48
      ) +
      Math.max(
        0,
        order.partySize -
          2
      ) *
        4;

    floor.tableSessions[
      entry.tableId
    ] = {
      orderId:
        order.id,
      servedMinute:
        minute,
      finishMinute:
        minute +
        eatMinutes
    };

    entry.status =
      'eating';

    return;
  }

  if (
    order.channel ===
    'pickup'
  ) {
    floor.pickupQueue.push({
      orderId:
        order.id,
      readyMinute:
        minute,
      pickupMinute:
        minute +
        runtime.rng.int(
          2,
          8
        )
    });

    entry.status =
      'waiting_pickup';

    return;
  }

  const distance =
    Math.round(
      runtime.rng.float(
        0.7,
        5.5
      ) *
      10
    ) /
    10;

  const delivery =
    deliveryEngine
      .createDelivery(
        order,
        {
          platformId:
            'platform_a',
          distanceKm:
            distance,
          weather:
            ctx.weather ||
            'normal',
          rush:
            ctx.peak ===
            true
        }
      );

  delivery.readyMinute =
    minute;

  delivery.riderPickupMinute =
    minute +
    runtime.rng.int(
      3,
      12
    );

  delivery.deliveryStartMinute =
    null;

  delivery.deliverMinute =
    null;

  floor.deliveries.push(
    delivery
  );

  entry.status =
    'waiting_rider';
}

function completeKitchenLines(
  runtime,
  shop,
  minute,
  ctx={}
) {
  const floor =
    ensureState(
      runtime
    );

  const finished =
    floor.activeLines.filter(
      line =>
        line.finishMinute <=
        minute
    );

  if (!finished.length) {
    return;
  }

  for (
    const active
    of finished
  ) {
    const ticket =
      (
        runtime
          .kitchen
          .queue ||
        []
      ).find(
        item =>
          item.id ===
          active.ticketId
      );

    if (!ticket) {
      continue;
    }

    const line =
      (
        ticket.lines ||
        []
      ).find(
        item =>
          item.id ===
          active.lineId
      );

    if (line) {
      line.status =
        'ready';

      line.quality =
        active.quality;
    }

    const meta =
      floor.ticketMeta[
        ticket.id
      ];

    if (meta) {
      meta.foodCost +=
        active.foodCost;

      meta.qualityWeighted +=
        active.quality *
        active.qty;

      meta.quantityWeight +=
        active.qty;
    }

    const allReady =
      (
        ticket.lines ||
        []
      ).every(
        item =>
          item.status ===
          'ready'
      );

    if (
      !allReady
    ) {
      continue;
    }

    ticket.status =
      'ready';

    ticket.completedMinute =
      minute;

    if (meta) {
      meta.readyMinute =
        minute;
    }

    runtime
      .kitchen
      .completed
      .push(
        ticket
      );

    runtime
      .kitchen
      .queue =
      runtime
        .kitchen
        .queue
        .filter(
          item =>
            item.id !==
            ticket.id
        );

    const entry =
      meta &&
      floor.orders[
        meta.orderId
      ];

    if (!entry) {
      continue;
    }

    entry.order.meta.foodCost =
      Math.round(
        Number(
          meta.foodCost ||
          0
        ) *
        100
      ) /
      100;

    entry.order.meta.quality =
      meta.quantityWeight >
        0
        ? Math.round(
            meta.qualityWeighted /
            meta.quantityWeight *
            10
          ) /
          10
        : 60;

    entry.order.meta.cookMinutes =
      Math.max(
        1,
        minute -
        Number(
          meta.startedMinute ||
          entry.createdMinute ||
          minute
        )
      );

    floor.metrics
      .cookMinutesTotal +=
      entry.order.meta
        .cookMinutes;

    floor.metrics
      .cookSamples +=
      1;

    finalizeReadyOrder(
      runtime,
      shop,
      entry,
      minute,
      ctx
    );
  }

  const finishedKeys =
    new Set(
      finished.map(
        item =>
          item.ticketId +
          ':' +
          item.lineId
      )
    );

  floor.activeLines =
    floor.activeLines.filter(
      item =>
        !finishedKeys.has(
          item.ticketId +
          ':' +
          item.lineId
        )
    );
}

function mistakeProbability(
  entry,
  runtime,
  ctx
) {
  const coverage =
    clamp(
      ctx.staffCoverage ||
      1,
      0.3,
      1.2
    );

  const cookMinutes =
    Number(
      entry
        .order
        .meta
        .cookMinutes ||
      0
    );

  const kitchenLoad =
    kitchenQueueCount(
      runtime
    );

  return clamp(
    0.012 +
    Math.max(
      0,
      0.92 -
      coverage
    ) *
      0.09 +
    Math.max(
      0,
      kitchenLoad -
      5
    ) *
      0.004 +
    Math.max(
      0,
      cookMinutes -
      25
    ) *
      0.0008,
    0.005,
    0.18
  );
}

function settleEntry(
  runtime,
  shop,
  entry,
  minute,
  ctx={},
  delivery=null
) {
  const floor =
    ensureState(
      runtime
    );

  const order =
    entry.order;

  if (
    order.status ===
      'paid' ||
    order.status ===
      'cancelled'
  ) {
    return false;
  }

  if (
    order.status ===
    'ready'
  ) {
    orderEngine
      .transition(
        order,
        'served'
      );
  }

  if (
    order.status !==
    'served'
  ) {
    return false;
  }

  const mistake =
    runtime.rng.next() <
    mistakeProbability(
      entry,
      runtime,
      ctx
    );

  let refund =
    0;

  if (mistake) {
    floor.metrics
      .mistakesToday +=
      1;

    const severe =
      runtime.rng.next() <
      0.28;

    refund =
      order.total *
      (
        severe
          ? 0.75
          : 0.28
      );

    floor.metrics
      .returnsToday +=
      severe
        ? 1
        : 0;
  }

  orderEngine
    .transition(
      order,
      'paid'
    );

  const basePlatformRate =
    order.channel ===
      'delivery'
      ? Number(
          delivery &&
          delivery
            .commissionRate ||
          0.18
        )
      : 0;

  const platformRate =
    basePlatformRate *
    clamp(
      Number(
        ctx.platformCostMultiplier
      ) || 1,
      0.45,
      1.8
    );

  const settled =
    settlementEngine
      .settleOrder(
        runtime.ledger,
        order,
        {
          foodCost:
            Number(
              order
                .meta
                .foodCost ||
              0
            ),
          platformRate,
          packagingCost:
            order.channel ===
              'delivery'
              ? 1.4
              : order.channel ===
                  'pickup'
                ? 0.8
                : 0,
          refund
        }
      );

  const waitMinutes =
    Number(
      order.meta.waitMinutes ||
      0
    );

  const deliveryLoss =
    Number(
      delivery &&
      delivery.qualityLoss ||
      0
    );

  const speed =
    clamp(
      100 -
      waitMinutes *
        1.4 -
      Number(
        order
          .meta
          .cookMinutes ||
        0
      ) *
        1.2 -
      (
        delivery
          ? Math.max(
              0,
              Number(
                delivery.actualMinutes ||
                delivery.etaMinutes ||
                0
              ) -
              22
            ) *
              0.8
          : 0
      ),
      12,
      100
    );

  const service =
    serviceEngine
      .serviceScore({
        staffCoverage:
          order.meta
            .staffCoverage ||
          ctx.staffCoverage ||
          1,
        waitMinutes,
        mistakes:
          mistake
            ? 1
            : 0
      });

  const profile =
    profileById(
      runtime,
      entry.profileId
    );

  let retention =
    null;

  if (profile) {
    retention =
      retentionEngine
        .evaluate(
          profile,
          entry.visit,
          runtime.shop,
          {
            paidPerPerson:
              order.total /
              Math.max(
                1,
                order.partySize
              ),
            taste:
              clamp(
                Number(
                  order.meta
                    .quality ||
                  65
                ) -
                deliveryLoss -
                (
                  mistake
                    ? 15
                    : 0
                ),
                0,
                100
              ),
            portion:72,
            speed,
            service,
            hygiene:78,
            environment:74,
            stability:
              mistake
                ? 52
                : 76
          },
          runtime.rng
        );

    const repeatProbability =
      clamp(
        Number(
          retention &&
          retention.repeatProbability
        ) ||
        0,
        0,
        1
      );

    floor.metrics
      .repeatIntentTotalToday +=
      repeatProbability;

    floor.metrics
      .repeatIntentSamplesToday +=
      1;

    if (
      repeatProbability >=
      0.52
    ) {
      floor.metrics
        .repeatLikelyVisitsToday +=
        1;
    } else if (
      repeatProbability <
      0.30
    ) {
      floor.metrics
        .churnRiskVisitsToday +=
        1;
    }

    const reputationMultiplier =
      clamp(
        Number(
          ctx.reputationMultiplier
        ) || 1,
        0.5,
        1.6
      );

    if (
      retention.reviewStars !=
      null
    ) {
      retention.reviewStars =
        clamp(
          3 +
          (
            Number(
              retention.reviewStars
            ) -
            3
          ) *
          reputationMultiplier,
          1,
          5
        );
    }

    retention.wordOfMouth =
      clamp(
        Number(
          retention.wordOfMouth
        ) *
        reputationMultiplier,
        -1,
        1
      );

    retentionEngine
      .updateShopReputation(
        runtime.shop,
        retention
      );
  }

  const menuItem =
    runtime.menu.find(
      item =>
        item.id ===
        (
          order.items[0] &&
          order.items[0]
            .menuItemId
        )
    );

  if (menuItem) {
    const soldQty =
      order.items.reduce(
        (
          sum,
          item
        ) =>
          sum +
          item.qty,
        0
      );

    menuEngine
      .recordSale(
        menuItem,
        {
          qty:
            soldQty,
          paid:
            order.total,
          variableCost:
            order.meta
              .foodCost,
          rating:
            retention &&
            retention.reviewStars
        }
      );

    floor.metrics
      .dishOrdersToday[
        menuItem.id
      ] =
      (
        Number(
          floor.metrics
            .dishOrdersToday[
              menuItem.id
            ]
        ) ||
        0
      ) +
      soldQty;

    floor.metrics
      .dishRevenueToday[
        menuItem.id
      ] =
      Math.round(
        (
          (
            Number(
              floor.metrics
                .dishRevenueToday[
                  menuItem.id
                ]
            ) ||
            0
          ) +
          Number(
            settled.revenue
          )
        ) *
        100
      ) /
      100;
  }

  const cashIn =
    Math.max(
      0,
      Number(
        settled.revenue ||
        0
      ) -
      Number(
        settled.platformFee ||
        0
      ) -
      Number(
        settled.packaging ||
        0
      ) -
      Number(
        settled.refund ||
        0
      )
    );

  gameState
    .addCash(
      cashIn
    );

  floor.metrics
    .completedOrdersToday +=
    1;

  if (
    order.channel ===
    'delivery'
  ) {
    floor.metrics
      .deliveriesToday +=
      1;
  }

  entry.status =
    'completed';

  entry.completedMinute =
    minute;

  entry.settlement =
    settled;

  floor.history.unshift({
    minute,
    type:'completed',
    orderId:
      order.id,
    channel:
      order.channel,
    revenue:
      settled.revenue,
    contribution:
      settled.contribution,
    mistake
  });

  floor.history =
    floor.history.slice(
      0,
      160
    );

  return true;
}

function processTableSessions(
  runtime,
  shop,
  minute,
  ctx={}
) {
  const floor =
    ensureState(
      runtime
    );

  for (
    const [tableId, session]
    of Object.entries(
      floor.tableSessions
    )
  ) {
    if (
      Number(
        session.finishMinute
      ) >
      minute
    ) {
      continue;
    }

    const entry =
      floor.orders[
        session.orderId
      ];

    if (entry) {
      settleEntry(
        runtime,
        shop,
        entry,
        minute,
        ctx,
        null
      );
    }

    serviceEngine
      .releaseTable(
        runtime.diningRoom,
        tableId
      );

    delete floor
      .tableSessions[
        tableId
      ];
  }
}

function processPickup(
  runtime,
  shop,
  minute,
  ctx={}
) {
  const floor =
    ensureState(
      runtime
    );

  const keep = [];

  for (
    const row
    of floor.pickupQueue
  ) {
    if (
      Number(
        row.pickupMinute
      ) <=
      minute
    ) {
      const entry =
        floor.orders[
          row.orderId
        ];

      if (entry) {
        if (
          entry.order.status ===
          'ready'
        ) {
          orderEngine
            .transition(
              entry.order,
              'served'
            );
        }

        settleEntry(
          runtime,
          shop,
          entry,
          minute,
          ctx,
          null
        );
      }
    } else {
      keep.push(
        row
      );
    }
  }

  floor.pickupQueue =
    keep;
}

function processDeliveries(
  runtime,
  shop,
  minute,
  ctx={}
) {
  const floor =
    ensureState(
      runtime
    );

  const keep = [];

  for (
    const delivery
    of floor.deliveries
  ) {
    if (
      delivery.status ===
        'waiting_pickup' &&
      minute >=
        Number(
          delivery
            .riderPickupMinute
        )
    ) {
      delivery.status =
        'delivering';

      delivery.deliveryStartMinute =
        Number(
          delivery.riderPickupMinute
        );

      delivery.deliverMinute =
        delivery
          .deliveryStartMinute +
        Number(
          delivery.etaMinutes ||
          20
        );
    }

    if (
      delivery.status ===
        'delivering' &&
      minute >=
        Number(
          delivery.deliverMinute
        )
    ) {
      const jitter =
        runtime.rng.int(
          -3,
          10
        );

      deliveryEngine
        .complete(
          delivery,
          Math.max(
            5,
            Number(
              delivery.etaMinutes ||
              20
            ) +
            jitter
          )
        );

      const entry =
        floor.orders[
          delivery.orderId
        ];

      if (entry) {
        if (
          entry.order.status ===
          'ready'
        ) {
          orderEngine
            .transition(
              entry.order,
              'served'
            );
        }

        settleEntry(
          runtime,
          shop,
          entry,
          minute,
          ctx,
          delivery
        );
      }
    } else {
      keep.push(
        delivery
      );
    }
  }

  floor.deliveries =
    keep;
}

function kitchenQueueCount(
  runtime
) {
  const floor =
    ensureState(
      runtime
    );

  const queued =
    (
      runtime
        .kitchen
        .queue ||
      []
    ).reduce(
      (
        sum,
        ticket
      ) =>
        sum +
        (
          ticket.lines ||
          []
        ).filter(
          line =>
            line.status ===
              'queued'
        ).length,
      0
    );

  return queued +
    floor.activeLines.length;
}

function processStep(
  runtime,
  shop,
  minute,
  arrivals,
  ctx={}
) {
  removeAbandoned(
    runtime,
    minute
  );

  for (
    let i = 0;
    i < arrivals;
    i++
  ) {
    enqueueArrival(
      runtime,
      shop,
      minute,
      ctx
    );
  }

  seatWaiting(
    runtime,
    shop,
    minute,
    ctx
  );

  completeKitchenLines(
    runtime,
    shop,
    minute,
    ctx
  );

  startKitchenLines(
    runtime,
    minute,
    ctx
  );

  processPickup(
    runtime,
    shop,
    minute,
    ctx
  );

  processDeliveries(
    runtime,
    shop,
    minute,
    ctx
  );

  processTableSessions(
    runtime,
    shop,
    minute,
    ctx
  );

  // Tables may have been freed by finished diners.
  seatWaiting(
    runtime,
    shop,
    minute,
    ctx
  );

  ensureState(
    runtime
  ).metrics
    .peakQueueToday =
    Math.max(
      ensureState(
        runtime
      ).metrics
        .peakQueueToday,
      runtime
        .diningRoom
        .queue
        .length
    );
}

function advance(
  runtime,
  shop,
  advancedMinutes,
  arrivals,
  ctx={}
) {
  const floor =
    ensureState(
      runtime
    );

  syncTables(
    runtime,
    ctx.seats ||
    shop.seatEstimate ||
    shop.seats ||
    36
  );

  const minutes =
    Math.max(
      0,
      Number(
        advancedMinutes
      ) ||
      0
    );

  const endMinute =
    Number(
      ctx.absoluteMinute
    );

  const end =
    Number.isFinite(
      endMinute
    )
      ? endMinute
      : (
          Number(
            floor.lastMinute ||
            0
          ) +
          minutes
        );

  const start =
    Number.isFinite(
      Number(
        floor.lastMinute
      )
    )
      ? Number(
          floor.lastMinute
        )
      : end -
        minutes;

  const count =
    Math.max(
      0,
      Math.floor(
        Number(
          arrivals
        ) ||
        0
      )
    );

  const arrivalSchedule = [];

  for (
    let i = 0;
    i < count;
    i++
  ) {
    arrivalSchedule.push(
      Math.round(
        start +
        (
          i +
          1
        ) /
        (
          count +
          1
        ) *
        Math.max(
          1,
          end -
          start
        )
      )
    );
  }

  let scheduleIndex =
    0;

  const step =
    Math.max(
      1,
      Math.min(
        5,
        Math.ceil(
          Math.max(
            1,
            minutes
          ) /
          24
        )
      )
    );

  let cursor =
    start;

  let changed =
    count >
    0;

  if (
    minutes <=
    0
  ) {
    processStep(
      runtime,
      shop,
      end,
      0,
      ctx
    );

    floor.lastMinute =
      end;

    return {
      changed:false,
      completedOrders:0,
      snapshot:
        getSnapshot(
          runtime
        )
    };
  }

  const beforeCompleted =
    floor.metrics
      .completedOrdersToday;

  while (
    cursor <
    end
  ) {
    const next =
      Math.min(
        end,
        cursor +
        step
      );

    let arrivalsNow =
      0;

    while (
      scheduleIndex <
        arrivalSchedule.length &&
      arrivalSchedule[
        scheduleIndex
      ] <=
        next
    ) {
      arrivalsNow +=
        1;

      scheduleIndex +=
        1;
    }

    processStep(
      runtime,
      shop,
      next,
      arrivalsNow,
      {
        ...ctx,
        peak:
          runtime
            .diningRoom
            .queue
            .length >
          4
      }
    );

    cursor =
      next;
  }

  floor.lastMinute =
    end;

  const completed =
    floor.metrics
      .completedOrdersToday -
    beforeCompleted;

  if (
    completed >
    0
  ) {
    changed =
      true;
  }

  if (
    runtime
      .diningRoom
      .queue
      .length ||
    floor.activeLines.length ||
    floor.deliveries.length ||
    Object.keys(
      floor.tableSessions
    ).length
  ) {
    changed =
      true;
  }

  return {
    changed,
    completedOrders:
      completed,
    snapshot:
      getSnapshot(
        runtime
      )
  };
}

function getSnapshot(
  runtime
) {
  const floor =
    ensureState(
      runtime
    );

  const occupiedTables =
    (
      runtime
        .diningRoom
        .tables ||
      []
    ).filter(
      table =>
        table.status ===
        'occupied'
    ).length;

  const seatedPeople =
    Object.values(
      floor.tableSessions
    ).reduce(
      (
        sum,
        session
      ) => {
        const entry =
          floor.orders[
            session.orderId
          ];

        return (
          sum +
          (
            entry
              ? Number(
                  entry
                    .order
                    .partySize ||
                  1
                )
              : 0
          )
        );
      },
      0
    );

  return {
    queueParties:
      runtime
        .diningRoom
        .queue
        .length,
    occupiedTables,
    totalTables:
      (
        runtime
          .diningRoom
          .tables ||
        []
      ).length,
    seatedPeople,
    kitchenQueue:
      kitchenQueueCount(
        runtime
      ),
    kitchenActive:
      floor.activeLines
        .length,
    pickupWaiting:
      floor.pickupQueue
        .length,
    deliveryWaiting:
      floor.deliveries
        .filter(
          item =>
            item.status ===
            'waiting_pickup'
        )
        .length,
    deliveryOnRoad:
      floor.deliveries
        .filter(
          item =>
            item.status ===
            'delivering'
        )
        .length,
    walkawaysToday:
      floor.metrics
        .walkawaysToday,
    stockoutsToday:
      floor.metrics
        .stockoutsToday,
    mistakesToday:
      floor.metrics
        .mistakesToday,
    completedOrdersToday:
      floor.metrics
        .completedOrdersToday,
    repeatGuestsToday:
      floor.metrics
        .repeatGuestsToday,
    newGuestsToday:
      floor.metrics
        .newGuestsToday,
    priceWalkawaysToday:
      floor.metrics
        .priceWalkawaysToday,
    repeatRate:
      (
        floor.metrics
          .repeatGuestsToday +
        floor.metrics
          .newGuestsToday
      ) >
        0
        ? Math.round(
            floor.metrics
              .repeatGuestsToday /
            (
              floor.metrics
                .repeatGuestsToday +
              floor.metrics
                .newGuestsToday
            ) *
            1000
          ) /
          1000
        : 0,
    avgRepeatIntent:
      floor.metrics
        .repeatIntentSamplesToday >
        0
        ? Math.round(
            floor.metrics
              .repeatIntentTotalToday /
            floor.metrics
              .repeatIntentSamplesToday *
            1000
          ) /
          1000
        : 0,
    repeatLikelyVisitsToday:
      floor.metrics
        .repeatLikelyVisitsToday,
    churnRiskVisitsToday:
      floor.metrics
        .churnRiskVisitsToday,
    dishOrdersToday:{
      ...floor.metrics
        .dishOrdersToday
    },
    dishRevenueToday:{
      ...floor.metrics
        .dishRevenueToday
    },
    peakQueueToday:
      floor.metrics
        .peakQueueToday,
    avgWaitMinutes:
      floor.metrics
        .waitSamples >
      0
        ? Math.round(
            floor.metrics
              .waitMinutesTotal /
            floor.metrics
              .waitSamples *
            10
          ) /
          10
        : 0,
    avgCookMinutes:
      floor.metrics
        .cookSamples >
      0
        ? Math.round(
            floor.metrics
              .cookMinutesTotal /
            floor.metrics
              .cookSamples *
            10
          ) /
          10
        : 0
  };
}

function closeDay(
  runtime
) {
  const floor =
    ensureState(
      runtime
    );

  const snapshot =
    getSnapshot(
      runtime
    );

  const daily = {
    ...snapshot,
    arrivedToday:
      floor.metrics
        .arrivedToday,
    seatedToday:
      floor.metrics
        .seatedToday,
    returnsToday:
      floor.metrics
        .returnsToday,
    deliveriesToday:
      floor.metrics
        .deliveriesToday,
    pickupOrdersToday:
      floor.metrics
        .pickupOrdersToday,
    maxKitchenQueueToday:
      floor.metrics
        .maxKitchenQueueToday
  };

  floor.metrics =
    defaultMetrics();

  return daily;
}

module.exports = {
  createState,
  ensureState,
  syncTables,
  enqueueArrival,
  advance,
  getSnapshot,
  closeDay,
  kitchenQueueCount,
  customerReturnScore,
  priceRejectProbability
};
