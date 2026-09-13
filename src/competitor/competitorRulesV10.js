'use strict';

const P = require('./competitorPackV10.js');
function clamp(v,min=0,max=100){return Math.max(min,Math.min(max,v));}
function round(v,d=1){const m=10**d;return Math.round(v*m)/m;}
function byId(list,id){return (list||[]).find(x=>x.id===id)||null;}
function pick(rng,list){return list[rng.int(0,list.length-1)];}
function weighted(rng,list){return rng.weighted(list,x=>Number(x.weight||1));}
function unique(arr){return [...new Set(arr.filter(Boolean))];}
function pickIds(rng,list,count){const pool=[...list],out=[];while(pool.length&&out.length<count){const i=rng.int(0,pool.length-1);out.push(pool.splice(i,1)[0].id);}return out;}

function generateName(rng,position){
  const p=pick(rng,P.NAME_PREFIXES), c=pick(rng,P.NAME_CORES);
  const suffix = rng.chance(.20) ? ['记','坊','里','号','馆','社'][rng.int(0,5)] : '';
  const hint=position?.name?.includes('茶')?'茶':position?.name?.includes('火锅')?'锅':position?.name?.includes('咖啡')?'咖':'';
  return `${p}${hint}${c}${suffix}`.replace('茶茶','茶').replace('咖咖啡','咖啡');
}

function createCompetitor(rng, options={}){
  const archetype=byId(P.ARCHETYPES,options.archetypeId)||weighted(rng,P.ARCHETYPES);
  const position=byId(P.BRAND_POSITIONS,options.positioningId)||weighted(rng,P.BRAND_POSITIONS);
  const ownership=byId(P.OWNERSHIP_TYPES,options.ownershipId)||weighted(rng,P.OWNERSHIP_TYPES);
  const cashMin=Math.max(archetype.cashRange[0], Number(options.minCash||0));
  const cashMax=Math.max(cashMin, archetype.cashRange[1]);
  const stores=Math.max(0, Number(options.storeCount ?? (['sole','couple'].includes(ownership.id)?1:rng.int(1,4))));
  const c={
    id: options.id || `competitor_${Math.floor(rng.next()*1e9).toString(36)}`,
    name: options.name || generateName(rng,position),
    archetypeId: archetype.id, positioningId:position.id, ownershipId:ownership.id, ownerPersonId:options.ownerPersonId||null,
    cash:Math.round(options.cash??rng.float(cashMin,cashMax)),debt:Math.max(0,Number(options.debt||0)),credit:clamp(Number(options.credit??rng.int(40,84))),
    brandPower:clamp(Number(options.brandPower??rng.int(18,64))),reputation:clamp(Number(options.reputation??rng.int(38,78))),managementCapacity:clamp(Number(options.managementCapacity??rng.int(28,76))),
    supplyCapacity:clamp(Number(options.supplyCapacity??rng.int(30,80))),managerReserve:Math.max(0,Number(options.managerReserve??rng.int(0,3))),
    aggression:archetype.aggression,expansionDesire:archetype.expansionDesire,priceWarTolerance:archetype.priceWarTolerance,qualityFocus:archetype.qualityFocus,
    imitationAbility:archetype.imitationAbility,marketingAbility:archetype.marketingAbility,learningAbility:archetype.learningAbility,copyDifficulty:position.copyDifficulty,targetPriceIndex:position.targetPriceIndex,
    financeStyleId:pick(rng,P.FINANCE_STYLES).id,capitalStrategyId:pick(rng,P.CAPITAL_STRATEGIES).id,priceStyleId:pick(rng,P.PRICE_STYLES).id,copyStyleId:pick(rng,P.COPY_STYLES).id,
    expansionStrategyId:pick(rng,P.EXPANSION_STRATEGIES).id,menuStrategyId:pick(rng,P.MENU_STRATEGIES).id,marketingStrategyId:pick(rng,P.MARKETING_STRATEGIES).id,
    deliveryStrategyId:pick(rng,P.DELIVERY_STRATEGIES).id,supplyStrategyId:pick(rng,P.SUPPLY_STRATEGIES).id,staffingStrategyId:pick(rng,P.STAFFING_STRATEGIES).id,crisisStrategyId:pick(rng,P.CRISIS_STRATEGIES).id,
    sitePreferenceIds:pickIds(rng,P.SITE_PREFERENCES,3),strengthIds:pickIds(rng,P.OPERATING_STRENGTHS,4),weaknessIds:pickIds(rng,P.OPERATING_WEAKNESSES,3),
    stores:Array.from({length:stores},(_,i)=>({id:`store_${i+1}`,status:'operating',monthlyRevenue:0,monthlyProfit:0,lossMonths:0,districtId:null,categoryId:null})),
    observation:{},memory:[],openingPipeline:[],consecutiveLossMonths:0,consecutiveProfitMonths:0,status:'active',foundedDay:options.currentDay||0,lastDecisionDay:null,rivalry:{},
    metrics:{marketShare:0,profitMargin:0,customerRating:4.0,cashRunwayMonths:12},simulationTier:options.simulationTier||'background'
  };
  return c;
}

function stageFor(c){
  const n=(c.stores||[]).filter(s=>s.status==='operating').length;
  if(n===0)return P.LIFE_STAGES[0];
  if(n===1&&(c.consecutiveProfitMonths||0)<3)return byId(P.LIFE_STAGES,'newborn');
  let best=P.LIFE_STAGES[1];
  for(const s of P.LIFE_STAGES){if(n>=s.minStores)best=s;if(n>=s.minStores&&n<=s.maxStores)return s;}
  return best;
}

