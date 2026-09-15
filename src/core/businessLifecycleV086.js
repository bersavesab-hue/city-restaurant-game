'use strict';

const gameState =
  require('./gameState.js');

const openingPrepSystem =
  require('../opening/openingPrepSystem.js');

const renovationSystem =
  require('../renovation/renovationSystem.js');

const timeScheduleCoordinator =
  require('./timeScheduleCoordinatorV0812.js');

const shopLifecycle =
  require('./shopLifecycleV0816.js');

function clone(value) {
  return JSON.parse(
    JSON.stringify(value)
  );
}

function clamp(
  value,
  min,
  max
) {
  return Math.max(
    min,
    Math.min(
      max,
      Number(value) || 0
    )
  );
}

function isLeapYear(year) {
  return (
    year % 400 === 0 ||
    (
      year % 4 === 0 &&
      year % 100 !== 0
    )
  );
}

function daysInMonth(
  year,
  month
) {
  if (month === 2) {
    return isLeapYear(year)
      ? 29
      : 28;
  }

  return [
    4,
    6,
    9,
    11
  ].includes(month)
    ? 30
    : 31;
}

function dayOrdinal(
  time
) {
  const year =
    Math.max(
      1,
      Number(time.year) || 1
    );

  const month =
    clamp(
      Number(time.month) || 1,
      1,
      12
    );

  const day =
    Math.max(
      1,
      Number(time.day) || 1
    );

  let total =
    0;

  for (
    let y = 1;
    y < year;
    y++
  ) {
    total +=
      isLeapYear(y)
        ? 366
        : 365;
  }

  for (
    let m = 1;
    m < month;
    m++
  ) {
    total +=
      daysInMonth(
        year,
        m
      );
  }

  return total +
    day;
}

function currentDay() {
  return (
    timeScheduleCoordinator
      .dayOrdinal(
        gameState
          .getTime()
      )
  );
}

function ensureState() {
  const business =
    gameState.getBusiness();

  business.lifecycle =
    business.lifecycle &&
    typeof business.lifecycle ===
      'object'
      ? business.lifecycle
      : {};

  const state =
    business.lifecycle;

  state.version =
    '0.8.6';

  state.lastProcessedDay =
    state.lastProcessedDay ==
      null
      ? null
      : Number(
          state.lastProcessedDay
        );

  state.shops =
    state.shops &&
    typeof state.shops ===
      'object'
      ? state.shops
      : {};

  state.metrics = {
    loanPayments:0,
    loanDefaults:0,
    rentPayments:0,
    leaseDefaults:0,
    trialsCompleted:0,
    formalOpenings:0,
    ...(
      state.metrics ||
      {}
    )
  };

  return state;
}

function ensureSettings() {
  const data =
    gameState.getData();

  data.progress =
    data.progress ||
    {};

  data.progress.settings =
    data.progress.settings &&
    typeof data.progress.settings ===
      'object'
      ? data.progress.settings
      : {};

  const settings =
    data.progress.settings;

  settings.fontScale =
    clamp(
      settings.fontScale == null
        ? 1
        : settings.fontScale,
      1,
      1.15
    );

  return settings;
}

function getShop(shopId) {
  return (
    gameState
      .getBusiness()
      .shops
      .find(
        item =>
          item.id ===
          shopId
      ) ||
    null
  );
}

function ensureShopState(
  shopId
) {
  const state =
    ensureState();

  if (
    !state.shops[
      shopId
    ]
  ) {
    state.shops[
      shopId
    ] = {
      stage:null,
      updatedDay:null
    };
  }

  return state.shops[
    shopId
  ];
}

function findLease(
  shopId
) {
  const leases =
    gameState
      .getPropertyProcess()
      .leases ||
    {};

  for (
    const key
    of Object.keys(
      leases
    )
  ) {
    const lease =
      leases[key];

    if (
      lease &&
      lease.shopId ===
        shopId
    ) {
      return {
        key,
        lease
      };
    }
  }

  return null;
}

