'use strict';

const pack =
  require('./customerPackV10.js');

const rules =
  require('./customerRulesV10.js');

const { SeededRng } =
  require('../foundation/rng.js');

const VERSION =
  '0.8.21';

const DIMENSIONS =
  Object.freeze({
    segments:
      pack.SEGMENTS,
    incomeBands:
      pack.INCOME_BANDS,
    householdTypes:
      pack.HOUSEHOLD_TYPES,
    occupations:
      pack.OCCUPATIONS,
    diningMotives:
      pack.DINING_MOTIVES,
    tasteProfiles:
      pack.TASTE_PROFILES,
    channelHabits:
      pack.CHANNEL_HABITS,
    timePatterns:
      pack.TIME_PATTERNS,
    decisionBiases:
      pack.DECISION_BIASES,
    reviewStyles:
      pack.REVIEW_STYLES,
    priceSensitivityProfiles:
      pack.PRICE_SENSITIVITY_PROFILES,
    queueProfiles:
      pack.QUEUE_PROFILES,
    loyaltyProfiles:
      pack.LOYALTY_PROFILES,
    socialInfluenceTypes:
      pack.SOCIAL_INFLUENCE_TYPES,
    complaintTriggers:
      pack.COMPLAINT_TRIGGERS,
    delightTriggers:
      pack.DELIGHT_TRIGGERS,
    partyPurposes:
      pack.PARTY_PURPOSES,
    dietaryPreferences:
      pack.DIETARY_PREFERENCES
  });

const EXPECTED_COUNTS =
  Object.freeze({
    segments:64,
    incomeBands:8,
    householdTypes:12,
    occupations:24,
    diningMotives:24,
    tasteProfiles:24,
    channelHabits:18,
    timePatterns:16,
    decisionBiases:20,
    reviewStyles:16,
    priceSensitivityProfiles:12,
    queueProfiles:12,
    loyaltyProfiles:12,
    socialInfluenceTypes:20,
    complaintTriggers:32,
    delightTriggers:32,
    partyPurposes:16,
    dietaryPreferences:18,
    districtMixes:8,
    mealBudgetPeriods:9
  });

const THEORETICAL_SINGLE_CHOICE_COMBINATIONS =
  '79779916318980125491200';

function clone(value) {
  if (value === undefined) {
    return undefined;
  }

  return JSON.parse(
    JSON.stringify(value)
  );
}

function byId(
  list,
  id
) {
  return (
    (list || [])
      .find(
        item =>
          item.id === id
      ) ||
    null
  );
}

function uniqueIds(
  rng,
  list,
  count
) {
  const pool =
    (list || [])
      .slice();

  const out = [];

  while (
    pool.length &&
    out.length <
      count
  ) {
    const index =
      rules.rngInt(
        rng,
        0,
        pool.length - 1
      );

    const item =
      pool.splice(
        index,
        1
      )[0];

    if (
      item &&
      item.id
    ) {
      out.push(
        item.id
      );
    }
  }

  return out;
}

function seedForProfile(
  profile
) {
  return [
    VERSION,
    profile &&
    profile.id ||
    'anonymous',
    profile &&
    profile.segmentId ||
    'segment',
    profile &&
    profile.incomeBandId ||
    'income',
    profile &&
    profile.householdTypeId ||
    'household'
  ].join(':');
}

function segmentFor(
  profile
) {
  return (
    byId(
      pack.SEGMENTS,
      profile &&
      profile.segmentId
    ) ||
    pack.SEGMENTS[0]
  );
}

function incomeFor(
  profile
) {
  return (
    byId(
      pack.INCOME_BANDS,
      profile &&
      profile.incomeBandId
    ) ||
    pack.INCOME_BANDS[3] ||
    pack.INCOME_BANDS[0]
  );
}

