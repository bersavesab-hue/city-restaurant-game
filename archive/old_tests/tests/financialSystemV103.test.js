'use strict';

const assert = require('assert');

if (!globalThis.GameRuntime) {
  globalThis.GameRuntime = {
    api: {
      setStorageSync() {},
      getStorageSync() { return null; },
      removeStorageSync() {}
    }
  };
}

const gameState = require('../src/core/gameState.js');
const finance = require('../src/finance/financialSystemV103.js');

gameState.reset();
gameState.setCash(80000);
gameState.addShop({
  id: 'finance_v103_shop',
  name: '金融测试店',
  districtId: 'university',
  status: 'open',
  usableArea: 100,
  grossArea: 115,
  monthlyRent: 9000
});

gameState.getBusiness().currentShopId = 'finance_v103_shop';

const base = finance.snapshot('finance_v103_shop');
assert.ok(base, '必须能建立金融快照');
assert.ok(base.score >= 300 && base.score <= 850, '信用评分必须在300-850');
assert.ok(base.offers.some(row => row.id === 'working'), '必须提供经营周转贷');

const working = base.offers.find(row => row.id === 'working');
assert.ok(working.available, '基础经营门店应至少可申请周转贷');
assert.ok(working.approvedLimit >= 10000, '周转授信不得低于最低可借金额');

const cashBefore = gameState.getPlayer().cash;
const borrowed = finance.borrow('finance_v103_shop', 'working', 0.5);
assert.ok(borrowed.ok, borrowed.message || '借款应成功');
assert.ok(gameState.getPlayer().cash > cashBefore, '放款必须真实增加现金');

let afterBorrow = finance.snapshot('finance_v103_shop');
assert.equal(afterBorrow.debt.activeCount, 1, '借款后必须形成一笔在还贷款');
assert.ok(afterBorrow.debt.totalDebt > 0, '借款后必须形成债务余额');
assert.ok(afterBorrow.debt.monthlyDebtService > 0, '必须产生月供');

const loan = afterBorrow.loans[0];
const principalBefore = loan.principalOutstanding;
const cashBeforeRepay = gameState.getPlayer().cash;
const paid = finance.repayDue(loan.id);
assert.ok(paid.ok, paid.message || '主动还本期应成功');
assert.ok(gameState.getPlayer().cash < cashBeforeRepay, '还款必须真实扣现金');

afterBorrow = finance.snapshot('finance_v103_shop');
const loanAfterPay = afterBorrow.loans.find(row => row.id === loan.id);
assert.ok(!loanAfterPay || loanAfterPay.principalOutstanding < principalBefore, '还款必须减少贷款本金');

if (loanAfterPay) {
  gameState.setCash(0);
  const time = gameState.getTime();
  time.month = Math.min(12, (Number(time.month) || 1) + 1);
  finance.update();
  const overdue = finance.snapshot('finance_v103_shop');
  assert.ok(overdue.debt.overdue >= 0, '跨月后必须能计算逾期/还款状态');
  assert.ok(overdue.score <= 850, '信用评分不得溢出');

  gameState.setCash(1000000);
  const settle = finance.settleLoan(loan.id);
  assert.ok(settle.ok, settle.message || '现金充足时应允许提前结清');
  const finalSnap = finance.snapshot('finance_v103_shop');
  assert.ok(!finalSnap.loans.some(row => row.id === loan.id), '结清后贷款不应继续出现在在还列表');
}

console.log('financialSystemV103.test.js PASS');
