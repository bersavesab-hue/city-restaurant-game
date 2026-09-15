'use strict';

const gameState =
  require('../core/gameState.js');

const simulationSystem =
  require('../core/simulationSystem.js');

const runtimeEngine =
  require('./restaurantRuntimeV10.js');

const staffManagement =
  require('./staffManagementCoordinatorV0823.js');

const liveOperations =
  require('./liveOperationsCoordinatorV0824.js');

const completeFinanceSystem =
  require('../finance/completeFinanceSystemV0825.js');

const marketingPlatformMembership =
  require('./marketingPlatformMembershipV0826.js');

const reputationMediaSystem =
  require('../reputation/reputationMediaSystemV0827.js');

const commercialEcologySystem =
  require('../world/commercialEcologySystemV0828.js');

const environmentWorldCoordinator =
  require('../world/environmentWorldCoordinatorV0829.js');

const regulatoryFoodSafetySystem =
  require('../regulatory/regulatoryFoodSafetySystemV0830.js');

const socialInteractionSystem =
  require('../social/socialInteractionSystemV0831.js');

const globalRandomEngine =
  require('../core/globalRandomEngineV0832.js');

const growthAchievementSystem =
  require('../progress/growthAchievementSystemV0833.js');

const multiStoreBrandRanking =
  require('../brand/multiStoreBrandRankingV0834.js');

const economyBalanceGuard =
  require('../core/economyBalanceGuardV0839.js');

const gameplayFlowCoordinator =
  require('../core/gameplayFlowCoordinatorV0836.js');

const dailyOperatingCycle =
  require('./dailyOperatingCycleV0840.js');

const decisionFeedback =
  require('./decisionFeedbackV0841.js');

const playtestHealth =
  require('../diagnostics/playtestHealthV0842.js');

const operatingBalanceTuner =
  require('../balance/operatingBalanceTunerV0843.js');

const customerRandomDatabase =
  require('../customer/customerRandomDatabaseV0821.js');

const supplierEngine =
  require('../supplier/supplierEngineV10.js');

const procurementEngine =
  require('../supplier/procurementEngineV10.js');

const supplierProcurementDatabase =
  require('../supplier/supplierProcurementDatabaseV0820.js');

const inventoryEngine =
  require('../inventory/inventoryEngineV10.js');

const recipeEngine =
  require('../food/recipeEngineV10.js');

const foodPack =
  require('../food/foodPackV10.js');

const menuEngine =
  require('../food/menuEngineV10.js');

const foodResearchDatabase =
  require('../food/foodResearchDatabaseV0818.js');

const foodResearchSystem =
  require('../food/foodResearchSystemV0818.js');

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
          'paymentDueDay',
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
      version: '0.8.3',
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
    '0.8.3';

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
  return (
    foodResearchDatabase
      .STARTER_RECIPE_IDS
      .slice()
  );
}

