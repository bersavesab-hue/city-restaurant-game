'use strict';

const gameState =
  require('../core/gameState.js');

const brandGrowth =
  require('../operations/brandGrowthEngineV10.js');

const easterEggEngine =
  require('../easteregg/easterEggEngineV10.js');

const easterEggPack =
  require('../easteregg/easterEggPackV10.js');

const randomEngine =
  require('../core/globalRandomEngineV0832.js');

const VERSION =
  '0.8.33';

const ACHIEVEMENTS =
  Object.freeze([
    {id:'first_shop',name:'第一家店',metric:'storeCount',target:1,points:10},
    {id:'three_shops',name:'三店成势',metric:'storeCount',target:3,points:30},
    {id:'five_shops',name:'五店连锁',metric:'storeCount',target:5,points:60},
    {id:'first_profit_day',name:'首个盈利日',metric:'profitDays',target:1,points:10},
    {id:'profit_week',name:'连续盈利基础',metric:'profitDays',target:7,points:35},
    {id:'profit_month',name:'稳定盈利',metric:'profitDays',target:30,points:90},
    {id:'revenue_10k',name:'单日破万',metric:'bestDailyRevenue',target:10000,points:30},
    {id:'revenue_50k',name:'单日五万',metric:'bestDailyRevenue',target:50000,points:70},
    {id:'customers_100',name:'百人到店',metric:'totalCustomers',target:100,points:15},
    {id:'customers_1000',name:'千客积累',metric:'totalCustomers',target:1000,points:45},
    {id:'customers_10000',name:'万客品牌',metric:'totalCustomers',target:10000,points:120},
    {id:'reviews_50',name:'口碑起步',metric:'reviewCount',target:50,points:20},
    {id:'reviews_500',name:'点评热门',metric:'reviewCount',target:500,points:65},
    {id:'rating_45',name:'高分门店',metric:'ratingX10',target:45,points:35},
    {id:'members_100',name:'百名会员',metric:'memberCount',target:100,points:25},
    {id:'members_1000',name:'千名会员',metric:'memberCount',target:1000,points:75},
    {id:'staff_10',name:'十人团队',metric:'staffCount',target:10,points:20},
    {id:'staff_50',name:'成熟组织',metric:'staffCount',target:50,points:80},
    {id:'campaigns_10',name:'营销熟手',metric:'campaignCount',target:10,points:20},
    {id:'campaigns_50',name:'增长操盘手',metric:'campaignCount',target:50,points:60},
    {id:'suppliers_10',name:'供应网络',metric:'supplierCount',target:10,points:20},
    {id:'inspections_5',name:'监管常客',metric:'inspectionsPassed',target:5,points:20},
    {id:'inspections_20',name:'合规标杆',metric:'inspectionsPassed',target:20,points:70},
    {id:'no_violation_30',name:'安全运营月',metric:'noViolationStreak',target:30,points:55},
    {id:'brand_level_5',name:'城市新锐',metric:'brandLevel',target:5,points:40},
    {id:'brand_level_10',name:'跨区品牌',metric:'brandLevel',target:10,points:90},
    {id:'brand_level_15',name:'跨省连锁',metric:'brandLevel',target:15,points:160},
    {id:'brand_level_20',name:'行业标杆',metric:'brandLevel',target:20,points:260},
    {id:'hidden_1',name:'第一次奇遇',metric:'hiddenDiscovered',target:1,points:25},
    {id:'hidden_5',name:'城市秘闻',metric:'hiddenDiscovered',target:5,points:80},
    {id:'easter_3',name:'彩蛋收藏家',metric:'easterEvents',target:3,points:35},
    {id:'achievement_20',name:'经营收藏家',metric:'achievementCount',target:20,points:120}
  ]);

const FEATURE_UNLOCKS =
  Object.freeze([
    {id:'property_market',name:'商铺市场',brandLevel:1},
    {id:'renovation',name:'装修管理',brandLevel:1},
    {id:'menu_research',name:'菜品研发',brandLevel:1},
    {id:'supplier_compare',name:'供应商比价',brandLevel:2},
    {id:'membership',name:'会员体系',brandLevel:2},
    {id:'marketing_platform',name:'多平台营销',brandLevel:3},
    {id:'reputation_center',name:'舆情中心',brandLevel:3},
    {id:'staff_training',name:'员工培训',brandLevel:3},
    {id:'competitor_intel',name:'竞对情报',brandLevel:4},
    {id:'regulatory_center',name:'合规中心',brandLevel:4},
    {id:'second_store',name:'第二门店资格',brandLevel:4,achievementPoints:80},
    {id:'multi_store_ops',name:'多店经营',brandLevel:6,achievementPoints:150},
    {id:'district_expansion',name:'跨商圈扩张',brandLevel:8,achievementPoints:260},
    {id:'city_ranking',name:'城市排行榜',brandLevel:9,achievementPoints:320},
    {id:'regional_brand',name:'区域品牌',brandLevel:12,achievementPoints:520},
    {id:'province_expansion',name:'跨区域扩张',brandLevel:15,achievementPoints:800},
    {id:'national_ranking',name:'全国品牌榜',brandLevel:18,achievementPoints:1150},
    {id:'industry_legend',name:'行业标杆挑战',brandLevel:20,achievementPoints:1500}
  ]);

