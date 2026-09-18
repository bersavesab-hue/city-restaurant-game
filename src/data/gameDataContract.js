'use strict';

const registry = require('./dataDomainRegistry.js');

const domains = Object.freeze(
  registry.domains.reduce((acc, domain) => {
    acc[domain.id] = Object.freeze({
      kind: domain.kind,
      schemaVersion: domain.schemaVersion,
      idPrefix: domain.idPrefix,
      canonicalPath: domain.canonicalPath,
      sourceState: domain.sourceState,
      dependsOn: Object.freeze(domain.dependsOn.slice())
    });
    return acc;
  }, {})
);

module.exports = Object.freeze({
  version: 2,
  compatibilityVersion: 1,

  // Legacy contract keys retained until runtime consumers are migrated.
  player: Object.freeze({}),
  restaurant: Object.freeze({}),
  food: Object.freeze({}),
  staff: Object.freeze({}),
  finance: Object.freeze({}),
  rating: Object.freeze({}),

  semantics: Object.freeze({
    level: Object.freeze({
      purpose: 'growth_progress',
      examples: Object.freeze(['storeLevel', 'careerStage', 'masteryLevel'])
    }),
    quality: Object.freeze({
      purpose: 'same_type_actual_quality',
      examples: Object.freeze(['ingredientBatchQuality', 'outputQuality'])
    }),
    tier: Object.freeze({
      purpose: 'capability_or_specification_band',
      examples: Object.freeze(['equipmentTier', 'supplierCapabilityTier', 'propertyTier'])
    }),
    type: Object.freeze({
      purpose: 'non_hierarchical_classification',
      examples: Object.freeze(['districtType', 'restaurantFormat', 'restaurantPosition'])
    })
  }),

  dishProgression: Object.freeze({
    rank: Object.freeze(['家常', '优选', '招牌', '名菜', '镇店']),
    mastery: Object.freeze(['生疏', '熟练', '精通', '拿手', '炉火纯青']),
    outputGrade: Object.freeze(['C', 'B', 'A', 'S']),
    internalQualityScore: Object.freeze({ min: 0, max: 100 })
  }),

  ingredientPolicy: Object.freeze({
    intrinsicPermanentQuality: false,
    batchQualityScale: Object.freeze([1, 2, 3, 4, 5]),
    qualityComesFrom: Object.freeze([
      'supplier',
      'origin',
      'batch',
      'freshness',
      'storage'
    ])
  }),

  domains
});
