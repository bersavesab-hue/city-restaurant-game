const GameState = require('../core/gameState');

class GameUIController {
  getOverview(){
    return {
      money: GameState.money,
      day: GameState.day,
      restaurant: GameState.restaurant,
      staff: GameState.staff,
      foods: GameState.foods
    };
  }
}

module.exports = GameUIController;
