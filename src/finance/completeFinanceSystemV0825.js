'use strict';

const gameState =
  require('../core/gameState.js');

const openingFinance =
  require('./openingFinanceSystem.js');

const settlementEngine =
  require('../operations/settlementEngineV10.js');

const VERSION =
  '0.8.25';

const EXPENSE_CATEGORIES =
  Object.freeze([
    'food',
    'labor',
    'rent',
    'utilities',
    'platform',
    'packaging',
    'marketing',
    'compliance',
    'waste',
    'refund',
    'procurement',
    'hiring',
    'training',
    'maintenance',
    'tax',
    'interest',
    'other'
  ]);

function clone(value) {
  if (value === undefined) {
    return undefined;
  }

  return JSON.parse(
    JSON.stringify(value)
  );
}

function round(value) {
  return Math.round(
    (
      Number(value) ||
      0
    ) *
    100
  ) /
  100;
}

function getStore() {
  const finance =
    gameState
      .getFinance();

  finance.version =
    VERSION;

  finance.openingLoans =
    finance.openingLoans &&
    typeof finance.openingLoans ===
      'object'
      ? finance.openingLoans
      : {};

  finance.transactions =
    Array.isArray(
      finance.transactions
    )
      ? finance.transactions
      : [];

  finance.shopAccounts =
    finance.shopAccounts &&
    typeof finance.shopAccounts ===
      'object'
      ? finance.shopAccounts
      : {};

  finance.sequence =
    Math.max(
      0,
      Number(
        finance.sequence
      ) ||
      0
    );

  return finance;
}

function ensureShopAccount(
  shopId
) {
  const store =
    getStore();

  const id =
    String(
      shopId ||
      'global'
    );

  if (
    !store.shopAccounts[id]
  ) {
    store.shopAccounts[id] = {
      version:VERSION,
      shopId:id,
      revenue:0,
      cashIn:0,
      cashOut:0,
      expenses:{},
      procurement:0,
      payroll:0,
      refunds:0,
      platformFees:0,
      packaging:0,
      dailyStatements:[],
      referenceIds:[]
    };
  }

  const account =
    store.shopAccounts[id];

  account.version =
    VERSION;

  account.expenses =
    account.expenses &&
    typeof account.expenses ===
      'object'
      ? account.expenses
      : {};

  account.dailyStatements =
    Array.isArray(
      account.dailyStatements
    )
      ? account.dailyStatements
      : [];

  account.referenceIds =
    Array.isArray(
      account.referenceIds
    )
      ? account.referenceIds
      : [];

  return account;
}

function hasReference(
  account,
  referenceId
) {
  if (!referenceId) {
    return false;
  }

  return account
    .referenceIds
    .includes(
      String(
        referenceId
      )
    );
}

function recordTransaction(
  shopId,
  entry
) {
  const store =
    getStore();

  const account =
    ensureShopAccount(
      shopId
    );

  const row =
    entry ||
    {};

  const amount =
    round(
      Math.max(
        0,
        Number(
          row.amount
        ) ||
        0
      )
    );

  if (
    amount <=
    0
  ) {
    return {
      ok:false,
      reason:'金额必须大于0'
    };
  }

  const referenceId =
    row.referenceId ==
      null
      ? null
      : String(
          row.referenceId
        );

  if (
    referenceId &&
    hasReference(
      account,
      referenceId
    )
  ) {
    return {
      ok:true,
      duplicate:true,
      transaction:null
    };
  }

  const direction =
    row.direction ===
      'in'
      ? 'in'
      : 'out';

  const category =
    String(
      row.category ||
      (
        direction ===
          'in'
          ? 'revenue'
          : 'other'
      )
    );

  if (
    row.applyCash ===
      true
  ) {
    if (
      direction ===
      'out'
    ) {
      if (
        !gameState
          .spendCash(
            amount
          )
      ) {
        return {
          ok:false,
          reason:'资金不足'
        };
      }
    } else {
      gameState
        .addCash(
          amount
        );
    }
  }

  const transaction = {
    id:
      'finance_tx_' +
      ++store.sequence,
    version:VERSION,
    shopId:
      String(
        shopId ||
        'global'
      ),
    direction,
    category,
    amount,
    day:
      row.day ==
        null
        ? null
        : Number(
            row.day
          ),
    referenceId,
    note:
      String(
        row.note ||
        ''
      ),
    applyCash:
      row.applyCash ===
      true,
    meta:
      row.meta &&
      typeof row.meta ===
        'object'
        ? clone(
            row.meta
          )
        : {}
  };

  store.transactions.push(
    transaction
  );

  if (
    store.transactions.length >
    5000
  ) {
    store.transactions =
      store.transactions.slice(
        -5000
      );
  }

  if (
    referenceId
  ) {
    account.referenceIds
      .push(
        referenceId
      );

    if (
      account.referenceIds
        .length >
      3000
    ) {
      account.referenceIds =
        account
          .referenceIds
          .slice(
            -3000
          );
    }
  }

  if (
    direction ===
    'in'
  ) {
    account.cashIn =
      round(
        account.cashIn +
        amount
      );

    if (
      category ===
      'revenue'
    ) {
      account.revenue =
        round(
          account.revenue +
          amount
        );
    }
  } else {
    account.cashOut =
      round(
        account.cashOut +
        amount
      );

    account.expenses[
      category
    ] =
      round(
        (
          account.expenses[
            category
          ] ||
          0
        ) +
        amount
      );

    if (
      category ===
      'procurement'
    ) {
      account.procurement =
        round(
          account.procurement +
          amount
        );
    }

    if (
      category ===
      'labor'
    ) {
      account.payroll =
        round(
          account.payroll +
          amount
        );
    }

    if (
      category ===
      'refund'
    ) {
      account.refunds =
        round(
          account.refunds +
          amount
        );
    }

    if (
      category ===
      'platform'
    ) {
      account.platformFees =
        round(
          account.platformFees +
          amount
        );
    }

    if (
      category ===
      'packaging'
    ) {
      account.packaging =
        round(
          account.packaging +
          amount
        );
    }
  }

  return {
    ok:true,
    duplicate:false,
    transaction:
      clone(
        transaction
      )
  };
}

