'use strict';

const gameState =
  require('./gameState.js');

const businessLifecycle =
  require('./businessLifecycleV086.js');

const openingFinance =
  require('../finance/openingFinanceSystem.js');

const completeFinance =
  require('../finance/completeFinanceSystemV0825.js');

const VERSION =
  '0.8.39';

function clone(value) {
  if (value === undefined) {
    return undefined;
  }

  return JSON.parse(
    JSON.stringify(value)
  );
}

function clamp(
  value,
  min=0,
  max=100
) {
  return Math.max(
    min,
    Math.min(
      max,
      Number(value) || 0
    )
  );
}

function createGuard(options) {
  const opts =
    options ||
    {};

  const deps = {
    gameState:
      opts.gameState ||
      gameState,
    businessLifecycle:
      opts.businessLifecycle ||
      businessLifecycle,
    openingFinance:
      opts.openingFinance ||
      openingFinance,
    completeFinance:
      opts.completeFinance ||
      completeFinance
  };

  function shopById(shopId) {
    const business =
      deps.gameState
        .getBusiness();

    return (
      business.shops ||
      []
    ).find(
      item =>
        item &&
        item.id ===
        shopId
    ) || null;
  }

  function currentShop() {
    const business =
      deps.gameState
        .getBusiness();

    return (
      shopById(
        business
          .currentShopId
      ) ||
      (
        business.shops ||
        []
      )[0] ||
      null
    );
  }

  function lifecycleStage(shop) {
    if (!shop) {
      return null;
    }

    if (
      deps.businessLifecycle &&
      typeof deps.businessLifecycle
        .deriveStage ===
        'function'
    ) {
      try {
        return deps
          .businessLifecycle
          .deriveStage(
            shop
          );
      } catch (error) {
      }
    }

    return (
      shop.lifecycleStage ||
      shop.status ||
      null
    );
  }

  function monthlyBurn(shopId) {
    const shop =
      shopById(shopId);

    if (!shop) {
      return {
        rent:0,
        payroll:0,
        fixed:0
      };
    }

    const business =
      deps.gameState
        .getBusiness();

    const staffing =
      business.openingPrep &&
      business.openingPrep
        .staffing &&
      business.openingPrep
        .staffing[
          shop.id
        ] ||
      null;

    const hired =
      staffing &&
      Array.isArray(
        staffing.hired
      )
        ? staffing.hired
        : [];

    const payroll =
      hired.reduce(
        (
          total,
          item
        ) =>
          total +
          (
            Number(
              item.wage
            ) ||
            0
          ),
        0
      );

    const rent =
      Math.max(
        0,
        Number(
          shop.monthlyRent
        ) ||
        0
      );

    return {
      rent,
      payroll,
      fixed:
        rent +
        payroll
    };
  }

  function reserveTarget(shopId) {
    const shop =
      shopById(shopId);

    if (!shop) {
      return 12000;
    }

    const burn =
      monthlyBurn(
        shopId
      );

    const stage =
      lifecycleStage(
        shop
      );

    let multiplier =
      0.35;

    if (
      stage ===
        'awaiting_renovation' ||
      stage ===
        'renovating' ||
      stage ===
        'awaiting_equipment' ||
      stage ===
        'equipment_installing' ||
      stage ===
        'awaiting_permits' ||
      stage ===
        'permits_reviewing' ||
      stage ===
        'awaiting_staff'
    ) {
      multiplier =
        0.55;
    } else if (
      stage ===
        'ready_for_trial' ||
      stage ===
        'trial_opening' ||
      stage ===
        'trial_complete'
    ) {
      multiplier =
        0.75;
    } else if (
      stage ===
        'formal_open' ||
      stage ===
        'open'
    ) {
      multiplier =
        0.45;
    }

    return Math.max(
      8000,
      Math.round(
        burn.fixed *
        multiplier
      )
    );
  }

  function cash() {
    return Math.max(
      0,
      Number(
        deps.gameState
          .getPlayer()
          .cash
      ) ||
      0
    );
  }

  function debt(shopId) {
    if (
      !deps.businessLifecycle ||
      typeof deps.businessLifecycle
        .getLoanSummary !==
        'function'
    ) {
      return null;
    }

    try {
      return deps
        .businessLifecycle
        .getLoanSummary(
          shopId
        );
    } catch (error) {
      return null;
    }
  }

  function credit(shopId) {
    if (
      !deps.openingFinance ||
      typeof deps.openingFinance
        .getOffer !==
        'function'
    ) {
      return null;
    }

    try {
      return deps
        .openingFinance
        .getOffer(
          shopId
        );
    } catch (error) {
      return null;
    }
  }

  function assessSpend(
    shopId,
    amount,
    category
  ) {
    const planned =
      Math.max(
        0,
        Number(amount) || 0
      );

    const available =
      cash();

    const reserve =
      reserveTarget(
        shopId
      );

    const after =
      available -
      planned;

    if (
      planned >
      available
    ) {
      return {
        allowed:false,
        severity:'blocked',
        code:
          'INSUFFICIENT_CASH',
        message:
          '现金不足，不能执行该支出',
        category:
          category ||
          'other',
        cash:
          available,
        amount:
          planned,
        afterCash:
          after,
        reserveTarget:
          reserve
      };
    }

    if (
      after <
      0
    ) {
      return {
        allowed:false,
        severity:'blocked',
        code:
          'NEGATIVE_CASH',
        message:
          '支出后现金会小于0',
        category:
          category ||
          'other',
        cash:
          available,
        amount:
          planned,
        afterCash:
          after,
        reserveTarget:
          reserve
      };
    }

    if (
      after <
      reserve *
      0.35
    ) {
      return {
        allowed:true,
        severity:'critical_warning',
        code:
          'RESERVE_CRITICAL',
        message:
          '可以支出，但支出后几乎没有经营缓冲',
        category:
          category ||
          'other',
        cash:
          available,
        amount:
          planned,
        afterCash:
          after,
        reserveTarget:
          reserve
      };
    }

    if (
      after <
      reserve
    ) {
      return {
        allowed:true,
        severity:'warning',
        code:
          'RESERVE_LOW',
        message:
          '可以支出，但会进入低现金缓冲',
        category:
          category ||
          'other',
        cash:
          available,
        amount:
          planned,
        afterCash:
          after,
        reserveTarget:
          reserve
      };
    }

    return {
      allowed:true,
      severity:'normal',
      code:'OK',
      message:null,
      category:
        category ||
        'other',
      cash:
        available,
      amount:
        planned,
      afterCash:
        after,
      reserveTarget:
        reserve
    };
  }

  function tensionScore(shopId) {
    const available =
      cash();

    const reserve =
      reserveTarget(
        shopId
      );

    if (
      reserve <=
      0
    ) {
      return 0;
    }

    const ratio =
      available /
      reserve;

    if (
      ratio >=
      3
    ) {
      return 20;
    }

    if (
      ratio >=
      2
    ) {
      return Math.round(
        30 +
        (
          3 -
          ratio
        ) *
        15
      );
    }

    if (
      ratio >=
      1
    ) {
      return Math.round(
        45 +
        (
          2 -
          ratio
        ) *
        25
      );
    }

    if (
      ratio >=
      0.35
    ) {
      return Math.round(
        70 +
        (
          1 -
          ratio
        ) *
        30
      );
    }

    return 100;
  }

  function recoveryOptions(shopId) {
    const shop =
      shopById(shopId);

    const rows = [];

    const available =
      cash();

    const reserve =
      reserveTarget(
        shopId
      );

    const loan =
      credit(
        shopId
      );

    if (
      available <
      reserve &&
      loan &&
      loan.available !==
        false
    ) {
      rows.push({
        id:'opening_credit',
        priority:1,
        routeId:'business',
        message:
          '可考虑使用开店信用额度补充现金缓冲'
      });
    }

    if (
      shop &&
      (
        shop.status ===
          'open' ||
        shop.status ===
          'trial_opening'
      )
    ) {
      rows.push({
        id:'review_menu',
        priority:2,
        routeId:'research',
        message:
          '检查菜单售价、毛利和主推菜'
      });

      rows.push({
        id:'review_supply',
        priority:3,
        routeId:'supply',
        message:
          '检查采购成本和库存积压'
      });
    }

    rows.push({
      id:'avoid_expansion',
      priority:4,
      routeId:'business',
      message:
        '现金缓冲不足时暂缓扩张和高预算营销'
    });

    return rows;
  }

  function snapshot(shopIdValue) {
    const shop =
      shopIdValue
        ? shopById(
            shopIdValue
          )
        : currentShop();

    const shopId =
      shop
        ? shop.id
        : null;

    const available =
      cash();

    const reserve =
      reserveTarget(
        shopId
      );

    const burn =
      monthlyBurn(
        shopId
      );

    const finance =
      shopId &&
      deps.completeFinance &&
      typeof deps.completeFinance
        .snapshot ===
        'function'
        ? deps.completeFinance
            .snapshot(
              shopId
            )
        : null;

    const tension =
      tensionScore(
        shopId
      );

    return {
      version:VERSION,
      shopId,
      cash:
        available,
      monthlyBurn:
        burn,
      reserveTarget:
        reserve,
      reserveGap:
        Math.max(
          0,
          reserve -
          available
        ),
      tensionScore:
        tension,
      tensionBand:
        tension >=
        90
          ? 'critical'
          : tension >=
              70
            ? 'tight'
            : tension >=
                45
              ? 'balanced'
              : 'comfortable',
      loan:
        shopId
          ? clone(
              debt(
                shopId
              )
            )
          : null,
      credit:
        shopId
          ? clone(
              credit(
                shopId
              )
            )
          : null,
      finance,
      recovery:
        recoveryOptions(
          shopId
        )
    };
  }

  function diagnose(
    shopId
  ) {
    const view =
      snapshot(
        shopId
      );

    const issues = [];

    if (
      !Number.isFinite(
        view.cash
      )
    ) {
      issues.push(
        'CASH_INVALID'
      );
    }

    if (
      view.cash <
      0
    ) {
      issues.push(
        'CASH_NEGATIVE'
      );
    }

    if (
      view.tensionScore >=
      90
    ) {
      issues.push(
        'ECONOMY_CRITICAL'
      );
    }

    return {
      ok:
        !issues.includes(
          'CASH_INVALID'
        ) &&
        !issues.includes(
          'CASH_NEGATIVE'
        ),
      version:VERSION,
      issues,
      snapshot:
        view
    };
  }

  return {
    VERSION,
    shopById,
    currentShop,
    lifecycleStage,
    monthlyBurn,
    reserveTarget,
    cash,
    debt,
    credit,
    assessSpend,
    tensionScore,
    recoveryOptions,
    snapshot,
    diagnose
  };
}

const guard =
  createGuard();

guard.createGuard =
  createGuard;

module.exports =
  guard;