function snapshotRuntime(runtime) {
  return {
    version: '0.8.3',
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

  runtime.customers =
    customerRandomDatabase
      .normalizeCustomerMap(
        runtime.customers
      );

  staffManagement
    .syncRuntimeStaff(
      runtime,
      shopId
    );

  liveOperations
    .ensureRuntime(
      runtime
    );

  normalizeLegacyCalendar(
    runtime
  );

  procurementEngine
    .updatePurchaseOrderStatuses(
      runtime.procurement,
      runtime.day
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

  if (runtime.simulation.oldestPayableDay === undefined) {
    runtime.simulation.oldestPayableDay = null;
  }

  if (runtime.simulation.payableAgeDays === undefined) {
    runtime.simulation.payableAgeDays = 0;
  }

  if (runtime.simulation.lastPayableServiceMinute === undefined) {
    runtime.simulation.lastPayableServiceMinute = null;
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

function decisionContextSnapshot(
  shopId,
  runtimeValue,
  dailyFinancial
) {
  const runtime =
    runtimeValue ||
    getRuntime(
      shopId
    );

  if (!runtime) {
    return {
      day:currentDay(),
      cash:
        Number(
          gameState
            .getPlayer()
            .cash
        ) || 0
    };
  }

  const live =
    liveOperations
      .snapshot(
        runtime,
        {
          staff:
            staffManagement
              .teamSnapshot(
                shopId,
                gameState
                  .getTime()
              )
        }
      );

  const finance =
    dailyFinancial ||
    settlementEngine
      .summary(
        runtime.ledger
      );

  const marketing =
    marketingPlatformMembership
      .overview(
        shopId,
        runtime
      );

  const balance =
    economyBalanceGuard
      .snapshot(
        shopId
      );

  return {
    day:
      Number(
        runtime.day
      ) || currentDay(),
    cash:
      Number(
        gameState
          .getPlayer()
          .cash
      ) || 0,
    revenue:
      Number(
        finance &&
        finance.revenue
      ) || 0,
    profit:
      Number(
        finance &&
        finance.profit
      ) || 0,
    orders:
      Number(
        finance &&
        finance.orders
      ) ||
      Number(
        live &&
        live.today &&
        live.today.orders
      ) || 0,
    customers:
      Number(
        finance &&
        finance.customers
      ) ||
      Number(
        live &&
        live.today &&
        live.today.customers
      ) || 0,
    rating:
      Number(
        runtime.shop &&
        runtime.shop.rating
      ) || 0,
    memberCount:
      Number(
        marketing &&
        marketing.memberCount
      ) || 0,
    inventoryAlerts:
      live &&
      live.inventory &&
      Array.isArray(
        live.inventory.alerts
      )
        ? live.inventory.alerts.length
        : 0,
    staffCount:
      live &&
      live.staff
        ? Number(
            live.staff.headcount
          ) || 0
        : 0,
    tensionScore:
      Number(
        balance &&
        balance.tensionScore
      ) || 0
  };
}

function recordTrackedDecision(
  shopId,
  type,
  payload,
  baseline
) {
  const runtime =
    getRuntime(
      shopId
    );

  const day =
    runtime
      ? Number(
          runtime.day
        ) || currentDay()
      : currentDay();

  const row =
    decisionFeedback
      .record(
        shopId,
        day,
        type,
        payload || {},
        baseline ||
        decisionContextSnapshot(
          shopId,
          runtime
        )
      );

  dailyOperatingCycle
    .recordDecisionRef(
      shopId,
      day,
      row.id,
      type
    );

  return row;
}

function playtestContextSnapshot(
  shopId,
  runtimeValue
) {
  const runtime =
    runtimeValue ||
    getRuntime(
      shopId
    );

  const live =
    runtime
      ? liveOperations
          .snapshot(
            runtime,
            {
              staff:
                staffManagement
                  .teamSnapshot(
                    shopId,
                    gameState
                      .getTime()
                  )
            }
          )
      : null;

  const balance =
    economyBalanceGuard
      .snapshot(
        shopId
      );

  const credit =
    completeFinanceSystem
      .openingCreditStatus(
        shopId
      );

  const regulatory =
    regulatoryFoodSafetySystem
      .overview(
        shopId
      );

  const shop =
    getShop(
      shopId
    );

  return {
    runtimeExists:
      !!runtime,
    activeMenuCount:
      live &&
      live.menu
        ? Number(
            live.menu.active
          ) || 0
        : 0,
    featuredMissing:
      !!(
        live &&
        live.menu &&
        !live.menu.featured
      ),
    staffCount:
      live &&
      live.staff
        ? Number(
            live.staff.headcount
          ) || 0
        : 0,
    inventoryAlerts:
      live &&
      live.inventory &&
      Array.isArray(
        live.inventory.alerts
      )
        ? live.inventory.alerts.length
        : 0,
    cash:
      Number(
        gameState
          .getPlayer()
          .cash
      ) || 0,
    creditAvailable:
      !!(
        credit &&
        credit.offer &&
        credit.offer.available !== false &&
        Number(
          credit.offer.creditLimit
        ) > 0
      ),
    tensionScore:
      Number(
        balance &&
        balance.tensionScore
      ) || 0,
    openViolations:
      regulatory &&
      Array.isArray(
        regulatory.openViolations
      )
        ? regulatory.openViolations.length
        : 0,
    flowDiagnosis:
      gameplayFlowCoordinator
        .diagnose(),
    dayCycleDiagnosis:
      dailyOperatingCycle
        .diagnose(
          shopId
        ),
    todayOrders:
      live &&
      live.today
        ? Number(
            live.today.orders
          ) || 0
        : 0,
    runtimeDay:
      runtime
        ? Number(
            runtime.day
          ) || 1
        : 1,
    shopOpen:
      !!(
        shop &&
        [
          'open',
          'formal_open',
          'trial_opening'
        ].includes(
          shop.status
        )
      )
  };
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
  const baseline =
    decisionContextSnapshot(
      shopId
    );

  const result =
    mutate(
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

  if (
    result &&
    result.ok
  ) {
    recordTrackedDecision(
      shopId,
      'menu_featured',
      {
        menuItemId,
        name:
          result.item &&
          result.item.name ||
          null
      },
      baseline
    );
  }

  return result;
}

function adjustMenuPrice(
  shopId,
  menuItemId,
  delta
) {
  const baseline =
    decisionContextSnapshot(
      shopId
    );

  const result =
    mutate(
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
            ok:false,
            reason:'菜品不存在'
          };
        }

        const previousPrice =
          Number(
            item.listPrice
          ) || 0;

        item.listPrice =
          Math.round(
            Math.max(
              3,
              Math.min(
                999,
                previousPrice +
                Number(
                  delta
                )
              )
            ) *
            10
          ) /
          10;

        return {
          ok:true,
          item,
          previousPrice
        };
      }
    );

  if (
    result &&
    result.ok
  ) {
    recordTrackedDecision(
      shopId,
      'menu_price',
      {
        menuItemId,
        delta:
          Number(delta) || 0,
        previousPrice:
          result.previousPrice,
        newPrice:
          result.item &&
          result.item.listPrice
      },
      baseline
    );
  }

  return result;
}

function addMenuRecipe(
  shopId,
  recipeId,
  options
) {
  if (
    !foodResearchSystem
      .isUnlocked(
        recipeId
      )
  ) {
    return {
      ok:false,
      reason:
        '该菜品尚未研发完成'
    };
  }

  const recipe =
    foodResearchDatabase
      .getRecipe(
        recipeId
      );

  if (!recipe) {
    return {
      ok:false,
      reason:
        '配方不存在'
    };
  }

  const opts =
    options ||
    {};

  return mutate(
    shopId,
    runtime => {
      const portionId =
        opts.portionId ||
        'single';

      const duplicate =
        runtime.menu
          .find(
            item =>
              item.recipeId ===
                recipeId &&
              (
                item.portionId ||
                'single'
              ) ===
                portionId
          );

      if (duplicate) {
        return {
          ok:false,
          reason:
            '该菜品份量已经在菜单中',
          item:
            duplicate
        };
      }

      const item =
        menuEngine
          .createMenuItem(
            recipeId,
            {
              portionId,
              listPrice:
                opts.listPrice,
              channel:
                opts.channel ||
                'all',
              active:
                opts.active !==
                false,
              featured:
                !!opts.featured
            }
          );

      runtime.menu.push(
        item
      );

      return {
        ok:true,
        item
      };
    }
  );
}

function removeMenuItem(
  shopId,
  menuItemId
) {
  return mutate(
    shopId,
    runtime => {
      const index =
        runtime.menu
          .findIndex(
            item =>
              item.id ===
              menuItemId
          );

      if (index < 0) {
        return {
          ok:false,
          reason:
            '菜单项不存在'
        };
      }

      if (
        runtime.menu.length <=
        1
      ) {
        return {
          ok:false,
          reason:
            '至少保留一道菜品'
        };
      }

      const removed =
        runtime.menu
          .splice(
            index,
            1
          )[0];

      return {
        ok:true,
        item:
          removed
      };
    }
  );
}

function getAvailableRecipes(
  shopId,
  filters
) {
  const runtime =
    getRuntime(
      shopId
    );

  if (!runtime) {
    return [];
  }

  const existing =
    new Set(
      runtime.menu
        .map(
          item =>
            item.recipeId
        )
    );

  return (
    foodResearchSystem
      .getCatalog(
        filters ||
        {}
      )
      .filter(
        item =>
          item.unlocked &&
          !existing.has(
            item.id
          )
      )
  );
}

function getFoodResearchCatalog(
  filters
) {
  return (
    foodResearchSystem
      .getCatalog(
        filters ||
        {}
      )
  );
}

function startRecipeResearch(
  recipeId
) {
  return (
    foodResearchSystem
      .startResearch(
        recipeId
      )
  );
}

function getFoodResearchOverview() {
  return (
    foodResearchSystem
      .getOverview()
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

function inventoryLotRows(
  shopId
) {
  const runtime =
    getRuntime(
      shopId
    );

  if (!runtime) {
    return [];
  }

  return (
    inventoryEngine
      .lotRows(
        runtime.inventory
      )
  );
}

function inventoryHealth(
  shopId
) {
  const runtime =
    getRuntime(
      shopId
    );

  if (!runtime) {
    return null;
  }

  return (
    inventoryEngine
      .inventoryHealth(
        runtime.inventory
      )
  );
}

function generateCustomer(
  shopId,
  options
) {
  return mutate(
    shopId,
    runtime => {
      const customer =
        runtimeEngine
          .customerProfile(
            runtime,
            options ||
            {}
          );

      return {
        ok:true,
        customer:
          customerRandomDatabase
            .resolvedProfile(
              customer
            )
      };
    }
  );
}

function customerRows(
  shopId,
  filters
) {
  const runtime =
    getRuntime(
      shopId
    );

  if (!runtime) {
    return [];
  }

  return (
    customerRandomDatabase
      .queryProfiles(
        runtime.customers,
        filters ||
        {}
      )
  );
}

function customerInsights(
  shopId
) {
  const runtime =
    getRuntime(
      shopId
    );

  if (!runtime) {
    return null;
  }

  return (
    customerRandomDatabase
      .aggregateProfiles(
        runtime.customers
      )
  );
}

function staffCandidateRows(
  shopId
) {
  return (
    staffManagement
      .candidatePool(
        shopId
      )
  );
}

function hireStaffCandidate(
  shopId,
  candidateId
) {
  const baseline =
    decisionContextSnapshot(
      shopId
    );

  const result =
    staffManagement
      .hireCandidate(
        shopId,
        candidateId
      );

  if (
    result &&
    result.ok
  ) {
    const runtime =
      getRuntime(
        shopId
      );

    staffManagement
      .syncRuntimeStaff(
        runtime,
        shopId
      );

    completeFinanceSystem
      .recordStaffExpense(
        shopId,
        'hiring',
        Number(
          result.signOnCost
        ) ||
        0,
        {
          day:
            currentDay(),
          referenceId:
            'hire:' +
            (
              result.staff &&
              result.staff.id ||
              candidateId
            ),
          note:'招聘入职成本'
        }
      );

    socialInteractionSystem
      .registerActor(
        shopId,
        result.staff &&
        (
          result.staff.personProfile ||
          result.staff
        ) ||
        {},
        {
          roleId:
            result.staff &&
            result.staff.roleId ||
            null,
          source:'staff',
          day:
            currentDay()
        }
      );

    persist(
      shopId
    );

    recordTrackedDecision(
      shopId,
      'staff_hire',
      {
        candidateId,
        staffId:
          result.staff &&
          result.staff.id ||
          null,
        signOnCost:
          Number(
            result.signOnCost
          ) || 0
      },
      baseline
    );
  }

  return result;
}

function dismissStaffMember(
  shopId,
  staffId
) {
  const ok =
    staffManagement
      .dismissStaff(
        shopId,
        staffId
      );

  if (ok) {
    const runtime =
      getRuntime(
        shopId
      );

    staffManagement
      .syncRuntimeStaff(
        runtime,
        shopId
      );

    persist(
      shopId
    );
  }

  return ok;
}

function staffManagementSnapshot(
  shopId
) {
  return (
    staffManagement
      .teamSnapshot(
        shopId,
        gameState
          .getTime()
      )
  );
}

function trainStaffMember(
  shopId,
  staffId
) {
  const result =
    staffManagement
      .startTraining(
        shopId,
        staffId
      );

  if (
    result &&
    result.ok
  ) {
    completeFinanceSystem
      .recordStaffExpense(
        shopId,
        'training',
        Number(
          result.cost
        ) ||
        0,
        {
          day:
            currentDay(),
          referenceId:
            [
              'training',
              staffId,
              currentDay()
            ].join(':'),
          note:'员工培训'
        }
      );
  }

  return result;
}

function raiseStaffMember(
  shopId,
  staffId
) {
  return (
    staffManagement
      .giveRaise(
        shopId,
        staffId
      )
  );
}

function promoteStaffMember(
  shopId,
  staffId
) {
  return (
    staffManagement
      .promote(
        shopId,
        staffId
      )
  );
}

function approveStaffLeave(
  shopId,
  staffId,
  days
) {
  return (
    staffManagement
      .approveLeave(
        shopId,
        staffId,
        days
      )
  );
}

function coachStaffMember(
  shopId,
  staffId
) {
  return (
    staffManagement
      .coach(
        shopId,
        staffId
      )
  );
}

function liveOperationsSnapshot(
  shopId
) {
  const runtime =
    getRuntime(
      shopId
    );

  if (!runtime) {
    return null;
  }

  return (
    liveOperations
      .snapshot(
        runtime,
        {
          staff:
            staffManagement
              .teamSnapshot(
                shopId,
                gameState
                  .getTime()
              )
        }
      )
  );
}

function simulateCustomerVisit(
  shopId,
  customerId,
  options
) {
  return mutate(
    shopId,
    runtime => {
      staffManagement
        .syncRuntimeStaff(
          runtime,
          shopId
        );

      const profile =
        customerId &&
        runtime.customers[
          customerId
        ]
          ? runtime
              .customers[
                customerId
              ]
          : liveOperations
              .resolveCustomer(
                runtime,
                null,
                options ||
                {}
              );

      dailyOperatingCycle
        .beginDay(
          shopId,
          runtime.day,
          decisionContextSnapshot(
            shopId,
            runtime
          )
        );

      const result =
        liveOperations
          .simulateVisit(
            runtime,
            profile,
            options ||
            {}
          );

      dailyOperatingCycle
        .recordVisit(
          shopId,
          runtime.day,
          result
        );

      if (
        result &&
        result.ok
      ) {
        completeFinanceSystem
          .recordOrderSettlement(
            shopId,
            result.settlement,
            {
              day:
                runtime.day,
              orderId:
                result.order &&
                result.order.id,
              referenceId:
                'order:' +
                (
                  result.order &&
                  result.order.id ||
                  runtime
                    .history
                    .length
                ),
              applyCash:true
            }
          );

        marketingPlatformMembership
          .recordMemberSpend(
            shopId,
            profile &&
            profile.id,
            Number(
              result.settlement &&
              result.settlement.revenue
            ) || 0,
            {
              day:runtime.day,
              visits:1
            }
          );

        reputationMediaSystem
          .recordVisitOutcome(
            shopId,
            runtime.shop,
            result,
            {
              day:runtime.day
            }
          );
      }

      return result;
    }
  );
}

function closeOperatingDay(
  shopId,
  options
) {
  return mutate(
    shopId,
    runtime => {
      dailyOperatingCycle
        .beginDay(
          shopId,
          runtime.day,
          decisionContextSnapshot(
            shopId,
            runtime
          )
        );

      const result =
        liveOperations
          .closeDay(
            runtime,
            options ||
            {}
          );

      if (
        result &&
        result.ok &&
        result.result &&
        result.result.financial
      ) {
        completeFinanceSystem
          .syncDailyStatement(
            shopId,
            result
              .result
              .financial,
            result
              .result
              .day
          );

        const closedDay=
          result
            .result
            .day;

        reputationMediaSystem
          .processDay(
            shopId,
            closedDay
          );

        commercialEcologySystem
          .processDay(
            closedDay,
            {
              shopId
            }
          );

        processEnvironmentDay(
          closedDay,
          shopId,
          {}
        );

        const shop =
          getShop(
            shopId
          );

        regulatoryFoodSafetySystem
          .processDay(
            shopId,
            closedDay,
            {
              districtId:
                shop &&
                shop.districtId
            }
          );

        const financeView =
          completeFinanceSystem
            .snapshot(
              shopId,
              runtime.ledger
            );

        const dailyStatements =
          financeView &&
          Array.isArray(
            financeView
              .dailyStatements
          )
            ? financeView
                .dailyStatements
            : [];

        const marketingView =
          marketingPlatformMembership
            .overview(
              shopId,
              runtime
            );

        const regulatoryView =
          regulatoryFoodSafetySystem
            .overview(
              shopId
            );

        const staffView =
          staffManagement
            .teamSnapshot(
              shopId,
              gameState
                .getTime()
            );

        const profitDays =
          dailyStatements
            .filter(
              item =>
                Number(
                  item.profit
                ) >
                0
            )
            .length;

        const bestDailyRevenue =
          dailyStatements
            .reduce(
              (
                best,
                item
              ) =>
                Math.max(
                  best,
                  Number(
                    item.revenue
                  ) ||
                  0
                ),
              0
            );

        const totalCustomers =
          dailyStatements
            .reduce(
              (
                total,
                item
              ) =>
                total +
                (
                  Number(
                    item.customers
                  ) ||
                  0
                ),
              0
            );

        const latestViolation =
          regulatoryView
            .latestInspections
            .find(
              item =>
                item.result !==
                'pass'
            );

        const noViolationStreak =
          latestViolation
            ? Math.max(
                0,
                closedDay -
                Number(
                  latestViolation.day
                )
              )
            : closedDay;

        const growthResult =
          growthAchievementSystem
            .evaluate(
              shopId,
              runtime,
              {
                daysPlayed:
                  closedDay,
                profitDays,
                bestDailyRevenue,
                dailyRevenue:
                  result
                    .result
                    .financial
                    .revenue,
                totalCustomers,
                reviewCount:
                  Number(
                    runtime
                      .shop
                      .reviewCount
                  ) ||
                  0,
                rating:
                  Number(
                    runtime
                      .shop
                      .rating
                  ) ||
                  4,
                memberCount:
                  marketingView
                    .memberCount,
                staffCount:
                  staffView
                    .headcount,
                campaignCount:
                  marketingView
                    .metrics
                    .campaignsStarted,
                supplierCount:
                  runtime
                    .supplierNetwork
                    .length,
                inspectionsPassed:
                  regulatoryView
                    .metrics
                    .passed,
                noViolationStreak
              }
            );

        multiStoreBrandRanking
          .registerShop(
            shopId,
            runtime,
            {
              day:
                closedDay
            }
          );

        growthAchievementSystem
          .rollHidden(
            shopId,
            {
              daysPlayed:
                closedDay,
              reviewCount:
                Number(
                  runtime
                    .shop
                    .reviewCount
                ) ||
                0,
              storeQuality:
                Math.round(
                  (
                    Number(
                      runtime
                        .shop
                        .rating
                    ) ||
                    4
                  ) *
                  20
                ),
              quality:
                Math.round(
                  (
                    Number(
                      runtime
                        .shop
                        .rating
                    ) ||
                    4
                  ) *
                  20
                ),
              storeCount:
                gameState
                  .getBusiness()
                  .shops
                  .length,
              minProfitDays:
                profitDays,
              profitDays,
              cashflowScore:
                growthResult
                  .achievementPoints
            }
          );
      }

      if (
        result &&
        result.ok &&
        result.result &&
        result.result.financial
      ) {
        const closedDay =
          Number(
            result.result.day
          ) ||
          Math.max(
            1,
            Number(
              runtime.day
            ) -
            1
          );

        const endSnapshot =
          decisionContextSnapshot(
            shopId,
            runtime,
            result.result.financial
          );

        const balanceV2 =
          operatingBalanceTuner
            .assessDay(
              result.result.financial,
              {
                tensionScore:
                  endSnapshot
                    .tensionScore
              }
            );

        const regulatoryView =
          regulatoryFoodSafetySystem
            .overview(
              shopId
            );

        const decisions =
          decisionFeedback
            .resolveDay(
              shopId,
              closedDay,
              endSnapshot
            );

        const daily =
          dailyOperatingCycle
            .finalizeDay(
              shopId,
              closedDay,
              result.result,
              endSnapshot,
              {
                balance:
                  balanceV2,
                decisionFeedback:
                  decisions,
                regulatory:{
                  openViolations:
                    regulatoryView &&
                    Array.isArray(
                      regulatoryView
                        .openViolations
                    )
                      ? regulatoryView
                          .openViolations
                          .length
                      : 0
                }
              }
            );

        const health =
          playtestHealth
            .record(
              shopId,
              playtestContextSnapshot(
                shopId,
                runtime
              )
            );

        result.dailyBrief =
          daily &&
          daily.brief ||
          null;

        result.decisionFeedback =
          decisions;

        result.balanceDiagnosis =
          balanceV2;

        result.playtestHealth =
          health;
      }

      return result;
    }
  );
}

function financeSnapshot(
  shopId
) {
  const runtime =
    getRuntime(
      shopId
    );

  return (
    completeFinanceSystem
      .snapshot(
        shopId,
        runtime &&
        runtime.ledger
      )
  );
}

function financeTransactions(
  shopId,
  filters
) {
  return (
    completeFinanceSystem
      .getTransactions(
        shopId,
        filters ||
        {}
      )
  );
}

function recordFinanceExpense(
  shopId,
  category,
  amount,
  options
) {
  return (
    completeFinanceSystem
      .recordExternalExpense(
        shopId,
        category,
        amount,
        {
          ...(options || {}),
          applyCash:
            options &&
            options.applyCash ===
              false
              ? false
              : true
        }
      )
  );
}

function openingCreditStatus(
  shopId
) {
  return (
    completeFinanceSystem
      .openingCreditStatus(
        shopId
      )
  );
}

function marketingCatalog() {
  return marketingPlatformMembership
    .campaignCatalog();
}

function marketingPlatformCatalog() {
  return marketingPlatformMembership
    .platformCatalog();
}

function configureMarketingPlatform(
  shopId,
  platformId,
  options
) {
  return marketingPlatformMembership
    .configurePlatform(
      shopId,
      platformId,
      options || {}
    );
}

function startMarketingCampaign(
  shopId,
  typeId,
  budget,
  days,
  options
) {
  const baseline =
    decisionContextSnapshot(
      shopId
    );

  const result =
    mutate(
      shopId,
      runtime =>
        marketingPlatformMembership
          .startCampaign(
            shopId,
            runtime,
            typeId,
            budget,
            days,
            {
              ...(options || {}),
              day:
                options &&
                options.day != null
                  ? options.day
                  : runtime.day
            }
          )
    );

  if (
    result &&
    result.ok
  ) {
    recordTrackedDecision(
      shopId,
      'marketing',
      {
        typeId,
        budget:
          Number(budget) || 0,
        days:
          Number(days) || 0
      },
      baseline
    );
  }

  return result;
}

function enrollMember(
  shopId,
  customerId,
  options
) {
  return marketingPlatformMembership
    .enrollMember(
      shopId,
      customerId,
      options || {}
    );
}

function recordMemberSpend(
  shopId,
  customerId,
  amount,
  options
) {
  return marketingPlatformMembership
    .recordMemberSpend(
      shopId,
      customerId,
      amount,
      options || {}
    );
}

function redeemMemberPoints(
  shopId,
  customerId,
  points
) {
  return marketingPlatformMembership
    .redeemPoints(
      shopId,
      customerId,
      points
    );
}

function marketingMembershipSnapshot(
  shopId
) {
  return marketingPlatformMembership
    .overview(
      shopId,
      getRuntime(shopId)
    );
}

function reputationSnapshot(
  shopId
) {
  return reputationMediaSystem
    .overview(
      shopId,
      getShop(shopId)
    );
}

function recordManualReview(
  shopId,
  experience,
  options
) {
  return reputationMediaSystem
    .recordReview(
      shopId,
      getShop(shopId),
      experience || {},
      {
        ...(options || {}),
        applyShopRating:
          options &&
          options.applyShopRating === false
            ? false
            : true
      }
    );
}

function createReputationRumor(
  shopId,
  options
) {
  return reputationMediaSystem
    .createRumor(
      shopId,
      options || {}
    );
}

function resolveReputationRumor(
  shopId,
  rumorId,
  options
) {
  return reputationMediaSystem
    .resolveRumor(
      shopId,
      rumorId,
      options || {}
    );
}

function publishReputationMedia(
  shopId,
  options
) {
  return reputationMediaSystem
    .publishMediaPost(
      shopId,
      options || {}
    );
}

function commercialEcologySnapshot(
  shopId,
  options
) {
  return commercialEcologySystem
    .snapshot(
      shopId,
      options || {}
    );
}

function processCommercialEcologyDay(
  day,
  options
) {
  return commercialEcologySystem
    .processDay(
      day,
      options || {}
    );
}

function environmentSnapshot(
  shopId,
  options
) {
  const shop=getShop(shopId);
  return environmentWorldCoordinator
    .snapshot({
      shopId,
      districtId:
        options &&
        options.districtId ||
        shop &&
        shop.districtId ||
        null,
      ...(options || {})
    });
}

function processEnvironmentDay(
  day,
  shopId,
  options
) {
  const shop=getShop(shopId);
  return environmentWorldCoordinator
    .processDay(
      day,
      {
        shopId,
        districtId:
          options &&
          options.districtId ||
          shop &&
          shop.districtId ||
          null,
        ...(options || {})
      }
    );
}

function regulatorySnapshot(
  shopId
) {
  return (
    regulatoryFoodSafetySystem
      .overview(
        shopId
      )
  );
}

function runRegulatoryInspection(
  shopId,
  options
) {
  const opts =
    options || {};

  const shop =
    getShop(
      shopId
    );

  return (
    regulatoryFoodSafetySystem
      .runInspection(
        shopId,
        opts.day == null
          ? currentDay()
          : Number(
              opts.day
            ),
        {
          ...opts,
          districtId:
            opts.districtId ||
            shop &&
            shop.districtId ||
            null
        }
      )
  );
}

function remediateRegulatoryInspection(
  shopId,
  inspectionId,
  options
) {
  return (
    regulatoryFoodSafetySystem
      .remediate(
        shopId,
        inspectionId,
        {
          ...(options || {}),
          day:
            options &&
            options.day != null
              ? Number(
                  options.day
                )
              : currentDay()
        }
      )
  );
}

function processRegulatoryDay(
  shopId,
  day,
  options
) {
  const shop =
    getShop(
      shopId
    );

  return (
    regulatoryFoodSafetySystem
      .processDay(
        shopId,
        day == null
          ? currentDay()
          : Number(day),
        {
          ...(options || {}),
          districtId:
            options &&
            options.districtId ||
            shop &&
            shop.districtId ||
            null
        }
      )
  );
}

function registerSocialActor(
  shopId,
  actor,
  options
) {
  return (
    socialInteractionSystem
      .registerActor(
        shopId,
        actor,
        options || {}
      )
  );
}

function socialInteract(
  shopId,
  actorId,
  otherId,
  effect,
  options
) {
  return (
    socialInteractionSystem
      .interact(
        shopId,
        actorId,
        otherId,
        effect || {},
        options || {}
      )
  );
}

function generateSocialDialogue(
  shopId,
  actorId,
  otherId,
  options
) {
  return (
    socialInteractionSystem
      .generateDialogue(
        shopId,
        actorId,
        otherId,
        options || {}
      )
  );
}

function generateSocialBarrage(
  shopId,
  options
) {
  return (
    socialInteractionSystem
      .generateBarrage(
        shopId,
        options || {}
      )
  );
}

function socialNetwork(
  shopId,
  actorId
) {
  return (
    socialInteractionSystem
      .network(
        shopId,
        actorId
      )
  );
}

function socialSnapshot(
  shopId
) {
  return (
    socialInteractionSystem
      .overview(
        shopId
      )
  );
}

function randomSnapshot() {
  return (
    globalRandomEngine
      .snapshot()
  );
}

function randomInt(
  namespace,
  scope,
  min,
  max
) {
  return (
    globalRandomEngine
      .int(
        namespace,
        scope,
        min,
        max
      )
  );
}

function randomChance(
  namespace,
  scope,
  probability
) {
  return (
    globalRandomEngine
      .chance(
        namespace,
        scope,
        probability
      )
  );
}

function resetRandomStream(
  namespace,
  scope
) {
  return (
    globalRandomEngine
      .resetStream(
        namespace,
        scope
      )
  );
}

function growthSnapshot(
  shopId
) {
  return (
    growthAchievementSystem
      .overview(
        shopId,
        getRuntime(
          shopId
        )
      )
  );
}

function evaluateGrowth(
  shopId,
  context
) {
  return (
    growthAchievementSystem
      .evaluate(
        shopId,
        getRuntime(
          shopId
        ),
        context || {}
      )
  );
}

function addHiddenClue(
  hiddenId,
  clue
) {
  return (
    growthAchievementSystem
      .addClue(
        hiddenId,
        clue
      )
  );
}

function discoverHiddenContent(
  shopId,
  hiddenId
) {
  return (
    growthAchievementSystem
      .discoverHidden(
        shopId,
        hiddenId
      )
  );
}

function rollHiddenEncounter(
  shopId,
  context
) {
  return (
    growthAchievementSystem
      .rollHidden(
        shopId,
        context || {}
      )
  );
}

function rollEasterEggEvent(
  shopId,
  context
) {
  return (
    growthAchievementSystem
      .rollEasterEvent(
        shopId,
        context || {}
      )
  );
}

function brandPortfolioSnapshot() {
  const business =
    gameState.getBusiness();

  for (
    const shop
    of business.shops ||
    []
  ) {
    const runtime =
      getRuntime(
        shop.id
      );

    if (runtime) {
      multiStoreBrandRanking
        .registerShop(
          shop.id,
          runtime,
          {
            day:
              currentDay()
          }
        );
    }
  }

  return (
    multiStoreBrandRanking
      .portfolioSnapshot()
  );
}

function brandExpansionCatalog(
  cityId
) {
  return (
    multiStoreBrandRanking
      .expansionCatalog(
        cityId
      )
  );
}

function createBrandExpansionPlan(
  districtId,
  options
) {
  return (
    multiStoreBrandRanking
      .createExpansionPlan(
        districtId,
        {
          ...(options || {}),
          day:
            options &&
            options.day != null
              ? Number(
                  options.day
                )
              : currentDay()
        }
      )
  );
}

function commitBrandExpansionPlan(
  planId,
  options
) {
  return (
    multiStoreBrandRanking
      .commitExpansionPlan(
        planId,
        {
          ...(options || {}),
          day:
            options &&
            options.day != null
              ? Number(
                  options.day
                )
              : currentDay()
        }
      )
  );
}

function attachBrandExpansionShop(
  planId,
  shopId,
  options
) {
  return (
    multiStoreBrandRanking
      .attachExpansionShop(
        planId,
        shopId,
        getRuntime(
          shopId
        ),
        {
          ...(options || {}),
          day:
            options &&
            options.day != null
              ? Number(
                  options.day
                )
              : currentDay()
        }
      )
  );
}

function brandRankingSnapshot(
  options
) {
  brandPortfolioSnapshot();

  return (
    multiStoreBrandRanking
      .buildRanking({
        ...(options || {}),
        day:
          options &&
          options.day != null
            ? Number(
                options.day
              )
            : currentDay()
      })
  );
}

function storeRankingSnapshot() {
  brandPortfolioSnapshot();

  return (
    multiStoreBrandRanking
      .storeRanking()
  );
}

function economyBalanceSnapshot(
  shopId
) {
  return (
    economyBalanceGuard
      .snapshot(
        shopId
      )
  );
}

function assessPlannedSpend(
  shopId,
  amount,
  category
) {
  return (
    economyBalanceGuard
      .assessSpend(
        shopId,
        amount,
        category
      )
  );
}

function economyRecoveryOptions(
  shopId
) {
  return (
    economyBalanceGuard
      .recoveryOptions(
        shopId
      )
  );
}

function startOperatingDay(
  shopId
) {
  const runtime =
    getRuntime(
      shopId
    );

  if (!runtime) {
    return {
      ok:false,
      reason:'门店运行时不存在'
    };
  }

  return (
    dailyOperatingCycle
      .beginDay(
        shopId,
        runtime.day,
        decisionContextSnapshot(
          shopId,
          runtime
        )
      )
  );
}

function operatingDaySnapshot(
  shopId
) {
  return (
    dailyOperatingCycle
      .brief(
        shopId
      )
  );
}

function operatingDayHistory(
  shopId,
  limit
) {
  return (
    dailyOperatingCycle
      .history(
        shopId,
        limit
      )
  );
}

function closeOperatingDaySafe(
  shopId,
  options
) {
  const runtime =
    getRuntime(
      shopId
    );

  if (!runtime) {
    return {
      ok:false,
      reason:'门店运行时不存在'
    };
  }

  const live =
    liveOperations
      .snapshot(
        runtime,
        {
          staff:
            staffManagement
              .teamSnapshot(
                shopId,
                gameState
                  .getTime()
              )
        }
      );

  const check =
    dailyOperatingCycle
      .safeCloseCheck(
        shopId,
        runtime.day,
        {
          orders:
            live &&
            live.today &&
            live.today.orders,
          customers:
            live &&
            live.today &&
            live.today.customers
        }
      );

  if (!check.allowed) {
    return {
      ok:false,
      reason:
        check.message,
      code:
        check.code
    };
  }

  return closeOperatingDay(
    shopId,
    options ||
    {}
  );
}

function recordPlayerDecision(
  shopId,
  type,
  payload
) {
  return recordTrackedDecision(
    shopId,
    type,
    payload || {},
    decisionContextSnapshot(
      shopId
    )
  );
}

function decisionFeedbackSnapshot(
  shopId
) {
  return (
    decisionFeedback
      .overview(
        shopId
      )
  );
}

function playtestHealthSnapshot(
  shopId
) {
  const runtime =
    getRuntime(
      shopId
    );

  return (
    playtestHealth
      .record(
        shopId,
        playtestContextSnapshot(
          shopId,
          runtime
        )
      )
  );
}

function operatingBalanceSnapshot(
  shopId
) {
  const runtime =
    getRuntime(
      shopId
    );

  if (!runtime) {
    return null;
  }

  const financial =
    settlementEngine
      .summary(
        runtime.ledger
      );

  const balance =
    economyBalanceGuard
      .snapshot(
        shopId
      );

  return (
    operatingBalanceTuner
      .assessDay(
        financial,
        {
          tensionScore:
            balance
              .tensionScore
        }
      )
  );
}

function runOperatingBalanceCalibration(
  count,
  options
) {
  return (
    operatingBalanceTuner
      .calibrate(
        count,
        options || {}
      )
  );
}

function supplierCatalog(
  shopId,
  filters
) {
  const runtime =
    getRuntime(
      shopId
    );

  if (!runtime) {
    return [];
  }

  return (
    supplierEngine
      .getSupplierCatalog(
        runtime.supplierNetwork,
        filters ||
        {}
      )
  );
}

function compareSupplierQuotes(
  shopId,
  ingredientId,
  qtyKg,
  options
) {
  const runtime =
    getRuntime(
      shopId
    );

  if (!runtime) {
    return [];
  }

  const shop =
    getShop(
      shopId
    );

  const modifiers =
    dynamicWorldSystem
      .getModifiers({
        shopId,
        districtId:
          shop &&
          shop.districtId
      });

  return (
    supplierEngine
      .compareQuotes(
        runtime.supplierNetwork,
        ingredientId,
        qtyKg,
        {
          day:
            runtime.day,
          marketIndex:
            Number(
              modifiers
                .supplyCostMultiplier
            ) || 1,
          ...(
            options ||
            {}
          )
        }
      )
  );
}

function negotiateSupplierQuote(
  shopId,
  supplierId,
  ingredientId,
  qtyKg,
  options
) {
  const runtime =
    getRuntime(
      shopId
    );

  if (!runtime) {
    return {
      ok:false,
      reason:'门店不存在'
    };
  }

  const supplier =
    runtime
      .supplierNetwork
      .find(
        item =>
          item.id ===
          supplierId
      );

  if (!supplier) {
    return {
      ok:false,
      reason:'供应商不存在'
    };
  }

  const requestedKg =
    Math.max(
      0.1,
      Number(
        qtyKg
      ) || 0
    );

  const orderKg =
    Math.max(
      requestedKg,
      supplierProcurementDatabase
        .minimumOrderKg(
          supplier
        )
    );

  return (
    supplierEngine
      .negotiateQuote(
        supplier,
        ingredientId,
        orderKg,
        {
          day:
            runtime.day,
          ...(
            options ||
            {}
          )
        }
      )
  );
}

function createManualPurchaseOrder(
  shopId,
  supplierId,
  ingredientId,
  qtyKg,
  options
) {
  const opts =
    options ||
    {};

  return mutate(
    shopId,
    runtime => {
      const supplier =
        runtime
          .supplierNetwork
          .find(
            item =>
              item.id ===
              supplierId
          );

      if (!supplier) {
        return {
          ok:false,
          reason:'供应商不存在'
        };
      }

      const requestedKg =
        Math.max(
          0.1,
          Number(
            qtyKg
          ) || 0
        );

      const orderKg =
        opts.adjustToMoq ===
          false
          ? requestedKg
          : Math.max(
              requestedKg,
              supplierProcurementDatabase
                .minimumOrderKg(
                  supplier
                )
            );

      const quote =
        opts.negotiate
          ? supplierEngine
              .negotiateQuote(
                supplier,
                ingredientId,
                orderKg,
                {
                  day:
                    runtime.day,
                  buyerPower:
                    opts.buyerPower,
                  rounds:
                    opts.rounds
                }
              )
          : supplierEngine
              .quote(
                supplier,
                ingredientId,
                orderKg,
                {
                  day:
                    runtime.day
                }
              );

      if (
        !quote ||
        !quote.ok
      ) {
        return quote || {
          ok:false,
          reason:'无法获得报价'
        };
      }

      quote.requestedKg =
        requestedKg;

      quote.moqAdjusted =
        orderKg >
        requestedKg +
          0.0001;

      return (
        procurementEngine
          .createPurchaseOrder(
            runtime.procurement,
            quote,
            {
              day:
                runtime.day,
              network:
                runtime.supplierNetwork,
              source:'manual'
            }
          )
      );
    }
  );
}

function receiveManualPurchaseOrder(
  shopId,
  poId,
  options
) {
  const opts =
    options ||
    {};

  return mutate(
    shopId,
    runtime => {
      procurementEngine
        .updatePurchaseOrderStatuses(
          runtime.procurement,
          runtime.day
        );

      const po =
        procurementEngine
          .getPurchaseOrder(
            runtime.procurement,
            poId
          );

      if (!po) {
        return {
          ok:false,
          reason:'采购单不存在'
        };
      }

      if (
        runtime.day <
          Number(
            po.expectedDay
          ) &&
        opts.allowEarly !==
          true
      ) {
        return {
          ok:false,
          reason:'货物尚未到达',
          expectedDay:
            po.expectedDay,
          currentDay:
            runtime.day
        };
      }

      const cash =
        Number(
          gameState
            .getPlayer()
            .cash
        ) || 0;

      if (
        cash <
        Number(
          po.total
        )
      ) {
        return {
          ok:false,
          reason:'资金不足',
          need:
            Number(
              po.total
            ) || 0,
          cash
        };
      }

      const received =
        procurementEngine
          .receivePurchaseOrder(
            runtime.procurement,
            poId,
            runtime.inventory,
            {
              day:
                runtime.day,
              network:
                runtime.supplierNetwork,
              enforceArrival:true,
              allowEarly:
                opts.allowEarly ===
                true
            }
          );

      if (!received.ok) {
        return received;
      }

      if (
        !gameState
          .spendCash(
            Number(
              po.total
            ) || 0
          )
      ) {
        return {
          ok:false,
          reason:'付款失败'
        };
      }

      po.paymentStatus =
        'paid';

      po.paidDay =
        runtime.day;

      completeFinanceSystem
        .recordProcurement(
          shopId,
          po,
          {
            day:
              runtime.day,
            referenceId:
              'po:' +
              po.id
          }
        );

      return {
        ok:true,
        po,
        lot:
          received.lot
      };
    }
  );
}

function cancelManualPurchaseOrder(
  shopId,
  poId,
  reason
) {
  return mutate(
    shopId,
    runtime =>
      procurementEngine
        .cancelPurchaseOrder(
          runtime.procurement,
          poId,
          {
            day:
              runtime.day,
            reason:
              reason ||
              'manual'
          }
        )
  );
}

function procurementOverview(
  shopId
) {
  const runtime =
    getRuntime(
      shopId
    );

  if (!runtime) {
    return null;
  }

  return (
    procurementEngine
      .procurementOverview(
        runtime.procurement,
        runtime.supplierNetwork,
        runtime.day
      )
  );
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
                  runtime.day,
                network:
                  runtime.supplierNetwork,
                source:
                  'auto_restock'
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
                  runtime.day,
                network:
                  runtime.supplierNetwork,
                instant:true
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

        completeFinanceSystem
          .recordProcurement(
            shopId,
            created.po,
            {
              day:
                runtime.day,
              referenceId:
                'po:' +
                created.po.id
            }
          );

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
  addMenuRecipe,
  removeMenuItem,
  getAvailableRecipes,
  getFoodResearchCatalog,
  startRecipeResearch,
  getFoodResearchOverview,
  inventoryRows,
  inventoryLotRows,
  inventoryHealth,
  staffCandidateRows,
  hireStaffCandidate,
  dismissStaffMember,
  staffManagementSnapshot,
  trainStaffMember,
  raiseStaffMember,
  promoteStaffMember,
  approveStaffLeave,
  coachStaffMember,
  liveOperationsSnapshot,
  simulateCustomerVisit,
  closeOperatingDay,
  financeSnapshot,
  financeTransactions,
  recordFinanceExpense,
  openingCreditStatus,
  marketingCatalog,
  marketingPlatformCatalog,
  configureMarketingPlatform,
  startMarketingCampaign,
  enrollMember,
  recordMemberSpend,
  redeemMemberPoints,
  marketingMembershipSnapshot,
  reputationSnapshot,
  recordManualReview,
  createReputationRumor,
  resolveReputationRumor,
  publishReputationMedia,
  commercialEcologySnapshot,
  processCommercialEcologyDay,
  environmentSnapshot,
  processEnvironmentDay,
  regulatorySnapshot,
  runRegulatoryInspection,
  remediateRegulatoryInspection,
  processRegulatoryDay,
  registerSocialActor,
  socialInteract,
  generateSocialDialogue,
  generateSocialBarrage,
  socialNetwork,
  socialSnapshot,
  randomSnapshot,
  randomInt,
  randomChance,
  resetRandomStream,
  growthSnapshot,
  evaluateGrowth,
  addHiddenClue,
  discoverHiddenContent,
  rollHiddenEncounter,
  rollEasterEggEvent,
  brandPortfolioSnapshot,
  brandExpansionCatalog,
  createBrandExpansionPlan,
  commitBrandExpansionPlan,
  attachBrandExpansionShop,
  brandRankingSnapshot,
  storeRankingSnapshot,
  economyBalanceSnapshot,
  assessPlannedSpend,
  economyRecoveryOptions,
  startOperatingDay,
  operatingDaySnapshot,
  operatingDayHistory,
  closeOperatingDaySafe,
  recordPlayerDecision,
  decisionFeedbackSnapshot,
  playtestHealthSnapshot,
  operatingBalanceSnapshot,
  runOperatingBalanceCalibration,
  generateCustomer,
  customerRows,
  customerInsights,
  supplierCatalog,
  compareSupplierQuotes,
  negotiateSupplierQuote,
  createManualPurchaseOrder,
  receiveManualPurchaseOrder,
  cancelManualPurchaseOrder,
  procurementOverview,
  autoRestock,
  dashboard
};
