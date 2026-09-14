'use strict';

const gameState =
  require('../core/gameState.js');

const simulationSystem =
  require('../core/simulationSystem.js');

const runtimeEngine =
  require('./restaurantRuntimeV10.js');

const supplierEngine =
  require('../supplier/supplierEngineV10.js');

const procurementEngine =
  require('../supplier/procurementEngineV10.js');

const inventoryEngine =
  require('../inventory/inventoryEngineV10.js');

const recipeEngine =
  require('../food/recipeEngineV10.js');

const foodPack =
  require('../food/foodPackV10.js');

const settlementEngine =
  require('./settlementEngineV10.js');

const dynamicWorldSystem =
  require('../world/dynamicWorldSystemV0815.js');

const { SeededRng } =
  require('../foundation/rng.js');

const liveRuntimes =
  new Map();

function clone(value) {
  return JSON.parse(
    JSON.stringify(value)
  );
}

function currentDay() {
  return simulationSystem
    .getDayOrdinal(
      gameState.getTime()
    );
}

function normalizeLegacyCalendar(
  runtime
) {
  const expected =
    currentDay();

  const oldDay =
    Number(
      runtime.day
    ) ||
    expected;

  if (
    Math.abs(
      oldDay -
      expected
    ) <=
    90
  ) {
    return;
  }

  const delta =
    expected -
    oldDay;

  runtime.day =
    expected;

  if (
    runtime.inventory
  ) {
    runtime
      .inventory
      .day =
      (
        Number(
          runtime
            .inventory
            .day
        ) ||
        oldDay
      ) +
      delta;

    for (
      const lot
      of runtime
          .inventory
          .lots ||
        []
    ) {
      lot.receivedDay =
        (
          Number(
            lot.receivedDay
          ) ||
          oldDay
        ) +
        delta;

      lot.expiryDay =
        (
          Number(
            lot.expiryDay
          ) ||
          oldDay
        ) +
        delta;
    }
  }

  if (
    runtime.procurement &&
    Array.isArray(
      runtime
        .procurement
        .purchaseOrders
    )
  ) {
    for (
      const po
      of runtime
          .procurement
          .purchaseOrders
    ) {
      for (
        const key
        of [
          'orderedDay',
          'expectedDay',
          'receivedDay'
        ]
      ) {
        if (
          po[key] !=
          null
        ) {
          po[key] =
            Number(
              po[key]
            ) +
            delta;
        }
      }
    }
  }
}
function getRoot() {
  const business =
    gameState.getBusiness();

  if (
    !business.restaurantOperations ||
    typeof business.restaurantOperations !==
      'object'
  ) {
    business.restaurantOperations = {
      version: '0.8.1',
      sharedSupplierNetwork: null,
      shops: {}
    };
  }

  const root =
    business.restaurantOperations;

  if (!root.shops) {
    root.shops = {};
  }

  if (
    !Array.isArray(
      root.sharedSupplierNetwork
    )
  ) {
    root.sharedSupplierNetwork =
      supplierEngine
        .createSupplierNetwork(
          'city-supplier-network-v080'
        );
  }

  root.version =
    '0.8.1';

  return root;
}

function getShop(shopId) {
  const business =
    gameState.getBusiness();

  return (
    (
      business.shops ||
      []
    ).find(
      shop =>
        shop.id ===
        shopId
    ) ||
    null
  );
}

function getCurrentShop() {
  const business =
    gameState.getBusiness();

  const shops =
    Array.isArray(
      business.shops
    )
      ? business.shops
      : [];

  if (!shops.length) {
    return null;
  }

  return (
    shops.find(
      item =>
        item.id ===
        business.currentShopId
    ) ||
    shops[0]
  );
}

function defaultRecipeIds() {
  return foodPack
    .RECIPES
    .slice(
      0,
      12
    )
    .map(
      item =>
        item.id
    );
}

