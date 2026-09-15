'use strict';

// V48_PROPERTY_GEOMETRY_FIELDS

const gameState =
  require('../core/gameState.js');

const timeSystem =
  require('../core/timeSystem.js');

const simulationSystem =
  require('../core/simulationSystem.js');

const shopLifecycle =
  require('../core/shopLifecycleV0816.js');

const propertyMarketSystem =
  require('./propertyMarketSystem.js');

const propertyVisitSystem =
  require('./propertyVisitSystem.js');

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

class PropertyNegotiationSystem {
  constructor() {
    this.installOwnershipGuard();
  }

  installOwnershipGuard() {
    if (
      propertyMarketSystem
        .__playerOwnershipGuardInstalled
    ) {
      return;
    }

    const original =
      propertyMarketSystem
        .isSlotAvailableForRelist
        .bind(
          propertyMarketSystem
        );

    propertyMarketSystem
      .isSlotAvailableForRelist =
      function (
        streetId,
        slot
      ) {
        const key =
          this.getListingKey(
            streetId,
            slot
          );

        const leases =
          gameState
            .getPropertyProcess()
            .leases;

        if (
          leases[
            key
          ]
        ) {
          return false;
        }

        return original(
          streetId,
          slot
        );
      };

    propertyMarketSystem
      .__playerOwnershipGuardInstalled =
      true;
  }

  getStore() {
    return gameState
      .getPropertyProcess()
      .negotiations;
  }

  getLeaseStore() {
    return gameState
      .getPropertyProcess()
      .leases;
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

  getSession(
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

  calculateBrokerFee(
    listing,
    monthlyRent
  ) {
    const asking =
      Math.max(
        1,
        Number(
          listing
            .askingMonthlyRent
        ) ||
        1
      );

    const baseFee =
      Math.max(
        0,
        Number(
          listing
            .brokerFee
        ) ||
        0
      );

    return Math.round(
      baseFee *
      (
        monthlyRent /
        asking
      )
    );
  }

  calculateUpfront(
    listing,
    terms
  ) {
    const rent =
      Math.max(
        0,
        Number(
          terms.monthlyRent
        ) ||
        0
      );

    const depositMonths =
      Math.max(
        0,
        Number(
          terms.depositMonths
        ) ||
        0
      );

    const paymentMonths =
      Math.max(
        1,
        Number(
          terms.paymentMonths
        ) ||
        1
      );

    const transferFee =
      Math.max(
        0,
        Number(
          terms.transferFee
        ) ||
        0
      );

    const brokerFee =
      this.calculateBrokerFee(
        listing,
        rent
      );

    return {
      deposit:
        Math.round(
          rent *
          depositMonths
        ),

      rentAdvance:
        Math.round(
          rent *
          paymentMonths
        ),

      transferFee:
        Math.round(
          transferFee
        ),

      brokerFee,

      total:
        Math.round(
          rent *
            (
              depositMonths +
              paymentMonths
            ) +
          transferFee +
          brokerFee
        )
    };
  }

  getMarketPressure(
    listing
  ) {
    const summary =
      propertyMarketSystem
        .getStreetSummary(
          listing.streetId
        );

    const heat =
      summary
        ? Number(
            summary.marketHeat
          ) ||
          50
        : 50;

    const competitorCount =
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

    return clamp(
      (
        heat -
        50
      ) /
        50 *
        0.34 +
      competitorCount *
        0.12 +
      watchers *
        0.018,
      -0.25,
      0.85
    );
  }

  getNegotiationPower(
    listing,
    visit
  ) {
    const landlord =
      clamp(
        Number(
          listing
            .landlordNegotiation
        ) /
          100,
        0,
        1
      );

    const agePower =
      clamp(
        Number(
          listing
            .daysOnMarket
        ) /
          75,
        0,
        0.55
      );

    const riskPower =
      clamp(
        Number(
          listing
            .riskLevel
        ) *
          0.07 +
        (
          visit
            ? visit
                .negativeCount *
              0.035
            : 0
        ),
        0,
        0.35
      );

    const contradictionPower =
      visit
        ? visit
            .contradictedCount *
          0.045
        : 0;

    const marketPressure =
      this.getMarketPressure(
        listing
      );

    return clamp(
      0.22 +
      landlord *
        0.32 +
      agePower +
      riskPower +
      contradictionPower -
      marketPressure *
        0.40,
      0.08,
      0.92
    );
  }

  buildInitialTerms(
    listing
  ) {
    return {
      monthlyRent:
        Math.round(
          listing
            .askingMonthlyRent
        ),

      transferFee:
        Math.round(
          listing
            .askingTransferFee
        ),

      freeRentDays:
        Math.max(
          0,
          Math.round(
            listing
              .freeRentDays
          )
        ),

      depositMonths:
        Math.max(
          0,
          Math.round(
            listing
              .depositMonths
          )
        ),

      paymentMonths:
        Math.max(
          1,
          Math.round(
            listing
              .paymentMonths ||
            1
          )
        ),

      leaseYears:
        Math.max(
          1,
          Math.round(
            listing
              .leaseYears
          )
        ),

      annualIncrease:
        Number(
          listing
            .annualIncrease
        ) ||
        0
    };
  }

  start(
    marketKey
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
          '这套铺已经不在市场上'
      };
    }

    const visit =
      propertyVisitSystem
        .getVisit(
          marketKey
        );

    if (!visit) {
      return {
        ok:
          false,

        code:
          'visit_required',

        message:
          '至少完成一次实地看铺后再谈判'
      };
    }

    let session =
      this.getStore()[
        marketKey
      ];

    if (
      !session ||
      session.status ===
        'expired'
    ) {
      const power =
        this.getNegotiationPower(
          listing,
          visit
        );

      const terms =
        this.buildInitialTerms(
          listing
        );

      session = {
        marketKey,

        address:
          listing.address,

        status:
          'active',

        round:
          0,

        maxRounds:
          dealConfig
            .negotiation
            .maxRounds,

        negotiationPower:
          power,

        marketPressure:
          this.getMarketPressure(
            listing
          ),

        landlordAttitude:
          power >=
            0.68
            ? '愿意谈'
            : power >=
                0.42
              ? '谨慎'
              : '强硬',

        originalTerms:
          clone(
            terms
          ),

        currentTerms:
          clone(
            terms
          ),

        lastFocus:
          null,

        lastMessage:
          '房东先按当前挂牌条件报价',

        startedDay:
          simulationSystem
            .getDayOrdinal(
              gameState
                .getTime()
            )
      };

      this.getStore()[
        marketKey
      ] =
        clone(
          session
        );
    }

    return {
      ok:
        true,

      session:
        clone(
          session
        )
    };
  }

