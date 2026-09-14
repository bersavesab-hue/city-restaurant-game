'use strict';

/**
 * 动态世界事件包 V0.8.15
 * 18 个事件领域 × 每领域 20 个基础模板 = 360 个基础事件。
 * 事件本身只描述“世界发生了什么”；数值影响由事件引擎按强度和阶段计算。
 */

const EVENT_DOMAINS = [
  {
    id: 'supply',
    name: '供应链',
    subjects: ['猪肉','牛羊肉','禽蛋','水产','蔬菜','粮油','调味品','冻品','饮品原料','烘焙原料'],
    situations: ['供应趋紧','供应改善'],
    modifiers: {supplyCostMultiplier:0.08,demandMultiplier:-0.01}
  },
  {
    id: 'staff',
    name: '员工',
    subjects: ['厨师','服务员','店长','收银员','采购员','后厨帮工','小时工','骑手协作','招聘市场','培训市场'],
    situations: ['用工偏紧','人才供给改善'],
    modifiers: {laborCostMultiplier:0.07,capacityMultiplier:-0.04}
  },
  {
    id: 'customer',
    name: '顾客',
    subjects: ['学生客群','白领客群','家庭客群','夜宵客群','游客客群','熟客群体','外卖客群','早餐客群','聚餐客群','价格敏感客群'],
    situations: ['消费意愿走弱','消费意愿回升'],
    modifiers: {demandMultiplier:0.08,reputationMultiplier:0.01}
  },
  {
    id: 'kitchen',
    name: '厨房',
    subjects: ['炒锅工位','蒸制工位','炸制工位','冷菜工位','备菜区','洗消区','出餐口','后厨动线','高峰备料','厨房协同'],
    situations: ['运行承压','效率改善'],
    modifiers: {capacityMultiplier:0.08,utilityCostMultiplier:0.03}
  },
  {
    id: 'equipment',
    name: '设备',
    subjects: ['灶具','冰箱','冷柜','排烟','空调','洗碗机','收银设备','照明','制冰机','饮品设备'],
    situations: ['故障风险上升','维护状态改善'],
    modifiers: {capacityMultiplier:0.07,utilityCostMultiplier:0.04}
  },
  {
    id: 'hygiene',
    name: '卫生食安',
    subjects: ['后厨卫生','食材留样','餐具消毒','冷链记录','虫害防治','员工健康证','食品标签','垃圾清运','生熟分区','进货台账'],
    situations: ['检查风险上升','合规环境改善'],
    modifiers: {inspectionRisk:0.12,reputationMultiplier:0.03}
  },
  {
    id: 'reputation',
    name: '口碑舆情',
    subjects: ['本地点评','短视频口碑','熟客评价','社区讨论','平台评分','探店内容','朋友圈传播','差评争议','排队话题','招牌菜讨论'],
    situations: ['负面讨论增加','正面讨论升温'],
    modifiers: {demandMultiplier:0.09,reputationMultiplier:0.08}
  },
  {
    id: 'weather',
    name: '天气',
    subjects: ['降雨','高温','降温','大风','闷热','持续晴天','寒潮','雷雨','空气湿度','昼夜温差'],
    situations: ['影响增强','影响减弱'],
    modifiers: {demandMultiplier:0.06,deliveryDemandMultiplier:0.10}
  },
  {
    id: 'district',
    name: '商圈',
    subjects: ['写字楼入住','学校开学','社区入住','商场活动','市场客流','工业园排班','地铁客流','旅游活动','夜市开放','街区改造'],
    situations: ['客流扰动加大','客流条件改善'],
    modifiers: {demandMultiplier:0.11,rentCostMultiplier:0.03}
  },
  {
    id: 'rent',
    name: '租赁物业',
    subjects: ['沿街铺租金','商场铺租金','社区铺租金','大学城铺租金','写字楼底商','转让费','物业费','续租条件','免租期','空置率'],
    situations: ['成本压力上升','议价空间增加'],
    modifiers: {rentCostMultiplier:0.08}
  },
  {
    id: 'competition',
    name: '竞争',
    subjects: ['新店开业','竞品降价','竞品上新','竞品团购','竞品外卖','竞品扩店','竞品撤店','竞品换老板','竞品装修升级','竞品达人投放'],
    situations: ['竞争加剧','竞争缓和'],
    modifiers: {demandMultiplier:0.08,marketingEfficiencyMultiplier:0.05}
  },
  {
    id: 'consumption',
    name: '消费趋势',
    subjects: ['性价比套餐','健康轻食','地方风味','小份菜','大份量','现炒现做','甜品饮品','夜宵','早餐','家庭聚餐'],
    situations: ['热度下降','热度上升'],
    modifiers: {demandMultiplier:0.10}
  },
  {
    id: 'festival',
    name: '节庆活动',
    subjects: ['春节消费','元宵消费','清明出游','劳动节','端午聚餐','暑期消费','中秋聚餐','国庆出游','跨年夜','本地美食节'],
    situations: ['活动热度偏弱','活动热度释放'],
    modifiers: {demandMultiplier:0.14,deliveryDemandMultiplier:0.04}
  },
  {
    id: 'delivery',
    name: '外卖平台',
    subjects: ['平台流量','佣金活动','配送运力','骑手供给','搜索排序','团购入口','到店自取','配送半径','超时规则','平台补贴'],
    situations: ['经营条件收紧','经营条件改善'],
    modifiers: {deliveryDemandMultiplier:0.13,platformCostMultiplier:0.06}
  },
  {
    id: 'traffic',
    name: '交通',
    subjects: ['道路施工','地铁运营','公交调整','停车资源','商圈拥堵','学校周边交通','写字楼通勤','市场货运','骑手通行','夜间交通'],
    situations: ['通行受阻','通行改善'],
    modifiers: {demandMultiplier:0.06,deliveryDemandMultiplier:0.08}
  },
  {
    id: 'policy',
    name: '政策执行',
    subjects: ['食品安全','消防安全','环保检查','劳动用工','夜间经营','外摆经营','油烟治理','垃圾分类','消费促进','小微扶持'],
    situations: ['执行趋严','执行优化'],
    modifiers: {inspectionRisk:0.10,complianceCostMultiplier:0.05}
  },
  {
    id: 'accident',
    name: '突发事故',
    subjects: ['停电','停水','燃气异常','冷链故障','管道漏水','设备跳闸','门头破损','网络中断','配送事故','仓储破损'],
    situations: ['风险暴露','处置完成'],
    modifiers: {capacityMultiplier:0.12,reputationMultiplier:0.03}
  },
  {
    id: 'brand',
    name: '品牌机会',
    subjects: ['招牌菜出圈','熟客推荐','达人探店','媒体报道','联名合作','企业团餐','社区合作','校园合作','榜单入选','节庆推荐'],
    situations: ['机会降温','机会升温'],
    modifiers: {demandMultiplier:0.12,reputationMultiplier:0.09}
  }
];

