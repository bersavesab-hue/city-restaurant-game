'use strict';

const gameState =
  require('../core/gameState.js');

const VERSION =
  '1.2.2';

const MAX_REPORTS =
  120;

function clone(value) {
  if (value === undefined) {
    return undefined;
  }

  return JSON.parse(
    JSON.stringify(value)
  );
}

function num(value) {
  const n =
    Number(value);

  return Number.isFinite(n)
    ? n
    : 0;
}

function round(value, digits) {
  const p =
    Math.pow(
      10,
      digits == null
        ? 2
        : digits
    );

  return (
    Math.round(
      num(value) *
      p
    ) /
    p
  );
}

function ratio(
  numerator,
  denominator
) {
  const d =
    num(denominator);

  return d
    ? num(numerator) /
      d
    : 0;
}

function getRoot() {
  const business =
    gameState.getBusiness();

  business.operatingReports =
    business.operatingReports &&
    typeof business.operatingReports ===
      'object' &&
    !Array.isArray(
      business.operatingReports
    )
      ? business.operatingReports
      : {
          version:VERSION,
          shops:{}
        };

  const root =
    business.operatingReports;

  root.version =
    VERSION;

  root.shops =
    root.shops &&
    typeof root.shops ===
      'object' &&
    !Array.isArray(
      root.shops
    )
      ? root.shops
      : {};

  return root;
}

function ensureShop(shopId) {
  const root =
    getRoot();

  const id =
    String(shopId);

  if (!root.shops[id]) {
    root.shops[id] = {
      version:VERSION,
      reports:[],
      pendingActions:[],
      lastCapturedDay:null
    };
  }

  const store =
    root.shops[id];

  store.version =
    VERSION;

  store.reports =
    Array.isArray(
      store.reports
    )
      ? store.reports
      : [];

  store.pendingActions =
    Array.isArray(
      store.pendingActions
    )
      ? store.pendingActions
      : [];

  if (
    store.reports.length >
    MAX_REPORTS
  ) {
    store.reports =
      store.reports.slice(
        0,
        MAX_REPORTS
      );
  }

  return store;
}

function averageReports(
  rows
) {
  const list =
    Array.isArray(rows)
      ? rows.filter(Boolean)
      : [];

  if (!list.length) {
    return {
      days:0,
      revenue:0,
      profit:0,
      orders:0,
      customers:0,
      avgTicket:0,
      rating:0
    };
  }

  const sum =
    key =>
      list.reduce(
        (
          total,
          row
        ) =>
          total +
          num(
            row &&
            row.summary &&
            row.summary[
              key
            ]
          ),
        0
      );

  return {
    days:list.length,
    revenue:
      round(
        sum('revenue') /
        list.length
      ),
    profit:
      round(
        sum('profit') /
        list.length
      ),
    orders:
      round(
        sum('orders') /
        list.length,
        1
      ),
    customers:
      round(
        sum('customers') /
        list.length,
        1
      ),
    avgTicket:
      round(
        sum('avgTicket') /
        list.length
      ),
    rating:
      round(
        sum('rating') /
        list.length,
        2
      )
  };
}

function comparison(
  current,
  previous
) {
  const a =
    num(current);

  if (
    previous === undefined ||
    previous === null
  ) {
    return {
      current:
        round(a),
      previous:null,
      delta:null,
      rate:null
    };
  }

  const b =
    num(previous);

  return {
    current:
      round(a),
    previous:
      round(b),
    delta:
      round(
        a -
        b
      ),
    rate:
      b === 0
        ? null
        : round(
            (
              a -
              b
            ) /
            Math.abs(b),
            4
          )
  };
}

function normalizeRate(value) {
  const n =
    num(value);

  return n >
    1.2
    ? n /
      100
    : n;
}

