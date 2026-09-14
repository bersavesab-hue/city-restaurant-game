'use strict';

const pack =
  require('./eventPackV0815.js');

const { SeededRng } =
  require('../foundation/rng.js');

function clone(v) {
  return JSON.parse(JSON.stringify(v));
}

function weightedPick(
  rng,
  rows
) {
  return rng.weighted(
    rows,
    row =>
      Number(row.weight || 1)
  );
}

function createState() {
  return {
    version:'0.8.15',
    active:[],
    history:[],
    cooldowns:{},
    sequence:0
  };
}

function severityFor(
  rng,
  ctx
) {
  let rows =
    pack.EVENT_SEVERITIES.map(
      x => ({...x})
    );

  if (
    Number(ctx.riskIndex || 0) >
    0.7
  ) {
    rows =
      rows.map(
        row => ({
          ...row,
          weight:
            row.id === 'major' ||
            row.id === 'extreme'
              ? row.weight * 1.8
              : row.weight
        })
      );
  }

  return weightedPick(
    rng,
    rows
  );
}

function contextWeight(
  event,
  ctx
) {
  let w = 1;

  if (
    event.domainId === 'weather' &&
    ctx.weather
  ) {
    w *= 1.8;
  }

  if (
    event.domainId === 'supply' &&
    Number(ctx.openShopCount || 0) >
    0
  ) {
    w *= 1.4;
  }

  if (
    event.domainId === 'staff' &&
    Number(ctx.openShopCount || 0) >
    0
  ) {
    w *= 1.35;
  }

  if (
    event.domainId === 'brand' &&
    Number(ctx.avgRating || 0) >= 4.2
  ) {
    w *= 1.8;
  }

  if (
    event.domainId === 'reputation' &&
    Number(ctx.reviewCount || 0) >
    10
  ) {
    w *= 1.6;
  }

  if (
    event.domainId === 'rent' &&
    Number(ctx.shopCount || 0) >
    0
  ) {
    w *= 1.3;
  }

  if (
    event.domainId === 'district' &&
    ctx.districtId
  ) {
    w *= 1.45;
  }

  return w;
}

function trigger(
  state,
  day,
  template,
  severity,
  ctx={}
) {
  state.sequence += 1;

  const item = {
    id:`event_instance_${day}_${state.sequence}`,
    templateId:template.id,
    domainId:template.domainId,
    domainName:template.domainName,
    name:template.name,
    subject:template.subject,
    situation:template.situation,
    positive:template.positive,
    severityId:severity.id,
    severityName:severity.name,
    severityFactor:severity.factor,
    phase:'warning',
    startedDay:day,
    activeDay:day + Number(template.warningDays || 1),
    endDay:
      day +
      Number(template.warningDays || 1) +
      Number(template.durationDays || 2),
    recoveryEndDay:
      day +
      Number(template.warningDays || 1) +
      Number(template.durationDays || 2) +
      1,
    districtId:ctx.districtId || null,
    shopId:ctx.shopId || null,
    baseModifiers:clone(template.baseModifiers),
    tags:(template.tags || []).slice()
  };

  state.active.push(item);
  state.cooldowns[template.id] =
    day +
    Number(template.cooldownDays || 5);

  return item;
}

function advancePhases(
  state,
  day
) {
  const ended = [];

  for (
    const event
    of state.active
  ) {
    if (
      day <
      event.activeDay
    ) {
      event.phase =
        'warning';
    } else if (
      day <
      event.endDay
    ) {
      event.phase =
        'active';
    } else if (
      day <=
      event.recoveryEndDay
    ) {
      event.phase =
        'recovery';
    } else {
      event.phase =
        'archived';

      ended.push(
        event
      );
    }
  }

  if (ended.length) {
    state.history.unshift(
      ...ended.map(
        clone
      )
    );

    state.history =
      state.history.slice(
        0,
        120
      );

    state.active =
      state.active.filter(
        item =>
          item.phase !==
          'archived'
      );
  }

  return ended;
}

