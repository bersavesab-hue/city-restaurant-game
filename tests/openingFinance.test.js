'use strict';

const assert =
  require('assert');

const gameState =
  require('../src/core/gameState.js');

const openingFinanceSystem =
  require('../src/finance/openingFinanceSystem.js');

function addShop(
  id,
  area,
  rent,
  cash
) {
  gameState.reset();
  gameState.setCash(
    cash
  );

  gameState.addShop({
    id,
    name:
      '测试门店',
    districtId:
      'cbd',
    streetId:
      'lab',
    address:
      '测试街1号',
    status:
      'leased_pending_renovation',
    grossArea:
      area * 1.1,
    usableArea:
      area,
    seatEstimate:
      Math.max(
        10,
        Math.round(
          area / 2.8
        )
      ),
    floor:
      '1层',
    monthlyRent:
      rent,
    freeRentDays:
      10,
    depositMonths:
      2,
    paymentMonths:
      3,
    leaseYears:
      3,
    transferFee:
      0,
    brokerFee:
      0,
    upfrontPaid:
      0
  });
}

for (
  const scenario of [
    ['small', 35, 3500, 32000],
    ['standard', 80, 6500, 20000],
    ['large', 150, 10500, 8000]
  ]
) {
  addShop(
    'finance_' +
      scenario[0],
    scenario[1],
    scenario[2],
    scenario[3]
  );

  const status =
    openingFinanceSystem
      .getRecoveryStatus(
        'finance_' +
          scenario[0]
      );

  assert.ok(
    status,
    '必须生成开店资金状态'
  );

  assert.ok(
    status.canRecover,
    scenario[0] +
      ' 门店必须存在可恢复资金路径'
  );

  if (
    status.gap >
    0
  ) {
    const result =
      openingFinanceSystem
        .acceptOffer(
          'finance_' +
            scenario[0]
        );

    assert.ok(
      result.ok,
      '资金缺口存在时应可申请周转金'
    );

    assert.ok(
      gameState
        .getPlayer()
        .cash >
        scenario[3],
      '周转金应真实进入现金'
    );
  }
}

console.log(
  'opening finance recovery tests passed'
);