function profileMetrics(
  profile
) {
  const memory =
    profile &&
    profile.memory &&
    typeof profile.memory ===
      'object'
      ? profile.memory
      : {};

  const visited =
    memory.visitedStores &&
    typeof memory.visitedStores ===
      'object'
      ? Object.values(
          memory.visitedStores
        )
      : [];

  let visits =
    0;

  let weightedSatisfaction =
    0;

  for (
    const row
    of visited
  ) {
    const count =
      Math.max(
        0,
        Number(
          row &&
          row.visits
        ) ||
        0
      );

    visits +=
      count;

    weightedSatisfaction +=
      count *
      (
        Number(
          row &&
          row.avgSatisfaction
        ) ||
        0
      );
  }

  const favoriteStoreIds =
    Array.isArray(
      memory.favoriteStoreIds
    )
      ? memory.favoriteStoreIds
      : [];

  const dislikedStoreIds =
    Array.isArray(
      memory.dislikedStoreIds
    )
      ? memory.dislikedStoreIds
      : [];

  return {
    visits,
    returning:
      visits >= 2,
    avgSatisfaction:
      visits >
      0
        ? Number(
            (
              weightedSatisfaction /
              visits
            ).toFixed(
              1
            )
          )
        : null,
    favoriteStoreCount:
      favoriteStoreIds.length,
    dislikedStoreCount:
      dislikedStoreIds.length,
    lastPaidPrice:
      memory.lastPaidPrice ==
        null
        ? null
        : Number(
            memory.lastPaidPrice
          ),
    historicalPrice:
      memory.historicalPrice ==
        null
        ? null
        : Number(
            memory.historicalPrice
          )
  };
}

function derivedTraits(
  profile
) {
  const segment =
    segmentFor(
      profile
    );

  const income =
    incomeFor(
      profile
    );

  const queueMinutes =
    rules
      .queueToleranceMinutes(
        segment,
        {}
      );

  const budgetPower =
    Number(
      (
        (
          Number(
            segment.budgetIndex
          ) ||
          1
        ) *
        (
          Number(
            income.budgetMultiplier
          ) ||
          1
        )
      ).toFixed(
        2
      )
    );

  return {
    budgetPower,
    queueToleranceMinutes:
      Number(
        queueMinutes
      ) ||
      0,
    reviewTendency:
      Number(
        segment.reviewPropensity
      ) ||
      0,
    repeatTendency:
      Number(
        segment.loyalty
      ) ||
      0,
    noveltyTendency:
      Number(
        segment.noveltySeeking
      ) ||
      0,
    deliveryTendency:
      Number(
        segment.deliveryAffinity
      ) ||
      0,
    socialInfluence:
      Number(
        segment.socialInfluence
      ) ||
      0
  };
}

function normalizeMemory(
  profile
) {
  profile.memory =
    profile.memory &&
    typeof profile.memory ===
      'object'
      ? profile.memory
      : {};

  const memory =
    profile.memory;

  if (
    memory.historicalPrice ===
    undefined
  ) {
    memory.historicalPrice =
      null;
  }

  if (
    memory.lastPaidPrice ===
    undefined
  ) {
    memory.lastPaidPrice =
      null;
  }

  memory.visitedStores =
    memory.visitedStores &&
    typeof memory.visitedStores ===
      'object'
      ? memory.visitedStores
      : {};

  memory.favoriteStoreIds =
    Array.isArray(
      memory.favoriteStoreIds
    )
      ? memory.favoriteStoreIds
      : [];

  memory.dislikedStoreIds =
    Array.isArray(
      memory.dislikedStoreIds
    )
      ? memory.dislikedStoreIds
      : [];

  return memory;
}

