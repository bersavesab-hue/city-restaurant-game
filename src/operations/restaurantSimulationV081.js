'use strict';

const gameState =
  require('../core/gameState.js');

const simulationSystem =
  require('../core/simulationSystem.js');

const citySystem =
  require('../city/citySystem.js');

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
  try {
    const readiness =
      openingPrepSystem
        .getReadiness(
          shop.id
        );

    return clamp(
      readiness &&
      readiness.staffing
        ? readiness
            .staffing
            .coverage
        : 0.85,
      0.3,
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

  const period =
    mealPeriod(
      Number(
        time.hour
      ) ||
      0
    );

  const dailyDemand =
    Math.max(
      0,
      Number(
        district.baseDemand
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

  const periodShare =
    district.mealDemand &&
    Number(
      district.mealDemand[
        period
      ]
    ) ||
    (
      period ===
      'night'
        ? 0.08
        : 0.2
    );

  const periodMinutes =
    PERIOD_MINUTES[
      period
    ] ||
    240;

  const averageRestaurantDemand =
    dailyDemand /
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

  const marketingFactor =
    marketingEngine
      .demandMultiplier(
        runtime.campaigns ||
        []
      );

  const coverage =
    staffCoverage(
      shop
    );

  const weather =
    gameState
      .getWorld()
      .weather;

  const weatherFactor =
    weather ===
      'rain'
      ? 0.94
      : weather ===
          'storm'
        ? 0.78
        : weather ===
            'hot'
          ? 0.96
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

  return Math.max(
    0,
    averageRestaurantDemand *
      periodShare /
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
      weatherFactor
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

function spendOperatingCash(
  amount,
  runtime
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
    runtime.simulation
      .unpaidOperatingPayables =
      (
        Number(
          runtime
            .simulation
            .unpaidOperatingPayables
        ) ||
        0
      ) +
      unpaid;
  }

  return {
    paid,
    unpaid
  };
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
      marketing: 0
    };
  }

  const rent =
    (
      Number(
        shop.monthlyRent
      ) ||
      0
    ) /
    30 *
    ratio;

  const labor =
    dailyPayroll(
      shop
    ) *
    ratio;

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
    ratio;

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

  settlementEngine
    .addFixedCosts(
      runtime.ledger,
      {
        rent,
        labor,
        utilities,
        marketing
      }
    );

  spendOperatingCash(
    rent +
      labor +
      utilities +
      marketing,
    runtime
  );

  return {
    rent,
    labor,
    utilities,
    marketing
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
  let changed =
    false;

  while (
    Number(
      runtime.day
    ) <
    currentDay
  ) {
    const closed =
      runtimeEngine
        .closeDay(
          runtime
        );

    runtime
      .dailySnapshots
      .push(
        closed
      );

    if (
      runtime
        .dailySnapshots
        .length >
      45
    ) {
      runtime
        .dailySnapshots
        .splice(
          0,
          runtime
            .dailySnapshots
            .length -
            45
        );
    }

    runtime
      .simulation
      .todayOrders =
      0;

    runtime
      .simulation
      .todayCustomers =
      0;

    changed =
      true;
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
    simulationSystem
      .getDayOrdinal(
        gameState.getTime()
      );

  let changed =
    closeElapsedDays(
      shop,
      runtime,
      currentDay
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

  arrivals =
    Math.min(
      arrivals,
      18
    );

  runtime
    .simulation
    .arrivalCarry -=
    arrivals;

  if (
    arrivals <=
    0
  ) {
    operations
      .persist(
        shop.id
      );

    return {
      changed,
      orders: 0
    };
  }

  const coverage =
    staffCoverage(
      shop
    );

  let completed =
    0;

  for (
    let i = 0;
    i < arrivals;
    i++
  ) {
    const profile =
      chooseCustomer(
        runtime,
        shop.districtId
      );

    const time =
      gameState.getTime();

    const result =
      runtimeEngine
        .simulateVisit(
          runtime,
          profile,
          {
            hour:
              Number(
                time.hour
              ) ||
              12,

            minute:
              Number(
                time.minute
              ) ||
              0,

            staffCoverage:
              coverage,

            rain:
              gameState
                .getWorld()
                .weather ===
              'rain'
          }
        );

    if (!result.ok) {
      runtime.history.push({
        day:
          runtime.day,
        type:
          'lost_visit',
        reason:
          result.reason ||
          'unknown'
      });

      continue;
    }

    completed +=
      1;

    runtime
      .simulation
      .todayOrders +=
      1;

    runtime
      .simulation
      .todayCustomers +=
      Math.max(
        1,
        Number(
          result
            .order
            .partySize
        ) ||
        1
      );

    const cashIn =
      Math.max(
        0,
        Number(
          result
            .settlement
            .revenue
        ) -
        Number(
          result
            .settlement
            .platformFee
        ) -
        Number(
          result
            .settlement
            .packaging
        ) -
        Number(
          result
            .settlement
            .refund
        )
      );

    gameState
      .addCash(
        cashIn
      );

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
      completed
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
      'open'
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
  staffCoverage,
  expectedArrivalsPerMinute,
  accrueFixedCosts,
  maybeRestock,
  simulateShop,
  update
};