function normalizeDishPerformance(
  brief
) {
  const signals =
    brief &&
    brief.extra &&
    brief.extra
      .operatingSignals &&
    typeof brief.extra
      .operatingSignals ===
      'object'
      ? brief.extra
          .operatingSignals
      : {};

  const rows =
    Array.isArray(
      signals.dishPerformance
    )
      ? signals.dishPerformance
      : [];

  const sortedBySales =
    rows
      .slice()
      .sort(
        (
          a,
          b
        ) =>
          num(b.qty) -
          num(a.qty)
      );

  const sortedByProfit =
    rows
      .slice()
      .sort(
        (
          a,
          b
        ) =>
          num(
            b.grossProfit
          ) -
          num(
            a.grossProfit
          )
      );

  const sold =
    rows.filter(
      row =>
        num(row.qty) >
        0
    );

  const lowMargin =
    sold
      .filter(
        row =>
          num(
            row.grossMargin
          ) >
            0 &&
          num(
            row.grossMargin
          ) <
            0.42
      )
      .sort(
        (
          a,
          b
        ) =>
          num(
            a.grossMargin
          ) -
          num(
            b.grossMargin
          )
      );

  const weakRating =
    sold
      .filter(
        row =>
          num(
            row.ratingScore
          ) >
            0 &&
          num(
            row.ratingScore
          ) <
            60
      )
      .sort(
        (
          a,
          b
        ) =>
          num(
            a.ratingScore
          ) -
          num(
            b.ratingScore
          )
      );

  return {
    hotDish:
      sortedBySales[0]
        ? clone(
            sortedBySales[0]
          )
        : signals.topDish
          ? clone(
              signals.topDish
            )
          : null,
    profitChampion:
      sortedByProfit[0]
        ? clone(
            sortedByProfit[0]
          )
        : null,
    slowDish:
      sold.length >
        1
        ? clone(
            sold
              .slice()
              .sort(
                (
                  a,
                  b
                ) =>
                  num(a.qty) -
                  num(b.qty)
              )[0]
          )
        : null,
    lowMargin:
      lowMargin[0]
        ? clone(
            lowMargin[0]
          )
        : null,
    weakRating:
      weakRating[0]
        ? clone(
            weakRating[0]
          )
        : null,
    rows:
      rows
        .slice(0, 12)
        .map(clone)
  };
}

function normalizeStaff(
  brief
) {
  const source =
    brief &&
    brief.extra &&
    brief.extra.staff &&
    typeof brief.extra.staff ===
      'object'
      ? brief.extra.staff
      : {};

  return {
    headcount:
      Math.max(
        0,
        num(
          source.headcount ||
          (
            brief &&
            brief.endSnapshot &&
            brief.endSnapshot
              .staffCount
          )
        )
      ),
    monthlyPayroll:
      round(
        source.monthlyPayroll
      ),
    coverageFactor:
      round(
        source.coverageFactor,
        3
      ),
    roleCounts:
      clone(
        source.roleCounts ||
        {}
      ),
    peopleSummary:
      clone(
        source.peopleSummary ||
        {}
      )
  };
}

