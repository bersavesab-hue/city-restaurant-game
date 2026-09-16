'use strict';

const assert =
  require('assert');

globalThis.GameRuntime =
  globalThis.GameRuntime ||
  {
    api:{
      getSystemInfoSync() {
        return {
          windowWidth:390,
          windowHeight:780,
          pixelRatio:1
        };
      }
    }
  };

const gameState =
  require('../src/core/gameState.js');

const openingPrepSystem =
  require('../src/opening/openingPrepSystem.js');

const openingConfig =
  require('../src/opening/openingConfig.js');

const liveWorldSystem =
  require('../src/world/liveWorldSystemV084.js');

gameState.reset();

gameState
  .getSimulation()
  .seed =
  20260914;

const business =
  gameState
    .getBusiness();

business.shops = [
  {
    id:'shop_v084',
    name:'V084测试店',
    status:'open',
    districtId:'university',
    seatEstimate:36,
    monthlyRent:12000
  }
];

business.hasShop =
  true;

business.currentShopId =
  'shop_v084';

const role =
  openingConfig
    .roles
    .find(
      row =>
        row.id ===
        'manager'
    );

const candidate =
  openingPrepSystem
    .generateCandidate(
      'shop_v084',
      role,
      0,
      10
    );

assert.ok(
  candidate
    .personProfile,
  '候选人必须有完整人物档案'
);

assert.ok(
  Array.isArray(
    candidate
      .personalityLabels
  ) &&
  candidate
    .personalityLabels
    .length >
    0,
  '候选人必须有可读性格'
);

assert.strictEqual(
  candidate
    .personProfile
    .currentRole,
  'manager',
  '候选人的人物角色应与招聘岗位一致'
);

const prep =
  gameState
    .getOpeningPrep();

prep.staffing.shop_v084 = {
  hired:[
    {
      ...candidate,
      id:'staff_v084_manager',
      personId:
        candidate
          .personProfile
          .id,
      hiredDay:1,
      signOnCost:0
    }
  ],
  candidateDay:10,
  candidates:[]
};

liveWorldSystem.reset();

const state =
  liveWorldSystem
    .initialize(
      10
    );

assert.ok(
  state
    .competitors
    .length >=
    300,
  '城市竞品世界应真实初始化300个以上经营主体'
);

assert.ok(
  state
    .competitors
    .some(
      row =>
        row
          .simulationTier ===
        'core'
    ),
  '必须存在核心竞品'
);

const before =
  liveWorldSystem
    .getDistrictDashboard(
      'university'
    );

assert.ok(
  before
    .competitorCount >
    0,
  '大学城应有实际竞品门店'
);

const tick =
  liveWorldSystem
    .processDay(
      10
    );

assert.ok(
  tick &&
  tick.districtPressure,
  '每日活人世界推进必须返回商圈压力'
);

const staff =
  prep
    .staffing
    .shop_v084
    .hired[0];

assert.ok(
  staff.live &&
  Number.isFinite(
    staff.live.mood
  ),
  '员工必须经过每日情绪状态推进'
);

assert.ok(
  Number.isFinite(
    staff.live
      .turnoverRisk
  ),
  '员工必须有真实离职风险'
);

assert.ok(
  Number.isFinite(
    staff.live
      .entrepreneurship
  ),
  '员工必须有创业倾向'
);

const people =
  liveWorldSystem
    .getStaffSummary(
      'shop_v084'
    );

assert.strictEqual(
  people.count,
  1,
  '员工汇总数量必须正确'
);

const modifier =
  liveWorldSystem
    .getStaffModifier(
      'shop_v084'
    );

assert.ok(
  modifier
    .capacityMultiplier >=
    0.72 &&
  modifier
    .capacityMultiplier <=
    1.08,
  '员工状态对产能的影响必须有限幅'
);

const market =
  liveWorldSystem
    .getDistrictDashboard(
      'university'
    );

assert.ok(
  market
    .playerDemandMultiplier >=
    0.86 &&
  market
    .playerDemandMultiplier <=
    1.02,
  '竞品对玩家客流影响必须有限幅'
);

assert.ok(
  market
    .intensity >=
    0 &&
  market
    .intensity <=
    100,
  '竞争强度必须标准化'
);

const top =
  liveWorldSystem
    .getTopCompetitors(
      'university',
      5
    );

assert.ok(
  top.length >
  0,
  '必须能查询本商圈真实竞品'
);

console.log(
  'V0.8.4 live people/competitor world tests passed'
);
