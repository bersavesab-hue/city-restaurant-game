'use strict';

const assert = require('assert');
const gameState = require('../src/core/gameState.js');
const dailyCycle = require('../src/operations/dailyOperatingCycleV0840.js');
const reports = require('../src/analytics/operatingReportSystemV122.js');

gameState.reset();
reports.resetForTests();

const business = gameState.getBusiness();
business.hasShop = true;
business.currentShopId = 'shop_v122';
business.shops = [{
  id:'shop_v122',
  name:'日报测试店',
  districtId:'university'
}];
business.customDishLab = {
  version:'1.2.0',
  shops:{
    shop_v122:{
      library:[
        {id:'custom_1',name:'香辣鸡丁·改',score:86,qualityId:'master'}
      ]
    }
  }
};

function extra(options) {
  const o = options || {};
  return {
    source:'test',
    operatingSignals:{
      repeatRate:o.repeatRate == null ? 0.31 : o.repeatRate,
      avgWaitMinutes:o.wait == null ? 8 : o.wait,
      stockouts:o.stockouts || 0,
      queueWalkaways:o.queue || 0,
      mistakes:o.mistakes || 0,
      expiredWasteValue:o.waste || 0,
      dishPerformance:[
        {id:'m1',name:'香辣鸡丁',qty:28,revenue:980,unitCost:11,grossProfit:672,grossMargin:0.686,ratingScore:84,custom:false},
        {id:'m2',name:'牛肉炒饭',qty:14,revenue:420,unitCost:20,grossProfit:140,grossMargin:0.333,ratingScore:76,custom:false},
        {id:'m3',name:'自研酸汤面',qty:18,revenue:630,unitCost:13,grossProfit:396,grossMargin:0.629,ratingScore:88,custom:true}
      ]
    },
    staff:{
      headcount:8,
      monthlyPayroll:42000,
      roleCounts:{chef:3,server:4,manager:1},
      coverageFactor:o.coverage == null ? 0.92 : o.coverage,
      peopleSummary:{active:8}
    },
    regulatory:{openViolations:0}
  };
}

function closeDay(day, revenue, profit, opts) {
  dailyCycle.beginDay('shop_v122', day, {
    day,
    cash:50000,
    revenue:0,
    profit:0,
    orders:0,
    customers:0,
    avgTicket:0,
    rating:4.1,
    memberCount:20,
    staffCount:8,
    inventoryAlerts:0,
    tensionScore:20
  });

  return dailyCycle.finalizeDay(
    'shop_v122',
    day,
    {financial:{
      revenue,
      profit,
      totalCost:revenue-profit,
      foodCost:revenue*0.34,
      labor:revenue*0.19,
      rent:120,
      utilities:70,
      marketing:35,
      compliance:0,
      waste:(opts && opts.waste) || 0,
      refunds:0,
      orders:60 + day,
      customers:75 + day,
      avgTicket:revenue/(60+day),
      foodCostRate:34,
      profitRate:profit/revenue*100
    }},
    {
      day,
      cash:50000+profit,
      revenue,
      profit,
      orders:60+day,
      customers:75+day,
      avgTicket:revenue/(60+day),
      rating:4.1 + day*0.02,
      memberCount:20+day,
      staffCount:8,
      inventoryAlerts:(opts && opts.stockouts) ? 2 : 0,
      tensionScore:20
    },
    extra(opts)
  );
}

const d1 = closeDay(1, 3000, 420, {stockouts:3,waste:90});
assert.equal(d1.ok, true);
assert.ok(d1.brief.reportId, '日结必须自动生成日报ID');

const r1 = reports.latest('shop_v122');
assert.ok(r1, '必须能读取最新日报');
assert.equal(r1.day, 1);
assert.equal(r1.summary.revenue, 3000);
assert.equal(r1.summary.profit, 420);
assert.equal(r1.dish.hotDish.name, '香辣鸡丁');
assert.equal(r1.dish.profitChampion.name, '香辣鸡丁');
assert.equal(r1.dish.lowMargin.name, '牛肉炒饭');
assert.equal(r1.staff.headcount, 8);
assert.equal(r1.customDish.count, 1);
assert.equal(r1.customDish.best.name, '香辣鸡丁·改');
assert.ok(r1.actions.length >= 1 && r1.actions.length <= 3);
assert.ok(r1.actions.some(x => x.routeId === 'supply'), '缺货日报必须给供应链行动建议');

const d2 = closeDay(2, 3600, 610, {queue:4,mistakes:2,coverage:0.78});
assert.equal(d2.ok, true);
const r2 = reports.latest('shop_v122');
assert.equal(r2.day, 2);
assert.equal(r2.comparison.revenue.delta, 600);
assert.ok(r2.avg7.revenue > 3000 && r2.avg7.revenue < 3600);
assert.ok(r2.actions.some(x => x.routeId === 'staff'), '排队/低覆盖必须给员工或排班行动建议');

const beforeCount = reports.history('shop_v122', 30).length;
const duplicate = reports.capture('shop_v122', d2.brief);
assert.equal(duplicate.ok, true);
assert.equal(duplicate.existing, true, '同一营业日不得重复生成日报');
assert.equal(reports.history('shop_v122', 30).length, beforeCount);

const pending = reports.pendingActions('shop_v122');
assert.ok(pending.length > 0);
assert.equal(reports.markActionViewed('shop_v122', pending[0].id), true);
assert.equal(reports.pendingActions('shop_v122')[0].viewed, true);

console.log('operatingReportSystemV122.test.js passed');
