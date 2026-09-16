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
    // 兼容层：旧底层倍速仍按 6 游戏分钟/现实秒计算，
    // 以保证旧存档、旧测试和内部工具不会因 V1.2.1 改速而失真。
    baseGameMinutesPerSecond: 6,

    // V1.2.1 玩家可见节奏：1× = 12 游戏分钟/现实秒。
    playerBaseGameMinutesPerSecond: 12,

    // 旧底层公开契约保留，不作为主界面按钮。
    allowedSpeeds: [
      1,
      2,
      5,
      10,
      20,
      100
    ],

    // 玩家主界面只展示这三档。
    uiSpeeds: [
      1,
      3,
      8
    ],

    // setTimeSpeed 同时接受新 UI 档和旧内部档。
    acceptedSpeeds: [
      1,
      2,
      3,
      5,
      8,
      10,
      20,
      100
    ],

    // 旧存档在游戏启动恢复完成后迁移到新玩家档位。
    legacySpeedMap: {
      2:1,
      5:3,
      10:3,
      20:8,
      100:8
    },

    // 24 小时门店以凌晨 04:00 作为营业日切换节点，但不会停业。
    businessDayCutoffHour: 4,

    // 单帧最多吸收 1 秒真实时间，避免切后台回来瞬间跳过大量经营。
    maxRealDeltaMs: 1000,

    // 旧内部高速档继续允许 30 分钟分段，维持既有契约。
    maxSimulationChunkMinutes: 30,

    // 玩家 1×/3×/8× 使用更细的 10 分钟模拟步。
    playerMaxSimulationChunkMinutes: 10,

    smartAdvance: {
      fineThresholdMinutes: 15,
      mediumThresholdMinutes: 60,
      fineSpeed: 1,
      mediumSpeed: 3,
      fastSpeed: 8
    }
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
