'use strict';

const gameState =
  require('./gameState.js');

const simulationConfig =
  require('./simulationConfig.js');

const timeScheduleCoordinator =
  require('./timeScheduleCoordinatorV0812.js');

const citySystem =
  require('../city/citySystem.js');

const propertyMarketSystem =
  require('../property/propertyMarketSystem.js');

const propertySystem =
  require('../property/propertySystem.js');

const dynamicWorldSystem =
  require('../world/dynamicWorldSystemV0815.js');

const liveWorldSystem =
  require('../world/liveWorldSystemV084.js');
// V084_LIVE_WORLD_SIMULATION


const DISTRICT_IDS = [
  'university',
  'cbd',
  'hightech',
  'oldtown',
  'village',
  'market',
  'industry'
];

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
      source
        .charCodeAt(i);

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

class SimulationSystem {
  isLeapYear(year) {
    return (
      timeScheduleCoordinator
        .isLeapYear(
          year
        )
    );
  }

  getDayOrdinal(
    time
  ) {
    return (
      timeScheduleCoordinator
        .dayOrdinal(
          time
        )
    );
  }

  getSeason(
    month
  ) {
    const value =
      Number(
        month
      ) ||
      1;

    if (
      value >= 3 &&
      value <= 5
    ) {
      return 'spring';
    }

    if (
      value >= 6 &&
      value <= 8
    ) {
      return 'summer';
    }

    if (
      value >= 9 &&
      value <= 11
    ) {
      return 'autumn';
    }

    return 'winter';
  }

  getSeed() {
    const simulation =
      gameState
        .getSimulation();

    if (
      simulation.seed ==
      null
    ) {
      const world =
        gameState
          .getWorld();

      const time =
        gameState
          .getTime();

      const raw =
        (
          world.currentCityId ||
          'city'
        ) +
        ':' +
        (
          world.cityName ||
          'unnamed'
        ) +
        ':' +
        time.year +
        ':' +
        time.month +
        ':' +
        time.day;

      simulation.seed =
        Math.floor(
          hashFloat(
            raw
          ) *
          2147483646
        ) +
        1;
    }

    return simulation.seed;
  }

  chooseWeather(
    dayOrdinal
  ) {
    const time =
      gameState
        .getTime();

    const season =
      this.getSeason(
        time.month
      );

    const profile =
      simulationConfig
        .weather
        .profiles[
          season
        ];

    const roll =
      hashFloat(
        this.getSeed() +
        ':weather:' +
        dayOrdinal
      );

    let cumulative =
      0;

    let weather =
      profile[
        profile.length -
        1
      ][0];

    for (
      let i = 0;
      i < profile.length;
      i++
    ) {
      cumulative +=
        profile[i][1];

      if (
        roll <=
        cumulative
      ) {
        weather =
          profile[i][0];

        break;
      }
    }

    const base =
      simulationConfig
        .weather
        .seasonalBaseTemperature[
          season
        ];

    const noise =
      (
        hashFloat(
          this.getSeed() +
          ':temp:' +
          dayOrdinal
        ) *
          2 -
        1
      ) *
      simulationConfig
        .weather
        .temperatureNoise;

    let temperature =
      base +
      noise;

    if (
      weather ===
      'hot'
    ) {
      temperature +=
        simulationConfig
          .weather
          .temperatureNoise *
        0.75;
    }

    if (
      weather ===
      'cold'
    ) {
      temperature -=
        simulationConfig
          .weather
          .temperatureNoise;
    }

    if (
      weather ===
        'rain' ||
      weather ===
        'heavyRain'
    ) {
      temperature -=
        simulationConfig
          .weather
          .temperatureNoise *
        0.25;
    }

    return {
      weather,
      temperature:
        Math.round(
          temperature
        ),
      season
    };
  }

  updateWeather(
    dayOrdinal
  ) {
    const result =
      this.chooseWeather(
        dayOrdinal
      );

    gameState.setWeather(
      result.weather,
      result.temperature
    );

    const simulation =
      gameState
        .getSimulation();

    simulation
      .weatherHistory
      .unshift({
        day:
          dayOrdinal,

        weather:
          result.weather,

        temperature:
          result.temperature
      });

    simulation
      .weatherHistory =
      simulation
        .weatherHistory
        .slice(
          0,
          30
        );

    return result;
  }

  getMarketSummaries() {
    const result =
      {};

    for (
      let i = 0;
      i < DISTRICT_IDS.length;
      i++
    ) {
      const id =
        DISTRICT_IDS[i];

      result[id] =
        propertyMarketSystem
          .getDistrictSummary(
            id
          );
    }

    return result;
  }

