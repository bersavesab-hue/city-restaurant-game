'use strict';

const gameState =
  require('../core/gameState.js');

const simulationConfig =
  require('../core/simulationConfig.js');

/**
 * 基础商圈资料只负责“起点/结构”。
 * 玩家看到的当前人口、需求、餐厅数、饱和度、租金指数、客单价
 * 全部从运行时动态状态中读取，不再直接把这里的基础数值当当前值。
 */

const CITY_DATA = {
  yunzhou: {
    id: 'yunzhou',
    name: '云州市',
    population: 628400,
    economyLevel: 3,
    districts: [
      'oldtown',
      'cbd',
      'university',
      'market',
      'village',
      'industry',
      'hightech'
    ]
  }
};

const DISTRICT_DATA = {
  oldtown: {
    id: 'oldtown',
    cityId: 'yunzhou',
    name: '老城区',
    population: 30240,
    avgSpend: 22.4,
    baseDemand: 7200,
    restaurantCount: 89,
    saturation: 67,
    rentIndex: 0.55,
    mainCustomers: [
      'resident',
      'elderly',
      'family'
    ],
    mealDemand: {
      breakfast: 0.18,
      lunch: 0.31,
      afternoon: 0.08,
      dinner: 0.34,
      night: 0.09
    }
  },

  cbd: {
    id: 'cbd',
    cityId: 'yunzhou',
    name: '商业中心',
    population: 48700,
    avgSpend: 48.6,
    baseDemand: 13800,
    restaurantCount: 152,
    saturation: 91,
    rentIndex: 1.0,
    mainCustomers: [
      'office',
      'business',
      'tourist'
    ],
    mealDemand: {
      breakfast: 0.12,
      lunch: 0.42,
      afternoon: 0.12,
      dinner: 0.27,
      night: 0.07
    }
  },

  university: {
    id: 'university',
    cityId: 'yunzhou',
    name: '大学城',
    population: 36300,
    avgSpend: 21.6,
    baseDemand: 14820,
    restaurantCount: 126,
    saturation: 84,
    rentIndex: 0.72,
    mainCustomers: [
      'student',
      'teacher',
      'resident'
    ],
    mealDemand: {
      breakfast: 0.15,
      lunch: 0.34,
      afternoon: 0.09,
      dinner: 0.29,
      night: 0.13
    }
  },

  market: {
    id: 'market',
    cityId: 'yunzhou',
    name: '东门市场',
    population: 27400,
    avgSpend: 18.3,
    baseDemand: 8600,
    restaurantCount: 74,
    saturation: 64,
    rentIndex: 0.48,
    mainCustomers: [
      'resident',
      'vendor',
      'worker'
    ],
    mealDemand: {
      breakfast: 0.22,
      lunch: 0.32,
      afternoon: 0.08,
      dinner: 0.30,
      night: 0.08
    }
  },

  village: {
    id: 'village',
    cityId: 'yunzhou',
    name: '城中村',
    population: 41800,
    avgSpend: 16.8,
    baseDemand: 10200,
    restaurantCount: 103,
    saturation: 72,
    rentIndex: 0.38,
    mainCustomers: [
      'worker',
      'tenant',
      'student'
    ],
    mealDemand: {
      breakfast: 0.19,
      lunch: 0.28,
      afternoon: 0.05,
      dinner: 0.31,
      night: 0.17
    }
  },

  industry: {
    id: 'industry',
    cityId: 'yunzhou',
    name: '工业园',
    population: 32900,
    avgSpend: 19.5,
    baseDemand: 9200,
    restaurantCount: 81,
    saturation: 61,
    rentIndex: 0.44,
    mainCustomers: [
      'worker',
      'driver',
      'staff'
    ],
    mealDemand: {
      breakfast: 0.17,
      lunch: 0.43,
      afternoon: 0.04,
      dinner: 0.29,
      night: 0.07
    }
  },

  hightech: {
    id: 'hightech',
    cityId: 'yunzhou',
    name: '高新区',
    population: 38100,
    avgSpend: 36.2,
    baseDemand: 9800,
    restaurantCount: 97,
    saturation: 75,
    rentIndex: 0.84,
    mainCustomers: [
      'office',
      'tech',
      'business'
    ],
    mealDemand: {
      breakfast: 0.13,
      lunch: 0.40,
      afternoon: 0.12,
      dinner: 0.28,
      night: 0.07
    }
  }
};

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

