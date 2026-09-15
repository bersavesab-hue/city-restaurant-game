'use strict';

const gameState =
  require('../core/gameState.js');

const VERSION =
  '0.8.40';

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

function normalizeSnapshot(input) {
  const source =
    input &&
    typeof input ===
      'object'
      ? input
      : {};

  return {
    day:
      Number(
        source.day
      ) ||
      null,
    cash:
      round(
        source.cash
      ),
    revenue:
      round(
        source.revenue
      ),
    profit:
      round(
        source.profit
      ),
    orders:
      Math.max(
        0,
        Number(
          source.orders
        ) ||
        0
      ),
    customers:
      Math.max(
        0,
        Number(
          source.customers
        ) ||
        0
      ),
    rating:
      round(
        source.rating
      ),
    memberCount:
      Math.max(
        0,
        Number(
          source.memberCount
        ) ||
        0
      ),
    staffCount:
      Math.max(
        0,
        Number(
          source.staffCount
        ) ||
        0
      ),
    inventoryAlerts:
      Math.max(
        0,
        Number(
          source.inventoryAlerts
        ) ||
        0
      ),
    tensionScore:
      Math.max(
        0,
        Math.min(
          100,
          Number(
            source.tensionScore
          ) ||
          0
        )
      )
  };
}

function getRoot() {
  const business =
    gameState.getBusiness();

  business.dailyOperatingCycle =
    business.dailyOperatingCycle &&
    typeof business.dailyOperatingCycle ===
      'object'
      ? business.dailyOperatingCycle
      : {
          version:VERSION,
          shops:{}
        };

  const root =
    business.dailyOperatingCycle;

  root.version =
    VERSION;

  root.shops =
    root.shops &&
    typeof root.shops ===
      'object'
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
      shopId:id,
      sequence:0,
      active:null,
      history:[],
      metrics:{
        daysOpened:0,
        visits:0,
        failedVisits:0,
        totalRevenue:0,
        totalProfit:0,
        goalsCompleted:0,
        goalsMissed:0,
        goalStreak:0,
        bestGoalStreak:0
      }
    };
  }

  const state =
    root.shops[id];

  state.version =
    VERSION;

  state.history =
    Array.isArray(
      state.history
    )
      ? state.history
      : [];

  state.metrics =
    state.metrics &&
    typeof state.metrics ===
      'object'
      ? state.metrics
      : {};

  return state;
}

function beginDay(
  shopId,
  day,
  baseline
) {
  const state =
    ensureShop(shopId);

  const currentDay =
    Math.max(
      1,
      Number(day) ||
      1
    );

  if (
    state.active &&
    Number(
      state.active.day
    ) ===
      currentDay &&
    state.active.status ===
      'open'
  ) {
    return {
      ok:true,
      existing:true,
      day:
        clone(
          state.active
        )
    };
  }

  if (
    state.active &&
    state.active.status ===
      'open'
  ) {
    state.active.status =
      'interrupted';

    state.active.interruptedByDay =
      currentDay;

    state.history.unshift(
      clone(
        state.active
      )
    );

    state.history =
      state.history.slice(
        0,
        120
      );
  }

  const dailyGoal =
    buildDailyGoal(
      state
    );

  state.active = {
    id:
      'operating_day_' +
      ++state.sequence,
    version:VERSION,
    shopId:
      String(shopId),
    day:
      currentDay,
    status:'open',
    baseline:
      normalizeSnapshot(
        baseline
      ),
    goal:
      clone(
        dailyGoal
      ),
    visits:{
      success:0,
      failed:0,
      customers:0,
      revenue:0,
      contribution:0,
      failureReasons:{}
    },
    decisionRefs:[],
    events:[],
    closed:null
  };

  state.metrics.daysOpened =
    (
      Number(
        state.metrics.daysOpened
      ) ||
      0
    ) +
    1;

  return {
    ok:true,
    existing:false,
    day:
      clone(
        state.active
      )
  };
}

function activeDay(
  shopId
) {
  const state =
    ensureShop(shopId);

  return state.active
    ? clone(
        state.active
      )
    : null;
}

