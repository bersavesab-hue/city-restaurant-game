'use strict';

const assert =
  require('assert');

const gameState =
  require('../src/core/gameState.js');

const newGameFlow =
  require('../src/core/newGameFlowV0814.js');

const gameplay =
  require('../src/core/gameplayFlowCoordinatorV0836.js');

const access =
  require('../src/core/featureAccessPolicyV0837.js');

const safety =
  require('../src/core/interactionRecoverySystemV0838.js');

const balance =
  require('../src/core/economyBalanceGuardV0839.js');

gameState.reset();

newGameFlow.initialize({
  fresh:true,
  restoredFromSave:false
});

let goal =
  gameplay.goal();

assert.equal(
  goal.phase,
  'new_game'
);

assert.equal(
  goal.primaryAction
    .routeId,
  'newGame'
);

assert.equal(
  access
    .evaluate(
      'shop'
    )
    .allowed,
  false
);

assert.equal(
  access
    .evaluate(
      'system'
    )
    .allowed,
  true
);

const repair =
  safety
    .repairCriticalState();

assert.ok(
  repair.validation.ok
);

const balanceView =
  balance.snapshot();

assert.equal(
  balanceView.version,
  '0.8.39'
);

const diagnosis =
  gameplay.diagnose();

assert.ok(diagnosis.ok);

assert.equal(
  diagnosis.stage,
  'city_setup'
);

console.log(
  'V0.8.36-0.8.39 gameplay experience integration tests passed'
);
