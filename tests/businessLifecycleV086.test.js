'use strict';

const assert =
  require('assert');

const fs =
  require('fs');

const path =
  require('path');

const ROOT =
  path.resolve(
    __dirname,
    '..'
  );

const gameState =
  require('../src/core/gameState.js');

const lifecycle =
  require('../src/core/businessLifecycleV086.js');

const renovationSystem =
  require('../src/renovation/renovationSystem.js');

const openingPrepSystem =
  require('../src/opening/openingPrepSystem.js');

gameState.reset();

gameState
  .setCash(
    150000
  );

gameState
  .addShop({
    id:'shop_v086',
    name:'闭环测试店',
    status:'leased_pending_renovation',
    districtId:'university',
    usableArea:80,
    grossArea:90,
    monthlyRent:3000,
    freeRentDays:5,
    paymentMonths:1,
    depositMonths:2,
    leaseYears:3,
    annualIncrease:0.03,
    seatEstimate:28
  });

const shop =
  gameState
    .getBusiness()
    .shops[0];

renovationSystem
  .ensurePlan(
    shop.id
  );

gameState
  .getRenovations()[
    shop.id
  ].status =
  'completed';

assert.equal(
  lifecycle
    .deriveStage(
      shop
    ),
  'awaiting_equipment',
  '装修后必须先进入设备阶段'
);

const equipment =
  openingPrepSystem
    .ensureEquipment(
      shop.id
    );

equipment.status =
  'installed';

assert.ok(
  [
    'awaiting_permits',
    'permits_reviewing'
  ].includes(
    lifecycle
      .deriveStage(
        shop
      )
  ),
  '设备后必须进入证照阶段'
);

const permitState =
  openingPrepSystem
    .getPermitState(
      shop.id
    );

for (
  const id
  of Object.keys(
    permitState.items
  )
) {
  permitState
    .items[
      id
    ].status =
    'approved';

  permitState
    .items[
      id
    ].issue =
    null;
}

assert.equal(
  lifecycle
    .deriveStage(
      shop
    ),
  'awaiting_staff',
  '证照后必须进入招聘阶段'
);

const staff =
  openingPrepSystem
    .getStaffState(
      shop.id
    );

staff.hired = [
  {
    id:'m1',
    roleId:'manager',
    wage:7200
  },
  {
    id:'c1',
    roleId:'chef',
    wage:6800
  },
  {
    id:'s1',
    roleId:'server',
    wage:4200
  },
  {
    id:'s2',
    roleId:'server',
    wage:4200
  },
  {
    id:'k1',
    roleId:'cashier',
    wage:4300
  }
];

assert.equal(
  lifecycle
    .deriveStage(
      shop
    ),
  'ready_for_trial',
  '招聘完成后必须进入待试营业'
);

const trial =
  lifecycle
    .startTrialOpening(
      shop.id
    );

assert.ok(
  trial.ok,
  '筹备完成后必须能开始试营业'
);

assert.equal(
  shop.status,
  'trial_opening',
  '试营业不能直接变成正式营业'
);

assert.equal(
  shop.trialEndDay -
  shop.trialOpenedDay,
  3,
  '试营业固定3个游戏日'
);

const day =
  shop.trialEndDay;

gameState
  .getRestaurantOperations()
  .shops[
    shop.id
  ] = {
    dailySnapshots:[
      {
        day:
          day -
          3,
        financial:{
          revenue:5000,
          profit:700,
          orders:45,
          customers:62
        }
      },
      {
        day:
          day -
          3,
        financial:{
          revenue:99999,
          profit:99999,
          orders:999,
          customers:999
        }
      },
      {
        day:
          day -
          2,
        financial:{
          revenue:6200,
          profit:900,
          orders:53,
          customers:70
        }
      },
      {
        day:
          day -
          1,
        financial:{
          revenue:7100,
          profit:1200,
          orders:60,
          customers:78
        }
      }
    ],
    shop:{
      rating:4.3
    }
  };

gameState
  .getFinance()
  .openingLoans[
    shop.id
  ] = {
    principal:12000,
    outstanding:12000,
    annualRate:0.10,
    termMonths:3,
    monthlyPayment:4000,
    status:'active',
    paidMonths:0,
    nextPaymentDay:
      day
  };

