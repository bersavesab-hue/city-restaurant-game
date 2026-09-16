'use strict';

const config = require('../data/ratingSystemConfig.js');

class RatingSystem {
  calculateScore(data) {
    return Math.round(
      data.food * config.weights.food +
      data.service * config.weights.service +
      data.environment * config.weights.environment +
      data.price * config.weights.price +
      data.innovation * config.weights.innovation
    );
  }

  getLevel(score) {
    for (const item of config.levels) {
      if (score >= item.min) return item.name;
    }
    return config.levels[config.levels.length - 1].name;
  }
}

module.exports = new RatingSystem();
