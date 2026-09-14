'use strict';

const SOURCES = [
  ['customer','普通顾客'],['regular','熟客'],['resident','附近居民'],['student','学生'],['office','白领'],
  ['employee','员工'],['former_employee','前员工'],['supplier','供应商'],['landlord','房东'],['competitor','同行老板'],
  ['rider','外卖骑手'],['blogger','探店博主'],['media','本地媒体'],['anonymous','匿名账号'],['family','家庭顾客'],
  ['tourist','游客'],['merchant','附近商户'],['foodie','本地吃货'],['platform','平台用户'],['business_customer','商务顾客']
].map(([id,name])=>({id,name}));

const EMOTIONS = [
  '满意','惊喜','开心','期待','认可','支持','好奇','围观',
  '中立','理性','观察','犹豫','疑问','怀疑','担忧','失望',
  '不满','生气','吐槽','讽刺','疲惫','着急','焦虑','遗憾',
  '羡慕','佩服','庆幸','无奈','兴奋','冲动','谨慎','冷淡'
].map((name,i)=>({id:`emotion_${i+1}`,name}));

const TOPICS = [
  ['price','价格','这个价格'],
  ['taste','味道','味道表现'],
  ['portion','分量','分量'],
  ['speed','出餐速度','出餐速度'],
  ['service','服务','服务态度'],
  ['hygiene','卫生','卫生情况'],
  ['queue','排队','排队情况'],
  ['new_dish','新品','新出的菜'],
  ['signature','招牌菜','招牌菜'],
  ['delivery','外卖','外卖体验'],
  ['packaging','包装','包装'],
  ['promotion','优惠','最近的优惠'],
  ['rating','评分','平台评分'],
  ['event','事件','今天发生的事'],
  ['policy','政策','新政策'],
  ['supplier','供应','食材供应'],
  ['staff','员工','店里员工'],
  ['competitor','竞品','附近同行'],
  ['rent','租金','这片租金'],
  ['weather','天气','今天的天气'],
  ['festival','节庆','最近活动'],
  ['brand','品牌','这个品牌'],
  ['crowd','客流','今天客流'],
  ['profit','经营状况','这家店最近的经营状况']
].map(([id,name,text])=>({id,name,text}));

const REACTIONS = [
  '我觉得{{topic}}有点意思。',
  '{{topic}}今天变化挺明显。',
  '有人也注意到{{topic}}了吗？',
  '{{topic}}比我预想的要好。',
  '{{topic}}感觉还有提升空间。',
  '先观察两天再看{{topic}}。',
  '{{topic}}要是稳定下来就不错。',
  '说真的，{{topic}}现在挺影响体验。',
  '{{topic}}今天确实把我惊到了。',
  '我更关心{{topic}}接下来会不会变。',
  '{{topic}}目前看还算合理。',
  '这波{{topic}}应该会影响不少人。',
  '{{topic}}跟上周比差别挺大。',
  '如果是我，会先处理{{topic}}。',
  '{{topic}}现在已经有人在讨论了。',
  '别光看热闹，{{topic}}其实很关键。',
  '{{topic}}做得好会很加分。',
  '{{topic}}没处理好也挺伤口碑。',
  '我身边几个人都在聊{{topic}}。',
  '{{topic}}到底值不值，还是得看实际体验。'
];

const BARRAGE_FRAGMENTS = [];

for (const source of SOURCES) {
  for (const emotion of EMOTIONS) {
    BARRAGE_FRAGMENTS.push({
      id:`barrage_fragment_${source.id}_${emotion.id}`,
      sourceId:source.id,
      emotionId:emotion.id,
      pattern:
        REACTIONS[
          BARRAGE_FRAGMENTS.length %
          REACTIONS.length
        ]
    });
  }
}

function stats() {
  return {
    sources:SOURCES.length,
    emotions:EMOTIONS.length,
    topics:TOPICS.length,
    fragments:BARRAGE_FRAGMENTS.length
  };
}

module.exports = {
  VERSION:'0.8.15',
  SOURCES,
  EMOTIONS,
  TOPICS,
  REACTIONS,
  BARRAGE_FRAGMENTS,
  stats
};
