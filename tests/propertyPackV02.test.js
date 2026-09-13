'use strict';

const assert = require('assert');
const adapter = require('../property/propertyAdapterV02.js');
const rules = require('../property/propertyRulesV02.js');

function testHardConstraints() {
  const badWok = adapter.enrichListing({
    marketKey: 'bad-wok', districtId: 'university', propertyTypeName: '美食城档口', grossArea: 22,
    floor: '3层', exhaust: false, gas: false, threePhase: true, drainage: true, fire: true,
    askingMonthlyRent: 2800, depositMonths: 1, paymentMonths: 1
  });
  const wok = badWok.restaurantModes.find((x) => x.id === 'wok');
  assert.strictEqual(wok.viable, false, '无排烟档口不应判定为可做炒菜');
  assert.ok(wok.missing.includes('exhaust'), '炒菜应明确缺排烟');
}

function testCapacitySanity() {
  const p = adapter.enrichListing({
    marketKey: 'small', districtId: 'village', propertyTypeName: '临街底商', grossArea: 20,
    floor: '1层', exhaust: true, gas: true, threePhase: true, drainage: true, fire: true,
    askingMonthlyRent: 1700
  });
  assert.ok(p.physicalCapacity.maxPracticalSeats < 20, '20㎡不应生成离谱座位数');
}

function testDeterminism() {
  const raw = { marketKey: 'same-seed', districtId: 'oldtown', propertyTypeName: '社区底商', grossArea: 46, floor: '1层' };
  const a = adapter.enrichListing(raw);
  const b = adapter.enrichListing(raw);
  assert.deepStrictEqual(a, b, '同一挂牌必须可确定性重放');
}

function testRentReference() {
  const p = adapter.enrichListing({
    marketKey: 'rent', districtId: 'cbd', propertyTypeName: '临街底商', grossArea: 60,
    floor: '1层', visibility: 80, exhaust: true, gas: false, threePhase: true, drainage: true, fire: true,
    askingMonthlyRent: 18000
  });
  assert.ok(p.fairMonthlyRent > 0, '应生成合理租金参考');
  assert.ok(p.rentAssessment && p.rentAssessment.ratio > 0, '应生成挂牌价偏离判断');
}

function testStartupAndRecommendation() {
  const p = adapter.generateListing({ seed: 'u-1', districtId: 'university' });
  assert.ok(p.startupEstimate.total > 0, '应估算完整开店资金');
  assert.ok(Array.isArray(p.restaurantModes) && p.restaurantModes.length >= 6, '应评估多业态适配');
  assert.ok(p.firstStoreScore >= 5 && p.firstStoreScore <= 96, '首店适配分必须在合理范围');
  assert.ok(['fixed', 'weighted', 'free'].every((key) => Array.isArray(p.composition[key])), '应明确三类组合字段');
}

function testDifferentDistricts() {
  const base = { propertyTypeName: '临街底商', grossArea: 55, floor: '1层', visibility: 70, exhaust: true, gas: true, threePhase: true, drainage: true, fire: true };
  const university = rules.fairMonthlyRent({ ...base }, 'university', 'none_material');
  const cbd = rules.fairMonthlyRent({ ...base }, 'cbd', 'none_material');
  assert.ok(cbd > university, '不同商圈租金基准必须真实产生差异');
}

[testHardConstraints, testCapacitySanity, testDeterminism, testRentReference, testStartupAndRecommendation, testDifferentDistricts].forEach((fn) => fn());
console.log('propertyPackV02.test.js PASS');
