'use strict';

const food=require('../food/foodPackV10.js');
const rules=require('./inventoryRulesV10.js');

function clone(v){return JSON.parse(JSON.stringify(v));}
function createInventory(options={}){
  return {
    version:'1.0.0',
    day:Number(options.day)||1,
    lots:[],
    sequence:0,
    capacityKg:{ambient:Number(options.ambientKg)||600,chilled:Number(options.chilledKg)||320,frozen:Number(options.frozenKg)||220},
    waste:{expiredGrams:0,shrinkGrams:0,value:0},
    history:[]
  };
}
function usedKg(state,storage){
  return state.lots.filter(x=>x.storage===storage&&x.grams>0).reduce((s,x)=>s+x.grams,0)/1000;
}
function receive(state,line){
  const ingredient=food.INGREDIENTS.find(x=>x.id===line.ingredientId);
  if(!ingredient)return {ok:false,reason:'食材不存在'};
  const grams=Math.max(0,Number(line.grams)||0);
  const storage=line.storage||rules.storageFor(ingredient);
  const capacity=Number(state.capacityKg[storage]||0);
  if(usedKg(state,storage)+grams/1000>capacity)return {ok:false,reason:`${storage}仓容量不足`};
  const day=Number(line.day??state.day);
  const lot={
    id:`lot_${++state.sequence}`,ingredientId:ingredient.id,ingredientName:ingredient.name,grams,
    originalGrams:grams,storage,receivedDay:day,expiryDay:day+Math.max(1,Number(line.shelfDays??ingredient.shelfDays)),
    unitCostPerKg:Number(line.unitCostPerKg)||0,supplierId:line.supplierId||null,quality:Number(line.quality??75)
  };
  state.lots.push(lot);state.history.push({type:'receive',day,lotId:lot.id,ingredientId:lot.ingredientId,grams});
  return {ok:true,lot};
}
function availableGrams(state,ingredientId){
  return state.lots.filter(x=>x.ingredientId===ingredientId&&x.grams>0&&x.expiryDay>=state.day).reduce((s,x)=>s+x.grams,0);
}
function consume(state,ingredientId,grams,options={}){
  let need=Math.max(0,Number(grams)||0);
  const have=availableGrams(state,ingredientId);
  if(have+1e-6<need)return {ok:false,reason:'库存不足',needGrams:need,haveGrams:have,cost:0};
  const lots=state.lots.filter(x=>x.ingredientId===ingredientId&&x.grams>0&&x.expiryDay>=state.day)
    .sort((a,b)=>a.expiryDay-b.expiryDay||a.receivedDay-b.receivedDay);
  let cost=0,used=0,qualityWeighted=0;
  for(const lot of lots){
    if(need<=0)break;
    const take=Math.min(need,lot.grams);
    lot.grams-=take;need-=take;used+=take;
    cost+=take/1000*lot.unitCostPerKg;
    qualityWeighted+=take*lot.quality;
  }
  state.history.push({type:'consume',day:state.day,ingredientId,grams:used,reason:options.reason||'production'});
  return {ok:true,grams:used,cost:Math.round(cost*100)/100,avgQuality:used?Math.round(qualityWeighted/used*10)/10:0};
}
function consumeRequirements(state,requirements,options={}){
  for(const line of requirements||[]){
    if(!line.optional&&availableGrams(state,line.ingredientId)<line.grams){
      return {ok:false,missing:{ingredientId:line.ingredientId,name:line.name,need:line.grams,have:availableGrams(state,line.ingredientId)}};
    }
  }
  let cost=0,quality=0,weight=0,consumed=[];
  for(const line of requirements||[]){
    const have=availableGrams(state,line.ingredientId);
    if(line.optional&&have<line.grams)continue;
    const r=consume(state,line.ingredientId,line.grams,options);
    if(r.ok){cost+=r.cost;quality+=r.avgQuality*r.grams;weight+=r.grams;consumed.push(r);}
  }
  return {ok:true,cost:Math.round(cost*100)/100,avgQuality:weight?Math.round(quality/weight*10)/10:0,consumed};
}
function advanceDay(state,toDay,options={}){
  const day=Math.max(state.day,Number(toDay)||state.day+1);state.day=day;
  let expiredGrams=0,expiredValue=0;
  for(const lot of state.lots){
    if(lot.grams<=0)continue;
    if(lot.expiryDay<day){
      expiredGrams+=lot.grams;expiredValue+=rules.lotValue(lot);lot.grams=0;
    }else if(options.shrinkRate){
      const shrink=Math.min(lot.grams,lot.grams*Math.max(0,Number(options.shrinkRate)));
      lot.grams-=shrink;state.waste.shrinkGrams+=shrink;
    }
  }
  state.waste.expiredGrams+=expiredGrams;state.waste.value+=expiredValue;
  state.history.push({type:'day',day,expiredGrams});
  return {day,expiredGrams,expiredValue:Math.round(expiredValue*100)/100};
}
function stockSummary(state){
  const byIngredient={};
  for(const lot of state.lots){if(lot.grams<=0)continue;byIngredient[lot.ingredientId]=(byIngredient[lot.ingredientId]||0)+lot.grams;}
  return {day:state.day,byIngredient,totalKg:Object.values(byIngredient).reduce((s,x)=>s+x,0)/1000,waste:clone(state.waste)};
}
function reorderSuggestions(state,targets={}){
  const out=[];
  for(const [ingredientId,targetGrams] of Object.entries(targets)){
    const have=availableGrams(state,ingredientId);
    if(have<targetGrams*.45)out.push({ingredientId,haveGrams:have,targetGrams,reorderGrams:Math.max(0,targetGrams-have),priority:have<targetGrams*.15?'critical':'normal'});
  }
  return out.sort((a,b)=>(a.priority==='critical'?-1:1)-(b.priority==='critical'?-1:1));
}
module.exports={createInventory,receive,availableGrams,consume,consumeRequirements,advanceDay,stockSummary,reorderSuggestions,usedKg};