function snapshotRuntime(runtime) {
  return {
    version: '0.8.0',
    day:
      Number(
        runtime.day
      ) || 1,

    rngState:
      runtime.rng &&
      Number(
        runtime.rng.state
      ) ||
      null,

    shop:
      clone(
        runtime.shop
      ),

    procurement:
      clone(
        runtime.procurement
      ),

    inventory:
      clone(
        runtime.inventory
      ),

    menu:
      clone(
        runtime.menu
      ),

    kitchen:
      clone(
        runtime.kitchen
      ),

    diningRoom:
      clone(
        runtime.diningRoom
      ),

    staff:
      clone(
        runtime.staff
      ),

    ledger:
      clone(
        runtime.ledger
      ),

    brand:
      clone(
        runtime.brand
      ),

    campaigns:
      clone(
        runtime.campaigns
      ),

    customers:
      clone(
        runtime.customers
      ),

    history:
      clone(
        runtime.history
      ),

    simulation:
      clone(
        runtime.simulation ||
        {
          arrivalCarry: 0,
          lastRestockMinute: null,
          unpaidOperatingPayables: 0,
          todayOrders: 0,
          todayCustomers: 0
        }
      ),

    dailySnapshots:
      clone(
        runtime.dailySnapshots ||
        []
      ),

    floor:
      clone(
        runtime.floor ||
        null
      )
  };
}

function buildRuntime(
  shopId,
  stored
) {
  const shop =
    getShop(
      shopId
    );

  const brandName =
    gameState
      .getPlayer()
      .brandName ||
    '我的餐饮品牌';

  const runtime =
    runtimeEngine
      .createRuntime({
        seed:
          'shop:' +
          shopId,

        shopId,

        day:
          stored &&
          stored.day ||
          currentDay(),

        brandName,

        recipeIds:
          stored &&
          Array.isArray(
            stored.menu
          ) &&
          stored.menu.length
            ? stored.menu.map(
                item =>
                  item.recipeId
              )
            : defaultRecipeIds()
      });

  runtime.supplierNetwork =
    getRoot()
      .sharedSupplierNetwork;

  if (stored) {
    for (
      const key
      of [
        'day',
        'shop',
        'procurement',
        'inventory',
        'menu',
        'kitchen',
        'diningRoom',
        'staff',
        'ledger',
        'brand',
        'campaigns',
        'customers',
        'history',
        'simulation',
        'dailySnapshots',
        'floor'
      ]
    ) {
      if (
        stored[key] !==
        undefined
      ) {
        runtime[key] =
          clone(
            stored[key]
          );
      }
    }

    const rng =
      new SeededRng(
        'shop:' +
        shopId
      );

    if (
      Number.isFinite(
        Number(
          stored.rngState
        )
      )
    ) {
      rng.state =
        Number(
          stored.rngState
        ) >>>
        0;
    }

    runtime.rng =
      rng;
  }

  normalizeLegacyCalendar(
    runtime
  );

  if (
    !runtime.simulation
  ) {
    runtime.simulation = {
      arrivalCarry: 0,
      lastRestockMinute: null,
      unpaidOperatingPayables: 0,
      todayOrders: 0,
      todayCustomers: 0
    };
  }

  if (
    !Array.isArray(
      runtime.dailySnapshots
    )
  ) {
    runtime.dailySnapshots = [];
  }

  runtime.shop.id =
    shopId;

  if (
    shop &&
    shop.name
  ) {
    runtime.shop.name =
      shop.name;
  }

  return runtime;
}

function ensureShopState(
  shopId
) {
  const root =
    getRoot();

  if (
    !root.shops[
      shopId
    ]
  ) {
    const runtime =
      buildRuntime(
        shopId,
        null
      );

    root.shops[
      shopId
    ] =
      snapshotRuntime(
        runtime
      );
  }

  return root
    .shops[
      shopId
    ];
}

