'use strict';

const PLATFORMS=[
  {id:'platform_a',name:'本地外卖平台A',commission:.18,traffic:1.00,settlementDays:7},
  {id:'platform_b',name:'本地外卖平台B',commission:.16,traffic:.82,settlementDays:3},
  {id:'self',name:'自营配送',commission:0,traffic:.38,settlementDays:0},
  {id:'community',name:'社区团购渠道',commission:.10,traffic:.52,settlementDays:10},
  {id:'enterprise',name:'企业团餐渠道',commission:.08,traffic:.44,settlementDays:15},
  {id:'pickup',name:'到店自取',commission:0,traffic:.30,settlementDays:0}
];
function quoteDelivery(distanceKm,weather='normal',rush=false){
  const km=Math.max(.2,Number(distanceKm)||1);let minutes=12+km*5;let fee=3+km*1.35;
  if(weather==='rain'){minutes*=1.22;fee*=1.15;}if(weather==='heavyRain'){minutes*=1.55;fee*=1.35;}if(rush){minutes*=1.18;fee*=1.12;}
  return {distanceKm:km,minutes:Math.round(minutes),fee:Math.round(fee*100)/100};
}
function createDelivery(order,ctx={}){
  const platform=PLATFORMS.find(x=>x.id===(ctx.platformId||'platform_a'))||PLATFORMS[0];const q=quoteDelivery(ctx.distanceKm,ctx.weather,ctx.rush);
  return {id:`delivery_${order.id}`,orderId:order.id,platformId:platform.id,status:'waiting_pickup',etaMinutes:q.minutes,fee:q.fee,
    commissionRate:platform.commission,late:false,qualityLoss:0};
}
function complete(delivery,actualMinutes){
  delivery.status='delivered';delivery.actualMinutes=Number(actualMinutes)||delivery.etaMinutes;delivery.late=delivery.actualMinutes>delivery.etaMinutes+8;
  delivery.qualityLoss=Math.max(0,Math.min(35,(delivery.actualMinutes-25)*.6));return delivery;
}
module.exports={PLATFORMS,quoteDelivery,createDelivery,complete};