function recordVisit(
  shopId,
  day,
  result
) {
  const state =
    ensureShop(shopId);

  const currentDay =
    Math.max(
      1,
      Number(day) ||
      1
    );

  if (
    !state.active ||
    Number(
      state.active.day
    ) !==
      currentDay ||
    state.active.status !==
      'open'
  ) {
    beginDay(
      shopId,
      currentDay,
      {}
    );
  }

  const active =
    state.active;

  const visit =
    result &&
    typeof result ===
      'object'
      ? result
      : {};

  if (visit.ok) {
    active.visits.success +=
      1;

    active.visits.customers +=
      Math.max(
        1,
        Number(
          visit.visit &&
          visit.visit.partySize
        ) ||
        Number(
          visit.order &&
          visit.order.partySize
        ) ||
        1
      );

    active.visits.revenue =
      round(
        active.visits.revenue +
        (
          Number(
            visit.settlement &&
            visit.settlement.revenue
          ) ||
          0
        )
      );

    active.visits.contribution =
      round(
        active.visits.contribution +
        (
          Number(
            visit.settlement &&
            visit.settlement.contribution
          ) ||
          0
        )
      );

    state.metrics.visits =
      (
        Number(
          state.metrics.visits
        ) ||
        0
      ) +
      1;
  } else {
    active.visits.failed +=
      1;

    state.metrics.failedVisits =
      (
        Number(
          state.metrics.failedVisits
        ) ||
        0
      ) +
      1;

    const reason =
      String(
        visit.reason ||
        '未知原因'
      );

    active.visits
      .failureReasons[
        reason
      ] =
      (
        active.visits
          .failureReasons[
            reason
          ] ||
        0
      ) +
      1;
  }

  return clone(
    active.visits
  );
}

function recordDecisionRef(
  shopId,
  day,
  decisionId,
  type
) {
  const state =
    ensureShop(shopId);

  const currentDay =
    Math.max(
      1,
      Number(day) ||
      1
    );

  if (
    !state.active ||
    Number(
      state.active.day
    ) !==
      currentDay
  ) {
    beginDay(
      shopId,
      currentDay,
      {}
    );
  }

  const exists =
    state.active
      .decisionRefs
      .some(
        item =>
          item.id ===
          decisionId
      );

  if (!exists) {
    state.active
      .decisionRefs
      .push({
        id:
          decisionId,
        type:
          type ||
          'other'
      });
  }

  return clone(
    state.active
      .decisionRefs
  );
}

function recordEvent(
  shopId,
  day,
  event
) {
  const state =
    ensureShop(shopId);

  const currentDay =
    Math.max(
      1,
      Number(day) ||
      1
    );

  if (
    !state.active ||
    Number(
      state.active.day
    ) !==
      currentDay
  ) {
    beginDay(
      shopId,
      currentDay,
      {}
    );
  }

  state.active
    .events
    .push({
      ...(event || {})
    });

  state.active.events =
    state.active
      .events
      .slice(-80);

  return clone(
    state.active.events
  );
}

function financialFromClose(
  closeResult
) {
  const source =
    closeResult &&
    closeResult.financial
      ? closeResult.financial
      : closeResult &&
        closeResult.result &&
        closeResult.result.financial
        ? closeResult.result.financial
        : {};

  return {
    revenue:
      round(
        source.revenue
      ),
    profit:
      round(
        source.profit
      ),
    totalCost:
      round(
        source.totalCost
      ),
    foodCost:
      round(
        source.foodCost
      ),
    labor:
      round(
        source.labor
      ),
    rent:
      round(
        source.rent
      ),
    utilities:
      round(
        source.utilities
      ),
    marketing:
      round(
        source.marketing
      ),
    compliance:
      round(
        source.compliance
      ),
    waste:
      round(
        source.waste
      ),
    refunds:
      round(
        source.refunds
      ),
    orders:
      Math.max(
        0,
        Number(
          source.orders
        ) ||
        0
      ),
    customers:
      Math.max(
        0,
        Number(
          source.customers
        ) ||
        0
      ),
    avgTicket:
      round(
        source.avgTicket
      ),
    foodCostRate:
      round(
        source.foodCostRate
      ),
    profitRate:
      round(
        source.profitRate
      )
  };
}

