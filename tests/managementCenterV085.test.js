'use strict';

const assert =
  require('assert');

globalThis.GameRuntime = {
  api:{
    getSystemInfoSync() {
      return {
        windowWidth:390,
        windowHeight:780,
        pixelRatio:1
      };
    },
    showToast() {}
  }
};

const gameState =
  require('../src/core/gameState.js');

const liveWorldSystem =
  require('../src/world/liveWorldSystemV084.js');

const managementSystem =
  require('../src/world/managementWorldSystemV085.js');

const businessScene =
  require('../src/scenes/businessScene.js');

gameState.reset();

gameState
  .getSimulation()
  .seed =
  85001;

gameState
  .getBusiness()
  .shops = [
    {
      id:'shop_v085',
      name:'管理中心测试店',
      status:'open',
      districtId:'university',
      seatEstimate:36,
      monthlyRent:12000
    }
  ];

gameState
  .getBusiness()
  .hasShop =
  true;

gameState
  .getBusiness()
  .currentShopId =
  'shop_v085';

const prep =
  gameState
    .getOpeningPrep();

prep.staffing.shop_v085 = {
  candidateDay:null,
  candidates:[],
  hired:[
    {
      id:'staff_v085',
      personId:'person_v085',
      name:'周安',
      age:29,
      roleId:'manager',
      wage:7200,
      skill:66,
      hiredDay:1,
      personalityLabels:[
        '沉着',
        '上进'
      ],
      personProfile:{
        id:'person_v085',
        name:'周安',
        personalityLabels:[
          '沉着',
          '上进'
        ],
        skills:{
          management:66,
          operations:64,
          leadership:58
        },
        state:{
          mood:60,
          energy:55,
          stress:62,
          satisfaction:58,
          loyalty:54
        }
      },
      live:{
        mood:60,
        energy:55,
        stress:62,
        satisfaction:58,
        loyalty:54,
        turnoverRisk:52,
        entrepreneurship:20
      }
    }
  ]
};

gameState
  .setCash(
    50000
  );

liveWorldSystem.reset();

liveWorldSystem.initialize(
  10
);

const roster =
  managementSystem
    .getStaffRoster(
      'shop_v085'
    );

assert.strictEqual(
  roster.length,
  1,
  '员工管理页必须读到真实员工'
);

assert.strictEqual(
  roster[0].turnoverRisk,
  52,
  '离职风险必须来自实时人物状态'
);

const beforeCash =
  gameState
    .getPlayer()
    .cash;

const train =
  managementSystem
    .manageStaff(
      'shop_v085',
      'staff_v085',
      'train'
    );

assert.ok(
  train.ok,
  '培训操作必须成功'
);

assert.ok(
  gameState
    .getPlayer()
    .cash <
  beforeCash,
  '培训必须真实消耗资金'
);

assert.ok(
  prep.staffing
    .shop_v085
    .hired[0]
    .skill >
  66,
  '培训必须真实提高技能'
);

const raise =
  managementSystem
    .manageStaff(
      'shop_v085',
      'staff_v085',
      'raise'
    );

assert.ok(
  raise.ok,
  '调薪操作必须成功'
);

assert.ok(
  prep.staffing
    .shop_v085
    .hired[0]
    .wage >
  7200,
  '调薪必须改变后续工资'
);

const rest =
  managementSystem
    .manageStaff(
      'shop_v085',
      'staff_v085',
      'rest'
    );

assert.ok(
  rest.ok,
  '安排休息必须成功'
);

assert.ok(
  prep.staffing
    .shop_v085
    .hired[0]
    .live
    .stress <
  62,
  '休息必须真实降低压力'
);

const competitors =
  managementSystem
    .getCompetitors(
      'university',
      10
    );

assert.ok(
  competitors.length >
  0,
  '竞品中心必须有真实商圈竞品'
);

assert.ok(
  competitors.every(
    row =>
      Number.isFinite(
        row.score
      ) &&
      typeof row.actionName ===
        'string'
  ),
  '竞品必须有动态实力和动作'
);

const ranking =
  managementSystem
    .getDistrictRanking(
      'university',
      'shop_v085',
      12
    );

assert.ok(
  ranking.some(
    row =>
      row.isPlayer
  ),
  '排行榜必须包含玩家门店'
);

const playerRank =
  ranking.find(
    row =>
      row.isPlayer
  );

assert.ok(
  playerRank &&
  Number.isInteger(
    playerRank.rank
  ) &&
  playerRank.rank >=
  1,
  '玩家即使跌出榜单可视范围，也必须显示真实名次'
);

assert.strictEqual(
  new Set(
    ranking.map(
      row =>
        row.id
    )
  ).size,
  ranking.length,
  '排行榜不能重复插入玩家或竞品'
);

assert.ok(
  [
    'overview',
    'staff',
    'competitor',
    'rank'
  ].includes(
    businessScene.tab
  ),
  '经营管理页必须加载'
);

console.log(
  'V0.8.5 management center tests passed'
);
