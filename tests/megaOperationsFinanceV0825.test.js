'use strict';

const assert =
  require('assert');

const gameState =
  require('../src/core/gameState.js');

const operations =
  require('../src/operations/operationsStoreV080.js');

gameState.reset();

gameState.setCash(
  500000
);

gameState.addShop({
  id:'shop_mega_v0825',
  name:'四合一测试店',
  districtId:'cbd',
  status:'preparing',
  usableArea:120,
  grossArea:132,
  seatEstimate:42,
  monthlyRent:15000
});

operations.resetCache();

const candidates =
  operations
    .staffCandidateRows(
      'shop_mega_v0825'
    );

assert.ok(
  candidates.length >
  0
);

const hired =
  operations
    .hireStaffCandidate(
      'shop_mega_v0825',
      candidates[0].id
    );

assert.ok(
  hired.ok
);

const staff =
  operations
    .staffManagementSnapshot(
      'shop_mega_v0825'
    );

assert.ok(
  staff.headcount >=
  1
);

const customer =
  operations
    .generateCustomer(
      'shop_mega_v0825',
      {
        districtId:'cbd'
      }
    );

assert.ok(
  customer.ok
);

const live =
  operations
    .liveOperationsSnapshot(
      'shop_mega_v0825'
    );

assert.equal(
  live.version,
  '0.8.24'
);

assert.ok(
  live.staff
);

assert.ok(
  live.customers
);

const financeBefore =
  operations
    .financeSnapshot(
      'shop_mega_v0825'
    );

assert.equal(
  financeBefore.version,
  '0.8.25'
);

assert.ok(
  financeBefore
    .transactionCount >=
  1,
  '招聘成本必须进入统一财务记录'
);

const cashBefore =
  gameState
    .getPlayer()
    .cash;

const expense =
  operations
    .recordFinanceExpense(
      'shop_mega_v0825',
      'maintenance',
      250,
      {
        day:1,
        referenceId:
          'mega-maintenance-1'
      }
    );

assert.ok(
  expense.ok
);

assert.equal(
  gameState
    .getPlayer()
    .cash,
  cashBefore -
    250
);

const transactions =
  operations
    .financeTransactions(
      'shop_mega_v0825',
      {}
    );

assert.ok(
  transactions.some(
    row =>
      row.category ===
      'hiring'
  )
);

assert.ok(
  transactions.some(
    row =>
      row.category ===
      'maintenance'
  )
);

operations.persist(
  'shop_mega_v0825'
);

operations.resetCache();

const afterReload =
  operations
    .liveOperationsSnapshot(
      'shop_mega_v0825'
    );

assert.ok(
  afterReload
    .staff
    .headcount >=
  1,
  '清缓存重载后员工统一状态不能丢失'
);

console.log(
  'V0.8.22-0.8.25 mega integration tests passed'
);