function buildDailyGoal(
  state
) {
  const previous =
    state.history.find(
      item =>
        item &&
        item.status ===
          'closed' &&
        item.financial &&
        typeof item.financial ===
          'object'
    ) ||
    null;

  if (!previous) {
    return {
      id:'first_order',
      kind:'orders_at_least',
      label:'拿下今天第一笔有效订单',
      target:1,
      routeId:'shop',
      sourceDay:null,
      status:'active'
    };
  }

  const financial =
    previous.financial ||
    {};

  const end =
    previous.endSnapshot ||
    {};

  if (
    Number(
      financial.orders
    ) <=
    0
  ) {
    return {
      id:'recover_orders',
      kind:'orders_at_least',
      label:'今天至少完成1笔有效订单',
      target:1,
      routeId:'shop',
      sourceDay:
        previous.day,
      status:'active'
    };
  }

  if (
    Number(
      end.tensionScore
    ) >=
    90
  ) {
    return {
      id:'cash_relief',
      kind:'tension_at_most',
      label:'把现金压力降到90以下',
      target:89,
      routeId:'business',
      sourceDay:
        previous.day,
      status:'active'
    };
  }

  if (
    Number(
      end.inventoryAlerts
    ) >
    0
  ) {
    return {
      id:'clear_inventory_alerts',
      kind:'inventory_alerts_at_most',
      label:'把库存预警清零',
      target:0,
      routeId:'supply',
      sourceDay:
        previous.day,
      status:'active'
    };
  }

  if (
    Number(
      financial.foodCostRate
    ) >
    42
  ) {
    return {
      id:'food_cost_control',
      kind:'food_cost_at_most',
      label:'把食材成本率压到42%以内',
      target:42,
      routeId:'research',
      sourceDay:
        previous.day,
      status:'active'
    };
  }

  if (
    Number(
      financial.profit
    ) <=
    0
  ) {
    return {
      id:'profit_turnaround',
      kind:'profit_at_least',
      label:'让今天净利润转正',
      target:1,
      routeId:'business',
      sourceDay:
        previous.day,
      status:'active'
    };
  }

  if (
    Number(
      end.rating
    ) >
      0 &&
    Number(
      end.rating
    ) <
      3.8
  ) {
    return {
      id:'rating_recovery',
      kind:'rating_at_least',
      label:'把门店评分提升到3.8以上',
      target:3.8,
      routeId:'business',
      sourceDay:
        previous.day,
      status:'active'
    };
  }

  return {
    id:'profit_growth',
    kind:'profit_at_least',
    label:'今天净利润比昨日提升5%',
    target:
      Math.max(
        1,
        round(
          Number(
            financial.profit
          ) *
          1.05
        )
      ),
    baselineValue:
      round(
        financial.profit
      ),
    routeId:'shop',
    sourceDay:
      previous.day,
    status:'active'
  };
}

function evaluateDailyGoal(
  goal,
  financial,
  endSnapshot
) {
  if (
    !goal ||
    typeof goal !==
      'object'
  ) {
    return null;
  }

  let actual = 0;
  let completed = false;

  if (
    goal.kind ===
      'orders_at_least'
  ) {
    actual =
      Math.max(
        0,
        Number(
          financial.orders
        ) ||
        0
      );

    completed =
      actual >=
      Number(
        goal.target
      );
  } else if (
    goal.kind ===
      'profit_at_least'
  ) {
    actual =
      round(
        financial.profit
      );

    completed =
      actual >=
      Number(
        goal.target
      );
  } else if (
    goal.kind ===
      'food_cost_at_most'
  ) {
    actual =
      round(
        financial.foodCostRate
      );

    completed =
      Number(
        financial.orders
      ) >
        0 &&
      actual <=
        Number(
          goal.target
        );
  } else if (
    goal.kind ===
      'inventory_alerts_at_most'
  ) {
    actual =
      Math.max(
        0,
        Number(
          endSnapshot.inventoryAlerts
        ) ||
        0
      );

    completed =
      actual <=
      Number(
        goal.target
      );
  } else if (
    goal.kind ===
      'tension_at_most'
  ) {
    actual =
      round(
        endSnapshot.tensionScore
      );

    completed =
      actual <=
      Number(
        goal.target
      );
  } else if (
    goal.kind ===
      'rating_at_least'
  ) {
    actual =
      round(
        endSnapshot.rating
      );

    completed =
      actual >=
      Number(
        goal.target
      );
  }

  return {
    ...clone(
      goal
    ),
    status:
      completed
        ? 'completed'
        : 'missed',
    completed,
    actual,
    message:
      completed
        ? '今日目标完成'
        : '今日目标未完成'
  };
}

