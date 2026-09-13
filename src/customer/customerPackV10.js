'use strict';

function rows(names,prefix,extra={}){return names.map((name,i)=>({id:`${prefix}_${i+1}`,name,weight:1,...extra}));}

// 64个消费人群原型。它们是“需求骨架”，不是64个固定顾客。
// 字段：预算、价格敏感、品质敏感、距离敏感、排队容忍、尝鲜、忠诚、社交影响、评价倾向、外卖倾向。
const SEGMENT_ROWS = [
 ['student_budget','学生性价比型',12,.72,92,54,72,42,76,34,82,58,70],['student_social','学生社交型',9,.88,78,58,64,54,88,28,90,72,62],['student_night','学生夜宵型',8,.82,84,46,58,66,80,24,84,58,78],['young_office_lunch','年轻白领午餐型',11,1.05,66,70,68,64,54,42,62,46,58],
 ['office_efficiency','效率白领型',10,1.18,54,66,82,38,32,44,48,30,52],['office_quality','品质白领型',8,1.36,42,84,58,56,46,48,56,48,46],['business_dining','商务宴请型',5,1.82,24,92,44,72,32,54,48,34,22],['family_value','家庭性价比型',10,1.14,72,68,60,70,34,62,58,38,34],
 ['family_quality','家庭品质型',8,1.38,50,84,52,74,28,68,54,44,28],['family_weekend','周末家庭聚餐型',7,1.46,44,82,46,80,42,66,60,42,22],['elderly_local','中老年本地型',8,.92,76,72,70,78,18,74,34,18,16],['elderly_health','中老年清淡型',6,1.02,58,84,66,74,20,72,34,24,14],
 ['worker_meal','工薪工作餐型',11,.90,86,58,72,52,28,48,32,22,42],['industrial_worker','工业园工作餐型',8,.82,90,50,64,44,20,44,22,16,38],['courier_driver','骑手司机快餐型',7,.84,88,46,86,30,20,36,18,12,36],['night_shift','夜班工作餐型',6,.92,78,58,74,60,30,44,24,16,58],
 ['tourist_try','游客尝鲜型',6,1.28,50,70,36,54,94,12,86,64,20],['tourist_convenience','游客便利型',5,1.34,44,58,48,50,78,10,74,46,24],['foodie','美食探索型',5,1.52,28,96,34,66,96,24,88,74,34],['trend_chaser','网红追新型',5,1.34,38,72,42,56,98,16,96,86,40],
 ['influencer_follow','达人种草型',4,1.30,42,68,48,54,88,20,98,82,44],['review_reader','评价依赖型',7,1.12,58,72,54,58,54,40,94,60,38],['brand_loyal','品牌忠诚型',6,1.22,46,76,54,62,26,94,44,34,36],['habit_regular','习惯复购型',8,1.00,68,68,76,72,14,92,26,18,26],
 ['discount_hunter','优惠券敏感型',8,.86,96,50,64,40,44,30,66,36,62],['groupbuy_hunter','团购套餐型',7,.94,90,56,58,52,54,34,68,40,56],['delivery_heavy','外卖重度型',8,1.04,72,58,62,32,38,44,58,42,96],['delivery_quality','品质外卖型',5,1.24,50,76,58,40,46,48,62,48,90],
 ['healthy_light','健康轻食型',5,1.28,42,86,52,62,62,52,54,46,54],['fitness','健身轻食型',4,1.34,38,88,56,58,54,48,46,34,50],['vegetarian_pref','素食偏好型',3,1.12,48,82,50,62,56,52,48,36,46],['spicy_lover','重口味爱好型',6,1.00,58,76,50,54,62,42,54,42,40],
 ['local_cuisine','地方口味忠诚型',6,1.08,56,80,54,68,28,82,42,28,30],['small_eater','小食量型',5,.82,78,68,64,60,44,48,46,30,42],['big_eater','大食量型',5,1.18,74,68,60,64,34,46,34,22,36],['solo_diner','独食便利型',8,.96,72,62,78,44,38,48,36,24,58],
 ['couple_date','情侣约会型',6,1.42,34,82,44,72,66,50,70,58,24],['friends_gathering','朋友聚会型',7,1.36,42,78,42,76,72,44,76,54,26],['celebration','庆祝聚餐型',4,1.72,22,90,36,82,56,54,68,52,16],['banquet_guest','宴席消费型',3,1.92,18,86,34,86,30,52,42,30,12],
 ['coffee_daily','咖啡日常型',5,1.16,54,74,72,54,48,78,48,36,42],['tea_daily','茶饮日常型',6,.98,70,62,70,48,56,70,58,44,52],['dessert_social','甜品社交型',4,1.18,46,72,52,60,78,34,82,62,30],['bakery_breakfast','烘焙早餐型',5,1.00,64,70,74,44,40,62,34,24,48],
 ['breakfast_fast','早餐效率型',7,.82,88,54,88,28,18,58,18,10,32],['late_night_social','夜宵社交型',6,1.06,62,68,46,68,72,36,74,52,44],['premium_experience','高端体验型',3,2.12,16,98,26,86,72,52,62,46,12],['premium_brand','高端品牌型',3,1.96,20,94,30,82,54,82,54,36,14],
 ['mall_shopper','商场顺带消费型',6,1.26,48,70,44,58,58,42,52,38,26],['community_regular','社区熟客型',8,.98,70,68,84,74,16,94,30,20,24],['school_parent','接送家长型',5,1.10,64,72,68,54,26,58,38,24,28],['hospital_companion','就医陪护便利型',3,.96,78,62,76,38,18,34,24,14,42],
 ['event_crowd','活动临时客流型',4,1.18,54,60,28,34,76,8,82,46,32],['scenic_family','景区家庭型',4,1.38,46,72,30,62,70,24,78,50,20],['business_travel','商务差旅型',4,1.52,30,82,46,56,48,32,54,32,34],['commuter','通勤顺路型',7,.98,76,58,90,34,24,64,28,18,42],
 ['budget_retiree','节俭退休型',5,.78,94,64,72,82,14,76,30,16,12],['affluent_retiree','宽裕退休型',3,1.38,36,86,62,80,18,82,34,20,10],['new_parent','年轻父母型',4,1.26,52,84,58,70,24,74,42,24,28],['large_family','多人家庭型',4,1.32,68,76,52,82,24,68,44,28,20],
 ['entrepreneur','创业者效率型',3,1.46,34,78,74,42,44,38,42,28,46],['freelancer','自由职业灵活型',4,1.12,58,70,56,52,68,46,60,44,54],['nightlife','夜生活消费型',3,1.44,32,72,36,64,82,22,78,58,36],['convenience_first','便利优先型',6,1.02,64,56,96,30,30,46,24,14,48]
];
const SEGMENTS = SEGMENT_ROWS.map(([id,name,weight,budgetIndex,priceSensitivity,qualitySensitivity,distanceSensitivity,queueTolerance,noveltySeeking,loyalty,socialInfluence,reviewPropensity,deliveryAffinity])=>({
  id,name,weight,budgetIndex,priceSensitivity,qualitySensitivity,distanceSensitivity,queueTolerance,noveltySeeking,loyalty,socialInfluence,reviewPropensity,deliveryAffinity,tags:[`segment_${id}`]
}));

