'use strict';

const gameState =
  require('../core/gameState.js');

const VERSION =
  '0.8.42';

const WEIGHTS =
  Object.freeze({
    critical:32,
    warning:14,
    info:4
  });

function clone(value) {
  if (value === undefined) {
    return undefined;
  }

  return JSON.parse(
    JSON.stringify(value)
  );
}

function getRoot() {
  const business =
    gameState.getBusiness();

  business.playtestHealth =
    business.playtestHealth &&
    typeof business.playtestHealth ===
      'object'
      ? business.playtestHealth
      : {
          version:VERSION,
          shops:{}
        };

  const root =
    business.playtestHealth;

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
      checks:0,
      history:[]
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

  return state;
}

function issue(
  code,
  severity,
  message,
  routeId,
  fixId
) {
  return {
    code,
    severity,
    message,
    routeId:
      routeId ||
      null,
    fixId:
      fixId ||
      null
  };
}

function analyze(
  shopId,
  context
) {
  const ctx =
    context &&
    typeof context ===
      'object'
      ? context
      : {};

  const issues = [];

  if (!ctx.runtimeExists) {
    issues.push(
      issue(
        'RUNTIME_MISSING',
        'critical',
        '门店运行时缺失，无法进入正常营业循环',
        'shop',
        'rebuild_runtime'
      )
    );
  }

  if (
    Number(
      ctx.activeMenuCount
    ) <=
    0
  ) {
    issues.push(
      issue(
        'NO_ACTIVE_MENU',
        'critical',
        '没有可售菜品，顾客无法形成订单',
        'research',
        'activate_menu'
      )
    );
  }

  if (
    ctx.featuredMissing
  ) {
    issues.push(
      issue(
        'NO_FEATURED_DISH',
        'info',
        '尚未设置主推菜，经营反馈不够聚焦',
        'research',
        'select_featured'
      )
    );
  }

  if (
    Number(
      ctx.staffCount
    ) <=
    0
  ) {
    issues.push(
      issue(
        'NO_STAFF',
        'critical',
        '当前没有可工作的员工',
        'staff',
        'hire_staff'
      )
    );
  }

  if (
    Number(
      ctx.inventoryAlerts
    ) >=
    3
  ) {
    issues.push(
      issue(
        'INVENTORY_RISK',
        'warning',
        '库存预警过多，营业可能被断货影响',
        'supply',
        'restock'
      )
    );
  }

  if (
    Number(
      ctx.cash
    ) <=
      0 &&
    !ctx.creditAvailable
  ) {
    issues.push(
      issue(
        'CASH_DEADLOCK',
        'critical',
        '现金耗尽且没有可用信用额度，存在经营死锁',
        'business',
        'cash_recovery'
      )
    );
  }

  if (
    Number(
      ctx.tensionScore
    ) >=
    95
  ) {
    issues.push(
      issue(
        'CASH_TENSION_EXTREME',
        'critical',
        '现金紧张度已接近上限',
        'business',
        'reduce_spend'
      )
    );
  } else if (
    Number(
      ctx.tensionScore
    ) >=
    80
  ) {
    issues.push(
      issue(
        'CASH_TENSION_HIGH',
        'warning',
        '现金缓冲偏低，继续高支出会提高倒闭风险',
        'business',
        'review_costs'
      )
    );
  }

  if (
    Number(
      ctx.openViolations
    ) >
    0
  ) {
    issues.push(
      issue(
        'REGULATORY_OPEN',
        'warning',
        '存在未整改的监管问题',
        'business',
        'remediate'
      )
    );
  }

  if (
    ctx.flowDiagnosis &&
    ctx.flowDiagnosis.ok ===
      false
  ) {
    issues.push(
      issue(
        'FLOW_STATE_CONFLICT',
        'critical',
        '主流程状态存在冲突',
        'system',
        'repair_flow'
      )
    );
  }

  if (
    ctx.dayCycleDiagnosis &&
    ctx.dayCycleDiagnosis.ok ===
      false
  ) {
    issues.push(
      issue(
        'DAY_CYCLE_CONFLICT',
        'critical',
        '营业日状态存在冲突',
        'shop',
        'repair_day_cycle'
      )
    );
  }

  if (
    Number(
      ctx.todayOrders
    ) ===
      0 &&
    Number(
      ctx.runtimeDay
    ) >
      1 &&
    ctx.shopOpen
  ) {
    issues.push(
      issue(
        'OPEN_WITHOUT_ORDERS',
        'warning',
        '门店处于营业状态但今天没有订单',
        'shop',
        'review_operation'
      )
    );
  }

  const score =
    Math.max(
      0,
      Math.min(
        100,
        100 -
        issues.reduce(
          (
            total,
            item
          ) =>
            total +
            (
              WEIGHTS[
                item.severity
              ] ||
              0
            ),
          0
        )
      )
    );

  return {
    version:VERSION,
    shopId:
      String(shopId),
    ok:
      !issues.some(
        item =>
          item.severity ===
          'critical'
      ),
    score,
    grade:
      score >=
      90
        ? 'healthy'
        : score >=
          70
          ? 'watch'
          : score >=
            45
            ? 'risk'
            : 'deadlock',
    issues,
    recommendedRoutes:
      Array.from(
        new Set(
          issues
            .map(
              item =>
                item.routeId
            )
            .filter(Boolean)
        )
      )
  };
}

function record(
  shopId,
  context
) {
  const state =
    ensureShop(shopId);

  const result =
    analyze(
      shopId,
      context
    );

  state.checks +=
    1;

  state.history.unshift({
    check:
      state.checks,
    ...clone(
      result
    )
  });

  state.history =
    state.history.slice(
      0,
      90
    );

  return result;
}

function overview(
  shopId
) {
  const state =
    ensureShop(shopId);

  return {
    version:VERSION,
    shopId:
      String(shopId),
    checks:
      state.checks,
    latest:
      state.history[0]
        ? clone(
            state.history[0]
          )
        : null,
    history:
      state.history
        .slice(
          0,
          20
        )
        .map(clone)
  };
}

module.exports = {
  VERSION,
  WEIGHTS,
  getRoot,
  ensureShop,
  analyze,
  record,
  overview
};
