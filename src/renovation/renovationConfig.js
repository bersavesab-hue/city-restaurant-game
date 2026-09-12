'use strict';

module.exports = {
  // Furniture footprint includes basic chair pull-out + service clearance.
  tableFootprint: {
    2: 4.8,
    4: 7.6,
    6: 10.4,
    8: 13.2
  },

  aisleModes: {
    compact: {
      id: 'compact',
      name: '紧凑',
      areaFactor: 0.90,
      comfort: 0.84,
      serviceEfficiency: 1.06
    },

    standard: {
      id: 'standard',
      name: '标准',
      areaFactor: 1.00,
      comfort: 1.00,
      serviceEfficiency: 1.00
    },

    spacious: {
      id: 'spacious',
      name: '宽松',
      areaFactor: 1.15,
      comfort: 1.10,
      serviceEfficiency: 0.96
    }
  },

  hallStyles: [
    { id: 'simple', name: '简约', costFactor: 0.88, appeal: 0.95, maintenance: 0.90 },
    { id: 'wood', name: '原木', costFactor: 1.00, appeal: 1.03, maintenance: 0.98 },
    { id: 'modern_cn', name: '现代中式', costFactor: 1.18, appeal: 1.10, maintenance: 1.06 },
    { id: 'industrial', name: '工业风', costFactor: 1.06, appeal: 1.04, maintenance: 0.94 },
    { id: 'retro', name: '复古市井', costFactor: 1.12, appeal: 1.08, maintenance: 1.04 },
    { id: 'premium', name: '品质商务', costFactor: 1.36, appeal: 1.18, maintenance: 1.16 }
  ],

  privateRoomStyles: [
    { id: 'plain', name: '实用型', costPerSqm: 620, appeal: 0.96 },
    { id: 'wood', name: '原木雅间', costPerSqm: 880, appeal: 1.05 },
    { id: 'chinese', name: '中式雅间', costPerSqm: 1180, appeal: 1.12 },
    { id: 'modern', name: '现代包厢', costPerSqm: 1080, appeal: 1.10 },
    { id: 'premium', name: '商务包厢', costPerSqm: 1580, appeal: 1.20 }
  ],

  materialGrades: [
    { id: 'budget', name: '经济', costFactor: 0.82, quality: 0.88, durability: 0.85 },
    { id: 'standard', name: '标准', costFactor: 1.00, quality: 1.00, durability: 1.00 },
    { id: 'good', name: '品质', costFactor: 1.22, quality: 1.10, durability: 1.12 },
    { id: 'premium', name: '高档', costFactor: 1.48, quality: 1.18, durability: 1.20 }
  ],

  lightingLevels: [
    { id: 'basic', name: '基础照明', costPerSqm: 55, appeal: 0.96 },
    { id: 'warm', name: '暖光氛围', costPerSqm: 88, appeal: 1.04 },
    { id: 'layered', name: '分层灯光', costPerSqm: 125, appeal: 1.10 },
    { id: 'premium', name: '设计灯光', costPerSqm: 188, appeal: 1.16 }
  ],

  privateRoomSeatOptions: [4, 6, 8, 10, 12],

  zoneRules: {
    minKitchenRatio: 0.18,
    maxKitchenRatio: 0.42,
    minStorageRatio: 0.04,
    maxStorageRatio: 0.18,
    minServiceRatio: 0.08,
    maxServiceRatio: 0.20
  },

  baseConstructionCostPerSqm: 520,

  templateRules: {
    maxTemplates: 30,
    defaultNamePrefix: '装修模板'
  },

  nameRules: {
    shopMaxLength: 12,
    roomMaxLength: 10,
    templateMaxLength: 14
  },

  contractorNameParts: {
    prefix: ['城建', '匠造', '禾木', '鼎盛', '青禾', '远景', '万家', '筑味'],
    suffix: ['装饰工程', '餐饮空间', '建设设计', '工程服务']
  }
};
