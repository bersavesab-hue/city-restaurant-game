'use strict';

const food = require('../food/foodPackV10.js');

function makeRows(names, prefix, extra) {
  return names.map((name, i) => ({
    id: prefix + '_' + String(i + 1).padStart(2, '0'),
    name,
    ...(extra || {})
  }));
}

const SUPPLIER_CATEGORIES = [
  {id:'grain',name:'粮油主食供应商',ingredientCategories:['rice_grain','flour_noodle','oil_fat']},
  {id:'pork',name:'猪肉供应商',ingredientCategories:['pork']},
  {id:'beef_lamb',name:'牛羊肉供应商',ingredientCategories:['beef','lamb']},
  {id:'poultry',name:'禽类供应商',ingredientCategories:['poultry']},
  {id:'seafood',name:'水产海鲜供应商',ingredientCategories:['seafood']},
  {id:'egg_dairy',name:'蛋奶供应商',ingredientCategories:['egg_dairy']},
  {id:'soy',name:'豆制品供应商',ingredientCategories:['tofu_soy']},
  {id:'vegetable',name:'蔬菜供应商',ingredientCategories:['leafy','root','fruit_veg']},
  {id:'mushroom',name:'菌菇供应商',ingredientCategories:['mushroom']},
  {id:'spice',name:'香辛料供应商',ingredientCategories:['aromatics']},
  {id:'seasoning',name:'调味品供应商',ingredientCategories:['seasoning']},
  {id:'fruit',name:'水果供应商',ingredientCategories:['fruit']},
  {id:'beverage',name:'饮品原料供应商',ingredientCategories:['beverage']},
  {id:'bakery',name:'烘焙原料供应商',ingredientCategories:['bakery']},
  {id:'frozen',name:'冻品半成品供应商',ingredientCategories:['frozen_processed']},
  {id:'fresh_market',name:'综合生鲜供应商',ingredientCategories:['pork','poultry','seafood','leafy','root','fruit_veg']},
  {id:'wholesale',name:'综合批发商',ingredientCategories:['rice_grain','flour_noodle','seasoning','oil_fat','frozen_processed']},
  {id:'premium',name:'精品食材供应商',ingredientCategories:['beef','lamb','seafood','egg_dairy','fruit','mushroom']}
];

const SCALE_TIERS = [
  {id:'micro',name:'个体档口',capacity:0.72,price:0.93,reliability:-8,quality:-4,minOrder:0.45},
  {id:'small',name:'小型商贸',capacity:0.88,price:0.97,reliability:-2,quality:0,minOrder:0.72},
  {id:'regional',name:'区域经销',capacity:1.06,price:1.00,reliability:5,quality:3,minOrder:1.00},
  {id:'large',name:'大型供应链',capacity:1.28,price:1.03,reliability:9,quality:5,minOrder:1.35},
  {id:'direct',name:'产地直供',capacity:1.16,price:0.90,reliability:2,quality:8,minOrder:1.55},
  {id:'premium',name:'精品专供',capacity:0.92,price:1.22,reliability:7,quality:14,minOrder:0.82},
  {id:'platform',name:'数字化集采平台',capacity:1.38,price:1.01,reliability:11,quality:4,minOrder:0.65}
];

const SUPPLIER_ARCHETYPES = [];
for (const category of SUPPLIER_CATEGORIES) {
  for (const tier of SCALE_TIERS) {
    SUPPLIER_ARCHETYPES.push({
      id: `supplier_${category.id}_${tier.id}`,
      name: category.name + '·' + tier.name,
      categoryId: category.id,
      tierId: tier.id,
      ingredientCategories: category.ingredientCategories.slice(),
      baseReliability: 72 + tier.reliability,
      baseQuality: 68 + tier.quality,
      capacityIndex: tier.capacity,
      priceIndex: tier.price,
      minimumOrderIndex: tier.minOrder
    });
  }
}

const COOPERATION_MODES = makeRows([
  '现采现结','周结合作','半月结算','月结合作','月度框架采购','季度框架采购','年度框架采购',
  '固定价供货','指数联动价','阶梯价格','保量保价','最低采购承诺','独家供应','双供应商备份',
  '产地直采','联营集采','平台撮合','寄售库存','供应商管理库存','紧急补货协议','预付款锁价','联合定制'
], 'coop');

const PAYMENT_TERMS = [
  ['cash','货到现结',0,0],['prepay','预付100%',-2,100],['deposit30','30%预付+到货结清',0,30],
  ['net3','3天账期',3,0],['net7','7天账期',7,0],['net10','10天账期',10,0],['net15','15天账期',15,0],
  ['net20','20天账期',20,0],['net30','30天账期',30,0],['net45','45天账期',45,0],['net60','60天账期',60,0],
  ['weekly','每周统一结算',7,0],['biweekly','双周结算',14,0],['monthly','月度统一结算',30,0],
  ['cod_partial','部分货到付款',5,40],['credit_line','授信额度内月结',30,0],['consignment','售后结算',35,0],['milestone','分批到货分批结算',10,20]
].map(([id,name,days,prepay])=>({id,name,days,prepayPercent:prepay}));

