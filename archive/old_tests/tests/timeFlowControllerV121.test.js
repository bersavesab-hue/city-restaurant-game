'use strict';

const assert = require('assert');
const gameState = require('../src/core/gameState.js');
const timeSystem = require('../src/core/timeSystem.js');
const schedule = require('../src/core/timeScheduleCoordinatorV0812.js');
const bus = require('../src/core/globalStateBusV0811.js');
const moduleV121 = require('../src/core/timeFlowControllerV121.js');
const simulationConfig = require('../src/core/simulationConfig.js');

gameState.reset();
bus.resetForTests();

gameState.getTime().hour = 11;
gameState.getTime().minute = 0;

gameState.addShop({
  id:'shop_24h_v121',
  name:'24小时测试店',
  status:'open',
  districtId:'university',
  businessHours:{ openHour:0, closeHour:24, twentyFourHours:true }
});

const fakeFood = {
  getOverview() {
    const now = schedule.absoluteMinute(gameState.getTime());
    return {
      activeProjects:[{
        recipeId:'r_test',
        name:'测试新菜',
        finishMinute:now + 90
      }]
    };
  }
};

const flow = moduleV121.create({
  gameState,
  timeSystem,
  timeScheduleCoordinator:schedule,
  bus,
  foodResearchSystem:fakeFood
});

flow.install();

assert.deepStrictEqual(simulationConfig.time.uiSpeeds, [1,3,8]);
assert.strictEqual(simulationConfig.time.playerBaseGameMinutesPerSecond, 12);
assert.strictEqual(simulationConfig.time.playerMaxSimulationChunkMinutes, 10);
assert.strictEqual(schedule.businessDayOrdinal({year:1,month:1,day:2,hour:3,minute:59}, 4), 1);
assert.strictEqual(schedule.businessDayOrdinal({year:1,month:1,day:2,hour:4,minute:0}, 4), 2);
assert.strictEqual(flow.isAnyShopOpen(), true, '24小时门店在任意时段都必须视为营业中');

const next = flow.getNextMilestone();
assert.ok(next, '必须能找到下一个关键节点');
assert.ok(next.at > schedule.absoluteMinute(gameState.getTime()));

const started = flow.startSmartAdvance();
assert.ok(started.ok, '智能推进必须可以启动');
assert.strictEqual(flow.isSmartAdvance(), true);
assert.ok([1,3,8].includes(timeSystem.getSpeed()));

// 人工把目标压到12分钟后，验证临近节点自动降到1×。
const now = schedule.absoluteMinute(gameState.getTime());
const originalCollect = flow.collectMilestones;
// Controller target来自启动时的真实节点；直接推进到距目标<=15分钟即可验证推荐降速。
const target = flow.getTarget();
const distance = target.at - now;
if (distance > 12) {
  timeSystem.addMinutes(distance - 12);
}
flow.beforeFrame();
assert.strictEqual(timeSystem.getSpeed(), 1, '临近15分钟内必须自动降到1×');

// 精确推进至目标；maxStepProvider必须防止跨过节点。
let stopped = null;
for (let i = 0; i < 30 && !stopped; i++) {
  timeSystem.update(1000, () => {
    stopped = flow.afterSimulationStep() || stopped;
  });
}
assert.ok(stopped && stopped.stopped, '到达智能节点必须自动停止');
assert.strictEqual(timeSystem.isPaused(), true, '到达关键节点必须暂停');

flow.uninstall();
console.log('timeFlowControllerV121.test.js passed');