  getMarketEvents() {
    const state =
      propertyMarketSystem
        .getState();

    const active =
      Array.isArray(
        state.activeEvents
      )
        ? state.activeEvents
        : [];

    const external =
      Array.isArray(
        state.externalModifiers
      )
        ? state.externalModifiers
        : [];

    return active
      .concat(
        external
      )
      .map(
        event => {
          if (
            event.districtId ||
            !event.streetId
          ) {
            return event;
          }

          const street =
            propertySystem
              .getStreet(
                event.streetId
              );

          return street
            ? {
                ...event,

                districtId:
                  street.districtId
              }
            : event;
        }
      );
  }

  pushNews(
    item
  ) {
    if (
      !item ||
      !item.key ||
      !item.title
    ) {
      return false;
    }

    const simulation =
      gameState
        .getSimulation();

    const existingIndex =
      simulation
        .newsFeed
        .findIndex(
          entry =>
            entry.key ===
            item.key
        );

    if (
      existingIndex >=
      0
    ) {
      simulation
        .newsFeed
        .splice(
          existingIndex,
          1
        );
    }

    simulation
      .newsFeed
      .unshift({
        key:
          item.key,

        title:
          item.title,

        detail:
          item.detail ||
          '',

        severity:
          item.severity ||
          'info',

        districtId:
          item.districtId ||
          null,

        day:
          item.day ||
          this.getDayOrdinal(
            gameState
              .getTime()
          )
      });

    simulation
      .newsFeed =
      simulation
        .newsFeed
        .slice(
          0,
          simulationConfig
            .news
            .maxItems
        );

    return true;
  }

  buildDailyNews(
    dayOrdinal,
    weatherResult,
    districtSnapshot,
    events
  ) {
    const weatherLabels = {
      sunny:
        '晴',
      cloudy:
        '多云',
      rain:
        '小雨',
      heavyRain:
        '暴雨',
      hot:
        '高温',
      cold:
        '降温'
    };

    this.pushNews({
      key:
        'weather:' +
        dayOrdinal,

      title:
        '今日天气 ' +
        (
          weatherLabels[
            weatherResult
              .weather
          ] ||
          weatherResult
            .weather
        ) +
        ' ' +
        weatherResult
          .temperature +
        '℃',

      detail:
        '天气已计入各商圈餐饮需求',

      severity:
        weatherResult
          .weather ===
            'heavyRain' ||
        weatherResult
          .weather ===
            'hot'
          ? 'warning'
          : 'info',

      day:
        dayOrdinal
    });

    const currentEvents =
      Array.isArray(
        events
      )
        ? events
        : [];

    for (
      let i = 0;
      i < currentEvents.length;
      i++
    ) {
      const event =
        currentEvents[i];

      const district =
        event.districtId
          ? citySystem
              .getDistrict(
                event.districtId
              )
          : null;

      this.pushNews({
        key:
          'event:' +
          event.id,

        title:
          event.name,

        detail:
          (
            district
              ? district.name +
                '｜'
              : ''
          ) +
          event.description,

        severity:
          Number(
            event.trafficFactor
          ) <
            1 ||
          Number(
            event.npcDemandFactor
          ) <
            1
            ? 'warning'
            : 'good',

        districtId:
          event.districtId ||
          null,

        day:
          dayOrdinal
      });
    }

    let biggest =
      null;

    const ids =
      Object.keys(
        districtSnapshot ||
        {}
      );

    for (
      let i = 0;
      i < ids.length;
      i++
    ) {
      const district =
        districtSnapshot[
          ids[i]
        ];

      const score =
        Math.abs(
          district
            .demandDeltaRatio
        ) +
        Math.abs(
          district
            .populationDelta
        ) /
        Math.max(
          1,
          district
            .residentPopulation
        );

      if (
        !biggest ||
        score >
          biggest.score
      ) {
        biggest = {
          score,
          district
        };
      }
    }

    if (biggest) {
      const district =
        biggest.district;

      const demandPct =
        Math.round(
          district
            .demandDeltaRatio *
          100
        );

      const populationDelta =
        Math.round(
          district
            .populationDelta
        );

      this.pushNews({
        key:
          'district:' +
          dayOrdinal +
          ':' +
          district.id,

        title:
          district.name +
          '经营动态',

        detail:
          '活跃人口' +
          (
            populationDelta >=
            0
              ? '+'
              : ''
          ) +
          populationDelta +
          '｜日需求' +
          (
            demandPct >=
            0
              ? '+'
              : ''
          ) +
          demandPct +
          '%｜餐饮店' +
          district
            .restaurantCount +
          '家',

        severity:
          demandPct >=
          0
            ? 'good'
            : 'warning',

        districtId:
          district.id,

        day:
          dayOrdinal
      });
    }
  }

