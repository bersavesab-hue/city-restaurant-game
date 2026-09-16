'use strict';

const assert =
  require('assert');

const gameState =
  require('../src/core/gameState.js');

const reputation =
  require('../src/reputation/reputationMediaSystemV0827.js');

gameState.reset();

const shop = {
  id:'shop_reputation_v0827',
  name:'口碑测试店',
  rating:4,
  reviewCount:0
};

gameState.addShop({
  ...shop,
  districtId:'cbd',
  status:'open'
});

const storedShop =
  gameState
    .getBusiness()
    .shops[0];

const review =
  reputation
    .recordReview(
      shop.id,
      storedShop,
      {
        taste:88,
        value:80,
        portion:76,
        speed:82,
        service:86,
        hygiene:90,
        environment:84,
        consistency:81
      },
      {
        day:1,
        sourceId:'local_review',
        applyShopRating:true
      }
    );

assert.ok(review.stars>=4);
assert.equal(storedShop.reviewCount,1);

const rumor =
  reputation
    .createRumor(
      shop.id,
      {
        title:'测试讨论',
        text:'一条测试舆情',
        sentiment:-0.7,
        credibility:0.6,
        heat:80,
        day:1
      }
    );

assert.equal(rumor.status,'active');

const processed =
  reputation
    .processDay(
      shop.id,
      2
    );

assert.ok(processed.activeImpact<0);

const media =
  reputation
    .publishMediaPost(
      shop.id,
      {
        sourceId:'blogger',
        sentiment:0.8,
        reach:1000,
        day:2
      }
    );

assert.ok(media.reach>1000);

const resolved =
  reputation
    .resolveRumor(
      shop.id,
      rumor.id,
      {
        day:2,
        resolution:'clarified'
      }
    );

assert.ok(resolved.ok);
assert.equal(resolved.rumor.status,'resolved');

const overview =
  reputation
    .overview(
      shop.id,
      storedShop
    );

assert.equal(overview.version,'0.8.27');
assert.equal(overview.reviewCount,1);
assert.equal(overview.activeRumorCount,0);
assert.ok(overview.earnedReach>0);

console.log(
  'V0.8.27 reputation/review/rumor/media tests passed'
);
