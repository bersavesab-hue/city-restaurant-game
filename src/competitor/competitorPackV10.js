'use strict';

function rows(names, prefix, extra = {}) {
  return names.map((name, i) => ({ id: `${prefix}_${i + 1}`, name, weight: 1, ...extra }));
}

// 64个经营原型：不是64个固定NPC，而是AI行为骨架。
const ARCHETYPE_ROWS = [
  ['steady','稳健经营者',16,28,28,30,62,38,42,54],['price','价格进攻型',11,74,52,84,38,66,58,66],['quality','品质主义型',10,34,30,18,92,22,54,50],['follower','快速跟随型',9,56,54,58,48,92,56,82],
  ['marketing','流量营销型',8,68,56,50,54,62,92,70],['expansion','激进扩张型',6,78,94,64,46,56,72,68],['conservative','保守守成型',8,18,16,12,68,18,28,36],['community','社区深耕型',8,34,32,28,72,32,52,56],
  ['craft','手艺人型',7,22,16,10,96,12,24,28],['chain','标准连锁型',6,56,82,46,76,46,64,76],['franchise','加盟扩张型',4,64,90,44,58,42,74,72],['capital','资本驱动型',3,76,90,76,56,64,90,80],
  ['site_hunter','选址猎手型',5,60,72,40,62,44,48,62],['delivery','外卖效率型',5,54,58,70,48,58,68,82],['premium','高端品牌型',4,44,38,14,94,18,80,50],['trend','潮流追逐型',5,68,64,58,52,82,94,74],
  ['data','数据运营型',5,48,64,46,72,62,74,94],['supply','供应链优势型',4,44,66,56,76,40,54,72],['family','夫妻家族店型',10,20,18,20,64,24,20,30],['veteran','老字号守擂型',4,30,18,16,90,14,48,42],
  ['opportunist','机会主义型',5,68,70,68,42,86,60,72],['niche','细分品类型',5,40,36,20,84,34,46,58],['turnaround','接盘改造型',3,56,60,48,66,54,50,68],['regional','区域龙头型',2,74,84,56,80,46,84,82],
  ['breakfast','早餐效率型',5,42,44,42,58,44,48,66],['late_night','夜宵占位型',4,62,58,54,52,62,70,60],['banquet_sales','宴会销售型',3,58,44,24,82,22,72,56],['canteen','团餐承包型',3,40,62,44,60,32,36,64],
  ['mall_operator','商场运营型',3,52,62,34,72,38,70,66],['street_fighter','街区守点型',5,70,44,72,56,54,42,58],['delivery_factory','外卖工厂型',3,56,72,82,38,72,64,76],['cloud_kitchen','共享厨房型',3,48,74,76,42,80,70,84],
  ['chef_star','主厨IP型',3,50,34,16,94,28,86,48],['influencer_brand','网红主理人型',3,72,58,52,50,76,96,72],['low_rent','低租金生存型',5,34,36,60,48,40,28,56],['high_turnover','高周转快餐型',5,54,68,66,52,58,50,78],
  ['menu_lab','菜单研发型',3,46,48,30,88,50,62,80],['single_product','单品极致型',4,44,50,34,92,42,54,68],['broad_menu','全品类覆盖型',3,48,44,34,64,46,48,56],['seasonal','季节机会型',3,58,54,44,60,70,66,74],
  ['tourist_capture','游客截流型',3,70,52,50,54,64,82,62],['office_lunch','白领午餐型',5,46,52,56,66,48,52,76],['student_value','学生性价比型',5,58,48,78,44,72,66,70],['family_dining','家庭聚餐型',5,42,44,24,78,34,56,60],
  ['healthy','健康轻食型',3,38,42,20,82,46,72,72],['bakery_cafe','烘焙咖啡型',3,44,50,24,86,48,78,68],['hotpot_chain','火锅连锁型',3,62,76,52,74,52,74,72],['bbq_chain','烧烤连锁型',3,66,70,58,64,60,78,68],
  ['local_cuisine','地方菜传承型',4,38,42,18,90,32,52,50],['fusion','融合创新型',3,54,52,30,78,66,82,84],['premium_service','高服务体验型',3,40,38,14,90,20,70,58],['cost_engineer','成本工程型',4,52,64,74,60,52,44,86],
  ['procurement_power','采购压价型',3,58,68,70,62,46,48,72],['talent_poacher','人才争夺型',3,72,66,52,68,48,56,64],['location_blocker','铺位封锁型',2,82,78,62,58,50,62,70],['brand_defender','品牌防御型',3,66,46,34,84,30,74,62],
  ['multi_brand','多品牌矩阵型',2,64,88,48,72,54,82,86],['acquirer','并购整合型',2,72,86,58,68,60,80,84],['asset_heavy','重资产持有型',2,48,54,22,74,28,46,60],['asset_light','轻资产高速型',3,66,90,62,56,62,82,78],
  ['platform_native','平台流量型',3,64,70,68,46,70,94,86],['member_private','会员私域型',3,46,54,30,78,34,76,74],['operations_elite','精益运营型',3,48,66,44,78,42,60,92],['turnover_repair','困境重整型',2,52,42,36,72,38,46,76]
];
const ARCHETYPES = ARCHETYPE_ROWS.map(([id,name,weight,aggression,expansionDesire,priceWarTolerance,qualityFocus,imitationAbility,marketingAbility,learningAbility]) => ({
  id,name,weight,tags:[`strategy_${id}`],aggression,expansionDesire,priceWarTolerance,qualityFocus,imitationAbility,marketingAbility,learningAbility,
  cashRange: ['capital','regional','multi_brand','acquirer','asset_heavy'].includes(id) ? [2500000,45000000] : ['chain','franchise','hotpot_chain','mall_operator','asset_light'].includes(id) ? [700000,15000000] : ['family','craft','breakfast','low_rent'].includes(id) ? [50000,700000] : [100000,4500000]
}));