function normalizeLease(
  shop,
  day
) {
  const found =
    findLease(
      shop.id
    );

  if (!found) {
    return null;
  }

  const lease =
    found.lease;

  lease.lifecycle =
    lease.lifecycle &&
    typeof lease.lifecycle ===
      'object'
      ? lease.lifecycle
      : {};

  const life =
    lease.lifecycle;

  const terms =
    lease.terms ||
    {};

  const startDay =
    Number(
      lease.day
    ) ||
    Number(
      shop.signedDay
    ) ||
    day;

  const freeDays =
    Math.max(
      0,
      Number(
        terms.freeRentDays ||
        shop.freeRentDays ||
        0
      )
    );

  const paymentMonths =
    Math.max(
      1,
      Number(
        terms.paymentMonths ||
        shop.paymentMonths ||
        1
      )
    );

  const leaseYears =
    Math.max(
      1,
      Number(
        terms.leaseYears ||
        shop.leaseYears ||
        3
      )
    );

  life.status =
    life.status ||
    'active';

  life.startDay =
    Number(
      life.startDay
    ) ||
    startDay;

  life.freeRentEndDay =
    Number(
      life.freeRentEndDay
    ) ||
    (
      life.startDay +
      freeDays
    );

  life.endDay =
    Number(
      life.endDay
    ) ||
    (
      life.startDay +
      Math.round(
        leaseYears *
        365
      )
    );

  life.nextRentDay =
    Number(
      life.nextRentDay
    ) ||
    (
      life.freeRentEndDay +
      paymentMonths *
        30
    );

  life.arrears =
    Math.max(
      0,
      Number(
        life.arrears
      ) ||
      0
    );

  life.arrearsSinceDay =
    life.arrearsSinceDay ==
      null
      ? null
      : Number(
          life.arrearsSinceDay
        );

  life.rentPayments =
    Math.max(
      0,
      Number(
        life.rentPayments
      ) ||
      0
    );

  life.renewals =
    Math.max(
      0,
      Number(
        life.renewals
      ) ||
      0
    );

  return {
    key:
      found.key,
    lease,
    life,
    terms
  };
}

function adjustedMonthlyRent(
  shop,
  info,
  day
) {
  const base =
    Math.max(
      0,
      Number(
        info.terms.monthlyRent ||
        shop.monthlyRent ||
        0
      )
    );

  let increase =
    Number(
      info.terms.annualIncrease ||
      shop.annualIncrease ||
      0
    ) || 0;

  if (
    increase >
    1
  ) {
    increase /=
      100;
  }

  increase =
    clamp(
      increase,
      0,
      0.25
    );

  const years =
    Math.max(
      0,
      Math.floor(
        (
          day -
          info.life.startDay
        ) /
        365
      )
    );

  return Math.round(
    base *
    Math.pow(
      1 +
      increase,
      years
    )
  );
}

function depositAmount(
  shop,
  info
) {
  const upfront =
    info.lease
      .upfront ||
    {};

  if (
    Number.isFinite(
      Number(
        upfront.deposit
      )
    )
  ) {
    return Math.max(
      0,
      Number(
        upfront.deposit
      )
    );
  }

  return (
    Math.max(
      0,
      Number(
        shop.monthlyRent
      ) ||
      0
    ) *
    Math.max(
      0,
      Number(
        shop.depositMonths
      ) ||
      0
    )
  );
}

function closeShop(
  shop,
  reason,
  day
) {
  shop.status =
    'closed';

  shop.closedReason =
    reason;

  shop.closedDay =
    day;

  const business =
    gameState.getBusiness();

  if (
    business.currentShopId ===
    shop.id
  ) {
    const next =
      (
        business.shops ||
        []
      ).find(
        item =>
          item.id !==
            shop.id &&
          item.status !==
            'closed'
      );

    business.currentShopId =
      next
        ? next.id
        : null;
  }

  business.hasShop =
    (
      business.shops ||
      []
    ).some(
      item =>
        item.status !==
        'closed'
    );
}

