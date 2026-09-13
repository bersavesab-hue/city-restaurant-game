'use strict';
const P=require('./customerPackV10.js');
const R=require('./customerRulesV10.js');
function pick(rng,list,weightFn){return R.weighted(rng,list,weightFn);}
function id(rng,prefix){return `${prefix}_${Math.floor(R.rngNext(rng)*1e12).toString(36)}`;}

function createSegmentProfile(rng,opts={}){
  let segment=opts.segmentId?R.byId(P.SEGMENTS,opts.segmentId):null;
  if(!segment){
    const weights=R.districtSegmentWeights(opts.districtId||'');segment=pick(rng,weights,x=>x.weight)?.segment||pick(rng,P.SEGMENTS,x=>x.weight);
  }
  const income=opts.incomeBandId?R.byId(P.INCOME_BANDS,opts.incomeBandId):pick(rng,P.INCOME_BANDS,x=>Math.max(1,10-Math.abs((x.budgetMultiplier||1)-(segment.budgetIndex||1))*7));
  const household=opts.householdTypeId?R.byId(P.HOUSEHOLD_TYPES,opts.householdTypeId):pick(rng,P.HOUSEHOLD_TYPES,()=>1);
  return {
    id:opts.id||id(rng,'custseg'),segmentId:segment.id,name:segment.name,incomeBandId:income.id,householdTypeId:household.id,
    occupationId:pick(rng,P.OCCUPATIONS)?.id,motiveIds:[pick(rng,P.DINING_MOTIVES)?.id,pick(rng,P.DINING_MOTIVES)?.id].filter((x,i,a)=>x&&a.indexOf(x)===i),
    tasteIds:[pick(rng,P.TASTE_PROFILES)?.id,pick(rng,P.TASTE_PROFILES)?.id,pick(rng,P.TASTE_PROFILES)?.id].filter((x,i,a)=>x&&a.indexOf(x)===i),
    channelHabitId:pick(rng,P.CHANNEL_HABITS)?.id,timePatternId:pick(rng,P.TIME_PATTERNS)?.id,decisionBiasIds:[pick(rng,P.DECISION_BIASES)?.id,pick(rng,P.DECISION_BIASES)?.id].filter((x,i,a)=>x&&a.indexOf(x)===i),
    reviewStyleId:pick(rng,P.REVIEW_STYLES)?.id,socialInfluenceId:pick(rng,P.SOCIAL_INFLUENCE_TYPES)?.id,dietaryPreferenceId:pick(rng,P.DIETARY_PREFERENCES)?.id,
    traits:{priceSensitivity:R.clamp((segment.priceSensitivity+income.priceSensitivity)/2),qualitySensitivity:segment.qualitySensitivity,distanceSensitivity:segment.distanceSensitivity,queueTolerance:segment.queueTolerance,noveltySeeking:segment.noveltySeeking,loyalty:segment.loyalty,socialInfluence:segment.socialInfluence,reviewPropensity:segment.reviewPropensity,deliveryAffinity:segment.deliveryAffinity},
    memory:{historicalPrice:null,lastPaidPrice:null,visitedStores:{},favoriteStoreIds:[],dislikedStoreIds:[]}
  };
}

function generateVisit(profile,rng,ctx={}){
  const segment=R.byId(P.SEGMENTS,profile.segmentId)||P.SEGMENTS[0],income=R.byId(P.INCOME_BANDS,profile.incomeBandId)||P.INCOME_BANDS[3],household=R.byId(P.HOUSEHOLD_TYPES,profile.householdTypeId)||P.HOUSEHOLD_TYPES[0];
  const hour=Number(ctx.hour??12),period=ctx.period||R.mealPeriod(hour),budget=R.segmentMealBudget(segment,income,period,rng),partySize=R.expectedPartySize(household,rng,ctx);
  const deliveryBias=(segment.deliveryAffinity||0)+(ctx.rain?12:0)+(ctx.distanceKm>3?8:0)-(ctx.socialMeal?25:0);
  let channel=ctx.channel|| (deliveryBias>=78?'delivery':deliveryBias>=58&&R.rngNext(rng)<.55?'delivery':R.rngNext(rng)<.12?'pickup':'dine_in');
  return {id:id(rng,'visit'),segmentProfileId:profile.id,segmentId:segment.id,period,hour,budget,partySize,channel,hunger:R.rngInt(rng,45,95),rushed:ctx.rushed??R.rngNext(rng)<.22,mood:R.rngInt(rng,40,85),createdDay:ctx.day??null};
}

