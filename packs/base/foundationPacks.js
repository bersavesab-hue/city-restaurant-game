'use strict';

const PROPERTY = require('../../property/propertyPackV02.js');
const PERSON = require('../../person/personPackV10.js');

const districtItems = [
  { id: 'university', name: '大学城', tags: ['district_university', 'young_consumers'], trafficIndex: 82, rentPerSqm: 78, visibilityMod: 3,
    facilityBase: { exhaust: 0.62, gas: 0.42, threePhase: 0.80, drainage: 0.85, greaseTrap: 0.66, fire: 0.88 } },
  { id: 'cbd', name: '商业中心', tags: ['district_cbd', 'high_rent', 'office_consumers'], trafficIndex: 91, rentPerSqm: 146, visibilityMod: 7,
    facilityBase: { exhaust: 0.70, gas: 0.38, threePhase: 0.92, drainage: 0.92, greaseTrap: 0.78, fire: 0.96 } },
  { id: 'oldtown', name: '老城区', tags: ['district_oldtown', 'resident_consumers'], trafficIndex: 69, rentPerSqm: 58, visibilityMod: 0,
    facilityBase: { exhaust: 0.58, gas: 0.68, threePhase: 0.62, drainage: 0.78, greaseTrap: 0.54, fire: 0.72 } },
  { id: 'village', name: '城中村', tags: ['district_village', 'price_sensitive'], trafficIndex: 76, rentPerSqm: 43, visibilityMod: -2,
    facilityBase: { exhaust: 0.54, gas: 0.72, threePhase: 0.52, drainage: 0.70, greaseTrap: 0.45, fire: 0.61 } },
  { id: 'market', name: '东门市场', tags: ['district_market', 'price_sensitive'], trafficIndex: 79, rentPerSqm: 49, visibilityMod: 2,
    facilityBase: { exhaust: 0.60, gas: 0.65, threePhase: 0.58, drainage: 0.78, greaseTrap: 0.55, fire: 0.70 } },
  { id: 'industry', name: '工业园', tags: ['district_industry', 'worker_consumers'], trafficIndex: 66, rentPerSqm: 46, visibilityMod: -4,
    facilityBase: { exhaust: 0.72, gas: 0.58, threePhase: 0.86, drainage: 0.80, greaseTrap: 0.66, fire: 0.86 } },
  { id: 'hightech', name: '高新区', tags: ['district_hightech', 'office_consumers'], trafficIndex: 73, rentPerSqm: 98, visibilityMod: 4,
    facilityBase: { exhaust: 0.68, gas: 0.34, threePhase: 0.94, drainage: 0.90, greaseTrap: 0.74, fire: 0.95 } }
];

const propertyBuildingItems = PROPERTY.PROPERTY_SUBTYPES.map((row) => ({
  ...row,
  floor: row.floorOptions?.[0] || 1
}));
const landlordItems = Object.values(PROPERTY.LANDLORD_PROFILES).map((row) => ({ ...row, tags: [`landlord_${row.id}`] }));
const leaseItems = Object.values(PROPERTY.CONTRACT_PROFILES).map((row) => ({
  ...row,
  payMonths: row.paymentMonths,
  annualEscalation: row.annualIncrease,
  tags: [`lease_${row.id}`]
}));
const defectItems = Object.values(PROPERTY.DEFECTS).map((row) => ({ ...row, tags: [`defect_${row.id}`] }));