  processDay(
    dayOrdinal
  ) {
    const marketState =
      propertyMarketSystem
        .getState();

    if (
      !marketState.initialized
    ) {
      propertyMarketSystem
        .reset({
          seed:
            this.getSeed(),

          currentDay:
            dayOrdinal
        });

      propertyMarketSystem
        .initialize({
          currentDay:
            dayOrdinal
        });
    } else if (
      marketState.currentDay <
      dayOrdinal
    ) {
      propertyMarketSystem
        .advanceDays(
          dayOrdinal -
          marketState.currentDay
        );
    }

    const weather =
      this.updateWeather(
        dayOrdinal
      );

    const marketSummaries =
      this.getMarketSummaries();

    const events =
      this.getMarketEvents();

    const snapshot =
      citySystem
        .applyDailySimulation({
          dayOrdinal,

          dayOfWeek:
            dayOrdinal %
            7,

          marketSummaries,

          events,

          weather:
            weather.weather,

          temperature:
            weather.temperature
        });

    const simulation =
      gameState
        .getSimulation();

    simulation
      .lastDailySnapshot =
      snapshot;

    simulation
      .lastProcessedDay =
      dayOrdinal;

    this.buildDailyNews(
      dayOrdinal,
      weather,
      snapshot,
      events
    );

    dynamicWorldSystem
      .processDay(
        dayOrdinal,
        {
          weather:
            weather.weather,
          temperature:
            weather.temperature
        }
      );

    // V084_WORLD_DAILY_TICK
    liveWorldSystem
      .processDay(
        dayOrdinal,
        {
          weather:
            weather.weather,
          temperature:
            weather.temperature
        }
      );

    return snapshot;
  }

  initialize() {
    const simulation =
      gameState
        .getSimulation();

    citySystem
      .ensureAllDistrictStates();

    const day =
      this.getDayOrdinal(
        gameState
          .getTime()
      );

    if (
      !simulation
        .initialized
    ) {
      this.getSeed();

      this.processDay(
        day
      );

      simulation
        .initialized =
        true;
    } else {
      const market =
        propertyMarketSystem
          .getState();

      if (
        !market.initialized
      ) {
        propertyMarketSystem
          .reset({
            seed:
              this.getSeed(),

            currentDay:
              day
          });

        propertyMarketSystem
          .initialize({
            currentDay:
              day
          });
      }

      if (
        simulation
          .lastProcessedDay ==
        null
      ) {
        simulation
          .lastProcessedDay =
          day;
      }

      if (
        gameState
          .getWorld()
          .weather ==
        null
      ) {
        this.updateWeather(
          day
        );
      }
    }

    return true;
  }

  update(
    advancedMinutes
  ) {
    if (
      !Number(
        advancedMinutes
      )
    ) {
      return false;
    }

    this.initialize();

    const simulation =
      gameState
        .getSimulation();

    const currentDay =
      this.getDayOrdinal(
        gameState
          .getTime()
      );

    let changed =
      false;

    while (
      simulation
        .lastProcessedDay <
      currentDay
    ) {
      this.processDay(
        simulation
          .lastProcessedDay +
          1
      );

      changed =
        true;
    }

    return changed;
  }

  getNewsFeed() {
    this.initialize();

    return gameState
      .getSimulation()
      .newsFeed
      .slice();
  }

  getBulletin() {
    const feed =
      this.getNewsFeed();

    if (
      feed.length ===
      0
    ) {
      const district =
        citySystem
          .getCurrentDistrict();

      return {
        title:
          district
            ? district.name +
              '市场运行平稳'
            : '城市运行平稳',

        detail:
          '人口、需求、租金和NPC经营状态持续联动',

        severity:
          'info'
      };
    }

    const time =
      gameState
        .getTime();

    const rotationHours =
      Math.max(
        1,
        simulationConfig
          .news
          .rotateEveryGameHours
      );

    const index =
      Math.floor(
        (
          time.hour +
          time.minute /
            60
        ) /
        rotationHours
      ) %
      feed.length;

    return feed[
      index
    ];
  }

  getGoalState() {
    const business =
      gameState
        .getBusiness();

    if (
      !business.hasShop
    ) {
      return {
        title:
          '开设首店',

        detail:
          '选址 → 看铺 → 谈判 → 签约',

        completed:
          false
      };
    }

    const current =
      business.shops
        .find(
          shop =>
            shop.id ===
            business
              .currentShopId
        ) ||
      business.shops[0];

    return {
      title:
        current &&
        current.name
          ? '经营 ' +
            current.name
          : '经营首店',

      detail:
        '让门店稳定盈利并积累品牌声望',

      completed:
        false
    };
  }
}

const simulationSystem =
  new SimulationSystem();

module.exports =
  simulationSystem;