function clone(value) {
  if (value === undefined) return undefined;
  return JSON.parse(JSON.stringify(value));
}

function getRoot() {
  const business =
    gameState.getBusiness();

  business.growthProgress =
    business.growthProgress &&
    typeof business.growthProgress ===
      'object'
      ? business.growthProgress
      : {
          version:VERSION,
          global:{
            achievementPoints:0,
            achievements:{},
            unlockedFeatures:{}
          },
          shops:{},
          easterState:
            easterEggEngine
              .createState()
        };

  const root =
    business.growthProgress;

  root.version =
    VERSION;

  root.global =
    root.global &&
    typeof root.global ===
      'object'
      ? root.global
      : {};

  root.global.achievementPoints =
    Math.max(
      0,
      Number(
        root.global
          .achievementPoints
      ) || 0
    );

  root.global.achievements =
    root.global.achievements ||
    {};

  root.global.unlockedFeatures =
    root.global.unlockedFeatures ||
    {};

  root.shops =
    root.shops || {};

  root.easterState =
    root.easterState &&
    typeof root.easterState ===
      'object'
      ? root.easterState
      : easterEggEngine
          .createState();

  return root;
}

function ensureShop(shopId) {
  const root =
    getRoot();

  const id =
    String(shopId);

  if (!root.shops[id]) {
    root.shops[id] = {
      version:VERSION,
      shopId:id,
      metrics:{
        daysPlayed:0,
        profitDays:0,
        bestDailyRevenue:0,
        totalCustomers:0,
        reviewCount:0,
        ratingX10:40,
        memberCount:0,
        staffCount:0,
        campaignCount:0,
        supplierCount:0,
        inspectionsPassed:0,
        noViolationStreak:0,
        brandLevel:1,
        hiddenDiscovered:0,
        easterEvents:0,
        storeCount:1,
        achievementCount:0
      },
      lastEvaluationDay:null,
      recentUnlocks:[]
    };
  }

  const state =
    root.shops[id];

  state.version =
    VERSION;

  state.metrics =
    state.metrics || {};

  state.recentUnlocks =
    Array.isArray(
      state.recentUnlocks
    )
      ? state.recentUnlocks
      : [];

  return state;
}

function updateMetrics(
  shopId,
  input
) {
  const state =
    ensureShop(shopId);

  const values =
    input || {};

  for (
    const [
      key,
      value
    ]
    of Object.entries(
      values
    )
  ) {
    if (
      value == null ||
      typeof value ===
        'object'
    ) {
      continue;
    }

    const number =
      Number(value);

    if (
      Number.isFinite(number)
    ) {
      state.metrics[key] =
        number;
    }
  }

  return clone(
    state.metrics
  );
}

function brandLevel(
  runtime
) {
  return Math.max(
    1,
    Math.min(
      20,
      Number(
        runtime &&
        runtime.brand &&
        runtime.brand.level
      ) ||
      1
    )
  );
}

function collectRuntimeMetrics(
  shopId,
  runtime,
  context
) {
  const ctx =
    context || {};

  const root =
    getRoot();

  const hiddenDiscovered =
    Object.keys(
      root.easterState
        .discovered ||
      {}
    ).filter(
      id =>
        root.easterState
          .discovered[id]
    ).length;

  const easterEvents =
    Object.keys(
      root.easterState
        .eventsSeen ||
      {}
    ).length;

  const stores =
    gameState
      .getBusiness()
      .shops ||
    [];

  return {
    daysPlayed:
      Number(
        ctx.daysPlayed
      ) ||
      Number(
        runtime &&
        runtime.day
      ) ||
      1,
    profitDays:
      Number(
        ctx.profitDays
      ) ||
      0,
    bestDailyRevenue:
      Math.max(
        Number(
          ctx.bestDailyRevenue
        ) ||
        0,
        Number(
          ctx.dailyRevenue
        ) ||
        0
      ),
    totalCustomers:
      Number(
        ctx.totalCustomers
      ) ||
      0,
    reviewCount:
      Number(
        ctx.reviewCount
      ) ||
      Number(
        runtime &&
        runtime.shop &&
        runtime.shop.reviewCount
      ) ||
      0,
    ratingX10:
      Math.round(
        (
          Number(
            ctx.rating
          ) ||
          Number(
            runtime &&
            runtime.shop &&
            runtime.shop.rating
          ) ||
          4
        ) *
        10
      ),
    memberCount:
      Number(
        ctx.memberCount
      ) ||
      0,
    staffCount:
      Number(
        ctx.staffCount
      ) ||
      (
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
          : 0
      ),
    campaignCount:
      Number(
        ctx.campaignCount
      ) ||
      (
        runtime &&
        Array.isArray(
          runtime.campaigns
        )
          ? runtime
              .campaigns
              .length
          : 0
      ),
    supplierCount:
      Number(
        ctx.supplierCount
      ) ||
      (
        runtime &&
        Array.isArray(
          runtime.supplierNetwork
        )
          ? runtime
              .supplierNetwork
              .length
          : 0
      ),
    inspectionsPassed:
      Number(
        ctx.inspectionsPassed
      ) ||
      0,
    noViolationStreak:
      Number(
        ctx.noViolationStreak
      ) ||
      0,
    brandLevel:
      brandLevel(runtime),
    hiddenDiscovered,
    easterEvents,
    storeCount:
      Math.max(
        1,
        stores.length
      )
  };
}

