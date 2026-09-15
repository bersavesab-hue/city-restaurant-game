'use strict';

const {SeededRng}=require('../foundation/rng.js');
const supplierEngine=require('../supplier/supplierEngineV10.js');
const procurement=require('../supplier/procurementEngineV10.js');
const inventoryEngine=require('../inventory/inventoryEngineV10.js');
const food=require('../food/foodPackV10.js');
const menuEngine=require('../food/menuEngineV10.js');
const recipeEngine=require('../food/recipeEngineV10.js');
const customerEngine=require('../customer/customerEngineV10.js');
const orderEngine=require('../order/orderEngineV10.js');
const kitchenEngine=require('../kitchen/kitchenEngineV10.js');
const serviceEngine=require('../service/serviceEngineV10.js');
const settlement=require('./settlementEngineV10.js');
const retention=require('./retentionEngineV10.js');
const staffOps=require('./staffOperationsEngineV10.js');
const marketing=require('./marketingEngineV10.js');
const brandGrowth=require('./brandGrowthEngineV10.js');

function createRuntime(options={}){
  const rng=new SeededRng(options.seed||'restaurant-runtime-v1');
  const menu=(options.recipeIds||food.RECIPES.slice(0,18).map(x=>x.id)).map(id=>menuEngine.createMenuItem(id,{}));
  return {
    version:'1.0.0',rng,day:Number(options.day)||1,shop:{id:options.shopId||'shop_runtime_1',rating:4,reviewCount:0,wordOfMouth:0},
    supplierNetwork:supplierEngine.createSupplierNetwork((options.seed||'restaurant')+':suppliers'),
    procurement:procurement.createProcurementState(),inventory:inventoryEngine.createInventory({day:Number(options.day)||1}),
    menu,kitchen:kitchenEngine.createKitchen(options.kitchen||{}),diningRoom:serviceEngine.createDiningRoom(options.diningRoom||{}),
    staff:staffOps.createStaffState(),ledger:settlement.createLedger(),brand:brandGrowth.createBrand(options.brandName||'我的餐饮品牌'),
    campaigns:[],customers:{},history:[]
  };
}
function bootstrapInventory(runtime,days=2){
  const recipeIds=runtime.menu.map(x=>x.recipeId);const targets={};
  for(const rid of recipeIds){for(const line of recipeEngine.scaleRecipe(rid,Math.max(4,days*4),'single'))targets[line.ingredientId]=(targets[line.ingredientId]||0)+line.grams;}
  const orders=procurement.autoProcure(runtime.procurement,runtime.supplierNetwork,runtime.inventory,targets,{day:runtime.day});
  for(const po of orders)procurement.receivePurchaseOrder(runtime.procurement,po.id,runtime.inventory,{day:runtime.day,network:runtime.supplierNetwork,instant:true});
  return {targets,orders};
}
function customerProfile(runtime,options={}){
  const p=customerEngine.createSegmentProfile(runtime.rng,{districtId:options.districtId||'university',segmentId:options.segmentId});
  runtime.customers[p.id]=p;return p;
}
function simulateVisit(runtime,profile,ctx={}){
  const visit=customerEngine.generateVisit(profile,runtime.rng,{hour:ctx.hour??12,day:runtime.day,channel:ctx.channel,period:ctx.period,rain:ctx.rain});
  const dishes=runtime.menu.map(m=>{const r=food.RECIPE_BY_ID[m.recipeId];return {id:m.id,menuItem:m,price:m.listPrice,available:recipeEngine.maxCraftable(m.recipeId,
    inventoryEngine.stockSummary(runtime.inventory).byIngredient,m.portionId)>0,tasteFit:65,qualityScore:72,popularity:50,signature:m.featured};});
  const chosen=customerEngine.chooseDish(profile,visit,dishes,runtime.rng,{});
  if(!chosen)return {ok:false,reason:'没有可选菜品',visit};
  const order=orderEngine.createOrder({shopId:runtime.shop.id,customerId:profile.id,channel:visit.channel,partySize:visit.partySize});
  const selectedMenuItem=chosen.dish&&chosen.dish.menuItem;
  if(!selectedMenuItem)return {ok:false,reason:'顾客选菜结果缺少菜单项',visit};
  orderEngine.addItem(order,selectedMenuItem,Math.max(1,visit.partySize));orderEngine.transition(order,'submitted');
  const ticket=kitchenEngine.createTicket(runtime.kitchen,order,ctx.minute||0);
  const produced=kitchenEngine.produceTicket(runtime.kitchen,ticket,order,runtime.inventory,{minute:ctx.minute||0});
  if(!produced.ok){orderEngine.transition(order,'cancelled');return {ok:false,reason:produced.reason,missing:produced.missing,order};}
  if(order.status==='ready')orderEngine.transition(order,'served');if(order.status==='served')orderEngine.transition(order,'paid');
  const service=serviceEngine.serviceScore({staffCoverage:ctx.staffCoverage??1,waitMinutes:produced.prepMinutes,mistakes:0});
  const set=settlement.settleOrder(runtime.ledger,order,{foodCost:produced.foodCost,platformRate:.18});
  const experience={paidPerPerson:order.total/Math.max(1,visit.partySize),taste:produced.quality,portion:72,speed:Math.max(20,100-produced.prepMinutes*2.4),
    service,hygiene:78,environment:74,stability:75};
  const result=retention.evaluate(profile,visit,runtime.shop,experience,runtime.rng);retention.updateShopReputation(runtime.shop,result);
  menuEngine.recordSale(selectedMenuItem,{qty:visit.partySize,paid:order.total,variableCost:produced.foodCost,rating:result.reviewStars});
  const out={ok:true,visit,order,ticket,production:produced,settlement:set,retention:result};
  runtime.history.push({day:runtime.day,type:'visit',customerId:profile.id,orderId:order.id,revenue:set.revenue,profit:set.contribution});return out;
}
function closeDay(runtime,ctx={}){
  const daily=settlement.summary(runtime.ledger);brandGrowth.applyDailyResult(runtime.brand,{profit:daily.profit,rating:runtime.shop.rating,customers:daily.customers});
  inventoryEngine.advanceDay(runtime.inventory,runtime.day+1,{shrinkRate:ctx.shrinkRate??.002});runtime.day++;
  for(const c of runtime.campaigns)marketing.tickCampaign(c);
  const result={day:runtime.day-1,financial:daily,shopRating:runtime.shop.rating,brand:{level:runtime.brand.level,xp:runtime.brand.xp}};
  runtime.history.push({type:'day_close',...result});runtime.ledger=settlement.createLedger();return result;
}
module.exports={createRuntime,bootstrapInventory,customerProfile,simulateVisit,closeDay};
