'use strict';

const gameState = require('../core/gameState.js');
const completeFinance = require('./completeFinanceSystemV0825.js');

const VERSION = '1.0.3';

const PRODUCTS = Object.freeze({
  working: {
    id: 'working',
    name: '经营周转贷',
    purpose: '补库存、工资、水电和短期经营周转',
    minScore: 520,
    termMonths: 12,
    baseRate: 0.095,
    minLimit: 15000,
    maxLimit: 200000
  },
  equipment: {
    id: 'equipment',
    name: '设备升级贷',
    purpose: '厨房设备、前厅设备和产能升级',
    minScore: 560,
    termMonths: 24,
    baseRate: 0.078,
    minLimit: 30000,
    maxLimit: 280000
  },
  expansion: {
    id: 'expansion',
    name: '扩店发展贷',
    purpose: '新店押金、装修、设备和扩张准备金',
    minScore: 620,
    termMonths: 36,
    baseRate: 0.068,
    minLimit: 50000,
    maxLimit: 600000
  }
});

function clone(value) {
  if (value === undefined) return undefined;
  return JSON.parse(JSON.stringify(value));
}

function round(value) {
  return Math.round((Number(value) || 0) * 100) / 100;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, Number(value) || 0));
}

function moneyStep(value, step) {
  const s = Math.max(1, Number(step) || 5000);
  return Math.max(0, Math.floor((Number(value) || 0) / s) * s);
}

function monthIndex(time) {
  const t = time || {};
  const year = Math.max(1, Number(t.year) || 1);
  const month = clamp(Number(t.month) || 1, 1, 12);
  return year * 12 + month;
}

function monthLabel(index) {
  const raw = Math.max(13, Number(index) || 13);
  const year = Math.max(1, Math.floor((raw - 1) / 12));
  const month = ((raw - 1) % 12) + 1;
  return `第${year}年${month}月`;
}

function currentShop(shopId) {
  const business = gameState.getBusiness();
  const shops = Array.isArray(business.shops) ? business.shops : [];
  return shops.find(item => item && item.id === shopId) ||
    shops.find(item => item && item.id === business.currentShopId) ||
    shops[0] || null;
}

function ensureStore() {
  const finance = gameState.getFinance();
  if (!finance.bankingV103 || typeof finance.bankingV103 !== 'object') {
    finance.bankingV103 = {
      version: VERSION,
      sequence: 0,
      loans: [],
      paymentHistory: [],
      totalLatePayments: 0,
      lastProcessedMonthIndex: null
    };
  }

  const store = finance.bankingV103;
  store.version = VERSION;
  store.sequence = Math.max(0, Number(store.sequence) || 0);
  store.loans = Array.isArray(store.loans) ? store.loans : [];
  store.paymentHistory = Array.isArray(store.paymentHistory) ? store.paymentHistory : [];
  store.totalLatePayments = Math.max(0, Number(store.totalLatePayments) || 0);
  if (store.lastProcessedMonthIndex != null) {
    store.lastProcessedMonthIndex = Number(store.lastProcessedMonthIndex) || null;
  }
  return store;
}

function accountMetrics(shopId) {
  const account = completeFinance.ensureShopAccount(shopId || 'global');
  const statements = Array.isArray(account.dailyStatements)
    ? account.dailyStatements.slice(-30)
    : [];
  const revenue30 = round(statements.reduce((sum, row) => sum + (Number(row.revenue) || 0), 0));
  const profit30 = round(statements.reduce((sum, row) => sum + (Number(row.profit) || 0), 0));
  const orders30 = Math.round(statements.reduce((sum, row) => sum + (Number(row.orders) || 0), 0));
  const profitableDays = statements.filter(row => Number(row.profit) > 0).length;
  const operatingDays = statements.length;
  const avgDailyRevenue = operatingDays ? revenue30 / operatingDays : 0;
  const avgDailyProfit = operatingDays ? profit30 / operatingDays : 0;
  return {
    operatingDays,
    profitableDays,
    revenue30,
    profit30,
    orders30,
    avgDailyRevenue: round(avgDailyRevenue),
    avgDailyProfit: round(avgDailyProfit),
    projectedMonthlyRevenue: round(avgDailyRevenue * 30),
    projectedMonthlyProfit: round(avgDailyProfit * 30)
  };
}