function processLease(
  shop,
  day
) {
  const info =
    normalizeLease(
      shop,
      day
    );

  if (!info) {
    return false;
  }

  const life =
    info.life;

  if (
    [
      'terminated',
      'defaulted',
      'expired'
    ].includes(
      life.status
    )
  ) {
    return false;
  }

  let changed =
    false;

  if (
    day >=
    life.endDay
  ) {
    const deposit =
      depositAmount(
        shop,
        info
      );

    const arrearsOffset =
      Math.min(
        deposit,
        life.arrears
      );

    const refund =
      Math.max(
        0,
        deposit -
        arrearsOffset
      );

    life.arrears =
      Math.max(
        0,
        life.arrears -
        arrearsOffset
      );

    if (
      refund >
      0
    ) {
      gameState
        .addCash(
          refund
        );
    }

    life.status =
      'expired';

    life.expiredDay =
      day;

    life.depositRefund =
      refund;

    closeShop(
      shop,
      'lease_expired',
      day
    );

    return true;
  }

  if (
    life.arrears >
    0
  ) {
    const due =
      Math.ceil(
        life.arrears
      );

    if (
      Number(
        gameState
          .getPlayer()
          .cash
      ) >=
      due
    ) {
      gameState
        .spendCash(
          due
        );

      life.arrears =
        0;

      life.arrearsSinceDay =
        null;

      life.status =
        'active';

      changed =
        true;
    } else {
      const age =
        Math.max(
          0,
          day -
          Number(
            life.arrearsSinceDay ||
            day
          )
        );

      life.status =
        age >=
          30
          ? 'arrears'
          : 'payment_due';

      if (
        age >=
        90
      ) {
        life.status =
          'defaulted';

        ensureState()
          .metrics
          .leaseDefaults +=
          1;

        closeShop(
          shop,
          'lease_default',
          day
        );

        changed =
          true;
      }

      return changed;
    }
  }

  const paymentMonths =
    Math.max(
      1,
      Number(
        info.terms
          .paymentMonths ||
        shop.paymentMonths ||
        1
      )
    );

  const periodDays =
    Math.max(
      30,
      paymentMonths *
        30
    );

  let guard =
    0;

  while (
    day >=
      life.nextRentDay &&
    guard <
      24
  ) {
    guard +=
      1;

    const due =
      adjustedMonthlyRent(
        shop,
        info,
        life.nextRentDay
      ) *
      paymentMonths;

    if (
      Number(
        gameState
          .getPlayer()
          .cash
      ) >=
      due
    ) {
      gameState
        .spendCash(
          due
        );

      life.rentPayments +=
        1;

      life.lastRentAmount =
        due;

      life.lastRentPaidDay =
        day;

      life.nextRentDay +=
        periodDays;

      life.status =
        'active';

      ensureState()
        .metrics
        .rentPayments +=
        1;

      changed =
        true;
    } else {
      life.arrears =
        due;

      life.arrearsSinceDay =
        day;

      life.status =
        'payment_due';

      changed =
        true;

      break;
    }
  }

  return changed;
}

function normalizeLoan(
  shop,
  day
) {
  const loan =
    gameState
      .getFinance()
      .openingLoans[
        shop.id
      ];

  if (!loan) {
    return null;
  }

  loan.status =
    loan.status ||
    'grace_before_opening';

  loan.outstanding =
    Math.max(
      0,
      Number(
        loan.outstanding
      ) ||
      0
    );

  loan.monthlyPayment =
    Math.max(
      0,
      Number(
        loan.monthlyPayment
      ) ||
      0
    );

  loan.paidMonths =
    Math.max(
      0,
      Number(
        loan.paidMonths
      ) ||
      0
    );

  loan.missedPayments =
    Math.max(
      0,
      Number(
        loan.missedPayments
      ) ||
      0
    );

  loan.overdueAmount =
    Math.max(
      0,
      Number(
        loan.overdueAmount
      ) ||
      0
    );

  if (
    loan.status ===
      'grace_before_opening' &&
    [
      'trial_opening',
      'trial_complete',
      'open'
    ].includes(
      shop.status
    )
  ) {
    loan.status =
      'active';

    loan.firstPaymentDay =
      Number(
        loan.firstPaymentDay
      ) ||
      (
        day +
        30
      );

    loan.nextPaymentDay =
      Number(
        loan.nextPaymentDay
      ) ||
      loan.firstPaymentDay;
  }

  return loan;
}

