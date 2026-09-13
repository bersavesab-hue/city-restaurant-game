'use strict';

const PACKS = [
  {
    id: 'district_profiles',
    mode: 'fixed',
    items: [
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
    ]
  },
  {
    id: 'property_buildings',
    items: [
      { id: 'street_shop', name: '临街底商', weight: 28, tags: ['streetfront'], areaRange: [32, 120], floor: 1, baseVisibility: 78, trafficFactor: 1.02, rentFactor: 1.08, seatDensity: 0.42, transferFeeBase: 12000,
        facilityChance: { exhaust: 0.72, gas: 0.62, threePhase: 0.78, drainage: 0.86, greaseTrap: 0.66, fire: 0.84 } },
      { id: 'community_shop', name: '社区底商', weight: 26, tags: ['community'], areaRange: [28, 95], floor: 1, baseVisibility: 66, trafficFactor: 0.90, rentFactor: 0.88, seatDensity: 0.44, transferFeeBase: 8000,
        facilityChance: { exhaust: 0.66, gas: 0.70, threePhase: 0.65, drainage: 0.82, greaseTrap: 0.58, fire: 0.78 } },
      { id: 'mall_stall', name: '商场/美食城档口', weight: 20, tags: ['mall', 'no_gas_typical'], areaRange: [12, 45], floor: 3, baseVisibility: 58, trafficFactor: 0.82, rentFactor: 1.32, seatDensity: 0.10, transferFeeBase: 5000,
        facilityChance: { exhaust: 0.50, gas: 0.06, threePhase: 0.96, drainage: 0.88, greaseTrap: 0.82, fire: 0.98 } },
      { id: 'upper_floor', name: '二三层商铺', weight: 12, tags: ['upper_floor'], areaRange: [55, 180], floor: 2, baseVisibility: 34, trafficFactor: 0.62, rentFactor: 0.67, seatDensity: 0.50, transferFeeBase: 6000,
        facilityChance: { exhaust: 0.48, gas: 0.42, threePhase: 0.72, drainage: 0.74, greaseTrap: 0.55, fire: 0.80 } },
      { id: 'market_stall', name: '市场街铺', weight: 14, tags: ['market_stall'], requires: ['district_market'], areaRange: [16, 58], floor: 1, baseVisibility: 72, trafficFactor: 1.10, rentFactor: 0.76, seatDensity: 0.30, transferFeeBase: 4000,
        facilityChance: { exhaust: 0.58, gas: 0.64, threePhase: 0.50, drainage: 0.74, greaseTrap: 0.45, fire: 0.66 } }
    ]
  },
  {
    id: 'landlord_profiles',
    items: [
      { id: 'stable', name: '稳定型房东', weight: 34, tags: ['landlord_stable'], negotiation: 0.45, renewalRisk: 0.18 },
      { id: 'price_focused', name: '价格敏感型房东', weight: 27, tags: ['landlord_price'], negotiation: 0.28, renewalRisk: 0.44 },
      { id: 'long_term', name: '偏好长期租约房东', weight: 22, tags: ['landlord_longterm'], negotiation: 0.58, renewalRisk: 0.12 },
      { id: 'urgent', name: '急租型房东', weight: 12, tags: ['landlord_urgent'], negotiation: 0.82, renewalRisk: 0.24 },
      { id: 'institutional', name: '商业机构业主', weight: 5, tags: ['landlord_institution'], negotiation: 0.15, renewalRisk: 0.20 }
    ]
  },
  {
    id: 'lease_profiles',
    items: [
      { id: 'deposit1_pay3', name: '押一付三', weight: 38, depositMonths: 1, payMonths: 3, freeRentDays: 10, annualEscalation: 0.04 },
      { id: 'deposit2_pay3', name: '押二付三', weight: 23, depositMonths: 2, payMonths: 3, freeRentDays: 12, annualEscalation: 0.04 },
      { id: 'deposit2_pay1', name: '押二付一', weight: 14, depositMonths: 2, payMonths: 1, freeRentDays: 7, annualEscalation: 0.05 },
      { id: 'longterm_friendly', name: '长租友好', weight: 15, tags: ['lease_longterm'], depositMonths: 1, payMonths: 2, freeRentDays: 20, annualEscalation: 0.03 },
      { id: 'mall_contract', name: '商业体合同', weight: 10, requires: ['mall'], depositMonths: 3, payMonths: 1, freeRentDays: 15, annualEscalation: 0.06 }
    ]
  },
  {
    id: 'property_defects',
    items: [
      { id: 'weak_visibility', name: '门头可见性差', weight: 22, tags: ['defect_visibility'] },
      { id: 'poor_parking', name: '停车不便', weight: 18, tags: ['defect_parking'] },
      { id: 'noise_neighbor', name: '邻里噪音限制', weight: 12, tags: ['defect_noise'] },
      { id: 'old_pipeline', name: '管线老化', weight: 15, tags: ['defect_pipeline'] },
      { id: 'delivery_access', name: '骑手取餐动线差', weight: 15, tags: ['defect_delivery'] },
      { id: 'short_lease', name: '可签年限偏短', weight: 10, tags: ['defect_lease'] },
      { id: 'none_material', name: '无明显硬伤', weight: 8, tags: ['defect_minor'] }
    ]
  },
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
