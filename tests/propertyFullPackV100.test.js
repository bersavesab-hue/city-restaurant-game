'use strict';

const assert = require('assert');
const PACK = require('../property/propertyPackV02.js');
const adapter = require('../property/propertyAdapterV02.js');
const rules = require('../property/propertyRulesV02.js');
const createFoundation = require('../foundation/createFoundation.js');

(function exactPackCounts() {
  const stats = adapter.getPackStats();
  assert.strictEqual(stats.categories, 16, '一级房源大类必须为16');
  assert.strictEqual(stats.subtypes, 96, '二级铺型必须为96');
  assert.strictEqual(stats.structures, 240, '结构模板必须为240');
  assert.strictEqual(stats.sizeBands, 7, '规模档必须为7');
  assert.strictEqual(stats.landlords, 24, '房东类型必须为24');
  assert.strictEqual(stats.landlordTraits, 24, '房东性格必须为24');
  assert.strictEqual(stats.contracts, 24, '合同模板必须为24');
  assert.strictEqual(stats.historicalUses, 36, '历史用途必须为36');
  assert.strictEqual(stats.vacancyReasons, 24, '挂牌原因必须为24');
  assert.strictEqual(stats.advantages, 36, '优势标签必须为36');
  assert.strictEqual(stats.defects, 48, '缺陷标签必须为48');
  assert.strictEqual(stats.restrictions, 32, '物业限制必须为32');
  assert.strictEqual(stats.transactionMethods, 12, '交易方式必须为12');
  assert.strictEqual(stats.visuals, 40, '视觉模板必须为40');
})();

(function sizeCoverage() {
  const micro = adapter.generateListing({ seed: 'micro-6', districtId: 'market', propertySubtypeId: 'night_stall', area: 6 });
  const small = adapter.generateListing({ seed: 'small-50', districtId: 'university', propertySubtypeId: 'street_single', area: 50 });
  const medium = adapter.generateListing({ seed: 'medium-260', districtId: 'cbd', propertySubtypeId: 'office_podium', area: 260 });
  const large = adapter.generateListing({ seed: 'large-700', districtId: 'cbd', propertySubtypeId: 'large_hotpot', area: 700 });
  const superLarge = adapter.generateListing({ seed: 'super-1800', districtId: 'cbd', propertySubtypeId: 'banquet_restaurant', area: 1800 });
  const project = adapter.generateListing({ seed: 'project-12000', districtId: 'cbd', propertySubtypeId: 'commercial_street_zone', area: 12000 });
  assert.strictEqual(micro.scaleBandId, 'micro');
  assert.strictEqual(small.scaleBandId, 'small');
  assert.strictEqual(medium.scaleBandId, 'medium');
  assert.strictEqual(large.scaleBandId, 'large');
  assert.strictEqual(superLarge.scaleBandId, 'super');
  assert.strictEqual(project.scaleBandId, 'project');
  assert.ok(project.startupEstimate.total > large.startupEstimate.total, '项目级物业开店资金应显著高于大型物业');
  assert.ok(project.projectComplexity > large.projectComplexity, '项目级复杂度应高于大型物业');
})();

(function rentIsNotLinearForHugeSpace() {
  const base = { propertySubtypeId: 'street_linked', floor: '1层', visibility: 72, exhaust: true, gas: true, threePhase: true, drainage: true, greaseTrap: true, fire: true };
  const small = rules.fairMonthlyRent({ ...base, grossArea: 80 }, 'cbd', ['none_material']);
  const huge = rules.fairMonthlyRent({ ...base, grossArea: 800 }, 'cbd', ['none_material']);
  assert.ok(huge > small, '大面积总租金应更高');
  assert.ok((huge / 800) < (small / 80), '大面积单位租金必须体现面积折扣，而不是线性放大');
})();

(function hardConstraintsStayHard() {
  const p = adapter.enrichListing({
    marketKey: 'hard-constraint-full', districtId: 'community', propertySubtypeId: 'community_ground', grossArea: 60,
    floor: '1层', exhaust: false, gas: false, threePhase: false, drainage: true, fire: true,
    restrictions: ['仅允许轻餐饮']
  });
  const bbq = p.restaurantModes.find((x) => x.id === 'bbq');
  const hotpot = p.restaurantModes.find((x) => x.id === 'hotpot');
  assert.strictEqual(bbq.viable, false, '无排烟/轻餐限制时烧烤不可直接经营');
  assert.strictEqual(hotpot.viable, false, '轻餐限制时火锅不可直接经营');
})();

(function oldIdsRemainCompatible() {
  const f = createFoundation('legacy-property-alias');
  const p = f.entities.createProperty({ districtId: 'university', buildingTypeId: 'mall_stall', area: 24, facilities: { exhaust: false, gas: false, threePhase: true, drainage: true, greaseTrap: true, fire: true } });
  assert.ok(p && p.buildingTypeId, '旧 mall_stall ID 必须继续可生成');
  assert.strictEqual(p.capability.wok, false, '旧ID兼容不能破坏硬约束');
})();

(function deterministicFullEnrichment() {
  const raw = { marketKey:'full-seed', districtId:'cbd', propertySubtypeId:'large_chinese', grossArea:980, floor:'2层' };
  assert.deepStrictEqual(adapter.enrichListing(raw), adapter.enrichListing(raw), '完整房源包必须确定性可重放');
})();

(function projectNeverLooksLikeStarterShop() {
  const p = adapter.generateListing({ seed:'project-first-store', districtId:'cbd', propertySubtypeId:'complex_floor', area:4200 });
  assert.ok(p.firstStoreScore < 60, '4200㎡项目不应被系统误判成适合首店');
  assert.ok(p.v02Tags.includes('集团级项目'), '项目级房源需要清晰标签');
})();

console.log('propertyFullPackV100.test.js PASS');