function evaluateAchievements(
  shopId
) {
  const root =
    getRoot();

  const state =
    ensureShop(shopId);

  const unlocked = [];

  const currentCount =
    Object.keys(
      root.global
        .achievements
    ).filter(
      id =>
        root.global
          .achievements[id]
    ).length;

  state.metrics
    .achievementCount =
    currentCount;

  for (
    const def
    of ACHIEVEMENTS
  ) {
    if (
      root.global
        .achievements[
          def.id
        ]
    ) {
      continue;
    }

    let value =
      Number(
        state.metrics[
          def.metric
        ]
      ) ||
      0;

    if (
      def.metric ===
      'achievementCount'
    ) {
      value =
        Object.keys(
          root.global
            .achievements
        ).filter(
          id =>
            root.global
              .achievements[id]
        ).length;
    }

    if (
      value <
      def.target
    ) {
      continue;
    }

    root.global
      .achievements[
        def.id
      ] = {
        id:def.id,
        name:def.name,
        points:def.points,
        unlockedDay:
          state.metrics
            .daysPlayed ||
          null
      };

    root.global
      .achievementPoints +=
      def.points;

    unlocked.push({
      type:'achievement',
      ...def
    });
  }

  state.metrics
    .achievementCount =
    Object.keys(
      root.global
        .achievements
    ).filter(
      id =>
        root.global
          .achievements[id]
    ).length;

  return unlocked;
}

function evaluateUnlocks(
  shopId
) {
  const root =
    getRoot();

  const state =
    ensureShop(shopId);

  const unlocked = [];

  for (
    const def
    of FEATURE_UNLOCKS
  ) {
    if (
      root.global
        .unlockedFeatures[
          def.id
        ]
    ) {
      continue;
    }

    if (
      state.metrics
        .brandLevel <
      (
        Number(
          def.brandLevel
        ) ||
        1
      )
    ) {
      continue;
    }

    if (
      root.global
        .achievementPoints <
      (
        Number(
          def.achievementPoints
        ) ||
        0
      )
    ) {
      continue;
    }

    root.global
      .unlockedFeatures[
        def.id
      ] = {
        id:def.id,
        name:def.name,
        unlockedDay:
          state.metrics
            .daysPlayed ||
          null
      };

    unlocked.push({
      type:'feature',
      ...def
    });
  }

  return unlocked;
}

function evaluate(
  shopId,
  runtime,
  context
) {
  const state =
    ensureShop(shopId);

  const collected =
    collectRuntimeMetrics(
      shopId,
      runtime,
      context
    );

  const previous =
    state.metrics;

  for (
    const [
      key,
      value
    ]
    of Object.entries(
      collected
    )
  ) {
    if (
      key ===
      'bestDailyRevenue' ||
      key ===
      'totalCustomers' ||
      key ===
      'profitDays'
    ) {
      previous[key] =
        Math.max(
          Number(
            previous[key]
          ) ||
          0,
          Number(value) ||
          0
        );
    } else {
      previous[key] =
        Number(value) ||
        0;
    }
  }

  const achievements =
    evaluateAchievements(
      shopId
    );

  const features =
    evaluateUnlocks(
      shopId
    );

  const unlocks =
    achievements.concat(
      features
    );

  state.recentUnlocks =
    unlocks.concat(
      state.recentUnlocks
    ).slice(
      0,
      40
    );

  state.lastEvaluationDay =
    previous.daysPlayed ||
    null;

  return {
    version:VERSION,
    unlocked:
      clone(unlocks),
    metrics:
      clone(previous),
    achievementPoints:
      getRoot()
        .global
        .achievementPoints
  };
}

function addClue(
  hiddenId,
  clue
) {
  const root =
    getRoot();

  return easterEggEngine
    .addClue(
      root.easterState,
      hiddenId,
      clue
    );
}

