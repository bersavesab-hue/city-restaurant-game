'use strict';

const assert =
  require('assert');

const gameState =
  require('../src/core/gameState.js');

const simulationSystem =
  require('../src/core/simulationSystem.js');

const propertyMarketSystem =
  require('../src/property/propertyMarketSystem.js');

const districtInsightSystem =
  require('../src/city/districtInsightSystem.js');

function run() {
  gameState.reset();

  propertyMarketSystem
    .reset({
      seed:
        246810,

      currentDay:
        1
    });

  simulationSystem
    .initialize();

  const insight =
    districtInsightSystem
      .getInsight(
        'university'
      );

  assert.ok(
    insight,
    '大学城必须能生成商圈详情'
  );

  assert.ok(
    insight.population >
      0,
    '商圈详情必须包含动态人口'
  );

  assert.ok(
    insight.currentDemand >=
      0,
    '商圈详情必须包含当前时段需求'
  );

  assert.ok(
    insight.customerGroups
      .length >=
      3,
    '商圈详情必须包含消费人群'
  );

  const shareSum =
    insight
      .customerGroups
      .reduce(
        (
          sum,
          item
        ) =>
          sum +
          item.share,
        0
      );

  assert.ok(
    Math.abs(
      shareSum -
      1
    ) <
      0.0001,
    '消费人群占比之和必须为100%'
  );

  assert.ok(
    insight.mealProfile
      .length >=
      5,
    '必须包含各餐饮时段结构'
  );

  assert.ok(
    insight.market &&
      typeof insight
        .market
        .activeListingCount ===
        'number',
    '商圈详情必须联动实时房源市场'
  );

  assert.ok(
    Array.isArray(
      insight.businessHints
    ) &&
      insight
        .businessHints
        .length >
        0,
    '必须根据动态主力客群生成经营适配提示'
  );

  console.log(
    'district insight tests passed'
  );
}

run();
