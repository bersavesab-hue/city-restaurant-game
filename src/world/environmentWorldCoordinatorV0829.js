'use strict';

const gameState =
  require('../core/gameState.js');

const dynamicWorld =
  require('./dynamicWorldSystemV0815.js');

const eventPack =
  require('./eventPackV0815.js');

const policyPack =
  require('./policyPackV0815.js');

const VERSION =
  '0.8.29';

function clone(value) {
  if (value === undefined) return undefined;
  return JSON.parse(JSON.stringify(value));
}

function seasonForMonth(month) {
  const m =
    Math.max(
      1,
      Math.min(
        12,
        Number(month) || 1
      )
    );

  if (
    m >= 3 &&
    m <= 5
  ) {
    return 'spring';
  }

  if (
    m >= 6 &&
    m <= 8
  ) {
    return 'summer';
  }

  if (
    m >= 9 &&
    m <= 11
  ) {
    return 'autumn';
  }

  return 'winter';
}

function weatherProfile(
  weather,
  temperature,
  season
) {
  const w =
    String(
      weather || ''
    ).toLowerCase();

  const t =
    Number(
      temperature
    );

  let dineInMultiplier = 1;
  let deliveryMultiplier = 1;
  let utilityMultiplier = 1;
  let demandMultiplier = 1;

  if (
    w.includes('雨') ||
    w.includes('rain')
  ) {
    dineInMultiplier *=
      0.90;

    deliveryMultiplier *=
      1.16;

    demandMultiplier *=
      0.97;
  }

  if (
    w.includes('雪') ||
    w.includes('snow')
  ) {
    dineInMultiplier *=
      0.82;

    deliveryMultiplier *=
      1.20;

    utilityMultiplier *=
      1.08;
  }

  if (
    w.includes('风') ||
    w.includes('wind')
  ) {
    dineInMultiplier *=
      0.95;
  }

  if (
    Number.isFinite(t) &&
    t >= 33
  ) {
    utilityMultiplier *=
      1.10;

    dineInMultiplier *=
      0.95;
  }

  if (
    Number.isFinite(t) &&
    t <= 2
  ) {
    utilityMultiplier *=
      1.12;

    deliveryMultiplier *=
      1.08;
  }

  if (
    season ===
    'summer'
  ) {
    utilityMultiplier *=
      1.03;
  }

  if (
    season ===
    'winter'
  ) {
    utilityMultiplier *=
      1.04;
  }

  return {
    weather:
      weather ||
      null,
    temperature:
      Number.isFinite(t)
        ? t
        : null,
    season,
    dineInMultiplier:
      Math.round(
        dineInMultiplier *
        1000
      ) /
      1000,
    deliveryMultiplier:
      Math.round(
        deliveryMultiplier *
        1000
      ) /
      1000,
    demandMultiplier:
      Math.round(
        demandMultiplier *
        1000
      ) /
      1000,
    utilityMultiplier:
      Math.round(
        utilityMultiplier *
        1000
      ) /
      1000
  };
}

function context(extra) {
  const time =
    gameState.getTime();

  const world =
    gameState.getWorld();

  const season =
    seasonForMonth(
      time.month
    );

  return {
    weather:
      world.weather,
    temperature:
      world.temperature,
    season,
    districtId:
      world.currentDistrictId,
    ...(
      extra ||
      {}
    )
  };
}

function processDay(
  day,
  extra
) {
  const ctx =
    context(extra);

  return dynamicWorld
    .processDay(
      Number(day) || 1,
      ctx
    );
}

function combinedModifiers(
  filter
) {
  const ctx =
    context(filter);

  const worldModifiers =
    dynamicWorld
      .getModifiers(
        filter ||
        {}
      );

  const weather =
    weatherProfile(
      ctx.weather,
      ctx.temperature,
      ctx.season
    );

  return {
    ...clone(
      worldModifiers
    ),
    weatherDemandMultiplier:
      weather
        .demandMultiplier,
    dineInWeatherMultiplier:
      weather
        .dineInMultiplier,
    deliveryWeatherMultiplier:
      weather
        .deliveryMultiplier,
    weatherUtilityMultiplier:
      weather
        .utilityMultiplier,
    season:
      weather.season
  };
}

function snapshot(
  filter
) {
  const time =
    gameState.getTime();

  const ctx =
    context(filter);

  const weather =
    weatherProfile(
      ctx.weather,
      ctx.temperature,
      ctx.season
    );

  return {
    version:VERSION,
    day:
      Number(
        time.day
      ) ||
      1,
    month:
      Number(
        time.month
      ) ||
      1,
    season:
      ctx.season,
    weather,
    eventPack:{
      domains:
        eventPack
          .stats()
          .domains,
      templates:
        eventPack
          .stats()
          .templates,
      phases:
        eventPack
          .stats()
          .phases,
      severities:
        eventPack
          .stats()
          .severities
    },
    policyPack:{
      domains:
        policyPack
          .stats()
          .domains,
      templates:
        policyPack
          .stats()
          .templates,
      stages:
        policyPack
          .stats()
          .stages
    },
    activeEvents:
      dynamicWorld
        .getActiveEvents(),
    activePolicies:
      dynamicWorld
        .getActivePolicies(),
    modifiers:
      combinedModifiers(
        filter
      ),
    unread:
      dynamicWorld
        .getUnreadCounts()
  };
}

module.exports = {
  VERSION,
  seasonForMonth,
  weatherProfile,
  context,
  processDay,
  combinedModifiers,
  snapshot
};