function processLoan(
  shop,
  day
) {
  const loan =
    normalizeLoan(
      shop,
      day
    );

  if (
    !loan ||
    loan.status ===
      'grace_before_opening' ||
    loan.status ===
      'repaid' ||
    loan.outstanding <=
      0
  ) {
    return false;
  }

  let changed =
    false;

  if (
    loan.overdueAmount >
      0
  ) {
    const overdue =
      Math.ceil(
        loan.overdueAmount
      );

    if (
      Number(
        gameState
          .getPlayer()
          .cash
      ) >=
      overdue
    ) {
      gameState
        .spendCash(
          overdue
        );

      loan.outstanding =
        Math.max(
          0,
          loan.outstanding -
          overdue
        );

      loan.overdueAmount =
        0;

      loan.overdueSinceDay =
        null;

      loan.paidMonths +=
        1;

      loan.status =
        loan.outstanding >
          0
          ? 'active'
          : 'repaid';

      loan.nextPaymentDay =
        day +
        30;

      ensureState()
        .metrics
        .loanPayments +=
        1;

      changed =
        true;
    } else {
      const age =
        Math.max(
          0,
          day -
          Number(
            loan.overdueSinceDay ||
            day
          )
        );

      if (
        age >=
          60 &&
        loan.status !==
          'defaulted'
      ) {
        loan.status =
          'defaulted';

        ensureState()
          .metrics
          .loanDefaults +=
          1;

        changed =
          true;
      }

      return changed;
    }
  }

  if (
    loan.status ===
      'defaulted' ||
    loan.outstanding <=
      0
  ) {
    return changed;
  }

  if (
    loan.nextPaymentDay ==
      null
  ) {
    loan.nextPaymentDay =
      day +
      30;

    return true;
  }

  if (
    day <
      loan.nextPaymentDay
  ) {
    return changed;
  }

  const due =
    Math.min(
      loan.outstanding,
      Math.max(
        1,
        loan.monthlyPayment
      )
    );

  if (
    Number(
      gameState
        .getPlayer()
        .cash
    ) >=
    due
  ) {
    gameState
      .spendCash(
        due
      );

    loan.outstanding =
      Math.max(
        0,
        loan.outstanding -
        due
      );

    loan.paidMonths +=
      1;

    loan.lastPaymentDay =
      day;

    loan.nextPaymentDay +=
      30;

    loan.status =
      loan.outstanding >
        0
        ? 'active'
        : 'repaid';

    ensureState()
      .metrics
      .loanPayments +=
      1;

    return true;
  }

  loan.overdueAmount =
    due;

  loan.overdueSinceDay =
    day;

  loan.missedPayments +=
    1;

  loan.status =
    'overdue';

  return true;
}

function getTrialRows(
  shop
) {
  const stored=gameState.getRestaurantOperations().shops[shop.id];
  const snapshots=stored&&Array.isArray(stored.dailySnapshots)?stored.dailySnapshots:[];
  const startDay=Number(shop.trialOpenedDay)||0;
  const byDay=new Map();

  for (const row of snapshots) {
    const day=Number(row&&row.day);
    if (!row || !row.financial || !Number.isFinite(day) || day<startDay || byDay.has(day)) continue;
    byDay.set(day,row);
  }

  return Array.from(byDay.values()).sort((a,b)=>Number(a.day)-Number(b.day)).slice(0,3);
}

function buildTrialReport(
  shop
) {
  const stored=gameState.getRestaurantOperations().shops[shop.id];
  const rows=getTrialRows(shop);
  let revenue=0,profit=0,orders=0,customers=0;

  for (const row of rows) {
    const financial=row.financial||{};
    revenue+=Number(financial.revenue)||0;
    profit+=Number(financial.profit)||0;
    orders+=Number(financial.orders)||0;
    customers+=Number(financial.customers)||0;
  }

  const rating=stored&&stored.shop?Number(stored.shop.rating)||4:4;
  return {
    days:rows.length,
    revenue:Math.round(revenue),
    profit:Math.round(profit),
    orders:Math.round(orders),
    customers:Math.round(customers),
    rating:Number(rating.toFixed(1)),
    generatedDay:currentDay()
  };
}

