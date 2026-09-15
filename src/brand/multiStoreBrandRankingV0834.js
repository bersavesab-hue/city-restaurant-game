'use strict';

const gameState =
  require('../core/gameState.js');

const cityDatabase =
  require('../property/cityPropertyDatabaseV0815.js');

const liveWorld =
  require('../world/liveWorldSystemV084.js');

const commercialEcology =
  require('../world/commercialEcologySystemV0828.js');

const brandGrowth =
  require('../operations/brandGrowthEngineV10.js');

const finance =
  require('../finance/completeFinanceSystemV0825.js');

const VERSION =
  '0.8.34';

function clone(value) {
  if (value === undefined) {
    return undefined;
  }

  return JSON.parse(
    JSON.stringify(value)
  );
}

function clamp(
  value,
  min=0,
  max=100
) {
  return Math.max(
    min,
    Math.min(
      max,
      Number(value) || 0
    )
  );
}

function getRoot() {
  const business =
    gameState.getBusiness();

  business.multiStoreBrand =
    business.multiStoreBrand &&
    typeof business.multiStoreBrand ===
      'object'
      ? business.multiStoreBrand
      : {
          version:VERSION,
          brand:{
            name:
              gameState
                .getPlayer()
                .brandName ||
              '未命名品牌',
            level:1,
            xp:0,
            reputation:0,
            awareness:0,
            loyalty:0,
            storeCount:0,
            history:[]
          },
          stores:{},
          expansionPlans:{},
          rankingHistory:[],
          sequence:0
        };

  const root =
    business.multiStoreBrand;

  root.version =
    VERSION;

  root.brand =
    root.brand &&
    typeof root.brand ===
      'object'
      ? root.brand
      : brandGrowth
          .createBrand(
            gameState
              .getPlayer()
              .brandName ||
            '未命名品牌'
          );

  root.brand.name =
    gameState
      .getPlayer()
      .brandName ||
    root.brand.name ||
    '未命名品牌';

  root.stores =
    root.stores &&
    typeof root.stores ===
      'object'
      ? root.stores
      : {};

  root.expansionPlans =
    root.expansionPlans &&
    typeof root.expansionPlans ===
      'object'
      ? root.expansionPlans
      : {};

  root.rankingHistory =
    Array.isArray(
      root.rankingHistory
    )
      ? root.rankingHistory
      : [];

  root.sequence =
    Math.max(
      0,
      Number(
        root.sequence
      ) ||
      0
    );

  return root;
}

function shopById(shopId) {
  return (
    gameState
      .getBusiness()
      .shops ||
    []
  ).find(
    item =>
      String(item.id) ===
      String(shopId)
  ) || null;
}

function registerShop(
  shopId,
  runtime,
  context
) {
  const shop =
    shopById(
      shopId
    );

  if (!shop) {
    return null;
  }

  const root =
    getRoot();

  const ctx =
    context || {};

  const financial =
    finance
      .snapshot(
        shopId,
        runtime &&
        runtime.ledger
      );

  const pl =
    financial &&
    financial.profitLoss ||
    {};

  const row = {
    id:String(shopId),
    name:
      shop.name ||
      String(shopId),
    districtId:
      shop.districtId ||
      null,
    status:
      shop.status ||
      null,
    openedDay:
      shop.openedDay ||
      ctx.openedDay ||
      null,
    level:
      Math.max(
        1,
        Number(
          runtime &&
          runtime.brand &&
          runtime.brand.level
        ) ||
        1
      ),
    rating:
      Number(
        runtime &&
        runtime.shop &&
        runtime.shop.rating
      ) ||
      Number(
        shop.rating
      ) ||
      4,
    reviewCount:
      Number(
        runtime &&
        runtime.shop &&
        runtime.shop.reviewCount
      ) ||
      Number(
        shop.reviewCount
      ) ||
      0,
    revenue:
      Number(
        pl.revenue
      ) ||
      0,
    accountingProfit:
      Number(
        pl.accountingProfit
      ) ||
      0,
    netCashFlow:
      Number(
        pl.netCashFlow
      ) ||
      0,
    staffCount:
      runtime &&
      runtime.staff &&
      Array.isArray(
        runtime.staff.employees
      )
        ? runtime.staff
            .employees
            .filter(
              item =>
                item.active !==
                false
            ).length
        : 0,
    updatedDay:
      ctx.day == null
        ? null
        : Number(ctx.day)
  };

  root.stores[
    row.id
  ] =
    row;

  synchronizeBrand(
    runtime
  );

  return clone(row);
}

