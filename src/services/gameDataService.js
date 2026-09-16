const DataManager = require('../core/dataManager');

class GameDataService {
  constructor(){
    this.dataManager = new DataManager();
  }

  getRestaurantData(){
    return this.dataManager.get('restaurants');
  }

  getFoodData(){
    return this.dataManager.get('foods');
  }

  getStaffData(){
    return this.dataManager.get('staffs');
  }
}

module.exports = GameDataService;
