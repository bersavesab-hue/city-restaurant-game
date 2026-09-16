'use strict';

const gameState=require('../core/gameState.js');
const timeScheduleCoordinator=require('../core/timeScheduleCoordinatorV0812.js');
const openingPrepSystem=require('../opening/openingPrepSystem.js');
const foodResearchSystem=require('./foodResearchSystemV0818.js');
const pack=require('./foodPackV10.js');
const generator=require('./foodGenerator.js');
const upgrade=require('./foodResearchUpgrade.js');
const qualitySystem=require('./foodQuality.js');

const VERSION='1.2.0';
const MAX_LIBRARY=48;
const MAX_HISTORY=80;
const CANDIDATE_COUNT=3;
const REFRESH_COST=280;

function clone(value){return JSON.parse(JSON.stringify(value));}
function clamp(value,min,max){return Math.max(min,Math.min(max,Number(value)||0));}
function round(value,digits=1){const p=Math.pow(10,digits);return Math.round((Number(value)||0)*p)/p;}

function currentMinute(){
  return Math.max(0,Number(timeScheduleCoordinator.absoluteMinute(gameState.getTime()))||0);
}

function currentDay(){return Math.floor(currentMinute()/1440);}

function ensureRoot(){
  const business=gameState.getBusiness();
  business.customDishLab=business.customDishLab&&typeof business.customDishLab==='object'&&!Array.isArray(business.customDishLab)
    ? business.customDishLab
    : {};
  const root=business.customDishLab;
  root.version=VERSION;
  root.shops=root.shops&&typeof root.shops==='object'&&!Array.isArray(root.shops)?root.shops:{};
  return root;
}

function ensureShop(shopId){
  if(!shopId)throw new Error('customDishSystem: shopId required');
  const root=ensureRoot();
  root.shops[shopId]=root.shops[shopId]&&typeof root.shops[shopId]==='object'?root.shops[shopId]:{};
  const store=root.shops[shopId];
  store.version=VERSION;
  store.serial=Math.max(0,Number(store.serial)||0);
  store.candidateSerial=Math.max(0,Number(store.candidateSerial)||0);
  store.candidateDay=Number.isFinite(Number(store.candidateDay))?Number(store.candidateDay):-1;
  store.dailyRefreshes=Math.max(0,Number(store.dailyRefreshes)||0);
  store.candidates=Array.isArray(store.candidates)?store.candidates:[];
  store.activeProject=store.activeProject&&typeof store.activeProject==='object'?store.activeProject:null;
  store.library=Array.isArray(store.library)?store.library:[];
  store.history=Array.isArray(store.history)?store.history:[];
  store.metrics=store.metrics&&typeof store.metrics==='object'?store.metrics:{};
  store.metrics.generated=Math.max(0,Number(store.metrics.generated)||0);
  store.metrics.started=Math.max(0,Number(store.metrics.started)||0);
  store.metrics.completed=Math.max(0,Number(store.metrics.completed)||0);
  store.metrics.spent=Math.max(0,Number(store.metrics.spent)||0);
  store.metrics.improvements=Math.max(0,Number(store.metrics.improvements)||0);
  if(store.library.length>MAX_LIBRARY)store.library=store.library.slice(-MAX_LIBRARY);
  if(store.history.length>MAX_HISTORY)store.history=store.history.slice(-MAX_HISTORY);
  return store;
}

function bestChefSkill(shopId){
  let staffing=null;
  try{staffing=openingPrepSystem.getStaffState(shopId);}catch(_err){staffing=null;}
  const chefs=staffing&&Array.isArray(staffing.hired)
    ? staffing.hired.filter(row=>row&&row.roleId==='chef')
    : [];
  if(!chefs.length)return 42;
  let best=0;
  for(const chef of chefs){
    const profileSkill=chef&&chef.personProfile&&chef.personProfile.skills
      ? Number(chef.personProfile.skills.cooking)||0
      : 0;
    const score=Math.max(Number(chef.skill)||0,profileSkill);
    best=Math.max(best,score);
  }
  return clamp(best||42,1,100);
}

