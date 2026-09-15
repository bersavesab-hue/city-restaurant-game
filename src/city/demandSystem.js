'use strict';

const citySystem =
  require('./citySystem.js');

const timeSystem =
  require('../core/timeSystem.js');

const gameState =
  require('../core/gameState.js');

const simulationConfig =
  require('../core/simulationConfig.js');

const CUSTOMER_TYPES = {
  student: {
    id: 'student',
    name: '学生',
    priceSensitivity: 0.90,
    speedSensitivity: 0.72,
    qualitySensitivity: 0.58,
    repeatSensitivity: 0.72
  },

  teacher: {
    id: 'teacher',
    name: '教师',
    priceSensitivity: 0.52,
    speedSensitivity: 0.60,
    qualitySensitivity: 0.74,
    repeatSensitivity: 0.78
  },

  resident: {
    id: 'resident',
    name: '周边居民',
    priceSensitivity: 0.66,
    speedSensitivity: 0.48,
    qualitySensitivity: 0.72,
    repeatSensitivity: 0.86
  },

  elderly: {
    id: 'elderly',
    name: '老年居民',
    priceSensitivity: 0.74,
    speedSensitivity: 0.30,
    qualitySensitivity: 0.62,
    repeatSensitivity: 0.90
  },

  family: {
    id: 'family',
    name: '家庭客',
    priceSensitivity: 0.58,
    speedSensitivity: 0.46,
    qualitySensitivity: 0.82,
    repeatSensitivity: 0.80
  },

  office: {
    id: 'office',
    name: '白领',
    priceSensitivity: 0.46,
    speedSensitivity: 0.92,
    qualitySensitivity: 0.78,
    repeatSensitivity: 0.66
  },

  business: {
    id: 'business',
    name: '商务客',
    priceSensitivity: 0.28,
    speedSensitivity: 0.70,
    qualitySensitivity: 0.92,
    repeatSensitivity: 0.52
  },

  tourist: {
    id: 'tourist',
    name: '游客',
    priceSensitivity: 0.48,
    speedSensitivity: 0.50,
    qualitySensitivity: 0.76,
    repeatSensitivity: 0.16
  },

  vendor: {
    id: 'vendor',
    name: '商贩',
    priceSensitivity: 0.80,
    speedSensitivity: 0.84,
    qualitySensitivity: 0.54,
    repeatSensitivity: 0.82
  },

  worker: {
    id: 'worker',
    name: '工人',
    priceSensitivity: 0.86,
    speedSensitivity: 0.76,
    qualitySensitivity: 0.54,
    repeatSensitivity: 0.84
  },

  tenant: {
    id: 'tenant',
    name: '租住人口',
    priceSensitivity: 0.82,
    speedSensitivity: 0.60,
    qualitySensitivity: 0.58,
    repeatSensitivity: 0.76
  },

  driver: {
    id: 'driver',
    name: '司机',
    priceSensitivity: 0.68,
    speedSensitivity: 0.88,
    qualitySensitivity: 0.52,
    repeatSensitivity: 0.46
  },

  staff: {
    id: 'staff',
    name: '园区职员',
    priceSensitivity: 0.58,
    speedSensitivity: 0.84,
    qualitySensitivity: 0.68,
    repeatSensitivity: 0.70
  },

  tech: {
    id: 'tech',
    name: '科技从业者',
    priceSensitivity: 0.42,
    speedSensitivity: 0.86,
    qualitySensitivity: 0.82,
    repeatSensitivity: 0.68
  }
};

const DISTRICT_CUSTOMER_MIX = {
  oldtown: {
    resident: 0.48,
    elderly: 0.28,
    family: 0.24
  },

  cbd: {
    office: 0.60,
    business: 0.22,
    tourist: 0.18
  },

  university: {
    student: 0.72,
    teacher: 0.10,
    resident: 0.18
  },

  market: {
    resident: 0.42,
    vendor: 0.32,
    worker: 0.26
  },

  village: {
    worker: 0.46,
    tenant: 0.38,
    student: 0.16
  },

  industry: {
    worker: 0.68,
    driver: 0.14,
    staff: 0.18
  },

  hightech: {
    office: 0.54,
    tech: 0.34,
    business: 0.12
  }
};

class DemandSystem {
  getCustomerType(id) {
    return CUSTOMER_TYPES[id] || null;
  }

  getCustomerMix(districtId) {
    return (
      DISTRICT_CUSTOMER_MIX[
        districtId
      ] || {}
    );
  }

  getWeatherModifier() {
    const world =
      gameState.getWorld();

    return (
      simulationConfig
        .demand
        .weatherFactors[
          world.weather
        ] ||
      1
    );
  }

  getWeekdayModifier() {
    const time =
      gameState.getTime();

    const dateIndex =
      this.getDayOrdinal(
        time
      );

    const weekday =
      dateIndex %
      7;

    const weekend =
      weekday ===
        0 ||
      weekday ===
        6;

    return weekend
      ? simulationConfig
          .demand
          .weekdayFactors
          .weekend
      : simulationConfig
          .demand
          .weekdayFactors
          .weekday;
  }

  isLeapYear(year) {
    return (
      year % 400 ===
        0 ||
      (
        year % 4 ===
          0 &&
        year % 100 !==
          0
      )
    );
  }