function processTrial(
  shop,
  day
) {
  if (shop.status!=='trial_opening') return false;
  const endDay=Number(shop.trialEndDay)||(Number(shop.trialOpenedDay)+3);
  if (day<endDay) return false;

  const rows=getTrialRows(shop);
  // 到期但没有3个真实营业日，不能靠空跑日期直接完成试营业。
  if (rows.length<3) return false;

  shop.status='trial_complete';
  shop.trialCompletedDay=day;
  shop.trialReport=buildTrialReport(shop);
  ensureState().metrics.trialsCompleted+=1;
  return true;
}

function lifecycleEvidence(
  shop
) {
  if (!shop) {
    return {};
  }

  const leaseFound =
    findLease(
      shop.id
    );

  const leaseStatus =
    leaseFound
      ? (
          leaseFound
            .lease
            .lifecycle &&
          leaseFound
            .lease
            .lifecycle
            .status ||
          'active'
        )
      : null;

  if (
    [
      'closed',
      'paused',
      'open',
      'trial_opening',
      'trial_complete'
    ].includes(
      shop.status
    )
  ) {
    return {
      leaseStatus
    };
  }

  const plan =
    renovationSystem
      .ensurePlan(
        shop.id
      );

  const equipment =
    openingPrepSystem
      .ensureEquipment(
        shop.id
      );

  const permits =
    openingPrepSystem
      .getPermitOverview(
        shop.id
      );

  const staffing =
    openingPrepSystem
      .getStaffOverview(
        shop.id
      );

  return {
    renovationStatus:
      plan &&
      plan.status ||
      null,
    equipmentStatus:
      equipment &&
      equipment.status ||
      null,
    permitTotal:
      Number(
        permits &&
        permits.total
      ) ||
      0,
    permitsApproved:
      Number(
        permits &&
        permits.approved
      ) ||
      0,
    permitsApplying:
      !!(
        permits &&
        Array.isArray(
          permits.rows
        ) &&
        permits.rows.some(
          row =>
            row.status ===
              'applying'
        )
      ),
    staffCoverage:
      Number(
        staffing &&
        staffing.coverage
      ) ||
      0,
    leaseStatus
  };
}

function deriveStage(
  shop
) {
  return (
    shopLifecycle
      .deriveStage(
        shop,
        lifecycleEvidence(
          shop
        )
      )
  );
}

function refreshStage(
  shop,
  day
) {
  const result =
    shopLifecycle
      .syncShop(
        shop,
        lifecycleEvidence(
          shop
        ),
        {
          day,
          reason:
            'business-lifecycle-refresh'
        }
      );

  return !!(
    result &&
    result.changed
  );
}

function processDay(
  day
) {
  let changed =
    false;

  for (
    const shop
    of gameState
        .getBusiness()
        .shops ||
      []
  ) {
    if (
      processTrial(
        shop,
        day
      )
    ) {
      changed =
        true;
    }

    if (
      processLoan(
        shop,
        day
      )
    ) {
      changed =
        true;
    }

    if (
      processLease(
        shop,
        day
      )
    ) {
      changed =
        true;
    }

    if (
      refreshStage(
        shop,
        day
      )
    ) {
      changed =
        true;
    }
  }

  ensureState()
    .lastProcessedDay =
    day;

  return changed;
}

function update() {
  const day =
    currentDay();

  const state =
    ensureState();

  if (
    state.lastProcessedDay ==
    null
  ) {
    state.lastProcessedDay =
      day -
      1;
  }

  let changed =
    false;

  let guard =
    0;

  while (
    state.lastProcessedDay <
      day &&
    guard <
      3700
  ) {
    guard +=
      1;

    const next =
      state.lastProcessedDay +
      1;

    if (
      processDay(
        next
      )
    ) {
      changed =
        true;
    }
  }

  return changed;
}

