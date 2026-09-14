'use strict';

const pack =
  require('./policyPackV0815.js');

const { SeededRng } =
  require('../foundation/rng.js');

function clone(v) {
  return JSON.parse(JSON.stringify(v));
}

function createState() {
  return {
    version:'0.8.15',
    active:[],
    history:[],
    sequence:0,
    nextProposalDay:null
  };
}

function scheduleNext(
  state,
  day,
  rng
) {
  state.nextProposalDay =
    day +
    rng.int(
      5,
      11
    );
}

function propose(
  state,
  day,
  template,
  ctx={}
) {
  state.sequence += 1;

  const item = {
    id:`policy_instance_${day}_${state.sequence}`,
    templateId:template.id,
    domainId:template.domainId,
    domainName:template.domainName,
    name:template.name,
    supportive:template.supportive,
    stage:'draft',
    proposedDay:day,
    announcedDay:
      day +
      Number(template.draftDays || 2),
    activeDay:
      day +
      Number(template.draftDays || 2) +
      Number(template.announcedDays || 2),
    reviewDay:
      day +
      Number(template.draftDays || 2) +
      Number(template.announcedDays || 2) +
      Number(template.activeDays || 24),
    expireDay:
      day +
      Number(template.draftDays || 2) +
      Number(template.announcedDays || 2) +
      Number(template.activeDays || 24) +
      Number(template.reviewDays || 2),
    modifiers:clone(template.modifiers),
    districtId:
      ctx.districtId ||
      null,
    source:'云州市经营环境办公室'
  };

  state.active.push(item);

  return item;
}

function advanceStages(
  state,
  day
) {
  const changed = [];
  const expired = [];

  for (
    const item
    of state.active
  ) {
    const old =
      item.stage;

    if (
      day <
      item.announcedDay
    ) {
      item.stage =
        'draft';
    } else if (
      day <
      item.activeDay
    ) {
      item.stage =
        'announced';
    } else if (
      day <
      item.reviewDay
    ) {
      item.stage =
        'active';
    } else if (
      day <
      item.expireDay
    ) {
      item.stage =
        'review';
    } else {
      item.stage =
        'expired';
    }

    if (
      item.stage !==
      old
    ) {
      changed.push({
        item,
        from:old,
        to:item.stage
      });
    }

    if (
      item.stage ===
      'expired'
    ) {
      expired.push(item);
    }
  }

  if (expired.length) {
    state.history.unshift(
      ...expired.map(clone)
    );

    state.history =
      state.history.slice(
        0,
        100
      );

    state.active =
      state.active.filter(
        item =>
          item.stage !==
          'expired'
      );
  }

  return {
    changed,
    expired
  };
}

function maybePropose(
  state,
  day,
  ctx={}
) {
  const rng =
    new SeededRng(
      `policy:${ctx.seed || 'city'}:${day}`
    );

  if (
    state.nextProposalDay ==
    null
  ) {
    state.nextProposalDay =
      day;
  }

  if (
    day <
    state.nextProposalDay
  ) {
    return null;
  }

  const activeDomains =
    new Set(
      state.active.map(
        item =>
          item.domainId
      )
    );

  let candidates =
    pack.POLICY_TEMPLATES.filter(
      item =>
        !activeDomains.has(
          item.domainId
        )
    );

  if (!candidates.length) {
    candidates =
      pack.POLICY_TEMPLATES.slice();
  }

  const chosen =
    rng.pick(
      candidates
    );

  if (!chosen) {
    scheduleNext(
      state,
      day,
      rng
    );

    return null;
  }

  const item =
    propose(
      state,
      day,
      chosen,
      ctx
    );

  scheduleNext(
    state,
    day,
    rng
  );

  return item;
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
    nightDemandMultiplier:1,
    reputationMultiplier:1,
    inspectionRisk:0
  };

  for (
    const item
    of state.active || []
  ) {
    if (
      item.stage !==
      'active'
    ) {
      continue;
    }

    if (
      filter.districtId &&
      item.districtId &&
      item.districtId !==
        filter.districtId
    ) {
      continue;
    }

    for (
      const [key, value]
      of Object.entries(
        item.modifiers ||
        {}
      )
    ) {
      const amount =
        Number(value || 0);

      if (
        key ===
        'inspectionRisk'
      ) {
        out.inspectionRisk +=
          amount;

        continue;
      }

      if (
        out[key] !=
        null
      ) {
        out[key] *=
          1 +
          amount;
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
  const stages =
    advanceStages(
      state,
      day
    );

  const proposed =
    maybePropose(
      state,
      day,
      ctx
    );

  return {
    proposed,
    stages,
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
  propose,
  advanceStages,
  maybePropose,
  aggregateModifiers,
  tick
};
