'use strict';

/**
 * 统一模拟参数。
 *
 * 注意：
 * 这里存放的是“规则参数/弹性系数”，不是玩家看到的当前数值。
 * 当前人口、需求、租金、天气、餐厅数量等都由运行时状态计算，
 * 不允许 UI 直接写死结果。
 */
module.exports = {
  time: {
    // 1× 时，每现实 1 秒推进多少游戏分钟。
    baseGameMinutesPerSecond: 6,

    // 2×/10×保留为旧存档与底层兼容档位；
    // 主界面只展示 1×/5×/20×/100×。
    allowedSpeeds: [
      1,
      2,
      5,
      10,
      20,
      100
    ],

    // 延续原有“单帧最多吸收1秒”的兼容行为。
    // 100×下1秒=600游戏分钟，但会再切成30分钟小段执行，
    // 因而不会跳过餐期、装修、审批和日结。
    maxRealDeltaMs: 1000,

    // 高倍速按最多30游戏分钟一段推进，
    // 让客流、餐期、日结和长期日程看到正确的中间时间。
    maxSimulationChunkMinutes: 30
  },

  city: {
    // 常住人口的每日自然/迁移变化上限。
    maxDailyResidentChangeRatio: 0.0025,

    // 商圈“活动人口”相对常住人口的合理波动范围。
    minEffectivePopulationRatio: 0.68,
    maxEffectivePopulationRatio: 1.42,

    // 动态数据的惯性，避免一天暴涨暴跌。
    rentSmoothing: 0.16,
    spendSmoothing: 0.12,
    economySmoothing: 0.08,

    // 餐厅数量每天最多向均衡值移动多少家。
    maxRestaurantChangePerDay: 2,

    // 商圈饱和度显示边界与竞争分级。
    minSaturation: 25,
    maxSaturation: 160,

    saturatedThreshold: 85,

    competitionBands: {
      medium: 65,
      high: 80,
      extreme: 90
    }
  },

  demand: {
    weekdayFactors: {
      weekday: 1.00,
      weekend: 1.06
    },

    weatherFactors: {
      sunny: 1.00,
      cloudy: 0.98,
      rain: 0.90,
      heavyRain: 0.76,
      hot: 0.93,
      cold: 1.04
    }
  },

  weather: {
    temperatureNoise: 4,

    seasonalBaseTemperature: {
      spring: 18,
      summer: 29,
      autumn: 20,
      winter: 8
    },

    /**
     * 各季节天气概率。
     * 概率只是生成规则，实际天气每天由 seed + 日期确定。
     */
    profiles: {
      spring: [
        ['sunny', 0.35],
        ['cloudy', 0.31],
        ['rain', 0.25],
        ['heavyRain', 0.05],
        ['cold', 0.04]
      ],

      summer: [
        ['sunny', 0.28],
        ['cloudy', 0.20],
        ['rain', 0.22],
        ['heavyRain', 0.10],
        ['hot', 0.20]
      ],

      autumn: [
        ['sunny', 0.44],
        ['cloudy', 0.29],
        ['rain', 0.15],
        ['heavyRain', 0.03],
        ['cold', 0.09]
      ],

      winter: [
        ['sunny', 0.35],
        ['cloudy', 0.31],
        ['rain', 0.08],
        ['cold', 0.26]
      ]
    }
  },

  news: {
    maxItems: 18,

    // 浮动通报按游戏小时轮换，不按真实秒计时。
    rotateEveryGameHours: 2
  }
};