function buildReasons(
  financial,
  active,
  endSnapshot,
  extra
) {
  const reasons = [];

  if (
    financial.orders ===
    0
  ) {
    reasons.push({
      code:'NO_ORDERS',
      severity:'critical',
      message:'今天没有形成有效订单'
    });
  }

  if (
    financial.profit <
    0
  ) {
    reasons.push({
      code:'LOSS_DAY',
      severity:'warning',
      message:
        '今日亏损 ' +
        Math.abs(
          financial.profit
        ).toFixed(2)
    });
  }

  if (
    financial.foodCostRate >
    42
  ) {
    reasons.push({
      code:'FOOD_COST_HIGH',
      severity:'warning',
      message:
        '食材成本率偏高：' +
        financial
          .foodCostRate
          .toFixed(1) +
        '%'
    });
  }

  if (
    active &&
    active.visits &&
    active.visits.failed >
      0
  ) {
    reasons.push({
      code:'FAILED_VISITS',
      severity:'warning',
      message:
        '有 ' +
        active.visits.failed +
        ' 次顾客接待失败'
    });
  }

  if (
    Number(
      endSnapshot.inventoryAlerts
    ) >
    0
  ) {
    reasons.push({
      code:'INVENTORY_ALERTS',
      severity:'warning',
      message:
        '库存存在 ' +
        endSnapshot
          .inventoryAlerts +
        ' 项预警'
    });
  }

  if (
    Number(
      endSnapshot.tensionScore
    ) >=
    90
  ) {
    reasons.push({
      code:'CASH_CRITICAL',
      severity:'critical',
      message:'现金缓冲已进入危险区'
    });
  }

  if (
    extra &&
    extra.regulatory &&
    Number(
      extra.regulatory
        .openViolations
    ) >
    0
  ) {
    reasons.push({
      code:'OPEN_VIOLATION',
      severity:'critical',
      message:'仍有未完成的监管整改'
    });
  }

  return reasons;
}

function buildNextActions(
  financial,
  endSnapshot,
  reasons
) {
  const actions = [];

  if (
    reasons.some(
      item =>
        item.code ===
        'INVENTORY_ALERTS'
    )
  ) {
    actions.push({
      id:'check_supply',
      routeId:'supply',
      message:'先处理库存与补货'
    });
  }

  if (
    reasons.some(
      item =>
        item.code ===
        'FOOD_COST_HIGH'
    )
  ) {
    actions.push({
      id:'check_menu_margin',
      routeId:'research',
      message:'检查菜单售价与菜品毛利'
    });
  }

  if (
    reasons.some(
      item =>
        item.code ===
        'CASH_CRITICAL'
    ) ||
    financial.profit <
      0
  ) {
    actions.push({
      id:'check_finance',
      routeId:'business',
      message:'先查看现金流和成本结构'
    });
  }

  if (
    Number(
      endSnapshot.rating
    ) >
      0 &&
    Number(
      endSnapshot.rating
    ) <
      3.8
  ) {
    actions.push({
      id:'check_reputation',
      routeId:'business',
      message:'优先修复评分和顾客体验'
    });
  }

  if (
    !actions.length
  ) {
    actions.push({
      id:'continue_operation',
      routeId:'shop',
      message:'经营状态稳定，可以继续营业并观察趋势'
    });
  }

  return actions.slice(
    0,
    4
  );
}

function finalizeDay(
  shopId,
  day,
  closeResult,
  endSnapshotValue,
  extra
) {
  const state =
    ensureShop(shopId);

  const currentDay =
    Math.max(
      1,
      Number(day) ||
      1
    );

  const existing =
    state.history.find(
      item =>
        item &&
        item.status ===
          'closed' &&
        Number(
          item.day
        ) ===
          currentDay
    );

  if (existing) {
    return {
      ok:true,
      existing:true,
      brief:
        clone(
          existing
        )
    };
  }

  if (
    !state.active ||
    Number(
      state.active.day
    ) !==
      currentDay
  ) {
    beginDay(
      shopId,
      currentDay,
      {}
    );
  }

  const active =
    state.active;

  const endSnapshot =
    normalizeSnapshot(
      endSnapshotValue
    );

  const financial =
    financialFromClose(
      closeResult
    );

  const reasons =
    buildReasons(
      financial,
      active,
      endSnapshot,
      extra
    );

  const goalResult =
    evaluateDailyGoal(
      active.goal,
      financial,
      endSnapshot
    );

  const brief = {
    id:
      active.id,
    version:VERSION,
    shopId:
      String(shopId),
    day:
      currentDay,
    status:'closed',
    baseline:
      clone(
        active.baseline
      ),
    endSnapshot,
    visits:
      clone(
        active.visits
      ),
    decisionRefs:
      clone(
        active.decisionRefs
      ),
    events:
      clone(
        active.events
      ),
    financial,
    goal:
      clone(
        active.goal
      ),
    goalResult:
      clone(
        goalResult
      ),
    deltas:{
      cash:
        round(
          endSnapshot.cash -
          active.baseline.cash
        ),
      rating:
        round(
          endSnapshot.rating -
          active.baseline.rating
        ),
      members:
        endSnapshot.memberCount -
        active.baseline.memberCount,
      inventoryAlerts:
        endSnapshot.inventoryAlerts -
        active.baseline
          .inventoryAlerts,
      tensionScore:
        round(
          endSnapshot.tensionScore -
          active.baseline
            .tensionScore
        )
    },
    reasons,
    nextActions:
      buildNextActions(
        financial,
        endSnapshot,
        reasons
      ),
    extra:
      clone(
        extra ||
        {}
      )
  };

  active.status =
    'closed';

  active.closed =
    clone(
      brief
    );

  state.history.unshift(
    brief
  );

  state.history =
    state.history.slice(
      0,
      120
    );

  state.active =
    null;

  if (goalResult) {
    if (
      goalResult.completed
    ) {
      state.metrics
        .goalsCompleted =
        (
          Number(
            state.metrics
              .goalsCompleted
          ) ||
          0
        ) +
        1;

      state.metrics
        .goalStreak =
        (
          Number(
            state.metrics
              .goalStreak
          ) ||
          0
        ) +
        1;

      state.metrics
        .bestGoalStreak =
        Math.max(
          Number(
            state.metrics
              .bestGoalStreak
          ) ||
          0,
          state.metrics
            .goalStreak
        );
    } else {
      state.metrics
        .goalsMissed =
        (
          Number(
            state.metrics
              .goalsMissed
          ) ||
          0
        ) +
        1;

      state.metrics
        .goalStreak =
        0;
    }
  }

  state.metrics.totalRevenue =
    round(
      (
        Number(
          state.metrics
            .totalRevenue
        ) ||
        0
      ) +
      financial.revenue
    );

  state.metrics.totalProfit =
    round(
      (
        Number(
          state.metrics
            .totalProfit
        ) ||
        0
      ) +
      financial.profit
    );

  return {
    ok:true,
    existing:false,
    brief:
      clone(
        brief
      )
  };
}

