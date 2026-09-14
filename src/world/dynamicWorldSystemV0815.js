'use strict';

const gameState =
  require('../core/gameState.js');

const citySystem =
  require('../city/citySystem.js');

const eventEngine =
  require('./eventEngineV0815.js');

const policyEngine =
  require('./policyEngineV0815.js');

const dialogueEngine =
  require('../dialogue/dialogueEngineV0815.js');

const barrageEngine =
  require('../barrage/barrageEngineV0815.js');

const personRules =
  require('../person/personRulesV10.js');

const personPack =
  require('../person/personPackV10.js');

const { SeededRng } =
  require('../foundation/rng.js');

function clone(v) {
  return JSON.parse(
    JSON.stringify(v)
  );
}

function multiplyModifiers(
  a,
  b
) {
  const keys =
    new Set([
      ...Object.keys(
        a ||
        {}
      ),
      ...Object.keys(
        b ||
        {}
      )
    ]);

  const out = {};

  for (
    const key
    of keys
  ) {
    if (
      key ===
      'inspectionRisk'
    ) {
      out[key] =
        Math.max(
          0,
          Math.min(
            1,
            Number(
              a[key] ||
              0
            ) +
            Number(
              b[key] ||
              0
            )
          )
        );

      continue;
    }

    out[key] =
      Number(
        a[key] == null
          ? 1
          : a[key]
      ) *
      Number(
        b[key] == null
          ? 1
          : b[key]
      );
  }

  return out;
}

function defaultState() {
  return {
    version:'0.8.15',
    lastProcessedDay:null,
    eventState:
      eventEngine
        .createState(),
    policyState:
      policyEngine
        .createState(),
    npcPool:[],
    dialogueFeed:[],
    barrageFeed:[],
    signalHistory:[],
    modifiers:{},
    metrics:{
      eventsTriggered:0,
      policiesProposed:0,
      dialoguesGenerated:0,
      barragesGenerated:0
    },
    uiState:{
      seenEvents:0,
      seenPolicies:0,
      seenDialogues:0,
      seenBarrages:0
    }
  };
}

function getState() {
  const world =
    gameState
      .getWorld();

  if (
    !world.dynamicWorld ||
    typeof world.dynamicWorld !==
      'object'
  ) {
    world.dynamicWorld =
      defaultState();
  }

  const state =
    world.dynamicWorld;

  state.version =
    '0.8.15';

  state.eventState =
    state.eventState ||
    eventEngine
      .createState();

  state.policyState =
    state.policyState ||
    policyEngine
      .createState();

  state.npcPool =
    Array.isArray(
      state.npcPool
    )
      ? state.npcPool
      : [];

  state.dialogueFeed =
    Array.isArray(
      state.dialogueFeed
    )
      ? state.dialogueFeed
      : [];

  state.barrageFeed =
    Array.isArray(
      state.barrageFeed
    )
      ? state.barrageFeed
      : [];

  state.signalHistory =
    Array.isArray(
      state.signalHistory
    )
      ? state.signalHistory
      : [];

  state.metrics =
    state.metrics ||
    {
      eventsTriggered:0,
      policiesProposed:0,
      dialoguesGenerated:0,
      barragesGenerated:0
    };

  state.uiState =
    state.uiState ||
    {
      seenEvents:0,
      seenPolicies:0,
      seenDialogues:0,
      seenBarrages:0
    };

  return state;
}