  getDayOrdinal(time) {
    const y =
      Math.max(
        1,
        Number(
          time.year
        ) ||
        1
      );

    const m =
      Math.max(
        1,
        Math.min(
          12,
          Number(
            time.month
          ) ||
          1
        )
      );

    const d =
      Math.max(
        1,
        Number(
          time.day
        ) ||
        1
      );

    const y0 =
      y -
      1;

    let days =
      y0 *
        365 +
      Math.floor(
        y0 /
        4
      ) -
      Math.floor(
        y0 /
        100
      ) +
      Math.floor(
        y0 /
        400
      );

    const monthDays = [
      31,
      this.isLeapYear(
        y
      )
        ? 29
        : 28,
      31,
      30,
      31,
      30,
      31,
      31,
      30,
      31,
      30,
      31
    ];

    for (
      let i = 0;
      i < m - 1;
      i++
    ) {
      days +=
        monthDays[i];
    }

    return (
      days +
      d
    );
  }

  getBaseDemand(
    districtId
  ) {
    const mealPeriod =
      timeSystem.getMealPeriod();

    return citySystem.getMealDemand(
      districtId,
      mealPeriod
    );
  }

  getDemandBreakdown(
    districtId
  ) {
    const district =
      citySystem.getDistrict(
        districtId
      );

    if (!district) {
      return null;
    }

    const mealPeriod =
      timeSystem.getMealPeriod();

    const mealRatio =
      district.mealDemand[
        mealPeriod
      ] ||
      0;

    const dynamicDailyDemand =
      district.baseDemand;

    const beforeWeather =
      dynamicDailyDemand *
      mealRatio;

    const weatherFactor =
      this.getWeatherModifier();

    const weekdayFactor =
      this.getWeekdayModifier();

    const total =
      Math.max(
        0,
        Math.floor(
          beforeWeather *
          weatherFactor *
          weekdayFactor
        )
      );

    return {
      districtId,
      mealPeriod,

      effectivePopulation:
        district.population,

      residentPopulation:
        district.residentPopulation,

      dynamicDailyDemand,

      mealRatio,

      weatherFactor,

      weekdayFactor,

      eventDemandFactor:
        district.eventDemandFactor,

      eventTrafficFactor:
        district.eventTrafficFactor,

      total
    };
  }

  getTotalDemand(
    districtId
  ) {
    const breakdown =
      this.getDemandBreakdown(
        districtId
      );

    return breakdown
      ? breakdown.total
      : 0;
  }

  getDemandByCustomerType(
    districtId
  ) {
    const total =
      this.getTotalDemand(
        districtId
      );

    const mix =
      this.getCustomerMix(
        districtId
      );

    const result = {};

    let assigned =
      0;

    const keys =
      Object.keys(
        mix
      );

    for (
      let i = 0;
      i < keys.length;
      i++
    ) {
      const typeId =
        keys[i];

      let amount;

      if (
        i ===
        keys.length -
        1
      ) {
        amount =
          total -
          assigned;
      } else {
        amount =
          Math.floor(
            total *
            mix[
              typeId
            ]
          );

        assigned +=
          amount;
      }

      result[typeId] = {
        typeId,

        name:
          CUSTOMER_TYPES[
            typeId
          ]
            ? CUSTOMER_TYPES[
                typeId
              ].name
            : typeId,

        demand:
          Math.max(
            0,
            amount
          )
      };
    }

    return result;
  }

  createDemandPool(
    districtId
  ) {
    const district =
      citySystem.getDistrict(
        districtId
      );

    if (!district) {
      return null;
    }

    const mealPeriod =
      timeSystem.getMealPeriod();

    const totalDemand =
      this.getTotalDemand(
        districtId
      );

    const customerGroups =
      this.getDemandByCustomerType(
        districtId
      );

    return {
      districtId,

      districtName:
        district.name,

      mealPeriod,

      totalDemand,

      remainingDemand:
        totalDemand,

      customerGroups,

      createdAt:
        Date.now()
    };
  }

  consumeDemand(
    pool,
    amount
  ) {
    if (
      !pool ||
      amount <= 0
    ) {
      return 0;
    }

    const actual =
      Math.min(
        pool.remainingDemand,
        Math.floor(
          amount
        )
      );

    pool.remainingDemand -=
      actual;

    return actual;
  }

  consumeCustomerType(
    pool,
    typeId,
    amount
  ) {
    if (
      !pool ||
      !pool.customerGroups ||
      !pool.customerGroups[
        typeId
      ]
    ) {
      return 0;
    }

    const group =
      pool.customerGroups[
        typeId
      ];

    const actual =
      Math.min(
        group.demand,
        pool.remainingDemand,
        Math.floor(
          amount
        )
      );

    group.demand -=
      actual;

    pool.remainingDemand -=
      actual;

    return actual;
  }

  getRemainingRatio(
    pool
  ) {
    if (
      !pool ||
      pool.totalDemand <=
        0
    ) {
      return 0;
    }

    return (
      pool.remainingDemand /
      pool.totalDemand
    );
  }
}

const demandSystem =
  new DemandSystem();

module.exports =
  demandSystem;


/* V104_TRAFFIC_API_START */
const __v104Traffic = require('./customerTrafficSystem.js');

demandSystem.getStoreFormat = function getStoreFormatV104(store) {
  return __v104Traffic.classifyStore(store || {});
};

demandSystem.getTrafficFunnel = function getTrafficFunnelV104(districtId, store, options) {
  const pool = this.createDemandPool(districtId);
  if (!pool) return null;

  const result = __v104Traffic.simulate({
    district: citySystem.getDistrict(districtId),
    demandPool: pool,
    store: store || {},
    customerTypes: CUSTOMER_TYPES,
    weatherModifier: this.getWeatherModifier(),
    mealPeriod: pool.mealPeriod,
    ...(options || {})
  });

  // 本次返回的是经营快照；不直接永久扣减全局商圈需求，避免每次打开数据页就“吃掉客流”。
  result.demandPool = pool;
  return result;
};
/* V104_TRAFFIC_API_END */