function buildIssues(
  brief,
  dish
) {
  const issues = [];

  const reasons =
    brief &&
    Array.isArray(
      brief.reasons
    )
      ? brief.reasons
      : [];

  for (
    const item
    of reasons
  ) {
    issues.push({
      code:
        item.code ||
        'OPERATING_ISSUE',
      level:
        item.severity ===
          'critical'
          ? 'danger'
          : item.severity ===
              'warning'
            ? 'warn'
            : 'info',
      title:
        item.message ||
        '经营异常',
      detail:
        item.message ||
        ''
    });
  }

  const signals =
    brief &&
    brief.extra &&
    brief.extra
      .operatingSignals ||
    {};

  if (
    num(
      signals.queueWalkaways
    ) >
    0
  ) {
    issues.push({
      code:'QUEUE_LOSS',
      level:'warn',
      title:'排队流失',
      detail:
        '今天有 ' +
        Math.round(
          num(
            signals.queueWalkaways
          )
        ) +
        ' 位顾客因等待离开。'
    });
  }

  if (
    num(
      signals.mistakes
    ) >
    0
  ) {
    issues.push({
      code:'SERVICE_MISTAKES',
      level:'warn',
      title:'出餐/服务失误',
      detail:
        '今天记录 ' +
        Math.round(
          num(
            signals.mistakes
          )
        ) +
        ' 次经营失误。'
    });
  }

  if (
    dish &&
    dish.lowMargin
  ) {
    issues.push({
      code:'DISH_LOW_MARGIN',
      level:'warn',
      title:'低毛利菜品',
      detail:
        dish.lowMargin.name +
        ' 毛利率约 ' +
        Math.round(
          num(
            dish.lowMargin
              .grossMargin
          ) *
          100
        ) +
        '%。'
    });
  }

  if (
    dish &&
    dish.weakRating
  ) {
    issues.push({
      code:'DISH_WEAK_RATING',
      level:'warn',
      title:'菜品反馈偏弱',
      detail:
        dish.weakRating.name +
        ' 的综合菜品分偏低。'
    });
  }

  const seen =
    new Set();

  return issues
    .filter(
      item => {
        const key =
          item.code +
          ':' +
          item.title;

        if (
          seen.has(key)
        ) {
          return false;
        }

        seen.add(key);
        return true;
      }
    )
    .slice(0, 8);
}

function buildActions(
  brief,
  issues,
  dish,
  staff
) {
  const actions = [];

  function add(
    id,
    routeId,
    title,
    detail,
    priority
  ) {
    if (
      actions.some(
        item =>
          item.id ===
          id
      )
    ) {
      return;
    }

    actions.push({
      id,
      routeId,
      title,
      detail,
      priority:
        priority ||
        'normal',
      viewed:false
    });
  }

  const codes =
    new Set(
      (
        issues ||
        []
      ).map(
        item =>
          item.code
      )
    );

  if (
    codes.has(
      'STOCKOUT_LOSS'
    ) ||
    codes.has(
      'INVENTORY_ALERTS'
    ) ||
    codes.has(
      'WASTE_HIGH'
    )
  ) {
    add(
      'supply_balance',
      'supply',
      '处理库存与补货',
      '先解决缺货、临期和过量备货之间的矛盾。',
      'high'
    );
  }

  if (
    codes.has(
      'FOOD_COST_HIGH'
    ) ||
    codes.has(
      'DISH_LOW_MARGIN'
    ) ||
    (
      dish &&
      dish.lowMargin
    )
  ) {
    add(
      'menu_margin',
      'research',
      '调整菜品毛利',
      '检查低毛利菜的售价、份量和原料组合。',
      'high'
    );
  }

  if (
    codes.has(
      'QUEUE_LOSS'
    ) ||
    codes.has(
      'SERVICE_MISTAKES'
    ) ||
    (
      staff &&
      staff.coverageFactor >
        0 &&
      staff.coverageFactor <
        0.85
    )
  ) {
    add(
      'staff_capacity',
      'staff',
      '检查排班与产能',
      '高峰期等待和失误优先从排班、岗位覆盖和后厨能力排查。',
      'high'
    );
  }

  if (
    codes.has(
      'PRICE_RESISTANCE'
    ) ||
    codes.has(
      'REPEAT_WEAK'
    ) ||
    codes.has(
      'DISH_WEAK_RATING'
    )
  ) {
    add(
      'customer_value',
      'research',
      '改善顾客价值感',
      '检查价格、菜品品质、出餐速度和复购表现。',
      'normal'
    );
  }

  if (
    codes.has(
      'CASH_CRITICAL'
    ) ||
    (
      brief &&
      brief.financial &&
      num(
        brief.financial
          .profit
      ) <
        0
    )
  ) {
    add(
      'profit_repair',
      'business',
      '修复利润与现金',
      '拆解食材、人工、房租和损耗，优先处理最大成本项。',
      'high'
    );
  }

  const legacy =
    brief &&
    Array.isArray(
      brief.nextActions
    )
      ? brief.nextActions
      : [];

  for (
    const item
    of legacy
  ) {
    if (
      actions.length >=
      3
    ) {
      break;
    }

    add(
      item.id ||
        (
          'legacy_' +
          actions.length
        ),
      item.routeId ||
        'shop',
      item.message ||
        '继续经营',
      item.message ||
        '',
      'normal'
    );
  }

  if (!actions.length) {
    add(
      'stable_continue',
      'shop',
      '经营状态稳定',
      '保持当前策略，继续观察下一营业日趋势。',
      'normal'
    );
  }

  return actions
    .slice(0, 3);
}