function normalizeLoan(loan) {
  loan.originalPrincipal = round(Math.max(0, Number(loan.originalPrincipal || loan.principal) || 0));
  loan.principalOutstanding = round(Math.max(0, Number(loan.principalOutstanding) || loan.originalPrincipal));
  loan.annualRate = Math.max(0, Number(loan.annualRate) || 0);
  loan.termMonths = Math.max(1, Number(loan.termMonths) || 12);
  loan.monthlyPayment = round(Math.max(0, Number(loan.monthlyPayment) || 0));
  loan.monthsPaid = Math.max(0, Number(loan.monthsPaid) || 0);
  loan.nextDueMonthIndex = Math.max(1, Number(loan.nextDueMonthIndex) || (monthIndex(gameState.getTime()) + 1));
  loan.overduePrincipal = round(Math.max(0, Number(loan.overduePrincipal) || 0));
  loan.overdueInterest = round(Math.max(0, Number(loan.overdueInterest) || 0));
  loan.missedPayments = Math.max(0, Number(loan.missedPayments) || 0);
  loan.totalInterestPaid = round(Math.max(0, Number(loan.totalInterestPaid) || 0));
  loan.totalPrincipalPaid = round(Math.max(0, Number(loan.totalPrincipalPaid) || 0));
  if (!loan.status) loan.status = loan.principalOutstanding > 0 ? 'active' : 'paid';
  return loan;
}

function allLoans() {
  return ensureStore().loans.map(normalizeLoan);
}

function loansForShop(shopId) {
  return allLoans().filter(loan => loan.shopId === shopId && loan.status !== 'cancelled');
}

function activeLoans(shopId) {
  return loansForShop(shopId).filter(loan => loan.status === 'active' || loan.status === 'overdue');
}

function annuityPayment(principal, annualRate, months) {
  const p = Math.max(0, Number(principal) || 0);
  const n = Math.max(1, Number(months) || 1);
  const r = Math.max(0, Number(annualRate) || 0) / 12;
  if (p <= 0) return 0;
  if (r <= 0) return round(p / n);
  return round(p * r / (1 - Math.pow(1 + r, -n)));
}

function scheduledDue(loan) {
  normalizeLoan(loan);
  if (loan.principalOutstanding <= 0) {
    return { principal: 0, interest: 0, total: 0 };
  }
  const interest = round(loan.principalOutstanding * loan.annualRate / 12);
  const planned = loan.monthlyPayment > 0
    ? loan.monthlyPayment
    : annuityPayment(loan.originalPrincipal, loan.annualRate, loan.termMonths);
  const principal = round(Math.min(
    loan.principalOutstanding,
    Math.max(1, planned - interest)
  ));
  return {
    principal,
    interest,
    total: round(principal + interest)
  };
}

function migrateOpeningLoans() {
  const finance = gameState.getFinance();
  const opening = finance.openingLoans && typeof finance.openingLoans === 'object'
    ? finance.openingLoans
    : {};
  const store = ensureStore();
  let changed = false;
  const nowMonth = monthIndex(gameState.getTime());

  Object.keys(opening).forEach(shopId => {
    const row = opening[shopId];
    if (!row || row.migratedToBankingV103) return;
    const id = `finance_opening_${shopId}`;
    if (!store.loans.some(loan => loan.id === id)) {
      const principal = Math.max(0, Number(row.principal) || 0);
      store.loans.push(normalizeLoan({
        id,
        version: VERSION,
        shopId,
        productId: 'opening',
        productName: '开店周转金',
        originalPrincipal: principal,
        principalOutstanding: principal,
        annualRate: Math.max(0, Number(row.annualRate) || 0.1),
        termMonths: Math.max(1, Number(row.termMonths) || 18),
        monthlyPayment: Math.max(1, Number(row.monthlyPayment) || annuityPayment(principal, Number(row.annualRate) || 0.1, Number(row.termMonths) || 18)),
        monthsPaid: Math.max(0, Number(row.paidMonths) || 0),
        nextDueMonthIndex: nowMonth + 1,
        overduePrincipal: 0,
        overdueInterest: 0,
        missedPayments: 0,
        totalInterestPaid: 0,
        totalPrincipalPaid: 0,
        status: 'active',
        source: 'openingFinanceSystem'
      }));
    }
    row.migratedToBankingV103 = true;
    changed = true;
  });
  return changed;
}