const BRAND_POSITION_ROWS = [
  ['ultra_budget','极致性价比',0.68,.16],['budget_meal','大众快餐',.82,.24],['worker_meal','工薪工作餐',.78,.26],['student_meal','学生餐',.76,.24],['community','社区餐食',.95,.42],['breakfast','早餐便民',.72,.28],
  ['noodles','粉面主食',.86,.30],['rice_bowl','盖饭简餐',.88,.30],['dumpling','饺子馄饨',.92,.34],['specialty','特色单品',1.05,.50],['quality_casual','品质简餐',1.20,.62],['family_dining','家庭聚餐',1.12,.56],
  ['local_cuisine','地方菜',1.28,.66],['home_style','家常菜',1.02,.48],['hotpot','火锅聚餐',1.30,.48],['bbq','烧烤夜宵',1.08,.38],['late_night','夜宵经济',1.06,.36],['healthy','健康轻食',1.26,.58],
  ['bakery','烘焙甜品',1.14,.52],['tea','茶饮',1.08,.28],['coffee','咖啡',1.35,.46],['dessert','甜品',1.16,.40],['delivery_first','外卖专门店',.92,.26],['cloud_kitchen','纯外卖多品牌',.84,.34],
  ['mall_chain','商场连锁',1.38,.68],['office_lunch','商务简餐',1.42,.62],['business_dining','商务餐饮',1.62,.78],['premium','中高端餐饮',1.55,.76],['fine_dining','精致餐饮',2.35,.90],['banquet','宴会酒楼',2.10,.82],
  ['seafood','海鲜餐饮',1.72,.62],['buffet','自助餐',1.48,.54],['family_buffet','家庭自助',1.34,.48],['theme','主题餐厅',1.44,.58],['trend','网红潮流',1.16,.34],['chef_ip','主厨品牌',1.86,.84],
  ['tourist','游客餐饮',1.42,.46],['scenic','景区特色餐',1.58,.52],['regional_chain','区域连锁',1.18,.64],['national_chain','全国标准连锁',1.22,.76],['old_brand','老字号',1.46,.86],['signature_brand','招牌品牌店',1.72,.84],
  ['canteen','团餐食堂',.74,.58],['school_canteen','校园餐饮',.70,.60],['enterprise_canteen','企业团餐',.82,.64],['airport_station','枢纽餐饮',1.34,.66],['premium_cafe','高端咖啡烘焙',1.72,.76],['multi_brand_group','多品牌集团',1.32,.82]
];
const BRAND_POSITIONS = BRAND_POSITION_ROWS.map(([id,name,targetPriceIndex,copyDifficulty],i)=>({id,name,weight:Math.max(2,16-i*.22),tags:[`position_${id}`],targetPriceIndex,copyDifficulty}));