function randomAdapter(
  namespace,
  scope
) {
  return {
    next() {
      return randomEngine
        .next(
          namespace,
          scope
        );
    },
    float(min,max) {
      return randomEngine
        .float(
          namespace,
          scope,
          min,
          max
        );
    },
    int(min,max) {
      return randomEngine
        .int(
          namespace,
          scope,
          min,
          max
        );
    },
    chance(probability) {
      return randomEngine
        .chance(
          namespace,
          scope,
          probability
        );
    },
    pick(items) {
      return randomEngine
        .pick(
          namespace,
          scope,
          items
        );
    },
    weighted(items,getWeight) {
      return randomEngine
        .weighted(
          namespace,
          scope,
          items,
          getWeight
        );
    }
  };
}

function rollHidden(
  shopId,
  context
) {
  const root =
    getRoot();

  const ctx =
    context || {};

  const day =
    Number(
      ctx.daysPlayed
    ) ||
    1;

  const rng =
    randomAdapter(
      'hidden_encounter',
      [
        shopId,
        day
      ].join(':')
    );

  const encounter =
    easterEggEngine
      .rollHiddenEncounter(
        rng,
        root.easterState,
        ctx
      );

  if (encounter) {
    ensureShop(
      shopId
    ).recentUnlocks.unshift({
      type:'hidden_encounter',
      ...clone(encounter)
    });
  }

  return encounter
    ? clone(encounter)
    : null;
}

function discoverHidden(
  shopId,
  hiddenId
) {
  const root =
    getRoot();

  const ok =
    easterEggEngine
      .discover(
        root.easterState,
        hiddenId
      );

  if (ok) {
    const state =
      ensureShop(shopId);

    state.metrics
      .hiddenDiscovered =
      Object.keys(
        root.easterState
          .discovered ||
        {}
      ).filter(
        id =>
          root.easterState
            .discovered[id]
      ).length;

    evaluateAchievements(
      shopId
    );
  }

  return ok;
}

function rollEasterEvent(
  shopId,
  context
) {
  const root =
    getRoot();

  const ctx =
    context || {};

  const day =
    Number(
      ctx.daysPlayed
    ) ||
    1;

  const rng =
    randomAdapter(
      'easter_event',
      [
        shopId,
        day
      ].join(':')
    );

  const event =
    easterEggEngine
      .rollEasterEvent(
        rng,
        root.easterState,
        ctx
      );

  return event
    ? clone(event)
    : null;
}

function canOpenStore(
  runtime
) {
  if (
    !runtime ||
    !runtime.brand
  ) {
    return false;
  }

  return brandGrowth
    .canOpenStore(
      runtime.brand
    );
}

function overview(
  shopId,
  runtime
) {
  const root =
    getRoot();

  const state =
    ensureShop(shopId);

  const level =
    brandLevel(runtime);

  const levelDef =
    brandGrowth
      .LEVELS[
        level -
        1
      ] ||
    brandGrowth
      .LEVELS[0];

  return {
    version:VERSION,
    brand:{
      level,
      name:
        levelDef.name,
      xp:
        Number(
          runtime &&
          runtime.brand &&
          runtime.brand.xp
        ) ||
        0,
      storeCap:
        levelDef.storeCap,
      canOpenStore:
        canOpenStore(
          runtime
        )
    },
    achievementPoints:
      root.global
        .achievementPoints,
    achievements:
      Object.values(
        root.global
          .achievements
      ).map(clone),
    unlockedFeatures:
      Object.values(
        root.global
          .unlockedFeatures
      ).map(clone),
    achievementCatalog:
      ACHIEVEMENTS
        .map(clone),
    featureCatalog:
      FEATURE_UNLOCKS
        .map(clone),
    hiddenContent:{
      dataScale:
        easterEggPack
          .stats(),
      discovered:
        Object.keys(
          root.easterState
            .discovered ||
          {}
        ).filter(
          id =>
            root.easterState
              .discovered[id]
        ),
      undiscovered:
        easterEggEngine
          .listUndiscovered(
            root.easterState
          ),
      eventsSeen:
        clone(
          root.easterState
            .eventsSeen ||
          {}
        )
    },
    metrics:
      clone(
        state.metrics
      ),
    recentUnlocks:
      state.recentUnlocks
        .slice(
          0,
          20
        )
        .map(clone)
  };
}

module.exports = {
  VERSION,
  ACHIEVEMENTS,
  FEATURE_UNLOCKS,
  getRoot,
  ensureShop,
  updateMetrics,
  collectRuntimeMetrics,
  evaluateAchievements,
  evaluateUnlocks,
  evaluate,
  addClue,
  rollHidden,
  discoverHidden,
  rollEasterEvent,
  canOpenStore,
  overview
};
