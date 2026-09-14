'use strict';

const SCENES = [
  ['recruit_interview','招聘面试','这份工作'],
  ['onboarding','入职沟通','入职安排'],
  ['leave_request','请假沟通','排班和请假'],
  ['raise_request','加薪沟通','工资和贡献'],
  ['complaint_staff','员工抱怨','当前工作压力'],
  ['resignation','离职沟通','去留问题'],
  ['promotion','晋升沟通','岗位发展'],
  ['training','培训沟通','技能提升'],
  ['supplier_quote','供应商报价','这次报价'],
  ['supplier_negotiation','供应商谈判','合作条件'],
  ['landlord_negotiation','房东谈判','租赁条件'],
  ['customer_complaint','顾客投诉','这次消费体验'],
  ['regular_chat','熟客聊天','最近门店变化'],
  ['competitor_chat','同行交流','商圈竞争'],
  ['media_interview','媒体采访','门店经营'],
  ['regulator_visit','监管沟通','合规情况'],
  ['friend_chat','朋友闲聊','最近生意'],
  ['staff_gossip','员工八卦','店里最近的事'],
  ['chef_kitchen','后厨沟通','出餐和备料'],
  ['waiter_floor','前厅沟通','客流和服务'],
  ['rider_pickup','骑手取餐','外卖出餐'],
  ['investor_chat','投资沟通','增长和回报'],
  ['crisis_talk','突发事件沟通','当前问题'],
  ['policy_talk','政策讨论','新政策影响']
].map(([id,name,topic])=>({id,name,topic}));

const INTENTS = [
  '询问','确认','建议','提醒','解释','抱怨','安慰','拒绝','接受','试探','议价','催促',
  '道歉','感谢','表扬','批评','求助','汇报','承诺','警告','澄清','质疑','鼓励','劝退',
  '邀约','谈条件','求加薪','求请假','谈离职','谈晋升','谈合作','谈风险','分享消息','八卦',
  '复盘','表达期待'
].map((name,i)=>({id:`intent_${i+1}`,name}));

const TONES = [
  ['calm','平静'],['warm','温和'],['direct','直接'],['careful','谨慎'],
  ['urgent','急切'],['tired','疲惫'],['happy','开心'],['excited','兴奋'],
  ['worried','担忧'],['angry','生气'],['skeptical','怀疑'],['firm','坚定'],
  ['polite','客气'],['casual','随意'],['professional','职业'],['sarcastic','带点讽刺']
].map(([id,name])=>({id,name}));

const RELATIONSHIP_STAGES = [
  ['stranger','陌生',0],['known','认识',10],['familiar','熟悉',20],['trusted','信任',32],
  ['close','亲近',45],['core','核心关系',60],['respectful','互相尊重',30],['dependent','依赖',35],
  ['tense','紧张',-15],['conflict','冲突',-30],['rival','竞争',-20],['broken','关系破裂',-50]
].map(([id,name,bias])=>({id,name,bias}));

const PATTERNS = [
  '{{opening}}{{topic}}这件事，我想先把情况说明白。',
  '{{opening}}关于{{topic}}，我这边有个实际问题。',
  '{{opening}}我看了今天的情况，{{topic}}最好现在就处理。',
  '{{opening}}{{topic}}不是小事，拖下去可能更麻烦。',
  '{{opening}}先别急，我觉得{{topic}}还能再调整。',
  '{{opening}}从我这边看，{{topic}}现在最大的矛盾很明确。',
  '{{opening}}要是按现在这个节奏，{{topic}}很快会影响后面。',
  '{{opening}}我不是反对，但{{topic}}得把成本算清楚。',
  '{{opening}}这两天大家都在说{{topic}}，我也想听听你的想法。',
  '{{opening}}{{topic}}我可以配合，不过条件最好提前讲清楚。',
  '{{opening}}我刚确认过，{{topic}}和之前预想的不太一样。',
  '{{opening}}说实话，{{topic}}现在让我有点担心。',
  '{{opening}}{{topic}}处理得好的话，其实也是个机会。',
  '{{opening}}我建议先看数据，再决定{{topic}}下一步怎么做。',
  '{{opening}}这事我不想绕弯子，{{topic}}确实需要改。',
  '{{opening}}{{topic}}如果继续这样，我这边会比较难配合。',
  '{{opening}}我理解你的考虑，但{{topic}}也得考虑一线情况。',
  '{{opening}}今天现场反应很明显，{{topic}}已经开始影响大家了。',
  '{{opening}}我有个折中的办法，针对{{topic}}可以先试两天。',
  '{{opening}}从长期看，{{topic}}不能只靠临时补救。',
  '{{opening}}我愿意继续做，但{{topic}}希望能有个明确说法。',
  '{{opening}}{{topic}}这件事我记着，最好别再重复出现。',
  '{{opening}}现在最重要的是先把{{topic}}稳定下来。',
  '{{opening}}如果你愿意听，我可以把{{topic}}的真实情况都告诉你。'
];

const OPENINGS = {
  calm:'我想了想，',
  warm:'我跟你商量一下，',
  direct:'我就直说了，',
  careful:'我先确认一下，',
  urgent:'得抓紧了，',
  tired:'今天确实有点扛不住，',
  happy:'今天状态不错，',
  excited:'这事真有点意思，',
  worried:'我有点担心，',
  angry:'我得把话说清楚，',
  skeptical:'我还是有点疑问，',
  firm:'我的态度很明确，',
  polite:'麻烦听我说一下，',
  casual:'顺便说一句，',
  professional:'从经营角度看，',
  sarcastic:'这事倒挺“有意思”，'
};

const DIALOGUE_FRAGMENTS = [];

for (const scene of SCENES) {
  PATTERNS.forEach((text,index)=>{
    DIALOGUE_FRAGMENTS.push({
      id:`dialogue_fragment_${scene.id}_${String(index+1).padStart(2,'0')}`,
      sceneId:scene.id,
      text
    });
  });
}

function stats() {
  return {
    scenes:SCENES.length,
    intents:INTENTS.length,
    tones:TONES.length,
    relationships:RELATIONSHIP_STAGES.length,
    fragments:DIALOGUE_FRAGMENTS.length
  };
}

module.exports = {
  VERSION:'0.8.15',
  SCENES,
  INTENTS,
  TONES,
  RELATIONSHIP_STAGES,
  PATTERNS,
  OPENINGS,
  DIALOGUE_FRAGMENTS,
  stats
};
