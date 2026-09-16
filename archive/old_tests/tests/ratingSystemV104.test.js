'use strict';

const assert = require('assert');
const rating = require('../src/rating/ratingSystemV104.js');

(function employeeRating() {
  const row = rating.evaluateEmployee({
    id: 'e1', name: '张师傅', roleId: 'kitchen', skill: 88, speed: 82,
    performance: 84, stability: 90, energy: 76, loyalty: 86
  });
  assert(row.score >= 80 && row.score <= 100, 'employee score should be strong');
  assert(row.growthLevel >= 1 && row.growthLevel <= 50, 'employee level must be 1..50');
  assert(row.tier, 'employee tier required');
  assert.strictEqual(row.dimensions.length, 6);
})();

(function dishRating() {
  const row = rating.evaluateDish({
    id: 'd1', name: '宫保鸡丁', listPrice: 32, rating: 4.6,
    tasteScore: 91, appearance: 78, cookMinutes: 8,
    repeatRate: 0.78, consistency: 84
  }, { cost: 10.8, craftable: 22 });
  assert(['D','C','B','A','S'].includes(row.grade), 'dish grade invalid');
  assert(row.grossMargin > 0.6, 'gross margin should be derived');
  assert(row.score >= 70, 'dish score should be healthy');
})();

(function storeDualRating() {
  const row = rating.evaluateStoreFromDashboard({
    today: { rating: 4.6, repeatRate: 0.42, grossMargin: 0.61, queueMinutes: 7 },
    yesterday: { rating: 4.4, repeatRate: 0.38, grossMargin: 0.59, queueMinutes: 9 },
    store: { id: 's1', name: '家味小馆', environmentScore: 79, hygieneScore: 90 },
    dishes: [{ name: '招牌菜', rating: 4.7, price: 28, cost: 9, sales: 80 }],
    staff: { averageSkill: 78, averageMorale: 76, staff: [] },
    supply: { items: [{ freshness: 92 }, { freshness: 85 }] },
    capacity: { queueMinutes: 7 }
  });
  assert(row.score >= 60 && row.score <= 100, 'store score range');
  assert(row.consumerStars >= 1 && row.consumerStars <= 5, 'consumer stars range');
  assert(row.previousScore != null, 'store trend should have previous score');
  assert.strictEqual(row.ratingMode, '经营评级 + 消费者口碑双轨');
})();

(function brandRating() {
  const row = rating.evaluateBrand({
    brand: { name: '家味', reputation: 82, awareness: 71, loyalty: 77 },
    portfolio: {
      storeCount: 3,
      stores: [{ score: 84 }, { score: 79 }, { score: 82 }],
      eligibility: { storeCap: 5 }
    }
  });
  assert(row.brandLevel >= 1 && row.brandLevel <= 20, 'brand level range');
  assert(row.tier, 'brand tier required');
  assert.strictEqual(row.dimensions.length, 6);
})();

(function history() {
  const root = {};
  rating.pushHistory(root, 'store', { score: 81, grade: 'A' }, 'day-1');
  rating.pushHistory(root, 'store', { score: 83, grade: 'A' }, 'day-1');
  assert.strictEqual(root.ratingHistory.store.length, 1, 'history should upsert same key');
  assert.strictEqual(root.ratingHistory.store[0].score, 83);
})();

console.log('RATING SYSTEM V104 PASS');