function debtSummary(shopId) {
  const rows = activeLoans(shopId);
  const totalDebt = round(rows.reduce((sum, loan) => sum + loan.principalOutstanding + loan.overdueInterest, 0));
  const monthlyDebtService = round(rows.reduce((sum, loan) => sum + scheduledDue(loan).total, 0));
  const overdue = round(rows.reduce((sum, loan) => sum + loan.overduePrincipal + loan.overdueInterest, 0));
  const missedPayments = rows.reduce((sum, loan) => sum + (Number(loan.missedPayments) || 0), 0);
  return {
    activeCount: rows.length,
    totalDebt,
    monthlyDebtService,
    overdue,
    missedPayments
  };
}

function creditScore(shopId) {
  migrateOpeningLoans();
  const metrics = accountMetrics(shopId);
  const debt = debtSummary(shopId);
  const cash = Math.max(0, Number(gameState.getPlayer().cash) || 0);
  let score = 625;

  score += Math.min(50, metrics.operatingDays * 2);
  if (metrics.operatingDays > 0) {
    const profitableRatio = metrics.profitableDays / metrics.operatingDays;
    score += (profitableRatio - 0.5) * 80;
  }
  if (metrics.profit30 > 0) score += Math.min(45, metrics.profit30 / 1500);
  if (metrics.profit30 < 0) score -= Math.min(60, Math.abs(metrics.profit30) / 1200);
  score += Math.min(35, cash / 5000);
  score -= debt.missedPayments * 45;
  if (debt.overdue > 0) score -= 55;

  const projected = Math.max(1, metrics.projectedMonthlyRevenue);
  const debtRatio = debt.monthlyDebtService / projected;
  if (metrics.projectedMonthlyRevenue > 0) {
    score -= Math.max(0, debtRatio - 0.12) * 160;
  }

  return Math.round(clamp(score, 300, 850));
}

function scoreGrade(score) {
  const s = Number(score) || 0;
  if (s >= 760) return 'A+';
  if (s >= 700) return 'A';
  if (s >= 650) return 'B+';
  if (s >= 600) return 'B';
  if (s >= 550) return 'C';
  return 'D';
}

function productOffer(shopId, productId) {
  const product = PRODUCTS[productId];
  const shop = currentShop(shopId);
  if (!product || !shop) return null;

  const metrics = accountMetrics(shop.id);
  const debt = debtSummary(shop.id);
  const score = creditScore(shop.id);
  const cash = Math.max(0, Number(gameState.getPlayer().cash) || 0);
  const area = Math.max(20, Number(shop.usableArea || shop.grossArea) || 60);
  const projected = Math.max(metrics.projectedMonthlyRevenue, metrics.revenue30);

  let rawLimit = product.minLimit;
  if (product.id === 'working') {
    rawLimit = projected * 0.8 + cash * 0.25 + 20000;
  } else if (product.id === 'equipment') {
    rawLimit = area * 1200 + projected * 0.25 + 25000;
  } else if (product.id === 'expansion') {
    rawLimit = projected * 1.8 + cash * 0.4 + 30000;
  }

  rawLimit *= clamp(0.7 + (score - 550) / 500, 0.55, 1.25);
  rawLimit = clamp(rawLimit, product.minLimit, product.maxLimit);

  const availableLimit = moneyStep(Math.max(0, rawLimit - debt.totalDebt * 0.35), 5000);
  const debtRatio = metrics.projectedMonthlyRevenue > 0
    ? debt.monthlyDebtService / metrics.projectedMonthlyRevenue
    : 0;
  const rate = Number(clamp(
    product.baseRate + (650 - score) * 0.00015 + Math.min(0.025, debtRatio * 0.03),
    product.baseRate - 0.012,
    product.baseRate + 0.055
  ).toFixed(4));

  let available = score >= product.minScore && availableLimit >= 10000 && debt.overdue <= 0;
  let reason = null;

  if (product.id === 'expansion') {
    const openEnough = ['open', 'trial_opening', 'trial_complete'].includes(shop.status) && metrics.operatingDays >= 7;
    if (!openEnough) {
      available = false;
      reason = '至少完成7个经营日后开放扩店授信';
    }
  }

  if (score < product.minScore) reason = `信用评分需达到${product.minScore}`;
  if (debt.overdue > 0) reason = '存在逾期，先结清逾期款';
  if (availableLimit < 10000 && !reason) reason = '当前可用授信不足';

  const recommended = moneyStep(Math.max(10000, availableLimit * 0.5), 5000);
  return {
    id: product.id,
    name: product.name,
    purpose: product.purpose,
    minScore: product.minScore,
    score,
    available,
    reason,
    annualRate: rate,
    termMonths: product.termMonths,
    approvedLimit: availableLimit,
    recommended: Math.min(availableLimit, recommended),
    estimatedMonthlyPayment: annuityPayment(Math.max(0, Math.min(availableLimit, recommended)), rate, product.termMonths)
  };
}

