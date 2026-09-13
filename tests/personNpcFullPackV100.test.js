'use strict';
const assert=require('assert');
const createFoundation=require('../foundation/createFoundation.js');
const P=require('../person/personPackV10.js');
const rules=require('../person/personRulesV10.js');
const engine=require('../systems/personEngine.js');

(function counts(){
  const s=P.stats();
  assert.strictEqual(s.surnames,100); assert.strictEqual(s.givenNames,180); assert.strictEqual(s.traits,72);
  assert.strictEqual(s.educations,10); assert.strictEqual(s.origins,12); assert.strictEqual(s.families,16); assert.strictEqual(s.backgrounds,36);
  assert.strictEqual(s.values,24); assert.strictEqual(s.motivations,24); assert.strictEqual(s.habits,32); assert.strictEqual(s.flaws,28);
  assert.strictEqual(s.workStyles,18); assert.strictEqual(s.socialStyles,18); assert.strictEqual(s.moneyAttitudes,16);
  assert.strictEqual(s.negotiationStyles,16); assert.strictEqual(s.stressResponses,18); assert.strictEqual(s.lifeGoals,24);
  assert.strictEqual(s.appearances,40); assert.strictEqual(s.npcRoles,48); assert.strictEqual(s.relationshipTypes,12); assert.strictEqual(s.memoryTypes,8);
})();
(function deterministic(){
  const a=createFoundation('person-final'); const b=createFoundation('person-final');
  assert.deepStrictEqual(a.entities.createPerson(),b.entities.createPerson(),'相同 seed 人物必须可重放');
})();
(function combinationDepth(){
  const f=createFoundation('combo'); const p=f.entities.createPerson({age:31,backgroundId:'kitchen_worker'});
  assert.strictEqual(p.traits.length,5); assert.strictEqual(new Set(p.traits.map(id=>P.PERSON_TRAITS.find(t=>t.id===id).axis)).size,5,'核心性格不得在同一轴自相矛盾');
  assert.strictEqual(p.values.length,3); assert.ok(p.habits.length>=2); assert.ok(p.flaws.length>=1); assert.ok(Object.keys(p.personality).length===12);
  assert.ok(Object.keys(p.skills).length>=17); assert.ok(p.appearance.face && p.appearance.hair && p.appearance.dress);
})();
(function legacyCompatibility(){
  const f=createFoundation('legacy-person'); const p=f.entities.createPerson({age:32,backgroundId:'kitchen_worker',traits:['steady','careful'],name:'测试厨师'});
  assert.strictEqual(p.currentRole,null); const r=f.entities.assignNpcRole(p,'chef'); assert.strictEqual(r.ok,true); assert.strictEqual(p.currentRole,'chef');
})();
(function roleChangeKeepsHistory(){
  const f=createFoundation('career'); const p=f.entities.createPerson({age:36,backgroundId:'store_manager_bg'});
  assert.ok(f.entities.assignNpcRole(p,'manager',{allowLowFit:true,employerId:'store_a'}).ok);
  assert.ok(f.entities.assignNpcRole(p,'competitor_owner',{allowLowFit:true,employerId:'self'}).ok);
  assert.strictEqual(p.roleHistory.length,1); assert.strictEqual(p.roleHistory[0].roleId,'manager');
})();
(function dynamicStateAndExit(){
  const f=createFoundation('state'); const p=f.entities.createPerson({age:29,backgroundId:'service_worker'});
  const before={...p.state}; for(let i=0;i<12;i++) engine.dailyTick(p,{workload:92,overtime:75,managerQuality:25,payFairness:30,teamClimate:35,outsideOffer:25});
  assert.ok(p.state.stress>before.stress); assert.ok(engine.turnoverRisk(p,{payGapPct:25,outsideOfferStrength:70})>25);
})();
(function entrepreneurshipIsConditional(){
  const f=createFoundation('entrepreneur'); const p=f.entities.createPerson({age:34,backgroundId:'small_business'});
  p.personality.ambition=90;p.personality.risk=78;p.skills.management=80;p.skills.sales=80;p.skills.finance=68;p.wealth=260000;p.state.satisfaction=35;
  assert.ok(engine.entrepreneurshipScore(p,{marketOpportunity:85})>55,'有资本/能力/动机的人才应可能创业，而不是所有员工都随机创业');
})();
(function relationshipsAndMemory(){
  const f=createFoundation('relationship'); const p=f.entities.createPerson();
  engine.interact(p,'other_1',{typeId:'colleague',trust:12,respect:8,text:'一起扛过一次晚高峰',memoryTypeId:'work',sentiment:20});
  assert.ok(p.relationships.other_1.trust>50); assert.ok(p.memory.length===1);
})();
(function negotiation(){
  const f=createFoundation('neg'); const p=f.entities.createPerson({backgroundId:'real_estate_agent'});
  const n=engine.negotiationProfile(p,{leverage:70}); assert.ok(n.firmness>=0&&n.firmness<=100&&n.compromise>=0&&n.compromise<=100);
})();
console.log('personNpcFullPackV100.test.js PASS');