  getFocusRequest(
    session,
    listing,
    focus
  ) {
    const cfg =
      dealConfig
        .negotiation;

    const power =
      session
        .negotiationPower;

    const rangeValue =
      (
        range,
        salt
      ) => {
        const roll =
          hashFloat(
            listing.marketKey +
            ':' +
            session.round +
            ':' +
            focus +
            ':' +
            salt +
            ':' +
            gameState
              .getSimulation()
              .seed
          );

        return (
          range[0] +
          (
            range[1] -
            range[0]
          ) *
          clamp(
            power *
              0.65 +
            roll *
              0.35,
            0,
            1
          )
        );
      };

    const current =
      session
        .currentTerms;

    const proposed =
      clone(
        current
      );

    if (
      focus ===
      'rent'
    ) {
      const cut =
        rangeValue(
          cfg.rentRequestRange,
          'rent'
        );

      proposed.monthlyRent =
        Math.max(
          1,
          Math.round(
            session
              .originalTerms
              .monthlyRent *
            (
              1 -
              cut
            )
          )
        );
    } else if (
      focus ===
      'transfer'
    ) {
      const cut =
        rangeValue(
          cfg.transferRequestRange,
          'transfer'
        );

      proposed.transferFee =
        Math.max(
          0,
          Math.round(
            session
              .originalTerms
              .transferFee *
            (
              1 -
              cut
            )
          )
        );
    } else if (
      focus ===
      'freeRent'
    ) {
      const range =
        cfg
          .freeRentExtraRange;

      const roll =
        hashFloat(
          listing.marketKey +
          ':free:' +
          session.round +
          ':' +
          gameState
            .getSimulation()
            .seed
        );

      proposed.freeRentDays =
        Math.round(
          session
            .originalTerms
            .freeRentDays +
          range[0] +
          (
            range[1] -
            range[0]
          ) *
          clamp(
            power *
              0.7 +
            roll *
              0.3,
            0,
            1
          )
        );
    } else {
      const rentCut =
        rangeValue(
          cfg.rentRequestRange,
          'balanced_rent'
        ) *
        0.58;

      const transferCut =
        rangeValue(
          cfg.transferRequestRange,
          'balanced_transfer'
        ) *
        0.52;

      proposed.monthlyRent =
        Math.max(
          1,
          Math.round(
            session
              .originalTerms
              .monthlyRent *
            (
              1 -
              rentCut
            )
          )
        );

      proposed.transferFee =
        Math.max(
          0,
          Math.round(
            session
              .originalTerms
              .transferFee *
            (
              1 -
              transferCut
            )
          )
        );

      proposed.freeRentDays =
        Math.round(
          session
            .originalTerms
            .freeRentDays +
          dealConfig
            .negotiation
            .freeRentExtraRange[0] *
            0.6 +
          power *
            7
        );
    }

    return proposed;
  }