const DELIVERY_MODES = makeRows([
  '商家自提','供应商送货','同城即时配送','次日达','定时班车配送','冷链专车','冷藏零担','常温零担',
  '产地干线+城配','铁路冷链','航空急件','市场档口跑腿','平台众包配送','夜间配送','凌晨到店',
  '分批配送','越库直送','共同配送','应急专送','门店间调拨'
], 'delivery');

const QUOTE_STRATEGIES = makeRows([
  '稳定薄利','低价引流','高品质溢价','首单优惠','新客三单优惠','阶梯报价','大客户折扣','旺季上浮',
  '淡季促销','市场指数联动','成本加成','固定月价','季度锁价','年度锁价','低起订高单价','高起订低单价',
  '现金折扣','账期加价','预付折扣','组合采购折扣','尾货特价','临期折价','稀缺品动态价','产地行情价',
  '平台透明价','议价空间型','一口价','关系客户价','竞标报价','紧急加急价'
], 'quote');

const NEGOTIATION_STYLES = makeRows([
  '爽快成交','锚定高价','逐步让步','以量换价','以账期换价','以长期合同换价','关系维护型','强硬底价型',
  '数据说服型','情绪施压型','捆绑销售型','交叉让利型','赠品替代降价','运费让利型','质量承诺型',
  '先低后高型','限时优惠型','竞争对手比价型','老板拍板型','业务员权限有限型','重信誉轻价格型',
  '重现金流型','重规模型','合作共赢型'
], 'nego');

const SUPPLY_RISKS = makeRows([
  '临时涨价','断货','少货','错货','延迟到货','冷链中断','品质波动','批次污染','临期货混入',
  '规格不符','产地替换','品牌替换','包装破损','称重误差','发票延迟','账期收紧','最低起订量上调',
  '配送费上涨','旺季配额不足','恶劣天气停运','道路拥堵','节假日运力不足','上游停产','进口清关延迟',
  '检疫问题','食品安全召回','供应商现金流危机','仓库火灾','司机临时缺勤','系统订单丢失',
  '重复送货','退货处理拖延','售后响应慢','合同条款争议','独家协议冲突','恶性低价后涨价'
], 'risk');

const RELATIONSHIP_EVENTS = makeRows([
  '首次合作顺利','连续准时到货','主动补偿损失','紧急补货成功','主动提醒涨价','分享行情信息',
  '给予账期','给予价格保护','优先配货','节日赠礼','共同解决客诉','提供试用品','介绍新货源',
  '质量争议','迟到未解释','临时加价','少货争议','错货争议','退货扯皮','账期逾期','付款及时',
  '年度返利达成','采购量升级','采购量下降','更换业务员','老板亲自维护','竞争供应商挖单',
  '独家协议谈判','合作暂停','重新恢复合作'
], 'relation_event');

const CONTRACT_TYPES = makeRows([
  '单次采购合同','月度框架合同','季度框架合同','年度框架合同','固定价合同','指数联动合同','保量合同',
  '保价合同','独家供应合同','双供备份合同','产地直采合同','冷链专项合同','寄售合同',
  '供应商管理库存合同','联合定制合同','应急保障合同'
], 'contract');

const INGREDIENTS_BY_CATEGORY = {};
for (const ingredient of food.INGREDIENTS) {
  if (!INGREDIENTS_BY_CATEGORY[ingredient.category]) {
    INGREDIENTS_BY_CATEGORY[ingredient.category] = [];
  }
  INGREDIENTS_BY_CATEGORY[ingredient.category].push(ingredient.id);
}

function stats() {
  return {
    categories: SUPPLIER_CATEGORIES.length,
    archetypes: SUPPLIER_ARCHETYPES.length,
    cooperationModes: COOPERATION_MODES.length,
    paymentTerms: PAYMENT_TERMS.length,
    deliveryModes: DELIVERY_MODES.length,
    quoteStrategies: QUOTE_STRATEGIES.length,
    negotiationStyles: NEGOTIATION_STYLES.length,
    risks: SUPPLY_RISKS.length,
    relationshipEvents: RELATIONSHIP_EVENTS.length,
    contractTypes: CONTRACT_TYPES.length
  };
}

module.exports = {
  VERSION:'1.0.0',
  SUPPLIER_CATEGORIES,
  SUPPLIER_ARCHETYPES,
  COOPERATION_MODES,
  PAYMENT_TERMS,
  DELIVERY_MODES,
  QUOTE_STRATEGIES,
  NEGOTIATION_STYLES,
  SUPPLY_RISKS,
  RELATIONSHIP_EVENTS,
  CONTRACT_TYPES,
  INGREDIENTS_BY_CATEGORY,
  stats
};