class CitySystem {
  getBaseCity(id) {
    return CITY_DATA[id] || null;
  }

  getBaseDistrict(id) {
    return DISTRICT_DATA[id] || null;
  }

  ensureDistrictState(
    districtId
  ) {
    const base =
      this.getBaseDistrict(
        districtId
      );

    if (!base) {
      return null;
    }

    const simulation =
      gameState
        .getSimulation();

    if (
      !simulation
        .districtState[
          districtId
        ]
    ) {
      const supportCapacity =
        base.restaurantCount /
        Math.max(
          0.01,
          base.saturation /
          100
        );

      simulation
        .districtState[
          districtId
        ] = {
          residentPopulation:
            base.population,

          effectivePopulation:
            base.population,

          basePopulationAnchor:
            base.population,

          demandPerCapita:
            base.baseDemand /
            Math.max(
              1,
              base.population
            ),

          dailyDemandBase:
            base.baseDemand,

          restaurantCount:
            base.restaurantCount,

          restaurantSupportAnchor:
            supportCapacity,

          avgSpend:
            base.avgSpend,

          rentIndex:
            base.rentIndex,

          marketRentAnchor:
            null,

          currentMarketRent:
            null,

          economyMomentum:
            1,

          eventTrafficFactor:
            1,

          eventDemandFactor:
            1,

          eventPopulationFactor:
            1,

          eventRentFactor:
            1,

          populationDelta:
            0,

          demandDeltaRatio:
            0,

          lastUpdatedDay:
            null
        };
    }

    return simulation
      .districtState[
        districtId
      ];
  }

  ensureAllDistrictStates() {
    const ids =
      Object.keys(
        DISTRICT_DATA
      );

    for (
      let i = 0;
      i < ids.length;
      i++
    ) {
      this.ensureDistrictState(
        ids[i]
      );
    }
  }

  getCity(id) {
    const base =
      this.getBaseCity(
        id
      );

    if (!base) {
      return null;
    }

    this.ensureAllDistrictStates();

    let baselineSum =
      0;

    let currentSum =
      0;

    for (
      let i = 0;
      i < base.districts.length;
      i++
    ) {
      const districtId =
        base.districts[i];

      const districtBase =
        this.getBaseDistrict(
          districtId
        );

      const state =
        this.ensureDistrictState(
          districtId
        );

      baselineSum +=
        districtBase.population;

      currentSum +=
        state.residentPopulation;
    }

    const growthRatio =
      baselineSum >
      0
        ? currentSum /
          baselineSum
        : 1;

    return {
      ...base,

      population:
        Math.round(
          base.population *
          growthRatio
        ),

      basePopulation:
        base.population,

      populationGrowthRatio:
        growthRatio
    };
  }

  getCurrentCity() {
    const world =
      gameState.getWorld();

    return this.getCity(
      world.currentCityId
    );
  }

  getDistrict(id) {
    const base =
      this.getBaseDistrict(
        id
      );

    if (!base) {
      return null;
    }

    const state =
      this.ensureDistrictState(
        id
      );

    const demandRatio =
      state.dailyDemandBase /
      Math.max(
        1,
        base.baseDemand
      );

    const supportCapacity =
      state.restaurantSupportAnchor *
      Math.max(
        0.45,
        demandRatio
      );

    const saturation =
      clamp(
        Math.round(
          state.restaurantCount /
          Math.max(
            1,
            supportCapacity
          ) *
          100
        ),
        simulationConfig
          .city
          .minSaturation,
        simulationConfig
          .city
          .maxSaturation
      );

    return {
      ...base,

      population:
        Math.round(
          state.effectivePopulation
        ),

      residentPopulation:
        Math.round(
          state.residentPopulation
        ),

      populationDelta:
        Math.round(
          state.populationDelta
        ),

      avgSpend:
        Number(
          state.avgSpend
            .toFixed(
              1
            )
        ),

      baseDemand:
        Math.max(
          0,
          Math.round(
            state.dailyDemandBase
          )
        ),

      demandDeltaRatio:
        state.demandDeltaRatio,

      restaurantCount:
        Math.max(
          0,
          Math.round(
            state.restaurantCount
          )
        ),

      saturation,

      rentIndex:
        Number(
          state.rentIndex
            .toFixed(
              2
            )
        ),

      economyMomentum:
        state.economyMomentum,

      eventTrafficFactor:
        state.eventTrafficFactor,

      eventDemandFactor:
        state.eventDemandFactor,

      eventPopulationFactor:
        state.eventPopulationFactor,

      eventRentFactor:
        state.eventRentFactor,

      lastUpdatedDay:
        state.lastUpdatedDay
    };
  }

