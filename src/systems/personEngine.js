'use strict';

const P = require('../person/personPackV10.js');
const rules = require('../person/personRulesV10.js');
function clamp(v,min=0,max=100){return Math.max(min,Math.min(max,v));}
function byId(list,id){return (list||[]).find(x=>x.id===id)||null;}
function remember(person,memory={}){
  person.memory ||= [];
  const type=byId(P.MEMORY_TYPES,memory.typeId||'social')||P.MEMORY_TYPES[0];
  person.memory.unshift({id:memory.id||`mem_${Date.now()}_${person.memory.length}`,typeId:type.id,text:String(memory.text||'').slice(0,180),weight:clamp(Number(memory.weight??50),0,100),sentiment:clamp(Number(memory.sentiment||0),-100,100),day:memory.day??null});
  person.memory=person.memory.slice(0,40); return person.memory[0];
}
function relationship(person,otherId,typeId='acquaintance'){
  person.relationships ||= {};
  person.relationshipIds ||= [];
  if(!person.relationships[otherId]) person.relationships[otherId]={typeId,trust:50,respect:50,closeness:25,rivalry:0,lastDay:null};
  if(!person.relationshipIds.includes(otherId)) person.relationshipIds.push(otherId);
  return person.relationships[otherId];
}
function interact(person,otherId,effect={}){
  const r=relationship(person,otherId,effect.typeId||'acquaintance');
  for(const k of ['trust','respect','closeness','rivalry']) r[k]=clamp((r[k]||0)+Number(effect[k]||0));
  if(effect.day!=null) r.lastDay=effect.day;
  if(effect.text) remember(person,{typeId:effect.memoryTypeId||'social',text:effect.text,weight:effect.memoryWeight||40,sentiment:effect.sentiment||0,day:effect.day});
  return r;
}
function dailyTick(person,ctx={}){
  person.state ||= {mood:70,energy:78,stress:18,health:82,satisfaction:65,loyalty:55};
  const s=person.state, p=person.personality||{};
  const workload=clamp(Number(ctx.workload??50)), overtime=clamp(Number(ctx.overtime??0)), manager=clamp(Number(ctx.managerQuality??55)), payFairness=clamp(Number(ctx.payFairness??55)), team=clamp(Number(ctx.teamClimate??55));
  const recovery=4+(p.stability||50)/35+(p.patience||50)/50;
  s.energy=clamp(s.energy + (ctx.dayOff?14:4) - workload*.055 - overtime*.09);
  s.stress=clamp(s.stress + workload*.035 + overtime*.08 - recovery - (team-50)*.025);
  s.satisfaction=clamp(s.satisfaction + (payFairness-50)*.03 + (manager-50)*.025 + (team-50)*.02 - Math.max(0,s.stress-65)*.03);
  s.loyalty=clamp(s.loyalty + (s.satisfaction-50)*.012 + (manager-50)*.01 - Number(ctx.outsideOffer||0)*.02);
  s.mood=clamp(50 + (s.satisfaction-50)*.32 + (s.energy-50)*.22 - (s.stress-50)*.26);
  s.health=clamp(s.health + (ctx.dayOff?1.2:.15) - Math.max(0,overtime-30)*.018 - Math.max(0,s.stress-70)*.025);
  return {...s};
}
function turnoverRisk(person,ctx={}){
  const s=person.state||{}, p=person.personality||{};
  let score=8 + (50-(s.satisfaction??50))*.55 + (50-(s.loyalty??50))*.28 + Math.max(0,(s.stress??20)-55)*.32;
  score += Number(ctx.payGapPct||0)*.28 + Number(ctx.outsideOfferStrength||0)*.16 + (p.ambition??50)*.05;
  score -= (p.patience??50)*.06 + (p.stability??50)*.04;
  return clamp(score,1,92);
}
function entrepreneurshipScore(person,ctx={}){
  const s=person.state||{}, p=person.personality||{}, k=person.skills||{};
  let score=(p.ambition??50)*.20+(p.risk??50)*.16+(k.management||0)*.14+(k.sales||0)*.10+(k.finance||0)*.08+(k.operations||0)*.08+(k.negotiation||0)*.07;
  score += Math.min(18,Math.log10(Math.max(1,person.wealth||1))*3.2);
  score += Math.max(0,45-(s.satisfaction??60))*.15 + Number(ctx.marketOpportunity||0)*.10;
  if((person.motivations||[]).some(id=>['motivation_6','motivation_16','motivation_21'].includes(id))) score+=9;
  return clamp(score,0,100);
}
function negotiationProfile(person,ctx={}){
  const p=person.personality||{}, skill=person.skills?.negotiation||20;
  const style=byId(P.NEGOTIATION_STYLES,person.negotiationStyleId);
  const leverage=clamp(Number(ctx.leverage??50));
  const patience=clamp(p.patience??50), dominance=clamp(p.dominance??50), empathy=clamp(p.empathy??50);
  const firmness=clamp(25+dominance*.35+skill*.25+leverage*.18-patience*.06);
  const compromise=clamp(68+empathy*.18+patience*.16-dominance*.22-leverage*.12);
  const bluff=clamp(12+(100-(p.integrity??50))*.22+(p.risk??50)*.12+skill*.08);
  return {styleId:style?.id||null,styleName:style?.name||'',firmness:Math.round(firmness),compromise:Math.round(compromise),bluff:Math.round(bluff)};
}
function changeRole(person,roleId,ctx={}){return rules.assignRole(person,roleId,ctx);}
function decayMemories(person,days=1){
  for(const m of person.memory||[]){const type=byId(P.MEMORY_TYPES,m.typeId);m.weight=clamp(m.weight*(1-(type?.decay||.04)*Math.max(0,days)),0,100);}
  person.memory=(person.memory||[]).filter(m=>m.weight>=3); return person.memory;
}
module.exports={remember,relationship,interact,dailyTick,turnoverRisk,entrepreneurshipScore,negotiationProfile,changeRole,decayMemories};
