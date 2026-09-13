'use strict';

const P = require('./personPackV10.js');

function clamp(v,min,max){ return Math.max(min,Math.min(max,v)); }
function round(v,d=0){ const m=10**d; return Math.round(v*m)/m; }
function byId(list,id){ return (list||[]).find(x=>x.id===id)||null; }
function pickWeighted(rng, list, filter){
  const rows=(list||[]).filter(x=>!filter||filter(x));
  return rng.weighted(rows,x=>Math.max(0,Number(x.weight||1)));
}
function pickManyDistinct(rng,list,count,keyFn=(x)=>x.id){
  const pool=[...list], out=[], used=new Set();
  while(pool.length && out.length<count){
    const item=rng.pick(pool); pool.splice(pool.indexOf(item),1);
    const key=keyFn(item); if(used.has(key)) continue; used.add(key); out.push(item);
  }
  return out;
}
function normalizeLegacyTraitId(id){ return P.LEGACY_TRAIT_ALIASES[id]||id; }
function makeName(rng,gender){
  const s=rng.pick(P.SURNAMES) || {name:'陈'};
  let pool=P.GIVEN_NAMES.filter(x=>x.gender===gender||x.gender==='unisex');
  if(!pool.length) pool=P.GIVEN_NAMES;
  const g=rng.pick(pool)||{name:'安'};
  return s.name+g.name;
}
function ageBand(age){ return age<25?'young':age<35?'early':age<50?'mid':age<65?'senior':'elder'; }
function baseAxes(rng){
  const out={};
  for(const a of P.PERSONALITY_AXES) out[a.id]=clamp(50+rng.int(-12,12),0,100);
  return out;
}
function applyAxisMods(axes,mods){
  for(const [k,v] of Object.entries(mods||{})) if(k in axes) axes[k]=clamp(axes[k]+Number(v||0),0,100);
}
function skillSet(background,education,rng,age){
  const skills={...P.DEFAULT_SKILLS,...(background?.skills||{})};
  const ageExp=Math.max(0,Math.min(14,Math.floor((age-18)/4)));
  for(const k of Object.keys(skills)){
    const edu=(education?.skillBonus||0) * (['finance','management','marketing','digital','foodSafety'].includes(k)?0.75:0.25);
    skills[k]=clamp(Math.round(skills[k]+rng.int(-7,10)+ageExp*0.45+edu),0,100);
  }
  return skills;
}
function chooseCoreTraits(rng, requested=[]){
  const chosen=[]; const usedAxis=new Set();
  for(const rawId of requested||[]){
    const id=normalizeLegacyTraitId(rawId), t=byId(P.PERSON_TRAITS,id);
    if(t && !usedAxis.has(t.axis)){chosen.push(t);usedAxis.add(t.axis);}
  }
  while(chosen.length<5){
    const pool=P.PERSON_TRAITS.filter(t=>!usedAxis.has(t.axis));
    if(!pool.length) break;
    const t=pickWeighted(rng,pool); chosen.push(t); usedAxis.add(t.axis);
  }
  return chosen;
}
function appearance(rng){
  const out={};
  for(const group of ['face','build','hair','dress','accessory']){
    const row=rng.pick(P.APPEARANCE_FEATURES.filter(x=>x.group===group));
    out[group]=row?row.id:null;
  }
  return out;
}
function createPersonProfile(rng, options={}){
  const age=clamp(Math.floor(Number(options.age)||rng.int(18,68)),18,78);
  const gender=options.genderId||pickWeighted(rng,P.GENDERS)?.id||'male';
  const education=options.educationId?byId(P.EDUCATIONS,options.educationId):pickWeighted(rng,P.EDUCATIONS);
  const origin=options.originId?byId(P.ORIGIN_TYPES,options.originId):pickWeighted(rng,P.ORIGIN_TYPES);
  const family=options.familyBackgroundId?byId(P.FAMILY_BACKGROUNDS,options.familyBackgroundId):pickWeighted(rng,P.FAMILY_BACKGROUNDS);
  const background=options.backgroundId?byId(P.CAREER_BACKGROUNDS,options.backgroundId):pickWeighted(rng,P.CAREER_BACKGROUNDS, row=>!(row.tags||[]).includes('senior')||age>=48);
  if(!background) throw new Error('无法生成人物职业背景');
  const axes=baseAxes(rng); applyAxisMods(axes,background.axisMods);
  const traits=chooseCoreTraits(rng,options.traits||[]); traits.forEach(t=>{axes[t.axis]=clamp(axes[t.axis]+t.delta,0,100);});
  if(family?.resilience) axes.stability=clamp(axes.stability+family.resilience*.4,0,100);
  const values=pickManyDistinct(rng,P.VALUES,3);
  const motivations=pickManyDistinct(rng,P.MOTIVATIONS,2);
  const habits=pickManyDistinct(rng,P.HABITS,rng.int(2,4));
  const flaws=pickManyDistinct(rng,P.FLAWS,rng.int(1,2));
  const goals=pickManyDistinct(rng,P.LIFE_GOALS,rng.int(1,2));
  const workStyle=rng.pick(P.WORK_STYLES), socialStyle=rng.pick(P.SOCIAL_STYLES), moneyAttitude=rng.pick(P.MONEY_ATTITUDES);
  const negotiationStyle=rng.pick(P.NEGOTIATION_STYLES), stressResponse=rng.pick(P.STRESS_RESPONSES);
  const skills=skillSet(background,education,rng,age);
  const familyWealthFactor=clamp(1+(family?.wealthMod||0)/100,.45,2.4);
  const wealth=Math.max(0,Math.round((background.wealthBase||20000)*familyWealthFactor*rng.float(.55,1.65)));
  const personalityLabels=traits.map(x=>x.name);
  return {
    name:options.name||makeName(rng,gender), age, ageBand:ageBand(age), gender,
    educationId:education?.id||null, originId:origin?.id||null, familyBackgroundId:family?.id||null,
    backgroundId:background.id, traits:traits.map(x=>x.id), personalityLabels, personality:axes,
    values:values.map(x=>x.id), motivations:motivations.map(x=>x.id), habits:habits.map(x=>x.id), flaws:flaws.map(x=>x.id),
    workStyleId:workStyle?.id||null, socialStyleId:socialStyle?.id||null, moneyAttitudeId:moneyAttitude?.id||null,
    negotiationStyleId:negotiationStyle?.id||null, stressResponseId:stressResponse?.id||null, lifeGoals:goals.map(x=>x.id),
    appearance:appearance(rng), skills, wealth,
    riskTolerance:round(axes.risk,1), patience:round(axes.patience,1), ambition:round(axes.ambition,1), integrity:round(axes.integrity,1),
    currentRole:null, employerId:null, roleHistory:[], relationshipIds:[], relationships:{}, memory:[],
    state:{mood:clamp(70+rng.int(-8,8),0,100),energy:clamp(78+rng.int(-6,8),0,100),stress:clamp(18+rng.int(-6,9),0,100),health:clamp(82+rng.int(-8,8),0,100),satisfaction:clamp(65+rng.int(-8,8),0,100),loyalty:clamp(55+rng.int(-10,10),0,100)},
    tags:[`gender_${gender}`,`age_${ageBand(age)}`,...(education?.tags||[]),...(origin?.tags||[]),...(family?.tags||[]),...(background.tags||[]),...traits.flatMap(x=>x.tags||[])]
  };
}
function roleFit(person,role){
  if(!role) return {ok:false,score:0,reason:'岗位不存在'};
  if(role.minAge && person.age<role.minAge) return {ok:false,score:0,reason:`年龄不足 ${role.minAge}`};
  const entries=Object.entries(role.skillWeights||{}), weightSum=entries.reduce((s,[,w])=>s+Number(w||0),0);
  const raw=entries.reduce((s,[k,w])=>s+(person.skills?.[k]||0)*Number(w||0),0);
  const score=weightSum>0?raw:50;
  return {ok:score>=Number(role.minFit||0),score:round(score,1),reason:score>=Number(role.minFit||0)?'':'岗位适配度不足'};
}
function assignRole(person,roleId,context={}){
  const role=byId(P.NPC_ROLES,roleId); if(!role) return {ok:false,reason:`未知 NPC 角色: ${roleId}`,score:0};
  const fit=roleFit(person,role); if(!fit.ok && !context.allowLowFit) return fit;
  if(person.currentRole && person.currentRole!==roleId){person.roleHistory ||= [];person.roleHistory.push({roleId:person.currentRole,employerId:person.employerId||null,endedAt:context.date||null});}
  person.currentRole=roleId; person.employerId=context.employerId||null;
  return {ok:true,score:fit.score,person,role};
}
function describePerson(person){
  const get=(list,id)=>byId(list,id)?.name||id||'';
  return {
    name:person.name, age:person.age, gender:person.gender==='female'?'女':'男',
    background:get(P.CAREER_BACKGROUNDS,person.backgroundId), education:get(P.EDUCATIONS,person.educationId),
    traits:(person.traits||[]).map(id=>get(P.PERSON_TRAITS,id)), values:(person.values||[]).map(id=>get(P.VALUES,id)),
    motivations:(person.motivations||[]).map(id=>get(P.MOTIVATIONS,id)), workStyle:get(P.WORK_STYLES,person.workStyleId),
    socialStyle:get(P.SOCIAL_STYLES,person.socialStyleId), moneyAttitude:get(P.MONEY_ATTITUDES,person.moneyAttitudeId),
    negotiationStyle:get(P.NEGOTIATION_STYLES,person.negotiationStyleId), stressResponse:get(P.STRESS_RESPONSES,person.stressResponseId),
    flaws:(person.flaws||[]).map(id=>get(P.FLAWS,id)), habits:(person.habits||[]).map(id=>get(P.HABITS,id)),
    goals:(person.lifeGoals||[]).map(id=>get(P.LIFE_GOALS,id)), role:get(P.NPC_ROLES,person.currentRole)
  };
}
module.exports={clamp,round,byId,makeName,createPersonProfile,roleFit,assignRole,describePerson,normalizeLegacyTraitId};
