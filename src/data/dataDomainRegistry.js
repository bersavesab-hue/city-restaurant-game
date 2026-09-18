'use strict';

const DOMAIN_KIND = Object.freeze({
  CONTENT: 'content',
  RULE: 'rule'
});

const SOURCE_STATE = Object.freeze({
  LEGACY: 'legacy',
  PLANNED: 'planned',
  ACTIVE: 'active'
});

const domains = [
  {
    id: 'ingredients',
    kind: DOMAIN_KIND.CONTENT,
    schemaVersion: 1,
    idPrefix: 'ing_',
    canonicalPath: 'src/data/content/ingredients.json',
    legacySources: ['src/data/ingredients.json'],
    sourceState: SOURCE_STATE.LEGACY,
    dependsOn: []
  },
  {
    id: 'dishes',
    kind: DOMAIN_KIND.CONTENT,
    schemaVersion: 1,
    idPrefix: 'dish_',
    canonicalPath: 'src/data/content/dishes.json',
    legacySources: ['src/data/database/foods.json'],
    sourceState: SOURCE_STATE.LEGACY,
    dependsOn: []
  },
  {
    id: 'recipes',
    kind: DOMAIN_KIND.CONTENT,
    schemaVersion: 1,
    idPrefix: 'recipe_',
    canonicalPath: 'src/data/content/recipes.json',
    legacySources: ['src/data/recipes.json', 'src/data/recipes_expansion_001.json', 'src/data/recipes_expansion_002.json'],
    sourceState: SOURCE_STATE.LEGACY,
    dependsOn: ['ingredients', 'dishes', 'cookingMethods', 'equipment']
  },
  {
    id: 'cookingMethods',
    kind: DOMAIN_KIND.CONTENT,
    schemaVersion: 1,
    idPrefix: 'cook_',
    canonicalPath: 'src/data/content/cooking-methods.json',
    legacySources: [],
    sourceState: SOURCE_STATE.PLANNED,
    dependsOn: []
  },
  {
    id: 'suppliers',
    kind: DOMAIN_KIND.CONTENT,
    schemaVersion: 1,
    idPrefix: 'supplier_',
    canonicalPath: 'src/data/content/suppliers.json',
    legacySources: [],
    sourceState: SOURCE_STATE.PLANNED,
    dependsOn: ['ingredients']
  },
  {
    id: 'equipment',
    kind: DOMAIN_KIND.CONTENT,
    schemaVersion: 1,
    idPrefix: 'equip_',
    canonicalPath: 'src/data/content/equipment.json',
    legacySources: [],
    sourceState: SOURCE_STATE.PLANNED,
    dependsOn: ['cookingMethods']
  },
  {
    id: 'decorations',
    kind: DOMAIN_KIND.CONTENT,
    schemaVersion: 1,
    idPrefix: 'decor_',
    canonicalPath: 'src/data/content/decorations.json',
    legacySources: ['data/decoration'],
    sourceState: SOURCE_STATE.LEGACY,
    dependsOn: []
  },
  {
    id: 'decorationTemplates',
    kind: DOMAIN_KIND.CONTENT,
    schemaVersion: 1,
    idPrefix: 'dectpl_',
    canonicalPath: 'src/data/content/decoration-templates.json',
    legacySources: [],
    sourceState: SOURCE_STATE.PLANNED,
    dependsOn: ['decorations', 'restaurantFormats']
  },
  {
    id: 'employeeGeneration',
    kind: DOMAIN_KIND.CONTENT,
    schemaVersion: 1,
    idPrefix: 'stafftpl_',
    canonicalPath: 'src/data/content/employee-generation.json',
    legacySources: ['src/data/database/staffs.json', 'src/data/employeeSystemConfig.js'],
    sourceState: SOURCE_STATE.LEGACY,
    dependsOn: ['employeeCareerTraining']
  },
  {
    id: 'employeeCareerTraining',
    kind: DOMAIN_KIND.CONTENT,
    schemaVersion: 1,
    idPrefix: 'training_',
    canonicalPath: 'src/data/content/employee-career-training.json',
    legacySources: ['src/data/employeeSystemConfig.js'],
    sourceState: SOURCE_STATE.LEGACY,
    dependsOn: []
  },
  {
    id: 'customerSegments',
    kind: DOMAIN_KIND.CONTENT,
    schemaVersion: 1,
    idPrefix: 'customerseg_',
    canonicalPath: 'src/data/content/customer-segments.json',
    legacySources: ['src/customer/customerPackV10.js', 'src/customer/customerRandomDatabaseV0821.js'],
    sourceState: SOURCE_STATE.LEGACY,
    dependsOn: ['districts']
  },
  {
    id: 'districts',
    kind: DOMAIN_KIND.CONTENT,
    schemaVersion: 1,
    idPrefix: 'district_',
    canonicalPath: 'src/data/content/districts.json',
    legacySources: [],
    sourceState: SOURCE_STATE.PLANNED,
    dependsOn: []
  },
  {
    id: 'restaurantFormats',
    kind: DOMAIN_KIND.CONTENT,
    schemaVersion: 1,
    idPrefix: 'format_',
    canonicalPath: 'src/data/content/restaurant-formats.json',
    legacySources: [],
    sourceState: SOURCE_STATE.PLANNED,
    dependsOn: []
  },
  {
    id: 'propertyTemplates',
    kind: DOMAIN_KIND.CONTENT,
    schemaVersion: 1,
    idPrefix: 'propertytpl_',
    canonicalPath: 'src/data/content/property-templates.json',
    legacySources: [],
    sourceState: SOURCE_STATE.PLANNED,
    dependsOn: ['districts', 'restaurantFormats']
  },
  {
    id: 'competitors',
    kind: DOMAIN_KIND.CONTENT,
    schemaVersion: 1,
    idPrefix: 'competitor_',
    canonicalPath: 'src/data/content/competitors.json',
    legacySources: ['src/competitor/competitorPackV10.js', 'src/competitor/competitorRulesV10.js'],
    sourceState: SOURCE_STATE.LEGACY,
    dependsOn: ['districts', 'restaurantFormats', 'customerSegments']
  },
  {
    id: 'events',
    kind: DOMAIN_KIND.CONTENT,
    schemaVersion: 1,
    idPrefix: 'event_',
    canonicalPath: 'src/data/content/events.json',
    legacySources: [],
    sourceState: SOURCE_STATE.PLANNED,
    dependsOn: ['districts', 'competitors']
  },
  {
    id: 'marketingActions',
    kind: DOMAIN_KIND.CONTENT,
    schemaVersion: 1,
    idPrefix: 'marketing_',
    canonicalPath: 'src/data/content/marketing-actions.json',
    legacySources: [],
    sourceState: SOURCE_STATE.PLANNED,
    dependsOn: ['salesChannels', 'customerSegments']
  },
  {
    id: 'restaurantPositions',
    kind: DOMAIN_KIND.CONTENT,
    schemaVersion: 1,
    idPrefix: 'position_',
    canonicalPath: 'src/data/content/restaurant-positions.json',
    legacySources: [],
    sourceState: SOURCE_STATE.PLANNED,
    dependsOn: ['restaurantFormats', 'customerSegments']
  },
  {
    id: 'salesChannels',
    kind: DOMAIN_KIND.RULE,
    schemaVersion: 1,
    idPrefix: 'channel_',
    canonicalPath: 'src/data/rules/sales-channels.json',
    legacySources: [],
    sourceState: SOURCE_STATE.PLANNED,
    dependsOn: []
  },
  {
    id: 'membershipRules',
    kind: DOMAIN_KIND.RULE,
    schemaVersion: 1,
    idPrefix: 'member_',
    canonicalPath: 'src/data/rules/membership.json',
    legacySources: [],
    sourceState: SOURCE_STATE.PLANNED,
    dependsOn: ['salesChannels']
  },
  {
    id: 'complianceRules',
    kind: DOMAIN_KIND.RULE,
    schemaVersion: 1,
    idPrefix: 'compliance_',
    canonicalPath: 'src/data/rules/compliance.json',
    legacySources: [],
    sourceState: SOURCE_STATE.PLANNED,
    dependsOn: ['restaurantFormats']
  },
  {
    id: 'storeUnlocks',
    kind: DOMAIN_KIND.RULE,
    schemaVersion: 1,
    idPrefix: 'unlock_',
    canonicalPath: 'src/data/rules/store-unlocks.json',
    legacySources: [],
    sourceState: SOURCE_STATE.PLANNED,
    dependsOn: ['restaurantFormats', 'equipment', 'salesChannels']
  },
  {
    id: 'dishGrowthRules',
    kind: DOMAIN_KIND.RULE,
    schemaVersion: 1,
    idPrefix: 'dishgrowth_',
    canonicalPath: 'src/data/rules/dish-growth.json',
    legacySources: ['src/data/foodSystemConfig.js', 'src/data/recipe_quality_schema.json'],
    sourceState: SOURCE_STATE.LEGACY,
    dependsOn: ['dishes', 'recipes', 'ingredients', 'employeeCareerTraining', 'equipment']
  },
  {
    id: 'economyBalance',
    kind: DOMAIN_KIND.RULE,
    schemaVersion: 1,
    idPrefix: 'econ_',
    canonicalPath: 'src/data/rules/economy-balance.json',
    legacySources: ['data/finance_config.json'],
    sourceState: SOURCE_STATE.LEGACY,
    dependsOn: ['districts', 'suppliers', 'equipment', 'propertyTemplates', 'marketingActions']
  }
];

const byId = Object.freeze(
  domains.reduce((acc, domain) => {
    acc[domain.id] = Object.freeze({ ...domain });
    return acc;
  }, {})
);

function getDomain(id) {
  return byId[id] || null;
}

function getDependencies(id) {
  const domain = getDomain(id);
  return domain ? domain.dependsOn.slice() : [];
}

function getDomainsByKind(kind) {
  return domains.filter((domain) => domain.kind === kind);
}

module.exports = Object.freeze({
  VERSION: 1,
  DOMAIN_KIND,
  SOURCE_STATE,
  domains: Object.freeze(domains.map((domain) => Object.freeze({ ...domain }))),
  byId,
  getDomain,
  getDependencies,
  getDomainsByKind
});
