'use strict';

const VERSION =
  '0.8.43';

const TARGETS =
  Object.freeze({
    foodCostRate:{
      healthy:[24,38],
      warning:[20,45]
    },
    laborRate:{
      healthy:[18,32],
      warning:[12,38]
    },
    rentRate:{
      healthy:[8,18],
      warning:[5,24]
    },
    profitRate:{
      healthy:[2,18],
      warning:[-8,25]
    },
    tensionScore:{
      healthy:[35,78],
      warning:[20,92]
    }
  });

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

function clamp(
  value,
  min=0,
  max=100
) {
  return Math.max(
    min,
    Math.min(
      max,
      Number(value) ||
      0
    )
  );
}

function ratio(
  value,
  revenue
) {
  const base =
    Number(revenue) ||
    0;

  if (base <= 0) {
    return 0;
  }

  return round(
    (
      Number(value) ||
      0
    ) /
    base *
    100
  );
}

function bandFor(
  value,
  target
) {
  const healthy =
    target.healthy;

  const warning =
    target.warning;

  if (
    value >=
      healthy[0] &&
    value <=
      healthy[1]
  ) {
    return 'healthy';
  }

  if (
    value >=
      warning[0] &&
    value <=
      warning[1]
  ) {
    return 'watch';
  }

  return 'risk';
}

function assessDay(
  financial,
  context
) {
  const f =
    financial &&
    typeof financial ===
      'object'
      ? financial
      : {};

  const ctx =
    context &&
    typeof context ===
      'object'
      ? context
      : {};

  const revenue =
    Math.max(
      0,
      Number(
        f.revenue
      ) ||
      0
    );

  const foodCostRate =
    Number.isFinite(
      Number(
        f.foodCostRate
      )
    ) &&
    Number(
      f.foodCostRate
    ) >
      0
      ? round(
          f.foodCostRate
        )
      : ratio(
          f.foodCost,
          revenue
        );

  const laborRate =
    ratio(
      f.labor,
      revenue
    );

  const rentRate =
    ratio(
      f.rent,
      revenue
    );

  const profitRate =
    Number.isFinite(
      Number(
        f.profitRate
      )
    ) &&
    revenue >
      0
      ? round(
          f.profitRate
        )
      : ratio(
          f.profit,
          revenue
        );

  const tensionScore =
    clamp(
      ctx.tensionScore
    );

  const ratios = {
    foodCostRate,
    laborRate,
    rentRate,
    profitRate,
    tensionScore
  };

  const bands = {
    foodCostRate:
      bandFor(
        foodCostRate,
        TARGETS.foodCostRate
      ),
    laborRate:
      bandFor(
        laborRate,
        TARGETS.laborRate
      ),
    rentRate:
      bandFor(
        rentRate,
        TARGETS.rentRate
      ),
    profitRate:
      bandFor(
        profitRate,
        TARGETS.profitRate
      ),
    tensionScore:
      bandFor(
        tensionScore,
        TARGETS.tensionScore
      )
  };

  let score = 100;

  for (
    const value
    of Object.values(
      bands
    )
  ) {
    if (
      value ===
      'watch'
    ) {
      score -=
        9;
    } else if (
      value ===
      'risk'
    ) {
      score -=
        22;
    }
  }

  if (
    revenue ===
    0
  ) {
    score -=
      20;
  }

  score =
    clamp(score);

  const suggestions = [];

  if (
    bands.foodCostRate !==
    'healthy'
  ) {
    suggestions.push({
      id:'food_cost',
      routeId:'supply',
      message:
        foodCostRate >
        TARGETS
          .foodCostRate
          .healthy[1]
          ? '食材成本率偏高，检查供应商价格、损耗和菜品毛利'
          : '食材成本率异常偏低，检查是否漏记成本或采购不足'
    });
  }

  if (
    bands.laborRate !==
    'healthy'
  ) {
    suggestions.push({
      id:'labor',
      routeId:'staff',
      message:
        laborRate >
        TARGETS
          .laborRate
          .healthy[1]
          ? '人力成本偏高，检查排班、冗员和营业时段'
          : '人力投入偏低，注意高峰服务质量与出餐能力'
    });
  }

  if (
    bands.rentRate !==
    'healthy'
  ) {
    suggestions.push({
      id:'rent',
      routeId:'business',
      message:
        rentRate >
        TARGETS
          .rentRate
          .healthy[1]
          ? '租金占比偏高，需要提高坪效或控制扩张'
          : '租金占比很低，可确认是否具备进一步增长空间'
    });
  }

  if (
    bands.profitRate ===
    'risk'
  ) {
    suggestions.push({
      id:'profit',
      routeId:'business',
      message:
        profitRate <
        TARGETS
          .profitRate
          .warning[0]
          ? '利润率已经进入危险区，应优先保现金流'
          : '利润率异常偏高，检查是否存在漏记成本或难度过低'
    });
  }

  if (
    tensionScore >
    TARGETS
      .tensionScore
      .healthy[1]
  ) {
    suggestions.push({
      id:'cash',
      routeId:'business',
      message:'现金紧张度偏高，暂缓大额支出并提高现金储备'
    });
  } else if (
    tensionScore <
    TARGETS
      .tensionScore
      .healthy[0]
  ) {
    suggestions.push({
      id:'cash_easy',
      routeId:'business',
      message:'现金压力偏低，可观察游戏是否缺少经营张力'
    });
  }

  return {
    version:VERSION,
    score,
    grade:
      score >=
      86
        ? 'balanced'
        : score >=
          66
          ? 'watch'
          : 'unbalanced',
    ratios,
    bands,
    suggestions:
      suggestions.slice(
        0,
        5
      )
  };
}