function getRuntime(
  shopId
) {
  if (!shopId) {
    return null;
  }

  if (
    liveRuntimes.has(
      shopId
    )
  ) {
    return liveRuntimes
      .get(
        shopId
      );
  }

  const stored =
    ensureShopState(
      shopId
    );

  const runtime =
    buildRuntime(
      shopId,
      stored
    );

  liveRuntimes.set(
    shopId,
    runtime
  );

  return runtime;
}

function persist(
  shopId
) {
  const runtime =
    liveRuntimes.get(
      shopId
    );

  if (!runtime) {
    return false;
  }

  const root =
    getRoot();

  root.sharedSupplierNetwork =
    clone(
      runtime
        .supplierNetwork
    );

  root.shops[
    shopId
  ] =
    snapshotRuntime(
      runtime
    );

  return true;
}

function mutate(
  shopId,
  callback
) {
  const runtime =
    getRuntime(
      shopId
    );

  if (!runtime) {
    return {
      ok: false,
      reason:
        '门店不存在'
    };
  }

  const result =
    callback(
      runtime
    );

  persist(
    shopId
  );

  return result;
}

function resetCache() {
  liveRuntimes
    .clear();
}

function activeMenu(
  runtime
) {
  return (
    runtime.menu ||
    []
  ).filter(
    item =>
      item.active !==
      false
  );
}

function menuTargets(
  runtime,
  servings
) {
  const target = {};

  const amount =
    Math.max(
      1,
      Number(
        servings
      ) || 10
    );

  for (
    const item
    of activeMenu(
      runtime
    )
  ) {
    const rows =
      recipeEngine
        .scaleRecipe(
          item.recipeId,
          amount,
          item.portionId
        );

    for (
      const row
      of rows
    ) {
      target[
        row.ingredientId
      ] =
        (
          target[
            row.ingredientId
          ] ||
          0
        ) +
        row.grams;
    }
  }

  return target;
}

function supplierFallbackCost(
  runtime,
  ingredientId,
  grams
) {
  const quote =
    procurementEngine
      .bestQuote(
        runtime
          .supplierNetwork,
        ingredientId,
        Math.max(
          0.1,
          grams /
            1000
        ),
        {
          day:
            runtime.day
        }
      );

  if (!quote) {
    return 0;
  }

  return (
    quote.unitPrice *
    grams /
    1000
  );
}

function inventoryUnitCost(
  runtime,
  ingredientId
) {
  const lots =
    (
      runtime
        .inventory
        .lots ||
      []
    ).filter(
      lot =>
        lot.ingredientId ===
          ingredientId &&
        Number(
          lot.grams
        ) >
          0
    );

  if (!lots.length) {
    return null;
  }

  let grams = 0;
  let value = 0;

  for (
    const lot
    of lots
  ) {
    const g =
      Number(
        lot.grams
      ) ||
      0;

    grams +=
      g;

    value +=
      g /
      1000 *
      (
        Number(
          lot.unitCostPerKg
        ) ||
        0
      );
  }

  return grams >
    0
    ? value /
      (
        grams /
        1000
      )
    : null;
}

function estimateMenuItemCost(
  shopId,
  menuItem
) {
  const runtime =
    getRuntime(
      shopId
    );

  if (
    !runtime ||
    !menuItem
  ) {
    return 0;
  }

  const rows =
    recipeEngine
      .scaleRecipe(
        menuItem.recipeId,
        1,
        menuItem.portionId
      );

  let cost =
    0;

  for (
    const row
    of rows
  ) {
    const unit =
      inventoryUnitCost(
        runtime,
        row.ingredientId
      );

    if (
      unit != null
    ) {
      cost +=
        unit *
        row.grams /
        1000;
    } else {
      cost +=
        supplierFallbackCost(
          runtime,
          row.ingredientId,
          row.grams
        );
    }
  }

  return (
    Math.round(
      (
        cost +
        0.35
      ) *
      100
    ) /
    100
  );
}

