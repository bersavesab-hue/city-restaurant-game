'use strict';

const gameState =
  require('../core/gameState.js');

const citySystem =
  require('../city/citySystem.js');

const openingConfig =
  require('../opening/openingConfig.js');

const personRules =
  require('../person/personRulesV10.js');

const personEngine =
  require('../systems/personEngine.js');

const competitorRules =
  require('../competitor/competitorRulesV10.js');

const competitorEngine =
  require('../competitor/competitorEngineV10.js');

const { SeededRng } =
  require('../foundation/rng.js');

const DISTRICT_IDS = [
  'university',
  'cbd',
  'hightech',
  'oldtown',
  'village',
  'market',
  'industry'
];

const ROLE_MAP = {
  manager:'manager',
  chef:'chef',
  server:'waiter',
  cashier:'cashier'
};

function clone(v) {
  return JSON.parse(
    JSON.stringify(v)
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

function defaultState() {
  return {
    version:'0.8.4',
    initialized:false,
    lastProcessedDay:null,
    competitors:[],
    competitorCounts:{
      core:0,
      local:0,
      background:0
    },
    districtPressure:{},
    staffHistory:[],
    marketHistory:[],
    metrics:{
      competitorActions:0,
      openings:0,
      closures:0,
      staffDepartures:0,
      staffEntrepreneurs:0
    }
  };
}

function getState() {
  const world =
    gameState.getWorld();

  if (
    typeof gameState.getLiveWorld ===
    'function'
  ) {
    const state =
      gameState.getLiveWorld();

    if (
      !state ||
      typeof state !==
        'object'
    ) {
      world.liveWorld =
        defaultState();
    }
  }

  if (
    !world.liveWorld ||
    typeof world.liveWorld !==
      'object'
  ) {
    world.liveWorld =
      defaultState();
  }

  const state =
    world.liveWorld;

  state.version =
    '0.8.4';

  state.competitors =
    Array.isArray(
      state.competitors
    )
      ? state.competitors
      : [];

  state.competitorCounts =
    state.competitorCounts ||
    {
      core:0,
      local:0,
      background:0
    };

  state.districtPressure =
    state.districtPressure ||
    {};

  state.staffHistory =
    Array.isArray(
      state.staffHistory
    )
      ? state.staffHistory
      : [];

  state.marketHistory =
    Array.isArray(
      state.marketHistory
    )
      ? state.marketHistory
      : [];

  state.metrics =
    state.metrics ||
    {
      competitorActions:0,
      openings:0,
      closures:0,
      staffDepartures:0,
      staffEntrepreneurs:0
    };

  return state;
}

function reset() {
  gameState
    .getWorld()
    .liveWorld =
    defaultState();

  return getState();
}

function validDistrictIds() {
  const ids =
    DISTRICT_IDS.filter(
      id =>
        !!citySystem
          .getDistrict(id)
    );

  return ids.length
    ? ids
    : DISTRICT_IDS.slice();
}

function pushNews(
  title,
  detail,
  day,
  severity='info'
) {
  const simulation =
    gameState
      .getSimulation();

  simulation.newsFeed =
    Array.isArray(
      simulation.newsFeed
    )
      ? simulation.newsFeed
      : [];

  simulation.newsFeed.unshift({
    id:
      'live_world_' +
      day +
      '_' +
      simulation.newsFeed.length +
      '_' +
      title,
    title,
    detail,
    day,
    severity
  });

  simulation.newsFeed =
    simulation.newsFeed
      .slice(
        0,
        60
      );
}

function assignDistricts(
  competitors,
  rng
) {
  const ids =
    validDistrictIds();

  for (
    const competitor
    of competitors
  ) {
    for (
      const store
      of competitor.stores ||
      []
    ) {
      if (
        !store.districtId ||
        ids.indexOf(
          store.districtId
        ) < 0
      ) {
        store.districtId =
          rng.pick(ids);
      }
    }

    if (
      competitor.simulationTier ===
        'core' &&
      !competitor.ownerProfile
    ) {
      const owner =
        personRules
          .createPersonProfile(
            rng,
            {
              age:
                rng.int(
                  25,
                  55
                )
            }
          );

      owner.id =
        'owner_' +
        competitor.id;

      personRules
        .assignRole(
          owner,
          'competitor_owner',
          {
            allowLowFit:true,
            employerId:
              competitor.id
          }
        );

      competitor.ownerPersonId =
        owner.id;

      competitor.ownerProfile =
        owner;
    }

    competitor.livePressure =
      competitor.livePressure ||
      {
        marketing:0,
        price:0,
        imitation:0,
        poaching:0,
        lastActionId:'observe'
      };
  }
}

function initialize(
  day=1
) {
  const state =
    getState();

  if (
    state.initialized &&
    state.competitors.length
  ) {
    return state;
  }

  const seed =
    gameState
      .getSimulation()
      .seed ||
    'city';

  const rng =
    new SeededRng(
      'live-world-v084:' +
      seed
    );

  const population =
    competitorRules
      .createMarketPopulation(
        rng,
        {
          businessCount:300,
          coreCount:12,
          localCount:28,
          currentDay:day
        }
      );

  state.competitors =
    population.entities;

  state.competitorCounts =
    population.counts;

  assignDistricts(
    state.competitors,
    rng
  );

  state.initialized =
    true;

  recalcDistrictPressure(
    state
  );

  return state;
}

function latestShopFinancial(
  shop
) {
  const business =
    gameState
      .getBusiness();

  const stored =
    business
      .restaurantOperations &&
    business
      .restaurantOperations
      .shops &&
    business
      .restaurantOperations
      .shops[shop.id];

  if (!stored) {
    return {
      revenue:0,
      profit:0,
      rating:4,
      reviews:0,
      queue:0,
      snapshots:[]
    };
  }

  const snapshots =
    Array.isArray(
      stored.dailySnapshots
    )
      ? stored.dailySnapshots
      : [];

  const last =
    snapshots.length
      ? snapshots[
          snapshots.length - 1
        ]
      : null;

  const financial =
    last &&
    last.financial ||
    stored.ledger ||
    {};

  const floor =
    stored.floor &&
    stored.floor.metrics ||
    {};

  return {
    revenue:
      Number(
        financial.revenue
      ) || 0,
    profit:
      Number(
        financial.profit
      ) || 0,
    rating:
      Number(
        stored.shop &&
        stored.shop.rating
      ) || 4,
    reviews:
      Number(
        stored.shop &&
        stored.shop.reviewCount
      ) || 0,
    queue:
      Number(
        floor.peakQueueToday
      ) || 0,
    snapshots
  };
}

function playerSignal(
  districtId
) {
  const business =
    gameState
      .getBusiness();

  const shops =
    (
      business.shops ||
      []
    ).filter(
      shop =>
        shop.status ===
          'open' &&
        shop.districtId ===
          districtId
    );

  const district =
    citySystem
      .getDistrict(
        districtId
      );

  if (!shops.length) {
    return {
      marketShare:0,
      queueSignal:0,
      socialBuzz:0,
      successVisibility:0,
      copyDifficulty:0.55,
      sustainedProfitDays:0
    };
  }

  let revenue = 0;
  let profit = 0;
  let rating = 0;
  let reviews = 0;
  let queue = 0;
  let positiveDays = 0;

  for (
    const shop
    of shops
  ) {
    const row =
      latestShopFinancial(
        shop
      );

    revenue += row.revenue;
    profit += row.profit;
    rating += row.rating;
    reviews += row.reviews;
    queue =
      Math.max(
        queue,
        row.queue
      );

    let streak = 0;

    for (
      let i =
        row.snapshots.length -
        1;
      i >= 0;
      i--
    ) {
      const snap =
        row.snapshots[i];

      if (
        Number(
          snap &&
          snap.financial &&
          snap.financial.profit
        ) > 0
      ) {
        streak += 1;
      } else {
        break;
      }
    }

    positiveDays =
      Math.max(
        positiveDays,
        streak
      );
  }

  const avgRating =
    rating /
    Math.max(
      1,
      shops.length
    );

  const restaurantCount =
    Math.max(
      1,
      Number(
        district &&
        district.restaurantCount
      ) || 1
    );

  const marketShare =
    clamp(
      shops.length /
      restaurantCount,
      0,
      1
    );

  const successVisibility =
    clamp(
      (
        avgRating - 3.5
      ) *
        24 +
      Math.log10(
        Math.max(
          1,
          revenue
        )
      ) *
        10 +
      Math.min(
        25,
        reviews *
          0.18
      ),
      0,
      100
    );

  return {
    marketShare,
    queueSignal:
      clamp(
        queue /
        10,
        0,
        1
      ),
    socialBuzz:
      clamp(
        (
          avgRating - 3
        ) /
          2 *
          0.65 +
        Math.min(
          0.35,
          reviews /
            300
        ),
        0,
        1
      ),
    successVisibility,
    copyDifficulty:0.55,
    sustainedProfitDays:
      positiveDays,
    revenue,
    profit,
    avgRating
  };
}

function districtForCompetitor(
  competitor
) {
  const operating =
    (
      competitor.stores ||
      []
    ).filter(
      store =>
        store.status ===
        'operating' &&
        store.districtId
    );

  if (operating.length) {
    return operating[0]
      .districtId;
  }

  const pipeline =
    (
      competitor.openingPipeline ||
      []
    ).find(
      row =>
        row.districtId
    );

  return pipeline
    ? pipeline.districtId
    : validDistrictIds()[0];
}

function marketContext(
  competitor,
  day
) {
  const districtId =
    districtForCompetitor(
      competitor
    );

  const district =
    citySystem
      .getDistrict(
        districtId
      ) ||
    {};

  const saturation =
    clamp(
      Number(
        district.saturation
      ) || 70,
      0,
      100
    );

  const rentIndex =
    Number(
      district.rentIndex
    ) || 1;

  const signal =
    playerSignal(
      districtId
    );

  return {
    districtId,
    day,
    market:{
      districtId,
      day,
      demandGapRatio:
        clamp(
          (
            80 -
            saturation
          ) *
            0.42,
          -25,
          35
        ),
      profitMargin:
        Number(
          competitor
            .metrics &&
          competitor
            .metrics
            .profitMargin
        ) *
        100,
      demandGrowth:
        clamp(
          Number(
            district
              .demandDeltaRatio
          ) *
          100,
          -30,
          40
        ),
      vacancyAvailability:
        clamp(
          100 -
          saturation *
            0.72,
          15,
          90
        ),
      saturation,
      rentPressure:
        clamp(
          45 +
          (
            rentIndex -
            1
          ) *
            70,
          5,
          95
        ),
      avgMonthlyFixedCost:
        42000 +
        rentIndex *
          12000
    },
    playerSignal:
      signal
  };
}

function recordMarketEvent(
  state,
  row
) {
  state.marketHistory.unshift(
    row
  );

  state.marketHistory =
    state.marketHistory
      .slice(
        0,
        180
      );
}

function closeOneStore(
  competitor,
  districtId
) {
  const candidates =
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

  const target =
    candidates[
      candidates.length - 1
    ];

  if (!target) {
    return null;
  }

  target.status =
    'closed';

  target.closedReason =
    '经营压力';

  return target;
}

function applyAction(
  state,
  competitor,
  actionId,
  ctx,
  day,
  rng
) {
  competitor.livePressure =
    competitor.livePressure ||
    {
      marketing:0,
      price:0,
      imitation:0,
      poaching:0,
      lastActionId:'observe'
    };

  const pressure =
    competitor.livePressure;

  pressure.lastActionId =
    actionId;

  if (
    [
      'ads',
      'coupon',
      'influencer',
      'membership_push',
      'private_traffic'
    ].includes(
      actionId
    )
  ) {
    pressure.marketing =
      clamp(
        pressure.marketing +
        0.16,
        0,
        1
      );
  }

  if (
    actionId ===
      'price_cut'
  ) {
    pressure.price =
      clamp(
        pressure.price +
        0.18,
        0,
        1
      );
  }

  if (
    [
      'menu_follow',
      'bundle_follow',
      'copy_site',
      'copy_delivery',
      'new_product'
    ].includes(
      actionId
    )
  ) {
    pressure.imitation =
      clamp(
        pressure.imitation +
        0.15,
        0,
        1
      );
  }

  if (
    actionId ===
      'poach_staff'
  ) {
    pressure.poaching =
      clamp(
        pressure.poaching +
        0.22,
        0,
        1
      );
  }

  if (
    [
      'open_nearby',
      'grab_site',
      'accelerate_expansion'
    ].includes(
      actionId
    )
  ) {
    const open =
      competitorEngine
        .beginOpening(
          competitor,
          {
            ...ctx.market,
            ...ctx.playerSignal,
            districtId:
              ctx.districtId,
            categoryId:
              'restaurant',
            day
          },
          rng
        );

    if (open.ok) {
      recordMarketEvent(
        state,
        {
          day,
          type:'opening_started',
          competitorId:
            competitor.id,
          competitorName:
            competitor.name,
          districtId:
            ctx.districtId
        }
      );
    }
  }

  if (
    actionId ===
      'close_store'
  ) {
    const closed =
      closeOneStore(
        competitor,
        ctx.districtId
      );

    if (closed) {
      state.metrics
        .closures +=
        1;

      recordMarketEvent(
        state,
        {
          day,
          type:'store_closed',
          competitorId:
            competitor.id,
          competitorName:
            competitor.name,
          districtId:
            closed.districtId
        }
      );

      pushNews(
        '竞品闭店',
        competitor.name +
          '在' +
          closed.districtId +
          '的一家门店退出经营',
        day,
        'info'
      );
    }
  }

  if (
    actionId ===
      'retreat'
  ) {
    pressure.marketing *=
      0.7;

    pressure.price *=
      0.7;

    pressure.imitation *=
      0.7;
  }

  competitor.lastDecisionDay =
    day;

  state.metrics
    .competitorActions +=
    1;

  recordMarketEvent(
    state,
    {
      day,
      type:'competitor_action',
      competitorId:
        competitor.id,
      competitorName:
        competitor.name,
      districtId:
        ctx.districtId,
      actionId
    }
  );
}

function decayPressure(
  competitor
) {
  const p =
    competitor.livePressure;

  if (!p) {
    return;
  }

  p.marketing *= 0.84;
  p.price *= 0.82;
  p.imitation *= 0.88;
  p.poaching *= 0.72;
}

function simulateMonthlyFinance(
  state,
  competitor,
  day,
  rng
) {
  const operating =
    (
      competitor.stores ||
      []
    ).filter(
      store =>
        store.status ===
        'operating'
    );

  if (!operating.length) {
    return;
  }

  const brand =
    Number(
      competitor.brandPower
    ) || 45;

  const revenue =
    operating.length *
    (
      36000 +
      brand *
        650
    ) *
    (
      0.82 +
      rng.next() *
        0.36
    );

  const margin =
    clamp(
      8 +
      (
        competitor.qualityFocus -
        50
      ) *
        0.08 +
      (
        competitor.managementCapacity -
        50
      ) *
        0.07 -
      (
        competitor.livePressure &&
        competitor.livePressure.price ||
        0
      ) *
        8 +
      (
        rng.next() -
        0.5
      ) *
        10,
      -18,
      24
    ) /
    100;

  const profit =
    revenue *
    margin;

  const month =
    competitorEngine
      .monthlyTick(
        competitor,
        {
          revenue,
          profit,
          marketShare:
            Number(
              competitor
                .metrics &&
              competitor
                .metrics
                .marketShare
            ) || 0,
          rating:
            Number(
              competitor
                .metrics &&
              competitor
                .metrics
                .customerRating
            ) || 4,
          monthlyFixedCost:
            operating.length *
            42000
        }
      );

  if (
    month.closureRisk >=
      82 &&
    rng.next() <
      0.32
  ) {
    const closed =
      closeOneStore(
        competitor
      );

    if (closed) {
      state.metrics
        .closures +=
        1;

      recordMarketEvent(
        state,
        {
          day,
          type:'store_closed',
          competitorId:
            competitor.id,
          competitorName:
            competitor.name,
          districtId:
            closed.districtId,
          reason:'financial'
        }
      );
    }
  }
}

function processCompetitors(
  state,
  day
) {
  const seed =
    gameState
      .getSimulation()
      .seed ||
    'city';

  const rng =
    new SeededRng(
      'competitor-day:' +
      seed +
      ':' +
      day
    );

  for (
    const competitor
    of state.competitors
  ) {
    decayPressure(
      competitor
    );
  }

  const result =
    competitorEngine
      .tickPopulation(
        state.competitors,
        day,
        competitor =>
          marketContext(
            competitor,
            day
          ),
        rng
      );

  for (
    const row
    of result.actions
  ) {
    const competitor =
      state.competitors.find(
        item =>
          item.id ===
          row.competitorId
      );

    if (!competitor) {
      continue;
    }

    const ctx =
      marketContext(
        competitor,
        day
      );

    applyAction(
      state,
      competitor,
      row.actionId,
      ctx,
      day,
      rng
    );
  }

  for (
    const competitor
    of state.competitors
  ) {
    if (
      competitor.simulationTier ===
        'background'
    ) {
      continue;
    }

    const opened =
      competitorEngine
        .advanceOpening(
          competitor,
          1,
          rng
        );

    if (opened.length) {
      state.metrics
        .openings +=
        opened.length;

      for (
        const storeId
        of opened
      ) {
        const store =
          (
            competitor.stores ||
            []
          ).find(
            item =>
              item.id ===
              storeId
          );

        recordMarketEvent(
          state,
          {
            day,
            type:'store_opened',
            competitorId:
              competitor.id,
            competitorName:
              competitor.name,
            districtId:
              store &&
              store.districtId
          }
        );

        pushNews(
          '竞品开店',
          competitor.name +
            '完成一家新店开业',
          day,
          'info'
        );
      }
    }

    if (
      day %
      30 ===
      0
    ) {
      simulateMonthlyFinance(
        state,
        competitor,
        day,
        rng
      );
    }
  }

  return result;
}

function roleRequired(
  shop,
  role
) {
  if (
    role.id ===
    'manager'
  ) {
    return 1;
  }

  const seats =
    Math.max(
      1,
      Number(
        shop.seatEstimate ||
        shop.seats ||
        30
      )
    );

  return Math.max(
    1,
    Math.ceil(
      seats /
      role.seatsPerWorker
    )
  );
}

function ensureStaffPerson(
  staff,
  shopId,
  index,
  day
) {
  if (
    staff.personProfile &&
    typeof staff.personProfile ===
      'object'
  ) {
    return staff
      .personProfile;
  }

  const seed =
    gameState
      .getSimulation()
      .seed ||
    'city';

  const rng =
    new SeededRng(
      'legacy-staff:' +
      seed +
      ':' +
      shopId +
      ':' +
      (
        staff.id ||
        index
      )
    );

  const profile =
    personRules
      .createPersonProfile(
        rng,
        {
          name:
            staff.name,
          age:
            Number(
              staff.age
            ) ||
            rng.int(
              20,
              48
            )
        }
      );

  profile.id =
    staff.personId ||
    'person_' +
      (
        staff.id ||
        shopId +
        '_' +
        index
      );

  const mapped =
    ROLE_MAP[
      staff.roleId
    ] ||
    'waiter';

  personRules
    .assignRole(
      profile,
      mapped,
      {
        allowLowFit:true,
        employerId:
          shopId,
        date:
          day
      }
    );

  staff.personId =
    profile.id;

  staff.personProfile =
    profile;

  return profile;
}

function spawnEntrepreneur(
  state,
  staff,
  profile,
  shop,
  day,
  rng
) {
  personEngine
    .changeRole(
      profile,
      'competitor_owner',
      {
        allowLowFit:true,
        employerId:null,
        date:day
      }
    );

  const competitor =
    competitorRules
      .createCompetitor(
        rng,
        {
          ownerPersonId:
            profile.id,
          currentDay:
            day,
          simulationTier:
            'core',
          storeCount:1,
          minCash:
            50000
        }
      );

  competitor.ownerProfile =
    clone(
      profile
    );

  competitor.name =
    profile.name +
    '餐饮';

  if (
    competitor.stores &&
    competitor.stores[0]
  ) {
    competitor.stores[0]
      .districtId =
      shop.districtId;
  }

  state.competitors.unshift(
    competitor
  );

  state.metrics
    .staffEntrepreneurs +=
    1;

  recordMarketEvent(
    state,
    {
      day,
      type:'staff_entrepreneur',
      personId:
        profile.id,
      personName:
        profile.name,
      competitorId:
        competitor.id,
      competitorName:
        competitor.name,
      districtId:
        shop.districtId
    }
  );

  pushNews(
    '员工创业',
    profile.name +
      '离职后在本地开始筹备自己的餐饮生意',
    day,
    'warning'
  );

  return competitor;
}

function processStaffDay(
  state,
  day
) {
  const business =
    gameState
      .getBusiness();

  const prep =
    gameState
      .getOpeningPrep();

  const shops =
    Array.isArray(
      business.shops
    )
      ? business.shops
      : [];

  const seed =
    gameState
      .getSimulation()
      .seed ||
    'city';

  for (
    const shop
    of shops
  ) {
    const staffState =
      prep.staffing &&
      prep.staffing[
        shop.id
      ];

    if (
      !staffState ||
      !Array.isArray(
        staffState.hired
      ) ||
      !staffState.hired.length
    ) {
      continue;
    }

    const required = {};

    for (
      const role
      of openingConfig.roles
    ) {
      required[
        role.id
      ] =
        roleRequired(
          shop,
          role
        );
    }

    const current = {};

    for (
      const staff
      of staffState.hired
    ) {
      current[
        staff.roleId
      ] =
        (
          current[
            staff.roleId
          ] ||
          0
        ) +
        1;
    }

    const district =
      getDistrictDashboard(
        shop.districtId
      );

    const stored =
      business
        .restaurantOperations &&
      business
        .restaurantOperations
        .shops &&
      business
        .restaurantOperations
        .shops[shop.id];

    const floorMetrics =
      stored &&
      stored.floor &&
      stored.floor.metrics ||
      {};

    const payableAge =
      Number(
        stored &&
        stored.simulation &&
        stored.simulation
          .payableAgeDays
      ) || 0;

    const manager =
      staffState.hired.find(
        row =>
          row.roleId ===
          'manager'
      );

    let managerQuality =
      55;

    if (manager) {
      const profile =
        ensureStaffPerson(
          manager,
          shop.id,
          0,
          day
        );

      managerQuality =
        clamp(
          (
            profile.skills
              .management ||
            manager.skill ||
            55
          ) *
            0.7 +
          (
            profile.personality
              .empathy ||
            50
          ) *
            0.3,
          25,
          95
        );
    }

    const removals = [];

    for (
      let index = 0;
      index <
      staffState.hired.length;
      index++
    ) {
      const staff =
        staffState.hired[
          index
        ];

      const profile =
        ensureStaffPerson(
          staff,
          shop.id,
          index,
          day
        );

      const role =
        openingConfig
          .roles
          .find(
            row =>
              row.id ===
              staff.roleId
          );

      const shortage =
        role
          ? Math.max(
              0,
              required[
                role.id
              ] -
              (
                current[
                  role.id
                ] ||
                0
              )
            ) /
            Math.max(
              1,
              required[
                role.id
              ]
            )
          : 0;

      const workload =
        clamp(
          48 +
          shortage *
            38 +
          Math.min(
            24,
            Number(
              floorMetrics
                .peakQueueToday
            ) *
              2.4
          ) +
          payableAge *
            1.5,
          20,
          100
        );

      const payBase =
        role
          ? role.baseWage
          : Number(
              staff.wage
            ) || 4500;

      const payFairness =
        clamp(
          50 +
          (
            (
              Number(
                staff.wage
              ) ||
              payBase
            ) /
              Math.max(
                1,
                payBase
              ) -
            1
          ) *
            80 -
          payableAge *
            5,
          15,
          90
        );

      const career =
        staff.career ||
        {};

      const careerUnavailable =
        (
          career.training &&
          Number(
            career.training
              .finishDay
          ) >
            day
        ) ||
        (
          career.leave &&
          Number(
            career.leave
              .untilDay
          ) >
            day
        );

      personEngine
        .dailyTick(
          profile,
          {
            workload:
              careerUnavailable
                ? 15
                : workload,
            overtime:
              careerUnavailable
                ? 0
                : workload >
                    78
                  ? 22
                  : workload >
                      65
                    ? 10
                    : 0,
            dayOff:
              careerUnavailable,
            managerQuality,
            payFairness,
            teamClimate:
              clamp(
                68 -
                shortage *
                  20 -
                payableAge *
                  4,
                20,
                88
              ),
            outsideOffer:
              district
                .laborPoachStrength *
              100
          }
        );

      personEngine
        .decayMemories(
          profile,
          1
        );

      const turnoverRisk =
        personEngine
          .turnoverRisk(
            profile,
            {
              payGapPct:
                Math.max(
                  0,
                  50 -
                  payFairness
                ),
              outsideOfferStrength:
                district
                  .laborPoachStrength *
                100
            }
          );

      const entrepreneurship =
        personEngine
          .entrepreneurshipScore(
            profile,
            {
              marketOpportunity:
                clamp(
                  100 -
                  district.intensity,
                  20,
                  80
                )
            }
          );

      staff.live = {
        mood:
          Math.round(
            profile.state.mood
          ),
        energy:
          Math.round(
            profile.state.energy
          ),
        stress:
          Math.round(
            profile.state.stress
          ),
        satisfaction:
          Math.round(
            profile.state
              .satisfaction
          ),
        loyalty:
          Math.round(
            profile.state.loyalty
          ),
        turnoverRisk:
          Math.round(
            turnoverRisk
          ),
        entrepreneurship:
          Math.round(
            entrepreneurship
          ),
        lastUpdatedDay:
          day
      };

      const rng =
        new SeededRng(
          'staff-day:' +
          seed +
          ':' +
          day +
          ':' +
          profile.id
        );

      const tenure =
        Math.max(
          0,
          day -
          Number(
            staff.hiredDay ||
            day
          )
        );

      const leaveChance =
        turnoverRisk >=
          68
          ? Math.min(
              0.075,
              (
                turnoverRisk -
                60
              ) /
              700
            )
          : 0;

      const entrepreneurChance =
        entrepreneurship >=
          84 &&
        tenure >=
          45
          ? Math.min(
              0.022,
              (
                entrepreneurship -
                80
              ) /
              700
            )
          : 0;

      let reason =
        null;

      if (
        entrepreneurChance >
          0 &&
        rng.next() <
          entrepreneurChance
      ) {
        reason =
          'entrepreneurship';
      } else if (
        leaveChance >
          0 &&
        rng.next() <
          leaveChance
      ) {
        reason =
          turnoverRisk >=
            82
            ? 'high_pressure'
            : 'outside_offer';
      }

      if (reason) {
        removals.push({
          staff,
          profile,
          reason,
          rng
        });
      }
    }

    for (
      const item
      of removals
    ) {
      const index =
        staffState.hired
          .findIndex(
            row =>
              row.id ===
              item.staff.id
          );

      if (index >= 0) {
        staffState.hired.splice(
          index,
          1
        );
      }

      state.metrics
        .staffDepartures +=
        1;

      const historyRow = {
        day,
        type:'staff_departure',
        shopId:
          shop.id,
        shopName:
          shop.name,
        personId:
          item.profile.id,
        personName:
          item.profile.name,
        roleId:
          item.staff.roleId,
        reason:
          item.reason
      };

      state.staffHistory.unshift(
        historyRow
      );

      state.staffHistory =
        state.staffHistory
          .slice(
            0,
            120
          );

      if (
        item.reason ===
        'entrepreneurship'
      ) {
        spawnEntrepreneur(
          state,
          item.staff,
          item.profile,
          shop,
          day,
          item.rng
        );
      } else {
        pushNews(
          '员工离职',
          item.profile.name +
            '离开了' +
            (
              shop.name ||
              '门店'
            ) +
            (
              item.reason ===
                'outside_offer'
                ? '，外部岗位吸引力较高'
                : '，近期工作压力偏高'
            ),
          day,
          'warning'
        );
      }
    }
  }
}

function recalcDistrictPressure(
  state
) {
  const result = {};

  for (
    const id
    of validDistrictIds()
  ) {
    result[id] = {
      competitorCount:0,
      coreCount:0,
      localCount:0,
      marketing:0,
      price:0,
      imitation:0,
      poaching:0,
      openings:0
    };
  }

  for (
    const competitor
    of state.competitors
  ) {
    const tier =
      competitor.simulationTier ||
      'background';

    for (
      const store
      of competitor.stores ||
      []
    ) {
      if (
        store.status !==
          'operating' ||
        !result[
          store.districtId
        ]
      ) {
        continue;
      }

      const row =
        result[
          store.districtId
        ];

      row.competitorCount +=
        1;

      if (
        tier ===
        'core'
      ) {
        row.coreCount +=
          1;
      } else if (
        tier ===
        'local'
      ) {
        row.localCount +=
          1;
      }

      const p =
        competitor.livePressure ||
        {};

      const weight =
        tier ===
          'core'
          ? 1
          : tier ===
              'local'
            ? 0.38
            : 0.08;

      row.marketing +=
        Number(
          p.marketing
        ) *
        weight;

      row.price +=
        Number(
          p.price
        ) *
        weight;

      row.imitation +=
        Number(
          p.imitation
        ) *
        weight;

      row.poaching +=
        Number(
          p.poaching
        ) *
        weight;
    }

    for (
      const pipeline
      of competitor
        .openingPipeline ||
      []
    ) {
      if (
        pipeline.districtId &&
        result[
          pipeline.districtId
        ]
      ) {
        result[
          pipeline.districtId
        ].openings +=
          1;
      }
    }
  }

  for (
    const [
      districtId,
      row
    ]
    of Object.entries(
      result
    )
  ) {
    const tactical =
      clamp(
        row.coreCount *
          2.2 +
        row.localCount *
          0.55,
        0,
        40
      );

    row.intensity =
      Math.round(
        clamp(
          tactical *
            1.4 +
          row.marketing *
            18 +
          row.price *
            16 +
          row.imitation *
            8,
          0,
          100
        )
      );

    row.playerDemandMultiplier =
      clamp(
        1 -
        row.intensity /
          100 *
          0.11,
        0.86,
        1.02
      );

    row.laborPoachStrength =
      clamp(
        row.poaching /
        Math.max(
          1,
          row.coreCount +
          row.localCount *
            0.4
        ),
        0,
        0.45
      );

    row.intensityLabel =
      row.intensity >=
        75
        ? '激烈'
        : row.intensity >=
            50
          ? '偏高'
          : row.intensity >=
              25
            ? '中等'
            : '温和';

    row.districtId =
      districtId;
  }

  state.districtPressure =
    result;

  return result;
}

function processDay(
  day,
  extra={}
) {
  const state =
    initialize(
      day
    );

  if (
    Number(
      state.lastProcessedDay
    ) ===
    Number(
      day
    )
  ) {
    return {
      changed:false,
      districtPressure:
        state.districtPressure
    };
  }

  const competition =
    processCompetitors(
      state,
      day
    );

  recalcDistrictPressure(
    state
  );

  processStaffDay(
    state,
    day
  );

  recalcDistrictPressure(
    state
  );

  state.lastProcessedDay =
    day;

  state.marketHistory =
    state.marketHistory
      .slice(
        0,
        180
      );

  return {
    changed:
      competition.actions.length >
        0,
    processedCompetitors:
      competition.processed,
    actions:
      competition.actions.length,
    districtPressure:
      clone(
        state.districtPressure
      ),
    extra
  };
}

function getDistrictDashboard(
  districtId
) {
  const state =
    initialize(
      Number(
        getState()
          .lastProcessedDay
      ) || 1
    );

  if (
    !state.districtPressure ||
    !state.districtPressure[
      districtId
    ]
  ) {
    recalcDistrictPressure(
      state
    );
  }

  return clone(
    state.districtPressure[
      districtId
    ] ||
    {
      districtId,
      competitorCount:0,
      coreCount:0,
      localCount:0,
      openings:0,
      intensity:0,
      intensityLabel:'温和',
      playerDemandMultiplier:1,
      laborPoachStrength:0
    }
  );
}

function getTopCompetitors(
  districtId,
  limit=5
) {
  const state =
    initialize(
      Number(
        getState()
          .lastProcessedDay
      ) || 1
    );

  return state.competitors
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
        )
    )
    .map(
      competitor => ({
        id:
          competitor.id,
        name:
          competitor.name,
        tier:
          competitor.simulationTier,
        brandPower:
          competitor.brandPower,
        reputation:
          competitor.reputation,
        actionId:
          competitor.livePressure &&
          competitor.livePressure
            .lastActionId ||
          'observe',
        storeCount:
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
          ).length
      })
    )
    .sort(
      (
        a,
        b
      ) =>
        (
          b.brandPower +
          b.reputation
        ) -
        (
          a.brandPower +
          a.reputation
        )
    )
    .slice(
      0,
      limit
    );
}

