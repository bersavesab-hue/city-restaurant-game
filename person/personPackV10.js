'use strict';

/**
 * 人物 / NPC 最终版数据包 V1.0
 *
 * 设计原则：
 * - Person 是“人”，NPC Role 是“这个人当前扮演的社会/经营角色”。
 * - 性格不使用单一标签决定行为，而是由 12 个连续轴 + 5 个核心特质 + 价值观/动机/习惯/缺点共同构成。
 * - 身份、背景、岗位、外观、性格、目标绝大部分可自由或权重组合；年龄、岗位资格、职业经历等保留硬约束。
 * - 所有随机内容均可由 seed 重放。
 */

const VERSION = '1.0.0';

const PERSONALITY_AXES = [
  { id:'extraversion', name:'外向度' },
  { id:'conscientiousness', name:'责任心' },
  { id:'openness', name:'开放度' },
  { id:'agreeableness', name:'随和度' },
  { id:'stability', name:'情绪稳定' },
  { id:'ambition', name:'进取心' },
  { id:'integrity', name:'原则性' },
  { id:'frugality', name:'节俭度' },
  { id:'risk', name:'风险偏好' },
  { id:'patience', name:'耐心' },
  { id:'empathy', name:'共情力' },
  { id:'dominance', name:'主导性' }
];

const TRAIT_LABELS = {
  extraversion: [['安静',-18],['内敛',-14],['慢热',-10],['健谈',10],['热络',14],['外向',18]],
  conscientiousness: [['随性',-18],['粗线条',-14],['灵活',-8],['认真',10],['细致',14],['一丝不苟',18]],
  openness: [['守旧',-18],['传统',-14],['务实',-8],['好奇',10],['爱尝试',14],['创新',18]],
  agreeableness: [['强硬',-18],['直来直去',-13],['有主见',-8],['随和',10],['好相处',14],['迁就型',18]],
  stability: [['敏感',-18],['易焦虑',-14],['情绪化',-9],['沉着',10],['冷静',14],['抗压',18]],
  ambition: [['知足',-18],['佛系',-14],['求稳',-8],['上进',10],['进取',14],['野心强',18]],
  integrity: [['现实主义',-18],['善变通',-12],['结果导向',-8],['讲原则',10],['守规矩',14],['底线很强',18]],
  frugality: [['享受型',-18],['舍得花钱',-13],['消费随心',-8],['会算账',10],['节俭',14],['极度精打细算',18]],
  risk: [['谨慎',-18],['保守',-14],['先观察',-8],['敢尝试',10],['冒险',14],['敢赌机会',18]],
  patience: [['急躁',-18],['没耐心',-14],['快节奏',-8],['有耐心',10],['能熬',14],['长期主义',18]],
  empathy: [['理性疏离',-18],['不太会安慰人',-13],['重事实',-8],['体谅别人',10],['善解人意',14],['共情很强',18]],
  dominance: [['不爱争',-18],['配合型',-13],['低调',-8],['敢拍板',10],['强势',14],['控制欲强',18]]
};

const PERSON_TRAITS = [];
for (const axis of PERSONALITY_AXES) {
  const rows = TRAIT_LABELS[axis.id];
  rows.forEach((row, i) => {
    PERSON_TRAITS.push({
      id: `${axis.id}_${i+1}`,
      name: row[0],
      axis: axis.id,
      delta: row[1],
      weight: i===2 || i===3 ? 14 : i===1 || i===4 ? 11 : 7,
      tags: [`trait_axis_${axis.id}`, `trait_${axis.id}_${row[1] > 0 ? 'high' : 'low'}`]
    });
  });
}
// 旧版 ID 兼容映射，保留在人物生成器中使用。
const LEGACY_TRAIT_ALIASES = {
  steady:'stability_5', ambitious:'ambition_5', careful:'conscientiousness_5', social:'extraversion_5',
  impatient:'patience_1', frugal:'frugality_5', trend_seeker:'openness_5', quality_minded:'conscientiousness_4'
};

