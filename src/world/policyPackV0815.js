'use strict';

/**
 * 政策包：16 个领域 × 10 个政策模板 = 160。
 * 均为游戏内虚构城市政策机制，不映射现实城市当期具体政策。
 */

const POLICY_DOMAINS = [
  {
    id:'food_safety',
    name:'食品安全',
    measures:['进货台账强化','冷链记录规范','食材留样规范','餐具消毒规范','后厨透明化','食品标签整治','健康证核验','高风险食材抽检','网络餐饮食安检查','小餐饮规范提升'],
    modifiers:{complianceCostMultiplier:0.05,inspectionRisk:0.10,reputationMultiplier:0.02}
  },
  {
    id:'fire',
    name:'消防安全',
    measures:['燃气安全检查','消防通道整治','灭火器材更新','电气线路排查','厨房防火检查','商场餐饮消防复核','夜间经营消防巡查','小微餐饮消防辅导','应急演练计划','装修消防备案优化'],
    modifiers:{complianceCostMultiplier:0.04,inspectionRisk:0.08}
  },
  {
    id:'environment',
    name:'环保',
    measures:['餐饮噪声治理','污水排放规范','一次性用品减量','节能设备鼓励','绿色餐饮示范','厨余垃圾减量','节水行动','商圈环境提升','环保设备补贴','餐饮清洁生产计划'],
    modifiers:{utilityCostMultiplier:0.03,complianceCostMultiplier:0.03}
  },
  {
    id:'labor',
    name:'劳动用工',
    measures:['劳动合同规范','工时记录规范','高温劳动保护','夜班劳动保护','餐饮从业培训','灵活用工备案','实习用工规范','工资支付检查','员工休息保障','技能人才培训补贴'],
    modifiers:{laborCostMultiplier:0.05,capacityMultiplier:0.02}
  },
  {
    id:'wage_social',
    name:'工资社保',
    measures:['最低工资调整','社保缴费提醒','小微企业社保缓缴','就业补贴','稳岗补贴','青年就业补贴','技能提升补贴','困难岗位补助','用工服务专项','餐饮人才引进计划'],
    modifiers:{laborCostMultiplier:0.06}
  },
  {
    id:'commercial_lease',
    name:'商业租赁',
    measures:['租赁合同示范文本','商铺押金规范','续租协商机制','商场租金透明倡议','小微商户租金纾困','空置商铺盘活','老街商铺改造','租赁纠纷调解','商圈物业费规范','创业门店租金补贴'],
    modifiers:{rentCostMultiplier:0.06}
  },
  {
    id:'night_economy',
    name:'夜间经营',
    measures:['夜间消费季','夜市延时经营','夜间公交配套','夜间停车优化','夜间餐饮示范街','深夜食堂计划','夜间文旅联动','夜间消费券','夜间保洁加强','夜间安全巡查'],
    modifiers:{demandMultiplier:0.08,nightDemandMultiplier:0.15,laborCostMultiplier:0.02}
  },
  {
    id:'outdoor_dining',
    name:'外摆经营',
    measures:['外摆点位试点','外摆时段规范','外摆卫生标准','外摆噪声约束','临时外摆许可','节庆外摆专区','商场外摆联动','街区外摆更新','雨棚外摆规范','外摆设施补贴'],
    modifiers:{demandMultiplier:0.04,complianceCostMultiplier:0.02}
  },
  {
    id:'waste',
    name:'垃圾分类',
    measures:['厨余垃圾分类','餐厨垃圾台账','分类容器规范','收运时间优化','违规混投检查','减量示范门店','厨余资源化试点','商圈集中收运','夜间收运优化','餐饮垃圾费用调整'],
    modifiers:{complianceCostMultiplier:0.035}
  },
  {
    id:'fumes',
    name:'油烟治理',
    measures:['油烟净化设备检查','排烟管道规范','高层商住油烟治理','净化设备更新补贴','油烟在线监测试点','投诉高发区整治','新店排烟前置审查','老店排烟改造','净化设备清洗台账','绿色厨房示范'],
    modifiers:{complianceCostMultiplier:0.055,inspectionRisk:0.08}
  },
  {
    id:'delivery_platform',
    name:'外卖平台',
    measures:['平台佣金透明倡议','骑手保障计划','商户流量扶持','到店自取推广','小微商户佣金优惠','外卖食品封签','配送超时治理','平台促消费活动','数字餐饮培训','团购核销规范'],
    modifiers:{deliveryDemandMultiplier:0.09,platformCostMultiplier:0.05}
  },
  {
    id:'consumption_coupon',
    name:'消费促进',
    measures:['餐饮消费券','商圈联动券','夜间消费券','家庭餐饮券','学生餐饮季','文旅餐饮联动','节庆促消费','数字人民币餐饮活动','老字号推广周','本地美食月'],
    modifiers:{demandMultiplier:0.10}
  },
  {
    id:'entrepreneurship',
    name:'创业扶持',
    measures:['首店创业补贴','创业贷款贴息','大学生创业支持','退役人员创业支持','社区小店扶持','品牌首店奖励','创业培训计划','创业导师计划','创业场地支持','小店数字化支持'],
    modifiers:{complianceCostMultiplier:-0.03,rentCostMultiplier:-0.03}
  },
  {
    id:'small_business',
    name:'小微扶持',
    measures:['小微融资支持','经营费用减免','设备更新补贴','数字化改造补贴','节能设备补贴','品牌培育计划','供应链对接活动','商户培训计划','困难商户纾困','小店成长计划'],
    modifiers:{utilityCostMultiplier:-0.025,complianceCostMultiplier:-0.02}
  },
  {
    id:'district_renewal',
    name:'商圈改造',
    measures:['步行街改造','老街更新','大学城商业提升','工业园配套提升','社区商业补短板','市场环境改造','高新区商业升级','商场周边交通优化','街区夜景提升','公共空间改造'],
    modifiers:{demandMultiplier:0.07,rentCostMultiplier:0.025}
  },
  {
    id:'transport_logistics',
    name:'交通物流',
    measures:['商圈停车优化','货运时段优化','冷链配送便利化','骑手通行优化','夜间公交延时','市场货运通道','学校周边交通优化','写字楼通勤提升','商圈步行环境提升','临时卸货区试点'],
    modifiers:{deliveryDemandMultiplier:0.06,supplyCostMultiplier:-0.025,demandMultiplier:0.03}
  }
];

