'use strict';

const assert = require('assert');
const createFoundation = require('../foundation/createFoundation.js');
const pricing = require('../systems/pricingEngine.js');
const competition = require('../systems/competitionEngine.js');
const reviews = require('../systems/reviewEngine.js');
const events = require('../systems/eventEngine.js');

(function deterministicGeneration() {
  const a = createFoundation('same-seed');
  const b = createFoundation('same-seed');
  const pa = a.entities.createProperty({ districtId: 'university' });
  const pb = b.entities.createProperty({ districtId: 'university' });
  assert.deepStrictEqual(pa, pb, '相同 seed 应生成相同房源');
})();

(function propertyHardConstraints() {
  const f = createFoundation('property-test');
  const p = f.entities.createProperty({
    districtId: 'university',
    buildingTypeId: 'mall_stall',
    area: 24,
    facilities: { exhaust: false, gas: false, threePhase: true, drainage: true, greaseTrap: true, fire: true }
  });
  assert.strictEqual(p.capability.wok, false, '无排烟时不能支持爆炒');
  assert.strictEqual(p.capability.bbq, false, '无排烟时不能支持烧烤');
  assert.ok(p.seats <= 10, '小档口不能凭空生成大量座位');
  assert.ok(p.upfrontRentCost > 0, '入场租赁成本必须存在');
})();

(function personAndRoleSeparated() {
  const f = createFoundation('person-test');
  const person = f.entities.createPerson({ age: 32, backgroundId: 'kitchen_worker', name: '测试厨师' });
  assert.strictEqual(person.currentRole, null, '人物实体不应出生即绑定永久 NPC 角色');
  const result = f.entities.assignNpcRole(person, 'chef');
  assert.strictEqual(result.ok, true, '餐饮后厨背景应能分配厨师角色');
  assert.strictEqual(person.currentRole, 'chef');
})();

(function pricingMakesSense() {
  const rec = pricing.recommendPrice({
    variableCost: 9,
    competitors: [
      { price: 18, weight: 0.8 },
      { price: 20, weight: 1.2 },
      { price: 22, weight: 1.0 },
      { price: 25, weight: 0.4 }
    ],
    customerBudget: [16, 30],
    brandPower: 35
  });
  assert.ok(rec.recommended > 9, '推荐价必须高于变动成本');
  assert.ok(rec.recommended >= 16 && rec.recommended <= 30, '普通品牌推荐价应大致落在客群有效预算区间');

  const studentCheap = pricing.demandMultiplier({ price: 18, referencePrice: 20, elasticity: 1.45, customerBudget: [14, 30], quality: 70, brandPower: 30, rating: 4.2 });
  const studentExpensive = pricing.demandMultiplier({ price: 32, referencePrice: 20, elasticity: 1.45, customerBudget: [14, 30], quality: 70, brandPower: 30, rating: 4.2 });
  assert.ok(studentCheap > studentExpensive, '价格上升应降低价格敏感客群需求');
})();

(function successDoesNotAutoSpawnCompetitor() {
  const weakMarket = competition.marketEntryScore({
    demandGapRatio: -0.10,
    profitability: 0.18,
    successVisibility: 0.9,
    copyDifficulty: 0.25,
    vacancyAvailability: 0.15,
    saturation: 0.92,
    rentPressure: 0.88
  });
  const openMarket = competition.marketEntryScore({
    demandGapRatio: 0.22,
    profitability: 0.18,
    successVisibility: 0.9,
    copyDifficulty: 0.25,
    vacancyAvailability: 0.65,
    saturation: 0.52,
    rentPressure: 0.38
  });
  assert.ok(openMarket > weakMarket, '进入概率必须看供需/饱和/租金，而不是只看玩家挣钱');
})();

(function eventCausality() {
  const none = events.eligibleEvents({ entryScore: 20, imitationPressure: 12, vacancyAvailability: 0.8, supplyTightness: 0.2, propertyVacancyDays: 4, hygieneRisk: 0.1 });
  assert.strictEqual(none.length, 0, '没有前置条件时不应硬抽重大事件');

  const some = events.eligibleEvents({ entryScore: 72, imitationPressure: 66, vacancyAvailability: 0.7, supplyTightness: 0.2, propertyVacancyDays: 4, hygieneRisk: 0.1 });
  assert.ok(some.some((e) => e.id === 'competitor_opening'));
  assert.ok(some.some((e) => e.id === 'copycat_menu'));
})();

(function reviewsComeFromExperience() {
  const good = reviews.scoreExperience({ taste: 88, value: 82, portion: 80, speed: 76, service: 84, hygiene: 90, environment: 78, consistency: 86 });
  const bad = reviews.scoreExperience({ taste: 45, value: 38, portion: 42, speed: 30, service: 40, hygiene: 55, environment: 50, consistency: 36 });
  assert.ok(good.stars > bad.stars, '评价星级必须来自真实体验维度');
  assert.ok(reviews.reviewSignals({ taste: 90, speed: 30 }).some((x) => x.dimension === 'speed' && x.sentiment === 'negative'));
})();

console.log('foundationV02.test.js: PASS');