function buildReport(
  shopId,
  brief,
  previousReports
) {
  const financial =
    brief &&
    brief.financial ||
    {};

  const snapshot =
    brief &&
    brief.endSnapshot ||
    {};

  const visits =
    brief &&
    brief.visits ||
    {};

  const signals =
    brief &&
    brief.extra &&
    brief.extra
      .operatingSignals ||
    {};

  const dish =
    normalizeDishPerformance(
      brief
    );

  const staff =
    normalizeStaff(
      brief
    );

  const summary = {
    revenue:
      round(
        financial.revenue
      ),
    profit:
      round(
        financial.profit
      ),
    orders:
      Math.round(
        num(
          financial.orders ||
          visits.success
        )
      ),
    customers:
      Math.round(
        num(
          financial.customers ||
          visits.customers
        )
      ),
    avgTicket:
      round(
        financial.avgTicket
      ),
    rating:
      round(
        snapshot.rating,
        2
      ),
    ratingDelta:
      round(
        brief &&
        brief.deltas &&
        brief.deltas
          .rating,
        2
      ),
    repeatRate:
      round(
        signals.repeatRate,
        4
      ),
    waitMinutes:
      round(
        signals.avgWaitMinutes,
        1
      ),
    stockouts:
      Math.round(
        num(
          signals.stockouts
        )
      ),
    queueWalkaways:
      Math.round(
        num(
          signals.queueWalkaways
        )
      ),
    mistakes:
      Math.round(
        num(
          signals.mistakes
        )
      ),
    wasteValue:
      round(
        signals.expiredWasteValue ||
        financial.waste
      ),
    inventoryAlerts:
      Math.max(
        0,
        Math.round(
          num(
            snapshot
              .inventoryAlerts
          )
        )
      )
  };

  const costs = {
    food:
      round(
        financial.foodCost
      ),
    labor:
      round(
        financial.labor
      ),
    rent:
      round(
        financial.rent
      ),
    utilities:
      round(
        financial.utilities
      ),
    marketing:
      round(
        financial.marketing
      ),
    compliance:
      round(
        financial.compliance
      ),
    waste:
      round(
        financial.waste ||
        signals
          .expiredWasteValue
      ),
    refunds:
      round(
        financial.refunds
      ),
    total:
      round(
        financial.totalCost
      ),
    foodCostRate:
      round(
        normalizeRate(
          financial.foodCostRate
        ),
        4
      ),
    profitRate:
      round(
        normalizeRate(
          financial.profitRate
        ),
        4
      )
  };

  const history =
    Array.isArray(
      previousReports
    )
      ? previousReports
      : [];

  const yesterday =
    history[0] ||
    null;

  const avg7 =
    averageReports(
      [
        {
          summary
        },
        ...history.slice(
          0,
          6
        )
      ]
    );

  const avg30 =
    averageReports(
      [
        {
          summary
        },
        ...history.slice(
          0,
          29
        )
      ]
    );

  const issues =
    buildIssues(
      brief,
      dish
    );

  const actions =
    buildActions(
      brief,
      issues,
      dish,
      staff
    );

  const customDishRoot =
    gameState
      .getBusiness()
      .customDishLab;

  const customStore =
    customDishRoot &&
    customDishRoot.shops &&
    customDishRoot.shops[
      String(shopId)
    ];

  const customLibrary =
    customStore &&
    Array.isArray(
      customStore.library
    )
      ? customStore.library
      : [];

  const bestCustom =
    customLibrary
      .slice()
      .sort(
        (
          a,
          b
        ) =>
          num(b.score) -
          num(a.score)
      )[0] ||
    null;

  return {
    id:
      'operating-report:' +
      String(shopId) +
      ':' +
      Number(
        brief &&
        brief.day
      ),
    version:VERSION,
    shopId:
      String(shopId),
    day:
      Number(
        brief &&
        brief.day
      ),
    createdAt:
      Date.now(),
    summary,
    costs,
    comparison:{
      revenue:
        comparison(
          summary.revenue,
          yesterday &&
          yesterday.summary &&
          yesterday.summary
            .revenue
        ),
      profit:
        comparison(
          summary.profit,
          yesterday &&
          yesterday.summary &&
          yesterday.summary
            .profit
        ),
      orders:
        comparison(
          summary.orders,
          yesterday &&
          yesterday.summary &&
          yesterday.summary
            .orders
        ),
      customers:
        comparison(
          summary.customers,
          yesterday &&
          yesterday.summary &&
          yesterday.summary
            .customers
        ),
      rating:
        comparison(
          summary.rating,
          yesterday &&
          yesterday.summary &&
          yesterday.summary
            .rating
        )
    },
    avg7,
    avg30,
    dish,
    staff,
    issues,
    actions,
    customDish:{
      count:
        customLibrary.length,
      best:
        bestCustom
          ? {
              id:
                bestCustom.id,
              name:
                bestCustom.name,
              score:
                round(
                  bestCustom.score,
                  1
                ),
              quality:
                bestCustom
                  .qualityId ||
                null
            }
          : null
    }
  };
}

