'use strict';

const gameState =
  require('../core/gameState.js');

const renovationSystem =
  require('../renovation/renovationSystem.js');

const openingPrepSystem =
  require('../opening/openingPrepSystem.js');

function clamp(
  value,
  min,
  max
) {
  return Math.max(
    min,
    Math.min(
      max,
      value
    )
  );
}

function hashFloat(text) {
  let h =
    2166136261;

  const source =
    String(text);

  for (
    let i = 0;
    i <
    source.length;
    i++
  ) {
    h ^=
      source.charCodeAt(i);

    h =
      Math.imul(
        h,
        16777619
      );
  }

  return (
    (
      h >>> 0
    ) %
    100000
  ) /
  100000;
}

class OpeningFinanceSystem {
  getShop(shopId) {
    return gameState
      .getBusiness()
      .shops
      .find(
        item =>
          item.id ===
          shopId
      ) ||
      null;
  }

  getLoanStore() {
    return gameState
      .getFinance()
      .openingLoans;
  }

  getExistingLoan(shopId) {
    return (
      this
        .getLoanStore()[
          shopId
        ] ||
      null
    );
  }

  getCreditLimit(shopId) {
    const shop =
      this.getShop(
        shopId
      );

    if (!shop) {
      return 0;
    }

    const area =
      Math.max(
        20,
        Number(
          shop.usableArea ||
          shop.grossArea ||
          60
        )
      );

    const rent =
      Math.max(
        0,
        Number(
          shop.monthlyRent
        ) ||
        0
      );

    return Math.round(
      clamp(
        area *
          900 +
        rent *
          3,
        30000,
        160000
      )
    );
  }

  estimateOpeningNeed(shopId) {
    const shop =
      this.getShop(
        shopId
      );

    if (!shop) {
      return null;
    }

    const renovation =
      renovationSystem
        .getMetrics(
          shopId
        );

    const equipment =
      openingPrepSystem
        .getEquipmentQuote(
          shopId
        );

    const renovationCost =
      renovation
        ? renovation.totalCost
        : Math.round(
            (
              Number(
                shop.usableArea
              ) ||
              60
            ) *
            520
          );

    const equipmentCost =
      equipment
        ? equipment.total
        : 18000;

    const reserve =
      Math.max(
        5000,
        Math.round(
          (
            Number(
              shop.monthlyRent
            ) ||
            0
          ) *
          0.75
        )
      );

    const totalNeed =
      renovationCost +
      equipmentCost +
      reserve;

    const cash =
      gameState
        .getPlayer()
        .cash;

    const gap =
      Math.max(
        0,
        totalNeed -
        cash
      );

    return {
      renovationCost,
      equipmentCost,
      reserve,
      totalNeed,
      cash,
      gap
    };
  }

  getOffer(shopId) {
    const shop =
      this.getShop(
        shopId
      );

    if (!shop) {
      return null;
    }

    const existing =
      this.getExistingLoan(
        shopId
      );

    if (existing) {
      return {
        existing:
          true,
        loan:
          existing
      };
    }

    const need =
      this.estimateOpeningNeed(
        shopId
      );

    const creditLimit =
      this.getCreditLimit(
        shopId
      );

    const seed =
      gameState
        .getSimulation()
        .seed ||
      1;

    const rate =
      Number(
        (
          0.085 +
          hashFloat(
            shopId +
            ':credit:' +
            seed
          ) *
          0.035
        ).toFixed(
          3
        )
      );

    const suggested =
      Math.min(
        creditLimit,
        Math.max(
          0,
          need.gap +
          5000
        )
      );

    const principal =
      suggested >
        0
        ? Math.max(
            10000,
            Math.ceil(
              suggested /
              5000
            ) *
            5000
          )
        : 0;

    const termMonths =
      principal >
        80000
        ? 24
        : 18;

    const totalInterest =
      Math.round(
        principal *
        rate *
        (
          termMonths /
          12
        )
      );

    const monthlyPayment =
      principal >
        0
        ? Math.ceil(
            (
              principal +
              totalInterest
            ) /
            termMonths
          )
        : 0;

    return {
      existing:
        false,
      shopId,
      creditLimit,
      principal:
        Math.min(
          principal,
          creditLimit
        ),
      rate,
      termMonths,
      totalInterest,
      monthlyPayment,
      need,
      available:
        principal >
        0
    };
  }

  acceptOffer(shopId) {
    const existing =
      this.getExistingLoan(
        shopId
      );

    if (existing) {
      return {
        ok:
          false,
        message:
          '该门店已有开店周转金'
      };
    }

    const offer =
      this.getOffer(
        shopId
      );

    if (
      !offer ||
      !offer.available ||
      offer.principal <=
        0
    ) {
      return {
        ok:
          false,
        message:
          '当前资金充足，无需申请周转金'
      };
    }

    const loan = {
      shopId,
      principal:
        offer.principal,
      outstanding:
        offer.principal +
        offer.totalInterest,
      annualRate:
        offer.rate,
      termMonths:
        offer.termMonths,
      monthlyPayment:
        offer.monthlyPayment,
      status:
        'grace_before_opening',
      paidMonths:
        0
    };

    this
      .getLoanStore()[
        shopId
      ] =
      loan;

    gameState
      .addCash(
        offer.principal
      );

    return {
      ok:
        true,
      loan:
        JSON.parse(
          JSON.stringify(
            loan
          )
        )
    };
  }

  getRecoveryStatus(shopId) {
    const need =
      this.estimateOpeningNeed(
        shopId
      );

    const offer =
      this.getOffer(
        shopId
      );

    if (!need) {
      return null;
    }

    const canRecover =
      need.gap <=
        0 ||
      !!(
        offer &&
        (
          offer.existing ||
          offer.principal >=
            need.gap
        )
      );

    return {
      ...need,
      canRecover,
      offer
    };
  }
}

module.exports =
  new OpeningFinanceSystem();