const OWNERSHIP_TYPES = [
  ['sole','个体独资',20,20,88,24],['couple','夫妻店',16,18,80,28],['family','家族经营',12,30,64,40],['friend_partnership','朋友合伙',8,38,62,42],['chef_partnership','厨师合伙',7,36,68,40],['investor_partnership','投资人合伙',6,58,56,54],
  ['small_company','小型餐饮公司',12,54,66,58],['studio_brand','主理人工作室',6,48,74,50],['regional_chain','区域连锁公司',9,68,58,72],['franchise_company','加盟运营公司',6,74,62,68],['brand_management','品牌管理公司',5,76,58,76],['supply_backed','供应链公司孵化',4,72,60,74],
  ['platform_backed','平台流量孵化',3,80,58,70],['mall_incubated','商场孵化品牌',3,66,52,68],['food_factory','食品企业延伸',3,82,48,80],['hospitality_group','酒店餐饮集团',3,86,44,84],['group','餐饮集团',4,90,48,86],['multi_brand_group','多品牌餐饮集团',3,94,44,90],
  ['investment_backed','投资机构支持',3,98,52,80],['listed_group','上市餐饮集团',1,100,40,94],['state_collective','机构/集体经营',2,74,34,88],['school_operator','校园后勤运营商',2,70,38,86],['canteen_contractor','团餐承包公司',3,78,46,82],['asset_company','商业资产公司自营',2,92,42,88]
].map(([id,name,weight,capitalAccess,decisionSpeed,governance])=>({id,name,weight,capitalAccess,decisionSpeed,governance}));

const LIFE_STAGES = [
  {id:'idea',name:'筹备考察',minStores:0,maxStores:0},{id:'newborn',name:'新店初创',minStores:1,maxStores:1},{id:'survival',name:'生存磨合',minStores:1,maxStores:2},{id:'stable',name:'稳定经营',minStores:1,maxStores:4},
  {id:'local_growth',name:'本地扩张',minStores:2,maxStores:10},{id:'city_chain',name:'城市连锁',minStores:6,maxStores:20},{id:'regional',name:'区域连锁',minStores:15,maxStores:45},{id:'regional_leader',name:'区域龙头',minStores:35,maxStores:90},
  {id:'mature_chain',name:'成熟连锁',minStores:70,maxStores:160},{id:'multi_city',name:'跨城连锁',minStores:120,maxStores:320},{id:'group',name:'集团化经营',minStores:250,maxStores:800},{id:'national_group',name:'全国集团',minStores:600,maxStores:99999}
];