function ensureNpcPool(
  state,
  seed
) {
  if (
    state.npcPool.length >=
    28
  ) {
    return state.npcPool;
  }

  const rng =
    new SeededRng(
      `world-npc:${seed || 'city'}`
    );

  const roles = [
    'regular_customer',
    'business_customer',
    'supplier_sales_role',
    'supplier_owner',
    'wholesaler',
    'delivery_rider',
    'competitor_owner',
    'blogger',
    'media_editor',
    'food_inspector',
    'fire_inspector',
    'consultant',
    'landlord',
    'investor'
  ];

  while (
    state.npcPool.length <
    28
  ) {
    const person =
      personRules
        .createPersonProfile(
          rng,
          {}
        );

    person.id =
      `world_npc_${state.npcPool.length + 1}`;

    const roleId =
      rng.pick(
        roles
      );

    if (
      personPack.NPC_ROLES.some(
        row =>
          row.id ===
          roleId
      )
    ) {
      personRules.assignRole(
        person,
        roleId,
        {
          allowLowFit:true,
          employerId:null
        }
      );
    }

    state.npcPool.push(
      person
    );
  }

  return state.npcPool;
}

function pickNpc(
  state,
  rng,
  preferredRoles=[]
) {
  let pool =
    state.npcPool.filter(
      person =>
        preferredRoles.includes(
          person.currentRole
        )
    );

  if (!pool.length) {
    pool =
      state.npcPool;
  }

  return rng.pick(
    pool
  );
}

function context(
  day,
  extra={}
) {
  const business =
    gameState
      .getBusiness();

  const shops =
    Array.isArray(
      business.shops
    )
      ? business.shops
      : [];

  const open =
    shops.filter(
      shop =>
        shop.status ===
        'open'
    );

  const stored =
    business
      .restaurantOperations &&
    business
      .restaurantOperations
      .shops ||
    {};

  let ratingSum = 0;
  let reviewCount = 0;

  for (
    const shop
    of open
  ) {
    const runtime =
      stored[
        shop.id
      ];

    if (
      runtime &&
      runtime.shop
    ) {
      ratingSum +=
        Number(
          runtime.shop.rating
        ) ||
        0;

      reviewCount +=
        Number(
          runtime.shop.reviewCount
        ) ||
        0;
    }
  }

  const districtId =
    extra.districtId ||
    gameState
      .getWorld()
      .currentDistrictId;

  return {
    seed:
      gameState
        .getSimulation()
        .seed ||
      'city',
    day,
    weather:
      gameState
        .getWorld()
        .weather,
    temperature:
      gameState
        .getWorld()
        .temperature,
    districtId,
    shopCount:
      shops.length,
    openShopCount:
      open.length,
    avgRating:
      open.length
        ? ratingSum /
          open.length
        : 0,
    reviewCount,
    cash:
      gameState
        .getPlayer()
        .cash,
    riskIndex:
      Math.min(
        1,
        (
          open.length *
            0.06 +
          Math.max(
            0,
            50000 -
            gameState
              .getPlayer()
              .cash
          ) /
            100000
        )
      ),
    ...extra
  };
}

function topicForEvent(
  event
) {
  const map = {
    supply:'supplier',
    staff:'staff',
    customer:'crowd',
    kitchen:'speed',
    equipment:'speed',
    hygiene:'hygiene',
    reputation:'rating',
    weather:'weather',
    district:'crowd',
    rent:'rent',
    competition:'competitor',
    consumption:'brand',
    festival:'festival',
    delivery:'delivery',
    traffic:'delivery',
    policy:'policy',
    accident:'event',
    brand:'brand'
  };

  return map[
    event.domainId
  ] ||
  'event';
}

function rolesForEvent(
  event
) {
  const map = {
    supply:[
      'supplier_sales_role',
      'supplier_owner',
      'wholesaler'
    ],
    staff:[
      'consultant',
      'competitor_owner'
    ],
    hygiene:[
      'food_inspector'
    ],
    competition:[
      'competitor_owner'
    ],
    delivery:[
      'delivery_rider'
    ],
    reputation:[
      'blogger',
      'media_editor'
    ],
    rent:[
      'landlord'
    ],
    brand:[
      'blogger',
      'media_editor'
    ]
  };

  return map[
    event.domainId
  ] ||
  [
    'regular_customer',
    'media_editor'
  ];
}