function synchronizeBrand(runtime) {
  const root =
    getRoot();

  const storeCount =
    Object.keys(
      root.stores
    ).length;

  root.brand.storeCount =
    storeCount;

  if (
    runtime &&
    runtime.brand
  ) {
    root.brand.level =
      Math.max(
        Number(
          root.brand.level
        ) ||
        1,
        Number(
          runtime.brand.level
        ) ||
        1
      );

    root.brand.xp =
      Math.max(
        Number(
          root.brand.xp
        ) ||
        0,
        Number(
          runtime.brand.xp
        ) ||
        0
      );

    for (
      const key
      of [
        'reputation',
        'awareness',
        'loyalty'
      ]
    ) {
      root.brand[key] =
        Math.max(
          Number(
            root.brand[key]
          ) ||
          0,
          Number(
            runtime.brand[key]
          ) ||
          0
        );
    }
  }

  const rows =
    Object.values(
      root.stores
    );

  if (rows.length) {
    const avgRating =
      rows.reduce(
        (
          sum,
          item
        ) =>
          sum +
          (
            Number(
              item.rating
            ) ||
            0
          ),
        0
      ) /
      rows.length;

    root.brand.reputation =
      Math.max(
        Number(
          root.brand.reputation
        ) ||
        0,
        clamp(
          (
            avgRating -
            3
          ) *
          50
        )
      );
  }

  return clone(
    root.brand
  );
}

function levelDefinition() {
  const root =
    getRoot();

  return (
    brandGrowth
      .LEVELS[
        Math.max(
          0,
          Math.min(
            brandGrowth
              .LEVELS
              .length -
              1,
            (
              Number(
                root.brand.level
              ) ||
              1
            ) -
            1
          )
        )
      ] ||
    brandGrowth
      .LEVELS[0]
  );
}

function expansionEligibility() {
  const root =
    getRoot();

  const level =
    levelDefinition();

  const currentStores =
    Object.keys(
      root.stores
    ).length;

  return {
    version:VERSION,
    brandLevel:
      Number(
        root.brand.level
      ) ||
      1,
    storeCap:
      level.storeCap,
    currentStores,
    canExpand:
      currentStores <
      level.storeCap,
    remainingSlots:
      Math.max(
        0,
        level.storeCap -
        currentStores
      )
  };
}

function districtOpportunity(
  districtId
) {
  const district =
    cityDatabase
      .getDistrict(
        districtId
      );

  if (!district) {
    return null;
  }

  const ecology =
    commercialEcology
      .snapshot(
        null,
        {
          districtId,
          limit:5
        }
      );

  const market =
    district.marketProfile ||
    {};

  const property =
    district.propertyBaseline ||
    {};

  const baseRent =
    Number(
      market.baseRent ||
      property.baseRent ||
      market.rent ||
      0
    );

  const opportunity =
    clamp(
      Number(
        ecology.opportunityScore
      ) ||
      50
    );

  const threat =
    clamp(
      Number(
        ecology.threatScore
      ) ||
      50
    );

  const estimatedLaunchCapital =
    Math.max(
      30000,
      Math.round(
        (
          baseRent > 0
            ? baseRent *
              6
            : 60000
        ) *
        (
          0.85 +
          threat /
          250
        )
      )
    );

  return {
    districtId,
    districtName:
      district.name,
    streetCount:
      Number(
        district.streetCount
      ) ||
      0,
    opportunityScore:
      opportunity,
    threatScore:
      threat,
    competitorCount:
      Number(
        ecology
          .district
          .competitorCount
      ) ||
      0,
    competitionIntensity:
      Number(
        ecology
          .district
          .intensity
      ) ||
      0,
    estimatedLaunchCapital,
    topCompetitors:
      clone(
        ecology
          .topCompetitors
      )
  };
}

function expansionCatalog(
  cityId
) {
  return cityDatabase
    .getDistricts(
      cityId
    )
    .map(
      district =>
        districtOpportunity(
          district &&
          district.id
        )
    )
    .filter(Boolean)
    .sort(
      (
        a,
        b
      ) =>
        b.opportunityScore -
        a.opportunityScore
    );
}

function createExpansionPlan(
  districtId,
  options
) {
  const eligibility =
    expansionEligibility();

  if (
    !eligibility.canExpand
  ) {
    return {
      ok:false,
      reason:'当前品牌等级的门店上限已满',
      eligibility
    };
  }

  const opportunity =
    districtOpportunity(
      districtId
    );

  if (!opportunity) {
    return {
      ok:false,
      reason:'目标商圈不存在'
    };
  }

  const root =
    getRoot();

  const opts =
    options || {};

  const reserveRate =
    Math.max(
      0,
      Math.min(
        0.5,
        Number(
          opts.reserveRate
        ) ||
        0.08
      )
    );

  const reserveAmount =
    Math.max(
      1000,
      Math.round(
        opportunity
          .estimatedLaunchCapital *
        reserveRate
      )
    );

  const id =
    'expansion_plan_' +
    ++root.sequence;

  const plan = {
    id,
    version:VERSION,
    districtId:
      opportunity.districtId,
    districtName:
      opportunity.districtName,
    createdDay:
      opts.day == null
        ? null
        : Number(opts.day),
    status:'draft',
    opportunityScore:
      opportunity
        .opportunityScore,
    threatScore:
      opportunity
        .threatScore,
    estimatedLaunchCapital:
      opportunity
        .estimatedLaunchCapital,
    reserveAmount,
    committedDay:null,
    shopId:null
  };

  root.expansionPlans[
    id
  ] =
    plan;

  return {
    ok:true,
    plan:
      clone(plan)
  };
}

