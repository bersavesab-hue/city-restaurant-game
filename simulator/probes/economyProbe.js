'use strict';

const gameState =
  require('../../src/core/gameState.js');

const renovationSystem =
  require('../../src/renovation/renovationSystem.js');

const openingFinanceSystem =
  require('../../src/finance/openingFinanceSystem.js');

function makeShop(
  id,
  usableArea,
  upfrontPaid,
  monthlyRent
) {
  return {
    id,
    name:
      '测试门店',
    districtId:
      'cbd',
    streetId:
      'lab_street',
    address:
      '玩家实验室测试铺',
    status:
      'leased_pending_renovation',
    grossArea:
      usableArea *
      1.12,
    usableArea,
    seatEstimate:
      Math.max(
        4,
        Math.round(
          usableArea /
          2.8
        )
      ),
    floor:
      '1层',
    monthlyRent,
    freeRentDays:
      15,
    depositMonths:
      2,
    paymentMonths:
      3,
    leaseYears:
      3,
    transferFee:
      Math.round(
        upfrontPaid *
        0.40
      ),
    brokerFee:
      Math.round(
        monthlyRent *
        0.5
      ),
    upfrontPaid
  };
}

function makeIssue(
  id,
  priority,
  dimension,
  title,
  detail,
  evidence,
  remediation
) {
  return {
    id,
    priority,
    dimension,
    title,
    detail,
    evidence,
    remediation
  };
}

function runEconomyProbe() {
  const issues = [];

  gameState.reset();

  const startingCash =
    gameState
      .getPlayer()
      .cash;

  const scenarios = [
    {
      name:
        '小型门店',
      usableArea:
        35,
      upfrontPaid:
        18000,
      monthlyRent:
        3500
    },
    {
      name:
        '标准门店',
      usableArea:
        80,
      upfrontPaid:
        30000,
      monthlyRent:
        6500
    },
    {
      name:
        '中大型门店',
      usableArea:
        150,
      upfrontPaid:
        42000,
      monthlyRent:
        10500
    }
  ];

  const results = [];

  for (
    let i = 0;
    i <
    scenarios.length;
    i++
  ) {
    gameState.reset();

    const scenario =
      scenarios[i];

    const shop =
      makeShop(
        'lab_shop_' +
          i,
        scenario.usableArea,
        scenario.upfrontPaid,
        scenario.monthlyRent
      );

    gameState.addShop(
      shop
    );

    const renovation =
      renovationSystem
        .getMetrics(
          shop.id
        );

    const remaining =
      startingCash -
      scenario.upfrontPaid;

    const renovationGap =
      renovation
        ? renovation.totalCost -
          remaining
        : null;

    gameState.setCash(
      remaining
    );

    const recovery =
      openingFinanceSystem
        .getRecoveryStatus(
          shop.id
        );

    results.push({
      ...scenario,
      startingCash,
      remainingAfterLease:
        remaining,
      renovationCost:
        renovation
          ? renovation.totalCost
          : null,
      renovationGap,
      openingNeed:
        recovery
          ? recovery.totalNeed
          : null,
      financingGap:
        recovery
          ? recovery.gap
          : null,
      creditLimit:
        recovery &&
        recovery.offer
          ? recovery.offer.creditLimit
          : 0,
      canRecover:
        recovery
          ? recovery.canRecover
          : false
    });
  }

  const blocked =
    results.filter(
      item =>
        item.renovationGap !==
          null &&
        item.renovationGap >
          0 &&
        !item.canRecover
    );

  if (
    blocked.length >=
    2
  ) {
    issues.push(
      makeIssue(
        'ECONOMY_OPENING_SOFTLOCK',
        'P0',
        'economy',
        '签约后存在较高的资金软锁风险',
        '以当前初始资金和默认装修成本估算，多种常见面积门店在签约、基础装修、设备与周转金合计后仍缺少可恢复路径。',
        {
          startingCash,
          scenarios:
            results
        },
        '继续扩充融资/分期与退出机制，并确保签约前显示完整开店预算。'
      )
    );
  }

  const smallest =
    results[0];

  if (
    smallest &&
    smallest.renovationCost >
      startingCash *
        0.55
  ) {
    issues.push(
      makeIssue(
        'ECONOMY_RENOVATION_WEIGHT',
        'P1',
        'balance',
        '装修成本占初始资本比重偏高',
        '即使是小型门店，默认装修成本也占初始资金较大比例，容易把前期策略压缩成唯一的“尽量省钱”。',
        {
          startingCash,
          smallShopRenovation:
            smallest
              .renovationCost
        },
        '把装修拆为“可营业底线”和“体验升级”，让低成本开业与高品质路线都成为有效策略。'
      )
    );
  }

  return {
    startingCash,
    scenarios:
      results,
    issues
  };
}

module.exports = {
  runEconomyProbe
};
