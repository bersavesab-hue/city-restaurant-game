'use strict';
const assert=require('assert');
const gameState=require('../src/core/gameState.js');
const health=require('../src/diagnostics/playtestHealthV0842.js');

gameState.reset();
gameState.addShop({id:'shop_health',status:'open'});

let result=health.record('shop_health',{
  runtimeExists:true,activeMenuCount:4,featuredMissing:false,staffCount:5,inventoryAlerts:1,
  cash:25000,creditAvailable:true,tensionScore:55,openViolations:0,
  flowDiagnosis:{ok:true},dayCycleDiagnosis:{ok:true},todayOrders:12,runtimeDay:3,shopOpen:true
});
assert.ok(result.ok);
assert.equal(result.grade,'healthy');

result=health.record('shop_health',{
  runtimeExists:true,activeMenuCount:0,featuredMissing:true,staffCount:0,inventoryAlerts:5,
  cash:0,creditAvailable:false,tensionScore:100,openViolations:2,
  flowDiagnosis:{ok:false},dayCycleDiagnosis:{ok:false},todayOrders:0,runtimeDay:5,shopOpen:true
});
assert.equal(result.ok,false);
assert.ok(result.issues.some(x=>x.code==='NO_ACTIVE_MENU'));
assert.ok(result.issues.some(x=>x.code==='CASH_DEADLOCK'));
assert.equal(result.grade,'deadlock');
assert.equal(health.overview('shop_health').checks,2);
console.log('V0.8.42 playtest health tests passed');