const SITE_PREFERENCES = rows(['高客流优先','低租金优先','高性价比铺位','学校周边','办公区优先','社区稳定客流','交通枢纽','夜间经济','商场综合体','市场周边','工业园工作餐','景区游客','竞对附近截流','避开同质竞对','成熟餐饮铺','大面积旗舰位','外卖骑手便利','停车便利','地铁步行圈','宽门头优先','转角铺优先','有外摆优先','原餐饮硬件优先','低转让费优先','长免租期优先','新商场首批招商','成熟商圈守点','新兴商圈提前布局','高收入客群','高人口密度','低饱和品类空白','品牌形象匹配'],'site');
const EXPANSION_STRATEGIES = rows(['单店打磨','同商圈密集开店','相邻商圈扩张','城市环状扩张','中心向郊区扩张','郊区向中心升级','高校周边复制','办公区复制','社区网格化','交通枢纽布局','商场跟随扩张','直营优先','加盟优先','直营加盟混合','联营扩张','合资扩张','城市代理','区域代理','低租金扫铺','核心铺位卡位','收购现成门店','接盘改造','并购小品牌','多品牌扩张','单品多店','大店旗舰驱动','小店高密度','外卖卫星店','中央厨房半径扩张','跨城试点','异地旗舰先行','成熟后再扩张'],'expand');
const MENU_STRATEGIES = rows(['少SKU爆品','单品极致','经典稳定菜单','季节轮换','高频上新','跟随热品','本地口味适配','区域特色菜单','大众口味优先','健康轻食','高毛利组合','低价引流品','高低价格梯度','套餐驱动','家庭多人套餐','商务套餐','学生套餐','工作餐套餐','夜宵菜单','早餐菜单','全天候菜单','外卖专属菜单','堂食专属菜单','双菜单策略','小份多选','大份性价比','主食+小吃组合','饮品搭售','甜品搭售','自助模式','宴会菜单','预制标准化','现炒品质型','地方菜传承','跨品类融合','数据淘汰SKU'],'menu');
const MARKETING_STRATEGIES = rows(['几乎不营销','门店自然流量','社区口碑','会员私域','微信群运营','老客转介绍','地推传单','开业折扣','周期优惠券','团购套餐','平台流量投放','竞价广告','短视频内容','达人探店','头部达人爆发','直播促销','节日营销','联名活动','商场联合活动','企业团购','校园社群','写字楼企业合作','异业合作','积分会员','储值会员','生日权益','新品尝鲜','爆品话题','品牌故事','主厨IP','公益社区活动','城市事件借势'],'marketing');
const DELIVERY_STRATEGIES = rows(['不做外卖','外卖补充堂食','堂外均衡','外卖优先','纯外卖店','高峰外卖限单','低价外卖引流','高客单外卖','平台双开','多平台分散','自配送','骑手友好取餐','远距离配送','近距离高密度','外卖专属SKU','外卖专属价格','午晚峰外卖','夜宵外卖'],'delivery');
const SUPPLY_STRATEGIES = rows(['菜市场现采','批发市场采购','固定供应商','多供应商分散','长期合同锁价','现货低价采购','品质优先采购','本地农户直采','产地直采','品牌食材','进口食材','中央仓集采','中央厨房配送','半成品标准化','自建加工中心','供应商账期','联合采购','库存极简'],'supply');
const STAFFING_STRATEGIES = rows(['老板亲自盯店','夫妻共同经营','亲友用工','熟人厨师班底','社会招聘','高薪挖人','培养学徒','内部晋升','店长储备计划','区域经理体系','兼职弹性用工','学生兼职','小时工','外包保洁','外包配送','高底薪留人','低底薪高绩效','高提成销售','师傅带徒弟','标准化低技能岗位'],'staff');
const FINANCE_STYLES = rows(['现金为王','适度负债','高杠杆扩张','利润再投资','保守分红','激进分红','外部融资优先','门店自我造血','重资产持有','轻资产租赁','加盟回款优先','供应商账期型','快速回本型','长期回报型','高现金储备','低现金高周转','设备融资租赁','银行贷款型','股东借款型','利润中心管理','门店独立核算','总部集中核算','预算刚性','机会投资型'],'finance');
const CAPITAL_STRATEGIES = rows(['拒绝外部资本','亲友借款','银行贷款','供应商信用','股东增资','天使投资','产业资本','财务投资人','战略投资人','品牌加盟融资','区域合伙融资','资产抵押融资','并购融资','可转债式融资','利润滚动扩张','上市集团内部资金'],'capital');
const PRICE_STYLES = rows(['价格跟随','长期低价','稳定中价','品质溢价','高端定价','爆品低价引流','套餐锚定','分时定价','外卖堂食差异价','促销脉冲','会员优惠','很少改价','竞争店开业降价','工作日低价','周末溢价','午市特价','夜宵特价','小份低门槛','大份高性价比','第二件优惠','多人套餐折扣','新品尝鲜价','季节性涨价','原料联动调价','租金压力提价','高峰限优惠','区域差异价','心理价位尾数'],'price');
const COPY_STYLES = rows(['不主动模仿','只参考品类','参考价格带','参考套餐','参考爆品','参考营业时段','参考选址','参考营销方式','参考外卖结构','参考装修氛围','参考服务流程','参考供应链','参考门店面积','参考客群定位','参考会员机制','参考促销节奏','参考上新速度','参考菜单结构','参考出餐流程','参考招聘岗位','参考配送半径','参考品牌表达','局部快速跟进','整体快速跟进'],'copy');
const CRISIS_STRATEGIES = rows(['先观察再处理','立即降本','主动关低效店','降价保客流','提价保毛利','收缩营销','加大营销自救','裁减非核心岗位','保核心员工','换店长','更换厨师团队','缩减菜单','淘汰低效菜','更换供应商','谈判降租','迁址','出售门店','引入投资','增加借款','暂停扩张','品牌公关','补偿顾客','全面整改','战略退出品类'],'crisis');

