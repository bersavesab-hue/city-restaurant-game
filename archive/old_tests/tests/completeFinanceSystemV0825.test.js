'use strict';

const assert =
  require('assert');

const gameState =
  require('../src/core/gameState.js');

const finance =
  require('../src/finance/completeFinanceSystemV0825.js');

gameState.reset();

gameState.setCash(
  100000
);

gameState.addShop({
  id:'shop_finance_v0825',
  name:'财务测试店',
  districtId:'cbd',
  status:'open',
  usableArea:100,
  monthlyRent:12000
});

const income =
  finance
    .recordTransaction(
      'shop_finance_v0825',
      {
        direction:'in',
        category:'revenue',
        amount:1000,
        day:1,
        referenceId:'income_1',
        applyCash:true
      }
    );

assert.ok(
  income.ok
);

assert.equal(
  gameState
    .getPlayer()
    .cash,
  101000
);

const duplicate =
  finance
    .recordTransaction(
      'shop_finance_v0825',
      {
        direction:'in',
        category:'revenue',
        amount:1000,
        day:1,
        referenceId:'income_1',
        applyCash:true
      }
    );

assert.ok(
  duplicate.ok
);

assert.equal(
  duplicate.duplicate,
  true
);

assert.equal(
  gameState
    .getPlayer()
    .cash,
  101000
);

const expense =
  finance
    .recordExternalExpense(
      'shop_finance_v0825',
      'utilities',
      300,
      {
        day:1,
        referenceId:'utility_1',
        applyCash:true
      }
    );

assert.ok(
  expense.ok
);

assert.equal(
  gameState
    .getPlayer()
    .cash,
  100700
);

const order =
  finance
    .recordOrderSettlement(
      'shop_finance_v0825',
      {
        revenue:100,
        foodCost:30,
        platformFee:10,
        packaging:2,
        refund:0
      },
      {
        day:1,
        referenceId:'order_1',
        orderId:'order_1',
        applyCash:true
      }
    );

assert.ok(
  order.ok
);

assert.equal(
  gameState
    .getPlayer()
    .cash,
  100788
);

const statement =
  finance
    .syncDailyStatement(
      'shop_finance_v0825',
      {
        revenue:1100,
        foodCost:330,
        labor:100,
        rent:400,
        utilities:300,
        platformFees:10,
        packaging:2,
        marketing:0,
        compliance:0,
        waste:0,
        refunds:0,
        totalCost:1142,
        profit:-42,
        orders:10,
        customers:16,
        avgTicket:110,
        foodCostRate:30,
        profitRate:-3.8
      },
      1
    );

assert.equal(
  statement.day,
  1
);

const again =
  finance
    .syncDailyStatement(
      'shop_finance_v0825',
      statement,
      1
    );

assert.deepEqual(
  again,
  statement,
  '同一天财务结算不能重复写入'
);

const pl =
  finance
    .profitLoss(
      'shop_finance_v0825'
    );

assert.ok(
  pl.revenue >=
  1100
);

assert.ok(
  pl.expenses >=
  342
);

const snapshot =
  finance
    .snapshot(
      'shop_finance_v0825'
    );

assert.equal(
  snapshot.version,
  '0.8.25'
);

assert.equal(
  snapshot.playerCash,
  100788
);

assert.ok(
  snapshot.transactionCount >=
  5
);

console.log(
  'V0.8.25 complete finance system tests passed'
);
