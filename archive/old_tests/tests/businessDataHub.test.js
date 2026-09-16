'use strict';

const assert = require('assert');
const hub = require('../src/analytics/businessDataHub.js');

const state = {
  year: 1,
  month: 4,
  day: 10,
  cash: 52000,
  store: {
    id: 's1',
    name: '测试小馆',
    district: 'university',
    street: '学府路',
    area: 80,
    rent: 9000,
    capacity: 56,
    kitchenCapacity: 180,
    rating: 4.55,
    repeatRate: 0.31,
    reputation: 68,
    inventory: {
      rice: { name:'大米', qty:20, avgCost:4, freshness:90, dailyUse:8 },
      pork: { name:'猪肉', qty:4, avgCost:18, freshness:28, dailyUse:5 }
    },
    staff: [
      { name:'厨师甲', hoursToday:8, skill:78, morale:75 },
      { name:'服务员乙', hoursToday:8, skill:62, morale:70 }
    ],
    dishes: [
      { id:'a', name:'招牌饭', price:28, cost:9, todaySales:70, rating:4.7, status:'爆款' },
      { id:'b', name:'肉菜', price:36, cost:22, todaySales:35, rating:4.4, status:'成熟期' }
    ],
    dailyHistory: [
      { day:8, orders:100, totalDemand:11000, potential:135, capacity:150, inventoryCapacity:140, lost:35, revenue:2800, cogs:900, wages:500, utilities:160, rent:300, marketing:50, wastage:30, profit:860, rating:4.4, repeat:0.28, cash:49000 },
      { day:9, orders:112, totalDemand:11500, potential:145, capacity:155, inventoryCapacity:130, lost:33, revenue:3250, cogs:1050, wages:520, utilities:170, rent:300, marketing:80, wastage:35, profit:1095, rating:4.5, repeat:0.30, cash:50500 },
      { day:10, orders:120, totalDemand:11800, potential:160, capacity:145, inventoryCapacity:130, lost:40, lostReasons:{stock:15,kitchen:10,seats:8,wait:7}, revenue:3600, cogs:1260, wages:560, utilities:180, rent:300, marketing:100, wastage:55, maintenance:20, profit:1125, rating:4.6, repeat:0.32, cash:52000, queueMinutes:14, kitchenUtilization:0.96 }
    ]
  }
};

const gameState = {
  getState: () => state,
  getPlayer: () => ({ cash: state.cash }),
  getWorld: () => ({ currentDistrictId:'university', weather:'sunny' }),
  getTime: () => ({ year:1, month:4, day:10 })
};
const citySystem = {
  getDistrict: () => ({ id:'university', name:'大学城', population:78000, avgSpend:26, restaurantCount:126, saturation:84, rentIndex:1.05, mealDemand:{breakfast:.12,lunch:.38,afternoon:.10,dinner:.30,night:.10} }),
  getCompetitionLevel: () => 'high'
};
const demandSystem = {
  getTotalDemand: () => 11800,
  getCustomerMix: () => ({ student:.72, teacher:.10, resident:.18 })
};

const ctx = { gameState, citySystem, demandSystem };
hub.syncFromGame(ctx);
const d = hub.getDashboard(ctx);

assert.strictEqual(d.today.orders, 120);
assert.strictEqual(d.today.avgTicket, 30);
assert.strictEqual(d.funnel.lost, 40);
assert.strictEqual(d.funnel.reasons.stock, 15);
assert.ok(d.pnl.grossMargin > 0.64 && d.pnl.grossMargin < 0.66);
assert.ok(d.last7.revenue > 9000);
assert.strictEqual(d.supply.items.length, 2);
assert.strictEqual(d.supply.staleCount, 1);
assert.strictEqual(d.supply.lowStockCount, 1);
assert.strictEqual(d.staff.headcount, 2);
assert.ok(d.staff.revenuePerLaborHour > 0);
assert.strictEqual(d.dishes[0].name, '招牌饭');
assert.ok(d.dishes[0].grossProfitContribution > d.dishes[1].grossProfitContribution);
assert.strictEqual(d.capacity.seats, 56);
assert.ok(d.alerts.some(x => x.code === 'HIGH_LOST_ORDERS'));
assert.ok(d.alerts.some(x => x.code === 'KITCHEN_BOTTLENECK'));
assert.strictEqual(d.district.name, '大学城');
assert.strictEqual(state.businessAnalytics.district.length, 1);
assert.strictEqual(state.businessAnalytics.inventory.length, 1);
assert.strictEqual(state.businessAnalytics.capacity.length, 1);

console.log('businessDataHub.test.js PASS');
