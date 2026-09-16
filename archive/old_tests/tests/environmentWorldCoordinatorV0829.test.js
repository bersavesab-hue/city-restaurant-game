'use strict';

const assert =
  require('assert');

const gameState =
  require('../src/core/gameState.js');

const environment =
  require('../src/world/environmentWorldCoordinatorV0829.js');

gameState.reset();

gameState
  .getTime()
  .month =
  7;

gameState.setWeather(
  '暴雨',
  35
);

assert.equal(
  environment
    .seasonForMonth(7),
  'summer'
);

const weather =
  environment
    .weatherProfile(
      '暴雨',
      35,
      'summer'
    );

assert.ok(weather.deliveryMultiplier>1);
assert.ok(weather.utilityMultiplier>1);
assert.ok(weather.dineInMultiplier<1);

const snapshot =
  environment
    .snapshot({
      districtId:'cbd'
    });

assert.equal(snapshot.version,'0.8.29');
assert.equal(snapshot.season,'summer');
assert.equal(snapshot.eventPack.templates,360);
assert.equal(snapshot.policyPack.templates,160);
assert.ok(snapshot.modifiers);

console.log(
  'V0.8.29 event/policy/weather/season tests passed'
);
