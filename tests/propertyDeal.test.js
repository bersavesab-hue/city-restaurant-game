'use strict';

const assert =
  require('assert');

const gameState =
  require('../src/core/gameState.js');

const simulationSystem =
  require('../src/core/simulationSystem.js');

const propertyMarketSystem =
  require('../src/property/propertyMarketSystem.js');

const propertyVisitSystem =
  require('../src/property/propertyVisitSystem.js');

const propertyNegotiationSystem =
  require('../src/property/propertyNegotiationSystem.js');

function run() {
  gameState.reset();

  gameState
    .setCash(
      3000000
    );

  propertyMarketSystem
    .reset({
      seed:
        9122026,

      currentDay:
        1
    });

  simulationSystem
    .initialize();

  const listings =
    propertyMarketSystem
      .getLiveListings({});

  const listing =
    listings.find(
      item =>
        Array.isArray(
          item.competingTenants
        ) &&
        item
          .competingTenants
          .length ===
          0
    ) ||
    listings[0];

  assert.ok(
    listing,
    '市场必须存在可用于测试的房源'
  );

  const quote =
    propertyVisitSystem
      .getDynamicVisitQuote(
        listing.marketKey,
        'standard'
      );

  assert.ok(
    quote,
    '必须能根据房源生成动态看铺报价'
  );

  assert.ok(
    quote.hours >=
      1,
    '看铺必须消耗游戏时间'
  );

  const visit =
    propertyVisitSystem
      .inspect(
        listing.marketKey,
        'standard'
      );

  assert.ok(
    visit.ok,
    '标准勘察应完成'
  );

  assert.ok(
    visit.items.length >
      0,
    '勘察报告必须有核验项目'
  );

  const started =
    propertyNegotiationSystem
      .start(
        listing.marketKey
      );

  assert.ok(
    started.ok,
    '完成勘察后应能进入谈判'
  );

  const beforeSession =
    propertyNegotiationSystem
      .getSession(
        listing.marketKey
      );

  assert.ok(
    beforeSession,
    '必须创建谈判状态'
  );

  const negotiation =
    propertyNegotiationSystem
      .negotiate(
        listing.marketKey,
        'balanced'
      );

  assert.ok(
    negotiation.ok,
    '低竞争测试房源应能完成一轮谈判'
  );

  const afterSession =
    propertyNegotiationSystem
      .getSession(
        listing.marketKey
      );

  assert.strictEqual(
    afterSession.round,
    1,
    '谈判轮次必须推进'
  );

  const sign =
    propertyNegotiationSystem
      .signLease(
        listing.marketKey
      );

  assert.ok(
    sign.ok,
    '资金充足时必须能够签约'
  );

  assert.strictEqual(
    gameState
      .getBusiness()
      .hasShop,
    true,
    '签约后玩家必须拥有门店'
  );

  assert.strictEqual(
    sign.shop.status,
    'leased_pending_renovation',
    '新签门店应进入待装修状态'
  );

  const stillListed =
    propertyMarketSystem
      .getLiveListings({})
      .some(
        item =>
          item.marketKey ===
          listing.marketKey
      );

  assert.strictEqual(
    stillListed,
    false,
    '玩家签约后该房源必须退出公开挂牌'
  );

  console.log(
    'property visit and negotiation tests passed'
  );
}

run();
