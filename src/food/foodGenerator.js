'use strict';

const qualitySystem=require('./foodQuality.js');

function clamp(value,min,max){return Math.max(min,Math.min(max,Number(value)||0));}
function round(value,digits=1){const p=Math.pow(10,digits);return Math.round((Number(value)||0)*p)/p;}
function clone(value){return JSON.parse(JSON.stringify(value));}

function hashSeed(value){
  const text=String(value||'dish');
  let h=2166136261;
  for(let i=0;i<text.length;i++){
    h^=text.charCodeAt(i);
    h=Math.imul(h,16777619);
  }
  return h>>>0;
}

function seededRandom(seed){
  let state=hashSeed(seed)||0x9E3779B9;
  return function(){
    state^=state<<13;
    state^=state>>>17;
    state^=state<<5;
    state>>>=0;
    return state/4294967296;
  };
}

const METHOD_FAMILIES={
  stir_fry:['stir_fry','quick_fry','pan_fry'],
  quick_fry:['quick_fry','stir_fry','pan_fry'],
  pan_fry:['pan_fry','stir_fry','grill'],
  deep_fry:['deep_fry','pan_fry','bake'],
  grill:['grill','roast','pan_fry'],
  roast:['roast','grill','bake'],
  braise:['braise','simmer','stew'],
  stew:['stew','simmer','claypot'],
  simmer:['simmer','braise','stew'],
  claypot:['claypot','stew','simmer'],
  steam:['steam','poach','boil'],
  boil:['boil','blanch','steam'],
  cold_mix:['cold_mix','assemble'],
  bake:['bake','toast'],
  shake:['shake','blend'],
  coffee:['coffee','brew_tea'],
  hotpot:['hotpot','stew']
};

function findMethod(pack,id){
  return (pack.COOKING_METHODS||[]).find(x=>x.id===id)||{id:id||'assemble',name:'制作',timeMinutes:10,skillFactor:1,yieldFactor:0.95};
}

function ingredientAlternatives(pack,line){
  const original=(pack.INGREDIENTS||[]).find(x=>x.id===line.ingredientId);
  if(!original)return [];
  return (pack.INGREDIENTS||[]).filter(x=>x.id!==original.id&&x.category===original.category);
}

function choose(array,random){
  if(!array||!array.length)return null;
  return array[Math.min(array.length-1,Math.floor(random()*array.length))];
}

function candidateName(baseRecipe,flavor,method,substitution){
  const base=String(baseRecipe.name||'创新菜');
  const flavorName=flavor&&flavor.name?flavor.name:'';
  const methodName=method&&method.name?method.name:'';
  let prefix=flavorName;
  if(base.includes(flavorName))prefix=methodName;
  if(!prefix||base.startsWith(prefix))prefix='新派';
  const suffix=substitution&&substitution.toName?`·${substitution.toName}`:'';
  return `${prefix}${base}${suffix}`;
}

function generateCandidate(baseRecipe,options={}){
  if(!baseRecipe)throw new Error('缺少基础菜谱');
  const pack=options.pack;
  if(!pack)throw new Error('缺少 food pack');
  const random=options.random||seededRandom(options.seed||baseRecipe.id);
  const chefSkill=clamp(options.chefSkill==null?45:options.chefSkill,0,100);
  const baseMethodId=baseRecipe.methodId||baseRecipe.method||'assemble';
  const family=METHOD_FAMILIES[baseMethodId]||[baseMethodId];
  const methodId=choose(family,random)||baseMethodId;
  const method=findMethod(pack,methodId);
  const baseMethod=findMethod(pack,baseMethodId);
  const flavors=pack.FLAVOR_PROFILES||[];
  const flavor=choose(flavors,random)||{id:'flavor_custom',name:baseRecipe.flavor||'创新'};

  const required=(baseRecipe.ingredients||[]).filter(x=>!x.optional);
  let substitution=null;
  if(required.length&&random()<0.82){
    const source=choose(required,random);
    const alternatives=ingredientAlternatives(pack,source);
    const target=choose(alternatives,random);
    if(source&&target){
      const original=(pack.INGREDIENTS||[]).find(x=>x.id===source.ingredientId);
      substitution={
        fromId:source.ingredientId,
        fromName:source.name||(original&&original.name)||source.ingredientId,
        toId:target.id,
        toName:target.name,
        grams:source.grams,
        costRatio:round((Number(target.costIndex)||1)/Math.max(0.2,Number(original&&original.costIndex)||1),3)
      };
    }
  }

  const ingredients=(baseRecipe.ingredients||[]).map(line=>{
    if(substitution&&line.ingredientId===substitution.fromId){
      return {...clone(line),ingredientId:substitution.toId,name:substitution.toName};
    }
    return clone(line);
  });

  const methodChanged=methodId!==baseMethodId;
  const innovation=clamp(
    38+(substitution?17:6)+(methodChanged?13:4)+chefSkill*0.16+random()*17,
    35,98
  );
  const baseDifficulty=Number(baseRecipe.skill)||35;
  const difficulty=clamp(
    baseDifficulty*(Number(method.skillFactor)||1)+(substitution?5:0)+(methodChanged?4:0),
    12,100
  );
  const skillGap=Math.max(0,difficulty-chefSkill);
  const acceptance=clamp(
    79-Math.abs(innovation-70)*0.23-skillGap*0.18+random()*8,
    42,96
  );
  const speedFactor=clamp(
    (Number(method.timeMinutes)||10)/Math.max(4,Number(baseMethod.timeMinutes)||Number(baseRecipe.cookMinutes)||10),
    0.72,1.42
  );
  const costFactor=clamp(
    (substitution?0.68+substitution.costRatio*0.32:1)*(0.98+(1-(Number(method.yieldFactor)||0.95))*0.25),
    0.72,1.55
  );
  const potentialMid=clamp(
    55+chefSkill*0.23+innovation*0.18+acceptance*0.08-skillGap*0.08,
    58,98
  );
  const low=clamp(Math.floor(potentialMid-5),50,97);
  const high=clamp(Math.ceil(potentialMid+6),low+1,100);
  const researchCost=Math.round((520+difficulty*17+innovation*9+Math.max(0,costFactor-1)*900-chefSkill*3)/10)*10;
  const researchDays=clamp(Math.round(1+difficulty/42+innovation/95-chefSkill/90),1,4);

  return {
    id:String(options.id||`concept_${baseRecipe.id}_${hashSeed(options.seed||baseRecipe.id).toString(36)}`),
    seed:String(options.seed||baseRecipe.id),
    baseRecipeId:baseRecipe.id,
    baseName:baseRecipe.name,
    name:candidateName(baseRecipe,flavor,method,substitution),
    category:baseRecipe.category,
    methodId,
    methodName:method.name,
    flavorId:flavor.id,
    flavorName:flavor.name,
    substitution,
    innovation:round(innovation,1),
    difficulty:round(difficulty,1),
    acceptance:round(acceptance,1),
    speedFactor:round(speedFactor,3),
    costFactor:round(costFactor,3),
    potential:{low,high},
    researchCost:Math.max(300,researchCost),
    researchDays,
    variant:{
      ingredients,
      method:methodId,
      flavor:flavor.name,
      prepMinutes:Number(baseRecipe.prepMinutes)||0,
      cookMinutes:Math.max(1,Math.round((Number(baseRecipe.cookMinutes)||Number(method.timeMinutes)||8)*speedFactor)),
      skill:round(difficulty,1)
    }
  };
}