function normalizeProfile(
  input
) {
  if (
    !input ||
    typeof input !==
      'object'
  ) {
    return null;
  }

  const profile =
    clone(
      input
    );

  normalizeMemory(
    profile
  );

  const rng =
    new SeededRng(
      seedForProfile(
        profile
      )
    );

  const randomProfile =
    profile.randomProfile &&
    typeof profile.randomProfile ===
      'object'
      ? profile.randomProfile
      : {};

  randomProfile.version =
    VERSION;

  randomProfile.priceSensitivityProfileId =
    randomProfile
      .priceSensitivityProfileId ||
    (
      byId(
        pack.PRICE_SENSITIVITY_PROFILES,
        profile.priceSensitivityProfileId
      )
        ? profile
            .priceSensitivityProfileId
        : uniqueIds(
            rng,
            pack.PRICE_SENSITIVITY_PROFILES,
            1
          )[0]
    );

  randomProfile.queueProfileId =
    randomProfile
      .queueProfileId ||
    uniqueIds(
      rng,
      pack.QUEUE_PROFILES,
      1
    )[0];

  randomProfile.loyaltyProfileId =
    randomProfile
      .loyaltyProfileId ||
    uniqueIds(
      rng,
      pack.LOYALTY_PROFILES,
      1
    )[0];

  randomProfile.partyPurposeIds =
    Array.isArray(
      randomProfile.partyPurposeIds
    ) &&
    randomProfile.partyPurposeIds.length
      ? randomProfile.partyPurposeIds
      : uniqueIds(
          rng,
          pack.PARTY_PURPOSES,
          2
        );

  randomProfile.complaintTriggerIds =
    Array.isArray(
      randomProfile.complaintTriggerIds
    ) &&
    randomProfile
      .complaintTriggerIds
      .length
      ? randomProfile
          .complaintTriggerIds
      : uniqueIds(
          rng,
          pack.COMPLAINT_TRIGGERS,
          3
        );

  randomProfile.delightTriggerIds =
    Array.isArray(
      randomProfile.delightTriggerIds
    ) &&
    randomProfile
      .delightTriggerIds
      .length
      ? randomProfile
          .delightTriggerIds
      : uniqueIds(
          rng,
          pack.DELIGHT_TRIGGERS,
          3
        );

  randomProfile.generationSeed =
    randomProfile
      .generationSeed ||
    seedForProfile(
      profile
    );

  randomProfile.derivedTraits =
    derivedTraits(
      profile
    );

  profile.randomProfile =
    randomProfile;

  return profile;
}

function normalizeCustomerMap(
  customers
) {
  const source =
    customers &&
    typeof customers ===
      'object'
      ? customers
      : {};

  const out = {};

  for (
    const [
      id,
      profile
    ]
    of Object.entries(
      source
    )
  ) {
    const normalized =
      normalizeProfile(
        profile
      );

    if (normalized) {
      out[id] =
        normalized;
    }
  }

  return out;
}

function resolvedProfile(
  profile
) {
  const normalized =
    normalizeProfile(
      profile
    );

  if (!normalized) {
    return null;
  }

  const randomProfile =
    normalized
      .randomProfile;

  const resolveMany =
    (
      list,
      ids
    ) =>
      (
        ids ||
        []
      )
        .map(
          id =>
            byId(
              list,
              id
            )
        )
        .filter(Boolean)
        .map(clone);

  return {
    ...normalized,
    segment:
      clone(
        segmentFor(
          normalized
        )
      ),
    incomeBand:
      clone(
        incomeFor(
          normalized
        )
      ),
    householdType:
      clone(
        byId(
          pack.HOUSEHOLD_TYPES,
          normalized.householdTypeId
        )
      ),
    occupation:
      clone(
        byId(
          pack.OCCUPATIONS,
          normalized.occupationId
        )
      ),
    motives:
      resolveMany(
        pack.DINING_MOTIVES,
        normalized.motiveIds
      ),
    tastes:
      resolveMany(
        pack.TASTE_PROFILES,
        normalized.tasteIds
      ),
    channelHabit:
      clone(
        byId(
          pack.CHANNEL_HABITS,
          normalized.channelHabitId
        )
      ),
    timePattern:
      clone(
        byId(
          pack.TIME_PATTERNS,
          normalized.timePatternId
        )
      ),
    decisionBiases:
      resolveMany(
        pack.DECISION_BIASES,
        normalized.decisionBiasIds
      ),
    reviewStyle:
      clone(
        byId(
          pack.REVIEW_STYLES,
          normalized.reviewStyleId
        )
      ),
    socialInfluenceType:
      clone(
        byId(
          pack.SOCIAL_INFLUENCE_TYPES,
          normalized.socialInfluenceId
        )
      ),
    dietaryPreference:
      clone(
        byId(
          pack.DIETARY_PREFERENCES,
          normalized.dietaryPreferenceId
        )
      ),
    priceSensitivityProfile:
      clone(
        byId(
          pack.PRICE_SENSITIVITY_PROFILES,
          randomProfile
            .priceSensitivityProfileId
        )
      ),
    queueProfile:
      clone(
        byId(
          pack.QUEUE_PROFILES,
          randomProfile
            .queueProfileId
        )
      ),
    loyaltyProfile:
      clone(
        byId(
          pack.LOYALTY_PROFILES,
          randomProfile
            .loyaltyProfileId
        )
      ),
    partyPurposes:
      resolveMany(
        pack.PARTY_PURPOSES,
        randomProfile
          .partyPurposeIds
      ),
    complaintTriggers:
      resolveMany(
        pack.COMPLAINT_TRIGGERS,
        randomProfile
          .complaintTriggerIds
      ),
    delightTriggers:
      resolveMany(
        pack.DELIGHT_TRIGGERS,
        randomProfile
          .delightTriggerIds
      ),
    metrics:
      profileMetrics(
        normalized
      )
  };
}