const PACKS = [
  { id: 'district_profiles', mode: 'fixed', items: districtItems },
  { id: 'property_buildings', items: propertyBuildingItems },
  { id: 'property_structures', items: PROPERTY.STRUCTURE_TEMPLATES.map((row) => ({ ...row, weight: 1 })) },
  { id: 'landlord_profiles', items: landlordItems },
  { id: 'landlord_traits', items: PROPERTY.LANDLORD_TRAITS },
  { id: 'lease_profiles', items: leaseItems },
  { id: 'property_history', items: PROPERTY.HISTORICAL_USES.map((row) => ({ ...row, weight: 1 })) },
  { id: 'property_vacancy_reasons', items: PROPERTY.VACANCY_REASONS },
  { id: 'property_advantages', items: Object.values(PROPERTY.ADVANTAGES).map((row) => ({ ...row, weight: 1 })) },
  { id: 'property_defects', items: defectItems },
  { id: 'property_restrictions', items: PROPERTY.RESTRICTIONS.map((row) => ({ ...row, weight: 1 })) },
  { id: 'property_transactions', items: PROPERTY.TRANSACTION_METHODS },
  { id: 'property_visuals', mode: 'free', items: PROPERTY.FREE_VISUALS },
  { id: 'person_names', mode: 'free', items: [
    { id:'legacy_n1', name:'陈安' }, { id:'legacy_n2', name:'赵建国' }, { id:'legacy_n3', name:'周晓梅' },
    { id:'legacy_n4', name:'李卫东' }, { id:'legacy_n5', name:'王秀兰' }, { id:'legacy_n6', name:'刘晨' },
    { id:'legacy_n7', name:'孙悦' }, { id:'legacy_n8', name:'郭志强' }, { id:'legacy_n9', name:'何静' }, { id:'legacy_n10', name:'马小峰' }
  ] },
  { id: 'person_surnames', mode:'free', items: PERSON.SURNAMES },
  { id: 'person_given_names', mode:'free', items: PERSON.GIVEN_NAMES },
  { id: 'person_genders', mode:'weighted', items: PERSON.GENDERS },
  { id: 'person_educations', mode:'weighted', items: PERSON.EDUCATIONS },
  { id: 'person_origins', mode:'weighted', items: PERSON.ORIGIN_TYPES },
  { id: 'person_families', mode:'weighted', items: PERSON.FAMILY_BACKGROUNDS },
  { id: 'person_backgrounds', mode:'weighted', items: PERSON.CAREER_BACKGROUNDS },
  { id: 'person_traits', mode:'weighted', items: PERSON.PERSON_TRAITS },
  { id: 'person_values', mode:'weighted', items: PERSON.VALUES },
  { id: 'person_motivations', mode:'weighted', items: PERSON.MOTIVATIONS },
  { id: 'person_habits', mode:'weighted', items: PERSON.HABITS },
  { id: 'person_flaws', mode:'weighted', items: PERSON.FLAWS },
  { id: 'person_work_styles', mode:'weighted', items: PERSON.WORK_STYLES },
  { id: 'person_social_styles', mode:'weighted', items: PERSON.SOCIAL_STYLES },
  { id: 'person_money_attitudes', mode:'weighted', items: PERSON.MONEY_ATTITUDES },
  { id: 'person_negotiation_styles', mode:'weighted', items: PERSON.NEGOTIATION_STYLES },
  { id: 'person_stress_responses', mode:'weighted', items: PERSON.STRESS_RESPONSES },
  { id: 'person_life_goals', mode:'weighted', items: PERSON.LIFE_GOALS },
  { id: 'person_appearance', mode:'free', items: PERSON.APPEARANCE_FEATURES },
  { id: 'npc_roles', mode:'fixed', items: PERSON.NPC_ROLES },
  { id: 'relationship_types', mode:'fixed', items: PERSON.RELATIONSHIP_TYPES },
  { id: 'memory_types', mode:'fixed', items: PERSON.MEMORY_TYPES },
  {
    id: 'competitor_archetypes',
    items: [
      { id: 'steady', name: '稳健经营者', weight: 20, tags: ['strategy_steady'], cashRange: [80000, 500000], aggression: 28, imitationAbility: 32, expansionDesire: 30, priceWarTolerance: 28, qualityFocus: 58 },
      { id: 'price', name: '价格型', weight: 16, tags: ['strategy_price'], cashRange: [70000, 420000], aggression: 72, imitationAbility: 68, expansionDesire: 46, priceWarTolerance: 80, qualityFocus: 35 },
      { id: 'quality', name: '品质型', weight: 16, tags: ['strategy_quality'], cashRange: [120000, 700000], aggression: 36, imitationAbility: 24, expansionDesire: 36, priceWarTolerance: 18, qualityFocus: 88 },
      { id: 'follower', name: '跟随型', weight: 16, tags: ['strategy_follower'], cashRange: [60000, 350000], aggression: 48, imitationAbility: 86, expansionDesire: 52, priceWarTolerance: 52, qualityFocus: 44 },
      { id: 'marketing', name: '流量型', weight: 12, tags: ['strategy_marketing'], cashRange: [160000, 900000], aggression: 66, imitationAbility: 56, expansionDesire: 58, priceWarTolerance: 46, qualityFocus: 54 },
      { id: 'expansion', name: '扩张型', weight: 10, tags: ['strategy_expansion'], cashRange: [300000, 1800000], aggression: 74, imitationAbility: 58, expansionDesire: 90, priceWarTolerance: 58, qualityFocus: 50 },
      { id: 'conservative', name: '保守型', weight: 10, tags: ['strategy_conservative'], cashRange: [120000, 800000], aggression: 18, imitationAbility: 20, expansionDesire: 16, priceWarTolerance: 14, qualityFocus: 62 }
    ]
  },
  {
    id: 'brand_positions',
    items: [
      { id: 'budget_meal', name: '大众快餐', weight: 28, tags: ['position_budget'], targetPriceIndex: 0.84, copyDifficulty: 0.28 },
      { id: 'community', name: '社区餐食', weight: 22, tags: ['position_community'], targetPriceIndex: 0.96, copyDifficulty: 0.42 },
      { id: 'specialty', name: '特色单品', weight: 18, tags: ['position_specialty'], targetPriceIndex: 1.08, copyDifficulty: 0.50 },
      { id: 'quality_casual', name: '品质简餐', weight: 17, tags: ['position_quality'], targetPriceIndex: 1.22, copyDifficulty: 0.62 },
      { id: 'trend', name: '网红潮流', weight: 9, tags: ['position_trend'], targetPriceIndex: 1.18, copyDifficulty: 0.35 },
      { id: 'premium', name: '中高端餐饮', weight: 6, tags: ['position_premium'], targetPriceIndex: 1.56, copyDifficulty: 0.74 }
    ]
  },
  {
    id: 'customer_segments', mode: 'fixed', items: [
      { id: 'student', name: '学生', budget: [14, 30], elasticity: 1.45, priceSensitivity: 0.90, qualitySensitivity: 0.58, speedSensitivity: 0.72 },
      { id: 'worker', name: '工薪/工人', budget: [15, 34], elasticity: 1.28, priceSensitivity: 0.82, qualitySensitivity: 0.60, speedSensitivity: 0.76 },
      { id: 'resident', name: '居民', budget: [18, 48], elasticity: 1.05, priceSensitivity: 0.66, qualitySensitivity: 0.74, speedSensitivity: 0.48 },
      { id: 'office', name: '白领', budget: [22, 62], elasticity: 0.86, priceSensitivity: 0.46, qualitySensitivity: 0.80, speedSensitivity: 0.92 },
      { id: 'business', name: '商务客', budget: [38, 150], elasticity: 0.55, priceSensitivity: 0.28, qualitySensitivity: 0.92, speedSensitivity: 0.70 },
      { id: 'tourist', name: '游客', budget: [22, 88], elasticity: 0.92, priceSensitivity: 0.48, qualitySensitivity: 0.76, speedSensitivity: 0.50 }
    ]
  }
];

function registerFoundationPacks(registry) {
  for (const pack of PACKS) registry.registerPack(pack);
  registry.validateReferences();
  return registry;
}

module.exports = { PACKS, registerFoundationPacks };