gameState
  .getPropertyProcess()
  .leases
  .lease_v086 = {
    shopId:
      shop.id,
    day:
      day -
      100,
    terms:{
      monthlyRent:3000,
      freeRentDays:5,
      paymentMonths:1,
      depositMonths:2,
      leaseYears:3,
      annualIncrease:0.03
    },
    upfront:{
      deposit:6000,
      rentAdvance:3000
    },
    lifecycle:{
      status:'active',
      startDay:
        day -
        100,
      freeRentEndDay:
        day -
        95,
      endDay:
        day +
        995,
      nextRentDay:
        day,
      arrears:0,
      rentPayments:0,
      renewals:0
    }
  };

const beforeCash =
  gameState
    .getPlayer()
    .cash;

assert.ok(
  lifecycle
    .processDay(
      day
    ),
  '关键日必须产生生命周期变化'
);

assert.equal(
  shop.status,
  'trial_complete',
  '试营业结束后必须停在复盘状态'
);

assert.equal(shop.trialReport.days,3,'试营业复盘必须按3个不同营业日统计');
assert.equal(
  shop.trialReport.revenue,
  18300,
  '同一天重复快照不能重复计入试营业收入'
);

assert.equal(
  gameState
    .getFinance()
    .openingLoans[
      shop.id
    ].outstanding,
  8000,
  '贷款到期必须真实扣月供'
);

assert.equal(
  gameState
    .getPropertyProcess()
    .leases
    .lease_v086
    .lifecycle
    .rentPayments,
  1,
  '租金到期必须真实扣款'
);

assert.equal(
  beforeCash -
  gameState
    .getPlayer()
    .cash,
  7000,
  '同一天必须扣4000月供和3000租金'
);

const formal =
  lifecycle
    .formalOpen(
      shop.id
    );

assert.ok(
  formal.ok,
  '复盘后必须允许正式开业'
);

assert.equal(
  shop.status,
  'open',
  '正式开业后状态必须为open'
);

const loanPay =
  lifecycle
    .prepayLoan(
      shop.id,
      2000
    );

assert.ok(
  loanPay.ok &&
  loanPay.paid ===
    2000,
  '贷款必须支持提前还款'
);

assert.ok(
  lifecycle
    .renewLease(
      shop.id,
      3
    ).ok,
  '租约必须支持续租'
);

assert.equal(
  lifecycle
    .setFontScale(
      1.12
    )
    .fontScale,
  1.12,
  '大字设置必须进入存档状态'
);

const mainSource =
  fs.readFileSync(
    path.join(
      ROOT,
      'src/main.js'
    ),
    'utf8'
  );

assert.ok(
  mainSource.includes(
    "require('./scenes/systemSceneV086.js')"
  ),
  '系统按钮必须接入正式系统页'
);

assert.ok(
  mainSource.includes(
    'businessLifecycle'
  ),
  '主循环必须接入经营生命周期'
);

const restaurantSource =
  fs.readFileSync(
    path.join(
      ROOT,
      'src/operations/restaurantSimulationV081.js'
    ),
    'utf8'
  );

assert.ok(
  restaurantSource.includes("'trial_opening'") &&
  restaurantSource.includes('trialFactor') &&
  restaurantSource.includes('finalizeExternalOperatingDay') &&
  restaurantSource.includes('.startOperatingDay('),
  '试营业必须进入真实模拟，并由自动营业日统一结算'
);

const storeSource =
  fs.readFileSync(
    path.join(
      ROOT,
      'src/scenes/storeScene.js'
    ),
    'utf8'
  );

const equipmentIndex =
  storeSource.indexOf(
    "id:'equipment'"
  );

const licenseIndex =
  storeSource.indexOf(
    "id:'license'"
  );

const staffIndex =
  storeSource.indexOf(
    "id:'staff'"
  );

assert.ok(
  equipmentIndex >=
    0 &&
  licenseIndex >
    equipmentIndex &&
  staffIndex >
    licenseIndex,
  '推荐顺序必须是设备→证照→招聘'
);

const uiSource =
  fs.readFileSync(
    path.join(
      ROOT,
      'src/ui/premiumUi.js'
    ),
    'utf8'
  );

assert.ok(
  uiSource.includes(
    'fontScale'
  ),
  '大字模式必须真正影响UI字号'
);

console.log(
  'V0.8.6 business lifecycle tests passed'
);
