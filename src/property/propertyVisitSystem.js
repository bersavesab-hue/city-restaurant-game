'use strict';

const gameState =
  require('../core/gameState.js');

const timeSystem =
  require('../core/timeSystem.js');

const simulationSystem =
  require('../core/simulationSystem.js');

const propertyMarketSystem =
  require('./propertyMarketSystem.js');

const propertyData =
  require('./propertyData.js');

const dealConfig =
  require('./propertyDealConfig.js');

function clone(value) {
  return JSON.parse(
    JSON.stringify(value)
  );
}

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

function hashFloat(
  text
) {
  let h =
    2166136261;

  const source =
    String(
      text
    );

  for (
    let i = 0;
    i < source.length;
    i++
  ) {
    h ^=
      source.charCodeAt(
        i
      );

    h =
      Math.imul(
        h,
        16777619
      );
  }

  return (
    (
      h >>>
      0
    ) %
    100000
  ) /
  100000;
}

class PropertyVisitSystem {
  getStore() {
    return gameState
      .getPropertyProcess()
      .visits;
  }

  getLiveListing(
    marketKey
  ) {
    return propertyMarketSystem
      .getLiveListings({})
      .find(
        item =>
          item.marketKey ===
          marketKey
      ) ||
      null;
  }

  getVisit(
    marketKey
  ) {
    const item =
      this.getStore()[
        marketKey
      ];

    return item
      ? clone(
          item
        )
      : null;
  }

  getMode(
    modeId
  ) {
    return (
      dealConfig
        .visitModes[
          modeId
        ] ||
      dealConfig
        .visitModes
        .standard
    );
  }

  getBrokerReliability(
    listing
  ) {
    const broker =
      propertyData
        .BROKERS
        .find(
          item =>
            item.id ===
            listing.brokerId
        );

    return broker
      ? broker.reliability
      : 70;
  }

  getDynamicVisitQuote(
    marketKey,
    modeId
  ) {
    const listing =
      this.getLiveListing(
        marketKey
      );

    if (!listing) {
      return null;
    }

    const mode =
      this.getMode(
        modeId
      );

    const street =
      propertyMarketSystem
        .getStreetSummary(
          listing.streetId
        );

    const competition =
      Array.isArray(
        listing.competingTenants
      )
        ? listing
            .competingTenants
            .length
        : 0;

    const heat =
      street
        ? Number(
            street.marketHeat
          ) ||
          50
        : 50;

    const delayPressure =
      clamp(
        (
          competition *
            0.09 +
          Number(
            listing.watchers
          ) *
            0.018 +
          Math.max(
            0,
            heat -
              50
          ) /
            250
        ),
        0,
        0.75
      );

    const hours =
      Math.max(
        1,
        Math.round(
          mode.baseHours *
          (
            1 +
            delayPressure *
              0.35
          )
        )
      );

    const cost =
      Math.max(
        0,
        Math.round(
          mode.baseCost *
          (
            1 +
            Math.max(
              0,
              listing.grossArea -
                120
            ) /
              700 +
            delayPressure *
              0.25
          )
        )
      );

    return {
      modeId:
        mode.id,

      name:
        mode.name,

      description:
        mode.description,

      hours,

      cost,

      accuracy:
        mode.accuracy,

      revealCount:
        mode.revealCount,

      opportunityPressure:
        delayPressure
    };
  }

  getOpportunityLossRisk(
    listing,
    hours,
    modeId
  ) {
    const street =
      propertyMarketSystem
        .getStreetSummary(
          listing.streetId
        );

    const heat =
      street
        ? Number(
            street.marketHeat
          ) ||
          50
        : 50;

    const competitors =
      Array.isArray(
        listing.competingTenants
      )
        ? listing
            .competingTenants
            .length
        : 0;

    const watchers =
      Number(
        listing.watchers
      ) ||
      0;

    const cfg =
      dealConfig
        .opportunityRisk;

    const hot =
      Math.max(
        0,
        (
          heat -
          55
        ) /
          45
      );

    let risk =
      Number(
        hours
      ) *
        cfg.basePerHour +
      competitors *
        cfg.competitorWeight +
      watchers *
        cfg.watcherWeight +
      hot *
        cfg.hotMarketWeight;

    if (
      modeId ===
      'deep'
    ) {
      risk *=
        cfg.inspectionProtection;
    }

    return clamp(
      risk,
      0,
      0.68
    );
  }

  markLostToNpc(
    listing,
    reason
  ) {
    const state =
      propertyMarketSystem
        .exportState();

    const item =
      state
        .listingState[
          listing.marketKey
        ];

    if (
      !item ||
      item.status !==
        'active'
    ) {
      return false;
    }

    item.status =
      'rented';

    item.closedDay =
      state.currentDay;

    item.closedReason =
      'npc_rented';

    item.playerDelayReason =
      reason ||
      'player_delay';

    if (
      Array.isArray(
        listing.competingTenants
      ) &&
      listing
        .competingTenants
        .length
    ) {
      item.rentedBy =
        clone(
          listing
            .competingTenants[0]
        );
    }

    state.stats.totalNpcRentals +=
      1;

    state.history.unshift({
      type:
        'npc_rented',

      listingKey:
        item.key,

      districtId:
        item.districtId,

      streetId:
        item.streetId,

      reason:
        item.playerDelayReason,

      renter:
        item.rentedBy
          ? item.rentedBy.name
          : null
    });

    propertyMarketSystem
      .importState(
        state
      );

    return true;
  }

  verifyValue(
    listing,
    rule
  ) {
    const raw =
      listing[
        rule.source
      ];

    if (
      rule.threshold !=
      null
    ) {
      return (
        Number(
          raw
        ) >=
        rule.threshold
      );
    }

    if (
      rule.inverseThreshold !=
      null
    ) {
      return (
        Number(
          raw
        ) <=
        rule.inverseThreshold
      );
    }

    return !!raw;
  }

