'use strict';

const assert=require('assert');
const gameState=require('../src/core/gameState.js');
const operations=require('../src/operations/operationsStoreV080.js');

gameState.reset();

gameState.addShop({
  id:'shop_v0843_integration',
  name:'营业日闭环测试店',
  status:'open',
  districtId:'university',
  monthlyRent:9000,
  usableArea:90,
  trialOpenedDay:1
});

const time=gameState.getTime();
time.year=1;
time.month=4;
time.day=12;
time.hour=11;
time.minute=0;

const runtime=operations.getRuntime('shop_v0843_integration');
assert.ok(runtime);

const restock=operations.autoRestock('shop_v0843_integration');
assert.ok(restock.orders>0,'营业日前必须能补货');

const opened=operations.startOperatingDay('shop_v0843_integration');
assert.ok(opened.ok);
assert.ok(
  opened.day &&
  opened.day.goal,
  '营业日开始时必须生成今日目标'
);
assert.equal(
  opened.day.goal.id,
  'first_order'
);

const menuItem=runtime.menu.find(x=>x.active!==false);
assert.ok(menuItem);

const price=operations.adjustMenuPrice('shop_v0843_integration',menuItem.id,1);
assert.ok(price.ok);

const visit=operations.simulateCustomerVisit('shop_v0843_integration',null,{
  districtId:'university',
  hour:12,
  staffCoverage:1
});
assert.ok(visit.ok,'真实营业日必须至少完成一次顾客消费');

const beforeClose=operations.operatingDaySnapshot('shop_v0843_integration');
assert.equal(beforeClose.status,'open');
assert.ok(beforeClose.active.visits.success>=1);

const closed=operations.closeOperatingDaySafe('shop_v0843_integration',{});
assert.ok(closed.ok,'安全日结必须成功');
assert.ok(closed.dailyBrief,'日结必须返回统一复盘');
assert.ok(
  closed.dailyBrief.goalResult,
  '日结必须结算今日目标'
);
assert.equal(
  closed.dailyBrief.goalResult.completed,
  true,
  '完成首单后首日目标必须达成'
);
assert.ok(
  operations
    .operatingDaySnapshot(
      'shop_v0843_integration'
    )
    .metrics
    .goalStreak >=
    1,
  '完成目标后必须形成连续完成记录'
);
assert.ok(Array.isArray(closed.decisionFeedback));
assert.ok(closed.balanceDiagnosis);
assert.ok(closed.playtestHealth);

const after=operations.operatingDaySnapshot('shop_v0843_integration');
assert.equal(after.status,'closed');
assert.ok(after.latestClosed);
assert.ok(after.latestClosed.financial.orders>=1);

const cycleRoot=
  gameState
    .getBusiness()
    .dailyOperatingCycle;

const cycleShop=
  cycleRoot
    .shops[
      'shop_v0843_integration'
    ];

cycleShop.history.unshift({
  id:'legacy_interrupted_day',
  version:'0.8.40',
  shopId:'shop_v0843_integration',
  day:11,
  status:'interrupted',
  baseline:{},
  visits:{},
  decisionRefs:[],
  events:[]
});

const legacySafe=
  operations
    .operatingDaySnapshot(
      'shop_v0843_integration'
    );

assert.equal(
  legacySafe.status,
  'closed',
  '中断记录不能把已日结门店误判为未完成'
);

assert.ok(
  legacySafe.latestClosed &&
  legacySafe.latestClosed.status ===
    'closed' &&
  legacySafe.latestClosed.financial,
  '旧存档存在 interrupted 历史时必须跳过并返回最近完整日结'
);

const feedback=operations.decisionFeedbackSnapshot('shop_v0843_integration');
assert.ok(feedback.recent.some(x=>x.type==='menu_price'));

const health=operations.playtestHealthSnapshot('shop_v0843_integration');
assert.equal(health.version,'0.8.42');

const balance=operations.operatingBalanceSnapshot('shop_v0843_integration');
assert.equal(balance.version,'0.8.43');

const calibration=operations.runOperatingBalanceCalibration(100,{seed:20260915});
assert.ok(calibration.pass);
assert.equal(calibration.total,100);

console.log('V0.8.40-0.8.43 operating day integration tests passed');
