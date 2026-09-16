'use strict';

const gameState =
  require('../core/gameState.js');

const simulationSystem =
  require('../core/simulationSystem.js');

const timeScheduleCoordinator =
  require('../core/timeScheduleCoordinatorV0812.js');

const simulationConfig =
  require('../core/simulationConfig.js');

const citySystem =
  require('../city/citySystem.js');

const demandSystem =
  require('../city/demandSystem.js');

const openingPrepSystem =
  require('../opening/openingPrepSystem.js');

const operations =
  require('./operationsStoreV080.js');

const runtimeEngine =
  require('./restaurantRuntimeV10.js');

const settlementEngine =
  require('./settlementEngineV10.js');

const staffOperations =
  require('./staffOperationsEngineV10.js');

const marketingEngine =
  require('./marketingEngineV10.js');

const dynamicWorldSystem =
  require('../world/dynamicWorldSystemV0815.js');

const liveWorldSystem =
  require('../world/liveWorldSystemV084.js');

const operationsSchedule =
  require('./operationsScheduleV087.js');

const staffWorkloadSystem =
  require('./staffWorkloadV089.js');
// V089_STAFF_WORKLOAD
// V084_RESTAURANT_LIVE_WORLD


const floorSimulation =
  require('./floorSimulationV082.js');

const PERIOD_MINUTES = {
  breakfast: 240,
  lunch: 240,
  afternoon: 180,
  dinner: 240,
  night: 540
};

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

function mealPeriod(
  hour
) {
  if (
    hour >= 6 &&
    hour < 10
  ) {
    return 'breakfast';
  }

  if (
    hour >= 10 &&
    hour < 14
  ) {
    return 'lunch';
  }

  if (
    hour >= 14 &&
    hour < 17
  ) {
    return 'afternoon';
  }

  if (
    hour >= 17 &&
    hour < 21
  ) {
    return 'dinner';
  }

  return 'night';
}

function absoluteMinute() {
  const time =
    gameState.getTime();

  return (
    simulationSystem
      .getDayOrdinal(
        time
      ) *
      1440 +
    Number(
      time.hour
    ) *
      60 +
    Number(
      time.minute
    )
  );
}

function staffCoverage(
  shop
) {
  // V084_STAFF_CAPACITY
  try {
    const readiness =
      openingPrepSystem
        .getReadiness(
          shop.id
        );

    const base =
      clamp(
        readiness &&
        readiness.staffing
          ? readiness
              .staffing
              .coverage
          : 0.85,
        0.3,
        1.2
      );

    const people =
      liveWorldSystem
        .getStaffModifier(
          shop.id
        );

    const scheduled =
      operationsSchedule
        .getCoverage(
          shop.id,
          gameState
            .getTime()
        );

    const fatigue =
      staffWorkloadSystem
        .getCapacityModifier(
          shop.id,
          gameState
            .getTime()
        );

    return clamp(
      Math.min(
        base,
        Number(
          scheduled.factor
        ) ||
        1
      ) *
      (
        Number(
          people
            .capacityMultiplier
        ) ||
        1
      ) *
      fatigue,
      0.08,
      1.2
    );
  } catch (error) {
    return 0.85;
  }
}

function dailyPayroll(
  shop
) {
  try {
    const readiness =
      openingPrepSystem
        .getReadiness(
          shop.id
        );

    const monthly =
      readiness &&
      readiness.staffing
        ? Number(
            readiness
              .staffing
              .payroll
          ) ||
          0
        : 0;

    if (
      monthly >
      0
    ) {
      return (
        monthly /
        30
      );
    }
  } catch (error) {
  }

  const runtime =
    operations
      .getRuntime(
        shop.id
      );

  return runtime
    ? staffOperations
        .payrollDaily(
          runtime.staff
        )
    : 0;
}

function businessHours(shop) {
  // V083_UNIFIED_DEMAND
  return (
    operationsSchedule
      .getBusinessHours(
        shop
      )
  );
}

function isWithinBusinessHours(
  shop,
  time
) {
  return (
    operationsSchedule
      .isOpenAt(
        shop,
        time ||
        gameState.getTime()
      )
  );
}

