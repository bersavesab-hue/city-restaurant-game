'use strict';
const P=require('./customerPackV10.js');
function clamp(v,min=0,max=100){return Math.max(min,Math.min(max,v));}
function round(v,d=2){const m=10**d;return Math.round(v*m)/m;}
function byId(list,id){return list.find(x=>x.id===id)||null;}
function rngNext(rng){return rng&&typeof rng.next==='function'?rng.next():Math.random();}
function rngInt(rng,min,max){if(rng&&typeof rng.int==='function')return rng.int(min,max);return Math.floor(rngNext(rng)*(max-min+1))+min;}
function weighted(rng,list,weightFn=x=>x.weight??1){
  if(!list.length)return null;let total=0;const ws=list.map(x=>Math.max(0,Number(weightFn(x))||0));for(const w of ws)total+=w;if(total<=0)return list[0];let r=rngNext(rng)*total;for(let i=0;i<list.length;i++){r-=ws[i];if(r<=0)return list[i];}return list[list.length-1];
}
function normalish(rng,min,max){return (rngNext(rng)+rngNext(rng)+rngNext(rng))/3*(max-min)+min;}
function mealPeriod(hour){if(hour<10)return'breakfast';if(hour<14)return'lunch';if(hour<17)return'afternoon';if(hour<22)return'dinner';return'late_night';}
function budgetRange(segment,income,period='lunch'){
  const base=P.MEAL_BUDGET_BASE[period]||P.MEAL_BUDGET_BASE.lunch,m=(segment?.budgetIndex||1)*(income?.budgetMultiplier||1);return [Math.max(3,Math.round(base[0]*m)),Math.max(5,Math.round(base[1]*m))];
}
function districtSegmentWeights(districtId){const mix=P.DISTRICT_MIXES[districtId]||{};return P.SEGMENTS.map(s=>({segment:s,weight:(mix[s.id]??s.weight)*s.weight}));}
function budgetFit(price,budget,priceSensitivity=60){if(price<=0)return 1;if(price<=budget*.72)return 1;if(price<=budget)return clamp(1-(price/budget-.72)*(priceSensitivity/100)*1.5,0.35,1);const over=price/budget-1;return clamp(Math.exp(-over*(1.4+priceSensitivity/45)),.001,.75);}
function referencePrice(memory={},marketPrice){const hist=Number(memory.historicalPrice||0),last=Number(memory.lastPaidPrice||0),market=Math.max(.1,Number(marketPrice||20));let sum=market*.5,w=.5;if(hist>0){sum+=hist*.3;w+=.3;}if(last>0){sum+=last*.2;w+=.2;}return round(sum/w,2);}
function pricePerception(price,ref,segment){const ratio=price/Math.max(.1,ref),sens=(segment.priceSensitivity||60)/100;if(ratio<=.82)return clamp(84+(1-ratio)*25*sens);if(ratio<=1.05)return clamp(78-(ratio-.82)*26*sens);return clamp(72-(ratio-1.05)*95*sens,1,100);}
function queueToleranceMinutes(segment,ctx={}){let base=4+(segment.queueTolerance||50)*.26;if(ctx.motive==='business')base+=5;if(ctx.motive==='celebration')base+=7;if(ctx.rushed)base-=7;if(ctx.isFavorite)base+=6;return round(clamp(base,1,45),0);}
function travelToleranceMinutes(segment,ctx={}){let base=3+(100-(segment.distanceSensitivity||60))*.15;if(ctx.isFavorite)base+=7;if((segment.noveltySeeking||0)>75)base+=4;return round(clamp(base,2,25),0);}
function segmentMealBudget(segment,income,period,rng){const [a,b]=budgetRange(segment,income,period);return round(normalish(rng,a,b),0);}
function expectedPartySize(household,rng,ctx={}){if(ctx.partySize)return ctx.partySize;if(!household)return 1;return rngInt(rng,household.minParty,household.maxParty);}
function valueWeight(segment){return clamp((segment.priceSensitivity||60)*.6+(100-(segment.qualitySensitivity||60))*.15+25,10,95);}
function qualityWeight(segment){return clamp(segment.qualitySensitivity||60,10,100);}
function convenienceWeight(segment){return clamp((segment.distanceSensitivity||60)*.55+(100-(segment.queueTolerance||50))*.35+10,10,100);}
module.exports={clamp,round,byId,rngNext,rngInt,weighted,normalish,mealPeriod,budgetRange,districtSegmentWeights,budgetFit,referencePrice,pricePerception,queueToleranceMinutes,travelToleranceMinutes,segmentMealBudget,expectedPartySize,valueWeight,qualityWeight,convenienceWeight};
