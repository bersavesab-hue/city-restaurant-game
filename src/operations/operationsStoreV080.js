'use strict';

const gameState =
  require('../core/gameState.js');

const simulationSystem =
  require('../core/simulationSystem.js');

const timeScheduleCoordinator =
  require('../core/timeScheduleCoordinatorV0812.js');

const simulationConfig =
  require('../core/simulationConfig.js');

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

const customDishSystem =
  require('../food/customDishSystemV120.js');

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
  return timeScheduleCoordinator
    .businessDayOrdinal(
      gameState.getTime(),
      simulationConfig
        .time
        .businessDayCutoffHour
    );
}

function normalizeLegacyCalendar(
  runtime
) {
  const expected = currentDay();
  const oldDay = Number(runtime.day) || expected;
  if (oldDay === expected) return;
  // 正常落后1~90天交给自动跨日逐日结算；领先则属于旧版手动日结漂移。
  if (oldDay < expected && expected - oldDay <= 90) return;
  const delta = expected - oldDay;
  runtime.day = expected;
  if (runtime.inventory) {
    runtime.inventory.day = (Number(runtime.inventory.day) || oldDay) + delta;
    for (const lot of runtime.inventory.lots || []) {
      lot.receivedDay = (Number(lot.receivedDay) || oldDay) + delta;
      lot.expiryDay = (Number(lot.expiryDay) || oldDay) + delta;
    }
  }
  if (runtime.procurement && Array.isArray(runtime.procurement.purchaseOrders)) {
    for (const po of runtime.procurement.purchaseOrders) {
      for (const key of ['orderedDay','expectedDay','paymentDueDay','receivedDay']) {
        if (po[key] != null) po[key] = Number(po[key]) + delta;
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
        .scaleMenuItem(
          item,
          amount
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
      .scaleMenuItem(
        menuItem,
        1
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

  const methodFactor =
    menuItem.customDish
      ? Math.max(
          0.82,
          Math.min(
            1.35,
            Number(
              menuItem.customDish
                .costFactor
            ) || 1
          )
        )
      : 1;

  return (
    Math.round(
      (
        cost *
        methodFactor +
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
    .maxCraftableMenuItem(
      menuItem,
      stock
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


function getCustomDishLabOverview(
  shopId
) {
  return customDishSystem
    .getOverview(
      shopId
    );
}

function refreshCustomDishCandidates(
  shopId
) {
  return customDishSystem
    .refreshCandidates(
      shopId
    );
}

function startCustomDishResearch(
  shopId,
  candidateId
) {
  return customDishSystem
    .startResearch(
      shopId,
      candidateId
    );
}

function improveCustomDish(
  shopId,
  dishId,
  focus
) {
  return customDishSystem
    .improveDish(
      shopId,
      dishId,
      focus
    );
}

function addCustomDishToMenu(
  shopId,
  dishId,
  options
) {
  const dish =
    customDishSystem
      .getDish(
        shopId,
        dishId
      );

  if (!dish) {
    return {
      ok:false,
      reason:'自研菜品不存在'
    };
  }

  const opts =
    options ||
    {};

  return mutate(
    shopId,
    runtime => {
      const duplicate =
        runtime.menu
          .find(
            item =>
              item.customDish &&
              item.customDish.id ===
                dishId
          );

      if (duplicate) {
        return {
          ok:false,
          reason:'该自研菜品已经在菜单中',
          item:duplicate
        };
      }

      const item =
        menuEngine
          .createMenuItem(
            dish.baseRecipeId,
            {
              name:dish.name,
              portionId:
                opts.portionId ||
                'single',
              listPrice:
                opts.listPrice == null
                  ? dish.recommendedPrice
                  : opts.listPrice,
              channel:
                opts.channel ||
                'all',
              active:
                opts.active !== false,
              featured:
                !!opts.featured,
              customDish:
                dish
            }
          );

      item.id =
        'menu_' +
        dish.id;

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

function normalizeClosedResult(closeResult) {
  if (closeResult && closeResult.result && closeResult.result.financial) {
    return {ok:closeResult.ok!==false,envelope:closeResult,closed:closeResult.result};
  }
  if (closeResult && closeResult.financial) {
    return {ok:true,envelope:{ok:true,result:closeResult},closed:closeResult};
  }
  return {ok:false,envelope:closeResult||{ok:false,reason:'缺少日结结果'},closed:null};
}

function profitStreakFromStatements(rows) {
  const ordered=(Array.isArray(rows)?rows:[]).slice().sort((a,b)=>Number(b.day)-Number(a.day));
  let streak=0;
  for (const row of ordered) {
    if (Number(row.profit)>0) streak+=1;
    else break;
  }
  return streak;
}

function buildOperatingSignals(
  shopId,
  runtime,
  closed
) {
  const floor =
    closed &&
    closed.floor &&
    typeof closed.floor ===
      'object'
      ? closed.floor
      : {};

  const repeatGuests =
    Math.max(
      0,
      Number(
        floor.repeatGuestsToday
      ) ||
      0
    );

  const newGuests =
    Math.max(
      0,
      Number(
        floor.newGuestsToday
      ) ||
      0
    );

  const knownGuests =
    repeatGuests +
    newGuests;

  const dishOrders =
    floor.dishOrdersToday &&
    typeof floor.dishOrdersToday ===
      'object'
      ? floor.dishOrdersToday
      : {};

  let topDishId =
    null;

  let topDishQty =
    0;

  for (
    const [
      id,
      qty
    ]
    of Object.entries(
      dishOrders
    )
  ) {
    if (
      Number(qty) >
      topDishQty
    ) {
      topDishId =
        id;

      topDishQty =
        Number(qty) ||
        0;
    }
  }

  const topDish =
    topDishId &&
    runtime &&
    Array.isArray(
      runtime.menu
    )
      ? runtime.menu.find(
          item =>
            item.id ===
            topDishId
        )
      : null;

  const dishRevenue =
    floor.dishRevenueToday &&
    typeof floor.dishRevenueToday ===
      'object'
      ? floor.dishRevenueToday
      : {};

  const dishPerformance =
    runtime &&
    Array.isArray(
      runtime.menu
    )
      ? runtime.menu
          .filter(
            item =>
              item &&
              item.active !==
                false
          )
          .map(
            item => {
              const qty =
                Math.max(
                  0,
                  Number(
                    dishOrders[
                      item.id
                    ]
                  ) ||
                  0
                );

              const revenue =
                Math.max(
                  0,
                  Number(
                    dishRevenue[
                      item.id
                    ]
                  ) ||
                  0
                );

              const unitCost =
                Math.max(
                  0,
                  Number(
                    estimateMenuItemCost(
                      shopId,
                      item
                    )
                  ) ||
                  0
                );

              const grossProfit =
                Math.max(
                  0,
                  revenue -
                  unitCost *
                  qty
                );

              const grossMargin =
                revenue >
                  0
                  ? grossProfit /
                    revenue
                  : 0;

              const rawRating =
                Number(
                  item.customDish &&
                  item.customDish
                    .score
                ) ||
                Number(
                  item.rating
                ) ||
                0;

              const ratingScore =
                rawRating >
                  0 &&
                rawRating <=
                  5.2
                  ? rawRating *
                    20
                  : rawRating;

              return {
                id:
                  item.id,
                name:
                  item.name ||
                  item.id,
                qty,
                revenue:
                  Math.round(
                    revenue *
                    100
                  ) /
                  100,
                unitCost:
                  Math.round(
                    unitCost *
                    100
                  ) /
                  100,
                grossProfit:
                  Math.round(
                    grossProfit *
                    100
                  ) /
                  100,
                grossMargin:
                  Math.round(
                    grossMargin *
                    10000
                  ) /
                  10000,
                ratingScore:
                  Math.round(
                    Math.max(
                      0,
                      Math.min(
                        100,
                        ratingScore
                      )
                    ) *
                    10
                  ) /
                  10,
                custom:
                  !!item.customDish
              };
            }
          )
          .sort(
            (
              a,
              b
            ) =>
              b.qty -
              a.qty
          )
          .slice(
            0,
            12
          )
      : [];

  return {
    repeatGuests,
    newGuests,
    repeatRate:
      knownGuests >
        0
        ? Math.round(
            repeatGuests /
            knownGuests *
            1000
          ) /
          1000
        : Number(
            floor.repeatRate
          ) ||
          0,
    avgRepeatIntent:
      Number(
        floor.avgRepeatIntent
      ) ||
      0,
    repeatLikelyVisits:
      Math.max(
        0,
        Number(
          floor.repeatLikelyVisitsToday
        ) ||
        0
      ),
    churnRiskVisits:
      Math.max(
        0,
        Number(
          floor.churnRiskVisitsToday
        ) ||
        0
      ),
    priceWalkaways:
      Math.max(
        0,
        Number(
          floor.priceWalkawaysToday
        ) ||
        0
      ),
    stockouts:
      Math.max(
        0,
        Number(
          floor.stockoutsToday
        ) ||
        0
      ),
    queueWalkaways:
      Math.max(
        0,
        Number(
          floor.walkawaysToday
        ) ||
        0
      ),
    mistakes:
      Math.max(
        0,
        Number(
          floor.mistakesToday
        ) ||
        0
      ),
    avgWaitMinutes:
      Number(
        floor.avgWaitMinutes
      ) ||
      0,
    expiredWasteValue:
      Math.max(
        0,
        Number(
          closed &&
          closed.inventoryLoss &&
          closed.inventoryLoss
            .expiredValue
        ) ||
        0
      ),
    expiredWasteGrams:
      Math.max(
        0,
        Number(
          closed &&
          closed.inventoryLoss &&
          closed.inventoryLoss
            .expiredGrams
        ) ||
        0
      ),
    topDish:
      topDish
        ? {
            id:
              topDish.id,
            name:
              topDish.name,
            qty:
              topDishQty,
            revenue:
              Number(
                floor.dishRevenueToday &&
                floor.dishRevenueToday[
                  topDish.id
                ]
              ) ||
              0
          }
        : null,
    dishPerformance
  };
}

function finalizeClosedOperatingDay(shopId,runtime,closeResult,options) {
  const normalized=normalizeClosedResult(closeResult);
  if (!normalized.ok || !normalized.closed) return normalized.envelope;
  const envelope=normalized.envelope;
  const closed=normalized.closed;
  const closedDay=Number(closed.day)||Math.max(1,Number(runtime&&runtime.day)-1);

  runtime.simulation=runtime.simulation||{};

  const existingCycle=dailyOperatingCycle.history(shopId,120).find(
    item=>item&&item.status==='closed'&&Number(item.day)===closedDay&&item.financial
  );

  // 旧版可能已人工结算过同一天；自动跨日再次遇到时禁止二次跑口碑/监管/成长。
  if (existingCycle) {
    runtime.simulation.lastUnifiedClosedDay=Math.max(Number(runtime.simulation.lastUnifiedClosedDay)||0,closedDay);
    return {...envelope,ok:true,existing:true,dailyBrief:existingCycle};
  }

  dailyOperatingCycle.beginDay(shopId,closedDay,decisionContextSnapshot(shopId,runtime,closed.financial));
  completeFinanceSystem.syncDailyStatement(shopId,closed.financial,closedDay);
  reputationMediaSystem.processDay(shopId,closedDay);
  commercialEcologySystem.processDay(closedDay,{shopId});
  processEnvironmentDay(closedDay,shopId,{});

  const shop=getShop(shopId);
  regulatoryFoodSafetySystem.processDay(shopId,closedDay,{districtId:shop&&shop.districtId});

  const financeView=completeFinanceSystem.snapshot(shopId,runtime&&runtime.ledger);
  const dailyStatements=financeView&&Array.isArray(financeView.dailyStatements)?financeView.dailyStatements:[];
  const marketingView=marketingPlatformMembership.overview(shopId,runtime);
  const regulatoryView=regulatoryFoodSafetySystem.overview(shopId);
  const staffView=staffManagement.teamSnapshot(shopId,gameState.getTime());

  const profitDays=dailyStatements.filter(item=>Number(item.profit)>0).length;
  const profitStreak=profitStreakFromStatements(dailyStatements);
  const bestDailyRevenue=dailyStatements.reduce((best,item)=>Math.max(best,Number(item.revenue)||0),0);
  const totalCustomers=dailyStatements.reduce((total,item)=>total+(Number(item.customers)||0),0);
  const latestViolation=regulatoryView&&Array.isArray(regulatoryView.latestInspections)
    ? regulatoryView.latestInspections.find(item=>item.result!=='pass')
    : null;
  const noViolationStreak=latestViolation?Math.max(0,closedDay-Number(latestViolation.day)):closedDay;

  const growthResult=growthAchievementSystem.evaluate(shopId,runtime,{
    daysPlayed:closedDay,
    profitDays,
    profitStreak,
    bestDailyRevenue,
    dailyRevenue:closed.financial.revenue,
    totalCustomers,
    reviewCount:Number(runtime&&runtime.shop&&runtime.shop.reviewCount)||0,
    rating:Number(runtime&&runtime.shop&&runtime.shop.rating)||4,
    memberCount:marketingView&&marketingView.memberCount||0,
    staffCount:staffView&&staffView.headcount||0,
    campaignCount:marketingView&&marketingView.metrics&&marketingView.metrics.campaignsStarted||0,
    supplierCount:runtime&&Array.isArray(runtime.supplierNetwork)?runtime.supplierNetwork.length:0,
    inspectionsPassed:regulatoryView&&regulatoryView.metrics?regulatoryView.metrics.passed||0:0,
    noViolationStreak
  });

  multiStoreBrandRanking.registerShop(shopId,runtime,{day:closedDay});
  growthAchievementSystem.rollHidden(shopId,{
    daysPlayed:closedDay,
    reviewCount:Number(runtime&&runtime.shop&&runtime.shop.reviewCount)||0,
    storeQuality:Math.round((Number(runtime&&runtime.shop&&runtime.shop.rating)||4)*20),
    quality:Math.round((Number(runtime&&runtime.shop&&runtime.shop.rating)||4)*20),
    storeCount:gameState.getBusiness().shops.length,
    minProfitDays:profitDays,
    profitDays,
    cashflowScore:growthResult.achievementPoints
  });

  const operatingSignals=
    buildOperatingSignals(
      shopId,
      runtime,
      closed
    );

  const endSnapshot=decisionContextSnapshot(shopId,runtime,closed.financial);
  const balanceV2=operatingBalanceTuner.assessDay(closed.financial,{tensionScore:endSnapshot.tensionScore});
  const decisions=decisionFeedback.resolveDay(shopId,closedDay,endSnapshot);
  const daily=dailyOperatingCycle.finalizeDay(shopId,closedDay,closed,endSnapshot,{
    balance:balanceV2,
    decisionFeedback:decisions,
    source:options&&options.source||'unified',
    operatingSignals,
    staff:{
      headcount:
        Number(
          staffView &&
          staffView.headcount
        ) ||
        0,
      monthlyPayroll:
        Number(
          staffView &&
          staffView.monthlyPayroll
        ) ||
        0,
      roleCounts:
        staffView &&
        staffView.roleCounts ||
        {},
      coverageFactor:
        Number(
          staffView &&
          staffView.coverage &&
          staffView.coverage.factor
        ) ||
        0,
      peopleSummary:
        staffView &&
        staffView.peopleSummary ||
        {}
    },
    regulatory:{openViolations:regulatoryView&&Array.isArray(regulatoryView.openViolations)?regulatoryView.openViolations.length:0}
  });
  const health=playtestHealth.record(shopId,playtestContextSnapshot(shopId,runtime));

  runtime.simulation.lastUnifiedClosedDay=closedDay;
  return {...envelope,ok:true,dailyBrief:daily&&daily.brief||null,decisionFeedback:decisions,balanceDiagnosis:balanceV2,playtestHealth:health,growthResult};
}

function finalizeExternalOperatingDay(shopId,runtime,closeResult,options) {
  return finalizeClosedOperatingDay(shopId,runtime,closeResult,options||{source:'automatic'});
}

function closeOperatingDay(shopId,options) {
  return mutate(shopId,runtime=>{
    dailyOperatingCycle.beginDay(shopId,runtime.day,decisionContextSnapshot(shopId,runtime));
    const raw=liveOperations.closeDay(runtime,options||{});
    if (!raw || raw.ok===false) return raw;
    return finalizeClosedOperatingDay(shopId,runtime,raw,{source:'legacy_manual'});
  });
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

function playtestHealthOverview(
  shopId
) {
  return (
    playtestHealth
      .overview(
        shopId
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

function strategyMenuRows(
  shopId,
  runtime
) {
  return (
    runtime.menu ||
    []
  )
    .filter(
      item =>
        item &&
        item.active !==
          false
    )
    .map(
      item => {
        const stats =
          item.stats ||
          {};

        const orders =
          Math.max(
            0,
            Number(
              stats.orders
            ) ||
            0
          );

        const revenue =
          Number(
            stats.revenue
          ) ||
          0;

        const variableCost =
          Number(
            stats.variableCost
          ) ||
          0;

        const estimatedCost =
          Math.max(
            0,
            estimateMenuItemCost(
              shopId,
              item
            )
          );

        const contribution =
          orders >
            0
            ? (
                revenue -
                variableCost
              ) /
              orders
            : (
                Number(
                  item.listPrice
                ) ||
                0
              ) -
              estimatedCost;

        const ratingCount =
          Math.max(
            0,
            Number(
              stats.ratingCount
            ) ||
            0
          );

        const rating =
          ratingCount >
            0
            ? (
                Number(
                  stats.ratingSum
                ) ||
                0
              ) /
              ratingCount
            : 0;

        return {
          item,
          orders,
          revenue,
          variableCost,
          estimatedCost,
          contribution,
          rating
        };
      }
    );
}

function operatingStrategyRecommendation(
  shopId
) {
  const runtime =
    getRuntime(
      shopId
    );

  if (!runtime) {
    return {
      id:'runtime_missing',
      executable:false,
      label:'门店运行数据不存在',
      detail:'等待门店运行时初始化'
    };
  }

  runtime.simulation =
    runtime.simulation ||
    {};

  if (
    Number(
      runtime
        .simulation
        .lastStrategyDay
    ) ===
      Number(
        runtime.day
      )
  ) {
    return {
      id:'strategy_wait',
      executable:false,
      label:'今日策略已执行，等待日结评估',
      detail:
        runtime
          .simulation
          .lastStrategyLabel ||
        '等待下一营业日重新诊断'
    };
  }

  const cycle =
    dailyOperatingCycle
      .brief(
        shopId
      );

  const latest =
    cycle &&
    cycle.latestClosed;

  const signals =
    latest &&
    latest.extra &&
    latest.extra
      .operatingSignals &&
    typeof latest.extra
      .operatingSignals ===
      'object'
      ? latest.extra
          .operatingSignals
      : {};

  const rows =
    strategyMenuRows(
      shopId,
      runtime
    );

  if (!rows.length) {
    return {
      id:'menu_missing',
      executable:false,
      label:'当前没有可经营菜品',
      detail:'先恢复至少一道在售菜品'
    };
  }

  const bestSeller =
    rows
      .slice()
      .sort(
        (a,b) =>
          b.orders -
            a.orders ||
          b.rating -
            a.rating ||
          b.contribution -
            a.contribution
      )[0];

  const featured =
    rows.find(
      row =>
        row.item.featured
    ) ||
    null;

  const lowestSeller =
    rows
      .filter(
        row =>
          !bestSeller ||
          row.item.id !==
            bestSeller.item.id
      )
      .slice()
      .sort(
        (a,b) =>
          a.orders -
            b.orders ||
          a.contribution -
            b.contribution
      )[0] ||
    null;

  const financial =
    latest &&
    latest.financial ||
    {};

  const waste =
    Math.max(
      0,
      Number(
        signals.expiredWasteValue
      ) ||
      0
    );

  const wasteHigh =
    waste >
    Math.max(
      30,
      (
        Number(
          financial.revenue
        ) ||
        0
      ) *
      0.02
    );

  if (
    wasteHigh &&
    rows.length >
      1 &&
    lowestSeller
  ) {
    return {
      id:'reduce_waste',
      action:'deactivate_low_seller',
      executable:true,
      menuItemId:
        lowestSeller
          .item.id,
      label:
        '暂时下架低销菜「' +
        lowestSeller
          .item.name +
        '」',
      detail:
        '上次过期损耗' +
        Math.round(
          waste
        ) +
        '元，先收窄菜单减少备货分散',
      successMessage:
        '已暂时下架低销菜，下一营业日观察损耗变化'
    };
  }

  if (
    Number(
      signals.stockouts
    ) >
      0 &&
    !wasteHigh
  ) {
    return {
      id:'repair_stockout',
      action:'restock',
      executable:true,
      label:'按当前菜单补齐缺货食材',
      detail:
        '上次有' +
        Number(
          signals.stockouts
        ) +
        '次缺货流失',
      successMessage:
        '已执行库存补充，下一营业日观察缺货与利润'
    };
  }

  if (
    Number(
      signals.priceWalkaways
    ) >
    0
  ) {
    const priceCandidate =
      rows
        .slice()
        .sort(
          (a,b) => {
            const aRatio =
              (
                Number(
                  a.item.listPrice
                ) ||
                0
              ) /
              Math.max(
                1,
                a.estimatedCost
              );

            const bRatio =
              (
                Number(
                  b.item.listPrice
                ) ||
                0
              ) /
              Math.max(
                1,
                b.estimatedCost
              );

            return (
              bRatio -
                aRatio ||
              b.item.listPrice -
                a.item.listPrice ||
              a.orders -
                b.orders
            );
          }
        )
        .find(
          row => {
            const price =
              Number(
                row.item.listPrice
              ) ||
              0;

            const floor =
              Math.max(
                3,
                row.estimatedCost *
                  1.6
              );

            return (
              price -
              Math.max(
                floor,
                price *
                  0.92
              )
            ) >=
              0.5;
          }
        );

    if (priceCandidate) {
      const price =
        Number(
          priceCandidate
            .item
            .listPrice
        ) ||
        0;

      const floor =
        Math.max(
          3,
          priceCandidate
            .estimatedCost *
            1.6
        );

      const target =
        Math.max(
          floor,
          price *
            0.92
        );

      const delta =
        Math.round(
          (
            target -
            price
          ) *
          10
        ) /
        10;

      return {
        id:'repair_price',
        action:'price_cut',
        executable:true,
        menuItemId:
          priceCandidate
            .item.id,
        delta,
        label:
          '小幅下调「' +
          priceCandidate
            .item.name +
          '」售价',
        detail:
          '上次有' +
          Number(
            signals.priceWalkaways
          ) +
          '位顾客因价格超预算离开',
        successMessage:
          '已小幅调价，下一营业日观察客流、客单和利润'
      };
    }
  }

  const repeatWeak =
    (
      Number(
        signals.repeatGuests
      ) +
      Number(
        signals.newGuests
      )
    ) >=
      8 &&
    Number(
      signals.avgRepeatIntent
    ) >
      0 &&
    Number(
      signals.avgRepeatIntent
    ) <
      0.38;

  if (
    bestSeller &&
    (
      repeatWeak ||
      !featured ||
      featured.item.id !==
        bestSeller.item.id
    )
  ) {
    return {
      id:
        repeatWeak
          ? 'repair_repeat'
          : 'feature_best_seller',
      action:'feature_dish',
      executable:true,
      menuItemId:
        bestSeller
          .item.id,
      label:
        '设「' +
        bestSeller
          .item.name +
        '」为招牌菜',
      detail:
        repeatWeak
          ? '复购意向偏弱，先集中稳定最受欢迎菜品'
          : '把真实热销菜强化为门店记忆点',
      successMessage:
        '招牌菜已调整，下一营业日观察点单与复购变化'
    };
  }

  return {
    id:'observe',
    executable:false,
    label:'当前经营结构稳定，继续观察1个营业日',
    detail:'暂时不建议为了操作而操作'
  };
}

function applyOperatingStrategy(
  shopId
) {
  const recommendation =
    operatingStrategyRecommendation(
      shopId
    );

  if (
    !recommendation ||
    !recommendation.executable
  ) {
    return {
      ok:false,
      reason:
        recommendation &&
        recommendation.label ||
        '当前没有可执行策略',
      recommendation
    };
  }

  const baseline =
    decisionContextSnapshot(
      shopId
    );

  let result =
    null;

  if (
    recommendation.action ===
      'restock'
  ) {
    result =
      autoRestock(
        shopId
      );

    if (
      result &&
      result.ok
    ) {
      recordTrackedDecision(
        shopId,
        'strategy_restock',
        {
          orders:
            Number(
              result.orders
            ) ||
            0,
          spent:
            Number(
              result.spent
            ) ||
            0,
          source:'active_strategy'
        },
        baseline
      );
    }
  } else if (
    recommendation.action ===
      'price_cut'
  ) {
    result =
      adjustMenuPrice(
        shopId,
        recommendation
          .menuItemId,
        recommendation.delta
      );
  } else if (
    recommendation.action ===
      'feature_dish'
  ) {
    result =
      setMenuFeatured(
        shopId,
        recommendation
          .menuItemId
      );
  } else if (
    recommendation.action ===
      'deactivate_low_seller'
  ) {
    result =
      setMenuActive(
        shopId,
        recommendation
          .menuItemId,
        false
      );

    if (
      result &&
      result.ok
    ) {
      recordTrackedDecision(
        shopId,
        'menu_focus',
        {
          menuItemId:
            recommendation
              .menuItemId,
          name:
            result.item &&
            result.item.name ||
            null,
          action:'deactivate',
          source:'active_strategy'
        },
        baseline
      );
    }
  } else {
    return {
      ok:false,
      reason:'策略动作暂不支持',
      recommendation
    };
  }

  if (
    !result ||
    result.ok ===
      false
  ) {
    return {
      ok:false,
      reason:
        result &&
        (
          result.reason ||
          result.message
        ) ||
        '策略执行失败',
      recommendation,
      result
    };
  }

  const runtime =
    getRuntime(
      shopId
    );

  if (runtime) {
    runtime.simulation =
      runtime.simulation ||
      {};

    runtime
      .simulation
      .lastStrategyDay =
      Number(
        runtime.day
      ) ||
      currentDay();

    runtime
      .simulation
      .lastStrategyAction =
      recommendation.id;

    runtime
      .simulation
      .lastStrategyLabel =
      recommendation.label;

    persist(
      shopId
    );
  }

  return {
    ok:true,
    message:
      recommendation
        .successMessage ||
      '经营策略已执行',
    recommendation,
    result
  };
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
  getCustomDishLabOverview,
  refreshCustomDishCandidates,
  startCustomDishResearch,
  improveCustomDish,
  addCustomDishToMenu,
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
  finalizeExternalOperatingDay,
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
  playtestHealthOverview,
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
  operatingStrategyRecommendation,
  applyOperatingStrategy,
  dashboard
};