function startTrialOpening(
  shopId
) {
  const shop =
    getShop(
      shopId
    );

  if (!shop) {
    return {
      ok:false,
      message:'门店不存在'
    };
  }

  const readiness =
    openingPrepSystem
      .getReadiness(
        shopId
      );

  if (
    !readiness.ready
  ) {
    return {
      ok:false,
      message:
        '请依次完成装修、设备、证照和招聘'
    };
  }

  const lifecycleStage =
    shopLifecycle
      .deriveStage(
        shop,
        lifecycleEvidence(
          shop
        )
      );

  if (
    lifecycleStage !==
      'ready_for_trial'
  ) {
    return {
      ok:false,
      message:
        lifecycleStage ===
          'closed'
          ? '门店已经关闭，不能重新开始试营业'
          : lifecycleStage ===
              'paused'
            ? '门店处于暂停营业状态'
            : '当前门店尚未进入待试营业状态'
    };
  }

  const day =
    currentDay();

  shop.status =
    'trial_opening';

  shop.trialOpenedDay =
    day;

  shop.trialEndDay =
    day +
    3;

  shop.trialCompletedDay =
    null;

  shop.trialReport =
    null;

  const loan =
    normalizeLoan(
      shop,
      day
    );

  if (
    loan &&
    loan.status ===
      'active' &&
    loan.nextPaymentDay ==
      null
  ) {
    loan.nextPaymentDay =
      day +
      30;
  }

  refreshStage(
    shop,
    day
  );

  return {
    ok:true,
    day,
    endDay:
      shop.trialEndDay
  };
}

function formalOpen(
  shopId
) {
  const shop =
    getShop(
      shopId
    );

  if (!shop) {
    return {
      ok:false,
      message:'门店不存在'
    };
  }

  if (
    shop.status !==
      'trial_complete'
  ) {
    return {
      ok:false,
      message:'请先完成3天试营业'
    };
  }

  shop.status =
    'open';

  shop.formalOpenedDay =
    currentDay();

  ensureState()
    .metrics
    .formalOpenings +=
    1;

  refreshStage(
    shop,
    currentDay()
  );

  return {
    ok:true,
    report:
      clone(
        shop.trialReport ||
        buildTrialReport(
          shop
        )
      )
  };
}

function pauseShop(
  shopId,
  reason
) {
  return (
    shopLifecycle
      .pauseShop(
        shopId,
        reason
      )
  );
}

function resumeShop(
  shopId
) {
  return (
    shopLifecycle
      .resumeShop(
        shopId
      )
  );
}

function getTrialReport(
  shopId
) {
  const shop =
    getShop(
      shopId
    );

  return shop
    ? clone(
        shop.trialReport ||
        null
      )
    : null;
}

function getLoanSummary(
  shopId
) {
  const shop =
    getShop(
      shopId
    );

  if (!shop) {
    return null;
  }

  const loan =
    normalizeLoan(
      shop,
      currentDay()
    );

  return loan
    ? clone(
        loan
      )
    : null;
}

function prepayLoan(
  shopId,
  amount=null
) {
  const shop =
    getShop(
      shopId
    );

  if (!shop) {
    return {
      ok:false,
      message:'门店不存在'
    };
  }

  const loan =
    normalizeLoan(
      shop,
      currentDay()
    );

  if (
    !loan ||
    loan.outstanding <=
      0 ||
    loan.status ===
      'repaid'
  ) {
    return {
      ok:false,
      message:'当前没有待偿还贷款'
    };
  }

  const desired =
    amount == null
      ? Math.max(
          loan.overdueAmount,
          loan.monthlyPayment,
          1
        )
      : Math.max(
          1,
          Number(amount) ||
          0
        );

  const cash =
    Number(
      gameState
        .getPlayer()
        .cash
    ) ||
    0;

  const pay =
    Math.min(
      cash,
      loan.outstanding,
      desired
    );

  if (
    pay <=
      0
  ) {
    return {
      ok:false,
      message:'现金不足'
    };
  }

  gameState
    .spendCash(
      pay
    );

  loan.outstanding =
    Math.max(
      0,
      loan.outstanding -
      pay
    );

  if (
    loan.overdueAmount >
      0
  ) {
    loan.overdueAmount =
      Math.max(
        0,
        loan.overdueAmount -
        pay
      );

    if (
      loan.overdueAmount <=
        0
    ) {
      loan.overdueSinceDay =
        null;

      loan.status =
        loan.outstanding >
          0
          ? 'active'
          : 'repaid';
    }
  }

  if (
    loan.outstanding <=
      0
  ) {
    loan.status =
      'repaid';

    loan.overdueAmount =
      0;
  }

  return {
    ok:true,
    paid:
      Math.round(
        pay
      ),
    outstanding:
      Math.round(
        loan.outstanding
      ),
    status:
      loan.status
  };
}

