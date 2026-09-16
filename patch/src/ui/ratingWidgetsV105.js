'use strict';

function ratingText(score,grade){
  return `${grade}级 ${Math.round(score)}分`;
}

module.exports={ratingText};