  calculateAcceptance(
    session,
    listing,
    requested,
    focus
  ) {
    const original =
      session
        .originalTerms;

    const rentAsk =
      (
        original.monthlyRent -
        requested.monthlyRent
      ) /
      Math.max(
        1,
        original.monthlyRent
      );

    const transferAsk =
      original.transferFee >
        0
        ? (
            original.transferFee -
            requested.transferFee
          ) /
          original.transferFee
        : 0;

    const freeAsk =
      Math.max(
        0,
        requested.freeRentDays -
        original.freeRentDays
      ) /
      30;

    const demandCost =
      rentAsk *
        0.50 +
      transferAsk *
        0.28 +
      freeAsk *
        0.22;

    const focusBonus =
      focus ===
        'balanced'
        ? 0.05
        : 0;

    const roundBonus =
      session.round *
      0.045;

    const roll =
      (
        hashFloat(
          listing.marketKey +
          ':accept:' +
          session.round +
          ':' +
          focus +
          ':' +
          gameState
            .getSimulation()
            .seed
        ) -
        0.5
      ) *
      0.16;

    return clamp(
      session
        .negotiationPower +
      focusBonus +
      roundBonus +
      roll -
      demandCost -
      session
        .marketPressure *
        0.18,
      0,
      1
    );
  }

  buildCounterOffer(
    session,
    requested,
    acceptance
  ) {
    const current =
      session
        .currentTerms;

    const give =
      clamp(
        0.24 +
        session
          .negotiationPower *
          0.38 +
        acceptance *
          0.22,
        0.18,
        0.78
      );

    return {
      ...current,

      monthlyRent:
        Math.round(
          current.monthlyRent +
          (
            requested.monthlyRent -
            current.monthlyRent
          ) *
          give
        ),

      transferFee:
        Math.max(
          0,
          Math.round(
            current.transferFee +
            (
              requested.transferFee -
              current.transferFee
            ) *
            give
          )
        ),

      freeRentDays:
        Math.round(
          current.freeRentDays +
          (
            requested.freeRentDays -
            current.freeRentDays
          ) *
          give
        )
    };
  }

  maybeLoseOpportunity(
    listing,
    session
  ) {
    const visit =
      propertyVisitSystem
        .getVisit(
          listing.marketKey
        );

    const baseRisk =
      propertyVisitSystem
        .getOpportunityLossRisk(
          listing,
          dealConfig
            .negotiation
            .actionHoursPerRound,
          visit
            ? visit.modeId
            : 'quick'
        );

    const risk =
      clamp(
        baseRisk *
        (
          0.42 +
          session
            .round *
            0.11
        ),
        0,
        0.38
      );

    const roll =
      hashFloat(
        listing.marketKey +
        ':negotiation_loss:' +
        session.round +
        ':' +
        simulationSystem
          .getDayOrdinal(
            gameState
              .getTime()
          ) +
        ':' +
        gameState
          .getSimulation()
          .seed
      );

    if (
      listing
        .competingTenants &&
      listing
        .competingTenants
        .length >
        0 &&
      roll <
        risk
    ) {
      propertyVisitSystem
        .markLostToNpc(
          listing,
          'player_negotiation_delay'
        );

      return true;
    }

    return false;
  }