function recordOrderSettlement(
  shopId,
  settlement,
  options
) {
  const row =
    settlement ||
    {};

  const opts =
    options ||
    {};

  const reference =
    String(
      opts.referenceId ||
      row.orderId ||
      (
        'order:' +
        Date.now()
      )
    );

  const results = [];

  const revenue =
    Math.max(
      0,
      Number(
        row.revenue
      ) ||
      0
    );

  if (
    revenue >
    0
  ) {
    results.push(
      recordTransaction(
        shopId,
        {
          direction:'in',
          category:'revenue',
          amount:revenue,
          day:opts.day,
          referenceId:
            reference +
            ':revenue',
          applyCash:
            opts.applyCash !==
            false,
          meta:{
            orderId:
              opts.orderId ||
              null
          }
        }
      )
    );
  }

  const outflows = [
    [
      'food',
      Number(
        row.foodCost
      ) ||
      0,
      false
    ],
    [
      'platform',
      Number(
        row.platformFee
      ) ||
      0,
      opts.applyCash !==
      false
    ],
    [
      'packaging',
      Number(
        row.packaging
      ) ||
      0,
      opts.applyCash !==
      false
    ],
    [
      'refund',
      Number(
        row.refund
      ) ||
      0,
      opts.applyCash !==
      false
    ]
  ];

  for (
    const [
      category,
      amount,
      applyCash
    ]
    of outflows
  ) {
    if (
      amount <=
      0
    ) {
      continue;
    }

    results.push(
      recordTransaction(
        shopId,
        {
          direction:'out',
          category,
          amount,
          day:opts.day,
          referenceId:
            reference +
            ':' +
            category,
          applyCash,
          meta:{
            orderId:
              opts.orderId ||
              null
          }
        }
      )
    );
  }

  return {
    ok:
      results.every(
        item =>
          item &&
          item.ok
      ),
    results
  };
}

function recordExternalExpense(
  shopId,
  category,
  amount,
  options
) {
  const opts =
    options ||
    {};

  return recordTransaction(
    shopId,
    {
      direction:'out',
      category:
        EXPENSE_CATEGORIES
          .includes(
            category
          )
          ? category
          : 'other',
      amount,
      day:opts.day,
      referenceId:
        opts.referenceId,
      applyCash:
        opts.applyCash ===
        true,
      note:
        opts.note,
      meta:
        opts.meta
    }
  );
}

function recordProcurement(
  shopId,
  purchaseOrder,
  options
) {
  if (!purchaseOrder) {
    return {
      ok:false,
      reason:'采购单不存在'
    };
  }

  return recordExternalExpense(
    shopId,
    'procurement',
    Number(
      purchaseOrder.total
    ) ||
    0,
    {
      ...(options || {}),
      applyCash:false,
      referenceId:
        (
          options &&
          options.referenceId
        ) ||
        (
          'po:' +
          purchaseOrder.id
        ),
      meta:{
        purchaseOrderId:
          purchaseOrder.id,
        supplierId:
          purchaseOrder
            .supplierId ||
          null
      }
    }
  );
}

function recordStaffExpense(
  shopId,
  category,
  amount,
  options
) {
  return recordExternalExpense(
    shopId,
    category,
    amount,
    {
      ...(options || {}),
      applyCash:false
    }
  );
}

