'use strict';

function generateFood(input){
  const data = input || {};
  return {
    name: data.name || '创新菜品',
    ingredients: data.ingredients || [],
    cooking: data.cooking || '未知工艺',
    taste: data.taste || {},
    score: 60 + Math.floor(Math.random()*31)
  };
}

module.exports = {generateFood};