function brief(shopId) {
  const state =
    ensureShop(shopId);

  const latestClosed =
    state.history.find(
      item =>
        item &&
        item.status ===
          'closed' &&
        item.financial &&
        typeof item.financial ===
          'object'
    ) ||
    null;

  if (state.active) {
    return {
      version:VERSION,
      shopId:
        String(shopId),
      status:'open',
      active:
        clone(
          state.active
        ),
      metrics:
        clone(
          state.metrics
        ),
      latestClosed:
        latestClosed
          ? clone(
              latestClosed
            )
          : null
    };
  }

  return {
    version:VERSION,
    shopId:
      String(shopId),
    status:
      latestClosed
        ? 'closed'
        : 'idle',
    active:null,
    metrics:
      clone(
        state.metrics
      ),
    latestClosed:
      latestClosed
        ? clone(
            latestClosed
          )
        : null
  };
}

function history(
  shopId,
  limit
) {
  const state =
    ensureShop(shopId);

  return state.history
    .slice(
      0,
      Math.max(
        1,
        Math.min(
          120,
          Number(limit) ||
          30
        )
      )
    )
    .map(clone);
}

function safeCloseCheck(
  shopId,
  runtimeDay,
  activity
) {
  const state =
    ensureShop(shopId);

  const day =
    Math.max(
      1,
      Number(runtimeDay) ||
      1
    );

  const already =
    state.history.some(
      item =>
        item &&
        item.status ===
          'closed' &&
        Number(
          item.day
        ) ===
          day
    );

  if (already) {
    return {
      allowed:false,
      code:'DAY_ALREADY_CLOSED',
      message:'当天已经完成日结'
    };
  }

  const input =
    activity ||
    {};

  const hasActivity =
    (
      Number(
        input.orders
      ) ||
      0
    ) >
      0 ||
    (
      Number(
        input.customers
      ) ||
      0
    ) >
      0 ||
    !!state.active;

  if (!hasActivity) {
    return {
      allowed:false,
      code:'NO_DAY_ACTIVITY',
      message:'今天尚未开始营业，不需要日结'
    };
  }

  return {
    allowed:true,
    code:'OK'
  };
}

function diagnose(shopId) {
  const state =
    ensureShop(shopId);

  const issues = [];

  if (
    state.active &&
    state.history.some(
      item =>
        Number(
          item.day
        ) ===
          Number(
            state.active.day
          ) &&
        item.status ===
          'closed'
    )
  ) {
    issues.push(
      'ACTIVE_DAY_ALREADY_CLOSED'
    );
  }

  return {
    ok:
      issues.length ===
      0,
    version:VERSION,
    shopId:
      String(shopId),
    issues,
    status:
      brief(
        shopId
      ),
    metrics:
      clone(
        state.metrics
      )
  };
}

module.exports = {
  VERSION,
  normalizeSnapshot,
  getRoot,
  ensureShop,
  beginDay,
  activeDay,
  recordVisit,
  recordDecisionRef,
  recordEvent,
  financialFromClose,
  finalizeDay,
  brief,
  history,
  safeCloseCheck,
  diagnose
};
