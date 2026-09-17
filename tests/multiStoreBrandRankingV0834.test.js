'use strict';

const assert =
  require('assert');

const gameState =
  require('../src/core/gameState.js');

const system =
  require('../src/brand/multiStoreBrandRankingV0834.js');

gameState.reset();

gameState.setCash(
  500000
);

gameState.getPlayer().brandName =
  '测试连锁';

const shops = [
  {
    id:'shop_a',
    name:'测试连锁·CBD店',
    districtId:'cbd',
    status:'open'
  },
  {
    id:'shop_b',
    name:'测试连锁·大学城店',
    districtId:'university',
    status:'open'
  }
];

for (const shop of shops) {
  gameState.addShop(shop);
}

const runtimeA = {
  brand:{
    level:10,
    xp:15000,
    reputation:72,
    awareness:68,
    loyalty:60
  },
  shop:{
    rating:4.6,
    reviewCount:320
  },
  staff:{
    employees:
      Array.from(
        {length:8},
        (_,i)=>({
          id:'a_'+i,
          active:true
        })
      )
  },
  ledger:{}
};

const runtimeB = {
  brand:{
    level:10,
    xp:15000,
    reputation:70,
    awareness:66,
    loyalty:61
  },
  shop:{
    rating:4.4,
    reviewCount:220
  },
  staff:{
    employees:
      Array.from(
        {length:6},
        (_,i)=>({
          id:'b_'+i,
          active:true
        })
      )
  },
  ledger:{}
};

assert.ok(
  system.registerShop(
    'shop_a',
    runtimeA,
    {day:10}
  )
);

assert.ok(
  system.registerShop(
    'shop_b',
    runtimeB,
    {day:10}
  )
);

const portfolio =
  system.portfolioSnapshot();

assert.equal(
  portfolio.version,
  '0.8.34'
);

assert.equal(
  portfolio.storeCount,
  2
);

assert.equal(
  portfolio.brand.name,
  '测试连锁'
);

assert.equal(
  portfolio.brand.level,
  10
);

assert.ok(
  portfolio.eligibility.storeCap >=
  5
);

assert.equal(
  portfolio.stores.length,
  2
);

const catalog =
  system.expansionCatalog();

assert.ok(
  catalog.length >=
  7
);

assert.ok(
  catalog.every(
    item =>
      Number.isFinite(
        item.opportunityScore
      ) &&
      Number.isFinite(
        item.threatScore
      ) &&
      item.estimatedLaunchCapital >
      0
  )
);

const plan =
  system.createExpansionPlan(
    catalog[0].districtId,
    {
      day:11,
      reserveRate:0.08
    }
  );

assert.ok(plan.ok);
assert.equal(plan.plan.status,'draft');

const before =
  gameState
    .getPlayer()
    .cash;

const commit =
  system.commitExpansionPlan(
    plan.plan.id,
    {
      day:11
    }
  );

assert.ok(commit.ok);

assert.equal(
  gameState
    .getPlayer()
    .cash,
  before -
    plan.plan.reserveAmount
);

const ranking =
  system.buildRanking({
    districtId:'cbd',
    day:11,
    limit:12
  });

assert.equal(
  ranking.version,
  '0.8.34'
);

assert.ok(
  Number.isFinite(
    ranking.playerRank
  )
);

assert.ok(
  ranking.total >
  1
);

console.log(
  'V0.8.34 multi-store/brand/expansion/ranking tests passed'
);