function menuItemAvailability(
  shopId,
  menuItem
) {
  const runtime =
    getRuntime(
      shopId
    );

  if (
    !runtime ||
    !menuItem
  ) {
    return 0;
  }

  const stock =
    inventoryEngine
      .stockSummary(
        runtime.inventory
      )
      .byIngredient;

  return recipeEngine
    .maxCraftable(
      menuItem.recipeId,
      stock,
      menuItem.portionId
    );
}

function setMenuActive(
  shopId,
  menuItemId,
  active
) {
  return mutate(
    shopId,
    runtime => {
      const item =
        runtime.menu.find(
          row =>
            row.id ===
            menuItemId
        );

      if (!item) {
        return {
          ok: false,
          reason:
            '菜品不存在'
        };
      }

      item.active =
        !!active;

      return {
        ok: true,
        item
      };
    }
  );
}

function setMenuFeatured(
  shopId,
  menuItemId
) {
  return mutate(
    shopId,
    runtime => {
      let selected =
        null;

      for (
        const item
        of runtime.menu
      ) {
        item.featured =
          item.id ===
          menuItemId;

        if (
          item.featured
        ) {
          selected =
            item;
        }
      }

      return {
        ok:
          !!selected,
        item:
          selected
      };
    }
  );
}

function adjustMenuPrice(
  shopId,
  menuItemId,
  delta
) {
  return mutate(
    shopId,
    runtime => {
      const item =
        runtime.menu.find(
          row =>
            row.id ===
            menuItemId
        );

      if (!item) {
        return {
          ok: false,
          reason:
            '菜品不存在'
        };
      }

      item.listPrice =
        Math.round(
          Math.max(
            3,
            Math.min(
              999,
              (
                Number(
                  item.listPrice
                ) ||
                0
              ) +
              Number(
                delta
              )
            )
          ) *
          10
        ) /
        10;

      return {
        ok: true,
        item
      };
    }
  );
}

function inventoryRows(
  shopId
) {
  const runtime =
    getRuntime(
      shopId
    );

  if (!runtime) {
    return [];
  }

  const targets =
    menuTargets(
      runtime,
      10
    );

  const stock =
    inventoryEngine
      .stockSummary(
        runtime.inventory
      )
      .byIngredient;

  const rows =
    Object.keys(
      targets
    ).map(
      ingredientId => {
        const ingredient =
          foodPack
            .INGREDIENTS
            .find(
              row =>
                row.id ===
                ingredientId
            );

        const have =
          Number(
            stock[
              ingredientId
            ]
          ) ||
          0;

        const target =
          Number(
            targets[
              ingredientId
            ]
          ) ||
          0;

        return {
          ingredientId,
          name:
            ingredient
              ? ingredient.name
              : ingredientId,
          haveGrams:
            have,
          targetGrams:
            target,
          ratio:
            target >
            0
              ? have /
                target
              : 1,
          status:
            have <
            target *
              0.15
              ? 'critical'
              : have <
                  target *
                    0.45
                ? 'low'
                : 'ok'
        };
      }
    );

  rows.sort(
    (
      a,
      b
    ) => {
      const rank = {
        critical: 0,
        low: 1,
        ok: 2
      };

      return (
        rank[
          a.status
        ] -
        rank[
          b.status
        ] ||
        a.ratio -
        b.ratio
      );
    }
  );

  return rows;
}

