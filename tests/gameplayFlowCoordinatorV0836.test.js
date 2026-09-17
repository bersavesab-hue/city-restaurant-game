'use strict';

const assert =
  require('assert');

const moduleUnderTest =
  require('../src/core/gameplayFlowCoordinatorV0836.js');

function makeState() {
  const data = {
    business:{
      hasShop:false,
      currentShopId:null,
      shops:[],
      propertyProcess:{
        visits:{},
        negotiations:{},
        leases:{}
      }
    }
  };

  return {
    data,
    getBusiness() {
      return data.business;
    }
  };
}

const fakeState =
  makeState();

let stage =
  'city_setup';

let life =
  null;

let trialCalls =
  0;

let formalCalls =
  0;

const flow =
  moduleUnderTest
    .createCoordinator({
      gameState:
        fakeState,
      newGameFlow:{
        getProgress() {
          const shop =
            fakeState
              .getBusiness()
              .shops[0];

          const routeByStage = {
            city_setup:{
              routeId:'newGame',
              params:{}
            },
            property_search:{
              routeId:'city',
              params:{}
            },
            renovation:{
              routeId:'renovation',
              params:
                shop
                  ? {
                      shopId:
                        shop.id
                    }
                  : {}
            },
            equipment:{
              routeId:'equipment',
              params:
                shop
                  ? {
                      shopId:
                        shop.id
                    }
                  : {}
            },
            license:{
              routeId:'license',
              params:
                shop
                  ? {
                      shopId:
                        shop.id
                    }
                  : {}
            },
            staff:{
              routeId:'staff',
              params:
                shop
                  ? {
                      shopId:
                        shop.id
                    }
                  : {}
            },
            trial:{
              routeId:'shop',
              params:
                shop
                  ? {
                      shopId:
                        shop.id
                    }
                  : {}
            },
            formal_open:{
              routeId:'shop',
              params:
                shop
                  ? {
                      shopId:
                        shop.id
                    }
                  : {}
            },
            complete:{
              routeId:'shop',
              params:
                shop
                  ? {
                      shopId:
                        shop.id
                    }
                  : {}
            }
          };

          return {
            stage,
            completed:
              stage ===
              'complete',
            recommended:
              routeByStage[
                stage
              ]
          };
        }
      },
      businessLifecycle:{
        deriveStage() {
          return life;
        },
        startTrialOpening(
          shopId
        ) {
          trialCalls += 1;

          return {
            ok:true,
            shopId
          };
        },
        formalOpen(
          shopId
        ) {
          formalCalls += 1;

          return {
            ok:true,
            shopId
          };
        }
      },
      openingPrep:{
        getReadiness() {
          return {
            renovationReady:
              stage !==
              'renovation',
            equipmentReady:
              ![
                'renovation',
                'equipment'
              ].includes(stage),
            permitsReady:
              ![
                'renovation',
                'equipment',
                'license'
              ].includes(stage),
            staffingReady:
              ![
                'renovation',
                'equipment',
                'license',
                'staff'
              ].includes(stage)
          };
        }
      }
    });

let goal =
  flow.goal();

assert.equal(
  goal.phase,
  'new_game'
);

assert.equal(
  goal.recommended
    .routeId,
  'newGame'
);

stage =
  'property_search';

goal =
  flow.goal();

assert.equal(
  goal.phase,
  'property'
);

assert.equal(
  flow
    .primaryAction()
    .routeId,
  'city'
);

fakeState
  .getBusiness()
  .shops
  .push({
    id:'shop_1',
    name:'测试店',
    status:'signed'
  });

fakeState
  .getBusiness()
  .hasShop =
  false;

fakeState
  .getBusiness()
  .currentShopId =
  'missing_shop';

stage =
  'renovation';

life =
  'awaiting_renovation';

const repair =
  flow
    .repairSafeInvariants();

assert.ok(repair.changed);

assert.equal(
  fakeState
    .getBusiness()
    .hasShop,
  true
);

assert.equal(
  fakeState
    .getBusiness()
    .currentShopId,
  'shop_1'
);

goal =
  flow.goal();

assert.equal(
  goal.phase,
  'preparation'
);

assert.equal(
  goal.current,
  0
);

stage =
  'trial';

life =
  'ready_for_trial';

const primaryTrial =
  flow.primaryAction();

assert.equal(
  primaryTrial.id,
  'start_trial'
);

const trial =
  flow.executePrimary();

assert.ok(trial.ok);
assert.equal(trialCalls,1);

stage =
  'formal_open';

life =
  'trial_complete';

const formal =
  flow.executePrimary();

assert.ok(formal.ok);
assert.equal(formalCalls,1);

stage =
  'complete';

life =
  'formal_open';

goal =
  flow.goal();

assert.equal(
  goal.phase,
  'operation'
);

assert.equal(
  goal.primaryAction
    .routeId,
  'shop'
);

const diagnosis =
  flow.diagnose();

assert.ok(diagnosis.ok);
assert.equal(
  diagnosis.currentShopId,
  'shop_1'
);

console.log(
  'V0.8.36 gameplay flow coordinator tests passed'
);
