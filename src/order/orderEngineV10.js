'use strict';

const food=require('../food/foodPackV10.js');

const VALID_TRANSITIONS={
  draft:['submitted','cancelled'],submitted:['accepted','cancelled'],accepted:['cooking','cancelled'],
  cooking:['ready','cancelled'],ready:['served','cancelled'],served:['paid'],paid:[],cancelled:[]
};

function createOrder(options={}){
  return {id:options.id||`order_${Date.now()}_${Math.floor(Math.random()*1e6)}`,shopId:options.shopId||null,customerId:options.customerId||null,
    channel:options.channel||'dine_in',partySize:Math.max(1,Number(options.partySize)||1),status:'draft',items:[],subtotal:0,
    discount:0,deliveryFee:0,serviceFee:0,total:0,createdMinute:Number(options.createdMinute)||0,tableId:options.tableId||null,meta:options.meta||{}};
}
function recalc(order){
  order.subtotal=Math.round(order.items.reduce((s,x)=>s+x.unitPrice*x.qty,0)*100)/100;
  order.total=Math.round(Math.max(0,order.subtotal-Number(order.discount||0)+Number(order.deliveryFee||0)+Number(order.serviceFee||0))*100)/100;
  return order;
}
function addItem(order,menuItem,qty=1){
  const recipe=food.RECIPE_BY_ID[menuItem.recipeId];if(!recipe)return {ok:false,reason:'菜品配方不存在'};
  if(menuItem.active===false)return {ok:false,reason:'菜品未上架'};
  const q=Math.max(1,Math.floor(Number(qty)||1));
  order.items.push({menuItemId:menuItem.id,recipeId:menuItem.recipeId,name:menuItem.name||recipe.name,portionId:menuItem.portionId||'single',
    qty:q,unitPrice:Number(menuItem.listPrice)||0,notes:[],
    customDish:menuItem.customDish?JSON.parse(JSON.stringify(menuItem.customDish)):null});
  recalc(order);return {ok:true,order};
}
function transition(order,next){
  const allowed=VALID_TRANSITIONS[order.status]||[];
  if(!allowed.includes(next))return {ok:false,reason:`订单状态不能从 ${order.status} 变为 ${next}`};
  order.status=next;return {ok:true,order};
}
function applyDiscount(order,amount){order.discount=Math.min(order.subtotal,Math.max(0,Number(amount)||0));return recalc(order);}
function summary(order){return {id:order.id,status:order.status,channel:order.channel,itemCount:order.items.reduce((s,x)=>s+x.qty,0),subtotal:order.subtotal,discount:order.discount,total:order.total};}
module.exports={VALID_TRANSITIONS,createOrder,recalc,addItem,transition,applyDiscount,summary};