const OPERATING_STRENGTHS = rows(['标准化出餐','菜品研发','成本控制','采购议价','供应链稳定','店长培养','选址判断','流量营销','私域会员','外卖运营','服务体验','高峰调度','卫生管理','品质稳定','员工留存','门店复制','品牌设计','社区关系','宴会销售','数字化运营','资金管理','快速装修','产品上新','本地口碑','早餐效率','夜宵运营','翻台率管理','客单提升','连带销售','会员复购','员工培训','厨师团队稳定','后厨布局','设备利用率','损耗控制','库存周转','菜单工程','团餐销售','企业客户','校园渠道','商场关系','物业谈判','租金谈判','项目拓展','加盟管理','区域督导','中央厨房','冷链配送','原料锁价','爆品打造','内容营销','达人资源','品牌公关','危机处理','多品牌管理','并购整合','财务预算','数据分析','顾客洞察','跨城复制'],'strength');
const OPERATING_WEAKNESSES = rows(['资金薄弱','店长不足','后厨效率低','员工流失高','过度依赖老板','成本失控','租金负担重','菜单过宽','产品单一','营销依赖高','平台依赖高','服务不稳定','卫生风险','扩张过快','供应链脆弱','价格过低','价格过高','装修投入过重','选址能力弱','数据能力弱','品牌辨识度低','现金流波动','品控跨店下降','管理层内耗','翻台率低','出餐慢','高峰爆单失控','库存积压','损耗高','供应商单一','员工工资偏低','培训不足','店长断层','区域管理薄弱','新品失败率高','老客流失','外卖差评高','堂食体验弱','客单过低','客单过高','促销依赖','优惠取消掉单','加盟失控','加盟商矛盾','跨城水土不服','品牌老化','产品同质化','门店老旧','设备故障多','装修维护差','食安记录差','投诉处理慢','房东关系差','商场扣点压力','债务过高','融资依赖','总部成本膨胀','决策迟缓','老板频繁干预','战略摇摆'],'weakness');
const MARKET_SIGNALS = rows(['连续高利润','持续排队','高复购','短视频热度','外卖爆单','差评增加','客单上涨','客单下降','房租上涨','空铺增加','竞对撤店','新商场开业','学校开学','写字楼入驻','夜间客流上升','原料涨价','平台补贴','大型活动','新地铁开通','道路施工','社区入住','产业园扩招','景区旺季','景区淡季','竞对大促','竞对提价','竞对关店','玩家新店开业','玩家爆品出现','玩家品牌热度','玩家频繁涨价','玩家服务下降','供应商短缺','食品安全舆情','人工成本上涨','商圈饱和'],'signal');

const RESPONSE_ACTIONS = [
  ['observe','继续观察',5,0],['menu_follow','跟进相似菜品',18,1],['bundle_follow','调整套餐结构',16,1],['price_cut','阶段性降价',36,2],['coupon','加大优惠券',26,2],['ads','加大投放',22,2],['influencer','达人推广',28,3],['extend_hours','延长营业时间',20,1],
  ['delivery_push','强化外卖',24,2],['quality_upgrade','升级产品品质',16,2],['service_upgrade','提升服务',12,2],['new_product','推出差异化新品',22,2],['open_nearby','附近开店',42,4],['grab_site','竞争优质铺位',30,3],['poach_staff','高薪招聘同行人才',30,3],['supplier_bid','提高采购条件争取供应',24,2],
  ['retreat','收缩竞争',8,0],['close_store','关闭低效门店',12,1],['raise_price','提价保毛利',18,1],['remove_discount','缩减优惠',14,0],['launch_value_item','推出低价引流品',28,1],['premiumize','推出高端产品线',24,2],['copy_hours','复制营业时段',12,1],['copy_delivery','复制配送结构',18,1],
  ['copy_site','跟随选址',30,3],['copy_decor','参考装修氛围',16,2],['membership_push','强化会员体系',18,2],['private_traffic','建设私域流量',16,2],['community_marketing','加强社区营销',14,1],['corporate_sales','争取企业团餐',20,2],['campus_push','加码校园渠道',20,2],['night_market_push','强化夜宵场景',18,2],
  ['breakfast_push','强化早餐场景',16,2],['menu_cut','精简菜单',12,1],['menu_expand','增加SKU覆盖',18,2],['change_supplier','更换供应商',18,2],['lock_supplier','签长期供应协议',18,3],['train_staff','加强员工培训',12,2],['replace_manager','更换店长',18,2],['delay_expansion','暂停扩张',8,0],
  ['accelerate_expansion','加速扩张',38,4],['buy_store','收购现成门店',44,5],['acquire_brand','收购小品牌',52,5],['launch_subbrand','推出子品牌',42,5],['renegotiate_rent','与房东谈降租',16,1],['relocate','迁址',30,4],['public_relations','品牌公关',20,2],['full_rectification','全面经营整改',24,3]
].map(([id,name,risk,costLevel])=>({id,name,risk,costLevel}));

