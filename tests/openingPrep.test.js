'use strict';

const assert =
  require('assert');

const gameState =
  require('../src/core/gameState.js');

const renovationSystem =
  require('../src/renovation/renovationSystem.js');

const openingPrepSystem =
  require('../src/opening/openingPrepSystem.js');

const openingConfig =
  require('../src/opening/openingConfig.js');

function advanceDays(days) {
  gameState
    .getTime()
    .day +=
    days;
}

function run() {
  gameState.reset();

  gameState.setCash(
    1000000
  );

  gameState.addShop({
    id:
      'shop_opening_test',

    name:
      '春风酒楼',

    districtId:
      'university',

    streetId:
      'uni_test',

    address:
      '学府路88号',

    status:
      'renovated_pending_license',

    grossArea:
      180,

    usableArea:
      150,

    seatEstimate:
      56,

    floor:
      '1层',

    electricCapacityKw:
      10,

    greaseTrap:
      false,

    fireSprinkler:
      false,

    monthlyRent:
      12000,

    freeRentDays:
      12,

    depositMonths:
      2,

    paymentMonths:
      3,

    leaseYears:
      5,

    transferFee:
      0,

    brokerFee:
      0,

    upfrontPaid:
      50000
  });

  renovationSystem
    .ensurePlan(
      'shop_opening_test'
    );

  gameState
    .getRenovations()[
      'shop_opening_test'
    ]
    .status =
    'completed';

  const quote =
    openingPrepSystem
      .getEquipmentQuote(
        'shop_opening_test'
      );

  assert.ok(
    quote.total > 0,
    '设备报价必须动态生成'
  );

  assert.ok(
    quote.capacityRatio >=
      0.9,
    '默认设备方案应覆盖基础营业承载'
  );

  assert.ok(
    quote
      .infrastructureUpgradeCost >
      0,
    '低电容门店应自动计算电力增容成本'
  );

  const order =
    openingPrepSystem
      .orderEquipment(
        'shop_opening_test'
      );

  assert.ok(
    order.ok,
    '资金充足且承载合格时应可采购设备'
  );

  advanceDays(
    10
  );

  openingPrepSystem
    .updateEquipment(
      'shop_opening_test'
    );

  assert.strictEqual(
    openingPrepSystem
      .getEquipmentState(
        'shop_opening_test'
      )
      .status,
    'installed',
    '日期推进后设备应自动完成安装'
  );

  let permits =
    openingPrepSystem
      .getPermitOverview(
        'shop_opening_test'
      );

  const foodBefore =
    permits.rows.find(
      item =>
        item.id ===
        'food'
    );

  const fireBefore =
    permits.rows.find(
      item =>
        item.id ===
        'fire'
    );

  assert.ok(
    foodBefore.remediable,
    '隔油问题必须可以通过整改解决'
  );

  assert.ok(
    fireBefore.remediable,
    '消防问题必须可以通过整改解决'
  );

  assert.ok(
    openingPrepSystem
      .remediatePermit(
        'shop_opening_test',
        'food'
      )
      .ok
  );

  assert.ok(
    openingPrepSystem
      .remediatePermit(
        'shop_opening_test',
        'fire'
      )
      .ok
  );

  permits =
    openingPrepSystem
      .getPermitOverview(
        'shop_opening_test'
      );

  assert.ok(
    permits.rows.find(
      item =>
        item.id ===
        'food'
    ).ready,
    '整改后食品许可条件应恢复'
  );

  assert.ok(
    permits.rows.find(
      item =>
        item.id ===
        'fire'
    ).ready,
    '整改后消防条件应恢复'
  );

  for (
    const row of
    permits.rows
  ) {
    const result =
      openingPrepSystem
        .applyPermit(
          'shop_opening_test',
          row.id
        );

    assert.ok(
      result.ok,
      '可办理证照应可提交：' +
        row.id
    );
  }

  advanceDays(
    12
  );

  openingPrepSystem
    .updatePermits(
      'shop_opening_test'
    );

  const permitStore =
    gameState
      .getOpeningPrep()
      .permits[
        'shop_opening_test'
      ];

  for (
    const permit of
    openingConfig.permits
  ) {
    const item =
      permitStore.items[
        permit.id
      ];

    assert.notStrictEqual(
      item.status,
      'applying',
      '审核期结束后不能永久停留在审核中'
    );

    item.status =
      'approved';

    item.issue =
      null;
  }

  let staff =
    openingPrepSystem
      .getStaffOverview(
        'shop_opening_test'
      );

  const firstCandidateIds =
    staff.candidates.map(
      item =>
        item.id
    );

  advanceDays(
    1
  );

  openingPrepSystem
    .refreshCandidates(
      'shop_opening_test'
    );

  staff =
    openingPrepSystem
      .getStaffOverview(
        'shop_opening_test'
      );

  assert.notDeepStrictEqual(
    staff.candidates.map(
      item =>
        item.id
    ),
    firstCandidateIds,
    '候选人才应随日期动态刷新'
  );

  let guard =
    0;

  while (
    staff.coverage <
      0.9 &&
    guard <
      30
  ) {
    const neededRole =
      openingConfig
        .roles
        .find(
          role =>
            (
              staff.current[
                role.id
              ] ||
              0
            ) <
            staff.required[
              role.id
            ]
        );

    assert.ok(
      neededRole,
      '覆盖率不足时应存在缺员岗位'
    );

    const candidate =
      staff.candidates
        .filter(
          item =>
            item.roleId ===
            neededRole.id
        )
        .sort(
          (
            a,
            b
          ) =>
            b.score -
            a.score
        )[0];

    assert.ok(
      candidate,
      '缺员岗位必须存在候选人'
    );

    assert.ok(
      openingPrepSystem
        .hireCandidate(
          'shop_opening_test',
          candidate.id
        )
        .ok,
      '候选人应可录用'
    );

    staff =
      openingPrepSystem
        .getStaffOverview(
          'shop_opening_test'
        );

    guard +=
      1;
  }

  assert.ok(
    staff.coverage >=
      0.9,
    '招聘后应达到基础班组覆盖率'
  );

  const readiness =
    openingPrepSystem
      .getReadiness(
        'shop_opening_test'
      );

  assert.ok(
    readiness.ready,
    '装修、设备、证照、人员齐备后应进入试营业准备状态'
  );

  assert.strictEqual(
    openingPrepSystem
      .getShop(
        'shop_opening_test'
      )
      .status,
    'ready_for_trial'
  );

  const save =
    gameState
      .exportSave();

  gameState.reset();

  assert.ok(
    gameState
      .importSave(
        save
      )
  );

  assert.ok(
    gameState
      .getOpeningPrep()
      .equipment[
        'shop_opening_test'
      ],
    '开业筹备数据必须写入存档'
  );

  console.log(
    'opening preparation tests passed'
  );
}

run();