function offers(shopId) {
  const shop = currentShop(shopId);
  if (!shop) return [];
  return Object.keys(PRODUCTS).map(id => productOffer(shop.id, id));
}

function syncOpeningLoan(loan) {
  if (!loan || loan.productId !== 'opening') return;
  const opening = gameState.getFinance().openingLoans || {};
  const row = opening[loan.shopId];
  if (!row) return;
  row.outstanding = round(loan.principalOutstanding + loan.overdueInterest);
  row.paidMonths = Math.max(0, Number(loan.monthsPaid) || 0);
  row.status = loan.status;
}

function addHistory(row) {
  const store = ensureStore();
  store.paymentHistory.push({
    id: `finance_payment_${++store.sequence}`,
    version: VERSION,
    ...clone(row)
  });
  if (store.paymentHistory.length > 800) {
    store.paymentHistory = store.paymentHistory.slice(-800);
  }
}

function applyPayment(loan, principal, interest, kind, dueMonthIndex) {
  const p = round(Math.max(0, Number(principal) || 0));
  const i = round(Math.max(0, Number(interest) || 0));
  const total = round(p + i);
  if (total <= 0) return { ok: false, message: '没有需要偿还的金额' };
  if (!gameState.spendCash(total)) return { ok: false, message: '可用资金不足' };

  loan.principalOutstanding = round(Math.max(0, loan.principalOutstanding - p));
  loan.totalPrincipalPaid = round(loan.totalPrincipalPaid + p);
  loan.totalInterestPaid = round(loan.totalInterestPaid + i);
  loan.monthsPaid += kind === 'scheduled' ? 1 : 0;

  if (i > 0) {
    completeFinance.recordExternalExpense(loan.shopId, 'interest', i, {
      applyCash: false,
      referenceId: `bank:${loan.id}:${dueMonthIndex || monthIndex(gameState.getTime())}:interest`,
      note: `${loan.productName || '贷款'}利息`
    });
  }

  addHistory({
    loanId: loan.id,
    shopId: loan.shopId,
    type: kind,
    principal: p,
    interest: i,
    amount: total,
    monthIndex: dueMonthIndex || monthIndex(gameState.getTime()),
    monthLabel: monthLabel(dueMonthIndex || monthIndex(gameState.getTime())),
    status: 'paid'
  });

  if (loan.principalOutstanding <= 0.01) {
    loan.principalOutstanding = 0;
    loan.status = 'paid';
    loan.overduePrincipal = 0;
    loan.overdueInterest = 0;
  } else if (loan.overduePrincipal <= 0.01 && loan.overdueInterest <= 0.01) {
    loan.status = 'active';
  }

  syncOpeningLoan(loan);
  return { ok: true, amount: total, principal: p, interest: i, loan: clone(loan) };
}

function tryPayOverdue(loan) {
  normalizeLoan(loan);
  const principal = round(loan.overduePrincipal);
  const interest = round(loan.overdueInterest);
  const total = round(principal + interest);
  if (total <= 0 || Number(gameState.getPlayer().cash) < total) return false;
  const result = applyPayment(loan, principal, interest, 'overdue_recovery', monthIndex(gameState.getTime()));
  if (!result.ok) return false;
  loan.overduePrincipal = 0;
  loan.overdueInterest = 0;
  if (loan.principalOutstanding > 0) loan.status = 'active';
  syncOpeningLoan(loan);
  return true;
}

