'use strict';

function createLedger(){return {revenue:0,foodCost:0,labor:0,rent:0,utilities:0,platformFees:0,marketing:0,waste:0,refunds:0,orders:0,customers:0,entries:[]};}
function settleOrder(ledger,order,ctx={}){
  const revenue=Math.max(0,Number(order.total)||0);const foodCost=Math.max(0,Number(ctx.foodCost)||0);
  const platformFee=order.channel==='delivery'?revenue*Math.max(0,Number(ctx.platformRate??.18)):0;
  const packaging=order.channel==='delivery'||order.channel==='pickup'?Math.max(0,Number(ctx.packagingCost??1.2)):0;
  const refund=Math.max(0,Number(ctx.refund)||0);
  const net=revenue-foodCost-platformFee-packaging-refund;
  ledger.revenue+=revenue;ledger.foodCost+=foodCost;ledger.platformFees+=platformFee;ledger.refunds+=refund;ledger.orders++;
  ledger.customers+=Math.max(1,Number(order.partySize)||1);
  ledger.entries.push({type:'order',orderId:order.id,revenue,foodCost,platformFee,packaging,refund,net});
  return {revenue,foodCost,platformFee,packaging,refund,contribution:Math.round(net*100)/100};
}
function addFixedCosts(ledger,costs={}){
  ledger.labor+=Number(costs.labor)||0;ledger.rent+=Number(costs.rent)||0;ledger.utilities+=Number(costs.utilities)||0;
  ledger.marketing+=Number(costs.marketing)||0;ledger.waste+=Number(costs.waste)||0;
}
function summary(ledger){
  const cost=ledger.foodCost+ledger.labor+ledger.rent+ledger.utilities+ledger.platformFees+ledger.marketing+ledger.waste+ledger.refunds;
  const profit=ledger.revenue-cost;
  return {...ledger,totalCost:Math.round(cost*100)/100,profit:Math.round(profit*100)/100,
    foodCostRate:ledger.revenue?Math.round(ledger.foodCost/ledger.revenue*1000)/10:0,profitRate:ledger.revenue?Math.round(profit/ledger.revenue*1000)/10:0,
    avgTicket:ledger.orders?Math.round(ledger.revenue/ledger.orders*100)/100:0};
}
module.exports={createLedger,settleOrder,addFixedCosts,summary};
