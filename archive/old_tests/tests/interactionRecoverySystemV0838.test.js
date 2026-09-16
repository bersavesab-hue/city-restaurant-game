'use strict';

const assert =
  require('assert');

const moduleUnderTest =
  require('../src/core/interactionRecoverySystemV0838.js');

let data = {
  player:{
    cash:1000
  },
  time:{
    year:2026,
    month:1,
    day:1,
    hour:8,
    minute:0
  },
  business:{
    shops:[
      {
        id:'shop_1'
      }
    ],
    currentShopId:
      'shop_1'
  },
  progress:{}
};

const fakeState = {
  getData() {
    return data;
  },
  exportSave() {
    return JSON.parse(
      JSON.stringify(
        data
      )
    );
  },
  importSave(save) {
    data =
      JSON.parse(
        JSON.stringify(
          save
        )
      );

    return true;
  }
};

const safety =
  moduleUnderTest
    .createSafety({
      gameState:
        fakeState
    });

let result =
  safety.run(
    'safe_action',
    () => {
      data.player.cash -=
        100;

      return {
        ok:true
      };
    },
    {
      transactional:true
    }
  );

assert.ok(result.ok);
assert.equal(
  data.player.cash,
  900
);

result =
  safety.run(
    'throw_action',
    () => {
      data.player.cash =
        100;

      throw new Error(
        '测试异常'
      );
    },
    {
      transactional:true
    }
  );

assert.equal(
  result.ok,
  false
);

assert.equal(
  result.exception,
  true
);

assert.equal(
  data.player.cash,
  900,
  '异常后必须恢复事务前状态'
);

result =
  safety.run(
    'business_failure',
    () => {
      data.player.cash =
        200;

      return {
        ok:false,
        message:'失败'
      };
    },
    {
      transactional:true,
      rollbackOnFailure:true
    }
  );

assert.equal(
  result.ok,
  false
);

assert.equal(
  data.player.cash,
  900,
  '业务失败开启rollbackOnFailure后必须回滚'
);

data.player.cash =
  -15;

data.business
  .currentShopId =
  'missing';

const repaired =
  safety
    .repairCriticalState();

assert.ok(repaired.changed);

assert.equal(
  data.player.cash,
  0
);

assert.equal(
  data.business
    .currentShopId,
  'shop_1'
);

assert.ok(
  repaired
    .validation
    .ok
);

const diag =
  safety.diagnose();

assert.ok(
  diag.metrics.actions >=
  3
);

assert.ok(
  diag.metrics.exceptions >=
  1
);

assert.ok(
  diag.metrics.rollbacks >=
  2
);

assert.ok(
  diag.recentFailures
    .length >=
  1
);

console.log(
  'V0.8.38 interaction recovery tests passed'
);
