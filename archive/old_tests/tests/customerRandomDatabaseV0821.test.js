'use strict';

const assert =
  require('assert');

const database =
  require('../src/customer/customerRandomDatabaseV0821.js');

const validation =
  database.validate();

assert.ok(
  validation.ok,
  validation.issues.join('; ')
);

const stats =
  validation.stats;

assert.equal(
  stats.segments,
  64
);

assert.equal(
  stats.incomeBands,
  8
);

assert.equal(
  stats.householdTypes,
  12
);

assert.equal(
  stats.occupations,
  24
);

assert.equal(
  stats.diningMotives,
  24
);

assert.equal(
  stats.tasteProfiles,
  24
);

assert.equal(
  stats.channelHabits,
  18
);

assert.equal(
  stats.timePatterns,
  16
);

assert.equal(
  stats.decisionBiases,
  20
);

assert.equal(
  stats.reviewStyles,
  16
);

assert.equal(
  stats.priceSensitivityProfiles,
  12
);

assert.equal(
  stats.queueProfiles,
  12
);

assert.equal(
  stats.loyaltyProfiles,
  12
);

assert.equal(
  stats.socialInfluenceTypes,
  20
);

assert.equal(
  stats.complaintTriggers,
  32
);

assert.equal(
  stats.delightTriggers,
  32
);

assert.equal(
  stats.partyPurposes,
  16
);

assert.equal(
  stats.dietaryPreferences,
  18
);

assert.equal(
  stats.districtMixes,
  8
);

assert.equal(
  stats.mealBudgetPeriods,
  9
);

assert.equal(
  stats
    .theoreticalSingleChoiceCombinations,
  '79779916318980125491200'
);

const legacy = {
  id:'cust_legacy_001',
  segmentId:'student_budget',
  incomeBandId:'low',
  householdTypeId:'single',
  occupationId:'occupation_2',
  motiveIds:['motive_2'],
  tasteIds:['taste_2'],
  channelHabitId:'channel_1',
  timePatternId:'time_4',
  decisionBiasIds:['bias_1'],
  reviewStyleId:'review_4',
  socialInfluenceId:'social_7',
  dietaryPreferenceId:'diet_1',
  traits:{
    priceSensitivity:88,
    qualitySensitivity:54,
    distanceSensitivity:72,
    queueTolerance:42,
    noveltySeeking:76,
    loyalty:34,
    socialInfluence:82,
    reviewPropensity:58,
    deliveryAffinity:70
  },
  memory:{
    historicalPrice:18,
    lastPaidPrice:20,
    visitedStores:{
      shop_a:{
        visits:3,
        avgSatisfaction:84,
        lastVisitDay:12
      }
    },
    favoriteStoreIds:[
      'shop_a'
    ],
    dislikedStoreIds:[]
  }
};

const first =
  database
    .normalizeProfile(
      legacy
    );

const second =
  database
    .normalizeProfile(
      legacy
    );

assert.deepEqual(
  first.randomProfile,
  second.randomProfile,
  '同一旧顾客必须稳定补全为同一随机特征'
);

assert.equal(
  first.randomProfile.version,
  '0.8.21'
);

assert.equal(
  first
    .randomProfile
    .complaintTriggerIds
    .length,
  3
);

assert.equal(
  first
    .randomProfile
    .delightTriggerIds
    .length,
  3
);

assert.equal(
  first
    .randomProfile
    .partyPurposeIds
    .length,
  2
);

assert.equal(
  first.memory.historicalPrice,
  18
);

assert.equal(
  first
    .memory
    .visitedStores
    .shop_a
    .visits,
  3
);

const resolved =
  database
    .resolvedProfile(
      first
    );

assert.equal(
  resolved.metrics.visits,
  3
);

assert.equal(
  resolved.metrics.returning,
  true
);

assert.equal(
  resolved.metrics.favoriteStoreCount,
  1
);

assert.ok(
  resolved.segment
);

assert.ok(
  resolved.queueProfile
);

assert.ok(
  resolved.loyaltyProfile
);

assert.ok(
  resolved
    .complaintTriggers
    .length ===
  3
);

const aggregate =
  database
    .aggregateProfiles({
      [first.id]:
        first
    });

assert.equal(
  aggregate.customerCount,
  1
);

assert.equal(
  aggregate.returningCustomers,
  1
);

assert.equal(
  aggregate.totalRecordedVisits,
  3
);

assert.equal(
  aggregate.averageRecordedSatisfaction,
  84
);

console.log(
  'V0.8.21 customer random database tests passed'
);