function expectedArrivalsPerMinute(
  shop,
  runtime
) {
  const district =
    citySystem
      .getDistrict(
        shop.districtId
      );

  if (!district) {
    return 0;
  }

  const time =
    gameState.getTime();

  if (!isWithinBusinessHours(shop, time)) {
    return 0;
  }

  const period =
    mealPeriod(
      Number(
        time.hour
      ) ||
      0
    );

  const demandBreakdown =
    demandSystem
      .getDemandBreakdown(
        shop.districtId
      );

  const periodDemand =
    Math.max(
      0,
      Number(
        demandBreakdown &&
        demandBreakdown.total
      ) ||
      0
    );

  const restaurants =
    Math.max(
      1,
      Number(
        district.restaurantCount
      ) ||
      1
    );

  const periodMinutes =
    PERIOD_MINUTES[
      period
    ] ||
    240;

  const averageRestaurantDemand =
    periodDemand /
    restaurants;

  const rating =
    clamp(
      runtime.shop.rating ||
      4,
      1,
      5
    );

  const ratingFactor =
    0.72 +
    (
      rating -
      3
    ) *
      0.14;

  const awareness =
    clamp(
      runtime.brand &&
      runtime.brand.awareness,
      0,
      100
    );

  const brandFactor =
    0.88 +
    awareness /
      500;

  const worldModifiers =
    dynamicWorldSystem
      .getModifiers(
        {
          districtId:
            shop.districtId,
          shopId:
            shop.id
        }
      );

  const rawMarketingFactor =
    marketingEngine
      .demandMultiplier(
        runtime.campaigns ||
        []
      );

  const marketingEfficiency =
    clamp(
      Number(
        worldModifiers
          .marketingEfficiencyMultiplier
      ) || 1,
      0.45,
      1.75
    );

  const marketingFactor =
    1 +
    (
      rawMarketingFactor -
      1
    ) *
    marketingEfficiency;

  const coverage =
    staffCoverage(
      shop
    );

  const dynamicDemandFactor =
    Number(
      worldModifiers
        .demandMultiplier
    ) || 1;

  // V084_COMPETITION_DEMAND
  const competitiveMarket =
    liveWorldSystem
      .getDistrictDashboard(
        shop.districtId
      );

  const competitionFactor =
    Number(
      competitiveMarket
        .playerDemandMultiplier
    ) || 1;

  const nightFactor =
    period ===
      'night'
      ? Number(
          worldModifiers
            .nightDemandMultiplier
        ) || 1
      : 1;

  const saturationFactor =
    clamp(
      1.18 -
      (
        Number(
          district.saturation
        ) ||
        70
      ) /
      260,
      0.62,
      1.08
    );

  const trialFactor =
    shop.status ===
      'trial_opening'
      ? 0.78
      : 1;

  const peakDemandFactor =
    staffWorkloadSystem
      .getDemandMultiplier(
        time
      );

  return Math.max(
    0,
    averageRestaurantDemand /
      periodMinutes *
      ratingFactor *
      brandFactor *
      marketingFactor *
      saturationFactor *
      (
        0.7 +
        coverage *
          0.3
      ) *
      dynamicDemandFactor *
      competitionFactor *
      nightFactor *
      peakDemandFactor *
      trialFactor
  );
}

function chooseCustomer(
  runtime,
  districtId
) {
  const values =
    Object.values(
      runtime.customers ||
      {}
    );

  if (
    values.length >
      0 &&
    runtime.rng.next() <
      0.34
  ) {
    return values[
      runtime.rng.int(
        0,
        values.length -
          1
      )
    ];
  }

  const profile =
    runtimeEngine
      .customerProfile(
        runtime,
        {
          districtId
        }
      );

  const allIds =
    Object.keys(
      runtime.customers
    );

  if (
    allIds.length >
    300
  ) {
    delete runtime
      .customers[
        allIds[0]
      ];
  }

  return profile;
}

function ensurePayableState(runtime) {
  // V083_PAYABLES
  runtime.simulation =
    runtime.simulation ||
    {};

  runtime.simulation.unpaidOperatingPayables =
    Math.max(
      0,
      Number(
        runtime.simulation.unpaidOperatingPayables
      ) || 0
    );

  runtime.simulation.operatingPayablesByType =
    runtime.simulation.operatingPayablesByType &&
    typeof runtime.simulation.operatingPayablesByType === 'object'
      ? runtime.simulation.operatingPayablesByType
      : {};

  return runtime.simulation;
}