const SURNAMES = '王李张刘陈杨黄赵吴周徐孙马朱胡郭何高林罗郑梁谢宋唐许韩冯邓曹彭曾肖田董潘袁蔡蒋余于杜叶程苏魏吕丁任沈姚卢姜崔钟谭陆汪范金石廖贾夏韦傅方白邹孟熊秦邱江尹薛闫段雷侯龙史陶黎贺顾毛郝龚邵万钱严覃武戴莫孔向汤'.split('').slice(0,100)
  .map((name, i)=>({id:`surname_${i+1}`, name, weight:1}));

const MALE_GIVEN = ['建国','卫东','志强','国庆','海峰','伟强','军','勇','刚','磊','涛','斌','峰','超','鹏','浩','宇','晨','泽宇','子豪','俊杰','博文','明轩','皓宇','嘉豪','天宇','俊豪','浩然','宇航','梓豪','文博','嘉伟','志远','宏伟','庆华','振华','明辉','永强','德明','晓东','建华','立新','国栋','瑞峰','兴旺','志成','文涛','嘉诚','景明','启航','安平','世杰','向阳','东升','远航','承志','正阳','书豪','一鸣','维嘉'];
const FEMALE_GIVEN = ['秀兰','桂英','丽华','晓梅','静','芳','丽','敏','玲','燕','婷','娜','倩','慧','欣','悦','雨婷','梦洁','佳怡','思雨','雅静','诗涵','若曦','欣怡','嘉怡','婉婷','晓雯','可欣','子涵','梦琪','雪梅','玉兰','春梅','丽娟','红霞','淑芬','美玲','小琴','艳芳','秀英','慧敏','晓丽','嘉宁','思琪','若琳','心怡','静怡','佳慧','安琪','月华','清雅','思敏','慧娟','晓晴','文静','嘉欣','若兰','雨欣','诗雨','晓彤'];
const UNISEX_GIVEN = ['安','晨','悦','宁','嘉','乐','然','清','一凡','子涵','嘉宁','思远','安然','景行','明月','清和','知远','嘉禾','南星','予安','亦辰','星河','知夏','念安','书宁','嘉木','景然','云舒','予宁','思齐','知行','可为','明朗','嘉言','怀安','清越','安和','明哲','景川','亦安','嘉泽','星宇','清扬','知意','子墨','言希','梓晨','若安','景澄','一诺','以安','时安','乐言','嘉树','明川','知微','雨晨','子悦','嘉成','清宁'];
const GIVEN_NAMES = [
  ...MALE_GIVEN.map((name,i)=>({id:`given_m_${i+1}`,name,gender:'male',weight:1})),
  ...FEMALE_GIVEN.map((name,i)=>({id:`given_f_${i+1}`,name,gender:'female',weight:1})),
  ...UNISEX_GIVEN.map((name,i)=>({id:`given_u_${i+1}`,name,gender:'unisex',weight:1}))
];

const GENDERS = [
  {id:'male',name:'男',weight:51}, {id:'female',name:'女',weight:49}
];

const EDUCATIONS = [
  ['middle','初中及以下',10,-5],['vocational','中职/技校',16,0],['high','高中',18,0],['college','大专',20,2],['bachelor','本科',21,5],
  ['master','硕士',7,8],['doctor','博士',1,10],['culinary_school','烹饪学校/餐饮职校',5,4],['self_taught','自学型',1,0],['overseas','海外学习经历',1,8]
].map(([id,name,weight,skillBonus])=>({id,name,weight,skillBonus,tags:[`edu_${id}`]}));

const ORIGIN_TYPES = [
  ['local_urban','本地城区家庭',19],['local_suburb','本地近郊家庭',12],['local_rural','本地农村家庭',11],['county_migrant','外县来城务工家庭',10],
  ['province_migrant','省内异地来城',12],['cross_province','跨省来城',10],['small_city','周边小城市成长',7],['big_city','大城市成长',5],
  ['market_family','市场/批发生意家庭',5],['restaurant_family','餐饮家庭',4],['industrial_family','工矿/产业园家庭',3],['returnee','外地工作后返乡/返城',2]
].map(([id,name,weight])=>({id,name,weight,tags:[`origin_${id}`]}));