function pushDialogue(
  state,
  row
) {
  state.dialogueFeed.unshift(
    row
  );

  state.dialogueFeed =
    state.dialogueFeed.slice(
      0,
      120
    );

  state.metrics
    .dialoguesGenerated +=
    1;
}

function pushBarrage(
  state,
  row
) {
  state.barrageFeed.unshift(
    row
  );

  state.barrageFeed =
    state.barrageFeed.slice(
      0,
      180
    );

  state.metrics
    .barragesGenerated +=
    1;
}

function addNews(
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
      `dynamic_${day}_${title}_${simulation.newsFeed.length}`,
    title,
    detail,
    severity,
    day
  });

  simulation.newsFeed =
    simulation.newsFeed.slice(
      0,
      60
    );
}

function reactToEvent(
  state,
  event,
  day,
  rng
) {
  const actor =
    pickNpc(
      state,
      rng,
      rolesForEvent(
        event
      )
    );

  const dialogue =
    dialogueEngine
      .generateDialogue(
        rng,
        {
          actor,
          sceneId:
            event.domainId ===
              'policy'
              ? 'policy_talk'
              : event.domainId ===
                  'supply'
                ? 'supplier_negotiation'
                : event.domainId ===
                    'staff'
                  ? 'complaint_staff'
                  : event.domainId ===
                      'hygiene'
                    ? 'regulator_visit'
                    : event.domainId ===
                        'competition'
                      ? 'competitor_chat'
                      : 'crisis_talk',
          topic:
            event.name,
          day,
          eventId:
            event.id,
          sentiment:
            event.positive
              ? 30
              : -25,
          memoryTypeId:
            event.positive
              ? 'work'
              : 'conflict'
        }
      );

  pushDialogue(
    state,
    dialogue
  );

  const count =
    rng.int(
      2,
      4
    );

  for (
    let i = 0;
    i < count;
    i++
  ) {
    pushBarrage(
      state,
      barrageEngine
        .generate(
          rng,
          {
            day,
            topicId:
              topicForEvent(
                event
              ),
            topicText:
              event.name,
            eventId:
              event.id,
            score:
              event.positive
                ? 78
                : 34
          }
        )
    );
  }

  addNews(
    event.domainName +
      '动态',
    event.name +
      '｜' +
      event.severityName,
    day,
    event.positive
      ? 'good'
      : 'warning'
  );
}

function reactToPolicy(
  state,
  policy,
  day,
  rng
) {
  const actor =
    pickNpc(
      state,
      rng,
      [
        'media_editor',
        'consultant',
        'competitor_owner',
        'supplier_owner'
      ]
    );

  pushDialogue(
    state,
    dialogueEngine
      .generateDialogue(
        rng,
        {
          actor,
          sceneId:
            'policy_talk',
          topic:
            policy.domainName +
            '·' +
            policy.name,
          day,
          policyId:
            policy.id,
          sentiment:
            policy.supportive
              ? 25
              : -8,
          memoryTypeId:
            'work'
        }
      )
  );

  const count =
    rng.int(
      1,
      3
    );

  for (
    let i = 0;
    i < count;
    i++
  ) {
    pushBarrage(
      state,
      barrageEngine
        .generate(
          rng,
          {
            day,
            topicId:'policy',
            topicText:
              policy.name,
            policyId:
              policy.id,
            score:
              policy.supportive
                ? 72
                : 52
          }
        )
    );
  }

  addNews(
    '经营政策',
    policy.domainName +
      '：' +
      policy.name +
      '进入酝酿阶段',
    day,
    'info'
  );
}

function recalcModifiers(
  state,
  filter={}
) {
  const eventMods =
    eventEngine
      .aggregateModifiers(
        state.eventState,
        filter
      );

  const policyMods =
    policyEngine
      .aggregateModifiers(
        state.policyState,
        filter
      );

  state.modifiers =
    multiplyModifiers(
      eventMods,
      policyMods
    );

  return state.modifiers;
}

