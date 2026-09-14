'use strict';

function clamp(v,min=0,max=100){return Math.max(min,Math.min(max,Number(v)||0));}
function round(v,d=2){const p=10**d;return Math.round((Number(v)||0)*p)/p;}
function hash(text){let h=2166136261>>>0;for(const ch of String(text)){h^=ch.charCodeAt(0);h=Math.imul(h,16777619);}return h>>>0;}
function stableFloat(seed){return (hash(seed)%1000000)/1000000;}
function pricePerKg(ingredient, supplier, ctx={}){
  const market=Number(ctx.marketIndex??1);
  const season=Number(ctx.seasonIndex??1);
  const relation=clamp(supplier.relationship??50);
  const quality=clamp(supplier.quality??70);
  const urgency=Number(ctx.urgency??0);
  const base=Math.max(.6,Number(ingredient.costIndex||1)*12.5);
  const relationDiscount=1-Math.max(0,relation-50)*0.0018;
  const qualityPremium=1+Math.max(0,quality-70)*0.0022;
  const volatility=.96+stableFloat(`${supplier.id}:${ingredient.id}:${ctx.day||0}`)*.08;
  return round(base*Number(supplier.priceIndex||1)*market*season*relationDiscount*qualityPremium*(1+urgency*.12)*volatility,2);
}
function minOrderKg(supplier){
  return round(Math.max(2,12*Number(supplier.minimumOrderIndex||1)),1);
}
function deliverySuccessProbability(supplier, ctx={}){
  let p=clamp(supplier.reliability??75)/100;
  p-=Math.max(0,Number(ctx.weatherRisk||0))*.16;
  p-=Math.max(0,Number(ctx.capacityPressure||0))*.12;
  if(ctx.emergency)p-=.08;
  return clamp(p,0.15,0.995);
}
function negotiatePrice(current, supplier, buyerPower=50, rounds=1){
  const patience=clamp(supplier.negotiationPatience??55);
  const relation=clamp(supplier.relationship??50);
  const power=clamp(buyerPower);
  const maxDiscount=.02+(power/100)*.055+(relation/100)*.025+(patience/100)*.015;
  const used=Math.min(1,Math.max(1,rounds)/4);
  return round(Math.max(current*.86,current*(1-maxDiscount*used)),2);
}
module.exports={clamp,round,hash,stableFloat,pricePerKg,minOrderKg,deliverySuccessProbability,negotiatePrice};
