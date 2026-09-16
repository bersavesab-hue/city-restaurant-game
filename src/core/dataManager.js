const restaurants = require('../data/database/restaurants.json');
const foods = require('../data/database/foods.json');
const staffs = require('../data/database/staffs.json');

class DataManager {
  constructor(){
    this.data = {
      restaurants,
      foods,
      staffs
    };
  }

  get(type){
    return this.data[type] || [];
  }

  reload(type, data){
    this.data[type] = data;
  }
}

module.exports = DataManager;