function processMonth(targetMonthIndex) {
  const store = ensureStore();
  let changed = false;
  for (const loan of store.loans) {
    normalizeLoan(loan);
    if (!['active', 'overdue'].includes(loan.status)) continue;
    if (loan.principalOutstanding <= 0) continue;
    if (targetMonthIndex < loan.nextDueMonthIndex) continue;

    const due = scheduledDue(loan);
    if (Number(gameState.getPlayer().cash) >= due.total) {
      const result = applyPayment(loan, due.principal, due.interest, 'scheduled', targetMonthIndex);
      if (result.ok) changed = true;
    } else {
      loan.overduePrincipal = round(loan.overduePrincipal + due.principal);
      loan.overdueInterest = round(loan.overdueInterest + due.interest);
      loan.missedPayments += 1;
      loan.status = 'overdue';
      store.totalLatePayments += 1;
      addHistory({
        loanId: loan.id,
        shopId: loan.shopId,
        type: 'scheduled',
        principal: due.principal,
        interest: due.interest,
        amount: due.total,
        monthIndex: targetMonthIndex,
        monthLabel: monthLabel(targetMonthIndex),
        status: 'overdue'
      });
      changed = true;
    }
    loan.nextDueMonthIndex = targetMonthIndex + 1;
    syncOpeningLoan(loan);
  }
  return changed;
}

function update() {
  let changed = migrateOpeningLoans();
  const store = ensureStore();
  const current = monthIndex(gameState.getTime());

  if (store.lastProcessedMonthIndex == null) {
    store.lastProcessedMonthIndex = current;
    changed = true;
  }

  for (const loan of store.loans) {
    if (tryPayOverdue(loan)) changed = true;
  }

  let cursor = Number(store.lastProcessedMonthIndex) || current;
  let guard = 0;
  while (cursor < current && guard < 24) {
    cursor += 1;
    if (processMonth(cursor)) changed = true;
    guard += 1;
  }
  if (store.lastProcessedMonthIndex !== current) {
    store.lastProcessedMonthIndex = current;
    changed = true;
  }
  return changed;
}

function borrow(shopId, productId, utilization) {
  migrateOpeningLoans();
  const shop = currentShop(shopId);
  const offer = productOffer(shop && shop.id, productId);
  if (!shop || !offer) return { ok: false, message: '当前没有可融资门店' };
  if (!offer.available) return { ok: false, message: offer.reason || '当前暂不可申请' };

  const ratio = clamp(utilization == null ? 0.5 : utilization, 0.25, 1);
  let principal = moneyStep(offer.approvedLimit * ratio, 5000);
  principal = Math.max(10000, Math.min(offer.approvedLimit, principal));
  if (principal < 10000) return { ok: false, message: '可用授信不足1万元' };

  const store = ensureStore();
  const nowMonth = monthIndex(gameState.getTime());
  const loan = normalizeLoan({
    id: `finance_loan_${++store.sequence}`,
    version: VERSION,
    shopId: shop.id,
    productId: offer.id,
    productName: offer.name,
    originalPrincipal: principal,
    principalOutstanding: principal,
    annualRate: offer.annualRate,
    termMonths: offer.termMonths,
    monthlyPayment: annuityPayment(principal, offer.annualRate, offer.termMonths),
    monthsPaid: 0,
    nextDueMonthIndex: nowMonth + 1,
    overduePrincipal: 0,
    overdueInterest: 0,
    missedPayments: 0,
    totalInterestPaid: 0,
    totalPrincipalPaid: 0,
    status: 'active',
    createdMonthIndex: nowMonth,
    source: 'financialSystemV103'
  });

  store.loans.push(loan);
  const tx = completeFinance.recordTransaction(shop.id, {
    direction: 'in',
    category: 'financing',
    amount: principal,
    applyCash: true,
    referenceId: `bank:${loan.id}:funding`,
    note: offer.name,
    meta: { loanId: loan.id, productId: offer.id }
  });
  if (!tx.ok) {
    store.loans = store.loans.filter(item => item.id !== loan.id);
    return { ok: false, message: tx.reason || '放款失败' };
  }

  addHistory({
    loanId: loan.id,
    shopId: shop.id,
    type: 'funding',
    principal,
    interest: 0,
    amount: principal,
    monthIndex: nowMonth,
    monthLabel: monthLabel(nowMonth),
    status: 'received'
  });
  return { ok: true, loan: clone(loan), message: `已到账¥${Math.round(principal).toLocaleString('zh-CN')}` };
}