function spendOperatingCash(
  amount,
  runtime,
  category='other'
) {
  const value =
    Math.max(
      0,
      Number(
        amount
      ) ||
      0
    );

  if (
    value <=
    0
  ) {
    return {
      paid: 0,
      unpaid: 0
    };
  }

  const sim =
    ensurePayableState(
      runtime
    );

  const player =
    gameState
      .getPlayer();

  const cash =
    Number(
      player.cash
    ) ||
    0;

  const paid =
    Math.min(
      cash,
      value
    );

  if (
    paid >
    0
  ) {
    gameState
      .spendCash(
        paid
      );
  }

  const unpaid =
    value -
    paid;

  if (
    unpaid >
    0
  ) {
    sim.unpaidOperatingPayables +=
      unpaid;

    sim.operatingPayablesByType[category] =
      (
        Number(
          sim.operatingPayablesByType[category]
        ) || 0
      ) +
      unpaid;

    if (
      sim.oldestPayableDay ==
      null
    ) {
      sim.oldestPayableDay =
        timeScheduleCoordinator
          .businessDayOrdinal(
            gameState.getTime(),
            simulationConfig
              .time
              .businessDayCutoffHour
          );
    }
  }

  return {
    paid,
    unpaid
  };
}

function serviceOperatingPayables(
  runtime
) {
  const sim =
    ensurePayableState(
      runtime
    );

  const debt =
    Math.max(
      0,
      Number(
        sim.unpaidOperatingPayables
      ) || 0
    );

  const day =
    timeScheduleCoordinator
      .businessDayOrdinal(
        gameState.getTime(),
        simulationConfig
          .time
          .businessDayCutoffHour
      );

  if (
    debt <=
    0.01
  ) {
    sim.unpaidOperatingPayables = 0;
    sim.operatingPayablesByType = {};
    sim.oldestPayableDay = null;
    sim.payableAgeDays = 0;
    return { paid:0, remaining:0, ageDays:0 };
  }

  if (
    sim.oldestPayableDay ==
    null
  ) {
    sim.oldestPayableDay =
      day;
  }

  sim.payableAgeDays =
    Math.max(
      0,
      day -
      Number(
        sim.oldestPayableDay
      )
    );

  const now =
    absoluteMinute();

  if (
    Number.isFinite(
      Number(
        sim.lastPayableServiceMinute
      )
    ) &&
    now -
      Number(
        sim.lastPayableServiceMinute
      ) <
      60
  ) {
    return {
      paid:0,
      remaining:debt,
      ageDays:sim.payableAgeDays
    };
  }

  sim.lastPayableServiceMinute =
    now;

  const cash =
    Number(
      gameState
        .getPlayer()
        .cash
    ) || 0;

  const reserve = 1000;
  const available =
    Math.max(
      0,
      cash -
      reserve
    );

  const payment =
    Math.min(
      debt,
      available *
      0.6
    );

  if (
    payment <=
    0
  ) {
    return {
      paid:0,
      remaining:debt,
      ageDays:sim.payableAgeDays
    };
  }

  gameState
    .spendCash(
      payment
    );

  let remainingPayment =
    payment;

  const priority = [
    'labor',
    'utilities',
    'rent',
    'compliance',
    'marketing',
    'other'
  ];

  for (
    const key
    of priority
  ) {
    const amount =
      Math.max(
        0,
        Number(
          sim.operatingPayablesByType[key]
        ) || 0
      );

    if (
      amount <=
        0 ||
      remainingPayment <=
        0
    ) {
      continue;
    }

    const used =
      Math.min(
        amount,
        remainingPayment
      );

    sim.operatingPayablesByType[key] =
      Math.max(
        0,
        amount -
        used
      );

    remainingPayment -=
      used;
  }

  sim.unpaidOperatingPayables =
    Math.max(
      0,
      debt -
      payment
    );

  if (
    sim.unpaidOperatingPayables <=
    0.01
  ) {
    sim.unpaidOperatingPayables = 0;
    sim.operatingPayablesByType = {};
    sim.oldestPayableDay = null;
    sim.payableAgeDays = 0;
  }

  return {
    paid:payment,
    remaining:
      sim.unpaidOperatingPayables,
    ageDays:
      sim.payableAgeDays
  };
}

function operatingRestriction(
  runtime
) {
  const sim =
    ensurePayableState(
      runtime
    );

  const debt =
    Number(
      sim.unpaidOperatingPayables
    ) || 0;

  if (
    debt <=
    0
  ) {
    return 1;
  }

  const age =
    Math.max(
      0,
      Number(
        sim.payableAgeDays
      ) || 0
    );

  if (age >= 7) return 0.55;
  if (age >= 3) return 0.72;
  if (age >= 1) return 0.88;
  return 0.96;
}

