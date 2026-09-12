'use strict';

const assert =
  require('assert');

const gameState =
  require('../src/core/gameState.js');

const timeSystem =
  require('../src/core/timeSystem.js');

const citySystem =
  require('../src/city/citySystem.js');

const demandSystem =
  require('../src/city/demandSystem.js');

const simulationSystem =
  require('../src/core/simulationSystem.js');

const propertyMarketSystem =
  require('../src/property/propertyMarketSystem.js');

function run() {
  gameState.reset();

  propertyMarketSystem
    .reset({
      seed:
        123456,

      currentDay:
        1
    });

  simulationSystem
    .initialize();

  assert.ok(
    gameState
      .getWorld()
      .weather,
    '初始化后必须生成天气'
  );

  assert.ok(
    Number.isFinite(
      gameState
        .getWorld()
        .temperature
    ),
    '初始化后必须生成温度'
  );

  gameState
    .setTimeSpeed(
      10
    );

  const beforeTime =
    gameState
      .getTime()
      .hour *
      60 +
    gameState
      .getTime()
      .minute;

  timeSystem
    .update(
      1000
    );

  const afterTime =
    gameState
      .getTime()
      .hour *
      60 +
    gameState
      .getTime()
      .minute;

  assert.strictEqual(
    afterTime -
      beforeTime,
    60,
    '10× 应达到现实1秒推进游戏60分钟'
  );

  const before =
    citySystem
      .getDistrict(
        'university'
      );

  const beforeDemand =
    demandSystem
      .getTotalDemand(
        'university'
      );

  const day =
    simulationSystem
      .getDayOrdinal(
        gameState
          .getTime()
      );

  propertyMarketSystem
    .addExternalModifier({
      id:
        'simulation_test_event',

      name:
        '测试联动事件',

      districtId:
        'university',

      endDay:
        day +
        10,

      trafficFactor:
        1.20,

      rentPressure:
        1.08,

      listingSupplyFactor:
        0.92,

      npcDemandFactor:
        1.22,

      description:
        '用于验证人口、需求与市场联动'
    });

  timeSystem
    .addDays(
      1
    );

  simulationSystem
    .update(
      1
    );

  const after =
    citySystem
      .getDistrict(
        'university'
      );

  const afterDemand =
    demandSystem
      .getTotalDemand(
        'university'
      );

  assert.ok(
    after.eventDemandFactor >
      1,
    '正向事件必须进入餐饮需求联动'
  );

  assert.ok(
    after.eventPopulationFactor >
      1,
    '正向事件必须进入活动人口联动'
  );

  assert.notStrictEqual(
    after.population,
    before.population,
    '活动人口不能永久固定'
  );

  assert.notStrictEqual(
    after.baseDemand,
    before.baseDemand,
    '商圈日需求不能永久固定'
  );

  assert.notStrictEqual(
    afterDemand,
    beforeDemand,
    '当前时段需求必须跟随动态城市状态变化'
  );

  const feed =
    simulationSystem
      .getNewsFeed();

  assert.ok(
    feed.some(
      item =>
        item.title ===
        '测试联动事件'
    ),
    '市场事件必须进入城市新闻通报'
  );

  console.log(
    'city simulation linkage tests passed'
  );
}

run();