const POLICY_TEMPLATES = [];

for (const domain of POLICY_DOMAINS) {
  domain.measures.forEach((measure, index) => {
    const supportive =
      Object.values(domain.modifiers || {})
        .reduce((s,v)=>s+Number(v||0),0) <
      0 ||
      [
        'night_economy',
        'consumption_coupon',
        'entrepreneurship',
        'small_business',
        'district_renewal',
        'transport_logistics'
      ].includes(domain.id);

    POLICY_TEMPLATES.push({
      id:`policy_${domain.id}_${String(index+1).padStart(2,'0')}`,
      domainId:domain.id,
      domainName:domain.name,
      name:measure,
      supportive,
      draftDays:2,
      announcedDays:2,
      activeDays:18 + (index % 5) * 6,
      reviewDays:2,
      modifiers:{...domain.modifiers},
      tags:[`policy_${domain.id}`,supportive?'supportive':'regulatory']
    });
  });
}

const POLICY_STAGES = [
  {id:'draft',name:'酝酿'},
  {id:'announced',name:'公告'},
  {id:'active',name:'生效'},
  {id:'review',name:'评估'},
  {id:'expired',name:'退出'}
];

function stats() {
  return {
    domains:POLICY_DOMAINS.length,
    templates:POLICY_TEMPLATES.length,
    stages:POLICY_STAGES.length
  };
}

module.exports = {
  VERSION:'0.8.15',
  POLICY_DOMAINS,
  POLICY_TEMPLATES,
  POLICY_STAGES,
  stats
};