  getCurrentDistrict() {
    const world =
      gameState.getWorld();

    return this.getDistrict(
      world.currentDistrictId
    );
  }

  getDistrictsByCity(cityId) {
    const city =
      this.getBaseCity(
        cityId
      );

    if (!city) {
      return [];
    }

    return city.districts
      .map(
        id =>
          this.getDistrict(
            id
          )
      )
      .filter(Boolean);
  }

  setCurrentDistrict(id) {
    if (!DISTRICT_DATA[id]) {
      return false;
    }

    gameState.setDistrict(id);

    return true;
  }

  getMealDemand(
    districtId,
    mealPeriod
  ) {
    const district =
      this.getDistrict(
        districtId
      );

    if (!district) {
      return 0;
    }

    const ratio =
      district.mealDemand[
        mealPeriod
      ] || 0;

    return Math.floor(
      district.baseDemand *
      ratio
    );
  }

  getEventAggregate(
    districtId,
    events
  ) {
    const list =
      Array.isArray(
        events
      )
        ? events
        : [];

    let trafficFactor =
      1;

    let rentFactor =
      1;

    let npcDemandFactor =
      1;

    let listingSupplyFactor =
      1;

    for (
      let i = 0;
      i < list.length;
      i++
    ) {
      const event =
        list[i];

      const applies =
        !event.districtId ||
        event.districtId ===
          districtId;

      if (!applies) {
        continue;
      }

      trafficFactor *=
        Number(
          event.trafficFactor
        ) ||
        1;

      rentFactor *=
        Number(
          event.rentPressure
        ) ||
        1;

      npcDemandFactor *=
        Number(
          event.npcDemandFactor
        ) ||
        1;

      listingSupplyFactor *=
        Number(
          event.listingSupplyFactor
        ) ||
        1;
    }

    const demandFactor =
      clamp(
        Math.sqrt(
          trafficFactor *
          npcDemandFactor
        ),
        0.58,
        1.58
      );

    const populationFactor =
      clamp(
        1 +
        (
          trafficFactor -
          1
        ) *
          0.42 +
        (
          npcDemandFactor -
          1
        ) *
          0.18,
        simulationConfig
          .city
          .minEffectivePopulationRatio,
        simulationConfig
          .city
          .maxEffectivePopulationRatio
      );

    return {
      trafficFactor:
        clamp(
          trafficFactor,
          0.45,
          1.75
        ),

      rentFactor:
        clamp(
          rentFactor,
          0.70,
          1.45
        ),

      npcDemandFactor:
        clamp(
          npcDemandFactor,
          0.50,
          1.80
        ),

      listingSupplyFactor:
        clamp(
          listingSupplyFactor,
          0.55,
          1.75
        ),

      demandFactor,

      populationFactor
    };
  }

  getActivityFactor(
    base,
    dayOfWeek
  ) {
    const weekend =
      dayOfWeek ===
        0 ||
      dayOfWeek ===
        6;

    if (!weekend) {
      return 1;
    }

    const main =
      base.mainCustomers ||
      [];

    let factor =
      1;

    if (
      main.indexOf(
        'office'
      ) !==
      -1 ||
      main.indexOf(
        'business'
      ) !==
      -1
    ) {
      factor *=
        0.82;
    }

    if (
      main.indexOf(
        'worker'
      ) !==
      -1 ||
      main.indexOf(
        'staff'
      ) !==
      -1
    ) {
      factor *=
        0.90;
    }

    if (
      main.indexOf(
        'resident'
      ) !==
      -1 ||
      main.indexOf(
        'family'
      ) !==
      -1 ||
      main.indexOf(
        'tourist'
      ) !==
      -1
    ) {
      factor *=
        1.10;
    }

    if (
      main.indexOf(
        'student'
      ) !==
      -1
    ) {
      factor *=
        1.03;
    }

    return clamp(
      factor,
      0.72,
      1.24
    );
  }