const FAMILY_BACKGROUNDS = [
  ['ordinary_worker','普通工薪家庭',16,0,0],['small_shop','小店经营家庭',10,8,5],['restaurant_family','餐饮经营家庭',8,14,6],['farmer','农村家庭',10,-4,4],
  ['wholesale_family','批发/供应链家庭',5,14,8],['property_family','有商业物业家庭',4,30,10],['public_sector','稳定职业家庭',8,6,-2],['single_parent','单亲家庭',5,-5,4],
  ['many_siblings','多子女家庭',6,-5,3],['well_off','小康家庭',8,18,0],['wealthy_business','富裕经商家庭',3,55,9],['debt_family','曾有债务压力家庭',5,-18,7],
  ['migrant_family','流动务工家庭',5,-6,5],['craft_family','手艺人家庭',3,3,7],['educated_family','重教育家庭',3,12,-2],['independent_early','较早独立生活',1,-8,10]
].map(([id,name,weight,wealthMod,resilience])=>({id,name,weight,wealthMod,resilience,tags:[`family_${id}`]}));

const DEFAULT_SKILLS = {cooking:20,prep:20,baking:10,beverage:12,service:25,cashier:20,management:20,operations:20,procurement:18,finance:18,sales:22,marketing:16,logistics:16,foodSafety:20,negotiation:20,leadership:18,digital:24};
function bg(id,name,weight,wealthBase,skills,tags=[],axisMods={}) { return {id,name,weight,wealthBase,skills:{...DEFAULT_SKILLS,...skills},tags:[`background_${id}`,...tags],axisMods}; }
const CAREER_BACKGROUNDS = [
  bg('kitchen_worker','餐饮后厨从业',18,22000,{cooking:62,prep:64,foodSafety:48},['food_experience']),
  bg('service_worker','餐厅前厅服务',16,24000,{service:62,cashier:42,sales:38},['service_experience']),
  bg('small_business','小生意经营者',10,110000,{management:58,operations:55,sales:64,finance:48,negotiation:58},['business_experience'],{risk:5,ambition:6}),
  bg('office_worker','普通白领',12,65000,{management:38,finance:42,digital:55,service:34},['office_experience']),
  bg('logistics_worker','物流配送从业',8,32000,{logistics:64,operations:42,service:34},['logistics_experience']),
  bg('property_owner','本地物业持有人',4,850000,{finance:58,negotiation:58,sales:48,management:42},['property_experience'],{risk:-4,frugality:5}),
  bg('fresh_graduate','应届/近年毕业生',8,12000,{digital:58,service:32,marketing:34},['junior'],{openness:8,ambition:5}),
  bg('apprentice_cook','厨房学徒经历',5,15000,{cooking:44,prep:55,foodSafety:38},['food_experience']),
  bg('senior_chef','资深厨师经历',3,80000,{cooking:82,prep:78,foodSafety:68,management:38},['food_experience','senior_skill']),
  bg('head_chef','厨师长/后厨主管经历',2,135000,{cooking:80,prep:74,management:62,operations:58,procurement:48,foodSafety:72,leadership:58},['food_experience','management_experience']),
  bg('pastry_worker','烘焙/西点从业',3,45000,{baking:76,prep:54,foodSafety:60,cooking:36},['food_experience']),
  bg('beverage_worker','茶饮/咖啡从业',4,36000,{beverage:76,service:54,cashier:52,marketing:35},['food_experience']),
  bg('cashier_worker','收银/门店前台',4,30000,{cashier:68,service:50,finance:32,digital:44},['service_experience']),
  bg('store_supervisor','门店班组长经历',4,56000,{management:55,operations:58,service:52,leadership:46},['management_experience']),
  bg('store_manager_bg','餐饮店长经历',3,105000,{management:72,operations:74,service:58,finance:50,leadership:62,procurement:42},['management_experience','food_experience']),
  bg('chain_ops','连锁运营经历',2,180000,{management:68,operations:82,finance:54,marketing:52,leadership:62,digital:58},['management_experience','chain_experience']),
  bg('procurement_worker','采购从业',4,65000,{procurement:76,negotiation:64,finance:42,logistics:44},['supply_experience']),
  bg('wholesale_worker','批发市场从业',4,80000,{procurement:66,sales:64,negotiation:68,logistics:46},['supply_experience']),
  bg('supplier_sales','供应商销售',4,85000,{sales:74,negotiation:68,service:48,procurement:48},['supply_experience','sales_experience']),
  bg('accounting_worker','财务/会计从业',4,90000,{finance:78,digital:52,management:34},['finance_experience'],{conscientiousness:8}),
  bg('marketing_worker','市场营销从业',4,90000,{marketing:76,sales:64,digital:58,service:42},['marketing_experience'],{openness:6,extraversion:4}),
  bg('sales_worker','销售从业',5,72000,{sales:74,negotiation:62,service:54,marketing:44},['sales_experience'],{extraversion:5}),
  bg('hr_worker','人事行政从业',3,70000,{management:48,service:48,negotiation:50,leadership:38},['office_experience']),
  bg('real_estate_agent','商业地产中介经历',3,120000,{sales:78,negotiation:76,finance:44,service:52},['property_experience','sales_experience']),
  bg('property_manager_bg','商业物业管理经历',3,115000,{management:60,operations:66,negotiation:55,finance:44},['property_experience']),
  bg('delivery_rider_bg','骑手/即时配送经历',4,26000,{logistics:62,service:36,digital:48},['logistics_experience']),
  bg('warehouse_worker','仓储从业',3,38000,{logistics:70,operations:48,procurement:36},['logistics_experience']),
  bg('food_safety_worker','食品安全/品控从业',2,90000,{foodSafety:82,operations:54,management:42},['quality_experience'],{conscientiousness:8}),
  bg('equipment_worker','餐饮设备行业从业',2,85000,{sales:52,negotiation:48,operations:44,digital:38},['equipment_experience']),
  bg('renovation_worker','装修工程从业',2,72000,{operations:58,negotiation:50,procurement:44},['construction_experience']),
  bg('failed_entrepreneur','有过创业失败经历',2,45000,{management:52,sales:48,finance:42,operations:50},['business_experience'],{risk:-4,stability:3}),
  bg('franchise_experience','加盟连锁经历',2,130000,{management:58,operations:64,finance:48,marketing:44},['business_experience','chain_experience']),
  bg('family_restaurant','家庭餐馆帮工长大',3,45000,{cooking:54,service:54,procurement:42,cashier:42},['food_experience']),
  bg('retired_service','退休后再就业',1,140000,{service:44,management:38,finance:38},['senior']),
  bg('investor_bg','投资/金融相关经历',1,450000,{finance:78,management:55,negotiation:60,sales:46},['finance_experience','investment_experience'],{risk:5}),
  bg('content_creator','本地内容/探店创作经历',2,80000,{marketing:74,digital:76,sales:42,service:44},['media_experience'],{openness:8,extraversion:5})
];