function storeUtility(profile,visit,store,ctx={}){
  const seg=R.byId(P.SEGMENTS,profile.segmentId)||P.SEGMENTS[0];
  const price=Math.max(.1,Number(store.expectedSpend??store.price??20)),ref=R.referencePrice(profile.memory,ctx.marketPrice??store.marketPrice??price),priceScore=R.pricePerception(price,ref,seg),budgetScore=R.budgetFit(price,visit.budget,profile.traits.priceSensitivity)*100;
  const quality=R.clamp(Number(store.qualityScore??store.foodQuality??60)),rating=R.clamp((Number(store.rating??4)-1)/4*100),service=R.clamp(Number(store.serviceScore??60)),hygiene=R.clamp(Number(store.hygieneScore??65)),environment=R.clamp(Number(store.environmentScore??60));
  const distance=Number(store.distanceMinutes??8),distanceScore=R.clamp(100-distance/R.travelToleranceMinutes(seg,{isFavorite:profile.memory.favoriteStoreIds.includes(store.id)})*55),queue=Number(store.waitMinutes??0),queueScore=R.clamp(100-queue/R.queueToleranceMinutes(seg,{rushed:visit.rushed,isFavorite:profile.memory.favoriteStoreIds.includes(store.id)})*60);
  const familiarity=profile.memory.favoriteStoreIds.includes(store.id)?92:profile.memory.visitedStores[store.id]?72:48,novelty=profile.memory.visitedStores[store.id]?35:seg.noveltySeeking,social=R.clamp(Number(store.socialBuzz??50)*profile.traits.socialInfluence/70),availability=store.closed||store.soldOut?0:R.clamp(Number(store.availabilityScore??100));
  const qW=R.qualityWeight(seg),vW=R.valueWeight(seg),cW=R.convenienceWeight(seg);
  let utility=(quality*.30+rating*.16+service*.10+hygiene*.12+environment*.08)*(qW/100)+(priceScore*.45+budgetScore*.55)*(vW/100)+(distanceScore*.55+queueScore*.45)*(cW/100);
  utility+=familiarity*(seg.loyalty/100)*.18+novelty*(seg.noveltySeeking/100)*.12+social*.12;utility*=availability/100;
  if(profile.memory.dislikedStoreIds.includes(store.id))utility*=.45;if(store.categoryFit!=null)utility*=.72+.28*R.clamp(store.categoryFit)/100;
  return {storeId:store.id,utility:R.round(utility,2),priceScore:R.round(priceScore,1),budgetScore:R.round(budgetScore,1),qualityScore:R.round(quality,1),distanceScore:R.round(distanceScore,1),queueScore:R.round(queueScore,1),referencePrice:ref};
}

function chooseStore(profile,visit,stores,rng,ctx={}){
  const scored=(stores||[]).map(s=>({...storeUtility(profile,visit,s,ctx),store:s})).filter(x=>x.utility>0);
  if(!scored.length)return {chosen:null,scored:[]};
  const max=Math.max(...scored.map(x=>x.utility));const weighted=scored.map(x=>({...x,choiceWeight:Math.exp((x.utility-max)/12)}));
  const chosen=pick(rng,weighted,x=>x.choiceWeight);return {chosen:chosen.store,decision:chosen,scored:scored.sort((a,b)=>b.utility-a.utility)};
}

function queueDecision(profile,visit,store){const seg=R.byId(P.SEGMENTS,profile.segmentId)||P.SEGMENTS[0],limit=R.queueToleranceMinutes(seg,{rushed:visit.rushed,isFavorite:profile.memory.favoriteStoreIds.includes(store.id)}),wait=Number(store.waitMinutes||0);return {waitMinutes:wait,toleranceMinutes:limit,stayProbability:R.round(R.clamp(1-Math.max(0,wait-limit*.65)/(limit*.85),.02,1),3)};}

function chooseDish(profile,visit,dishes,rng,ctx={}){
  const available=(dishes||[]).filter(d=>d.available!==false && Number(d.price||0)>0);if(!available.length)return null;
  const scored=available.map(d=>{const price=Number(d.price),budgetFit=R.budgetFit(price,visit.budget,profile.traits.priceSensitivity),taste=R.clamp(Number(d.tasteFit??60)),quality=R.clamp(Number(d.qualityScore??60)),popular=R.clamp(Number(d.popularity??50)),novel=d.triedBefore?25:profile.traits.noveltySeeking;let score=budgetFit*48+taste*.24+quality*.16+popular*.06+novel*.06;if(d.signature)score+=5;if(d.soldOut)score=0;return {dish:d,score};});
  return pick(rng,scored,x=>Math.max(.001,x.score));
}