function createRng(seed) {
  let state =
    (
      Number(seed) ||
      1
    ) >>>
    0;

  return function next() {
    state =
      (
        Math.imul(
          state,
          1664525
        ) +
        1013904223
      ) >>>
      0;

    return state /
      4294967296;
  };
}

function scenario(
  index,
  options
) {
  const opts =
    options ||
    {};

  const rng =
    createRng(
      (
        Number(
          opts.seed
        ) ||
        20260915
      ) +
      index *
      97
    );

  const orders =
    Math.round(
      28 +
      rng() *
      132
    );

  const avgTicket =
    24 +
    rng() *
    44;

  const revenue =
    orders *
    avgTicket;

  const foodRate =
    0.25 +
    rng() *
    0.16;

  const laborRate =
    0.16 +
    rng() *
    0.18;

  const rentRate =
    0.07 +
    rng() *
    0.14;

  const otherRate =
    0.06 +
    rng() *
    0.10;

  const foodCost =
    revenue *
    foodRate;

  const labor =
    revenue *
    laborRate;

  const rent =
    revenue *
    rentRate;

  const utilities =
    revenue *
    otherRate *
    0.34;

  const marketing =
    revenue *
    otherRate *
    0.28;

  const platformFees =
    revenue *
    otherRate *
    0.24;

  const waste =
    revenue *
    otherRate *
    0.14;

  const totalCost =
    foodCost +
    labor +
    rent +
    utilities +
    marketing +
    platformFees +
    waste;

  const profit =
    revenue -
    totalCost;

  const profitRate =
    revenue >
      0
      ? profit /
        revenue *
        100
      : 0;

  const reserveTarget =
    12000 +
    rng() *
    26000;

  const openingCash =
    reserveTarget *
    (
      0.45 +
      rng() *
      2.3
    );

  const endingCash =
    openingCash +
    profit;

  const tensionScore =
    endingCash <=
      0
      ? 100
      : endingCash <
        reserveTarget
        ? 70 +
          (
            1 -
            endingCash /
            reserveTarget
          ) *
          30
        : endingCash <
          reserveTarget *
          2
          ? 45 +
            (
              2 -
              endingCash /
              reserveTarget
            ) *
            25
          : Math.max(
              12,
              42 -
              (
                endingCash /
                reserveTarget -
                2
              ) *
              12
            );

  const financial = {
    revenue:
      round(
        revenue
      ),
    foodCost:
      round(
        foodCost
      ),
    labor:
      round(
        labor
      ),
    rent:
      round(
        rent
      ),
    utilities:
      round(
        utilities
      ),
    marketing:
      round(
        marketing
      ),
    platformFees:
      round(
        platformFees
      ),
    waste:
      round(
        waste
      ),
    totalCost:
      round(
        totalCost
      ),
    profit:
      round(
        profit
      ),
    profitRate:
      round(
        profitRate
      ),
    orders
  };

  const assessment =
    assessDay(
      financial,
      {
        tensionScore
      }
    );

  return {
    index,
    financial,
    reserveTarget:
      round(
        reserveTarget
      ),
    openingCash:
      round(
        openingCash
      ),
    endingCash:
      round(
        endingCash
      ),
    tensionScore:
      round(
        tensionScore
      ),
    hardDeadlock:
      endingCash <
      0,
    tooEasy:
      profitRate >
        28 &&
      tensionScore <
        28,
    assessment
  };
}

function calibrate(
  count,
  options
) {
  const total =
    Math.max(
      20,
      Math.min(
        500,
        Number(count) ||
        100
      )
    );

  const rows = [];

  for (
    let i = 0;
    i < total;
    i++
  ) {
    rows.push(
      scenario(
        i,
        options
      )
    );
  }

  const hardDeadlocks =
    rows.filter(
      item =>
        item.hardDeadlock
    ).length;

  const tooEasy =
    rows.filter(
      item =>
        item.tooEasy
    ).length;

  const balanced =
    rows.filter(
      item =>
        item.assessment
          .grade ===
        'balanced'
    ).length;

  const deadlockRate =
    round(
      hardDeadlocks /
      total *
      100
    );

  const tooEasyRate =
    round(
      tooEasy /
      total *
      100
    );

  const balancedRate =
    round(
      balanced /
      total *
      100
    );

  return {
    version:VERSION,
    total,
    hardDeadlocks,
    deadlockRate,
    tooEasy,
    tooEasyRate,
    balanced,
    balancedRate,
    pass:
      deadlockRate <=
        18 &&
      tooEasyRate <=
        20 &&
      balancedRate >=
        30,
    targets:{
      maxDeadlockRate:18,
      maxTooEasyRate:20,
      minBalancedRate:30
    },
    rows
  };
}

module.exports = {
  VERSION,
  TARGETS,
  ratio,
  bandFor,
  assessDay,
  scenario,
  calibrate
};