function commitExpansionPlan(
  planId,
  options
) {
  const root =
    getRoot();

  const plan =
    root.expansionPlans[
      String(planId)
    ];

  if (!plan) {
    return {
      ok:false,
      reason:'扩张计划不存在'
    };
  }

  if (
    plan.status ===
    'committed'
  ) {
    return {
      ok:true,
      existing:true,
      plan:
        clone(plan)
    };
  }

  const eligibility =
    expansionEligibility();

  if (
    !eligibility.canExpand
  ) {
    return {
      ok:false,
      reason:'门店上限已满',
      eligibility
    };
  }

  const opts =
    options || {};

  const paid =
    finance
      .recordExternalExpense(
        'global',
        'other',
        plan.reserveAmount,
        {
          day:
            opts.day == null
              ? null
              : Number(opts.day),
          referenceId:
            'expansion_reserve:' +
            plan.id,
          applyCash:true,
          note:
            '扩张意向保证金：' +
            plan.districtName,
          meta:{
            planId:
              plan.id,
            districtId:
              plan.districtId
          }
        }
      );

  if (!paid.ok) {
    return paid;
  }

  plan.status =
    'committed';

  plan.committedDay =
    opts.day == null
      ? null
      : Number(opts.day);

  return {
    ok:true,
    existing:false,
    plan:
      clone(plan)
  };
}

function attachExpansionShop(
  planId,
  shopId,
  runtime,
  options
) {
  const root =
    getRoot();

  const plan =
    root.expansionPlans[
      String(planId)
    ];

  if (!plan) {
    return {
      ok:false,
      reason:'扩张计划不存在'
    };
  }

  const shop =
    shopById(
      shopId
    );

  if (!shop) {
    return {
      ok:false,
      reason:'门店不存在'
    };
  }

  plan.status =
    'opened';

  plan.shopId =
    String(shopId);

  plan.openedDay =
    options &&
    options.day != null
      ? Number(
          options.day
        )
      : null;

  const registered =
    registerShop(
      shopId,
      runtime,
      {
        day:
          plan.openedDay
      }
    );

  return {
    ok:true,
    plan:
      clone(plan),
    shop:
      registered
  };
}

function competitorScore(
  competitor
) {
  const stores =
    Array.isArray(
      competitor.stores
    )
      ? competitor.stores
          .filter(
            store =>
              store.status !==
              'closed'
          ).length
      : Number(
          competitor.storeCount
        ) ||
        1;

  return (
    (
      Number(
        competitor.brandPower
      ) ||
      50
    ) *
      0.42 +
    (
      Number(
        competitor.reputation
      ) ||
      50
    ) *
      0.34 +
    Math.min(
      100,
      stores *
        8
    ) *
      0.24
  );
}

function playerScore() {
  const root =
    getRoot();

  const stores =
    Object.values(
      root.stores
    );

  const totalRevenue =
    stores.reduce(
      (
        sum,
        item
      ) =>
        sum +
        (
          Number(
            item.revenue
          ) ||
          0
        ),
      0
    );

  const totalProfit =
    stores.reduce(
      (
        sum,
        item
      ) =>
        sum +
        (
          Number(
            item.accountingProfit
          ) ||
          0
        ),
      0
    );

  return (
    clamp(
      root.brand.reputation
    ) *
      0.28 +
    clamp(
      root.brand.awareness
    ) *
      0.22 +
    Math.min(
      100,
      (
        Number(
          root.brand.level
        ) ||
        1
      ) *
        5
    ) *
      0.20 +
    Math.min(
      100,
      stores.length *
        10
    ) *
      0.12 +
    Math.min(
      100,
      Math.max(
        0,
        totalRevenue
      ) /
        10000
    ) *
      0.10 +
    Math.min(
      100,
      Math.max(
        0,
        totalProfit
      ) /
        5000
    ) *
      0.08
  );
}