function repayDue(loanId) {
  const loan = ensureStore().loans.find(item => item.id === loanId);
  if (!loan) return { ok: false, message: '贷款不存在' };
  normalizeLoan(loan);
  if (!['active', 'overdue'].includes(loan.status)) return { ok: false, message: '该贷款无需继续还款' };

  if (loan.overduePrincipal + loan.overdueInterest > 0) {
    const principal = loan.overduePrincipal;
    const interest = loan.overdueInterest;
    const result = applyPayment(loan, principal, interest, 'overdue_recovery', monthIndex(gameState.getTime()));
    if (result.ok) {
      loan.overduePrincipal = 0;
      loan.overdueInterest = 0;
      if (loan.principalOutstanding > 0) loan.status = 'active';
      syncOpeningLoan(loan);
    }
    return result;
  }

  const due = scheduledDue(loan);
  const result = applyPayment(loan, due.principal, due.interest, 'scheduled', monthIndex(gameState.getTime()));
  if (result.ok) loan.nextDueMonthIndex += 1;
  return result;
}

function settleLoan(loanId) {
  const loan = ensureStore().loans.find(item => item.id === loanId);
  if (!loan) return { ok: false, message: '贷款不存在' };
  normalizeLoan(loan);
  if (loan.status === 'paid') return { ok: false, message: '贷款已经结清' };

  const principal = loan.principalOutstanding;
  const interest = loan.overdueInterest;
  const total = round(principal + interest);
  if (Number(gameState.getPlayer().cash) < total) return { ok: false, message: '现金不足，无法提前结清' };
  const result = applyPayment(loan, principal, interest, 'early_settlement', monthIndex(gameState.getTime()));
  if (result.ok) {
    loan.principalOutstanding = 0;
    loan.overduePrincipal = 0;
    loan.overdueInterest = 0;
    loan.status = 'paid';
    syncOpeningLoan(loan);
  }
  return result;
}

function creditFactors(shopId) {
  const metrics = accountMetrics(shopId);
  const debt = debtSummary(shopId);
  const cash = Math.max(0, Number(gameState.getPlayer().cash) || 0);
  const rows = [];
  rows.push({ label: '经营记录', value: metrics.operatingDays >= 20 ? '稳定' : metrics.operatingDays >= 7 ? '形成中' : '较少', good: metrics.operatingDays >= 7 });
  rows.push({ label: '近30日利润', value: metrics.profit30 >= 0 ? `+¥${Math.round(metrics.profit30).toLocaleString('zh-CN')}` : `-¥${Math.round(Math.abs(metrics.profit30)).toLocaleString('zh-CN')}`, good: metrics.profit30 >= 0 });
  rows.push({ label: '现金储备', value: `¥${Math.round(cash).toLocaleString('zh-CN')}`, good: cash >= Math.max(10000, debt.monthlyDebtService * 2) });
  rows.push({ label: '逾期记录', value: debt.missedPayments ? `${debt.missedPayments}次` : '0次', good: debt.missedPayments === 0 });
  return rows;
}

function snapshot(shopId) {
  update();
  const shop = currentShop(shopId);
  if (!shop) return null;
  const metrics = accountMetrics(shop.id);
  const debt = debtSummary(shop.id);
  const score = creditScore(shop.id);
  const monthlyRevenue = Math.max(0, metrics.projectedMonthlyRevenue);
  const debtServiceRatio = monthlyRevenue > 0 ? debt.monthlyDebtService / monthlyRevenue : 0;
  const rows = offers(shop.id);
  const availableCredit = Math.max(0, ...rows.map(row => Number(row && row.approvedLimit) || 0));

  let risk = '无负债';
  if (debt.overdue > 0) risk = '逾期高风险';
  else if (debt.activeCount > 0 && debtServiceRatio >= 0.28) risk = '债务压力偏高';
  else if (debt.activeCount > 0 && debtServiceRatio >= 0.16) risk = '债务压力中等';
  else if (debt.activeCount > 0) risk = '债务压力可控';

  return {
    version: VERSION,
    shop: clone(shop),
    cash: Number(gameState.getPlayer().cash) || 0,
    metrics,
    debt,
    score,
    grade: scoreGrade(score),
    availableCredit,
    debtServiceRatio,
    risk,
    offers: rows,
    loans: activeLoans(shop.id).map(clone),
    history: ensureStore().paymentHistory.filter(row => row.shopId === shop.id).slice(-30).reverse(),
    creditFactors: creditFactors(shop.id)
  };
}

module.exports = {
  VERSION,
  PRODUCTS,
  ensureStore,
  migrateOpeningLoans,
  accountMetrics,
  debtSummary,
  creditScore,
  scoreGrade,
  productOffer,
  offers,
  borrow,
  repayDue,
  settleLoan,
  update,
  snapshot,
  scheduledDue,
  annuityPayment,
  monthIndex,
  monthLabel
};
