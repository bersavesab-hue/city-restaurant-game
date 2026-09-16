'use strict';

const assert = require('assert');
const gameState = require('../src/core/gameState.js');
const schedule = require('../src/operations/operationsScheduleV087.js');
const restaurantSimulation = require('../src/operations/restaurantSimulationV081.js');

gameState.reset();

gameState.addShop({
  id:'shop_24h_ops_v121',
  name:'全天营业店',
  status:'open',
  districtId:'university',
  usableArea:90,
  grossArea:100,
  monthlyRent:5000,
  businessHours:{ openHour:0, closeHour:24, twentyFourHours:true }
});

const shop = gameState.getBusiness().shops[0];

const enabled = schedule.setTwentyFourHours(shop.id, true);
assert.ok(enabled.ok, '必须支持开启24小时营业');
assert.strictEqual(enabled.businessHours.twentyFourHours, true);
assert.strictEqual(schedule.isOpenAt(shop.id, {year:1,month:4,day:12,hour:2,minute:30}), true);
assert.strictEqual(schedule.isOpenAt(shop.id, {year:1,month:4,day:12,hour:14,minute:0}), true);
assert.strictEqual(schedule.isOpenAt(shop.id, {year:1,month:4,day:12,hour:23,minute:59}), true);
assert.strictEqual(restaurantSimulation.isWithinBusinessHours(shop, {year:1,month:4,day:12,hour:3,minute:0}), true);

// 注入最小员工数据，验证夜班跨午夜。
gameState.getOpeningPrep().staffing[shop.id] = {
  candidateDay:null,
  candidates:[],
  hired:[{id:'n1',name:'夜班员工',roleId:'server',roleName:'服务员',wage:4500}]
};
const state = schedule.ensureShop(shop.id);
schedule.setEmployeeShift(shop.id, 'n1', 'night');
schedule.setEmployeeOffDay(shop.id, 'n1', 6);
assert.strictEqual(schedule.isWorking(shop.id, state.employees.n1, {year:1,month:4,day:12,hour:23,minute:0}), true);
assert.strictEqual(schedule.isWorking(shop.id, state.employees.n1, {year:1,month:4,day:13,hour:2,minute:0}), true);
assert.strictEqual(schedule.isWorking(shop.id, state.employees.n1, {year:1,month:4,day:13,hour:12,minute:0}), false);

console.log('twentyFourHourOperationsV121.test.js passed');