const EVENT_PHASES = [
  {id:'warning',name:'前兆',factor:0.45},
  {id:'active',name:'发生',factor:1.00},
  {id:'recovery',name:'恢复',factor:0.35},
  {id:'archived',name:'结束',factor:0}
];

const EVENT_SEVERITIES = [
  {id:'minor',name:'轻微',factor:0.65,weight:48},
  {id:'normal',name:'一般',factor:1.00,weight:38},
  {id:'major',name:'严重',factor:1.45,weight:12},
  {id:'extreme',name:'极端',factor:1.90,weight:2}
];

const EVENT_TEMPLATES = [];

for (const domain of EVENT_DOMAINS) {
  let index = 0;
  for (const subject of domain.subjects) {
    for (const situation of domain.situations) {
      index += 1;
      const positive =
        /改善|回升|升温|释放|增加|完成|上升|优化/.test(situation) &&
        !/压力|风险|收紧|受阻|下降|降温/.test(situation);

      EVENT_TEMPLATES.push({
        id:`world_event_${domain.id}_${String(index).padStart(2,'0')}`,
        domainId:domain.id,
        domainName:domain.name,
        name:`${subject}·${situation}`,
        subject,
        situation,
        positive,
        durationDays:positive ? 2 : 3,
        warningDays:1,
        cooldownDays:5 + (index % 7),
        baseModifiers:{...domain.modifiers},
        tags:[`event_${domain.id}`,positive?'positive':'negative']
      });
    }
  }
}

function stats() {
  return {
    domains:EVENT_DOMAINS.length,
    templates:EVENT_TEMPLATES.length,
    phases:EVENT_PHASES.length,
    severities:EVENT_SEVERITIES.length
  };
}

module.exports = {
  VERSION:'0.8.15',
  EVENT_DOMAINS,
  EVENT_PHASES,
  EVENT_SEVERITIES,
  EVENT_TEMPLATES,
  stats
};