function getStaffSummary(
  shopId
) {
  const prep =
    gameState
      .getOpeningPrep();

  const state =
    prep.staffing &&
    prep.staffing[
      shopId
    ];

  const hired =
    state &&
    Array.isArray(
      state.hired
    )
      ? state.hired
      : [];

  if (!hired.length) {
    return {
      count:0,
      avgMood:0,
      avgEnergy:0,
      avgStress:0,
      avgLoyalty:0,
      highTurnoverRisk:0
    };
  }

  let mood = 0;
  let energy = 0;
  let stress = 0;
  let loyalty = 0;
  let high = 0;

  for (
    const staff
    of hired
  ) {
    const live =
      staff.live ||
      staff.personProfile &&
      staff.personProfile.state ||
      {};

    mood +=
      Number(
        live.mood
      ) || 65;

    energy +=
      Number(
        live.energy
      ) || 70;

    stress +=
      Number(
        live.stress
      ) || 25;

    loyalty +=
      Number(
        live.loyalty
      ) || 55;

    if (
      Number(
        live.turnoverRisk
      ) >=
      68
    ) {
      high += 1;
    }
  }

  return {
    count:
      hired.length,
    avgMood:
      Math.round(
        mood /
        hired.length
      ),
    avgEnergy:
      Math.round(
        energy /
        hired.length
      ),
    avgStress:
      Math.round(
        stress /
        hired.length
      ),
    avgLoyalty:
      Math.round(
        loyalty /
        hired.length
      ),
    highTurnoverRisk:
      high
  };
}

function getStaffModifier(
  shopId
) {
  const summary =
    getStaffSummary(
      shopId
    );

  if (!summary.count) {
    return {
      capacityMultiplier:1,
      serviceMultiplier:1,
      ...summary
    };
  }

  const capacity =
    clamp(
      0.78 +
      summary.avgEnergy /
        500 +
      summary.avgMood /
        650 -
      summary.avgStress /
        900 -
      summary.highTurnoverRisk *
        0.025,
      0.72,
      1.08
    );

  const service =
    clamp(
      0.82 +
      summary.avgMood /
        500 +
      summary.avgLoyalty /
        700 -
      summary.avgStress /
        1000,
      0.76,
      1.09
    );

  return {
    capacityMultiplier:
      capacity,
    serviceMultiplier:
      service,
    ...summary
  };
}

module.exports = {
  getState,
  reset,
  initialize,
  processDay,
  getDistrictDashboard,
  getTopCompetitors,
  getStaffSummary,
  getStaffModifier,
  ensureStaffPerson,
  recalcDistrictPressure
};
