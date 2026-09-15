'use strict';

const gameState =
  require('../core/gameState.js');

const VERSION =
  '0.8.41';

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
  const s =
    input &&
    typeof input ===
      'object'
      ? input
      : {};

  return {
    day:
      Number(
        s.day
      ) ||
      null,
    cash:
      round(
        s.cash
      ),
    revenue:
      round(
        s.revenue
      ),
    profit:
      round(
        s.profit
      ),
    rating:
      round(
        s.rating
      ),
    memberCount:
      Math.max(
        0,
        Number(
          s.memberCount
        ) ||
        0
      ),
    inventoryAlerts:
      Math.max(
        0,
        Number(
          s.inventoryAlerts
        ) ||
        0
      ),
    staffCount:
      Math.max(
        0,
        Number(
          s.staffCount
        ) ||
        0
      ),
    tensionScore:
      Math.max(
        0,
        Math.min(
          100,
          Number(
            s.tensionScore
          ) ||
          0
        )
      ),
    orders:
      Math.max(
        0,
        Number(
          s.orders
        ) ||
        0
      ),
    customers:
      Math.max(
        0,
        Number(
          s.customers
        ) ||
        0
      )
  };
}

function getRoot() {
  const business =
    gameState.getBusiness();

  business.decisionFeedback =
    business.decisionFeedback &&
    typeof business.decisionFeedback ===
      'object'
      ? business.decisionFeedback
      : {
          version:VERSION,
          sequence:0,
          shops:{}
        };

  const root =
    business.decisionFeedback;

  root.version =
    VERSION;

  root.sequence =
    Math.max(
      0,
      Number(
        root.sequence
      ) ||
      0
    );

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
      pending:[],
      resolved:[],
      metrics:{
        recorded:0,
        resolved:0,
        positive:0,
        negative:0,
        neutral:0
      }
    };
  }

  const state =
    root.shops[id];

  state.version =
    VERSION;

  state.pending =
    Array.isArray(
      state.pending
    )
      ? state.pending
      : [];

  state.resolved =
    Array.isArray(
      state.resolved
    )
      ? state.resolved
      : [];

  state.metrics =
    state.metrics ||
    {};

  return state;
}

function record(
  shopId,
  day,
  type,
  payload,
  baseline
) {
  const root =
    getRoot();

  const state =
    ensureShop(shopId);

  const row = {
    id:
      'decision_' +
      ++root.sequence,
    version:VERSION,
    shopId:
      String(shopId),
    day:
      Math.max(
        1,
        Number(day) ||
        1
      ),
    type:
      String(
        type ||
        'other'
      ),
    payload:
      clone(
        payload ||
        {}
      ),
    baseline:
      normalizeSnapshot(
        baseline
      ),
    status:'pending',
    resolvedDay:null,
    impact:null
  };

  state.pending.push(
    row
  );

  state.pending =
    state.pending.slice(
      -120
    );

  state.metrics.recorded =
    (
      Number(
        state.metrics.recorded
      ) ||
      0
    ) +
    1;

  return clone(row);
}

function scoreImpact(
  baseline,
  end
) {
  let score = 0;

  const profitDelta =
    end.profit -
    baseline.profit;

  const revenueDelta =
    end.revenue -
    baseline.revenue;

  const ratingDelta =
    end.rating -
    baseline.rating;

  const membersDelta =
    end.memberCount -
    baseline.memberCount;

  const alertsDelta =
    end.inventoryAlerts -
    baseline.inventoryAlerts;

  const tensionDelta =
    end.tensionScore -
    baseline.tensionScore;

  score +=
    Math.max(
      -35,
      Math.min(
        35,
        profitDelta /
        100
      )
    );

  score +=
    Math.max(
      -20,
      Math.min(
        20,
        revenueDelta /
        250
      )
    );

  score +=
    Math.max(
      -20,
      Math.min(
        20,
        ratingDelta *
        25
      )
    );

  score +=
    Math.max(
      -10,
      Math.min(
        10,
        membersDelta /
        3
      )
    );

  score -=
    Math.max(
      -10,
      Math.min(
        10,
        alertsDelta *
        3
      )
    );

  score -=
    Math.max(
      -15,
      Math.min(
        15,
        tensionDelta /
        3
      )
    );

  return Math.max(
    -100,
    Math.min(
      100,
      round(score)
    )
  );
}

function outcomeFor(score) {
  if (score >= 18) {
    return 'positive';
  }

  if (score <= -18) {
    return 'negative';
  }

  return 'neutral';
}

