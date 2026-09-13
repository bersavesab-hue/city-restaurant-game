'use strict';
const P=require('./competitorPackV10.js');
const R=require('./competitorRulesV10.js');
function clamp(v,min=0,max=100){return Math.max(min,Math.min(max,v));}
function round(v,d=1){const m=10**d;return Math.round(v*m)/m;}

function marketEntryScore(input={}){
  const demandGap=clamp(Number(input.demandGapRatio||0),-50,70)/100,profit=clamp(Number(input.profitMargin||input.profitability||0),-30,55)/100,growth=clamp(Number(input.demandGrowth||0),-30,40)/100,vacancy=clamp(Number(input.vacancyAvailability??50))/100,saturation=clamp(Number(input.saturation??50))/100,rent=clamp(Number(input.rentPressure??50))/100,visible=clamp(Number(input.successVisibility??0))/100,copyEase=1-clamp(Number(input.copyDifficulty??.5),0,1);
  return round(clamp(20+demandGap*60+profit*75+growth*35+vacancy*15+visible*copyEase*20-saturation*25-rent*12),1);
}
function imitationPressure(input={}){
  const days=Math.max(0,Number(input.sustainedProfitDays||0)),marketShare=clamp(Number(input.marketShare||0),0,1),queue=clamp(Number(input.queueSignal||0),0,1),buzz=clamp(Number(input.socialBuzz||0),0,1),copyEase=1-clamp(Number(input.copyDifficulty??.5),0,1),learning=clamp(Number(input.competitorLearning??.5),0,1),maturity=clamp((days-7)/35,0,1);
  return round(clamp(maturity*34+marketShare*22+queue*16+buzz*12+copyEase*learning*24),1);
}
function actionWeights(c,signal={}){
  const p=clamp(Number(signal.imitationPressure||0))/100,e=clamp(Number(signal.entryScore||0))/100,loss=clamp(Number(signal.lossPressure||0))/100,cap=R.expansionCapacity(c,signal),ag=(c.aggression||50)/100,quality=(c.qualityFocus||50)/100,market=(c.marketingAbility||50)/100,imit=(c.imitationAbility||50)/100;
  return {
    observe:round(Math.max(.08,.82-p*.55),3),menu_follow:round(p*imit*.74,3),bundle_follow:round(p*imit*.54,3),price_cut:round(p*(c.priceWarTolerance/100)*.58,3),coupon:round(p*market*.44,3),ads:round(p*market*.50,3),influencer:round(p*market*.36,3),
    quality_upgrade:round(p*quality*.46,3),new_product:round(p*quality*.46,3),open_nearby:round(e*p*(c.expansionDesire/100)*(cap.score/100)*.50,3),grab_site:round(e*ag*(cap.score/100)*.38,3),accelerate_expansion:round(e*ag*(c.expansionDesire/100)*(cap.score/100)*.42,3),
    poach_staff:round(p*ag*.24,3),membership_push:round(p*market*.28,3),private_traffic:round(p*market*.24,3),copy_site:round(p*imit*e*.28,3),copy_delivery:round(p*imit*.24,3),retreat:round(loss*(1-c.aggression/130)*.65,3),close_store:round(loss*R.closureRisk(c,signal)/100*.55,3),delay_expansion:round(loss*.42,3),renegotiate_rent:round(loss*.24,3),public_relations:round(Math.max(0,4-Number(signal.rating||4))*market*.18,3),full_rectification:round(loss*quality*.22,3)
  };
}
function chooseAction(c,signal,rng){const weights=actionWeights(c,signal);const candidates=P.RESPONSE_ACTIONS.map(a=>({action:a,weight:Math.max(.001,weights[a.id]??(a.id==='observe'?weights.observe:.008))}));return rng.weighted(candidates,x=>x.weight).action;}
function suggestedPriceResponse(c,ctx={}){
  const market=Math.max(.1,Number(ctx.marketPrice||20)),own=Math.max(.1,Number(ctx.currentPrice||market)),floor=R.priceFloor(c,ctx),pressure=clamp(Number(ctx.competitionPressure??50))/100,style=c.priceStyleId||'';let target=own;
  if(style.includes('price_2')||c.priceWarTolerance>=70)target=market*(1-.08*pressure);else if(c.qualityFocus>=78)target=market*(1.08+Math.max(0,c.brandPower-50)*.0025);else target=own*.55+market*.45;
  target=Math.max(floor,target);const change=clamp((target-own)/own,-.18,.15);return {currentPrice:round(own,2),marketPrice:round(market,2),floorPrice:floor,targetPrice:round(own*(1+change),2),changePct:round(change*100,1)};
}
function beginOpening(c,ctx={},rng){const cap=R.expansionCapacity(c,ctx);if(cap.score<38)return {ok:false,reason:'管理/资金/供应能力不足',capacity:cap};const entry=marketEntryScore(ctx);if(entry<42)return {ok:false,reason:'市场进入吸引力不足',entryScore:entry};const id=`opening_${Math.floor(rng.next()*1e9).toString(36)}`,first=P.OPENING_STAGES[0];c.openingPipeline||=[];c.openingPipeline.push({id,districtId:ctx.districtId||null,categoryId:ctx.categoryId||null,stageId:first.id,daysLeft:rng.int(first.days[0],first.days[1]),startedDay:ctx.day??null,publicVisibility:8});return {ok:true,id,entryScore:entry,capacity:cap};}
function advanceOpening(c,days,rng){const opened=[];for(const p of c.openingPipeline||[]){let remaining=Math.max(0,Number(days||0));while(remaining>0&&p.stageId!=='open'){const consume=Math.min(remaining,p.daysLeft);p.daysLeft-=consume;remaining-=consume;p.publicVisibility=clamp((p.publicVisibility||0)+consume*1.6);if(p.daysLeft<=0){const idx=P.OPENING_STAGES.findIndex(x=>x.id===p.stageId),next=P.OPENING_STAGES[Math.min(P.OPENING_STAGES.length-1,idx+1)];p.stageId=next.id;p.daysLeft=next.id==='open'?0:rng.int(next.days[0],next.days[1]);if(next.id==='open'){const sid=`store_${Math.floor(rng.next()*1e9).toString(36)}`;c.stores.push({id:sid,status:'operating',districtId:p.districtId,categoryId:p.categoryId,monthlyRevenue:0,monthlyProfit:0,lossMonths:0});opened.push(sid);c.managerReserve=Math.max(0,(c.managerReserve||0)-1);}}}}c.openingPipeline=(c.openingPipeline||[]).filter(p=>p.stageId!=='open');return opened;}
function monthlyTick(c,ctx={}){const revenue=Math.max(0,Number(ctx.revenue||0)),profit=Number(ctx.profit||0);c.cash=Math.max(0,c.cash+profit-Number(ctx.debtService||0));c.metrics||={};c.metrics.profitMargin=revenue>0?profit/revenue:0;c.metrics.marketShare=clamp(Number(ctx.marketShare||c.metrics.marketShare||0),0,1);c.metrics.customerRating=clamp(Number(ctx.rating||c.metrics.customerRating||4),1,5);const fixed=Math.max(1,Number(ctx.monthlyFixedCost||50000));c.metrics.cashRunwayMonths=round(c.cash/fixed,1);if(profit<0){c.consecutiveLossMonths=(c.consecutiveLossMonths||0)+1;c.consecutiveProfitMonths=0;}else{c.consecutiveProfitMonths=(c.consecutiveProfitMonths||0)+1;c.consecutiveLossMonths=0;}const closeRisk=R.closureRisk(c,{...ctx,profitMargin:c.metrics.profitMargin,cashRunwayMonths:c.metrics.cashRunwayMonths,rating:c.metrics.customerRating});if(c.cash<=0||closeRisk>=95)c.status='distressed';return {profitMargin:round(c.metrics.profitMargin*100,1),cashRunwayMonths:c.metrics.cashRunwayMonths,closureRisk:closeRisk,status:c.status};}
function marketReaction(c,market,playerSignal,rng){const entryScore=marketEntryScore({...market,copyDifficulty:playerSignal.copyDifficulty,successVisibility:playerSignal.successVisibility}),imitation=imitationPressure({...playerSignal,competitorLearning:(c.learningAbility||50)/100}),lossPressure=clamp((c.consecutiveLossMonths||0)*18+Math.max(0,-Number(c.metrics?.profitMargin||0))*120),signal={...market,...playerSignal,entryScore,imitationPressure:imitation,lossPressure},action=chooseAction(c,signal,rng);return {entryScore,imitationPressure:imitation,lossPressure:round(lossPressure,1),action,weights:actionWeights(c,signal)};}

// 分层模拟：核心每日、附近每周、背景每月。不会让300-800家都做同等复杂计算。
function shouldTick(c,day){const tier=c.simulationTier||'background';if(tier==='core')return true;if(tier==='local')return day%7===0;return day%30===0;}
function tickPopulation(population,day,contextProvider,rng){
  const result={processed:0,core:0,local:0,background:0,actions:[]};
  for(const c of population||[]){if(!shouldTick(c,day))continue;result.processed++;result[c.simulationTier||'background']++;const ctx=typeof contextProvider==='function'?contextProvider(c):{};
    if(c.simulationTier==='background'){const drift=(rng.next()-.5)*.025;c.metrics.marketShare=clamp(Number(c.metrics.marketShare||0)+drift,0,1);continue;}
    if(ctx.playerSignal){const r=marketReaction(c,ctx.market||{},ctx.playerSignal,rng);result.actions.push({competitorId:c.id,actionId:r.action.id,entryScore:r.entryScore,imitationPressure:r.imitationPressure});}
  }
  return result;
}

module.exports={marketEntryScore,imitationPressure,actionWeights,chooseAction,suggestedPriceResponse,beginOpening,advanceOpening,monthlyTick,marketReaction,shouldTick,tickPopulation};
