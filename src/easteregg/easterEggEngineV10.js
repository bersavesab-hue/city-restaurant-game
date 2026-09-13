'use strict';
const PACK=require('./easterEggPackV10.js');
const PERSON_RULES=require('../person/personRulesV10.js');

function clamp(v,min=0,max=100){return Math.max(min,Math.min(max,v));}
function byId(id){return PACK.HIDDEN_CHARACTERS.find(x=>x.id===id)||null;}
function inLateWindow(hour,from,to){
  if(hour==null)return true;
  if(from<=to)return hour>=from&&hour<=to;
  return hour>=from||hour<=to;
}
function enough(v,min){return min==null||Number(v||0)>=Number(min);}
function triggerOk(def,ctx={}){
  const t=def.trigger||{};
  if(!enough(ctx.daysPlayed,t.minDays))return false;
  if(!enough(ctx.quality,t.minQuality))return false;
  if(!enough(ctx.storeQuality,t.minStoreQuality))return false;
  if(!enough(ctx.reviewCount,t.minReviewCount))return false;
  if(!enough(ctx.staffShortage,t.staffShortage))return false;
  if(t.maxChefReserve!=null&&Number(ctx.chefReserve||0)>t.maxChefReserve)return false;
  if(!enough(ctx.supplierComparisons,t.supplierComparisons))return false;
  if(!enough(ctx.earlyMarketVisits,t.earlyMarketVisits))return false;
  if(!enough(ctx.deliveryOrders,t.deliveryOrders))return false;
  if(!enough(ctx.rainyNightOrders,t.rainyNightOrders))return false;
  if(!enough(ctx.cashflowWarningDays,t.cashflowWarningDays))return false;
  if(!enough(ctx.revenueDays,t.minRevenueDays))return false;
  if(!enough(ctx.stableQualityDays,t.stableQualityDays))return false;
  if(!enough(ctx.repeatRate,t.minRepeatRate))return false;
  if(!enough(ctx.organicReputation,t.minOrganicReputation))return false;
  if(!enough(ctx.storeCount,t.storeCount))return false;
  if(!enough(ctx.expansionPressure,t.expansionPressure))return false;
  if(!enough(ctx.rainyPropertySearches,t.rainyPropertySearches))return false;
  if(!enough(ctx.viewedListings,t.viewedListings))return false;
  if(t.districtId&&ctx.districtId!==t.districtId)return false;
  if(!enough(ctx.studentShare,t.studentShare))return false;
  if(!enough(ctx.profitDays,t.minProfitDays))return false;
  if(!enough(ctx.cashflowScore,t.minCashflowScore))return false;
  if(!enough(ctx.lateNightOpenDays,t.lateNightOpenDays))return false;
  if(!enough(ctx.noodleSales,t.noodleSales))return false;
  if(t.maxRecentAdSpend!=null&&Number(ctx.recentAdSpend||0)>t.maxRecentAdSpend)return false;
  if((t.hourFrom!=null||t.hourTo!=null)&&!inLateWindow(Number(ctx.hour),Number(t.hourFrom),Number(t.hourTo)))return false;
  return true;
}

function createHiddenPerson(rng,id,options={}){
  const def=byId(id); if(!def)throw new Error(`未知隐藏人物: ${id}`);
  const age=rng.int(def.ageRange[0],def.ageRange[1]);
  const person=PERSON_RULES.createPersonProfile(rng,{name:def.name,age,genderId:def.genderId,traits:def.signatureTraits});
  for(const [axis,band] of Object.entries(def.axisBands||{})){
    const base=person.personality?.[axis]??50;
    person.personality[axis]=clamp(Math.max(band[0],Math.min(band[1],base)));
  }
  const roleResult=PERSON_RULES.assignRole(person,def.roleId,{allowLowFit:true,date:options.date||null,employerId:options.employerId||null});
  person.hiddenCharacterId=id;
  person.hiddenAlias=def.alias;
  person.hidden=true;
  person.discovered=!!options.discovered;
  person.tags=[...(person.tags||[]),'hidden_character',`hidden_${id}`];
  return {definition:def,person,roleResult};
}

function createState(){return {discovered:{},encountered:{},cooldowns:{},clues:{},eventsSeen:{}};}
function addClue(state,id,clue){
  state.clues[id]||=[];
  if(!state.clues[id].includes(clue))state.clues[id].push(clue);
  return state.clues[id];
}
function clueProgress(state,id){const d=byId(id);return !d?0:Math.min(1,(state.clues[id]||[]).length/Math.max(1,d.clues.length));}
function rollHiddenEncounter(rng,state,ctx={}){
  const day=Number(ctx.daysPlayed||0), candidates=[];
  for(const def of PACK.HIDDEN_CHARACTERS){
    if(state.discovered[def.id])continue;
    if((state.cooldowns[def.id]||0)>day)continue;
    if(!triggerOk(def,ctx))continue;
    const clue=clueProgress(state,def.id);
    const chance=Math.min(0.08,def.rarity*(1+clue*.9+Number(ctx.hiddenDiscoveryBonus||0)/100));
    if(rng.chance(chance))candidates.push(def);
  }
  if(!candidates.length)return null;
  const def=rng.pick(candidates);
  state.encountered[def.id]=(state.encountered[def.id]||0)+1;
  state.cooldowns[def.id]=day+Math.max(7,Math.round(18-def.rarity*500));
  return {type:'hidden_character',id:def.id,name:def.name,alias:def.alias,clues:[...(state.clues[def.id]||[])],rewards:{...def.rewards}};
}
function discover(state,id){const d=byId(id);if(!d)return false;state.discovered[id]=true;return true;}
function rollEasterEvent(rng,state,ctx={}){
  const pool=PACK.EASTER_EVENTS.filter(e=>!state.eventsSeen[e.id]&&typeof ctx.eventEligibility==='function'?ctx.eventEligibility(e):true);
  for(const e of pool){if(e.baseChance>=1||rng.chance(e.baseChance)){state.eventsSeen[e.id]=Number(ctx.daysPlayed||0);return {...e};}}
  return null;
}
function listUndiscovered(state){return PACK.HIDDEN_CHARACTERS.filter(x=>!state.discovered[x.id]).map(x=>({id:x.id,alias:x.alias,clueCount:(state.clues[x.id]||[]).length,totalClues:x.clues.length}));}

module.exports={createState,triggerOk,createHiddenPerson,addClue,clueProgress,rollHiddenEncounter,discover,rollEasterEvent,listUndiscovered};
