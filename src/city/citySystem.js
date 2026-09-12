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
      '