const VALUES = [
  '家庭','稳定','收入','成就','自由','名声','公平','学习','手艺','效率','忠诚','人情','创新','安全','服务','成长','传统','品质','卫生','节俭','慷慨','竞争','生活平衡','独立'
].map((name,i)=>({id:`value_${i+1}`,name,weight:1}));

const MOTIVATIONS = [
  '提高收入','存钱买房','养家','学本事','当店长','自己创业','做出名气','稳定工作','离家近','时间自由','获得认可','扩大人脉',
  '追求品质','挑战自己','还债','攒创业本钱','照顾家人','进入大公司','做管理','成为专业大厨','建立品牌','改善生活','获得安全感','不想被管太多'
].map((name,i)=>({id:`motivation_${i+1}`,name,weight:1}));

const HABITS = [
  '提前到岗','习惯记账','爱刷行业短视频','爱研究菜单','下班后复盘','喜欢聊天','爱打听消息','喜欢安静做事','习惯囤现金','购物冲动','喜欢尝新品','喝茶','喝咖啡','夜猫子','早起型','爱运动',
  '不爱加班','主动加班','爱带新人','喜欢自己做决定','凡事先问清楚','遇事先观察','习惯比价','喜欢讲价','爱维护熟客','喜欢拍照记录','喜欢做表格','不喜欢手机办公','常迟到几分钟','容易忘事','注重仪表','随身带小本子'
].map((name,i)=>({id:`habit_${i+1}`,name,weight:1}));

const FLAWS = [
  '过度谨慎','容易急躁','怕得罪人','好面子','过度自信','不擅表达','执行拖延','记仇','容易心软','爱比较','情绪写在脸上','抗拒变化','容易焦虑','不善拒绝',
  '花钱大手','过度省钱','容易跟风','过度控制','不愿求助','喜欢单干','嫌麻烦','容易分心','对数字不敏感','对人太苛刻','容易承诺过头','过度讲人情','怕承担责任','爱抢功劳'
].map((name,i)=>({id:`flaw_${i+1}`,name,weight:1}));

