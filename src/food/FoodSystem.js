'use strict';

const config = require('../data/foodSystemConfig.js');

class FoodSystem {
  createDish(name, category, quality) {
    const level = config.qualityLevels[quality] || config.qualityLevels.normal;
    return {
      id: 'dish_' + Date.now(),
      name: name || '未命名菜品',
      category: category || '综合菜',
      quality,
      rating: level.rating,
      cost: 10 * level.costRate,
      price: 30 * level.priceRate,
      popularity: 0
    };
  }

  calculateProfit(dish, count) {
    return Math.max(0, (dish.price - dish.cost) * count);
  }
}

module.exports = new FoodSystem();
