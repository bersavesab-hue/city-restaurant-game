'use strict';

const assert = require('assert');

const gameState =
  require('../src/core/gameState.js');

const timeSystem =
  require('../src/core/timeSystem.js');

const citySystem =
  require('../src/city/citySystem.js');

const demandSystem =
  require('../src/city/demandSystem.js');

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    gameState.reset();

    fn();

    passed += 1;

    console.log(
      '✅ ' + name
    );
  } catch (error) {
    failed += 1;

    console.error(
      '❌ ' + name
    );

    console.error(
      error.message
    );
  }
}

/* =========================
   游戏状态测试
========================= */

test(
  '初始资金应为 50000',
  function () {
    assert.strictEqual(
      gameState.getPlayer().cash,
      50000
    );
  }
);

test(
  '花费资金后余额正确',
  function () {
    const result =
      gameState.spendCash(12000);

    assert.strictEqual(
      result,
      true
    );

    assert.strictEqual(
      gameState.getPlayer().cash,
      38000
    );
  }
);

test(
  '余额不足时不能继续扣钱',
  function () {
    const result =
      gameState.spendCash(60000);

    assert.strictEqual(
      result,
      false
    );

    assert.strictEqual(
      gameState.getPlayer().cash,
      50000
    );
  }
);

/* =========================
   时间系统测试
========================= */

test(
  '10:20 应属于午餐时段',
  function () {
    const time =
      gameState.getTime();

    time.hour = 10;
    time.minute = 20;

    assert.strictEqual(
      timeSystem.getMealPeriod(),
      'lunch'
    );
  }
);

test(
  '4月30日后应进入5月1日',
  function () {
    const time =
      gameState.getTime();

    time.year = 1;
    time.month = 4;
    time.day = 30;

    timeSystem.addDays(1);

    assert.strictEqual(
      time.month,
      5
    );

    assert.strictEqual(
      time.day,
      1
    );
  }
);

test(
  '闰年2月应有29天',
  function () {
    assert.strictEqual(
      timeSystem.getDaysInMonth(
        4,
        2
      ),
      29
    );
  }
);

test(
  '普通年份2月应有28天',
  function () {
    assert.strictEqual(
      timeSystem.getDaysInMonth(
        3,
        2
      ),
      28
    );
  }
);

test(
  '23:50 加20分钟应进入第二天00:10',
  function () {
    const time =
      gameState.getTime();

    time.month = 4;
    time.day = 12;
    time.hour = 23;
    time.minute = 50;

    timeSystem.addMinutes(20);

    assert.strictEqual(
      time.day,
      13
    );

    assert.strictEqual(
      time.hour,
      0
    );

    assert.strictEqual(
      time.minute,
      10
    );
  }
);

/* =========================
   城市系统测试
========================= */

test(
  '云州市应存在',
  function () {
    const city =
      citySystem.getCity(
        'yunzhou'
      );

    assert.ok(city);

    assert.strictEqual(
      city.name,
      '云州市'
    );
  }
);

test(
  '大学城基础数据应正确',
  function () {
    const district =
      citySystem.getDistrict(
        'university'
      );

    assert.strictEqual(
      district.population,
      36300
    );

    assert.strictEqual(
      district.baseDemand,
      14820
    );

    assert.strictEqual(
      district.restaurantCount,
      126
    );
  }
);

test(
  '切换商圈后全局状态应同步',
  function () {
    const success =
      citySystem.setCurrentDistrict(
        'cbd'
      );

    assert.strictEqual(
      success,
      true
    );

    assert.strictEqual(
      gameState.getWorld()
        .currentDistrictId,
      'cbd'
    );
  }
);

/* =========================
   有限需求系统测试
========================= */

test(
  '大学城午餐需求计算正确',
  function () {
    const time =
      gameState.getTime();

    time.hour = 12;
    time.minute = 0;

    gameState.getWorld().weather =
      'sunny';

    const demand =
      demandSystem.getTotalDemand(
        'university'
      );

    /*
      14820 × 0.34
      = 5038.8
      向下取整 = 5038
    */

    assert.strictEqual(
      demand,
      5038
    );
  }
);

test(
  '大学城客群需求总和必须等于总需求',
  function () {
    const time =
      gameState.getTime();

    time.hour = 12;

    const total =
      demandSystem.getTotalDemand(
        'university'
      );

    const groups =
      demandSystem
        .getDemandByCustomerType(
          'university'
        );

    const sum =
      Object.values(groups)
        .reduce(
          function (
            result,
            item
          ) {
            return (
              result +
              item.demand
            );
          },
          0
        );

    assert.strictEqual(
      sum,
      total
    );
  }
);

test(
  '消费200个顾客后需求必须减少200',
  function () {
    const time =
      gameState.getTime();

    time.hour = 12;

    const pool =
      demandSystem.createDemandPool(
        'university'
      );

    const before =
      pool.remainingDemand;

    const consumed =
      demandSystem.consumeDemand(
        pool,
        200
      );

    assert.strictEqual(
      consumed,
      200
    );

    assert.strictEqual(
      pool.remainingDemand,
      before - 200
    );
  }
);

test(
  '餐厅不能取得超过商圈剩余需求的顾客',
  function () {
    const time =
      gameState.getTime();

    time.hour = 12;

    const pool =
      demandSystem.createDemandPool(
        'university'
      );

    const total =
      pool.totalDemand;

    const consumed =
      demandSystem.consumeDemand(
        pool,
        total + 10000
      );

    assert.strictEqual(
      consumed,
      total
    );

    assert.strictEqual(
      pool.remainingDemand,
      0
    );
  }
);

test(
  '雨天需求应低于晴天',
  function () {
    const time =
      gameState.getTime();

    time.hour = 12;

    gameState.getWorld().weather =
      'sunny';

    const sunny =
      demandSystem.getTotalDemand(
        'university'
      );

    gameState.getWorld().weather =
      'rain';

    const rain =
      demandSystem.getTotalDemand(
        'university'
      );

    assert.ok(
      rain < sunny
    );
  }
);

/* =========================
   最终结果
========================= */

console.log('');
console.log(
  '=========================='
);

console.log(
  '测试完成'
);

console.log(
  '通过：' + passed
);

console.log(
  '失败：' + failed
);

console.log(
  '=========================='
);

if (failed > 0) {
  process.exit(1);
}

process.exit(0);