const WORK_STYLES = [
  '流程型','结果型','细节型','效率型','稳健型','冲刺型','协作型','独立型','学习型','经验型','服务型','成本型','品质型','数据型','现场型','计划型','灵活型','标准化型'
].map((name,i)=>({id:`work_${i+1}`,name,weight:1}));

const SOCIAL_STYLES = [
  '热情主动','礼貌克制','慢热熟人型','直来直去','圆滑协调','幽默型','谨慎客气','少说多做','强势主导','善于倾听','讲义气','公事公办','看人下菜','重长期关系','边界清楚','喜欢结交新人','不爱社交','冲突回避'
].map((name,i)=>({id:`social_${i+1}`,name,weight:1}));

const MONEY_ATTITUDES = [
  '安全储蓄型','现金为王','愿意投资自己','愿意为品质花钱','极度成本敏感','追求性价比','有钱就扩大生意','偏好低风险理财','敢借钱做生意','排斥负债','重视现金流','看重长期回报','短期收益优先','喜欢囤货压价','愿意分红共享','消费享受型'
].map((name,i)=>({id:`money_${i+1}`,name,weight:1}));

const NEGOTIATION_STYLES = [
  '温和议价','数据说服','强硬压价','先建立关系','沉默观察','多轮拉锯','快速成交','以退为进','强调长期合作','喜欢打包条件','逐项谈判','最后期限型','试探底价','寻找替代方案','重信用承诺','情绪化谈判'
].map((name,i)=>({id:`negotiation_${i+1}`,name,weight:1}));

const STRESS_RESPONSES = [
  '越忙越冷静','先自己扛','主动求助','开始急躁','变得沉默','反复检查','加快决策','拖延逃避','找人倾诉','用数据控制局面','减少沟通','发脾气后很快恢复','容易失眠','通过运动缓解','疯狂工作','开始省钱','寻求稳定方案','突然想换工作'
].map((name,i)=>({id:`stress_${i+1}`,name,weight:1}));

const LIFE_GOALS = [
  '买一套自己的房子','在城市扎根','开一家自己的店','成为店长','成为区域经理','成为专业大厨','攒够100万元','让家里生活稳定','建立自己的品牌','回老家发展','进入大型连锁企业','有更多自由时间',
  '把孩子教育好','照顾父母','还清债务','买一辆车','成为行业专家','做供应链生意','投资房产','做内容博主','带出一支团队','做一家百年小店','提前退休','不再为钱焦虑'
].map((name,i)=>({id:`goal_${i+1}`,name,weight:1}));

const APPEARANCE_FEATURES = [
  ...['圆脸','长脸','方脸','鹅蛋脸','偏瘦脸','宽脸','娃娃脸','轮廓分明'].map((name,i)=>({id:`face_${i+1}`,name,group:'face',weight:1})),
  ...['偏瘦','匀称','结实','微胖','高挑','矮壮'].map((name,i)=>({id:`build_${i+1}`,name,group:'build',weight:1})),
  ...['短发','利落短发','自然中发','长发','马尾','丸子头','微卷发','寸头','偏分','齐肩发','低马尾','自然卷'].map((name,i)=>({id:`hair_${i+1}`,name,group:'hair',weight:1})),
  ...['朴素','干净利落','商务休闲','运动风','工装风','精致','传统','潮流'].map((name,i)=>({id:`dress_${i+1}`,name,group:'dress',weight:1})),
  ...['无明显配饰','眼镜','腕表','工牌习惯','帽子','细框眼镜'].map((name,i)=>({id:`accessory_${i+1}`,name,group:'accessory',weight:1}))
];