  buildInspection(
    listing,
    quote
  ) {
    const brokerReliability =
      this.getBrokerReliability(
        listing
      );

    const report =
      [];

    const rules =
      dealConfig
        .inspectionItems;

    const revealCount =
      Math.min(
        rules.length,
        quote.revealCount
      );

    for (
      let i = 0;
      i < revealCount;
      i++
    ) {
      const rule =
        rules[i];

      const actualPositive =
        this.verifyValue(
          listing,
          rule
        );

      const claimRoll =
        hashFloat(
          listing.marketKey +
          ':claim:' +
          rule.id
        );

      const brokerMistakeChance =
        clamp(
          (
            100 -
            brokerReliability
          ) /
            100 *
            0.42 +
          listing.riskLevel *
            0.035,
          0.02,
          0.38
        );

      const claimedPositive =
        claimRoll <
        brokerMistakeChance
          ? !actualPositive
          : actualPositive;

      const verificationRoll =
        hashFloat(
          listing.marketKey +
          ':verify:' +
          quote.modeId +
          ':' +
          rule.id +
          ':' +
          gameState
            .getSimulation()
            .seed
        );

      const verified =
        verificationRoll <=
        quote.accuracy;

      const finalPositive =
        verified
          ? actualPositive
          : claimedPositive;

      report.push({
        id:
          rule.id,

        label:
          rule.label,

        claimedPositive,

        actualPositive,

        verified,

        resultPositive:
          finalPositive,

        contradicted:
          verified &&
          claimedPositive !==
            actualPositive,

        text:
          finalPositive
            ? rule.positiveText
            : rule.negativeText
      });
    }

    const contradicted =
      report.filter(
        item =>
          item.contradicted
      ).length;

    const negative =
      report.filter(
        item =>
          !item.resultPositive
      ).length;

    const repairEstimate =
      Math.round(
        (
          Number(
            listing.riskRepairCost
          ) ||
          0
        ) *
        (
          0.55 +
          negative *
            0.11 +
          contradicted *
            0.09
        )
      );

    return {
      brokerReliability,

      items:
        report,

      contradictedCount:
        contradicted,

      negativeCount:
        negative,

      repairEstimate
    };
  }

  inspect(
    marketKey,
    modeId
  ) {
    const listing =
      this.getLiveListing(
        marketKey
      );

    if (!listing) {
      return {
        ok:
          false,

        code:
          'listing_unavailable',

        message:
          '房源已经不在市场上'
      };
    }

    const quote =
      this.getDynamicVisitQuote(
        marketKey,
        modeId
      );

    if (!quote) {
      return {
        ok:
          false,

        code:
          'quote_failed',

        message:
          '暂时无法生成看铺方案'
      };
    }

    if (
      gameState
        .getPlayer()
        .cash <
      quote.cost
    ) {
      return {
        ok:
          false,

        code:
          'insufficient_cash',

        message:
          '当前资金不足以完成这次勘察'
      };
    }

    if (
      quote.cost >
      0
    ) {
      gameState
        .spendCash(
          quote.cost
        );
    }

    const beforeDay =
      simulationSystem
        .getDayOrdinal(
          gameState
            .getTime()
        );

    timeSystem
      .addHours(
        quote.hours
      );

    simulationSystem
      .update(
        quote.hours *
        60
      );

    const afterDay =
      simulationSystem
        .getDayOrdinal(
          gameState
            .getTime()
        );

    const stillLive =
      this.getLiveListing(
        marketKey
      );

    if (!stillLive) {
      return {
        ok:
          false,

        code:
          'lost_during_visit',

        message:
          '看铺期间房源已被其他经营者拿下',

        hours:
          quote.hours,

        cost:
          quote.cost,

        dayChanged:
          afterDay !==
          beforeDay
      };
    }

    const lossRisk =
      this.getOpportunityLossRisk(
        stillLive,
        quote.hours,
        quote.modeId
      );

    const lossRoll =
      hashFloat(
        marketKey +
        ':visit_loss:' +
        afterDay +
        ':' +
        quote.modeId +
        ':' +
        gameState
          .getSimulation()
          .seed
      );

    if (
      stillLive
        .competingTenants &&
      stillLive
        .competingTenants
        .length >
        0 &&
      lossRoll <
        lossRisk
    ) {
      this.markLostToNpc(
        stillLive,
        'player_visit_delay'
      );

      return {
        ok:
          false,

        code:
          'lost_to_competitor',

        message:
          '你勘察时另一位竞争者先签下了这套铺',

        hours:
          quote.hours,

        cost:
          quote.cost,

        lossRisk
      };
    }

    const inspection =
      this.buildInspection(
        stillLive,
        quote
      );

    const result = {
      ok:
        true,

      marketKey,

      address:
        stillLive.address,

      modeId:
        quote.modeId,

      modeName:
        quote.name,

      hours:
        quote.hours,

      cost:
        quote.cost,

      accuracy:
        quote.accuracy,

      completedDay:
        afterDay,

      completedHour:
        gameState
          .getTime()
          .hour,

      brokerReliability:
        inspection
          .brokerReliability,

      items:
        inspection.items,

      contradictedCount:
        inspection
          .contradictedCount,

      negativeCount:
        inspection
          .negativeCount,

      repairEstimate:
        inspection
          .repairEstimate,

      lossRisk
    };

    this.getStore()[
      marketKey
    ] =
      clone(
        result
      );

    return clone(
      result
    );
  }
}

module.exports =
  new PropertyVisitSystem();
