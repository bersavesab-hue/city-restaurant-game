'use strict';

const gameState =
  require('../core/gameState.js');

const liveWorld =
  require('./liveWorldSystemV084.js');

const competitorPack =
  require('../competitor/competitorPackV10.js');

const VERSION =
  '0.8.28';

function clone(value) {
  if (value === undefined) return undefined;
  return JSON.parse(JSON.stringify(value));
}

function clamp(value,min,max) {
  return Math.max(
    min,
    Math.min(
      max,
      Number(value) || 0
    )
  );
}

function districtForShop(shopId) {
  const business =
    gameState.getBusiness();

  const shop =
    (
      business.shops ||
      []
    ).find(
      item =>
        item.id ===
        shopId
    );

  return shop &&
    shop.districtId ||
    gameState
      .getWorld()
      .currentDistrictId ||
    'university';
}

function marketScale() {
  return {
    version:VERSION,
    archetypes:
      competitorPack
        .ARCHETYPES
        .length,
    brandPositions:
      competitorPack
        .BRAND_POSITIONS
        .length,
    simulationTiers:
      clone(
        competitorPack
          .SIMULATION_TIERS
      ),
    cityMarketScale:
      clone(
        competitorPack
          .CITY_MARKET_SCALE
      )
  };
}

function processDay(
  day,
  options
) {
  return (
    liveWorld
      .processDay(
        Number(day) || 1,
        options || {}
      )
  );
}

function competitorDetail(
  competitorId
) {
  const state =
    liveWorld
      .getState();

  const row =
    state.competitors
      .find(
        item =>
          item.id ===
          competitorId
      );

  return row
    ? clone(row)
    : null;
}

function snapshot(
  shopId,
  options
) {
  const opts =
    options || {};

  const districtId =
    opts.districtId ||
    districtForShop(
      shopId
    );

  const state =
    liveWorld
      .initialize(
        Number(
          stateSafeDay()
        ) || 1
      );

  const district =
    liveWorld
      .getDistrictDashboard(
        districtId
      );

  const top =
    liveWorld
      .getTopCompetitors(
        districtId,
        Math.max(
          1,
          Math.min(
            20,
            Number(
              opts.limit
            ) || 8
          )
        )
      );

  const intensity =
    clamp(
      district.intensity,
      0,
      100
    );

  const opportunityScore =
    Math.round(
      clamp(
        72 -
        intensity *
        0.55 -
        Math.max(
          0,
          Number(
            district.openings
          ) || 0
        ) *
          2.4 +
        (
          Number(
            district
              .playerDemandMultiplier
          ) ||
          1
        ) *
          18,
        0,
        100
      )
    );

  const threatScore =
    Math.round(
      clamp(
        intensity *
          0.7 +
        Math.min(
          25,
          (
            Number(
              district
                .competitorCount
            ) ||
            0
          ) *
            0.7
        ) +
        Math.min(
          20,
          (
            Number(
              district
                .openings
            ) ||
            0
          ) *
            3
        ),
        0,
        100
      )
    );

  return {
    version:VERSION,
    shopId:
      shopId ||
      null,
    districtId,
    marketScale:
      marketScale(),
    population:{
      total:
        state
          .competitors
          .length,
      counts:
        clone(
          state
            .competitorCounts ||
          {}
        )
    },
    district:
      clone(district),
    topCompetitors:
      top,
    opportunityScore,
    threatScore,
    metrics:
      clone(
        state.metrics ||
        {}
      ),
    latestMarketHistory:
      (
        state.marketHistory ||
        []
      )
        .slice(
          0,
          30
        )
        .map(clone)
  };
}

function stateSafeDay() {
  const state =
    liveWorld
      .getState();

  const last =
    Number(
      state &&
      state.lastProcessedDay
    );

  if (
    Number.isFinite(last) &&
    last >
    0
  ) {
    return last;
  }

  const time =
    gameState
      .getTime();

  return (
    Number(
      time &&
      time.day
    ) ||
    1
  );
}

module.exports = {
  VERSION,
  districtForShop,
  marketScale,
  processDay,
  competitorDetail,
  snapshot
};