function queryProfiles(
  customers,
  filters
) {
  const f =
    filters ||
    {};

  return Object
    .values(
      normalizeCustomerMap(
        customers
      )
    )
    .map(
      resolvedProfile
    )
    .filter(Boolean)
    .filter(
      profile => {
        const metrics =
          profile.metrics;

        return (
          (
            !f.segmentId ||
            profile.segmentId ===
              f.segmentId
          ) &&
          (
            !f.incomeBandId ||
            profile.incomeBandId ===
              f.incomeBandId
          ) &&
          (
            !f.channelHabitId ||
            profile.channelHabitId ===
              f.channelHabitId
          ) &&
          (
            !f.timePatternId ||
            profile.timePatternId ===
              f.timePatternId
          ) &&
          (
            f.returning == null ||
            metrics.returning ===
              !!f.returning
          ) &&
          (
            f.minVisits == null ||
            metrics.visits >=
              Number(
                f.minVisits
              )
          ) &&
          (
            f.favoriteOnly !==
              true ||
            metrics.favoriteStoreCount >
              0
          )
        );
      }
    );
}

function increment(
  target,
  key,
  amount
) {
  if (!key) {
    return;
  }

  target[key] =
    (
      target[key] ||
      0
    ) +
    (
      amount == null
        ? 1
        : amount
    );
}

function aggregateProfiles(
  customers
) {
  const rows =
    queryProfiles(
      customers,
      {}
    );

  const result = {
    databaseVersion:
      VERSION,
    customerCount:
      rows.length,
    returningCustomers:0,
    totalRecordedVisits:0,
    averageRecordedSatisfaction:null,
    favoriteCustomers:0,
    segments:{},
    incomeBands:{},
    channelHabits:{},
    timePatterns:{},
    reviewStyles:{},
    dietaryPreferences:{},
    averages:{
      priceSensitivity:0,
      qualitySensitivity:0,
      queueTolerance:0,
      loyalty:0,
      noveltySeeking:0,
      reviewPropensity:0,
      deliveryAffinity:0
    }
  };

  let satisfactionTotal =
    0;

  let satisfactionWeight =
    0;

  for (
    const profile
    of rows
  ) {
    const metrics =
      profile.metrics;

    increment(
      result.segments,
      profile.segmentId
    );

    increment(
      result.incomeBands,
      profile.incomeBandId
    );

    increment(
      result.channelHabits,
      profile.channelHabitId
    );

    increment(
      result.timePatterns,
      profile.timePatternId
    );

    increment(
      result.reviewStyles,
      profile.reviewStyleId
    );

    increment(
      result.dietaryPreferences,
      profile.dietaryPreferenceId
    );

    if (
      metrics.returning
    ) {
      result.returningCustomers +=
        1;
    }

    if (
      metrics.favoriteStoreCount >
      0
    ) {
      result.favoriteCustomers +=
        1;
    }

    result.totalRecordedVisits +=
      metrics.visits;

    if (
      metrics.avgSatisfaction !=
      null &&
      metrics.visits >
      0
    ) {
      satisfactionTotal +=
        metrics
          .avgSatisfaction *
        metrics.visits;

      satisfactionWeight +=
        metrics.visits;
    }

    const traits =
      profile.traits ||
      {};

    for (
      const key
      of Object.keys(
        result.averages
      )
    ) {
      result.averages[
        key
      ] +=
        Number(
          traits[
            key
          ]
        ) ||
        0;
    }
  }

  if (
    satisfactionWeight >
    0
  ) {
    result.averageRecordedSatisfaction =
      Number(
        (
          satisfactionTotal /
          satisfactionWeight
        ).toFixed(
          1
        )
      );
  }

  const divisor =
    Math.max(
      1,
      rows.length
    );

  for (
    const key
    of Object.keys(
      result.averages
    )
  ) {
    result.averages[
      key
    ] =
      Number(
        (
          result
            .averages[
              key
            ] /
          divisor
        ).toFixed(
          1
        )
      );
  }

  return result;
}