  applyDailySimulation(
    context
  ) {
    const ctx =
      context ||
      {};

    const dayOrdinal =
      Number(
        ctx.dayOrdinal
      ) ||
      1;

    const dayOfWeek =
      Number(
        ctx.dayOfWeek
      ) ||
      0;

    const events =
      Array.isArray(
        ctx.events
      )
        ? ctx.events
        : [];

    const marketSummaries =
      ctx.marketSummaries ||
      {};

    const result = {};

    const ids =
      Object.keys(
        DISTRICT_DATA
      );

    for (
      let i = 0;
      i < ids.length;
      i++
    ) {
      const id =
        ids[i];

      const base =
        DISTRICT_DATA[id];

      const state =
        this.ensureDistrictState(
          id
        );

      const beforePopulation =
        state.effectivePopulation;

      const beforeDemand =
        state.dailyDemandBase;

      const event =
        this.getEventAggregate(
          id,
          events
        );

      const activity =
        this.getActivityFactor(
          base,
          dayOfWeek
        );

      const random =
        hashFloat(
          String(
            gameState
              .getSimulation()
              .seed
          ) +
          ':' +
          dayOrdinal +
          ':' +
          id
        );

      const randomDrift =
        (
          random -
          0.5
        ) *
        simulationConfig
          .city
          .maxDailyResidentChangeRatio;

      const economySignal =
        (
          event.npcDemandFactor -
          1
        ) *
          0.0010 +
        (
          event.trafficFactor -
          1
        ) *
          0.00055 -
        Math.max(
          0,
          event.rentFactor -
            1
        ) *
          0.00035 -
        Math.max(
          0,
          event.listingSupplyFactor -
            1
        ) *
          0.00020;

      const migrationRate =
        clamp(
          economySignal +
          randomDrift,
          -simulationConfig
            .city
            .maxDailyResidentChangeRatio,
          simulationConfig
            .city
            .maxDailyResidentChangeRatio
        );

      const residentBefore =
        state.residentPopulation;

      state.residentPopulation =
        clamp(
          residentBefore *
          (
            1 +
            migrationRate
          ),
          state.basePopulationAnchor *
            0.82,
          state.basePopulationAnchor *
            1.35
        );

      const populationFactor =
        clamp(
          event.populationFactor *
          activity,
          simulationConfig
            .city
            .minEffectivePopulationRatio,
          simulationConfig
            .city
            .maxEffectivePopulationRatio
        );

      state.effectivePopulation =
        state.residentPopulation *
        populationFactor;

      const economyTarget =
        clamp(
          1 +
          (
            event.npcDemandFactor -
            1
          ) *
            0.16 +
          (
            event.trafficFactor -
            1
          ) *
            0.10 -
          Math.max(
            0,
            event.listingSupplyFactor -
              1
          ) *
            0.06,
          0.82,
          1.22
        );

      state.economyMomentum +=
        (
          economyTarget -
          state.economyMomentum
        ) *
        simulationConfig
          .city
          .economySmoothing;

      const populationDemandRatio =
        state.effectivePopulation /
        Math.max(
          1,
          base.population
        );

      const demandTarget =
        base.baseDemand *
        populationDemandRatio *
        event.demandFactor *
        state.economyMomentum;

      state.dailyDemandBase =
        Math.max(
          0,
          demandTarget
        );

      const spendTarget =
        base.avgSpend *
        clamp(
          state.economyMomentum *
          (
            1 +
            (
              event.rentFactor -
              1
            ) *
              0.30
          ),
          0.78,
          1.28
        );

      state.avgSpend +=
        (
          spendTarget -
          state.avgSpend
        ) *
        simulationConfig
          .city
          .spendSmoothing;

      const market =
        marketSummaries[id] ||
        null;

      if (
        market &&
        Number(
          market.averageAskingRent
        ) >
          0
      ) {
        if (
          !state.marketRentAnchor
        ) {
          state.marketRentAnchor =
            Number(
              market.averageAskingRent
            );
        }

        state.currentMarketRent =
          Number(
            market.averageAskingRent
          );

        const targetRentIndex =
          base.rentIndex *
          (
            state.currentMarketRent /
            Math.max(
              1,
              state.marketRentAnchor
            )
          );

        state.rentIndex +=
          (
            targetRentIndex -
            state.rentIndex
          ) *
          simulationConfig
            .city
            .rentSmoothing;
      }

      const demandRatio =
        state.dailyDemandBase /
        Math.max(
          1,
          base.baseDemand
        );

      const targetRestaurantCount =
        Math.max(
          1,
          Math.round(
            base.restaurantCount *
            Math.pow(
              demandRatio,
              0.72
            ) *
            Math.pow(
              event.npcDemandFactor,
              0.28
            )
          )
        );

      const restaurantGap =
        targetRestaurantCount -
        state.restaurantCount;

      if (
        Math.abs(
          restaurantGap
        ) >=
        1
      ) {
        const move =
          Math.min(
            simulationConfig
              .city
              .maxRestaurantChangePerDay,
            Math.abs(
              Math.round(
                restaurantGap
              )
            )
          );

        const probability =
          clamp(
            Math.abs(
              restaurantGap
            ) /
            Math.max(
              1,
              base.restaurantCount *
                0.08
            ),
            0.12,
            0.92
          );

        const roll =
          hashFloat(
            id +
            ':restaurant:' +
            dayOrdinal +
            ':' +
            gameState
              .getSimulation()
              .seed
          );

        if (
          roll <
          probability
        ) {
          state.restaurantCount +=
            restaurantGap >
            0
              ? move
              : -move;
        }
      }

      state.eventTrafficFactor =
        event.trafficFactor;

      state.eventDemandFactor =
        event.demandFactor;

      state.eventPopulationFactor =
        populationFactor;

      state.eventRentFactor =
        event.rentFactor;

      state.populationDelta =
        state.effectivePopulation -
        beforePopulation;

      state.demandDeltaRatio =
        beforeDemand >
        0
          ? (
              state.dailyDemandBase -
              beforeDemand
            ) /
            beforeDemand
          : 0;

      state.lastUpdatedDay =
        dayOrdinal;

      result[id] =
        this.getDistrict(
          id
        );
    }

    return result;
  }