function accrueFixedCosts(
  shop,
  runtime,
  minutes
) {
  const ratio =
    Math.max(
      0,
      Number(
        minutes
      ) ||
      0
    ) /
    1440;

  if (
    ratio <=
    0
  ) {
    return {
      rent: 0,
      labor: 0,
      utilities: 0,
      marketing: 0,
      compliance: 0
    };
  }

  const worldModifiers =
    dynamicWorldSystem
      .getModifiers(
        {
          districtId:
            shop.districtId,
          shopId:
            shop.id
        }
      );

  const rent =
    (
      Number(
        shop.monthlyRent
      ) ||
      0
    ) /
    30 *
    ratio *
    (
      Number(
        worldModifiers
          .rentCostMultiplier
      ) || 1
    );

  const labor =
    dailyPayroll(
      shop
    ) *
    ratio *
    (
      Number(
        worldModifiers
          .laborCostMultiplier
      ) || 1
    );

  const area =
    Math.max(
      20,
      Number(
        shop.usableArea ||
        shop.grossArea
      ) ||
      60
    );

  const utilities =
    (
      32 +
      area *
        0.42
    ) *
    ratio *
    (
      Number(
        worldModifiers
          .utilityCostMultiplier
      ) || 1
    );

  const marketing =
    (
      runtime.campaigns ||
      []
    )
      .filter(
        item =>
          item.status ===
          'active'
      )
      .reduce(
        (
          sum,
          item
        ) =>
          sum +
          (
            Number(
              item.budget
            ) ||
            0
          ) /
          Math.max(
            1,
            Number(
              item.days
            ) ||
            1
          ) *
          ratio,
        0
      );

  const compliance =
    (
      10 +
      area *
        0.08
    ) *
    ratio *
    (
      Number(
        worldModifiers
          .complianceCostMultiplier
      ) || 1
    );

  settlementEngine
    .addFixedCosts(
      runtime.ledger,
      {
        rent,
        labor,
        utilities,
        marketing,
        compliance
      }
    );

  spendOperatingCash(
    rent,
    runtime,
    'rent'
  );

  spendOperatingCash(
    labor,
    runtime,
    'labor'
  );

  spendOperatingCash(
    utilities,
    runtime,
    'utilities'
  );

  spendOperatingCash(
    marketing,
    runtime,
    'marketing'
  );

  spendOperatingCash(
    compliance,
    runtime,
    'compliance'
  );

  return {
    rent,
    labor,
    utilities,
    marketing,
    compliance
  };
}

function maybeRestock(
  shop,
  runtime
) {
  const now =
    absoluteMinute();

  const last =
    Number(
      runtime
        .simulation
        .lastRestockMinute
    );

  if (
    Number.isFinite(
      last
    ) &&
    now -
      last <
      120
  ) {
    return null;
  }

  const rows =
    operations
      .inventoryRows(
        shop.id
      );

  const needs =
    rows.some(
      row =>
        row.status ===
          'critical' ||
        row.status ===
          'low'
    );

  runtime
    .simulation
    .lastRestockMinute =
    now;

  if (!needs) {
    return null;
  }

  return operations
    .autoRestock(
      shop.id
    );
}

function closeElapsedDays(
  shop,
  runtime,
  currentDay
) {
  let changed=false;
  while (Number(runtime.day)<currentDay) {
    const closed=runtimeEngine.closeDay(runtime);
    closed.floor=floorSimulation.closeDay(runtime);
    runtime.dailySnapshots.push(closed);
    dynamicWorldSystem.onShopDayClosed(shop,runtime,closed);

    const unified=operations.finalizeExternalOperatingDay(shop.id,runtime,closed,{source:'automatic'});
    runtime.simulation=runtime.simulation||{};
    runtime.simulation.lastAutoCloseResult=unified&&unified.ok
      ? {day:closed.day,ok:true}
      : {day:closed.day,ok:false,reason:unified&&unified.reason||'自动日结后处理失败'};

    if (runtime.dailySnapshots.length>45) runtime.dailySnapshots.splice(0,runtime.dailySnapshots.length-45);
    runtime.simulation.todayOrders=0;
    runtime.simulation.todayCustomers=0;
    changed=true;
  }
  return changed;
}

