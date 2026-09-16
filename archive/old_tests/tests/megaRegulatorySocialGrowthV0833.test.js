'use strict';

const assert =
  require('assert');

const gameState =
  require('../src/core/gameState.js');

const seedManager =
  require('../src/core/seedManagerV0813.js');

const operations =
  require('../src/operations/operationsStoreV080.js');

gameState.reset();

seedManager.setMasterSeed(
  'mega-v0833-test',
  {
    resetSimulation:false
  }
);

gameState.setCash(
  500000
);

gameState.addShop({
  id:'shop_mega_v0833',
  name:'后半程四合一测试店',
  districtId:'cbd',
  status:'open',
  usableArea:120,
  greaseTrap:'有',
  fireSprinkler:'有',
  monthlyRent:15000
});

operations.resetCache();

const candidates =
  operations
    .staffCandidateRows(
      'shop_mega_v0833'
    );

assert.ok(candidates.length>0);

const hired =
  operations
    .hireStaffCandidate(
      'shop_mega_v0833',
      candidates[0].id
    );

assert.ok(hired.ok);

const social =
  operations
    .socialSnapshot(
      'shop_mega_v0833'
    );

assert.ok(
  social.actorCount >=
  1,
  '招聘员工后应进入统一社交关系网'
);

const regBefore =
  operations
    .regulatorySnapshot(
      'shop_mega_v0833'
    );

assert.equal(
  regBefore.version,
  '0.8.30'
);

const inspection =
  operations
    .runRegulatoryInspection(
      'shop_mega_v0833',
      {
        day:10,
        typeId:'food_safety',
        hygiene:70,
        traceability:75,
        staffCompliance:80,
        facility:80
      }
    );

assert.ok(inspection.ok);

const randA =
  operations
    .randomInt(
      'mega',
      'shop_mega_v0833',
      1,
      100000
    );

const randB =
  operations
    .randomInt(
      'mega',
      'shop_mega_v0833',
      1,
      100000
    );

assert.notEqual(randA,randB);

const growth =
  operations
    .evaluateGrowth(
      'shop_mega_v0833',
      {
        daysPlayed:45,
        profitDays:31,
        bestDailyRevenue:52000,
        totalCustomers:11000,
        reviewCount:550,
        rating:4.6,
        memberCount:1200,
        campaignCount:12,
        inspectionsPassed:6,
        noViolationStreak:30
      }
    );

assert.equal(
  growth.version,
  '0.8.33'
);

assert.ok(
  growth.achievementPoints >
  0
);

const growthSnapshot =
  operations
    .growthSnapshot(
      'shop_mega_v0833'
    );

assert.equal(
  growthSnapshot.version,
  '0.8.33'
);

assert.ok(
  growthSnapshot
    .achievementCatalog
    .length ===
  32
);

const randomSnapshot =
  operations
    .randomSnapshot();

assert.equal(
  randomSnapshot.version,
  '0.8.32'
);

assert.ok(
  randomSnapshot.streamCount >
  0
);

console.log(
  'V0.8.30-0.8.33 mega regulatory/social/random/growth integration tests passed'
);