function syncDailyStatement(
  shopId,
  financial,
  day
) {
  if (!financial) {
    return null;
  }

  const account =
    ensureShopAccount(
      shopId
    );

  const statementId =
    [
      'daily',
      shopId,
      day
    ].join(':');

  const existing =
    account
      .dailyStatements
      .find(
        item =>
          item.id ===
          statementId
      );

  if (existing) {
    return clone(
      existing
    );
  }

  const summary =
    financial.totalCost ==
      null
      ? settlementEngine
          .summary(
            financial
          )
      : financial;

  const statement = {
    id:statementId,
    version:VERSION,
    shopId,
    day:
      Number(
        day
      ),
    revenue:
      round(
        summary.revenue
      ),
    foodCost:
      round(
        summary.foodCost
      ),
    labor:
      round(
        summary.labor
      ),
    rent:
      round(
        summary.rent
      ),
    utilities:
      round(
        summary.utilities
      ),
    platformFees:
      round(
        summary.platformFees
      ),
    packaging:
      round(
        summary.packaging
      ),
    marketing:
      round(
        summary.marketing
      ),
    compliance:
      round(
        summary.compliance
      ),
    waste:
      round(
        summary.waste
      ),
    refunds:
      round(
        summary.refunds
      ),
    totalCost:
      round(
        summary.totalCost
      ),
    profit:
      round(
        summary.profit
      ),
    orders:
      Number(
        summary.orders
      ) ||
      0,
    customers:
      Number(
        summary.customers
      ) ||
      0,
    avgTicket:
      round(
        summary.avgTicket
      ),
    foodCostRate:
      Number(
        summary.foodCostRate
      ) ||
      0,
    profitRate:
      Number(
        summary.profitRate
      ) ||
      0
  };

  account.dailyStatements
    .push(
      statement
    );

  if (
    account
      .dailyStatements
      .length >
    365
  ) {
    account.dailyStatements =
      account
        .dailyStatements
        .slice(
          -365
        );
  }

  return clone(
    statement
  );
}

function openingLoanSnapshot(
  shopId
) {
  const finance =
    getStore();

  const loan =
    finance
      .openingLoans[
        shopId
      ] ||
    null;

  if (!loan) {
    return null;
  }

  return clone(
    loan
  );
}

function getTransactions(
  shopId,
  filters
) {
  const store =
    getStore();

  const f =
    filters ||
    {};

  return store
    .transactions
    .filter(
      row =>
        (
          !shopId ||
          row.shopId ===
            String(
              shopId
            )
        ) &&
        (
          !f.category ||
          row.category ===
            f.category
        ) &&
        (
          !f.direction ||
          row.direction ===
            f.direction
        ) &&
        (
          f.fromDay == null ||
          Number(
            row.day
          ) >=
            Number(
              f.fromDay
            )
        ) &&
        (
          f.toDay == null ||
          Number(
            row.day
          ) <=
            Number(
              f.toDay
            )
        )
    )
    .map(clone);
}

function profitLoss(
  shopId
) {
  const account =
    ensureShopAccount(
      shopId
    );

  const expenses =
    Object.values(
      account.expenses
    )
      .reduce(
        (
          sum,
          value
        ) =>
          sum +
          (
            Number(
              value
            ) ||
            0
          ),
        0
      );

  return {
    revenue:
      round(
        account.revenue
      ),
    expenses:
      round(
        expenses
      ),
    accountingProfit:
      round(
        account.revenue -
        expenses
      ),
    cashIn:
      round(
        account.cashIn
      ),
    cashOut:
      round(
        account.cashOut
      ),
    netCashFlow:
      round(
        account.cashIn -
        account.cashOut
      ),
    expenseBreakdown:
      clone(
        account.expenses
      )
  };
}

function snapshot(
  shopId,
  runtimeLedger
) {
  const account =
    ensureShopAccount(
      shopId
    );

  const runtime =
    runtimeLedger
      ? settlementEngine
          .summary(
            runtimeLedger
          )
      : null;

  return {
    version:VERSION,
    shopId:
      String(
        shopId ||
        'global'
      ),
    playerCash:
      Number(
        gameState
          .getPlayer()
          .cash
      ) ||
      0,
    profitLoss:
      profitLoss(
        shopId
      ),
    runtime:
      runtime
        ? clone(
            runtime
          )
        : null,
    openingLoan:
      openingLoanSnapshot(
        shopId
      ),
    dailyStatements:
      clone(
        account
          .dailyStatements
          .slice(
            -30
          )
      ),
    transactionCount:
      getTransactions(
        shopId,
        {}
      ).length
  };
}

function openingCreditStatus(
  shopId
) {
  return {
    offer:
      openingFinance
        .getOffer(
          shopId
        ),
    recovery:
      openingFinance
        .getRecoveryStatus(
          shopId
        )
  };
}

module.exports = {
  VERSION,
  EXPENSE_CATEGORIES,
  getStore,
  ensureShopAccount,
  recordTransaction,
  recordOrderSettlement,
  recordExternalExpense,
  recordProcurement,
  recordStaffExpense,
  syncDailyStatement,
  openingLoanSnapshot,
  getTransactions,
  profitLoss,
  snapshot,
  openingCreditStatus
};
