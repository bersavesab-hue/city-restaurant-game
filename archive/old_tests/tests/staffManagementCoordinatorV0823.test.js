'use strict';

const assert =
  require('assert');

const gameState =
  require('../src/core/gameState.js');

const staffManagement =
  require('../src/operations/staffManagementCoordinatorV0823.js');

gameState.reset();

gameState.setCash(
  300000
);

gameState.addShop({
  id:'shop_staff_v0823',
  name:'员工协调测试店',
  districtId:'university',
  status:'preparing',
  usableArea:120,
  grossArea:130,
  seatEstimate:42,
  monthlyRent:12000
});

const candidates =
  staffManagement
    .candidatePool(
      'shop_staff_v0823'
    );

assert.ok(
  candidates.length >
  0
);

const beforeCash =
  gameState
    .getPlayer()
    .cash;

const hired =
  staffManagement
    .hireCandidate(
      'shop_staff_v0823',
      candidates[0].id
    );

assert.ok(
  hired.ok
);

assert.ok(
  hired.staff
);

assert.ok(
  gameState
    .getPlayer()
    .cash <
  beforeCash
);

const team =
  staffManagement
    .normalizeTeam(
      'shop_staff_v0823'
    );

assert.equal(
  team.length,
  1
);

assert.equal(
  team[0].databaseVersion,
  '0.8.22'
);

assert.ok(
  staffManagement
    .monthlyPayroll(
      'shop_staff_v0823'
    ) >
  0
);

const runtime = {
  staff:{
    employees:[],
    shifts:[],
    absences:[],
    training:[],
    payroll:0
  }
};

staffManagement
  .syncRuntimeStaff(
    runtime,
    'shop_staff_v0823'
  );

assert.equal(
  runtime.staff.employees.length,
  1
);

assert.equal(
  runtime
    .staff
    .employees[0]
    .staffId,
  team[0].id
);

const snapshot =
  staffManagement
    .teamSnapshot(
      'shop_staff_v0823',
      gameState.getTime()
    );

assert.equal(
  snapshot.version,
  '0.8.23'
);

assert.equal(
  snapshot.headcount,
  1
);

assert.ok(
  snapshot.monthlyPayroll >
  0
);

console.log(
  'V0.8.23 staff management coordinator tests passed'
);