  isSaturated(
    districtId
  ) {
    const district =
      this.getDistrict(
        districtId
      );

    if (!district) {
      return false;
    }

    return (
      district.saturation >=
      simulationConfig
        .city
        .saturatedThreshold
    );
  }

  getCompetitionLevel(
    districtId
  ) {
    const district =
      this.getDistrict(
        districtId
      );

    if (!district) {
      return 'unknown';
    }

    if (
      district.saturation >=
      simulationConfig
        .city
        .competitionBands
        .extreme
    ) {
      return 'extreme';
    }

    if (
      district.saturation >=
      simulationConfig
        .city
        .competitionBands
        .high
    ) {
      return 'high';
    }

    if (
      district.saturation >=
      simulationConfig
        .city
        .competitionBands
        .medium
    ) {
      return 'medium';
    }

    return 'low';
  }

  getDistrictSummary(
    districtId
  ) {
    const district =
      this.getDistrict(
        districtId
      );

    if (!district) {
      return null;
    }

    return {
      id:
        district.id,

      name:
        district.name,

      population:
        district.population,

      residentPopulation:
        district.residentPopulation,

      populationDelta:
        district.populationDelta,

      avgSpend:
        district.avgSpend,

      dailyDemand:
        district.baseDemand,

      demandDeltaRatio:
        district.demandDeltaRatio,

      restaurantCount:
        district.restaurantCount,

      saturation:
        district.saturation,

      rentIndex:
        district.rentIndex,

      competition:
        this.getCompetitionLevel(
          districtId
        )
    };
  }
}

const citySystem =
  new CitySystem();

module.exports =
  citySystem;