function role(id,name,group,minAge,minFit,skillWeights,tags=[],extra={}) {
  return {id,name,group,minAge,minFit,skillWeights,tags:[`role_${id}`,...tags],...extra};
}
const NPC_ROLES = [
  role('landlord','房东','property',24,15,{finance:.18,negotiation:.12},['external']),
  role('agent','商业地产中介','property',20,24,{sales:.28,negotiation:.24,service:.12},['external']),
  role('property_manager','物业经理','property',23,30,{management:.20,operations:.24,negotiation:.14},['external']),
  role('leasing_manager','招商经理','property',23,34,{sales:.24,negotiation:.26,finance:.10},['external']),
  role('junior_chef','厨房学徒','staff',18,18,{cooking:.22,prep:.28,foodSafety:.10}),
  role('chef','厨师','staff',18,34,{cooking:.46,prep:.20,foodSafety:.08}),
  role('senior_chef_role','资深厨师','staff',22,45,{cooking:.46,prep:.16,foodSafety:.12,operations:.06}),
  role('head_chef_role','厨师长','management',25,50,{cooking:.30,management:.18,operations:.14,foodSafety:.10,leadership:.10}),
  role('executive_chef','行政总厨','management',28,58,{cooking:.24,management:.20,operations:.18,foodSafety:.10,leadership:.14,procurement:.08}),
  role('prep_cook','切配','staff',18,24,{prep:.46,cooking:.18,foodSafety:.08}),
  role('pastry_chef','烘焙/西点师','staff',18,32,{baking:.50,prep:.12,foodSafety:.10}),
  role('beverage_maker','饮品师','staff',18,28,{beverage:.48,service:.14,cashier:.08}),
  role('dishwasher','洗消员','staff',18,14,{foodSafety:.16,operations:.12}),
  role('waiter','服务员','staff',18,22,{service:.42,sales:.12,cashier:.08}),
  role('cashier','收银员','staff',18,24,{cashier:.38,service:.20,finance:.08,digital:.10}),
  role('host','迎宾/预订','staff',18,26,{service:.36,sales:.16,digital:.08}),
  role('cleaner','保洁','staff',18,12,{foodSafety:.10,operations:.08}),
  role('shift_leader','值班主管','management',20,34,{management:.24,operations:.24,service:.14,leadership:.10}),
  role('assistant_manager','副店长','management',21,40,{management:.28,operations:.26,service:.12,finance:.08}),
  role('manager','店长','management',22,44,{management:.30,operations:.28,service:.10,finance:.10,leadership:.10}),
  role('procurement','采购','support',21,36,{procurement:.34,negotiation:.24,finance:.10,logistics:.10}),
  role('warehouse_keeper','仓管','support',20,26,{logistics:.32,operations:.24,procurement:.10,digital:.08}),
  role('delivery_coordinator','配送调度','support',20,30,{logistics:.34,operations:.24,digital:.14}),
  role('food_safety','食品安全/品控','support',21,38,{foodSafety:.48,operations:.16,management:.08}),
  role('accountant','财务','support',21,38,{finance:.48,digital:.14,management:.08}),
  role('hr','人事行政','support',21,32,{management:.24,service:.16,negotiation:.16,digital:.10}),
  role('marketer','营销','support',20,34,{marketing:.40,digital:.20,sales:.14}),
  role('operations_specialist','运营专员','support',21,36,{operations:.36,management:.18,digital:.16,finance:.08}),
  role('area_manager','区域经理','management',25,52,{management:.26,operations:.28,finance:.10,leadership:.18,negotiation:.10}),
  role('regional_manager','大区经理','management',28,60,{management:.24,operations:.24,finance:.12,leadership:.20,negotiation:.12}),
  role('supplier_sales_role','供应商业务员','supply',20,34,{sales:.30,negotiation:.24,service:.10,procurement:.08},['external']),
  role('supplier_owner','供应商老板','supply',24,38,{management:.18,sales:.22,finance:.14,negotiation:.18,procurement:.12},['external']),
  role('wholesaler','批发商','supply',24,36,{procurement:.24,sales:.22,negotiation:.22,logistics:.10},['external']),
  role('delivery_rider','外卖骑手','external_service',18,18,{logistics:.28,service:.10,digital:.10},['external']),
  role('equipment_vendor','设备商','external_service',23,34,{sales:.22,negotiation:.20,operations:.12},['external']),
  role('renovation_contractor','装修承包商','external_service',25,38,{operations:.22,negotiation:.22,procurement:.14,management:.12},['external']),
  role('competitor_owner','竞对老板','competition',22,40,{management:.20,sales:.18,finance:.14,operations:.14,negotiation:.10},['external','entrepreneur']),
  role('franchisee','加盟商','competition',22,38,{management:.18,finance:.14,sales:.14,operations:.16},['external','entrepreneur']),
  role('entrepreneur','创业者','competition',20,34,{management:.16,sales:.16,finance:.12,operations:.14,negotiation:.10},['external','entrepreneur']),
  role('investor','投资人','capital',24,42,{finance:.34,management:.14,negotiation:.18},['external']),
  role('bank_manager','银行客户经理','capital',22,36,{finance:.26,sales:.18,service:.16,negotiation:.12},['external']),
  role('food_inspector','食品检查人员','regulator',23,42,{foodSafety:.34,operations:.12,management:.08},['external']),
  role('fire_inspector','消防检查人员','regulator',23,40,{operations:.22,management:.12},['external']),
  role('blogger','美食博主','media',18,28,{marketing:.30,digital:.30,service:.08},['external']),
  role('media_editor','本地媒体编辑','media',21,32,{marketing:.20,digital:.24,service:.10},['external']),
  role('regular_customer','熟客','customer',18,0,{},['external']),
  role('business_customer','商务顾客','customer',22,0,{},['external']),
  role('consultant','餐饮顾问','expert',28,52,{management:.18,operations:.20,finance:.10,marketing:.10,foodSafety:.10,negotiation:.10},['external'])
];

