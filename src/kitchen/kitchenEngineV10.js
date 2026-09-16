'use strict';

const food=require('../food/foodPackV10.js');
const recipeEngine=require('../food/recipeEngineV10.js');
const inventoryEngine=require('../inventory/inventoryEngineV10.js');
const orderEngine=require('../order/orderEngineV10.js');

const STATION_BY_METHOD={
  stir_fry:'wok',quick_fry:'wok',wok_noodle:'wok',deep_fry:'fryer',pan_fry:'griddle',grill:'grill',roast:'grill',skewer:'grill',
  steam:'steam',steam_bread:'steam',boil:'boil',blanch:'boil',boil_noodle:'boil',braise:'slow',stew:'slow',slow_stew:'slow',
  simmer:'slow',claypot:'slow',soup:'slow',stock:'slow',hotpot:'hotpot',cold_mix:'cold',assemble:'assembly',rice_cook:'rice',
  shake:'beverage',brew_tea:'beverage',coffee:'beverage',blend:'beverage',bake:'bakery',toast:'bakery',knead:'bakery',ferment:'bakery',freeze:'cold'
};
function createKitchen(options={}){
  return {stations:{wok:options.wok||2,fryer:options.fryer||1,griddle:1,grill:1,steam:1,boil:2,slow:2,hotpot:1,cold:1,assembly:1,
    rice:1,beverage:1,bakery:1},queue:[],completed:[],sequence:0,staffSkill:Number(options.staffSkill)||55,equipmentScore:Number(options.equipmentScore)||70};
}
function estimateItemMinutes(item,kitchen){
  const recipe=recipeEngine.menuRecipe(item)||food.RECIPE_BY_ID[item.recipeId];if(!recipe)return 999;
  const base=Math.max(1,Number(recipe.prepMinutes||0)+Number(recipe.cookMinutes||recipe.timeMinutes||8));
  const speedFactor=item&&item.customDish?Math.max(.65,Math.min(1.6,Number(item.customDish.speedFactor)||1)):1;
  return Math.max(1,Math.round(base*speedFactor));
}
function createTicket(kitchen,order,minute=0){
  if(order.status==='submitted')orderEngine.transition(order,'accepted');
  if(order.status==='accepted')orderEngine.transition(order,'cooking');
  const lines=order.items.map((item,i)=>{const recipe=recipeEngine.menuRecipe(item)||food.RECIPE_BY_ID[item.recipeId];return {id:`${order.id}_${i}`,item,
    station:STATION_BY_METHOD[recipe?.methodId||recipe?.method||'assemble']||'assembly',estimatedMinutes:estimateItemMinutes(item,kitchen),status:'queued'};});
  const ticket={id:`ticket_${++kitchen.sequence}`,orderId:order.id,createdMinute:minute,lines,status:'queued'};kitchen.queue.push(ticket);return ticket;
}
function canProduceLine(line,inventory){
  const req=recipeEngine.scaleMenuItem(line.item,line.item.qty);
  const missing=req.filter(x=>!x.optional&&inventoryEngine.availableGrams(inventory,x.ingredientId)<x.grams);
  return {ok:missing.length===0,missing,requirements:req};
}
function produceTicket(kitchen,ticket,order,inventory,ctx={}){
  let foodCost=0,qualityWeighted=0,qtyWeight=0,maxMinutes=0;
  for(const line of ticket.lines){
    const check=canProduceLine(line,inventory);if(!check.ok){ticket.status='blocked';return {ok:false,reason:'缺少食材',missing:check.missing,ticket};}
  }
  for(const line of ticket.lines){
    const req=recipeEngine.scaleMenuItem(line.item,line.item.qty);
    const used=inventoryEngine.consumeRequirements(inventory,req,{reason:`order:${order.id}`});
    foodCost+=used.cost;
    const q=recipeEngine.qualityScoreForMenuItem(line.item,{freshness:used.avgQuality,staffSkill:kitchen.staffSkill,equipmentScore:kitchen.equipmentScore,executionConsistency:72});
    qualityWeighted+=q*line.item.qty;qtyWeight+=line.item.qty;maxMinutes=Math.max(maxMinutes,line.estimatedMinutes);
    line.status='ready';line.quality=q;
  }
  ticket.status='ready';ticket.completedMinute=Number(ctx.minute||ticket.createdMinute)+maxMinutes;
  kitchen.completed.push(ticket);kitchen.queue=kitchen.queue.filter(x=>x.id!==ticket.id);
  if(order.status==='cooking')orderEngine.transition(order,'ready');
  return {ok:true,ticket,foodCost:Math.round(foodCost*100)/100,quality:qtyWeight?Math.round(qualityWeighted/qtyWeight*10)/10:0,prepMinutes:maxMinutes};
}
module.exports={STATION_BY_METHOD,createKitchen,estimateItemMinutes,createTicket,canProduceLine,produceTicket};