  negotiate(
    marketKey,
    focus
  ) {
    const start =
      this.start(
        marketKey
      );

    if (!start.ok) {
      return start;
    }

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
          '房源已经被其他经营者拿下'
      };
    }

    const session =
      this.getStore()[
        marketKey
      ];

    if (
      session.round >=
      session.maxRounds
    ) {
      return {
        ok:
          false,

        code:
          'round_limit',

        message:
          '房东不愿继续拉扯，当前条件已经是最终报价',

        session:
          clone(
            session
          )
      };
    }

    timeSystem
      .addHours(
        dealConfig
          .negotiation
          .actionHoursPerRound
      );

    simulationSystem
      .update(
        dealConfig
          .negotiation
          .actionHoursPerRound *
        60
      );

    session.round +=
      1;

    const currentListing =
      this.getLiveListing(
        marketKey
      );

    if (!currentListing) {
      session.status =
        'expired';

      session.lastMessage =
        '谈判期间房源已经退出市场';

      return {
        ok:
          false,

        code:
          'lost_during_negotiation',

        message:
          session.lastMessage
      };
    }

    if (
      this.maybeLoseOpportunity(
        currentListing,
        session
      )
    ) {
      session.status =
        'expired';

      session.lastMessage =
        '另一位竞争者提高条件，房东已经和对方签约';

      return {
        ok:
          false,

        code:
          'lost_to_competitor',

        message:
          session.lastMessage
      };
    }

    const chosenFocus =
      [
        'rent',
        'transfer',
        'freeRent',
        'balanced'
      ].indexOf(
        focus
      ) >=
      0
        ? focus
        : 'balanced';

    const requested =
      this.getFocusRequest(
        session,
        currentListing,
        chosenFocus
      );

    const acceptance =
      this.calculateAcceptance(
        session,
        currentListing,
        requested,
        chosenFocus
      );

    const threshold =
      dealConfig
        .negotiation
        .minimumAcceptanceScore;

    const accepted =
      acceptance >=
      threshold;

    if (accepted) {
      session.currentTerms =
        requested;

      session.lastMessage =
        '房东接受了这轮条件';
    } else {
      session.currentTerms =
        this.buildCounterOffer(
          session,
          requested,
          acceptance
        );

      session.lastMessage =
        acceptance >=
          threshold -
          0.15
          ? '房东没有全答应，但继续让了一步'
          : '房东态度较强硬，只做了有限调整';
    }

    session.lastFocus =
      chosenFocus;

    session.landlordAttitude =
      acceptance >=
        0.68
        ? '松动'
        : acceptance >=
            0.46
          ? '观望'
          : '强硬';

    session.lastAcceptance =
      acceptance;

    this.getStore()[
      marketKey
    ] =
      clone(
        session
      );

    return {
      ok:
        true,

      accepted,

      session:
        clone(
          session
        ),

      requested:
        clone(
          requested
        ),

      upfront:
        this.calculateUpfront(
          currentListing,
          session.currentTerms
        )
    };
  }

  markPlayerLeased(
    listing,
    shopId
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
      'player_leased';

    item.playerShopId =
      shopId;

    item.rentedBy = {
      id:
        'player',

      name:
        '玩家经营主体'
    };

    state
      .history
      .unshift({
        type:
          'player_leased',

        day:
          state.currentDay,

        listingKey:
          listing.marketKey,

        districtId:
          listing.districtId,

        streetId:
          listing.streetId,

        address:
          listing.address,

        shopId
      });

    propertyMarketSystem
      .importState(
        state
      );

    return true;
  }

  signLease(
    marketKey
  ) {
    const start =
      this.start(
        marketKey
      );

    if (!start.ok) {
      return start;
    }

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
          '房源已经退出市场，无法签约'
      };
    }

    const session =
      this.getStore()[
        marketKey
      ];

    const terms =
      session
        .currentTerms;

    const upfront =
      this.calculateUpfront(
        listing,
        terms
      );

    if (
      gameState
        .getPlayer()
        .cash <
      upfront.total
    ) {
      return {
        ok:
          false,

        code:
          'insufficient_cash',

        message:
          '签约资金不足，还差¥' +
          (
            upfront.total -
            gameState
              .getPlayer()
              .cash
          ).toLocaleString(),

        upfront
      };
    }

    const day =
      simulationSystem
        .getDayOrdinal(
          gameState
            .getTime()
        );

    const shopId =
      'shop_' +
      (
        marketKey
          .replace(
            /[^a-zA-Z0-9]+/g,
            '_'
          )
      ) +
      '_' +
      day;

    if (
      !this.markPlayerLeased(
        listing,
        shopId
      )
    ) {
      return {
        ok:
          false,

        code:
          'listing_changed',

        message:
          '签约前房源状态发生变化，请重新确认'
      };
    }

    gameState
      .spendCash(
        upfront.total
      );

    const shop = {
      id:
        shopId,

      name:
        listing.address,

      propertyMarketKey:
        marketKey,

      districtId:
        listing.districtId,

      streetId:
        listing.streetId,

      address:
        listing.address,

      status:
        'leased_pending_renovation',

      signedDay:
        day,

      grossArea:
        listing.grossArea,

      usableArea:
        listing.usableArea,

      seatEstimate:
        listing.seatEstimate,

      propertyTypeId:
        listing.propertyTypeId,

      propertyTypeName:
        listing.propertyTypeName,

      layoutTypeId:
        listing.layoutTypeId,

      layoutTypeName:
        listing.layoutTypeName,

      floor:
        listing.floor,

      frontage:
        listing.frontage,

      depth:
        listing.depth,

      ceilingHeight:
        listing.ceilingHeight,

      corner:
        Boolean(
          listing.corner
        ),

      independentToilet:
        Boolean(
          listing.independentToilet
        ),

      loadingAccess:
        listing.loadingAccess,

      propertyShapeVersion:
        1,

      exhaust:
        listing.exhaust,

      gas:
        listing.gas,

      threePhase:
        listing.threePhase,

      drainage:
        listing.drainage,

      greaseTrap:
        listing.greaseTrap,

      fireSprinkler:
        listing.fireSprinkler,

      electricCapacityKw:
        listing.electricCapacityKw,

      monthlyRent:
        terms.monthlyRent,

      transferFee:
        terms.transferFee,

      freeRentDays:
        terms.freeRentDays,

      depositMonths:
        terms.depositMonths,

      paymentMonths:
        terms.paymentMonths,

      leaseYears:
        terms.leaseYears,

      annualIncrease:
        terms.annualIncrease,

      brokerFee:
        upfront.brokerFee,

      upfrontPaid:
        upfront.total,

      landlordName:
        listing.landlordName,

      brokerName:
        listing.brokerName,

      renovationEstimate:
        listing.renovationEstimate,

      riskRepairCost:
        listing.riskRepairCost
    };

    gameState
      .addShop(
        shop
      );

    shopLifecycle
      .syncShop(
        shop,
        {
          renovationStatus:
            null
        },
        {
          day,
          reason:
            'lease-signed'
        }
      );

    session.status =
      'signed';

    session.signedDay =
      day;

    session.upfront =
      upfront;

    this.getStore()[
      marketKey
    ] =
      clone(
        session
      );

    this.getLeaseStore()[
      marketKey
    ] = {
      shopId,

      day,

      terms:
        clone(
          terms
        ),

      upfront:
        clone(
          upfront
        )
    };

    return {
      ok:
        true,

      shop:
        clone(
          shop
        ),

      terms:
        clone(
          terms
        ),

      upfront:
        clone(
          upfront
        ),

      message:
        '签约完成，门店进入待装修状态'
    };
  }
}

module.exports =
  new PropertyNegotiationSystem();
