'use strict';

const assert =
  require('assert');

const moduleUnderTest =
  require('../src/core/shopLifecycleV0816.js');

function makeState() {
  const data = {
    time:{
      year:1,
      month:4,
      day:12
    },
    business:{
      hasShop:true,
      currentShopId:'shop_1',
      shops:[
        {
          id:'shop_1',
          status:'leased_pending_renovation'
        }
      ],
      renovations:{},
      openingPrep:{
        equipment:{},
        permits:{},
        staffing:{}
      },
      lifecycle:{ shops:{} },
      propertyProcess:{
        leases:{}
      }
    }
  };

  return {
    data,
    getBusiness() {
      return data.business;
    },
    getTime() {
      return data.time;
    },
    getPropertyProcess() {
      return data.business
        .propertyProcess;
    }
  };
}

const state =
  makeState();

const events = [];

const lifecycle =
  moduleUnderTest
    .createLifecycle({
      gameState:state,
      bus:{
        emit(type, payload) {
          events.push({
            type,
            payload
          });
        }
      },
      now:() => 816000
    });

const shop =
  state.data.business
    .shops[0];

assert.equal(
  lifecycle.deriveStage(
    shop
  ),
  'awaiting_renovation'
);

assert.equal(
  lifecycle.deriveStage(
    shop,
    {
      renovationStatus:
        'constructing'
    }
  ),
  'renovating'
);

assert.equal(
  lifecycle.deriveStage(
    shop,
    {
      renovationStatus:
        'completed',
      equipmentStatus:
        'planning'
    }
  ),
  'awaiting_equipment'
);

assert.equal(
  lifecycle.deriveStage(
    shop,
    {
      renovationStatus:
        'completed',
      equipmentStatus:
        'ordered'
    }
  ),
  'equipment_installing'
);

assert.equal(
  lifecycle.deriveStage(
    shop,
    {
      renovationStatus:
        'completed',
      equipmentStatus:
        'installed',
      permitTotal:3,
      permitsApproved:0,
      permitsApplying:false
    }
  ),
  'awaiting_permits'
);

assert.equal(
  lifecycle.deriveStage(
    shop,
    {
      renovationStatus:
        'completed',
      equipmentStatus:
        'installed',
      permitTotal:3,
      permitsApproved:1,
      permitsApplying:true
    }
  ),
  'permits_reviewing'
);

assert.equal(
  lifecycle.deriveStage(
    shop,
    {
      renovationStatus:
        'completed',
      equipmentStatus:
        'installed',
      permitTotal:3,
      permitsApproved:3,
      staffCoverage:0.6
    }
  ),
  'awaiting_staff'
);

const readyEvidence = {
  renovationStatus:'completed',
  equipmentStatus:'installed',
  permitTotal:3,
  permitsApproved:3,
  permitsApplying:false,
  staffCoverage:1
};

assert.equal(
  lifecycle.deriveStage(
    shop,
    readyEvidence
  ),
  'ready_for_trial'
);

let sync =
  lifecycle.syncShop(
    shop,
    readyEvidence,
    {
      reason:'ready-test',
      day:10
    }
  );

assert.ok(sync.ok);
assert.equal(
  shop.lifecycleStage,
  'ready_for_trial'
);
assert.ok(sync.changed);

shop.status =
  'trial_opening';

assert.equal(
  lifecycle.deriveStage(
    shop,
    readyEvidence
  ),
  'trial_opening'
);

shop.status =
  'trial_complete';

assert.equal(
  lifecycle.deriveStage(
    shop,
    readyEvidence
  ),
  'trial_complete'
);

shop.status =
  'open';

sync =
  lifecycle.syncShop(
    shop,
    readyEvidence,
    {
      reason:'formal-open',
      day:12
    }
  );

assert.equal(
  sync.stage,
  'formal_open'
);

const paused =
  lifecycle.pauseShop(
    shop.id,
    'manual_test'
  );

assert.ok(paused.ok);
assert.equal(
  shop.status,
  'paused'
);
assert.equal(
  lifecycle.deriveStage(
    shop,
    readyEvidence
  ),
  'paused'
);

const resumed =
  lifecycle.resumeShop(
    shop.id
  );

assert.ok(resumed.ok);
assert.equal(
  shop.status,
  'open'
);
assert.equal(
  lifecycle.deriveStage(
    shop,
    readyEvidence
  ),
  'formal_open'
);

state.data.business
  .propertyProcess
  .leases
  .lease_1 = {
    shopId:'shop_1',
    lifecycle:{
      status:'terminated'
    }
  };

sync =
  lifecycle.syncShop(
    shop,
    readyEvidence,
    {
      reason:'terminated-lease',
      day:13
    }
  );

assert.equal(
  sync.stage,
  'closed'
);
assert.equal(
  shop.status,
  'closed',
  '终止租约必须强制进入closed'
);

assert.equal(
  lifecycle.deriveStage(
    shop,
    readyEvidence
  ),
  'closed',
  '筹备全部完成也不能让closed门店复活'
);

assert.equal(
  lifecycle.canAction(
    shop,
    'start_trial',
    readyEvidence
  ),
  false
);

const history =
  lifecycle.getHistory(
    shop.id
  );

assert.ok(
  history.length >= 4
);

assert.ok(
  history.some(
    row =>
      row.to ===
      'closed'
  )
);

assert.ok(
  events.some(
    row =>
      row.type ===
      'shop.lifecycle.changed'
  )
);

const audit =
  lifecycle.auditShop(
    shop,
    readyEvidence
  );

assert.ok(
  audit.ok,
  audit.issues.join('; ')
);

console.log(
  'V0.8.16 shop lifecycle state machine tests passed'
);
