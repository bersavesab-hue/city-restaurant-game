'use strict';

const assert =
  require('assert');

const gameState =
  require('../src/core/gameState.js');

const marketing =
  require('../src/operations/marketingPlatformMembershipV0826.js');

gameState.reset();

gameState.setCash(
  100000
);

gameState.addShop({
  id:'shop_marketing_v0826',
  name:'营销测试店',
  districtId:'cbd',
  status:'open',
  usableArea:100,
  monthlyRent:10000
});

const runtime = {
  day:1,
  campaigns:[]
};

assert.equal(
  marketing
    .campaignCatalog()
    .length,
  24
);

assert.equal(
  marketing
    .platformCatalog()
    .length,
  8
);

const before =
  gameState
    .getPlayer()
    .cash;

const started =
  marketing
    .startCampaign(
      'shop_marketing_v0826',
      runtime,
      'short_video',
      1200,
      5,
      {
        day:1
      }
    );

assert.ok(started.ok);
assert.equal(runtime.campaigns.length,1);
assert.equal(
  gameState
    .getPlayer()
    .cash,
  before - 1200
);

const joined =
  marketing
    .enrollMember(
      'shop_marketing_v0826',
      'customer_1',
      {
        day:1
      }
    );

assert.ok(joined.ok);

const spend =
  marketing
    .recordMemberSpend(
      'shop_marketing_v0826',
      'customer_1',
      1800,
      {
        day:2
      }
    );

assert.ok(spend.ok);
assert.equal(spend.member.tierId,'gold');
assert.ok(spend.member.points>0);

const overview =
  marketing
    .overview(
      'shop_marketing_v0826',
      runtime
    );

assert.equal(overview.version,'0.8.26');
assert.equal(overview.memberCount,1);
assert.equal(overview.activeCampaigns.length,1);
assert.ok(overview.demandMultiplier>1);

console.log(
  'V0.8.26 marketing/platform/membership tests passed'
);