const RELATIONSHIP_TYPES = [
  {id:'stranger',name:'陌生人'}, {id:'acquaintance',name:'认识'}, {id:'colleague',name:'同事'}, {id:'supervisor',name:'上下级'},
  {id:'supplier',name:'供采关系'}, {id:'landlord_tenant',name:'租赁关系'}, {id:'business_partner',name:'合作伙伴'}, {id:'competitor',name:'竞争关系'},
  {id:'friend',name:'朋友'}, {id:'mentor',name:'师徒'}, {id:'family',name:'亲属'}, {id:'former_colleague',name:'前同事'}
];

const MEMORY_TYPES = [
  {id:'promise',name:'承诺',decay:.03}, {id:'help',name:'帮助',decay:.025}, {id:'conflict',name:'冲突',decay:.018}, {id:'money',name:'金钱往来',decay:.018},
  {id:'promotion',name:'提拔/认可',decay:.012}, {id:'betrayal',name:'背弃',decay:.006}, {id:'work',name:'共同工作',decay:.04}, {id:'social',name:'日常互动',decay:.06}
];

function stats() {
  return {
    surnames:SURNAMES.length, givenNames:GIVEN_NAMES.length, traits:PERSON_TRAITS.length, educations:EDUCATIONS.length,
    origins:ORIGIN_TYPES.length, families:FAMILY_BACKGROUNDS.length, backgrounds:CAREER_BACKGROUNDS.length,
    values:VALUES.length, motivations:MOTIVATIONS.length, habits:HABITS.length, flaws:FLAWS.length,
    workStyles:WORK_STYLES.length, socialStyles:SOCIAL_STYLES.length, moneyAttitudes:MONEY_ATTITUDES.length,
    negotiationStyles:NEGOTIATION_STYLES.length, stressResponses:STRESS_RESPONSES.length, lifeGoals:LIFE_GOALS.length,
    appearances:APPEARANCE_FEATURES.length, npcRoles:NPC_ROLES.length, relationshipTypes:RELATIONSHIP_TYPES.length, memoryTypes:MEMORY_TYPES.length
  };
}

module.exports = {
  VERSION, PERSONALITY_AXES, PERSON_TRAITS, LEGACY_TRAIT_ALIASES, SURNAMES, GIVEN_NAMES, GENDERS, EDUCATIONS,
  ORIGIN_TYPES, FAMILY_BACKGROUNDS, CAREER_BACKGROUNDS, VALUES, MOTIVATIONS, HABITS, FLAWS, WORK_STYLES,
  SOCIAL_STYLES, MONEY_ATTITUDES, NEGOTIATION_STYLES, STRESS_RESPONSES, LIFE_GOALS, APPEARANCE_FEATURES,
  NPC_ROLES, RELATIONSHIP_TYPES, MEMORY_TYPES, DEFAULT_SKILLS, stats
};
