'use strict';

module.exports = {
  weights: {
    food: 0.3,
    service: 0.2,
    environment: 0.2,
    price: 0.15,
    innovation: 0.15
  },
  ranks: [
    { name: '普通店', min: 0 },
    { name: '优秀店', min: 60 },
    { name: '精品店', min: 80 },
    { name: '名店', min: 90 },
    { name: '传奇餐厅', min: 96 }
  ]
};