function simulateShop(
  shop,
  advancedMinutes
) {
  const runtime =
    operations
      .getRuntime(
        shop.id
      );

  if (!runtime) {
    return {
      changed: false,
      orders: 0
    };
  }

  const currentDay =
    timeScheduleCoordinator
      .businessDayOrdinal(
        gameState.getTime(),
        simulationConfig
          .time
          .businessDayCutoffHour
      );

  let changed =
    closeElapsedDays(
      shop,
      runtime,
      currentDay
    );

  // 营业日由真实时间自动创建；正式页面不再需要“假开始营业”按钮。
  const operatingDay =
    operations
      .startOperatingDay(
        shop.id
      );

  if (
    operatingDay &&
    operatingDay.ok &&
    !operatingDay.existing
  ) {
    changed = true;
  }

  serviceOperatingPayables(
    runtime
  );

  accrueFixedCosts(
    shop,
    runtime,
    advancedMinutes
  );

  maybeRestock(
    shop,
    runtime
  );

  const workloadTick =
    staffWorkloadSystem
      .advance(
        shop.id,
        advancedMinutes,
        gameState
          .getTime()
      );

  if (
    workloadTick &&
    workloadTick.overtimeCost >
      0
  ) {
    settlementEngine
      .addFixedCosts(
        runtime.ledger,
        {
          labor:
            workloadTick
              .overtimeCost
        }
      );

    spendOperatingCash(
      workloadTick
        .overtimeCost,
      runtime,
      'labor'
    );

    changed =
      true;
  }

  const rate =
    expectedArrivalsPerMinute(
      shop,
      runtime
    );

  runtime
    .simulation
    .arrivalCarry =
    (
      Number(
        runtime
          .simulation
          .arrivalCarry
      ) ||
      0
    ) +
    rate *
      advancedMinutes;

  let arrivals =
    Math.floor(
      runtime
        .simulation
        .arrivalCarry
    );

  const arrivalBatchLimit =
    Math.max(
      18,
      Math.min(
        120,
        Math.ceil(
          Math.max(
            1,
            advancedMinutes
          ) *
          3
        )
      )
    );

  arrivals =
    Math.min(
      arrivals,
      arrivalBatchLimit
    );

  runtime
    .simulation
    .arrivalCarry -=
    arrivals;

  const coverage =
    staffCoverage(
      shop
    );

  const worldModifiers =
    dynamicWorldSystem
      .getModifiers(
        {
          districtId:
            shop.districtId,
          shopId:
            shop.id
        }
      );

  const floorResult =
    floorSimulation
      .advance(
        runtime,
        shop,
        advancedMinutes,
        arrivals,
        {
          absoluteMinute:
            absoluteMinute(),
          staffCoverage:
            coverage,
          weather:
            gameState
              .getWorld()
              .weather,
          capacityMultiplier:
            (
              Number(
                worldModifiers
                  .capacityMultiplier
              ) || 1
            ) *
            operatingRestriction(
              runtime
            ) *
            clamp(
              1 -
              (
                Number(
                  worldModifiers
                    .inspectionRisk
                ) || 0
              ) *
              0.22,
              0.72,
              1
            ),
          deliveryDemandMultiplier:
            Number(
              worldModifiers
                .deliveryDemandMultiplier
            ) || 1,
          platformCostMultiplier:
            Number(
              worldModifiers
                .platformCostMultiplier
            ) || 1,
          reputationMultiplier:
            Number(
              worldModifiers
                .reputationMultiplier
            ) || 1,
          seats:
            Number(
              shop.seatEstimate ||
              shop.seats ||
              36
            )
        }
      );

  if (
    floorResult.changed
  ) {
    changed =
      true;
  }

  operations
    .persist(
      shop.id
    );

  return {
    changed,
    orders:
      floorResult.completedOrders
  };
}

function update(
  advancedMinutes
) {
  const minutes =
    Number(
      advancedMinutes
    ) ||
    0;

  if (
    minutes <=
    0
  ) {
    return false;
  }

  const business =
    gameState
      .getBusiness();

  const shops =
    Array.isArray(
      business.shops
    )
      ? business.shops
      : [];

  let changed =
    false;

  for (
    const shop
    of shops
  ) {
    if (
      shop.status !==
        'open' &&
      shop.status !==
        'trial_opening'
    ) {
      continue;
    }

    const result =
      simulateShop(
        shop,
        minutes
      );

    if (
      result.changed
    ) {
      changed =
        true;
    }
  }

  return changed;
}

module.exports = {
  PERIOD_MINUTES,
  mealPeriod,
  absoluteMinute,
  businessHours,
  isWithinBusinessHours,
  staffCoverage,
  expectedArrivalsPerMinute,
  accrueFixedCosts,
  serviceOperatingPayables,
  operatingRestriction,
  maybeRestock,
  simulateShop,
  update
};


/* BUSINESS_DATA_RUNTIME_BRIDGE_V1 */
try {
  if (typeof globalThis !== 'undefined') {
    globalThis.restaurantSimulation = module.exports;
  }
} catch (e) {}