function unlockedRecipes(){
  let rows=[];
  try{rows=foodResearchSystem.getCatalog({}).filter(row=>row&&row.unlocked);}catch(_err){rows=[];}
  if(!rows.length)rows=pack.RECIPES.slice(0,12).map(row=>({...clone(row),unlocked:true}));
  return rows;
}

function selectBase(recipes,random,index){
  if(!recipes.length)return null;
  const offset=Math.floor(random()*recipes.length);
  return recipes[(offset+index*7)%recipes.length];
}

function buildCandidates(shopId,store,seedSuffix){
  const day=currentDay();
  const chefSkill=bestChefSkill(shopId);
  const recipes=unlockedRecipes();
  const serial=++store.candidateSerial;
  const batchSeed=`${shopId}:${day}:${serial}:${seedSuffix||'daily'}`;
  const random=generator.seededRandom(batchSeed);
  const rows=[];
  const used=new Set();
  for(let i=0;i<CANDIDATE_COUNT;i++){
    let base=selectBase(recipes,random,i);
    if(!base)continue;
    let guard=0;
    while(used.has(base.id)&&guard<recipes.length){
      base=recipes[(recipes.indexOf(base)+1)%recipes.length];
      guard++;
    }
    used.add(base.id);
    const id=`concept_${day}_${serial}_${i+1}`;
    rows.push(generator.generateCandidate(base,{
      pack,
      chefSkill,
      seed:`${batchSeed}:${base.id}:${i}`,
      id
    }));
  }
  store.candidateDay=day;
  store.dailyRefreshes=seedSuffix==='paid-refresh'?store.dailyRefreshes+1:0;
  store.candidates=rows;
  store.metrics.generated+=rows.length;
  store.history.push({type:'candidate_batch',minute:currentMinute(),count:rows.length,paid:seedSuffix==='paid-refresh'});
  if(store.history.length>MAX_HISTORY)store.history=store.history.slice(-MAX_HISTORY);
  return rows;
}

function ensureCandidates(shopId){
  const store=ensureShop(shopId);
  const day=currentDay();
  if(store.candidateDay!==day||!store.candidates.length){
    buildCandidates(shopId,store,'daily');
  }
  return store.candidates;
}

function refreshCandidates(shopId){
  const store=ensureShop(shopId);
  if(store.activeProject){return {ok:false,reason:'当前有研发项目进行中'};}
  if(!gameState.spendCash(REFRESH_COST))return {ok:false,reason:'资金不足',cost:REFRESH_COST};
  store.metrics.spent+=REFRESH_COST;
  const candidates=buildCandidates(shopId,store,'paid-refresh');
  return {ok:true,cost:REFRESH_COST,candidates:clone(candidates)};
}

function getCandidate(shopId,candidateId){
  const store=ensureShop(shopId);
  ensureCandidates(shopId);
  return store.candidates.find(row=>row.id===candidateId)||null;
}

function startResearch(shopId,candidateId){
  const store=ensureShop(shopId);
  sync(shopId);
  if(store.activeProject)return {ok:false,reason:'已有菜品正在研发'};
  const candidate=getCandidate(shopId,candidateId);
  if(!candidate)return {ok:false,reason:'研发方案不存在或已刷新'};
  const cost=Math.max(0,Number(candidate.researchCost)||0);
  if(!gameState.spendCash(cost))return {ok:false,reason:'研发资金不足',cost};
  const startMinute=currentMinute();
  const finishMinute=startMinute+Math.max(1,Number(candidate.researchDays)||1)*1440;
  store.activeProject={
    id:`project_${candidate.id}`,
    candidate:clone(candidate),
    chefSkill:bestChefSkill(shopId),
    startMinute,
    finishMinute,
    cost,
    status:'researching'
  };
  store.metrics.started+=1;
  store.metrics.spent+=cost;
  store.history.push({type:'research_started',minute:startMinute,candidateId:candidate.id,cost,finishMinute});
  if(store.history.length>MAX_HISTORY)store.history=store.history.slice(-MAX_HISTORY);
  return {ok:true,project:clone(store.activeProject)};
}

