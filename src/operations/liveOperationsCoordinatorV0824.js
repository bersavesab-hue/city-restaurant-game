'use strict';

const runtimeEngine =
  require('./restaurantRuntimeV10.js');

const inventoryEngine =
  require('../inventory/inventoryEngineV10.js');

const procurementEngine =
  require('../supplier/procurementEngineV10.js');

const customerDatabase =
  require('../customer/customerRandomDatabaseV0821.js');

const settlementEngine =
  require('./settlementEngineV10.js');

const VERSION =
  '0.8.24';

function clone(value) {
  if (value === undefined) {
    return undefined;
  }

  return JSON.parse(
    JSON.stringify(value)
  );
}

function ensureRuntime(
  runtime
) {
  if (
    !runtime ||
    typeof runtime !==
      'object'
  ) {
    return null;
  }

  runtime.customers =
    runtime.customers &&
    typeof runtime.customers ===
      'object'
      ? customerDatabase
          .normalizeCustomerMap(
            runtime.customers
          )
      : {};

  runtime.history =
    Array.isArray(
      runtime.history
    )
      ? runtime.history
      : [];

  runtime.dailySnapshots =
    Array.isArray(
      runtime.dailySnapshots
    )
      ? runtime.dailySnapshots
      : [];

  runtime.simulation =
    runtime.simulation &&
    typeof runtime.simulation ===
      'object'
      ? runtime.simulation
      : {};

  runtime.simulation.version =
    VERSION;

  runtime.simulation.todayOrders =
    Math.max(
      0,
      Number(
        runtime
          .simulation
          .todayOrders
      ) ||
      0
    );

  runtime.simulation.todayCustomers =
    Math.max(
      0,
      Number(
        runtime
          .simulation
          .todayCustomers
      ) ||
      0
    );

  return runtime;
}

function snapshot(
  runtime,
  context
) {
  const r =
    ensureRuntime(
      runtime
    );

  if (!r) {
    return null;
  }

  const ctx =
    context ||
    {};

  const inventory =
    inventoryEngine
      .stockSummary(
        r.inventory
      );

  let inventoryHealth =
    null;

  if (
    typeof inventoryEngine
      .inventoryHealth ===
      'function'
  ) {
    inventoryHealth =
      inventoryEngine
        .inventoryHealth(
          r.inventory
        );
  }

  const procurement =
    procurementEngine
      .procurementOverview(
        r.procurement,
        r.supplierNetwork,
        r.day
      );

  const customers =
    customerDatabase
      .aggregateProfiles(
        r.customers
      );

  const finance =
    settlementEngine
      .summary(
        r.ledger
      );

  const menu =
    Array.isArray(
      r.menu
    )
      ? r.menu
      : [];

  const activeMenu =
    menu.filter(
      item =>
        item.active !==
        false
    );

  const kitchenQueue =
    r.kitchen &&
    Array.isArray(
      r.kitchen.queue
    )
      ? r.kitchen.queue
      : [];

  const diningQueue =
    r.diningRoom &&
    Array.isArray(
      r.diningRoom.queue
    )
      ? r.diningRoom.queue
      : [];

  return {
    version:VERSION,
    shopId:
      r.shop &&
      r.shop.id ||
      null,
    day:
      Number(
        r.day
      ) ||
      1,
    menu:{
      total:
        menu.length,
      active:
        activeMenu.length,
      featured:
        activeMenu.find(
          item =>
            item.featured
        ) ||
        null
    },
    queues:{
      kitchen:
        kitchenQueue
          .filter(
            item =>
              item.status !==
                'completed'
          )
          .length,
      dining:
        diningQueue.length
    },
    inventory:{
      totalKg:
        Number(
          inventory.totalKg
        ) ||
        0,
      lotCount:
        Number(
          inventory.lotCount
        ) ||
        (
          r.inventory &&
          Array.isArray(
            r.inventory.lots
          )
            ? r.inventory
                .lots
                .length
            : 0
        ),
      alerts:
        inventoryHealth &&
        Array.isArray(
          inventoryHealth.alerts
        )
          ? inventoryHealth
              .alerts
          : []
    },
    procurement:{
      openOrders:
        procurement
          .openOrderCount ||
        0,
      overdueOrders:
        procurement
          .overdueOrderCount ||
        0,
      receivedOrders:
        procurement
          .receivedOrderCount ||
        0
    },
    customers,
    finance,
    staff:
      ctx.staff ||
      null,
    today:{
      orders:
        r.simulation
          .todayOrders,
      customers:
        r.simulation
          .todayCustomers
    }
  };
}

function resolveCustomer(
  runtime,
  customerId,
  options
) {
  const r =
    ensureRuntime(
      runtime
    );

  if (!r) {
    return null;
  }

  if (
    customerId &&
    r.customers[
      customerId
    ]
  ) {
    return r.customers[
      customerId
    ];
  }

  const profile =
    runtimeEngine
      .customerProfile(
        r,
        options ||
        {}
      );

  return profile;
}

function simulateVisit(
  runtime,
  customer,
  options
) {
  const r =
    ensureRuntime(
      runtime
    );

  if (!r) {
    return {
      ok:false,
      reason:'运行时不存在'
    };
  }

  const profile =
    customer ||
    resolveCustomer(
      r,
      null,
      options
    );

  if (!profile) {
    return {
      ok:false,
      reason:'顾客不存在'
    };
  }

  const result =
    runtimeEngine
      .simulateVisit(
        r,
        profile,
        options ||
        {}
      );

  if (result.ok) {
    r.simulation
      .todayOrders +=
      1;

    r.simulation
      .todayCustomers +=
      Math.max(
        1,
        Number(
          result.visit &&
          result.visit.partySize
        ) ||
        1
      );
  }

  return result;
}

function simulateVisits(
  runtime,
  count,
  options
) {
  const r =
    ensureRuntime(
      runtime
    );

  const total =
    Math.max(
      1,
      Math.min(
        500,
        Number(
          count
        ) ||
        1
      )
    );

  const rows = [];
  let success = 0;

  for (
    let i = 0;
    i < total;
    i++
  ) {
    const customer =
      resolveCustomer(
        r,
        null,
        options
      );

    const result =
      simulateVisit(
        r,
        customer,
        options
      );

    rows.push(
      result
    );

    if (result.ok) {
      success +=
        1;
    }
  }

  return {
    requested:total,
    success,
    failed:
      total -
      success,
    rows
  };
}

function closeDay(
  runtime,
  options
) {
  const r =
    ensureRuntime(
      runtime
    );

  if (!r) {
    return {
      ok:false,
      reason:'运行时不存在'
    };
  }

  const result =
    runtimeEngine
      .closeDay(
        r,
        options ||
        {}
      );

  r.simulation
    .todayOrders =
    0;

  r.simulation
    .todayCustomers =
    0;

  r.dailySnapshots.push({
    type:'operations_close',
    version:VERSION,
    ...clone(
      result
    )
  });

  if (
    r.dailySnapshots.length >
    90
  ) {
    r.dailySnapshots =
      r.dailySnapshots.slice(
        -90
      );
  }

  return {
    ok:true,
    result
  };
}

module.exports = {
  VERSION,
  ensureRuntime,
  snapshot,
  resolveCustomer,
  simulateVisit,
  simulateVisits,
  closeDay
};