function buildRanking(
  options
) {
  const opts =
    options || {};

  const districtId =
    opts.districtId ||
    null;

  liveWorld.initialize(
    Number(
      opts.day
    ) ||
    1
  );

  const state =
    liveWorld
      .getState();

  let competitors =
    state.competitors ||
    [];

  if (districtId) {
    competitors =
      competitors.filter(
        competitor =>
          (
            competitor.stores ||
            []
          ).some(
            store =>
              store.status !==
                'closed' &&
              store.districtId ===
                districtId
          )
      );
  }

  const rows =
    competitors.map(
      competitor => ({
        id:
          competitor.id,
        name:
          competitor.name ||
          competitor.brandName ||
          competitor.id,
        type:'competitor',
        score:
          Math.round(
            competitorScore(
              competitor
            ) *
            100
          ) /
          100,
        reputation:
          Number(
            competitor.reputation
          ) ||
          0,
        storeCount:
          Array.isArray(
            competitor.stores
          )
            ? competitor.stores
                .filter(
                  store =>
                    store.status !==
                    'closed'
                ).length
            : 1
      })
    );

  const root =
    getRoot();

  const player = {
    id:'player_brand',
    name:
      root.brand.name,
    type:'player',
    score:
      Math.round(
        playerScore() *
        100
      ) /
      100,
    reputation:
      Number(
        root.brand.reputation
      ) ||
      0,
    storeCount:
      Object.keys(
        root.stores
      ).length
  };

  rows.push(
    player
  );

  rows.sort(
    (
      a,
      b
    ) =>
      b.score -
      a.score
  );

  const ranked =
    rows.map(
      (
        item,
        index
      ) => ({
        rank:
          index +
          1,
        ...item
      })
    );

  const playerRow =
    ranked.find(
      item =>
        item.type ===
        'player'
    );

  return {
    version:VERSION,
    districtId,
    total:
      ranked.length,
    playerRank:
      playerRow
        ? playerRow.rank
        : null,
    playerScore:
      playerRow
        ? playerRow.score
        : null,
    top:
      ranked
        .slice(
          0,
          Math.max(
            3,
            Math.min(
              50,
              Number(
                opts.limit
              ) ||
              20
            )
          )
        ),
    aroundPlayer:
      playerRow
        ? ranked.slice(
            Math.max(
              0,
              playerRow.rank -
              4
            ),
            Math.min(
              ranked.length,
              playerRow.rank +
              3
            )
          )
        : []
  };
}

function storeRanking() {
  const root =
    getRoot();

  return Object
    .values(
      root.stores
    )
    .map(
      item => ({
        ...clone(item),
        score:
          Math.round(
            (
              (
                (
                  Number(
                    item.rating
                  ) ||
                  4
                ) /
                5 *
                100
              ) *
                0.40 +
              Math.min(
                100,
                Math.max(
                  0,
                  Number(
                    item.revenue
                  ) ||
                  0
                ) /
                500
              ) *
                0.30 +
              Math.min(
                100,
                Math.max(
                  0,
                  Number(
                    item.accountingProfit
                  ) ||
                  0
                ) /
                200
              ) *
                0.20 +
              Math.min(
                100,
                (
                  Number(
                    item.staffCount
                  ) ||
                  0
                ) *
                8
              ) *
                0.10
            ) *
            100
          ) /
          100
      })
    )
    .sort(
      (
        a,
        b
      ) =>
        b.score -
        a.score
    )
    .map(
      (
        item,
        index
      ) => ({
        rank:
          index +
          1,
        ...item
      })
    );
}

function portfolioSnapshot() {
  const root =
    getRoot();

  const stores =
    Object.values(
      root.stores
    );

  const revenue =
    stores.reduce(
      (
        sum,
        item
      ) =>
        sum +
        (
          Number(
            item.revenue
          ) ||
          0
        ),
      0
    );

  const profit =
    stores.reduce(
      (
        sum,
        item
      ) =>
        sum +
        (
          Number(
            item.accountingProfit
          ) ||
          0
        ),
      0
    );

  return {
    version:VERSION,
    brand:
      clone(
        synchronizeBrand()
      ),
    eligibility:
      expansionEligibility(),
    storeCount:
      stores.length,
    totalRevenue:
      Math.round(
        revenue *
        100
      ) /
      100,
    totalProfit:
      Math.round(
        profit *
        100
      ) /
      100,
    stores:
      storeRanking(),
    expansionPlans:
      Object.values(
        root.expansionPlans
      ).map(clone)
  };
}

module.exports = {
  VERSION,
  getRoot,
  shopById,
  registerShop,
  synchronizeBrand,
  levelDefinition,
  expansionEligibility,
  districtOpportunity,
  expansionCatalog,
  createExpansionPlan,
  commitExpansionPlan,
  attachExpansionShop,
  playerScore,
  buildRanking,
  storeRanking,
  portfolioSnapshot
};