function generateDaily(
  state,
  day,
  ctx={}
) {
  const rng =
    new SeededRng(
      `world-event:${ctx.seed || 'city'}:${day}`
    );

  const candidates =
    pack.EVENT_TEMPLATES
      .filter(
        item =>
          Number(
            state.cooldowns[
              item.id
            ] || 0
          ) <= day
      )
      .map(
        item => ({
          ...item,
          weight:
            contextWeight(
              item,
              ctx
            )
        })
      );

  if (!candidates.length) {
    return [];
  }

  let count = 0;
  const roll =
    rng.next();

  if (roll < 0.76) {
    count = 1;
  }

  if (roll < 0.28) {
    count = 2;
  }

  if (
    Number(ctx.riskIndex || 0) >
      0.75 &&
    rng.next() <
      0.35
  ) {
    count =
      Math.min(
        3,
        count + 1
      );
  }

  const created = [];
  const pool =
    candidates.slice();

  while (
    count >
      0 &&
    pool.length
  ) {
    const chosen =
      rng.weighted(
        pool,
        row =>
          row.weight
      );

    const index =
      pool.findIndex(
        row =>
          row.id ===
          chosen.id
      );

    if (
      index >=
      0
    ) {
      pool.splice(
        index,
        1
      );
    }

    const severity =
      severityFor(
        rng,
        ctx
      );

    created.push(
      trigger(
        state,
        day,
        chosen,
        severity,
        ctx
      )
    );

    count -= 1;
  }

  return created;
}

function phaseFactor(
  phase
) {
  const row =
    pack.EVENT_PHASES.find(
      item =>
        item.id ===
        phase
    );

  return row
    ? row.factor
    : 0;
}

function aggregateModifiers(
  state,
  filter={}
) {
  const out = {
    demandMultiplier:1,
    supplyCostMultiplier:1,
    laborCostMultiplier:1,
    rentCostMultiplier:1,
    utilityCostMultiplier:1,
    platformCostMultiplier:1,
    complianceCostMultiplier:1,
    capacityMultiplier:1,
    deliveryDemandMultiplier:1,
    marketingEfficiencyMultiplier:1,
    reputationMultiplier:1,
    inspectionRisk:0
  };

  for (
    const event
    of state.active || []
  ) {
    if (
      filter.districtId &&
      event.districtId &&
      event.districtId !==
        filter.districtId
    ) {
      continue;
    }

    if (
      filter.shopId &&
      event.shopId &&
      event.shopId !==
        filter.shopId
    ) {
      continue;
    }

    const factor =
      phaseFactor(
        event.phase
      ) *
      Number(
        event.severityFactor || 1
      );

    const adverseHighKeys =
      new Set([
        'supplyCostMultiplier',
        'laborCostMultiplier',
        'rentCostMultiplier',
        'utilityCostMultiplier',
        'platformCostMultiplier',
        'complianceCostMultiplier'
      ]);

    for (
      const [key, raw]
      of Object.entries(
        event.baseModifiers ||
        {}
      )
    ) {
      const amount =
        Number(raw || 0) *
        factor;

      if (
        key ===
        'inspectionRisk'
      ) {
        out.inspectionRisk +=
          event.positive
            ? -amount
            : amount;

        continue;
      }

      if (
        out[key] !=
        null
      ) {
        const delta =
          adverseHighKeys.has(
            key
          )
            ? (
                event.positive
                  ? -amount
                  : amount
              )
            : (
                event.positive
                  ? amount
                  : -amount
              );

        out[key] *=
          1 +
          delta;
      }
    }
  }

  out.inspectionRisk =
    Math.max(
      0,
      Math.min(
        1,
        out.inspectionRisk
      )
    );

  return out;
}

function tick(
  state,
  day,
  ctx={}
) {
  advancePhases(
    state,
    day
  );

  const created =
    generateDaily(
      state,
      day,
      ctx
    );

  return {
    created,
    active:
      state.active,
    modifiers:
      aggregateModifiers(
        state,
        ctx
      )
  };
}

module.exports = {
  createState,
  trigger,
  advancePhases,
  generateDaily,
  aggregateModifiers,
  tick
};
