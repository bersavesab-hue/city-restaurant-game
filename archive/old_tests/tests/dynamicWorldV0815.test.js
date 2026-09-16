'use strict';

const assert =
  require('assert');

const fs =
  require('fs');

const path =
  require('path');

const eventPack =
  require('../src/world/eventPackV0815.js');

const policyPack =
  require('../src/world/policyPackV0815.js');

const dialoguePack =
  require('../src/dialogue/dialoguePackV0815.js');

const barragePack =
  require('../src/barrage/barragePackV0815.js');

const eventEngine =
  require('../src/world/eventEngineV0815.js');

const policyEngine =
  require('../src/world/policyEngineV0815.js');

const dynamicWorld =
  require('../src/world/dynamicWorldSystemV0815.js');

const gameState =
  require('../src/core/gameState.js');

const { SeededRng } =
  require('../src/foundation/rng.js');

const barrageEngine =
  require('../src/barrage/barrageEngineV0815.js');

const ROOT =
  path.resolve(
    __dirname,
    '..'
  );

assert.equal(
  eventPack.EVENT_DOMAINS.length,
  18,
  '事件领域必须18类'
);

assert.equal(
  eventPack.EVENT_TEMPLATES.length,
  360,
  '基础事件必须360个'
);

assert.equal(
  policyPack.POLICY_DOMAINS.length,
  16,
  '政策领域必须16类'
);

assert.equal(
  policyPack.POLICY_TEMPLATES.length,
  160,
  '政策模板必须160个'
);

assert.equal(
  dialoguePack.SCENES.length,
  24,
  '对话场景必须24类'
);

assert.equal(
  dialoguePack.INTENTS.length,
  36,
  '对话意图必须36类'
);

assert.equal(
  dialoguePack.TONES.length,
  16,
  '对话语气必须16类'
);

assert.equal(
  dialoguePack.RELATIONSHIP_STAGES.length,
  12,
  '关系阶段必须12级'
);

assert.ok(
  dialoguePack.DIALOGUE_FRAGMENTS.length >=
    576,
  '对话片段必须不少于576'
);

assert.equal(
  barragePack.SOURCES.length,
  20,
  '弹幕来源必须20类'
);

for (
  let i = 0;
  i < 240;
  i++
) {
  const rng =
    new SeededRng(
      'barrage-policy-regression-' +
      i
    );

  const row =
    barrageEngine.generate(
      rng,
      {
        day:100 + i,
        topicId:'policy',
        topicText:'夜间消费季',
        score:72
      }
    );

  assert.ok(
    row &&
    row.sourceId &&
    row.emotionId &&
    row.text,
    '人物弹幕来源选择必须稳定，不能因随机 find 返回 undefined'
  );
}


assert.equal(
  barragePack.EMOTIONS.length,
  32,
  '弹幕情绪必须32类'
);

assert.equal(
  barragePack.TOPICS.length,
  24,
  '弹幕话题必须24类'
);

assert.ok(
  barragePack.BARRAGE_FRAGMENTS.length >=
    640,
  '人物弹幕片段必须不少于640'
);

const eventState =
  eventEngine.createState();

const event =
  eventEngine.trigger(
    eventState,
    100,
    eventPack.EVENT_TEMPLATES[0],
    eventPack.EVENT_SEVERITIES[1],
    {
      districtId:'university'
    }
  );

assert.ok(
  event.id,
  '事件必须可实例化'
);

eventEngine.advancePhases(
  eventState,
  101
);

assert.equal(
  eventState.active[0].phase,
  'active',
  '事件必须经历前兆→发生阶段'
);

const eventMods =
  eventEngine.aggregateModifiers(
    eventState,
    {
      districtId:'university'
    }
  );

assert.ok(
  eventMods.supplyCostMultiplier >
    1,
  '供应趋紧等负面供应事件必须提高采购成本，不能反向降价'
);

const policyState =
  policyEngine.createState();

const policy =
  policyEngine.propose(
    policyState,
    100,
    policyPack.POLICY_TEMPLATES[0],
    {
      districtId:'university'
    }
  );

policyEngine.advanceStages(
  policyState,
  policy.activeDay
);

assert.equal(
  policyState.active[0].stage,
  'active',
  '政策必须经历酝酿→公告→生效'
);

const policyMods =
  policyEngine.aggregateModifiers(
    policyState,
    {
      districtId:'university'
    }
  );

assert.ok(
  policyMods.inspectionRisk >
    0,
  '生效监管政策必须产生检查风险'
);

gameState.reset();

const day =
  require('../src/core/simulationSystem.js')
    .getDayOrdinal(
      gameState.getTime()
    );

const first =
  dynamicWorld.processDay(
    day,
    {
      districtId:'university'
    }
  );

assert.ok(
  first.modifiers,
  '动态世界每日推进必须得到经营修正'
);

const state =
  dynamicWorld.getState();

assert.ok(
  state.npcPool.length >=
    28,
  '动态世界必须生成可持续NPC池'
);

assert.ok(
  Array.isArray(
    state.dialogueFeed
  ),
  '必须存在人物对话流'
);

assert.ok(
  Array.isArray(
    state.barrageFeed
  ),
  '必须存在人物弹幕流'
);

const forcedEvent =
  eventEngine.trigger(
    state.eventState,
    day + 1,
    eventPack.EVENT_TEMPLATES.find(
      x =>
        x.domainId ===
        'brand' &&
        x.positive
    ),
    eventPack.EVENT_SEVERITIES[1],
    {
      districtId:'university'
    }
  );

dynamicWorld.processDay(
  day + 1,
  {
    districtId:'university',
    riskIndex:0.9
  }
);

assert.ok(
  dynamicWorld
    .getDialogueFeed(
      50
    )
    .length >
    0,
  '世界事件/政策必须能产生人物对话'
);

assert.ok(
  dynamicWorld
    .getBarrageFeed(
      50
    )
    .length >
    0,
  '世界事件/政策必须能产生社会弹幕'
);

dynamicWorld.onShopDayClosed(
  {
    id:'test_shop',
    name:'测试小馆'
  },
  {
    day:day + 1,
    shop:{
      rating:4.6
    }
  },
  {
    day:day,
    shopRating:4.6,
    financial:{
      revenue:4200,
      profit:760
    }
  }
);

assert.ok(
  dynamicWorld
    .getBarrageFeed(
      100
    )
    .some(
      row =>
        row.shopId ===
        'test_shop'
    ),
  '真实门店日结必须生成对应人物弹幕'
);

const simulationSource =
  fs.readFileSync(
    path.join(
      ROOT,
      'src/core/simulationSystem.js'
    ),
    'utf8'
  );

assert.ok(
  simulationSource.includes(
    "require('../world/dynamicWorldSystemV0815.js')"
  ),
  '城市每日模拟必须接入动态世界'
);

const restaurantSource =
  fs.readFileSync(
    path.join(
      ROOT,
      'src/operations/restaurantSimulationV081.js'
    ),
    'utf8'
  );

assert.ok(
  restaurantSource.includes(
    'dynamicDemandFactor'
  ),
  '真实营业必须受事件和政策需求修正影响'
);

const operationsSource =
  fs.readFileSync(
    path.join(
      ROOT,
      'src/operations/operationsStoreV080.js'
    ),
    'utf8'
  );

assert.ok(
  operationsSource.includes(
    'supplyCostMultiplier'
  ),
  '真实采购必须受供应事件和政策影响'
);

console.log(
  'V0.8.15 dynamic world/event/dialogue/policy/barrage tests passed'
);