const INCOME_BANDS = [
 ['very_low','较低可支配',.58,92],['low','偏低',.72,84],['lower_mid','中低',.86,76],['mid','中等',1.00,64],['upper_mid','中高',1.18,52],['high','较高',1.42,40],['affluent','宽裕',1.78,28],['wealthy','高净值',2.35,18]
].map(([id,name,budgetMultiplier,priceSensitivity])=>({id,name,budgetMultiplier,priceSensitivity}));

const HOUSEHOLD_TYPES = [
 ['single','单人居住',1,1],['couple','情侣/夫妻二人',2,2],['young_family','年轻三口之家',3,3],['family_two_children','四口之家',4,4],['three_generation','三代家庭',4,6],['shared_room','合租群体',1,3],['student_dorm','学生宿舍',1,4],['elderly_couple','老年夫妻',2,2],['single_parent','单亲家庭',2,4],['large_family','多人家庭',5,8],['business_team','商务小组',2,6],['friend_group','朋友小组',2,8]
].map(([id,name,minParty,maxParty])=>({id,name,minParty,maxParty}));

const OCCUPATIONS = rows(['中学生','大学生','研究生','制造业工人','建筑/维修工','物流配送人员','网约车/出租司机','普通职员','专业技术人员','销售人员','行政文员','基层管理者','企业中层','企业高管','创业经营者','个体商户','自由职业者','教师','医护人员','科研人员','公共服务人员','商场服务人员','旅游从业者','退休人员'],'occupation');
const DINING_MOTIVES = rows(['吃饱即可','省钱','赶时间','方便顺路','工作餐','学习间隙','社交聚会','家庭聚餐','商务沟通','约会','庆祝','尝鲜','打卡','追求口味','追求品质','追求健康','解馋','夜宵','早餐','喝咖啡休息','下午茶','游客体验','外卖宅家','团购核销'],'motive');
const TASTE_PROFILES = rows(['清淡','咸鲜','香辣','麻辣','酸辣','甜口','鲜香','炭烤风味','酱香','蒜香','葱香','汤鲜','肉食偏好','蔬菜偏好','面食偏好','米饭偏好','海鲜偏好','地方菜偏好','西式简餐偏好','甜品偏好','咖啡偏好','茶饮偏好','早餐偏好','夜宵偏好'],'taste');
const CHANNEL_HABITS = rows(['堂食优先','堂食为主偶尔外卖','堂外均衡','外卖优先','纯外卖倾向','到店自取','路过即买','商场顺带','工作地点附近','学校附近','社区附近','地铁/车站附近','团购后到店','会员到店','短视频种草到店','朋友推荐到店','地图搜索到店','平台搜索下单'],'channel');
const TIME_PATTERNS = rows(['早餐高峰','上午加餐','午餐早峰','午餐正峰','午餐晚峰','下午茶','晚餐早峰','晚餐正峰','晚餐晚峰','夜宵','深夜','全天分散','工作日集中','周末集中','节假日集中','随机弹性'],'time');
const DECISION_BIASES = rows(['价格锚定','销量从众','高评分偏好','近距离偏好','熟店偏好','新品尝试','优惠券驱动','套餐驱动','招牌菜驱动','图片颜值驱动','品牌驱动','朋友推荐驱动','达人推荐驱动','排队反向吸引','排队厌恶','高价=高品质认知','低价警惕','大份量偏好','小份多样偏好','菜单简洁偏好'],'bias');
const REVIEW_STYLES = rows(['几乎不评价','满意才评价','不满才评价','评分理性','打分偏宽松','打分偏严格','爱写长评','只打星','爱晒图','关注性价比','关注味道','关注服务','关注卫生','关注环境','关注速度','容易受平台提示影响'],'review');
const PRICE_SENSITIVITY_PROFILES = rows(['极高价格敏感','高价格敏感','中高价格敏感','中等价格敏感','中低价格敏感','低价格敏感','极低价格敏感','优惠敏感但非低价','套餐敏感','会员价敏感','历史价敏感','竞品价敏感'],'price_profile');
const QUEUE_PROFILES = rows(['几乎不排队','最多5分钟','最多8分钟','最多12分钟','最多15分钟','最多20分钟','最多30分钟','美食可等','社交可等','高端预约可等','外卖超时敏感','赶时间零容忍'],'queue');
const LOYALTY_PROFILES = rows(['完全随机选择','弱忠诚','有优惠就换','口味稳定则复购','位置便利则复购','品牌忠诚','会员忠诚','熟客关系忠诚','家庭固定店','工作日固定店','早餐固定店','强习惯复购'],'loyalty');
const SOCIAL_INFLUENCE_TYPES = rows(['几乎不受影响','朋友推荐','家庭意见','同事推荐','同学推荐','社区口碑','平台评分','销量排行','短视频达人','本地博主','头部达人','明星/名人','排队现象','朋友圈晒图','团购榜单','品牌知名度','门店视觉','媒体报道','商圈热度','熟客口碑'],'social');
const COMPLAINT_TRIGGERS = rows(['价格明显偏高','涨价过快','分量不足','口味不稳定','太咸','太油','太辣','太淡','食材不新鲜感','温度不合适','出餐慢','排队过久','漏单','错单','缺货','服务冷淡','服务过度打扰','环境嘈杂','卫生观感差','桌面清洁差','餐具观感差','异味','空调不适','座位拥挤','停车困难','取餐混乱','外卖撒漏','外卖送达慢','包装简陋','图片与实物差距','优惠规则复杂','结账等待久'],'complaint');
const DELIGHT_TRIGGERS = rows(['价格超预期','分量超预期','口味惊喜','食材新鲜','出餐很快','服务热情','主动解决问题','环境舒适','卫生干净','停车方便','取餐顺畅','包装精致','免费小菜','免费饮水','意外赠品','会员福利','生日惊喜','儿童友好','老人友好','宠物友好区域','安静座位','有包间','有外摆','夜景好','招牌菜稳定','新品好吃','排队管理好','预订顺畅','菜品选择丰富','菜单简单易懂','退款处理爽快','性价比明显'],'delight');
const PARTY_PURPOSES = rows(['独自快餐','情侣约会','朋友小聚','家庭便饭','家庭聚餐','亲友庆祝','商务简餐','商务宴请','同事聚餐','同学聚餐','社团活动','生日聚会','旅游团小组','看比赛聚餐','夜宵局','下午茶聊天'],'party');
const DIETARY_PREFERENCES = rows(['无特殊偏好','少油','少盐','少辣','重辣','不要香菜','少糖','无糖饮品','高蛋白偏好','蔬菜多一些','主食少一些','主食多一些','小份偏好','大份偏好','素食偏好','不吃海鲜','不吃内脏','清真友好需求'],'diet');

