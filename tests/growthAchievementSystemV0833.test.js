'use strict';

const assert =
  require('assert');

const gameState =
  require('../src/core/gameState.js');

const seedManager =
  require('../src/core/seedManagerV0813.js');

const easterPack =
  require('../src/easteregg/easterEggPackV10.js');

const growth =
  require('../src/progress/growthAchievementSystemV0833.js');

gameState.reset();

seedManager.setMasterSeed(
  'growth-v0833-test',
  {
    resetSimulation:false
  }
);

gameState.addShop({
  id:'shop_growth_v0833',
  name:'成长测试店',
  districtId:'cbd',
  status:'open'
});

const runtime = {
  day:40,
  brand:{
    level:10,
    xp:12000,
    storeCount:1
  },
  shop:{
    id:'shop_growth_v0833',
    rating:4.7,
    reviewCount:620
  },
  staff:{
    employees:
      Array.from(
        {length:12},
        (_,i)=>({
          id:'staff_'+i,
          active:true
        })
      )
  },
  campaigns:
    Array.from(
      {length:12},
      (_,i)=>({
        id:'campaign_'+i
      })
    ),
  supplierNetwork:
    Array.from(
      {length:15},
      (_,i)=>({
        id:'supplier_'+i
      })
    )
};

const result =
  growth
    .evaluate(
      'shop_growth_v0833',
      runtime,
      {
        daysPlayed:40,
        profitDays:32,
        bestDailyRevenue:56000,
        totalCustomers:12000,
        reviewCount:620,
        rating:4.7,
        memberCount:1200,
        staffCount:12,
        campaignCount:12,
        supplierCount:15,
        inspectionsPassed:8,
        noViolationStreak:32
      }
    );

assert.equal(result.version,'0.8.33');
assert.ok(result.unlocked.length>0);
assert.ok(result.achievementPoints>0);

const overview =
  growth
    .overview(
      'shop_growth_v0833',
      runtime
    );

assert.equal(overview.version,'0.8.33');
assert.equal(overview.brand.level,10);
assert.equal(overview.achievementCatalog.length,32);
assert.equal(overview.featureCatalog.length,18);
assert.ok(overview.achievements.length>=10);
assert.ok(overview.unlockedFeatures.length>=5);

const firstHidden =
  easterPack
    .HIDDEN_CHARACTERS[0];

assert.ok(firstHidden);

growth.addClue(
  firstHidden.id,
  firstHidden.clues[0] ||
  '测试线索'
);

assert.ok(
  growth.discoverHidden(
    'shop_growth_v0833',
    firstHidden.id
  )
);

const afterHidden =
  growth
    .overview(
      'shop_growth_v0833',
      runtime
    );

assert.ok(
  afterHidden
    .hiddenContent
    .discovered
    .includes(
      firstHidden.id
    )
);

assert.ok(
  afterHidden
    .hiddenContent
    .dataScale
    .hiddenCharacters >
  0
);

assert.ok(
  afterHidden
    .hiddenContent
    .dataScale
    .easterEvents >
  0
);

console.log(
  'V0.8.33 growth/unlock/achievement/hidden content tests passed'
);
