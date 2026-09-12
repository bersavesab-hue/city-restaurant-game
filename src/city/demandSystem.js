'use strict';

const citySystem =
  require('./citySystem.js');

const timeSystem =
  require('../core/timeSystem.js');

const gameState =
  require('../core/gameState.js');

/**
 * 顾客群体基础特征
 *
 * share:
 * 只用于各商圈内部的客群分配参考
 *
 * priceSensitivity:
 * 越高越在乎价格
 *
 * speedSensitivity:
 * 越高越在乎出餐速度
 *
 * qualitySensitivity:
 * 越高越在乎味道和品质
 */

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

/**
 * 不同商圈客群比例
 *
 * 总和必须接近 1
 */

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
   
