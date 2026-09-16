'use strict';

/**
 * 餐饮行业荣誉系统
 */

class AwardSystem {
  getAwards(score) {
    const value = Number(score || 0);
    const awards = [];

    if (value >= 950) awards.push('传奇餐厅');
    else if (value >= 900) awards.push('城市名店');
    else if (value >= 800) awards.push('精品餐厅');
    else if (value >= 600) awards.push('优秀餐厅');

    return awards;
  }
}

module.exports = new AwardSystem();
