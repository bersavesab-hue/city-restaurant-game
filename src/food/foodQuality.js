'use strict';

const QUALITY = [
  {id:'normal', name:'普通', min:0},
  {id:'excellent', name:'优秀', min:70},
  {id:'premium', name:'精品', min:82},
  {id:'signature', name:'招牌', min:90},
  {id:'legendary', name:'传奇', min:97}
];

function getQuality(score){
  const value = Number(score) || 0;
  return [...QUALITY].reverse().find(x => value >= x.min) || QUALITY[0];
}

module.exports = {QUALITY, getQuality};
