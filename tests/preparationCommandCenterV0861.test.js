'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const storeSource = fs.readFileSync(path.join(ROOT, 'src/scenes/storeScene.js'), 'utf8');
const prepSource = fs.readFileSync(path.join(ROOT, 'src/opening/openingPrepSystem.js'), 'utf8');

for (const token of [
  'V0861_PREPARATION_COMMAND_CENTER_UI',
  '门店筹备中心 · 四线并行',
  '开店进度 · 开业准备度',
  '今日重点 · 下一步建议',
  '可并行推进 ',
  '等待中',
  '阻塞开业',
  '筹备资金'
]) {
  assert.ok(storeSource.includes(token), '筹备中心UI缺失：' + token);
}

for (const token of [
  'V0861_PREPARATION_COMMAND_CENTER_SYSTEM',
  'getPreparationBoard(',
  "state:'waiting'",
  'parallelCount:',
  'immediateCashGap:',
  'actionableRows'
]) {
  assert.ok(prepSource.includes(token), '筹备指挥系统缺失：' + token);
}

assert.ok(!storeSource.includes("'module:renovation'"), '不能破坏动态装修路由规则');

globalThis.GameRuntime = {
  api:{
    getSystemInfoSync(){ return { windowWidth:390, windowHeight:780 }; },
    showToast(){},
    setStorageSync(){},
    getStorageSync(){ return null; }
  },
  requestRender(){}
};

const gameState = require('../src/core/gameState.js');
const renovationSystem = require('../src/renovation/renovationSystem.js');
const prep = require('../src/opening/openingPrepSystem.js');

gameState.reset();
gameState.setCash(1000000);
gameState.addShop({
  id:'v0861_parallel_shop',
  name:'并行筹备测试店',
  districtId:'university',
  streetId:'parallel_test',
  address:'学府路61号',
  status:'leased_pending_renovation',
  grossArea:138,
  usableArea:118,
  seatEstimate:36,
  floor:'1层',
  electricCapacityKw:40,
  greaseTrap:true,
  fireSprinkler:true,
  monthlyRent:9800,
  freeRentDays:10,
  depositMonths:2,
  paymentMonths:3,
  leaseYears:5,
  transferFee:0,
  brokerFee:0,
  upfrontPaid:30000
});

renovationSystem.ensurePlan('v0861_parallel_shop');

let board = prep.getPreparationBoard('v0861_parallel_shop');
assert.equal(board.version, '0.8.61');
assert.equal(board.workstreams.length, 4);
assert.ok(board.parallelCount >= 3, '签约后至少装修、设备、招聘应可并行推进');
assert.ok(board.workstreams.some(row => row.id === 'equipment' && row.state === 'available'));
assert.ok(board.workstreams.some(row => row.id === 'staff' && row.state === 'available'));
assert.ok(board.workstreams.some(row => row.id === 'license' && row.state === 'available'), '主体登记/招牌备案应允许提前办理');

const earlyPermit = prep.applyPermit('v0861_parallel_shop', 'business');
assert.ok(earlyPermit.ok, '主体登记应可在装修完成前提前提交');

const equipmentOrder = prep.orderEquipment('v0861_parallel_shop');
assert.ok(equipmentOrder.ok, '设备应可在装修完成前提前下单');

const staffBefore = prep.getStaffOverview('v0861_parallel_shop');
const candidate = staffBefore.candidates[0];
assert.ok(candidate, '筹备阶段应有招聘候选人');
assert.ok(prep.hireCandidate('v0861_parallel_shop', candidate.id).ok, '装修完成前应可提前招聘');

board = prep.getPreparationBoard('v0861_parallel_shop');
assert.ok(board.waiting.some(row => row.id === 'equipment'), '设备下单后应进入等待事项');
assert.ok(board.waiting.some(row => row.id === 'license'), '证照提交后应进入等待事项');
assert.ok(board.blockers.length > 0, '未完成装修时必须明确显示开业阻塞项');
assert.ok(board.focus && board.focus.id, '每天必须给出明确今日重点');

console.log('V0.8.61 preparation command center tests passed');
