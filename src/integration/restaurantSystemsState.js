'use strict';

/**
 * 第二阶段系统状态适配层
 * 不直接污染旧存档结构，通过扩展层接入新系统。
 */

function createRestaurantSystemsState() {
  return {
    food: {
      dishes: [],
      researchHistory: []
    },
    employee: {
      staff: [],
      trainingHistory: []
    },
    rating: {
      score: 0,
      level: '普通店'
    },
    ranking: {
      cityRank: null,
      history: []
    },
    awards: {
      obtained: []
    }
  };
}

module.exports = createRestaurantSystemsState;
