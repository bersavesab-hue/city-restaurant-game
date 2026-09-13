'use strict';

/**
 * 隐藏人物 / 彩蛋包 V1.0
 * 目标：稀有、可发现、不过度奖励、不破坏经营平衡。
 * 规则：每个隐藏人物保留 2~3 个签名特征，其余性格/背景/缺点/习惯仍由人物包组合生成。
 */
const VERSION='1.0.0';

function hidden(id,name,alias,roleId,ageRange,genderId,rarity,signatureTraits,axisBands,trigger,rewards,clues=[]){
  return {id,name,alias,roleId,ageRange,genderId,rarity,signatureTraits,axisBands,trigger,rewards,clues,tags:['hidden_character','easter_egg']};
}

const HIDDEN_CHARACTERS=[
  hidden('shen_zhiwei','沈知味','挑剔老饕','regular_customer',[58,66],'male',0.012,
    ['conscientiousness_5','quality_minded','patience_5'],{conscientiousness:[70,92],patience:[66,90],integrity:[58,86]},
    {minDays:18,minQuality:68,minReviewCount:20,maxRecentAdSpend:1200},
    {type:'insight',qualityInsight:6,reputation:1},
    ['有人连续三次点同一道招牌菜','评价里出现“火候很稳但还有一点余地”']),
  hidden('ye_qingyan','叶青砚','流动主厨','senior_chef_role',[34,43],'female',0.010,
    ['openness_5','conscientiousness_4','risk_4'],{openness:[66,90],conscientiousness:[62,88],risk:[52,75]},
    {minDays:25,staffShortage:1,minStoreQuality:62,maxChefReserve:1},
    {type:'temporary_staff',days:14,trainingBoost:5},
    ['招聘市场出现一份没有联系电话的手写履历','附近同行提到“有个只短期帮店的厨师”']),
  hidden('xu_sanxian','许三鲜','菜场老行家','wholesaler',[50,61],'male',0.014,
    ['frugality_5','patience_4','conscientiousness_4'],{frugality:[68,95],patience:[58,84],risk:[30,58]},
    {supplierComparisons:3,earlyMarketVisits:2,minDays:10},
    {type:'supplier_lead',costVarianceReduction:4,oneOffDiscountPct:3},
    ['凌晨采购时有人提醒你“别只看今天的菜价”','连续比价后出现一张没有抬头的批发清单']),
  hidden('luo_qihao','罗七码','七号骑手','delivery_rider',[26,34],'male',0.012,
    ['extraversion_4','patience_4','openness_4'],{extraversion:[55,82],patience:[58,82],openness:[55,82]},
    {deliveryOrders:80,rainyNightOrders:12,minDays:12},
    {type:'delivery_intel',deliveryEtaReductionPct:3,deliveryAreaInsight:1},
    ['雨天有一位骑手总能比平台预计时间更早到店','后台连续出现尾号“07”的高准时率配送单']),
  hidden('qian_boheng','钱伯衡','铁算盘','accountant',[54,63],'male',0.011,
    ['conscientiousness_5','frugality_5','stability_4'],{conscientiousness:[72,94],frugality:[70,96],stability:[60,84]},
    {cashflowWarningDays:7,minRevenueDays:20,minDays:20},
    {type:'audit',costLeakInsight:1,operatingCostReductionPct:1.5},
    ['账本里连续几天出现同一种小额漏损','一个老会计在附近店里帮人算过盈亏平衡点']),
  hidden('lin_banxia','林半夏','无名熟客','regular_customer',[24,31],'female',0.013,
    ['agreeableness_4','stability_4','patience_4'],{agreeableness:[56,82],stability:[56,84],patience:[55,84]},
    {stableQualityDays:30,minRepeatRate:18,minDays:35},
    {type:'word_of_mouth',localWordOfMouth:4,repeatRateBoost:1},
    ['同一位顾客每周都坐在差不多的位置','附近居民问“是不是有人一直推荐你家”']),
  hidden('gu_wensheng','顾闻声','旧城编辑','media_editor',[31,39],'male',0.008,
    ['openness_5','integrity_4','conscientiousness_4'],{openness:[68,92],integrity:[58,86],conscientiousness:[58,84]},
    {minOrganicReputation:72,maxRecentAdSpend:800,minDays:40},
    {type:'media_observation',organicReach:5,reputation:2},
    ['有人连续两次问菜的来历，却没有拍短视频','本地小刊物最近在写“城市里的普通好店”']),
  hidden('cheng_beidou','程北斗','旧店掌柜','consultant',[43,52],'male',0.010,
    ['patience_5','stability_4','integrity_4'],{patience:[68,92],stability:[58,82],integrity:[60,86]},
    {storeCount:2,expansionPressure:55,minDays:50},
    {type:'expansion_warning',cannibalizationInsight:1,managementCapacityInsight:1},
    ['有个关过两次店的老板总在看你新店位置','商圈里有人说“扩张不是多开门，是多管人”']),
  hidden('zhou_wanqing','周晚晴','雨夜房东','landlord',[37,46],'female',0.007,
    ['stability_4','negotiation_9','integrity_4'],{stability:[58,84],integrity:[52,80],risk:[38,62]},
    {rainyPropertySearches:3,viewedListings:18,minDays:25},
    {type:'property_lead',specialListing:1,negotiationWindowPct:4},
    ['雨天看铺时，中介提过一套“房东不太挂平台”的铺','同一条街有个门面总在下雨时亮灯']),
  hidden('tang_he','唐禾','学生社群组织者','business_customer',[21,26],'female',0.014,
    ['extraversion_5','openness_4','agreeableness_4'],{extraversion:[68,90],openness:[58,86],agreeableness:[58,84]},
    {districtId:'university',studentShare:45,minDays:12},
    {type:'group_demand',studentGroupDemandInsight:1,offPeakDemandBoost:2},
    ['有人一次订了18份餐却要求分成3个时间取','校园群里开始出现你的店名，但不是广告']),
  hidden('bai_zangchuan','白藏川','沉默投资人','investor',[40,49],'male',0.004,
    ['stability_5','conscientiousness_5','risk_4'],{stability:[70,92],conscientiousness:[68,92],risk:[50,72]},
    {storeCount:6,minProfitDays:90,minCashflowScore:70,minDays:120},
    {type:'capital_test',financingInsight:1,governanceInsight:1},
    ['有人连续几周只看你的经营数据，不谈投资','一张名片只写了姓名和一个固定电话']),
  hidden('mo_yuanshan','莫远山','夜面师傅','senior_chef_role',[63,71],'male',0.006,
    ['patience_6','conscientiousness_5','integrity_5'],{patience:[76,97],conscientiousness:[68,92],integrity:[70,94]},
    {lateNightOpenDays:12,noodleSales:220,minDays:28,hourFrom:23,hourTo:2},
    {type:'recipe_memory',noodleProcessInsight:1,prepWasteReductionPct:2},
    ['深夜有人只点清汤面，不加任何配料','连续几天打烊前都有人问“汤底几点起锅”'])
];

