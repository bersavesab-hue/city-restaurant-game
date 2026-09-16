'use strict';

const assert =
  require('assert');

const gameState =
  require('../src/core/gameState.js');

const lifecycle =
  require('../src/core/businessLifecycleV086.js');

const shopLifecycle =
  require('../src/core/shopLifecycleV0816.js');

const renovationSystem =
  require('../src/renovation/renovationSystem.js');

const openingPrepSystem =
  require('../src/opening/openingPrepSystem.js');

gameState.reset();

gameState.setCash(
  500000
);

gameState.addShop({
  id:'shop_v0816',
  name:'生命周期测试店',
  status:'leased_pending_renovation',
  districtId:'university',
  grossArea:90,
  usableArea:80,
  seatEstimate:28,
  monthlyRent:3000,
  freeRentDays:5,
  paymentMonths:1,
  depositMonths:2,
  leaseYears:3,
  annualIncrease:0.03
});

const shop =
  gameState
    .getBusiness()
    .shops[0];

renovationSystem
  .ensurePlan(
    shop.id
  );

gameState
  .getRenovations()[
    shop.id
  ].status =
  'completed';

const equipment =
  openingPrepSystem
    .ensureEquipment(
      shop.id
    );

equipment.status =
  'installed';

const permits =
  openingPrepSystem
    .getPermitState(
      shop.id
    );

for (
  const id
  of Object.keys(
    permits.items
  )
) {
  permits.items[
    id
  ].status =
    'approved';

  permits.items[
    id
  ].issue =
    null;
}

const staff =
  openingPrepSystem
    .getStaffState(
      shop.id
    );

staff.hired = [
  {
    id:'m1',
    roleId:'manager',
    wage:7200
  },
  {
    id:'c1',
    roleId:'chef',
    wage:6800
  },
  {
    id:'s1',
    roleId:'server',
    wage:4200
  },
  {
    id:'s2',
    roleId:'server',
    wage:4200
  },
  {
    id:'k1',
    roleId:'cashier',
    wage:4300
  }
];

const ready =
  openingPrepSystem
    .getReadiness(
      shop.id
    );

assert.ok(
  ready.ready,
  '完整筹备后必须ready'
);

assert.equal(
  shop.status,
  'ready_for_trial'
);

assert.equal(
  lifecycle
    .deriveStage(
      shop
    ),
  'ready_for_trial'
);

const trial =
  lifecycle
    .startTrialOpening(
      shop.id
    );

assert.ok(
  trial.ok
);

assert.equal(
  shop.status,
  'trial_opening'
);

shop.status =
  'trial_complete';

const formal =
  lifecycle
    .formalOpen(
      shop.id
    );

assert.ok(
  formal.ok
);

assert.equal(
  shop.status,
  'open'
);

const paused =
  lifecycle
    .pauseShop(
      shop.id,
      'manual_test'
    );

assert.ok(
  paused.ok
);

assert.equal(
  shop.status,
  'paused'
);

assert.equal(
  lifecycle
    .deriveStage(
      shop
    ),
  'paused'
);

const resume =
  lifecycle
    .resumeShop(
      shop.id
    );

assert.ok(
  resume.ok
);

assert.equal(
  shop.status,
  'open'
);

shopLifecycle
  .markClosed(
    shop.id,
    'integration_closed',
    100
  );

assert.equal(
  shop.status,
  'closed'
);

const closedReadiness =
  openingPrepSystem
    .getReadiness(
      shop.id
    );

assert.ok(
  closedReadiness.ready,
  '关闭不应破坏已完成筹备数据'
);

assert.equal(
  shop.status,
  'closed',
  '刷新筹备页不能把closed门店改回ready_for_trial'
);

assert.equal(
  lifecycle
    .deriveStage(
      shop
    ),
  'closed'
);

assert.equal(
  lifecycle
    .startTrialOpening(
      shop.id
    )
    .ok,
  false,
  'closed门店不能重新开始试营业'
);

const audit =
  shopLifecycle
    .auditAll();

assert.ok(
  audit.ok,
  JSON.stringify(
    audit.rows
  )
);

console.log(
  'V0.8.16 lifecycle integration tests passed'
);