function processDay(
  day,
  extra={}
) {
  const state =
    getState();

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
      createdEvents:[],
      proposedPolicy:null,
      modifiers:
        recalcModifiers(
          state,
          extra
        )
    };
  }

  const ctx =
    context(
      day,
      extra
    );

  const rng =
    new SeededRng(
      `dynamic-world:${ctx.seed}:${day}`
    );

  ensureNpcPool(
    state,
    ctx.seed
  );

  const policy =
    policyEngine
      .tick(
        state.policyState,
        day,
        ctx
      );

  const events =
    eventEngine
      .tick(
        state.eventState,
        day,
        ctx
      );

  if (
    policy.proposed
  ) {
    state.metrics
      .policiesProposed +=
      1;

    reactToPolicy(
      state,
      policy.proposed,
      day,
      rng
    );
  }

  for (
    const event
    of events.created
  ) {
    state.metrics
      .eventsTriggered +=
      1;

    reactToEvent(
      state,
      event,
      day,
      rng
    );
  }

  for (
    const change
    of policy.stages.changed
  ) {
    if (
      change.to ===
      'active'
    ) {
      addNews(
        '政策生效',
        change.item.name +
          '开始执行',
        day,
        change.item.supportive
          ? 'good'
          : 'info'
      );
    }
  }

  state.lastProcessedDay =
    day;

  const modifiers =
    recalcModifiers(
      state,
      ctx
    );

  return {
    changed:
      !!(
        policy.proposed ||
        events.created.length ||
        policy.stages.changed.length
      ),
    createdEvents:
      events.created,
    proposedPolicy:
      policy.proposed,
    modifiers
  };
}

function getModifiers(
  filter={}
) {
  return recalcModifiers(
    getState(),
    filter
  );
}

function onShopDayClosed(
  shop,
  runtime,
  closed
) {
  const state =
    getState();

  const day =
    Number(
      closed &&
      closed.day
    ) ||
    Number(
      runtime &&
      runtime.day
    ) ||
    0;

  const rng =
    new SeededRng(
      `shop-day-social:${shop.id}:${day}`
    );

  ensureNpcPool(
    state,
    gameState
      .getSimulation()
      .seed
  );

  const finance =
    closed &&
    closed.financial ||
    {};

  const rating =
    Number(
      closed &&
      closed.shopRating
    ) ||
    Number(
      runtime &&
      runtime.shop &&
      runtime.shop.rating
    ) ||
    4;

  const floorDaily =
    closed &&
    closed.floor ||
    {};

  const walkaways =
    Number(
      floorDaily.walkawaysToday ||
      0
    );

  const mistakes =
    Number(
      floorDaily.mistakesToday ||
      0
    );

  const stockouts =
    Number(
      floorDaily.stockoutsToday ||
      0
    );

  const profit =
    Number(
      finance.profit
    ) ||
    0;

  const revenue =
    Number(
      finance.revenue
    ) ||
    0;

  const score =
    walkaways >=
      3 ||
    mistakes >=
      2 ||
    stockouts >=
      3
      ? 30
      : rating >=
          4.4 &&
        profit >
          0
        ? 82
        : profit <
            0
          ? 34
          : 60;

  const topicId =
    walkaways >=
      3
      ? 'queue'
      : mistakes >=
          2
        ? 'service'
        : stockouts >=
            3
          ? 'supplier'
          : profit <
              0
            ? 'profit'
            : rating >=
                4.4
              ? 'rating'
              : revenue >
                  3000
                ? 'crowd'
                : 'brand';

  const count =
    rng.int(
      2,
      4
    );

  for (
    let i = 0;
    i < count;
    i++
  ) {
    pushBarrage(
      state,
      barrageEngine
        .generate(
          rng,
          {
            day,
            topicId,
            shopId:
              shop.id,
            topicText:
              topicId ===
                'queue'
                ? `${shop.name || '这家店'}今天等位流失有点多`
                : topicId ===
                    'service'
                  ? `${shop.name || '这家店'}今天服务出了几次差错`
                  : topicId ===
                      'supplier'
                    ? `${shop.name || '这家店'}今天有菜品缺货`
                    : topicId ===
                        'profit'
                      ? `${shop.name || '这家店'}今天经营有点吃力`
                      : topicId ===
                          'rating'
                        ? `${shop.name || '这家店'}今天口碑不错`
                        : topicId ===
                            'crowd'
                          ? `${shop.name || '这家店'}今天客流挺旺`
                          : `${shop.name || '这家店'}今天表现比较平稳`,
            score
          }
        )
    );
  }

  state.signalHistory.unshift({
    day,
    shopId:
      shop.id,
    type:
      'shop_day_close',
    revenue,
    profit,
    rating
  });

  state.signalHistory =
    state.signalHistory.slice(
      0,
      100
    );

  return true;
}