function capture(
  shopId,
  brief
) {
  if (
    !shopId ||
    !brief ||
    brief.status !==
      'closed'
  ) {
    return {
      ok:false,
      reason:
        '缺少有效营业日结数据'
    };
  }

  const store =
    ensureShop(
      shopId
    );

  const day =
    Number(
      brief.day
    );

  const existing =
    store.reports.find(
      item =>
        Number(
          item.day
        ) ===
        day
    );

  if (existing) {
    return {
      ok:true,
      existing:true,
      report:
        clone(
          existing
        )
    };
  }

  const report =
    buildReport(
      shopId,
      brief,
      store.reports
    );

  store.reports.unshift(
    report
  );

  store.reports =
    store.reports.slice(
      0,
      MAX_REPORTS
    );

  store.lastCapturedDay =
    day;

  store.pendingActions =
    report.actions.map(
      item => ({
        ...clone(item),
        reportId:
          report.id,
        day:
          report.day
      })
    );

  return {
    ok:true,
    existing:false,
    report:
      clone(
        report
      )
  };
}

function latest(shopId) {
  const store =
    ensureShop(
      shopId
    );

  return store.reports[0]
    ? clone(
        store.reports[0]
      )
    : null;
}

function history(
  shopId,
  limit
) {
  return ensureShop(
    shopId
  )
    .reports
    .slice(
      0,
      Math.max(
        1,
        Math.min(
          MAX_REPORTS,
          Number(limit) ||
          30
        )
      )
    )
    .map(clone);
}

function pendingActions(
  shopId
) {
  return ensureShop(
    shopId
  )
    .pendingActions
    .map(clone);
}

function markActionViewed(
  shopId,
  actionId
) {
  const store =
    ensureShop(
      shopId
    );

  const action =
    store
      .pendingActions
      .find(
        item =>
          item.id ===
          actionId
      );

  if (!action) {
    return false;
  }

  action.viewed =
    true;

  return true;
}

function resetForTests() {
  const business =
    gameState.getBusiness();

  business.operatingReports = {
    version:VERSION,
    shops:{}
  };
}

module.exports = {
  VERSION,
  MAX_REPORTS,
  getRoot,
  ensureShop,
  buildReport,
  capture,
  latest,
  history,
  pendingActions,
  markActionViewed,
  averageReports,
  resetForTests
};
