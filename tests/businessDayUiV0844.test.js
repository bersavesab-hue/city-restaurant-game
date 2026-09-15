'use strict';

const assert =
  require('assert');

const fs =
  require('fs');

const path =
  require('path');

const storage =
  new Map();

globalThis.GameRuntime = {
  api:{
    showToast() {},
    showModal(options) {
      options.success({
        confirm:true
      });
    },
    setStorageSync(key, value) {
      storage.set(key, value);
    },
    getStorageSync(key) {
      return storage.has(key)
        ? storage.get(key)
        : null;
    },
    removeStorageSync(key) {
      storage.delete(key);
    }
  }
};

const ROOT =
  path.resolve(
    __dirname,
    '..'
  );

const gameState =
  require('../src/core/gameState.js');

const operations =
  require('../src/operations/operationsStoreV080.js');

const businessScene =
  require('../src/scenes/businessScene.js');

gameState.reset();

gameState.addShop({
  id:'shop_v0844_ui',
  name:'日结接线测试店',
  status:'trial_opening',
  districtId:'university',
  monthlyRent:9000,
  usableArea:90,
  trialOpenedDay:1
});

const runtime =
  operations
    .getRuntime(
      'shop_v0844_ui'
    );

assert.ok(runtime);

operations
  .autoRestock(
    'shop_v0844_ui'
  );

businessScene.buttons = [
  {
    id:'day:start',
    x:0,
    y:0,
    w:100,
    h:50
  }
];

assert.ok(
  businessScene
    .handleTap(
      20,
      20
    )
);

assert.equal(
  operations
    .operatingDaySnapshot(
      'shop_v0844_ui'
    )
    .status,
  'open'
);

const visit =
  operations
    .simulateCustomerVisit(
      'shop_v0844_ui',
      null,
      {
        districtId:'university',
        hour:12,
        staffCoverage:1
      }
    );

assert.ok(
  visit.ok,
  '营业日入口接通后必须能记录真实顾客消费'
);

businessScene.buttons = [
  {
    id:'day:close',
    x:0,
    y:0,
    w:100,
    h:50
  }
];

assert.ok(
  businessScene
    .handleTap(
      20,
      20
    )
);

const closed =
  operations
    .operatingDaySnapshot(
      'shop_v0844_ui'
    );

assert.equal(
  closed.status,
  'closed'
);

assert.ok(
  closed.latestClosed &&
  closed.latestClosed.financial.orders >=
    1
);

businessScene.buttons = [
  {
    id:'day:diagnose',
    x:0,
    y:0,
    w:100,
    h:50
  }
];

assert.ok(
  businessScene
    .handleTap(
      20,
      20
    )
);

assert.ok(
  operations
    .playtestHealthOverview(
      'shop_v0844_ui'
    )
    .latest
);

const businessSource =
  fs.readFileSync(
    path.join(
      ROOT,
      'src/scenes/businessScene.js'
    ),
    'utf8'
  );

const storeSource =
  fs.readFileSync(
    path.join(
      ROOT,
      'src/scenes/storeScene.js'
    ),
    'utf8'
  );

assert.ok(
  businessSource.includes(
    'renderOperatingDay'
  ) &&
  businessSource.includes(
    "id:'day'"
  ) &&
  businessSource.includes(
    "'trial_opening'"
  ) &&
  businessSource.includes(
    '.dashboard('
  ) &&
  businessSource.includes(
    "'day:improve:'"
  ) &&
  businessSource.includes(
    'entryRouter'
  ) &&
  businessSource.includes(
    '首要问题：'
  ) &&
  businessSource.includes(
    '经营趋势：'
  ) &&
  businessSource.includes(
    '调整效果：'
  ) &&
  businessSource.includes(
    '.operatingDayHistory('
  ),
  '试营业必须能进入营业日、读取真实经营数据，并从日结直达第一次经营改善'
);

assert.ok(
  storeSource.includes(
    "'module:day'"
  ) &&
  storeSource.includes(
    "? 'day'"
  )
);

console.log(
  'V0.8.44 business day UI wiring tests passed'
);