function autoRestock(
  shopId
) {
  const operationsShop =
    getShop(
      shopId
    );

  return mutate(
    shopId,
    runtime => {
      const targets =
        menuTargets(
          runtime,
          10
        );

      const suggestions =
        inventoryEngine
          .reorderSuggestions(
            runtime.inventory,
            targets
          );

      if (
        !suggestions.length
      ) {
        return {
          ok: true,
          orders: 0,
          spent: 0,
          message:
            '当前库存充足'
        };
      }

      let spent =
        0;

      let count =
        0;

      let skipped =
        0;

      for (
        const suggestion
        of suggestions
      ) {
        const requestedKg =
          Math.max(
            0.1,
            suggestion
              .reorderGrams /
              1000
          );

        const worldModifiers =
          dynamicWorldSystem
            .getModifiers(
              {
                shopId,
                districtId:
                  operationsShop &&
                  operationsShop.districtId
              }
            );

        const quote =
          procurementEngine
            .bestQuote(
              runtime
                .supplierNetwork,
              suggestion
                .ingredientId,
              requestedKg,
              {
                day:
                  runtime.day,
                marketIndex:
                  Number(
                    worldModifiers
                      .supplyCostMultiplier
                  ) || 1
              }
            );

        if (!quote) {
          skipped +=
            1;
          continue;
        }

        const cash =
          Number(
            gameState
              .getPlayer()
              .cash
          ) ||
          0;

        if (
          cash <
          quote.total
        ) {
          skipped +=
            1;
          continue;
        }

        const created =
          procurementEngine
            .createPurchaseOrder(
              runtime
                .procurement,
              quote,
              {
                day:
                  runtime.day
              }
            );

        if (
          !created.ok
        ) {
          skipped +=
            1;
          continue;
        }

        const received =
          procurementEngine
            .receivePurchaseOrder(
              runtime
                .procurement,
              created
                .po
                .id,
              runtime
                .inventory,
              {
                day:
                  runtime.day
              }
            );

        if (
          !received.ok
        ) {
          created.po.status =
            'cancelled';

          skipped +=
            1;
          continue;
        }

        if (
          !gameState
            .spendCash(
              quote.total
            )
        ) {
          created.po.status =
            'payment_failed';

          skipped +=
            1;
          continue;
        }

        spent +=
          quote.total;

        count +=
          1;
      }

      return {
        ok:
          count >
            0 ||
          suggestions.length ===
            0,

        orders:
          count,

        skipped,

        spent:
          Math.round(
            spent *
            100
          ) /
          100,

        message:
          count >
          0
            ? (
                '完成' +
                count +
                '笔补货'
              )
            : '资金不足或暂无可执行报价'
      };
    }
  );
}

function dashboard(
  shopId
) {
  const runtime =
    getRuntime(
      shopId
    );

  if (!runtime) {
    return null;
  }

  const finance =
    settlementEngine
      .summary(
        runtime.ledger
      );

  const stock =
    inventoryEngine
      .stockSummary(
        runtime.inventory
      );

  const menu =
    runtime.menu ||
    [];

  const active =
    menu.filter(
      item =>
        item.active !==
        false
    );

  const featured =
    active.find(
      item =>
        item.featured
    ) ||
    null;

  const purchaseOrders =
    runtime
      .procurement
      .purchaseOrders ||
    [];

  return {
    finance,
    stock,
    menuCount:
      menu.length,
    activeMenuCount:
      active.length,
    featured:
      featured
        ? featured.name
        : '未设置',
    shopRating:
      Number(
        runtime
          .shop
          .rating
      ) ||
      4,
    reviewCount:
      Number(
        runtime
          .shop
          .reviewCount
      ) ||
      0,
    purchaseOrderCount:
      purchaseOrders
        .length,
    supplierCount:
      runtime
        .supplierNetwork
        .length,
    history:
      (
        runtime.history ||
        []
      ).slice(
        -8
      ),

    simulation:
      clone(
        runtime.simulation ||
        {}
      ),

    lastDailySnapshot:
      runtime.dailySnapshots &&
      runtime.dailySnapshots.length
        ? clone(
            runtime.dailySnapshots[
              runtime.dailySnapshots.length - 1
            ]
          )
        : null
  };
}

module.exports = {
  getRoot,
  getShop,
  getCurrentShop,
  ensureShopState,
  getRuntime,
  persist,
  resetCache,
  menuTargets,
  estimateMenuItemCost,
  menuItemAvailability,
  setMenuActive,
  setMenuFeatured,
  adjustMenuPrice,
  inventoryRows,
  autoRestock,
  dashboard
};