function getUnreadCounts() {
  const state =
    getState();

  const metrics =
    state.metrics ||
    {};

  const seen =
    state.uiState ||
    {};

  const events =
    Math.max(
      0,
      Number(
        metrics.eventsTriggered ||
        0
      ) -
      Number(
        seen.seenEvents ||
        0
      )
    );

  const policies =
    Math.max(
      0,
      Number(
        metrics.policiesProposed ||
        0
      ) -
      Number(
        seen.seenPolicies ||
        0
      )
    );

  const dialogues =
    Math.max(
      0,
      Number(
        metrics.dialoguesGenerated ||
        0
      ) -
      Number(
        seen.seenDialogues ||
        0
      )
    );

  const barrages =
    Math.max(
      0,
      Number(
        metrics.barragesGenerated ||
        0
      ) -
      Number(
        seen.seenBarrages ||
        0
      )
    );

  return {
    events,
    policies,
    dialogues,
    barrages,
    discussion:
      dialogues +
      barrages,
    total:
      events +
      policies +
      dialogues +
      barrages
  };
}

function markSeen(
  section
) {
  const state =
    getState();

  const metrics =
    state.metrics;

  const seen =
    state.uiState;

  if (
    section ===
    'dynamic' ||
    section ===
    'all'
  ) {
    seen.seenEvents =
      Number(
        metrics.eventsTriggered ||
        0
      );
  }

  if (
    section ===
    'policy' ||
    section ===
    'all'
  ) {
    seen.seenPolicies =
      Number(
        metrics.policiesProposed ||
        0
      );
  }

  if (
    section ===
    'discussion' ||
    section ===
    'all'
  ) {
    seen.seenDialogues =
      Number(
        metrics.dialoguesGenerated ||
        0
      );

    seen.seenBarrages =
      Number(
        metrics.barragesGenerated ||
        0
      );
  }

  return getUnreadCounts();
}

function findNpc(
  personId
) {
  const state =
    getState();

  return (
    state.npcPool.find(
      person =>
        person.id ===
          personId ||
        person.name ===
          personId
    ) ||
    null
  );
}

function getDialogueFeed(
  limit=20
) {
  return getState()
    .dialogueFeed
    .slice(
      0,
      limit
    );
}

function getBarrageFeed(
  limit=30
) {
  return getState()
    .barrageFeed
    .slice(
      0,
      limit
    );
}

function getActivePolicies() {
  return clone(
    getState()
      .policyState
      .active
  );
}

function getActiveEvents() {
  return clone(
    getState()
      .eventState
      .active
  );
}

module.exports = {
  getState,
  ensureNpcPool,
  processDay,
  getModifiers,
  onShopDayClosed,
  getDialogueFeed,
  getBarrageFeed,
  getActivePolicies,
  getActiveEvents,
  getUnreadCounts,
  markSeen,
  findNpc
};
