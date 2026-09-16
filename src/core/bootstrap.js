'use strict';

const gameState = require('./gameState');
const SystemManager = require('./systemManager');

const RestaurantSystem = require('../systems/restaurantSystem');
const FoodSystem = require('../systems/foodSystem');
const StaffSystem = require('../systems/staffSystem');
const FinanceSystem = require('../systems/financeSystem');
const EventSystem = require('../systems/eventSystem');

class Bootstrap {
  constructor(){
    this.manager = new SystemManager();
  }

  start(){
    this.manager.register('restaurant', new RestaurantSystem());
    this.manager.register('food', new FoodSystem());
    this.manager.register('staff', new StaffSystem());
    this.manager.register('finance', new FinanceSystem());
    this.manager.register('event', new EventSystem());

    this.manager.initAll({
      state: gameState
    });

    return this.manager;
  }
}

module.exports = Bootstrap;
