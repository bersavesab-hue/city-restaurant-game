'use strict';

/**
 * Unified runtime state container.
 */
class GameState {
  constructor() {
    this.player = {};
    this.restaurant = {};
    this.food = {};
    this.staff = {};
    this.finance = {};
    this.rating = {};
  }

  update(section, data) {
    this[section] = Object.assign({}, this[section], data);
  }
}

module.exports = GameState;