const EASTER_EVENTS=[
  ['old_menu_back','旧菜单背面','拆旧招牌时发现上一任租户留下的手写菜单，可看到几年前的价格带。','property_history',0.012],
  ['thousandth_order','第1000单小票','第1000笔有效订单自动保留一张纪念小票，只给少量团队士气。','milestone',1],
  ['rain_last_order','雨夜最后一单','暴雨夜打烊前最后一位顾客留下极短评价，若服务稳定会形成一次小型口碑传播。','customer',0.010],
  ['market_last_crate','菜市场最后一筐','收市前遇到一批品相一般但新鲜度合格的尾货，可低价采购但不能无限触发。','supply',0.012],
  ['old_signboard','旧招牌夹层','更换门头时发现旧店招夹层里的合照和开业日期，解锁该铺的历史档案。','property_history',0.008],
  ['silent_table','一桌安静的客人','四位客人几乎不聊天但把所有菜吃完，评价权重偏向稳定性而不是网红感。','customer',0.010],
  ['wrong_change','多找的一元钱','收银系统发现一笔多找零，主动纠正会轻微提升诚信记忆。','staff',0.009],
  ['midnight_light','凌晨后厨灯','连续晚班后，后厨里仍有人主动整理第二天备料，触发员工责任心记忆。','staff',0.008],
  ['same_seat','总坐同一张桌','某位普通熟客连续8次选择同一座位，解锁“个人偏好座位”记录。','customer',0.014],
  ['empty_bowl','一只干净的碗','没有文字评价，但顾客把汤喝完并在一周内再次出现。','customer',0.015],
  ['first_profit_day','第一天真正赚钱','首次单日扣除全部变动成本和固定摊销后仍为正利润，记录为经营里程碑。','milestone',1],
  ['competitor_copy_photo','相似的菜单照片','附近新店出现高度相似的套餐照片，只作为竞对模仿线索，不直接扣玩家属性。','competition',0.006],
  ['old_supplier_card','旧供应商名片','仓库角落发现上一任租户留下的供应商名片，可作为比价线索。','supply',0.010],
  ['no_discount_customer','不领券的熟客','有顾客连续多次不使用优惠券仍复购，说明品牌依赖度开始出现。','customer',0.010],
  ['staff_birthday_no_banner','没写在排班表上的生日','同事自己凑钱买了小蛋糕，轻微影响团队关系，不强制玩家消费。','staff',0.007],
  ['closing_time_queue','打烊前五分钟','打烊前突然出现一小波客流，考验是否接单与产能，不直接给固定奖励。','operation',0.009]
].map(([id,name,description,kind,baseChance])=>({id,name,description,kind,baseChance,tags:['easter_event']}));

function stats(){
  return {version:VERSION,hiddenCharacters:HIDDEN_CHARACTERS.length,easterEvents:EASTER_EVENTS.length};
}

module.exports={VERSION,HIDDEN_CHARACTERS,EASTER_EVENTS,stats};