const CLOSURE_REASONS = rows(['持续亏损','现金流枯竭','租约到期不续','租金上涨','老板退出经营','店长缺失','食安/卫生整改','商圈衰退','产品失去竞争力','过度扩张','债务压力','供应链中断','物业限制变化','集团主动优化','品牌整合','迁址升级','核心厨师离职','员工严重短缺','平台流量崩塌','长期低评分','商场清退','消防整改成本过高','转让费回收','股东分歧','合伙解散','加盟商退出','总部战略调整','区域撤退','品类衰退','竞争过度饱和','产权/租赁纠纷','不可抗经营中断'],'closure');

const OPENING_STAGES = [
  {id:'idea',name:'内部立项',days:[2,10]},{id:'scouting',name:'考察商圈',days:[3,18]},{id:'site_shortlist',name:'筛选铺位',days:[2,14]},{id:'negotiating',name:'谈铺议价',days:[2,20]},
  {id:'signed',name:'已签约',days:[1,7]},{id:'design',name:'设计报审',days:[3,18]},{id:'fitout',name:'装修施工',days:[10,65]},{id:'equipment',name:'设备进场',days:[2,12]},
  {id:'hiring',name:'招聘培训',days:[5,25]},{id:'menu_test',name:'菜单测试',days:[2,10]},{id:'trial',name:'试营业',days:[2,12]},{id:'open',name:'正式营业',days:[0,0]}
];

const RIVALRY_LEVELS = [
  {id:'none',name:'无明显竞争',min:0,max:9},{id:'watch',name:'关注',min:10,max:24},{id:'normal',name:'正常竞争',min:25,max:44},{id:'active',name:'积极竞争',min:45,max:64},{id:'intense',name:'激烈竞争',min:65,max:79},{id:'severe',name:'高压竞争',min:80,max:92},{id:'critical',name:'极端竞争',min:93,max:100}
];

const SIMULATION_TIERS = [
  {id:'core',name:'核心竞对',defaultCount:[8,20],tick:'daily',detail:'full'},
  {id:'local',name:'附近普通竞对',defaultCount:[15,50],tick:'weekly',detail:'medium'},
  {id:'background',name:'城市背景经营主体',defaultCount:[277,730],tick:'monthly',detail:'aggregate'}
];
const CITY_MARKET_SCALE = {businessEntities:[300,800],brands:[180,450],stores:[800,3000],directCompetitors:[15,50],trackedCompetitors:[8,20],regionalBrands:[5,15],nationalBrands:[3,10]};

const NAME_PREFIXES = ['禾','味','山','川','巷','城','家','香','食','鲜','炊','灶','里','一','百','老','新','东','南','北','邻','悦','满','真','好','小','丰','江','海','谷','源','合','聚','鼎','知','云','青','金','福','喜','尚','炭','麦','茶','米','面','汤'];
const NAME_CORES = ['食堂','小馆','饭堂','餐厅','面馆','米线','饭铺','厨房','茶舍','烤肉','烧烤','火锅','小厨','简餐','饭店','食社','餐社','味坊','食集','小院','餐饮','食坊','饭社','茶馆','咖啡','烘焙','酒楼','宴会厅','海鲜城','食府','厨房工坊','餐饮工场'];

module.exports = {
  VERSION:'1.1.0', ARCHETYPES, BRAND_POSITIONS, OWNERSHIP_TYPES, LIFE_STAGES, SITE_PREFERENCES, EXPANSION_STRATEGIES, MENU_STRATEGIES, MARKETING_STRATEGIES,
  DELIVERY_STRATEGIES, SUPPLY_STRATEGIES, STAFFING_STRATEGIES, OPERATING_STRENGTHS, OPERATING_WEAKNESSES, MARKET_SIGNALS, RESPONSE_ACTIONS, FINANCE_STYLES,
  CAPITAL_STRATEGIES, PRICE_STYLES, COPY_STYLES, CRISIS_STRATEGIES, CLOSURE_REASONS, OPENING_STAGES, RIVALRY_LEVELS, SIMULATION_TIERS, CITY_MARKET_SCALE,
  NAME_PREFIXES, NAME_CORES
};
