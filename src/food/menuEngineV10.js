'use strict';

const pack = require('./foodPackV10');
const rules = require('./foodRulesV10');
const recipes = pack.RECIPE_BY_ID;

function clamp(v,min,max){return Math.max(min,Math.min(max,v));}
function round(v,n){const p=Math.pow(10,n||0);return Math.round(v*p)/p;}

function createMenuItem(recipeId, options) {
  options = options || {};
  const r = recipes[recipeId];
  if (!r) throw new Error('未知菜品 '+recipeId);
  return {
    id: options.id || ('menu_'+recipeId+'_'+(options.portionId||'single')),
    recipeId,
    name: options.name || r.name,
    portionId: options.portionId || 'single',
    channel: options.channel || 'all',
    listPrice: options.listPrice == null ? round(r.basePriceIndex*20,1) : Number(options.listPrice),
    active: options.active !== false,
    featured: !!options.featured,
    prepLimitPerHour: options.prepLimitPerHour || null,
    stats: {orders:0,revenue:0,variableCost:0,discount:0,refunds:0,ratingSum:0,ratingCount:0}
  };
}

function customerFit(menuItem, customer, context) {
  const r = recipes[menuItem.recipeId];
  if (!r) return 0;
  context = context || {};
  customer = customer || {};
  let score = 50;
  const budget = customer.budget || 35;
  const price = menuItem.listPrice || 0;
  if (price > budget) score -= Math.min(55,(price-budget)/Math.max(1,budget)*85);
  else score += Math.min(12,(budget-price)/Math.max(1,budget)*10);

  const favFlavors = customer.flavors || [];
  if (favFlavors.includes(r.flavor)) score += 15;
  if ((customer.dislikedFlavors||[]).includes(r.flavor)) score -= 22;

  const required = customer.requiredTags || [];
  const tags = new Set(r.tags || []);
  for (const t of required) if (!tags.has(t)) score -= 28;

  const allergens = new Set(require('./foodRulesV10').collectAllergens(r));
  for (const a of (customer.allergens||[])) if (allergens.has(a)) return 0;

  if (customer.hurry) {
    const mins = rules.estimatedPrepMinutes(r,context.staffSkill,context.equipmentScore,1);
    if (mins > (customer.maxWaitMinutes || 15)) score -= Math.min(35,(mins-(customer.maxWaitMinutes||15))*2.2);
  }

  if (context.seasonFactor != null) score *= context.seasonFactor;
  if (menuItem.featured) score += 4;
  return round(clamp(score,0,100),1);
}

function chooseMenuItem(menu, customer, context, randomValue) {
  const choices = (menu||[]).filter(x=>x.active).map(x=>({item:x,score:customerFit(x,customer,context)})).filter(x=>x.score>0);
  if (!choices.length) return null;
  choices.sort((a,b)=>b.score-a.score);
  const top = choices.slice(0,Math.min(5,choices.length));
  const total = top.reduce((s,x)=>s+Math.pow(Math.max(1,x.score),1.35),0);
  let r=(randomValue==null?0.42:randomValue)*total;
  for(const x of top){r-=Math.pow(Math.max(1,x.score),1.35);if(r<=0)return x.item;}
  return top[0].item;
}

function classifyMenuEngineering(item, medians) {
  medians = medians || {};
  const s=item.stats||{};
  const orders=s.orders||0;
  const revenue=s.revenue||0;
  const cost=s.variableCost||0;
  const contribution=orders>0?(revenue-cost)/orders:0;
  const highSales=orders >= (medians.orders == null ? 20 : medians.orders);
  const highMargin=contribution >= (medians.contribution == null ? 8 : medians.contribution);
  if(highSales&&highMargin)return 'star';
  if(highSales&&!highMargin)return 'plowhorse';
  if(!highSales&&highMargin)return 'puzzle';
  return 'dog';
}

function menuSummary(menu) {
  let orders=0,revenue=0,cost=0,refunds=0;
  for(const x of menu||[]){const s=x.stats||{};orders+=s.orders||0;revenue+=s.revenue||0;cost+=s.variableCost||0;refunds+=s.refunds||0;}
  return {orders,revenue:round(revenue,2),variableCost:round(cost,2),grossContribution:round(revenue-cost,2),refunds,avgTicket:orders?round(revenue/orders,2):0};
}

function priceWarning(menuItem, options){
  const r=recipes[menuItem.recipeId];
  if(!r)return {level:'error',message:'菜品配方不存在'};
  const floor=rules.minimumSafePrice(r,Object.assign({},options,{portionId:menuItem.portionId}));
  const price=menuItem.listPrice;
  if(price<floor*0.92)return {level:'danger',floor,message:'售价低于生存成本线'};
  if(price<floor*1.06)return {level:'warn',floor,message:'毛利空间过薄'};
  const ref=options&&options.referencePrice;
  if(ref&&price>ref*1.35)return {level:'warn',floor,message:'显著高于本地参考价，需求可能快速下降'};
  return {level:'ok',floor,message:'价格处于可经营区间'};
}

function updateReferencePrice(oldReference, observedPrice, alpha){
  if(oldReference==null)return Number(observedPrice||0);
  alpha=alpha==null?1/30:clamp(alpha,0.001,1);
  return round(oldReference*(1-alpha)+observedPrice*alpha,2);
}

function recordSale(item, order){
  if(!item||!order)return item;
  const s=item.stats||(item.stats={orders:0,revenue:0,variableCost:0,discount:0,refunds:0,ratingSum:0,ratingCount:0});
  s.orders += order.qty||1;
  s.revenue += order.paid||0;
  s.variableCost += order.variableCost||0;
  s.discount += order.discount||0;
  s.refunds += order.refund||0;
  if(order.rating!=null){s.ratingSum+=order.rating;s.ratingCount+=1;}
  return item;
}

module.exports={createMenuItem,customerFit,chooseMenuItem,classifyMenuEngineering,menuSummary,priceWarning,updateReferencePrice,recordSale};
