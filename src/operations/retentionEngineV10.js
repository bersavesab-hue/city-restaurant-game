'use strict';

const customerEngine=require('../customer/customerEngineV10.js');
const reviewEngine=require('../systems/reviewEngine.js');

function evaluate(profile,visit,store,experience,rng){
  const post=customerEngine.postVisit(profile,visit,store,experience,rng);
  const review=reviewEngine.scoreExperience({
    taste:experience.taste,value:post.experience.dimensions.value,portion:experience.portion,speed:experience.speed,
    service:experience.service,hygiene:experience.hygiene,environment:experience.environment,consistency:experience.stability
  });
  return {...post,reviewScore:review};
}
function retentionTier(prob){return prob>=.75?'core_regular':prob>=.52?'repeat_likely':prob>=.30?'uncertain':'churn_risk';}
function updateShopReputation(shop,result){
  const old=Number(shop.rating||4);const stars=result.reviewStars||result.reviewScore?.stars||old;
  const count=Math.max(0,Number(shop.reviewCount||0));shop.rating=Math.round(((old*count+stars)/(count+1))*100)/100;shop.reviewCount=count+1;
  shop.wordOfMouth=Math.max(-1,Math.min(1,(Number(shop.wordOfMouth)||0)*.9+Number(result.wordOfMouth||0)*.1));return shop;
}
module.exports={evaluate,retentionTier,updateShopReputation};