function recordObservation(c,signal,day){
  c.observation||={};c.memory||=[];const key=signal.key||signal.type||'market';const prev=c.observation[key]||{value:0,confidence:0,lastDay:null};
  const alpha=clamp((c.learningAbility||50)/130,.18,.72);const value=Number(signal.value||0);
  prev.value=round(prev.value*(1-alpha)+value*alpha,3);prev.confidence=clamp(prev.confidence+6+(c.learningAbility||50)*.06);prev.lastDay=day;c.observation[key]=prev;
  c.memory.unshift({day,key,value,importance:clamp(Number(signal.importance??50)),source:signal.source||'market'});c.memory=c.memory.slice(0,120);return prev;
}

function rivalryScore(c,targetId,context={}){
  const overlap=clamp(Number(context.customerOverlap??50))/100,proximity=clamp(Number(context.proximity??50))/100,shareThreat=clamp(Number(context.shareThreat??0))/100,repeated=clamp(Number(context.repeatedConflict??0))/100,aggression=(c.aggression||50)/100;
  const score=clamp(8+overlap*24+proximity*16+shareThreat*28+repeated*18+aggression*12);c.rivalry||={};c.rivalry[targetId]={score:round(score,1),updatedDay:context.day??null};return round(score,1);
}
function rivalryLevel(score){return P.RIVALRY_LEVELS.find(x=>score>=x.min&&score<=x.max)||P.RIVALRY_LEVELS[0];}

function expansionCapacity(c,ctx={}){
  const operating=(c.stores||[]).filter(s=>s.status==='operating').length,avgMonthlyFixed=Math.max(5000,Number(ctx.avgMonthlyFixedCost||45000)),cashRunway=c.cash/Math.max(1,avgMonthlyFixed*(operating||1));
  const cashScore=clamp((cashRunway-2)*11),managementHeadroom=clamp((c.managementCapacity||50)-operating*2.25+(c.managerReserve||0)*8),supplyHeadroom=clamp((c.supplyCapacity||50)-operating*1.65),creditHeadroom=clamp((c.credit||50)-Number(ctx.debtPressure||0)*.5);
  const score=clamp(cashScore*.34+managementHeadroom*.28+supplyHeadroom*.20+creditHeadroom*.18);return {score:round(score,1),cashRunwayMonths:round(cashRunway,1),managementHeadroom:round(managementHeadroom,1),supplyHeadroom:round(supplyHeadroom,1)};
}

function closureRisk(c,ctx={}){
  const operating=(c.stores||[]).filter(s=>s.status==='operating').length,margin=Number(ctx.profitMargin??c.metrics?.profitMargin??0),runway=Number(ctx.cashRunwayMonths??c.metrics?.cashRunwayMonths??12),rentPressure=clamp(Number(ctx.rentPressure??50)),rating=Number(ctx.rating??c.metrics?.customerRating??4);
  let score=4;score+=Math.max(0,-margin)*85;score+=Math.max(0,4-runway)*9;score+=Math.max(0,(c.consecutiveLossMonths||0)-1)*7;score+=Math.max(0,rentPressure-65)*.22;score+=Math.max(0,3.7-rating)*18;score-=Math.min(16,(c.credit||50)*.09);if(operating>1)score-=4;return round(clamp(score,1,96),1);
}
function priceFloor(c,ctx={}){const unitCost=Math.max(.01,Number(ctx.unitCost||10)),fixedAllocation=Math.max(0,Number(ctx.fixedCostPerOrder||2)),survivalMargin=clamp(8+(100-(c.priceWarTolerance||50))*.12,6,20)/100;return round((unitCost+fixedAllocation)*(1+survivalMargin),2);}

function assignSimulationTier(index,counts){if(index<counts.core)return'core';if(index<counts.core+counts.local)return'local';return'background';}
function normalizeTierCounts(total,opts={}){
  const core=Math.max(8,Math.min(20,Number(opts.coreCount??Math.round(total*.025))));
  const local=Math.max(15,Math.min(50,Number(opts.localCount??Math.round(total*.07))));
  return {core:Math.min(core,total),local:Math.min(local,Math.max(0,total-core)),background:Math.max(0,total-core-local)};
}

function createMarketPopulation(rng,options={}){
  const min=P.CITY_MARKET_SCALE.businessEntities[0],max=P.CITY_MARKET_SCALE.businessEntities[1];
  const total=Math.max(min,Math.min(max,Number(options.businessCount??rng.int(min,max))));
  const counts=normalizeTierCounts(total,options);const entities=[];
  for(let i=0;i<total;i++){
    const tier=assignSimulationTier(i,counts);
    const c=createCompetitor(rng,{currentDay:options.currentDay||0,simulationTier:tier,storeCount:tier==='core'?rng.int(1,12):tier==='local'?rng.int(1,5):rng.int(1,3)});
    if(tier==='background'){
      c.memory=[];c.observation={};c.openingPipeline=[];c.rivalry={};
    }
    entities.push(c);
  }
  return {entities,counts,total};
}

module.exports={createCompetitor,createMarketPopulation,normalizeTierCounts,assignSimulationTier,stageFor,recordObservation,rivalryScore,rivalryLevel,expansionCapacity,closureRisk,priceFloor,byId,clamp,round};
