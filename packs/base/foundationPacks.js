'use strict';

const PROPERTY = require('../../property/propertyPackV02.js');

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
  {
    id: 'person_names', mode: 'free', items: [
      { id: 'n1', name: '陈安' }, { id: 'n2', name: '赵建国' }, { id: 'n3', name: '周晓梅' },
      { id: 'n4', name: '李卫东' }, { id: 'n5', name: '王秀兰' }, { id: 'n6', name: '刘晨' },
      { id: 'n7', name: '孙悦' }, { id: 'n8', name: '郭志强' }, { id: 'n9', name: '何静' }, { id: 'n10', name: '马小峰' }
    ]
  },
  {
    id: 'person_backgrounds',
    items: [
      { id: 'kitchen_worker', name: '餐饮后厨从业', weight: 20, tags: ['food_experience'], wealthBase: 18000, skills: { cooking: 62, service: 28, management: 26, sales: 18, finance: 12 } },
      { id: 'service_worker', name: '服务业从业', weight: 18, tags: ['service_experience'], wealthBase: 22000, skills: { cooking: 18, service: 58, management: 28, sales: 46, finance: 18 } },
      { id: 'small_business', name: '小生意经营者', weight: 14, tags: ['business_experience'], wealthBase: 120000, skills: { cooking: 28, service: 42, management: 60, sales: 64, finance: 48 } },
      { id: 'office_worker', name: '普通白领', weight: 18, tags: ['office_experience'], wealthBase: 65000, skills: { cooking: 15, service: 32, management: 42, sales: 36, finance: 45 } },
      { id: 'logistics_worker', name: '物流配送从业', weight: 12, tags: ['logistics_experience'], wealthBase: 30000, skills: { cooking: 12, service: 30, management: 34, sales: 24, finance: 20 } },
      { id: 'property_owner', name: '本地物业持有人', weight: 8, tags: ['property_experience'], wealthBase: 800000, skills: { cooking: 8, service: 28, management: 48, sales: 54, finance: 60 } },
      { id: 'fresh_graduate', name: '毕业生', weight: 10, tags: ['junior'], wealthBase: 9000, skills: { cooking: 12, service: 30, management: 20, sales: 28, finance: 22 } }
    ]
  },
  {
    id: 'person_traits',
    items: [
      { id: 'steady', name: '稳健', weight: 18, riskMod: -15, patienceMod: 16, tags: ['trait_steady'] },
      { id: 'ambitious', name: '进取', weight: 14, riskMod: 14, patienceMod: -4, tags: ['trait_ambitious'] },
      { id: 'careful', name: '细致', weight: 15, riskMod: -6, patienceMod: 14, tags: ['trait_careful'] },
      { id: 'social', name: '善交际', weight: 14, riskMod: 4, patienceMod: 3, tags: ['trait_social'] },
      { id: 'impatient', name: '急躁', weight: 9, riskMod: 12, patienceMod: -22, tags: ['trait_impatient'], forbids: ['trait_steady'] },
      { id: 'frugal', name: '节俭', weight: 12, riskMod: -10, patienceMod: 8, tags: ['trait_frugal'] },
      { id: 'trend_seeker', name: '追热点', weight: 10, riskMod: 18, patienceMod: -8, tags: ['trait_trend'] },
      { id: 'quality_minded', name: '重品质', weight: 8, riskMod: -2, patienceMod: 9, tags: ['trait_quality'] }
    ]
  },
  {
    id: 'npc_roles', mode: 'fixed', items: [
      { id: 'landlord', name: '房东', minAge: 24, minFit: 16, skillWeights: { finance: 0.18, sales: 0.12 } },
      { id: 'agent', name: '中介', minAge: 20, minFit: 24, skillWeights: { sales: 0.42, service: 0.18 } },
      { id: 'chef', name: '厨师', minAge: 18, minFit: 34, skillWeights: { cooking: 0.62, service: 0.04 } },
      { id: 'manager', name: '店长', minAge: 20, minFit: 38, skillWeights: { management: 0.45, service: 0.18, finance: 0.08 } },
      { id: 'supplier_owner', name: '供应商老板', minAge: 24, minFit: 34, skillWeights: { management: 0.25, sales: 0.30, finance: 0.15 } },
      { id: 'competitor_owner', name: '竞对老板', minAge: 20, minFit: 36, skillWeights: { management: 0.30, sales: 0.25, finance: 0.20 } }
    ]
  },
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
