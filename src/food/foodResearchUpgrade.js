'use strict';

function improveFood(food, feedback){
  return {
    ...food,
    score: Math.min(100, (food.score || 0) + (feedback || 5))
  };
}

module.exports = {improveFood};
