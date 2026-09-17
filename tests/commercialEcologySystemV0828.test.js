'use strict';

const assert =
  require('assert');

const gameState =
  require('../src/core/gameState.js');

const ecology =
  require('../src/world/commercialEcologySystemV0828.js');

gameState.reset();

gameState.addShop({
  id:'shop_ecology_v0828',
  name:'商圈测试店',
  districtId:'cbd',
  status:'open',
  usableArea:100
});

const scale =
  ecology.marketScale();

assert.equal(scale.version,'0.8.28');
assert.equal(scale.archetypes,64);
assert.equal(scale.simulationTiers.length,3);

const snapshot =
  ecology
    .snapshot(
      'shop_ecology_v0828',
      {
        limit:6
      }
    );

assert.equal(snapshot.version,'0.8.28');
assert.equal(snapshot.districtId,'cbd');
assert.ok(snapshot.population.total>=300);
assert.ok(snapshot.topCompetitors.length<=6);
assert.ok(snapshot.opportunityScore>=0);
assert.ok(snapshot.threatScore>=0);

console.log(
  'V0.8.28 commercial ecology tests passed'
);