function getStats() {
  return {
    version:VERSION,
    segments:
      pack.SEGMENTS.length,
    incomeBands:
      pack.INCOME_BANDS.length,
    householdTypes:
      pack.HOUSEHOLD_TYPES.length,
    occupations:
      pack.OCCUPATIONS.length,
    diningMotives:
      pack.DINING_MOTIVES.length,
    tasteProfiles:
      pack.TASTE_PROFILES.length,
    channelHabits:
      pack.CHANNEL_HABITS.length,
    timePatterns:
      pack.TIME_PATTERNS.length,
    decisionBiases:
      pack.DECISION_BIASES.length,
    reviewStyles:
      pack.REVIEW_STYLES.length,
    priceSensitivityProfiles:
      pack
        .PRICE_SENSITIVITY_PROFILES
        .length,
    queueProfiles:
      pack.QUEUE_PROFILES.length,
    loyaltyProfiles:
      pack.LOYALTY_PROFILES.length,
    socialInfluenceTypes:
      pack.SOCIAL_INFLUENCE_TYPES.length,
    complaintTriggers:
      pack.COMPLAINT_TRIGGERS.length,
    delightTriggers:
      pack.DELIGHT_TRIGGERS.length,
    partyPurposes:
      pack.PARTY_PURPOSES.length,
    dietaryPreferences:
      pack.DIETARY_PREFERENCES.length,
    districtMixes:
      Object.keys(
        pack.DISTRICT_MIXES
      ).length,
    mealBudgetPeriods:
      Object.keys(
        pack.MEAL_BUDGET_BASE
      ).length,
    theoreticalSingleChoiceCombinations:
      THEORETICAL_SINGLE_CHOICE_COMBINATIONS
  };
}

function validate() {
  const issues = [];

  for (
    const [
      key,
      list
    ]
    of Object.entries(
      DIMENSIONS
    )
  ) {
    const ids =
      list.map(
        item =>
          item.id
      );

    if (
      new Set(
        ids
      ).size !==
      ids.length
    ) {
      issues.push(
        key +
        ' ID存在重复'
      );
    }
  }

  const stats =
    getStats();

  for (
    const [
      key,
      expected
    ]
    of Object.entries(
      EXPECTED_COUNTS
    )
  ) {
    if (
      stats[
        key
      ] !==
      expected
    ) {
      issues.push(
        key +
        ' 数量异常，期望=' +
        expected +
        ' 实际=' +
        stats[
          key
        ]
      );
    }
  }

  for (
    const [
      districtId,
      mix
    ]
    of Object.entries(
      pack.DISTRICT_MIXES
    )
  ) {
    for (
      const segmentId
      of Object.keys(
        mix
      )
    ) {
      if (
        !byId(
          pack.SEGMENTS,
          segmentId
        )
      ) {
        issues.push(
          districtId +
          ' 引用不存在消费人群 ' +
          segmentId
        );
      }
    }
  }

  return {
    ok:
      issues.length ===
      0,
    issues,
    stats
  };
}

module.exports = {
  VERSION,
  DIMENSIONS,
  EXPECTED_COUNTS,
  THEORETICAL_SINGLE_CHOICE_COMBINATIONS,
  seedForProfile,
  profileMetrics,
  derivedTraits,
  normalizeProfile,
  normalizeCustomerMap,
  resolvedProfile,
  queryProfiles,
  aggregateProfiles,
  getStats,
  validate
};
