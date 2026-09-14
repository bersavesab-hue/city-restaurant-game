'use strict';

const gameState =
  require('../core/gameState.js');

const simulationSystem =
  require('../core/simulationSystem.js');

const liveWorldSystem =
  require('./liveWorldSystemV084.js');

const operations =
  require('../operations/operationsStoreV080.js');

const competitorPack =
  require('../competitor/competitorPackV10.js');

function clone(value) {
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

function currentDay() {
  return simulationSystem
    .getDayOrdinal(
      gameState
        .getTime()
    );
}

function getShop(
  shopId
) {
  return (
    gameState
      .getBusiness()
      .shops ||
    []
  ).find(
    row =>
      row.id ===
      shopId
  ) || null;
}

function getStaffState(
  shopId
) {
  const prep =
    gameState
      .getOpeningPrep();

  prep.staffing =
    prep.staffing ||
    {};

  prep.staffing[
    shopId
  ] =
    prep.staffing[
      shopId
    ] ||
    {
      hired:[],
      candidateDay:null,
      candidates:[]
    };

  return prep.staffing[
    shopId
  ];
}

function normalizeLive(
  staff
) {
  staff.live =
    staff.live ||
    (
      staff.personProfile &&
      staff.personProfile.state
        ? {
            ...clone(
              staff
                .personProfile
                .state
            )
          }
        : {}
    );

  const live =
    staff.live;

  live.mood =
    clamp(
      live.mood == null
        ? 65
        : live.mood
    );

  live.energy =
    clamp(
      live.energy == null
        ? 70
        : live.energy
    );

  live.stress =
    clamp(
      live.stress == null
        ? 25
        : live.stress
    );

  live.satisfaction =
    clamp(
      live.satisfaction == null
        ? 65
        : live.satisfaction
    );

  live.loyalty =
    clamp(
      live.loyalty == null
        ? 55
        : live.loyalty
    );

  live.turnoverRisk =
    clamp(
      live.turnoverRisk == null
        ? 0
        : live.turnoverRisk
    );

  live.entrepreneurship =
    clamp(
      live.entrepreneurship == null
        ? 0
        : live.entrepreneurship
    );

  return live;
}

function roleName(
  roleId
) {
  const names = {
    manager:'店长',
    chef:'厨师',
    server:'服务员',
    cashier:'收银/前台'
  };

  return (
    names[
      roleId
    ] ||
    roleId ||
    '员工'
  );
}

function getStaffRoster(
  shopId
) {
  const state =
    getStaffState(
      shopId
    );

  return state.hired
    .map(
      staff => {
        const live =
          normalizeLive(
            staff
          );

        return {
          id:
            staff.id,
          personId:
            staff.personId ||
            null,
          name:
            staff.name ||
            '未命名员工',
          age:
            Number(
              staff.age
            ) ||
            null,
          roleId:
            staff.roleId,
          roleName:
            roleName(
              staff.roleId
            ),
          wage:
            Number(
              staff.wage
            ) ||
            0,
          skill:
            Math.round(
              Number(
                staff.skill
              ) ||
              50
            ),
          experience:
            Number(
              staff.experience
            ) ||
            0,
          personalityLabels:
            (
              staff
                .personalityLabels ||
              staff
                .personProfile &&
              staff
                .personProfile
                .personalityLabels ||
              []
            ).slice(
              0,
              3
            ),
          mood:
            Math.round(
              live.mood
            ),
          energy:
            Math.round(
              live.energy
            ),
          stress:
            Math.round(
              live.stress
            ),
          satisfaction:
            Math.round(
              live.satisfaction
            ),
          loyalty:
            Math.round(
              live.loyalty
            ),
          turnoverRisk:
            Math.round(
              live.turnoverRisk
            ),
          entrepreneurship:
            Math.round(
              live.entrepreneurship
            ),
          lastRaiseDay:
            Number(
              staff.lastRaiseDay
            ) ||
            null,
          lastTrainingDay:
            Number(
              staff.lastTrainingDay
            ) ||
            null,
          lastRestDay:
            Number(
              staff.lastRestDay
            ) ||
            null
        };
      }
    )
    .sort(
      (
        a,
        b
      ) =>
        b.turnoverRisk -
        a.turnoverRisk ||
        b.stress -
        a.stress
    );
}

function syncProfileState(
  staff
) {
  if (
    staff.personProfile &&
    staff.personProfile.state
  ) {
    Object.assign(
      staff.personProfile.state,
      {
        mood:
          staff.live.mood,
        energy:
          staff.live.energy,
        stress:
          staff.live.stress,
        satisfaction:
          staff.live
            .satisfaction,
        loyalty:
          staff.live.loyalty
      }
    );
  }
}

function managementCooldown(
  staff,
  field,
  days
) {
  const last =
    Number(
      staff[field]
    );

  if (
    !Number.isFinite(
      last
    )
  ) {
    return 0;
  }

  return Math.max(
    0,
    days -
    (
      currentDay() -
      last
    )
  );
}

function manageStaff(
  shopId,
  staffId,
  action
) {
  const state =
    getStaffState(
      shopId
    );

  const staff =
    state.hired.find(
      row =>
        row.id ===
        staffId
    );

  if (!staff) {
    return {
      ok:false,
      message:'员工不存在或已经离职'
    };
  }

  const live =
    normalizeLive(
      staff
    );

  const day =
    currentDay();

  if (
    action ===
    'raise'
  ) {
    const cooldown =
      managementCooldown(
        staff,
        'lastRaiseDay',
        20
      );

    if (cooldown > 0) {
      return {
        ok:false,
        message:
          '调薪冷却还有' +
          cooldown +
          '天'
      };
    }

    const oldWage =
      Number(
        staff.wage
      ) ||
      4000;

    const newWage =
      Math.round(
        oldWage *
        1.06 /
        100
      ) *
      100;

    staff.wage =
      Math.max(
        oldWage +
        100,
        newWage
      );

    staff.lastRaiseDay =
      day;

    live.satisfaction =
      clamp(
        live.satisfaction +
        6
      );

    live.loyalty =
      clamp(
        live.loyalty +
        5
      );

    live.turnoverRisk =
      clamp(
        live.turnoverRisk -
        8
      );

    live.mood =
      clamp(
        live.mood +
        4
      );

    syncProfileState(
      staff
    );

    return {
      ok:true,
      message:
        '已调薪至¥' +
        staff.wage +
        '/月',
      wage:
        staff.wage
    };
  }

  if (
    action ===
    'rest'
  ) {
    const cooldown =
      managementCooldown(
        staff,
        'lastRestDay',
        3
      );

    if (cooldown > 0) {
      return {
        ok:false,
        message:
          '休息安排还有' +
          cooldown +
          '天冷却'
      };
    }

    staff.lastRestDay =
      day;

    live.energy =
      clamp(
        live.energy +
        20
      );

    live.stress =
      clamp(
        live.stress -
        16
      );

    live.mood =
      clamp(
        live.mood +
        7
      );

    live.satisfaction =
      clamp(
        live.satisfaction +
        3
      );

    live.turnoverRisk =
      clamp(
        live.turnoverRisk -
        5
      );

    syncProfileState(
      staff
    );

    return {
      ok:true,
      message:
        '已安排休息，精力恢复、压力下降'
    };
  }

  if (
    action ===
    'train'
  ) {
    const cooldown =
      managementCooldown(
        staff,
        'lastTrainingDay',
        7
      );

    if (cooldown > 0) {
      return {
        ok:false,
        message:
          '培训冷却还有' +
          cooldown +
          '天'
      };
    }

    const cost =
      Math.max(
        800,
        Math.round(
          (
            Number(
              staff.wage
            ) ||
            4000
          ) *
          0.12 /
          100
        ) *
        100
      );

    if (
      !gameState
        .spendCash(
          cost
        )
    ) {
      return {
        ok:false,
        message:'培训资金不足'
      };
    }

    const profile =
      staff.personProfile;

    const skillMap = {
      manager:[
        'management',
        'operations',
        'leadership'
      ],
      chef:[
        'cooking',
        'prep',
        'foodSafety'
      ],
      server:[
        'service',
        'sales'
      ],
      cashier:[
        'cashier',
        'service',
        'digital'
      ]
    };

    const keys =
      skillMap[
        staff.roleId
      ] ||
      [
        'operations'
      ];

    if (
      profile &&
      profile.skills
    ) {
      for (
        const key
        of keys
      ) {
        profile.skills[
          key
        ] =
          clamp(
            (
              Number(
                profile.skills[
                  key
                ]
              ) ||
              40
            ) +
            3
          );
      }
    }

    staff.skill =
      clamp(
        (
          Number(
            staff.skill
          ) ||
          50
        ) +
        3
      );

    staff.lastTrainingDay =
      day;

    live.satisfaction =
      clamp(
        live.satisfaction +
        2
      );

    live.mood =
      clamp(
        live.mood +
        2
      );

    syncProfileState(
      staff
    );

    return {
      ok:true,
      message:
        '培训完成，技能+' +
        3 +
        '，花费¥' +
        cost,
      cost
    };
  }

  if (
    action ===
    'dismiss'
  ) {
    const severance =
      Math.max(
        600,
        Math.round(
          (
            Number(
              staff.wage
            ) ||
            4000
          ) *
          0.25 /
          100
        ) *
        100
      );

    if (
      !gameState
        .spendCash(
          severance
        )
    ) {
      return {
        ok:false,
        message:'离职结算资金不足'
      };
    }

    const index =
      state.hired
        .findIndex(
          row =>
            row.id ===
            staffId
        );

    if (index >= 0) {
      state.hired.splice(
        index,
        1
      );
    }

    const world =
      liveWorldSystem
        .getState();

    world.staffHistory =
      Array.isArray(
        world.staffHistory
      )
        ? world.staffHistory
        : [];

    world.staffHistory.unshift({
      day,
      type:'staff_dismissed',
      shopId,
      personId:
        staff.personId ||
        null,
      personName:
        staff.name ||
        '员工',
      roleId:
        staff.roleId,
      reason:'player_dismissed',
      severance
    });

    world.staffHistory =
      world.staffHistory
        .slice(
          0,
          120
        );

    return {
      ok:true,
      message:
        '已办理离职，结算¥' +
        severance,
      severance
    };
  }

  return {
    ok:false,
    message:'未知员工管理操作'
  };
}

function actionName(
  actionId
) {
  const row =
    (
      competitorPack
        .RESPONSE_ACTIONS ||
      []
    ).find(
      item =>
        item.id ===
        actionId
    );

  if (
    row &&
    row.name
  ) {
    return row.name;
  }

  const fallback = {
    observe:'观察',
    menu_follow:'模仿菜单',
    bundle_follow:'跟进套餐',
    price_cut:'降价',
    coupon:'优惠券',
    ads:'广告投放',
    influencer:'达人推广',
    quality_upgrade:'品质升级',
    new_product:'新品',
    open_nearby:'附近开店',
    grab_site:'抢占铺位',
    accelerate_expansion:'加速扩张',
    poach_staff:'挖员工',
    membership_push:'会员促销',
    private_traffic:'私域运营',
    copy_site:'复制选址',
    copy_delivery:'复制外卖策略',
    retreat:'收缩',
    close_store:'闭店',
    delay_expansion:'延缓扩张',
    renegotiate_rent:'重新谈租',
    public_relations:'公关',
    full_rectification:'全面整改'
  };

  return (
    fallback[
      actionId
    ] ||
    '观察'
  );
}

function competitorDetail(
  competitor,
  districtId
) {
  const stores =
    (
      competitor.stores ||
      []
    ).filter(
      store =>
        store.status ===
          'operating' &&
        (
          !districtId ||
          store.districtId ===
            districtId
        )
    );

  const pipeline =
    (
      competitor
        .openingPipeline ||
      []
    ).filter(
      row =>
        !districtId ||
        row.districtId ===
          districtId
    );

  const owner =
    competitor
      .ownerProfile;

  return {
    id:
      competitor.id,
    name:
      competitor.name,
    tier:
      competitor
        .simulationTier ||
      'background',
    brandPower:
      Math.round(
        Number(
          competitor.brandPower
        ) ||
        0
      ),
    reputation:
      Math.round(
        Number(
          competitor.reputation
        ) ||
        0
      ),
    management:
      Math.round(
        Number(
          competitor
            .managementCapacity
        ) ||
        0
      ),
    storeCount:
      stores.length,
    totalStoreCount:
      (
        competitor.stores ||
        []
      ).filter(
        row =>
          row.status ===
          'operating'
      ).length,
    openingCount:
      pipeline.length,
    actionId:
      competitor
        .livePressure &&
      competitor
        .livePressure
        .lastActionId ||
      'observe',
    actionName:
      actionName(
        competitor
          .livePressure &&
        competitor
          .livePressure
          .lastActionId ||
        'observe'
      ),
    ownerName:
      owner &&
      owner.name ||
      '',
    ownerTraits:
      (
        owner &&
        owner
          .personalityLabels ||
        []
      ).slice(
        0,
        2
      ),
    score:
      Math.round(
        (
          Number(
            competitor.brandPower
          ) ||
          0
        ) *
          0.42 +
        (
          Number(
            competitor.reputation
          ) ||
          0
        ) *
          0.34 +
        (
          Number(
            competitor
              .managementCapacity
          ) ||
          0
        ) *
          0.18 +
        Math.min(
          12,
          stores.length *
            2
        )
      )
  };
}

function getCompetitors(
  districtId,
  limit=20
) {
  const world =
    liveWorldSystem
      .initialize(
        currentDay()
      );

  return world.competitors
    .filter(
      competitor =>
        (
          competitor.stores ||
          []
        ).some(
          store =>
            store.status ===
              'operating' &&
            (
              !districtId ||
              store.districtId ===
                districtId
            )
        ) ||
        (
          competitor
            .openingPipeline ||
          []
        ).some(
          row =>
            !districtId ||
            row.districtId ===
              districtId
        )
    )
    .map(
      competitor =>
        competitorDetail(
          competitor,
          districtId
        )
    )
    .sort(
      (
        a,
        b
      ) =>
        b.score -
        a.score
    )
    .slice(
      0,
      limit
    );
}

function playerRankingRow(
  shop
) {
  let dashboard =
    null;

  try {
    dashboard =
      operations
        .dashboard(
          shop.id
        );
  } catch (error) {
  }

  const finance =
    dashboard &&
    dashboard.finance ||
    {};

  const rating =
    Number(
      dashboard &&
      dashboard.shopRating
    ) ||
    4;

  const profitRate =
    Number(
      finance.profitRate
    ) ||
    0;

  const revenue =
    Math.max(
      0,
      Number(
        finance.revenue
      ) ||
      0
    );

  const reputation =
    Number(
      gameState
        .getPlayer()
        .reputation
    ) ||
    0;

  const score =
    Math.round(
      clamp(
        25 +
        rating *
          8 +
        clamp(
          profitRate,
          -20,
          35
        ) *
          0.35 +
        Math.log10(
          Math.max(
            1,
            revenue
          )
        ) *
          3 +
        Math.log10(
          Math.max(
            1,
            reputation +
            1
          )
        ) *
          4,
        0,
        100
      )
    );

  return {
    id:
      'player_' +
      shop.id,
    isPlayer:true,
    name:
      shop.name ||
      gameState
        .getPlayer()
        .brandName ||
      '我的门店',
    score,
    storeCount:1,
    actionName:'玩家经营',
    rating:
      Number(
        rating
      ).toFixed(
        1
      )
  };
}

function getDistrictRanking(
  districtId,
  shopId,
  limit=12
) {
  // V085_PIN_PLAYER_REAL_RANK
  const shop =
    getShop(
      shopId
    );

  const rows =
    getCompetitors(
      districtId,
      320
    ).map(
      row => ({
        ...row,
        isPlayer:false
      })
    );

  let playerRow =
    null;

  if (
    shop &&
    (
      !districtId ||
      shop.districtId ===
        districtId
    )
  ) {
    playerRow =
      playerRankingRow(
        shop
      );

    rows.push(
      playerRow
    );
  }

  rows.sort(
    (
      a,
      b
    ) =>
      b.score -
      a.score ||
      String(
        a.name
      ).localeCompare(
        String(
          b.name
        ),
        'zh-CN'
      )
  );

  const ranked =
    rows.map(
      (
        row,
        index
      ) => ({
        ...row,
        rank:
          index +
          1
      })
    );

  const safeLimit =
    Math.max(
      1,
      Number(
        limit
      ) ||
      12
    );

  const top =
    ranked.slice(
      0,
      safeLimit
    );

  if (
    !playerRow ||
    top.some(
      row =>
        row.isPlayer
    )
  ) {
    return top;
  }

  const player =
    ranked.find(
      row =>
        row.isPlayer
    );

  if (!player) {
    return top;
  }

  if (
    safeLimit ===
    1
  ) {
    return [
      player
    ];
  }

  return [
    ...top.slice(
      0,
      safeLimit -
      1
    ),
    player
  ];
}

function getMarketEvents(
  districtId,
  limit=12
) {
  const state =
    liveWorldSystem
      .getState();

  return (
    state.marketHistory ||
    []
  )
    .filter(
      row =>
        !districtId ||
        !row.districtId ||
        row.districtId ===
          districtId
    )
    .slice(
      0,
      limit
    )
    .map(
      row => ({
        ...clone(
          row
        ),
        actionName:
          row.actionId
            ? actionName(
                row.actionId
              )
            : null
      })
    );
}

function getBusinessCenter(
  shopId
) {
  const shop =
    getShop(
      shopId
    );

  if (!shop) {
    return null;
  }

  const market =
    liveWorldSystem
      .getDistrictDashboard(
        shop.districtId
      );

  const staff =
    liveWorldSystem
      .getStaffSummary(
        shop.id
      );

  return {
    shop:
      clone(
        shop
      ),
    market,
    staff,
    roster:
      getStaffRoster(
        shop.id
      ),
    competitors:
      getCompetitors(
        shop.districtId,
        10
      ),
    ranking:
      getDistrictRanking(
        shop.districtId,
        shop.id,
        12
      ),
    events:
      getMarketEvents(
        shop.districtId,
        12
      )
  };
}

module.exports = {
  currentDay,
  getStaffRoster,
  manageStaff,
  getCompetitors,
  getDistrictRanking,
  getMarketEvents,
  getBusinessCenter,
  actionName
};