function completeProject(shopId,store){
  const project=store.activeProject;
  if(!project)return null;
  store.serial+=1;
  const dishId=`custom_${shopId}_${store.serial}`;
  const dish=generator.completeCandidate(project.candidate,{
    chefSkill:project.chefSkill,
    seed:`${project.candidate.seed}:complete:${store.serial}`,
    id:dishId,
    createdMinute:currentMinute()
  });
  dish.shopId=shopId;
  store.library.push(dish);
  if(store.library.length>MAX_LIBRARY)store.library=store.library.slice(-MAX_LIBRARY);
  store.activeProject=null;
  store.candidates=[];
  store.metrics.completed+=1;
  store.history.push({type:'research_completed',minute:currentMinute(),dishId:dish.id,score:dish.score,qualityId:dish.qualityId});
  if(store.history.length>MAX_HISTORY)store.history=store.history.slice(-MAX_HISTORY);
  return dish;
}

function sync(shopId){
  const store=ensureShop(shopId);
  if(store.activeProject){
    const finishMinute=Number(store.activeProject.finishMinute);
    if(Number.isFinite(finishMinute)&&currentMinute()>=finishMinute){
      const dish=completeProject(shopId,store);
      return {changed:true,completed:dish?clone(dish):null};
    }
  }
  return {changed:false,completed:null};
}

function getDish(shopId,dishId){
  sync(shopId);
  return ensureShop(shopId).library.find(row=>row.id===dishId)||null;
}

function improveDish(shopId,dishId,focus='taste'){
  const store=ensureShop(shopId);
  sync(shopId);
  const index=store.library.findIndex(row=>row.id===dishId);
  if(index<0)return {ok:false,reason:'自研菜品不存在'};
  const dish=store.library[index];
  const cost=Math.round((360+(Number(dish.score)||60)*7+(Number(dish.improvements)||0)*180)/10)*10;
  if(!gameState.spendCash(cost))return {ok:false,reason:'优化资金不足',cost};
  const improved=upgrade.improveFood(dish,{focus,chefSkill:bestChefSkill(shopId),minute:currentMinute()});
  improved.recommendedPrice=Math.max(Number(dish.recommendedPrice)||8,Math.round((Number(dish.recommendedPrice)||8)*(1+(improved.score-(Number(dish.score)||0))/180)));
  store.library[index]=improved;
  store.metrics.spent+=cost;
  store.metrics.improvements+=1;
  store.history.push({type:'dish_improved',minute:currentMinute(),dishId,focus,cost,score:improved.score});
  if(store.history.length>MAX_HISTORY)store.history=store.history.slice(-MAX_HISTORY);
  return {ok:true,cost,dish:clone(improved)};
}

function getOverview(shopId){
  const syncResult=sync(shopId);
  const store=ensureShop(shopId);
  const candidates=ensureCandidates(shopId);
  const active=store.activeProject?clone(store.activeProject):null;
  let progress=0;
  let remainingMinutes=0;
  if(active){
    const now=currentMinute();
    const span=Math.max(1,active.finishMinute-active.startMinute);
    progress=clamp((now-active.startMinute)/span,0,1);
    remainingMinutes=Math.max(0,active.finishMinute-now);
  }
  return {
    version:VERSION,
    shopId,
    chefSkill:bestChefSkill(shopId),
    refreshCost:REFRESH_COST,
    candidates:clone(candidates),
    activeProject:active,
    progress:round(progress,3),
    remainingMinutes,
    library:clone(store.library),
    metrics:clone(store.metrics),
    history:clone(store.history.slice(-12)),
    completed:syncResult.completed,
    qualityBands:clone(qualitySystem.QUALITY)
  };
}

module.exports={
  VERSION,
  REFRESH_COST,
  ensureShop,
  bestChefSkill,
  ensureCandidates,
  refreshCandidates,
  getCandidate,
  startResearch,
  sync,
  getDish,
  improveDish,
  getOverview
};
