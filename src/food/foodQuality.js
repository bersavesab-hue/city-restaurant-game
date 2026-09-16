'use strict';

/**
 * 菜品品质分层 V1.2
 * 保留旧 getQuality(score) 接口，同时补齐长期运营需要的六档品质。
 */
const QUALITY = Object.freeze([
  {id:'normal', name:'普通', min:0, demandBonus:0, pricePremium:1.00},
  {id:'excellent', name:'优秀', min:68, demandBonus:2, pricePremium:1.04},
  {id:'premium', name:'精品', min:78, demandBonus:5, pricePremium:1.10},
  {id:'famous', name:'名菜', min:86, demandBonus:9, pricePremium:1.18},
  {id:'masterpiece', name:'大师', min:93, demandBonus:14, pricePremium:1.28},
  {id:'legendary', name:'传奇', min:98, demandBonus:20, pricePremium:1.42}
]);

function clamp(value,min,max){
  return Math.max(min,Math.min(max,Number(value)||0));
}

function getQuality(score){
  const value=clamp(score,0,100);
  return [...QUALITY].reverse().find(x=>value>=x.min)||QUALITY[0];
}

function nextQuality(score){
  const value=clamp(score,0,100);
  return QUALITY.find(x=>x.min>value)||QUALITY[QUALITY.length-1];
}

function progressToNext(score){
  const value=clamp(score,0,100);
  const current=getQuality(value);
  const next=nextQuality(value);
  if(next.id===current.id){
    return {current,next,progress:1,pointsNeeded:0};
  }
  const span=Math.max(1,next.min-current.min);
  return {
    current,
    next,
    progress:clamp((value-current.min)/span,0,1),
    pointsNeeded:Math.max(0,Math.ceil(next.min-value))
  };
}

module.exports={QUALITY,getQuality,nextQuality,progressToNext};
