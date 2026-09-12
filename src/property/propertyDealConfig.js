'use strict';

/**
 * 看铺、勘察、谈判、签约的规则参数。
 *
 * 这些是系统规则，不是某个房源的最终结果。
 * 实际成本、耗时、成功率、让价幅度都由房源、市场、NPC竞争、
 * 中介可靠度、房东性格和勘察结果动态计算。
 */

module.exports = {
  visitModes: {
    quick: {
      id: 'quick',
      name: '快速看铺',
      baseHours: 1,
      baseCost: 0,
      revealCount: 3,
      accuracy: 0.72,
      description: '看门面、客流和基础硬件，耗时短但容易漏掉隐患'
    },

    standard: {
      id: 'standard',
      name: '标准勘察',
      baseHours: 3,
      baseCost: 300,
      revealCount: 6,
      accuracy: 0.90,
      description: '核验排烟、燃气、电力、排水、消防和经营限制'
    },

    deep: {
      id: 'deep',
      name: '深度勘察',
      baseHours: 6,
      baseCost: 900,
      revealCount: 9,
      accuracy: 0.98,
      description: '连同产权、历史整改、设备状态和隐藏成本一起核验'
    }
  },

  inspectionItems: [
    {
      id: 'exhaust',
      label: '排烟条件',
      source: 'exhaust',
      positiveText: '排烟路径可用',
      negativeText: '排烟条件不足'
    },
    {
      id: 'gas',
      label: '燃气条件',
      source: 'gas',
      positiveText: '燃气接入可用',
      negativeText: '燃气接入受限'
    },
    {
      id: 'power',
      label: '电力容量',
      source: 'threePhase',
      positiveText: '三相电条件满足',
      negativeText: '电力条件需改造'
    },
    {
      id: 'drainage',
      label: '排水条件',
      source: 'drainage',
      positiveText: '排水满足餐饮使用',
      negativeText: '排水存在整改需求'
    },
    {
      id: 'grease',
      label: '隔油设施',
      source: 'greaseTrap',
      positiveText: '隔油设施可用',
      negativeText: '需补做隔油设施'
    },
    {
      id: 'fire',
      label: '消防条件',
      source: 'fireSprinkler',
      positiveText: '现有消防条件较完整',
      negativeText: '消防条件需整改'
    },
    {
      id: 'visibility',
      label: '门面可见度',
      source: 'visibility',
      threshold: 62,
      positiveText: '门面可见度良好',
      negativeText: '实际可见度一般'
    },
    {
      id: 'loading',
      label: '卸货条件',
      source: 'loadingAccess',
      threshold: 55,
      positiveText: '卸货动线较顺畅',
      negativeText: '高峰期卸货较困难'
    },
    {
      id: 'risk',
      label: '历史隐患',
      source: 'riskLevel',
      inverseThreshold: 1,
      positiveText: '未发现高等级历史隐患',
      negativeText: '存在需要重点核验的历史风险'
    }
  ],

  negotiation: {
    maxRounds: 4,
    actionHoursPerRound: 1,

    // 让价幅度只是基础范围，最终会被市场与人物变量修正。
    rentRequestRange: [0.035, 0.14],
    transferRequestRange: [0.06, 0.28],
    freeRentExtraRange: [3, 28],
    depositReductionChanceBase: 0.18,

    minimumAcceptanceScore: 0.50
  },

  opportunityRisk: {
    basePerHour: 0.0025,
    competitorWeight: 0.016,
    watcherWeight: 0.003,
    hotMarketWeight: 0.045,
    inspectionProtection: 0.65
  }
};
