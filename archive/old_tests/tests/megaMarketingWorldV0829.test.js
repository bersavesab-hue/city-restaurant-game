'use strict';

const assert =
  require('assert');

const gameState =
  require('../src/core/gameState.js');

const operations =
  require('../src/operations/operationsStoreV080.js');

gameState.reset();

gameState.setCash(
  300000
);

gameState.addShop({
  id:'shop_mega_v0829',
  name:'营销世界测试店',
  districtId:'cbd',
  status:'open',
  usableArea:120,
  monthlyRent:16000
});

operations.resetCache();

const catalog =
  operations
    .marketingCatalog();

assert.equal(catalog.length,24);

const campaign =
  operations
    .startMarketingCampaign(
      'shop_mega_v0829',
      'short_video',
      1500,
      7,
      {
        day:1
      }
    );

assert.ok(campaign.ok);

const member =
  operations
    .enrollMember(
      'shop_mega_v0829',
      'customer_member_1',
      {
        day:1
      }
    );

assert.ok(member.ok);

const marketing =
  operations
    .marketingMembershipSnapshot(
      'shop_mega_v0829'
    );

assert.equal(marketing.version,'0.8.26');
assert.equal(marketing.memberCount,1);
assert.equal(marketing.activeCampaigns.length,1);

const review =
  operations
    .recordManualReview(
      'shop_mega_v0829',
      {
        taste:86,
        value:80,
        portion:75,
        speed:82,
        service:84,
        hygiene:88,
        environment:80,
        consistency:82
      },
      {
        day:1,
        sourceId:'local_review'
      }
    );

assert.ok(review.stars>=4);

const rumor =
  operations
    .createReputationRumor(
      'shop_mega_v0829',
      {
        title:'测试传言',
        sentiment:-0.4,
        heat:60,
        credibility:0.5,
        day:1
      }
    );

assert.equal(rumor.status,'active');

const reputation =
  operations
    .reputationSnapshot(
      'shop_mega_v0829'
    );

assert.equal(reputation.version,'0.8.27');
assert.equal(reputation.reviewCount,1);
assert.equal(reputation.activeRumorCount,1);

const ecology =
  operations
    .commercialEcologySnapshot(
      'shop_mega_v0829'
    );

assert.equal(ecology.version,'0.8.28');
assert.equal(ecology.districtId,'cbd');

gameState
  .getTime()
  .month =
  12;

gameState.setWeather(
  '小雪',
  -3
);

const environment =
  operations
    .environmentSnapshot(
      'shop_mega_v0829'
    );

assert.equal(environment.version,'0.8.29');
assert.equal(environment.season,'winter');
assert.ok(environment.weather.utilityMultiplier>1);

const finance =
  operations
    .financeTransactions(
      'shop_mega_v0829',
      {
        category:'marketing'
      }
    );

assert.equal(finance.length,1);
assert.equal(finance[0].amount,1500);

console.log(
  'V0.8.26-0.8.29 mega marketing/world integration tests passed'
);