function getLeaseSummary(
  shopId
) {
  const shop =
    getShop(
      shopId
    );

  if (!shop) {
    return null;
  }

  const info =
    normalizeLease(
      shop,
      currentDay()
    );

  if (!info) {
    return null;
  }

  return {
    ...clone(
      info.life
    ),
    currentMonthlyRent:
      adjustedMonthlyRent(
        shop,
        info,
        currentDay()
      ),
    deposit:
      depositAmount(
        shop,
        info
      ),
    terms:
      clone(
        info.terms
      )
  };
}

function renewLease(
  shopId,
  years=3
) {
  const shop =
    getShop(
      shopId
    );

  if (!shop) {
    return {
      ok:false,
      message:'门店不存在'
    };
  }

  const info =
    normalizeLease(
      shop,
      currentDay()
    );

  if (!info) {
    return {
      ok:false,
      message:'未找到租约'
    };
  }

  if (
    [
      'terminated',
      'defaulted'
    ].includes(
      info.life.status
    )
  ) {
    return {
      ok:false,
      message:'当前租约不可续租'
    };
  }

  const addYears =
    Math.max(
      1,
      Math.min(
        10,
        Number(years) || 3
      )
    );

  info.life.endDay +=
    Math.round(
      addYears *
      365
    );

  info.life.renewals +=
    1;

  info.life.status =
    'active';

  return {
    ok:true,
    endDay:
      info.life.endDay,
    renewals:
      info.life.renewals
  };
}

function terminateLease(
  shopId
) {
  const shop =
    getShop(
      shopId
    );

  if (!shop) {
    return {
      ok:false,
      message:'门店不存在'
    };
  }

  const info =
    normalizeLease(
      shop,
      currentDay()
    );

  if (!info) {
    return {
      ok:false,
      message:'未找到租约'
    };
  }

  const deposit =
    depositAmount(
      shop,
      info
    );

  const penalty =
    adjustedMonthlyRent(
      shop,
      info,
      currentDay()
    );

  const refund =
    Math.max(
      0,
      deposit -
      penalty -
      info.life.arrears
    );

  if (
    refund >
      0
  ) {
    gameState
      .addCash(
        refund
      );
  }

  info.life.status =
    'terminated';

  info.life.terminatedDay =
    currentDay();

  info.life.terminationPenalty =
    penalty;

  info.life.depositRefund =
    refund;

  closeShop(
    shop,
    'lease_terminated',
    currentDay()
  );

  refreshStage(
    shop,
    currentDay()
  );

  return {
    ok:true,
    refund:
      Math.round(
        refund
      ),
    penalty:
      Math.round(
        penalty
      )
  };
}

function getSettings() {
  return clone(
    ensureSettings()
  );
}

function setFontScale(
  value
) {
  const settings =
    ensureSettings();

  settings.fontScale =
    clamp(
      value,
      1,
      1.15
    );

  return clone(
    settings
  );
}

function getShopOverview(
  shopId
) {
  const shop =
    getShop(
      shopId
    );

  if (!shop) {
    return null;
  }

  refreshStage(
    shop,
    currentDay()
  );

  return {
    stage:
      shop.lifecycleStage,
    lifecycle:
      shopLifecycle
        .getOverview(
          shop,
          lifecycleEvidence(
            shop
          )
        ),
    loan:
      getLoanSummary(
        shopId
      ),
    lease:
      getLeaseSummary(
        shopId
      ),
    trial:{
      status:
        shop.status,
      startDay:
        shop.trialOpenedDay ||
        null,
      endDay:
        shop.trialEndDay ||
        null,
      report:
        clone(
          shop.trialReport ||
          null
        )
    }
  };
}

module.exports = {
  currentDay,
  ensureState,
  ensureSettings,
  deriveStage,
  refreshStage,
  processDay,
  update,
  startTrialOpening,
  formalOpen,
  pauseShop,
  resumeShop,
  getTrialReport,
  getLoanSummary,
  prepayLoan,
  getLeaseSummary,
  renewLease,
  terminateLease,
  getSettings,
  setFontScale,
  getShopOverview
};
