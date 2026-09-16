'use strict';
const assert=require('assert');
const gameState=require('../src/core/gameState.js');
const system=require('../src/operations/dailyOperatingCycleV0840.js');

gameState.reset();
gameState.addShop({id:'shop_day',status:'open'});

let r=system.beginDay('shop_day',5,{day:5,cash:50000,rating:4.1,inventoryAlerts:2,tensionScore:55});
assert.ok(r.ok);
assert.equal(r.day.status,'open');

system.recordVisit('shop_day',5,{
  ok:true,
  visit:{partySize:2},
  settlement:{revenue:88,contribution:43}
});
system.recordVisit('shop_day',5,{ok:false,reason:'缺货'});

const fin={
  day:5,
  financial:{
    revenue:88,profit:-12,totalCost:100,foodCost:38,labor:30,rent:20,utilities:4,marketing:4,compliance:0,waste:4,
    orders:1,customers:2,avgTicket:88,foodCostRate:43.2,profitRate:-13.6
  }
};

r=system.finalizeDay('shop_day',5,fin,{day:6,cash:49900,rating:4,inventoryAlerts:3,tensionScore:65},{
  regulatory:{openViolations:0}
});
assert.ok(r.ok);
assert.equal(r.brief.status,'closed');
assert.equal(r.brief.visits.success,1);
assert.equal(r.brief.visits.failed,1);
assert.ok(r.brief.reasons.some(x=>x.code==='LOSS_DAY'));
assert.ok(r.brief.reasons.some(x=>x.code==='FOOD_COST_HIGH'));
assert.ok(r.brief.nextActions.length>0);

const again=system.finalizeDay('shop_day',5,fin,{cash:1},{});
assert.ok(again.existing);
assert.equal(system.history('shop_day',10).length,1);

const check=system.safeCloseCheck('shop_day',6,{orders:0,customers:0});
assert.equal(check.allowed,false);
assert.equal(check.code,'NO_DAY_ACTIVITY');

assert.ok(system.diagnose('shop_day').ok);
console.log('V0.8.40 daily operating cycle tests passed');