function completeCandidate(candidate,options={}){
  if(!candidate)throw new Error('缺少研发方案');
  const random=options.random||seededRandom(`${candidate.seed}:complete`);
  const chefSkill=clamp(options.chefSkill==null?50:options.chefSkill,0,100);
  const target=(Number(candidate.potential.low)+Number(candidate.potential.high))/2;
  const variance=(random()-.5)*8;
  const execution=(chefSkill-50)*0.06;
  const score=clamp(round(target+variance+execution,1),45,100);
  const quality=qualitySystem.getQuality(score);
  const appearance=clamp(round(score*0.72+candidate.innovation*0.18+random()*8,1),40,100);
  const consistency=clamp(round(58+chefSkill*0.30-Math.max(0,candidate.difficulty-chefSkill)*0.18+random()*9,1),35,99);
  const repeatRate=clamp(round((candidate.acceptance*0.52+score*0.36+consistency*0.12)/100,3),0.25,0.95);
  const popularity=clamp(round(35+candidate.innovation*0.28+score*0.28+random()*8,1),30,100);
  const suggestedBase=18*(Number(candidate.costFactor)||1)*(1+(score-60)/95)*Number(quality.pricePremium||1);
  const recommendedPrice=Math.max(6,Math.round(suggestedBase));
  return {
    id:String(options.id||`custom_${hashSeed(candidate.id+':'+Date.now()).toString(36)}`),
    sourceCandidateId:candidate.id,
    baseRecipeId:candidate.baseRecipeId,
    baseName:candidate.baseName,
    name:candidate.name,
    category:candidate.category,
    methodId:candidate.methodId,
    methodName:candidate.methodName,
    flavorId:candidate.flavorId,
    flavorName:candidate.flavorName,
    substitution:clone(candidate.substitution),
    variant:clone(candidate.variant),
    score,
    qualityId:quality.id,
    qualityName:quality.name,
    innovation:round(candidate.innovation,1),
    difficulty:round(candidate.difficulty,1),
    acceptance:round(candidate.acceptance,1),
    appearance,
    consistency,
    repeatRate,
    popularity,
    costFactor:round(candidate.costFactor,3),
    speedFactor:round(candidate.speedFactor,3),
    recommendedPrice,
    version:1,
    improvements:0,
    createdMinute:Number(options.createdMinute)||0,
    history:[]
  };
}

// 旧接口继续保留，旧调用不会失效。
function generateFood(input){
  const data=input||{};
  const random=seededRandom(data.seed||JSON.stringify(data));
  const score=clamp(Number(data.score)||60+Math.floor(random()*31),0,100);
  const quality=qualitySystem.getQuality(score);
  return {
    name:data.name||'创新菜品',
    ingredients:data.ingredients||[],
    cooking:data.cooking||'未知工艺',
    taste:data.taste||{},
    score,
    qualityId:quality.id,
    qualityName:quality.name
  };
}

module.exports={
  METHOD_FAMILIES,
  hashSeed,
  seededRandom,
  generateCandidate,
  completeCandidate,
  generateFood
};