function explanationFor(
  decision,
  end,
  score
) {
  const payload =
    decision.payload ||
    {};

  const baseline =
    decision.baseline;

  const profitDelta =
    round(
      end.profit -
      baseline.profit
    );

  const revenueDelta =
    round(
      end.revenue -
      baseline.revenue
    );

  const ratingDelta =
    round(
      end.rating -
      baseline.rating
    );

  const type =
    decision.type;

  if (
    type ===
    'menu_price'
  ) {
    const delta =
      Number(
        payload.delta
      ) ||
      0;

    if (
      delta >
        0 &&
      profitDelta >
        0
    ) {
      return '本次提价后利润改善，暂未观察到明显反噬';
    }

    if (
      delta >
        0 &&
      revenueDelta <
        0
    ) {
      return '本次提价后营收回落，可能压低了成交量';
    }

    if (
      delta <
        0 &&
      revenueDelta >
        0
    ) {
      return '降价带来了更高营收，但仍需观察利润率';
    }
  }

  if (
    type ===
    'menu_featured'
  ) {
    if (
      revenueDelta >
      0
    ) {
      return '更换主推菜后营收上升，可继续观察复购与毛利';
    }

    return '更换主推菜后暂未形成明显正向提升';
  }

  if (
    type ===
    'staff_hire'
  ) {
    if (
      end.staffCount >
      baseline.staffCount &&
      score >=
      0
    ) {
      return '新增员工后经营表现总体稳定，人员补充开始发挥作用';
    }

    if (
      end.tensionScore >
      baseline.tensionScore
    ) {
      return '新增员工提高了固定成本，现金压力有所上升';
    }
  }

  if (
    type ===
    'marketing'
  ) {
    if (
      end.memberCount >
      baseline.memberCount &&
      revenueDelta >=
      0
    ) {
      return '营销带来了会员增长，并且营收没有恶化';
    }

    if (
      end.memberCount ===
        baseline.memberCount &&
      revenueDelta <=
        0
    ) {
      return '本次营销暂未带来可见增长，需要检查渠道和预算';
    }
  }

  if (
    type ===
    'procurement'
  ) {
    if (
      end.inventoryAlerts <
      baseline.inventoryAlerts
    ) {
      return '补货降低了库存预警，供应保障得到改善';
    }

    if (
      end.tensionScore >
      baseline.tensionScore
    ) {
      return '补货改善有限，同时占用了较多现金';
    }
  }

  if (
    ratingDelta <
    -0.1
  ) {
    return '该决策之后评分出现回落，需要结合当日服务与产品表现复盘';
  }

  if (
    score >=
    18
  ) {
    return '该决策后的综合经营指标出现正向变化';
  }

  if (
    score <=
    -18
  ) {
    return '该决策后的综合经营指标偏弱，建议调整策略';
  }

  return '该决策目前影响有限，建议继续观察至少一个经营日';
}

function resolveDay(
  shopId,
  day,
  endSnapshotValue
) {
  const state =
    ensureShop(shopId);

  const end =
    normalizeSnapshot(
      endSnapshotValue
    );

  const currentDay =
    Math.max(
      1,
      Number(day) ||
      1
    );

  const pending =
    state.pending.filter(
      item =>
        Number(
          item.day
        ) <=
        currentDay
    );

  const keep =
    state.pending.filter(
      item =>
        Number(
          item.day
        ) >
        currentDay
    );

  const resolved = [];

  for (
    const decision
    of pending
  ) {
    const score =
      scoreImpact(
        decision.baseline,
        end
      );

    const outcome =
      outcomeFor(
        score
      );

    const row = {
      ...clone(
        decision
      ),
      status:'resolved',
      resolvedDay:
        currentDay,
      impact:{
        score,
        outcome,
        explanation:
          explanationFor(
            decision,
            end,
            score
          ),
        deltas:{
          cash:
            round(
              end.cash -
              decision
                .baseline
                .cash
            ),
          revenue:
            round(
              end.revenue -
              decision
                .baseline
                .revenue
            ),
          profit:
            round(
              end.profit -
              decision
                .baseline
                .profit
            ),
          rating:
            round(
              end.rating -
              decision
                .baseline
                .rating
            ),
          members:
            end.memberCount -
            decision
              .baseline
              .memberCount,
          inventoryAlerts:
            end.inventoryAlerts -
            decision
              .baseline
              .inventoryAlerts,
          tensionScore:
            round(
              end.tensionScore -
              decision
                .baseline
                .tensionScore
            )
        }
      }
    };

    resolved.push(
      row
    );

    state.resolved.unshift(
      row
    );

    state.metrics.resolved =
      (
        Number(
          state.metrics.resolved
        ) ||
        0
      ) +
      1;

    state.metrics[outcome] =
      (
        Number(
          state.metrics[
            outcome
          ]
        ) ||
        0
      ) +
      1;
  }

  state.pending =
    keep;

  state.resolved =
    state.resolved.slice(
      0,
      180
    );

  return resolved.map(
    clone
  );
}

function overview(
  shopId,
  limit
) {
  const state =
    ensureShop(shopId);

  return {
    version:VERSION,
    shopId:
      String(shopId),
    pending:
      state.pending
        .slice(
          -20
        )
        .reverse()
        .map(clone),
    recent:
      state.resolved
        .slice(
          0,
          Math.max(
            1,
            Math.min(
              60,
              Number(limit) ||
              20
            )
          )
        )
        .map(clone),
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
  record,
  scoreImpact,
  outcomeFor,
  explanationFor,
  resolveDay,
  overview
};