function evaluateExperience(profile,visit,experience={}){
  const seg=R.byId(P.SEGMENTS,profile.segmentId)||P.SEGMENTS[0],price=Number(experience.paidPerPerson??experience.price??visit.budget),ref=R.referencePrice(profile.memory,experience.marketPrice??price),value=R.pricePerception(price,ref,seg);
  const taste=R.clamp(Number(experience.taste??60)),portion=R.clamp(Number(experience.portion??60)),speed=R.clamp(Number(experience.speed??60)),service=R.clamp(Number(experience.service??60)),hygiene=R.clamp(Number(experience.hygiene??70)),environment=R.clamp(Number(experience.environment??60)),stability=R.clamp(Number(experience.stability??65));
  const weights={taste:.26,value:.18,portion:.10,speed:.11,service:.10,hygiene:.11,environment:.07,stability:.07};
  if(seg.id.includes('student')||seg.id==='worker_meal'||seg.id==='discount_hunter'){weights.value+=.06;weights.environment-=.03;weights.service-=.03;}
  if(seg.id.includes('business')||seg.id.includes('premium')){weights.environment+=.05;weights.service+=.04;weights.value-=.05;weights.portion-=.04;}
  if(seg.id.includes('family')){weights.hygiene+=.04;weights.stability+=.03;weights.speed-=.02;weights.value-=.05;}
  const score=taste*weights.taste+value*weights.value+portion*weights.portion+speed*weights.speed+service*weights.service+hygiene*weights.hygiene+environment*weights.environment+stability*weights.stability;
  return {overall:R.round(R.clamp(score),1),dimensions:{taste:R.round(taste,1),value:R.round(value,1),portion:R.round(portion,1),speed:R.round(speed,1),service:R.round(service,1),hygiene:R.round(hygiene,1),environment:R.round(environment,1),stability:R.round(stability,1)},referencePrice:ref};
}

function postVisit(profile,visit,store,experience={},rng){const e=evaluateExperience(profile,visit,experience),seg=R.byId(P.SEGMENTS,profile.segmentId)||P.SEGMENTS[0],mem=profile.memory;mem.lastPaidPrice=Number(experience.paidPerPerson??experience.price??visit.budget);mem.historicalPrice=mem.historicalPrice==null?mem.lastPaidPrice:R.round(mem.historicalPrice*.8+mem.lastPaidPrice*.2,2);const prev=mem.visitedStores[store.id]||{visits:0,avgSatisfaction:0};prev.visits++;prev.avgSatisfaction=R.round(((prev.avgSatisfaction*(prev.visits-1))+e.overall)/prev.visits,1);prev.lastVisitDay=visit.createdDay;mem.visitedStores[store.id]=prev;
  const repeatBase=e.overall*.62+(seg.loyalty||50)*.24+(100-(seg.noveltySeeking||50))*.14;const repeatProbability=R.clamp((repeatBase-35)/65,0,1);
  if(e.overall>=82&&prev.visits>=2&&!mem.favoriteStoreIds.includes(store.id))mem.favoriteStoreIds.push(store.id);if(e.overall<=35&&!mem.dislikedStoreIds.includes(store.id))mem.dislikedStoreIds.push(store.id);
  const reviewProbability=R.clamp((seg.reviewPropensity||40)/100*(e.overall<45?1.45:e.overall>82?1.2:.7),0,.95),willReview=R.rngNext(rng)<reviewProbability;
  const stars=R.clamp(Math.round(1+(e.overall/100)*4+(R.rngNext(rng)-.5)*.8),1,5);const wom=R.round((e.overall-50)/50*(seg.socialInfluence||50)/100,3);
  return {experience:e,repeatProbability:R.round(repeatProbability,3),willReview,reviewStars:willReview?stars:null,wordOfMouth:wom,favorite:mem.favoriteStoreIds.includes(store.id),disliked:mem.dislikedStoreIds.includes(store.id)};}

function buildDistrictPopulation(rng,opts={}){const count=Math.max(100,Math.min(50000,Number(opts.count||2500))),districtId=opts.districtId||'university',profiles=[];for(let i=0;i<count;i++)profiles.push(createSegmentProfile(rng,{districtId}));const summary={};for(const p of profiles)summary[p.segmentId]=(summary[p.segmentId]||0)+1;return {districtId,count,profiles,summary};}
function aggregateDemand(population,ctx={}){const out={totalPotentialVisits:0,deliveryShare:0,avgBudget:0,segments:{}};let bud=0,del=0;for(const p of population.profiles||[]){const s=R.byId(P.SEGMENTS,p.segmentId)||P.SEGMENTS[0],income=R.byId(P.INCOME_BANDS,p.incomeBandId)||P.INCOME_BANDS[3],period=ctx.period||'lunch';const b=R.budgetRange(s,income,period);const avg=(b[0]+b[1])/2;const frequency=.12+(s.loyalty||50)/100*.06+(ctx.weekend&&s.id.includes('family')?.05:0);out.totalPotentialVisits+=frequency;bud+=avg;del+=s.deliveryAffinity||0;out.segments[p.segmentId]=(out.segments[p.segmentId]||0)+frequency;}const n=Math.max(1,(population.profiles||[]).length);out.avgBudget=R.round(bud/n,1);out.deliveryShare=R.round(del/n/100,3);out.totalPotentialVisits=R.round(out.totalPotentialVisits,1);return out;}

module.exports={createSegmentProfile,generateVisit,storeUtility,chooseStore,queueDecision,chooseDish,evaluateExperience,postVisit,buildDistrictPopulation,aggregateDemand};