const DISTRICT_MIXES = {
 university:{student_budget:18,student_social:13,student_night:10,young_office_lunch:4,discount_hunter:8,groupbuy_hunter:7,late_night_social:6,coffee_daily:4,tea_daily:7,trend_chaser:6},
 cbd:{young_office_lunch:13,office_efficiency:12,office_quality:10,business_dining:8,business_travel:7,coffee_daily:7,premium_experience:4,premium_brand:4,entrepreneur:5,commuter:7},
 hightech:{young_office_lunch:12,office_efficiency:12,office_quality:9,healthy_light:7,fitness:5,coffee_daily:7,delivery_heavy:8,freelancer:5,entrepreneur:5,review_reader:5},
 oldtown:{elderly_local:10,elderly_health:7,community_regular:12,family_value:10,local_cuisine:9,budget_retiree:8,habit_regular:8,worker_meal:6,small_eater:4,breakfast_fast:6},
 village:{worker_meal:12,industrial_worker:6,family_value:10,community_regular:12,discount_hunter:8,breakfast_fast:7,late_night_social:6,spicy_lover:5,big_eater:5,budget_retiree:5},
 market:{worker_meal:12,courier_driver:8,community_regular:10,discount_hunter:10,breakfast_fast:8,big_eater:5,local_cuisine:6,small_eater:4,elderly_local:7,commuter:5},
 industry:{industrial_worker:16,worker_meal:14,night_shift:9,courier_driver:7,big_eater:8,breakfast_fast:7,discount_hunter:7,delivery_heavy:5,commuter:5,late_night_social:4},
 scenic:{tourist_try:16,tourist_convenience:12,scenic_family:10,event_crowd:6,foodie:8,trend_chaser:6,family_weekend:7,review_reader:6,business_travel:4,celebration:3}
};

const MEAL_BUDGET_BASE = {
 breakfast:[6,22],lunch:[12,48],afternoon:[10,45],dinner:[16,78],late_night:[12,68],coffee_tea:[8,42],family:[60,320],business:[80,600],celebration:[120,900]
};

module.exports={SEGMENTS,INCOME_BANDS,HOUSEHOLD_TYPES,OCCUPATIONS,DINING_MOTIVES,TASTE_PROFILES,CHANNEL_HABITS,TIME_PATTERNS,DECISION_BIASES,REVIEW_STYLES,PRICE_SENSITIVITY_PROFILES,QUEUE_PROFILES,LOYALTY_PROFILES,SOCIAL_INFLUENCE_TYPES,COMPLAINT_TRIGGERS,DELIGHT_TRIGGERS,PARTY_PURPOSES,DIETARY_PREFERENCES,DISTRICT_MIXES,MEAL_BUDGET_BASE};
