'use strict';

const gameState = require('../core/gameState.js');

/**
 * 城市系统
 *
 * 负责：
 * - 城市基础数据
 * - 区域 / 商圈数据
 * - 有限餐饮需求
 * - 商圈饱和度
 * - 当前商圈切换
 *
 * 注意：
 * 顾客不是无限刷新的。
 * 每个商圈每天只有有限需求池。
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

class CitySystem {
  getCity(id) {
    return CITY_DATA[id] || null;
  }

  getCurrentCity() {
    const world = gameState.getWorld();

    return this.getCity(
      world.currentCityId
    );
  }

  getDistrict(id) {
    return DISTRICT_DATA[id] || null;
  }

  getCurrentDistrict() {
    const world = gameState.getWorld();

    return this.getDistrict(
      world.currentDistrictId
    );
  }

  getDistrictsByCity(cityId) {
    const city = this.getCity(cityId);

    if (!city) {
      return [];
    }

    return city.districts
      .map(id => this.getDistrict(id))
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
      district.saturation >= 85
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
      district.saturation >= 90
    ) {
      return 'extreme';
    }

    if (
      district.saturation >= 80
    ) {
      return 'high';
    }

    if (
      district.saturation >= 65
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

      avgSpend:
        district.avgSpend,

      dailyDemand:
        district.baseDemand,

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
