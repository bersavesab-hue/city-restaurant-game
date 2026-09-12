'use strict';

module.exports = {
  equipment: [
    {
      id: 'cooking',
      name: '烹饪设备',
      iconKey: 'visual_stove',
      basePrice: 13800,
      capacityPerUnit: 34,
      powerKw: 8,
      gasPreferred: true,
      installDays: 2
    },
    {
      id: 'cold',
      name: '冷藏设备',
      iconKey: 'visual_fridge',
      basePrice: 9800,
      capacityPerUnit: 52,
      powerKw: 2.6,
      gasPreferred: false,
      installDays: 1
    },
    {
      id: 'prep',
      name: '备餐操作台',
      iconKey: 'visual_register',
      basePrice: 4200,
      capacityPerUnit: 42,
      powerKw: 0.3,
      gasPreferred: false,
      installDays: 1
    },
    {
      id: 'dishwash',
      name: '洗消设备',
      iconKey: 'visual_fridge',
      basePrice: 7600,
      capacityPerUnit: 46,
      powerKw: 5.5,
      gasPreferred: false,
      installDays: 2
    },
    {
      id: 'pos',
      name: '收银设备',
      iconKey: 'visual_register',
      basePrice: 3200,
      capacityPerUnit: 85,
      powerKw: 0.5,
      gasPreferred: false,
      installDays: 1
    }
  ],

  qualityGrades: [
    {
      id: 'budget',
      name: '经济',
      priceFactor: 0.82,
      reliability: 0.86,
      efficiency: 0.92
    },
    {
      id: 'standard',
      name: '标准',
      priceFactor: 1,
      reliability: 1,
      efficiency: 1
    },
    {
      id: 'premium',
      name: '高配',
      priceFactor: 1.28,
      reliability: 1.12,
      efficiency: 1.09
    }
  ],

  permits: [
    {
      id: 'business',
      name: '主体登记',
      baseFee: 380,
      baseDays: 2
    },
    {
      id: 'food',
      name: '食品经营许可',
      baseFee: 680,
      baseDays: 5
    },
    {
      id: 'fire',
      name: '消防检查/备案',
      baseFee: 460,
      baseDays: 4
    },
    {
      id: 'sign',
      name: '门头招牌备案',
      baseFee: 160,
      baseDays: 2
    }
  ],

  roles: [
    {
      id: 'manager',
      name: '店长',
      baseWage: 7200,
      seatsPerWorker: 999
    },
    {
      id: 'chef',
      name: '厨师',
      baseWage: 6800,
      seatsPerWorker: 38
    },
    {
      id: 'server',
      name: '服务员',
      baseWage: 4200,
      seatsPerWorker: 22
    },
    {
      id: 'cashier',
      name: '收银/前台',
      baseWage: 4300,
      seatsPerWorker: 70
    }
  ],

  surnames: [
    '陈','王','李','张','刘','周','赵','孙','马','朱',
    '胡','郭','何','高','林','郑','梁','许','宋','谢'
  ],

  givenNames: [
    '启明','婉宁','志强','远航','雅琴','国梁','晨曦','雨桐',
    '嘉宁','博文','浩然','思远','子涵','明轩','若溪','俊杰',
    '雪晴','佳怡','文涛','晓峰'
  ]
};
