'use strict';

/**
 * 餐厅动态排名系统
 *
 * 根据营业、评分、人气、口碑动态计算排名。
 */

class RestaurantRankingSystem {
  constructor() {
    this.types = [
      'popularity',
      'rating',
      'revenue',
      'innovation'
    ];
  }

  calculateScore(restaurant) {
    const income = Number(restaurant.revenue || 0);
    const rating = Number(restaurant.rating || 0);
    const popularity = Number(restaurant.popularity || 0);
    const innovation = Number(restaurant.innovation || 0);

    return Math.floor(
      income * 0.35 +
      rating * 20 * 0.3 +
      popularity * 0.2 +
      innovation * 0.15
    );
  }

  rank(list) {
    return (list || [])
      .map(item => ({
        ...item,
        rankingScore: this.calculateScore(item)
      }))
      .sort((a, b) => b.rankingScore - a.rankingScore);
  }
}

module.exports = new RestaurantRankingSystem();
