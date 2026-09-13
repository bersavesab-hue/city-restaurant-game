'use strict';

/**
 * 房源包 V1.0.0（兼容旧文件名 propertyPackV02.js）
 *
 * 目标：从 6㎡摊位一直覆盖到 20,000㎡项目级餐饮物业。
 * 组合层级：
 * - fixed：现实硬条件（面积、楼层、排烟、电力、消防、合同已签字段等）
 * - weighted：商圈、房东、合同、历史用途、挂牌原因、优缺点、物业限制等
 * - free：不改变经济结果的视觉表现
 */

const SIZE_BANDS = [
  { id: 'micro', name: '微型', min: 6, max: 25, rentFactor: 1.12, targetShare: 0.17 },
  { id: 'small', name: '小型', min: 25, max: 80, rentFactor: 1.05, targetShare: 0.30 },
  { id: 'small_mid', name: '中小型', min: 80, max: 180, rentFactor: 1.00, targetShare: 0.23 },
  { id: 'medium', name: '中型', min: 180, max: 400, rentFactor: 0.92, targetShare: 0.15 },
  { id: 'large', name: '大型', min: 400, max: 900, rentFactor: 0.84, targetShare: 0.09 },
  { id: 'super', name: '超大型', min: 900, max: 2500, rentFactor: 0.74, targetShare: 0.045 },
  { id: 'project', name: '项目级', min: 2500, max: 20000, rentFactor: 0.64, targetShare: 0.015 }
];

const DISTRICT_BASELINES = {
  university: { name: '大学城', rentPerSqm: 78, traffic: 82, delivery: 82, parking: 42, resident: 38, office: 34, student: 96, supplyPressure: 0.98 },
  cbd: { name: '商业中心', rentPerSqm: 146, traffic: 91, delivery: 84, parking: 58, resident: 38, office: 95, student: 24, supplyPressure: 1.08 },
  hightech: { name: '高新区', rentPerSqm: 98, traffic: 73, delivery: 88, parking: 66, resident: 42, office: 90, student: 18, supplyPressure: 1.01 },
  oldtown: { name: '老城区', rentPerSqm: 58, traffic: 69, delivery: 67, parking: 36, resident: 88, office: 34, student: 28, supplyPressure: 0.94 },
  village: { name: '城中村', rentPerSqm: 43, traffic: 76, delivery: 72, parking: 28, resident: 82, office: 22, student: 52, supplyPressure: 0.91 },
  market: { name: '东门市场', rentPerSqm: 49, traffic: 79, delivery: 61, parking: 31, resident: 78, office: 18, student: 36, supplyPressure: 0.96 },
  industry: { name: '工业园', rentPerSqm: 46, traffic: 66, delivery: 74, parking: 72, resident: 18, office: 48, student: 8, supplyPressure: 0.90 }
};

const CATEGORY_SPECS = [
  {
    id: 'street_commercial', name: '临街商业', weight: 18, areaRange: [20, 650], rentFactor: 1.06, trafficFactor: 1.03, visibilityBase: 78,
    seatDensity: 0.38, kitchenRatio: 0.33, transferFeeBase: 16000, floorOptions: [1, 1, 1, 2], tags: ['streetfront'],
    facilityChance: { exhaust: 0.72, gas: 0.62, threePhase: 0.78, drainage: 0.88, greaseTrap: 0.66, fire: 0.86 },
    variants: [
      ['street_single', '单开间街铺', [20, 85]], ['street_double', '双开间街铺', [45, 180]], ['street_corner', '转角铺', [45, 260]],
      ['street_linked', '沿街联铺', [90, 650]], ['street_arterial', '主干道街铺', [35, 420]], ['street_backlane', '背街街铺', [20, 220]]
    ]
  },
  {
    id: 'community_commercial', name: '社区商业', weight: 17, areaRange: [20, 800], rentFactor: 0.90, trafficFactor: 0.92, visibilityBase: 65,
    seatDensity: 0.40, kitchenRatio: 0.32, transferFeeBase: 11000, floorOptions: [1, 1, 1, 2], tags: ['community'],
    facilityChance: { exhaust: 0.66, gas: 0.70, threePhase: 0.67, drainage: 0.84, greaseTrap: 0.58, fire: 0.80 },
    variants: [
      ['community_ground', '住宅底商', [25, 180]], ['community_gate', '社区入口铺', [20, 130]], ['community_center', '社区中心铺', [60, 300]],
      ['neighborhood_center', '邻里中心铺', [70, 450]], ['community_inner', '社区内部铺', [20, 120]], ['community_detached', '社区独栋', [150, 800]]
    ]
  },
  {
    id: 'mall_commercial', name: '商场商业', weight: 10, areaRange: [15, 1500], rentFactor: 1.30, trafficFactor: 0.88, visibilityBase: 62,
    seatDensity: 0.28, kitchenRatio: 0.38, transferFeeBase: 22000, floorOptions: [1, 2, 3, 4, 5], tags: ['mall', 'no_gas_typical'],
    facilityChance: { exhaust: 0.62, gas: 0.08, threePhase: 0.97, drainage: 0.92, greaseTrap: 0.84, fire: 0.99 },
    variants: [
      ['mall_standard', '商场普通餐饮铺', [35, 300]], ['mall_dining_floor', '餐饮楼层铺', [80, 650]], ['mall_atrium', '中庭边铺', [25, 220]],
      ['mall_outer_street', '外街餐饮铺', [50, 420]], ['mall_b1', 'B1餐饮铺', [15, 180]], ['mall_rooftop', '顶层餐饮铺', [120, 1500]]
    ]
  },
  {
    id: 'food_hall', name: '美食商业', weight: 9, areaRange: [8, 1000], rentFactor: 1.16, trafficFactor: 0.95, visibilityBase: 58,
    seatDensity: 0.20, kitchenRatio: 0.50, transferFeeBase: 8000, floorOptions: [1, 2, 3, 4], tags: ['food_hall'],
    facilityChance: { exhaust: 0.58, gas: 0.08, threePhase: 0.95, drainage: 0.90, greaseTrap: 0.82, fire: 0.98 },
    variants: [
      ['foodhall_stall', '美食城档口', [8, 35]], ['foodcourt_unit', '美食广场铺', [18, 80]], ['snackcity_unit', '小吃城铺', [12, 65]],
      ['themed_dining_zone', '主题餐饮区', [80, 500]], ['shared_dining_unit', '共享餐饮铺', [12, 55]], ['foodstreet_linked', '美食街联铺', [70, 1000]]
    ]
  },
  {
    id: 'market_commercial', name: '市场商业', weight: 8, areaRange: [8, 500], rentFactor: 0.78, trafficFactor: 1.08, visibilityBase: 70,
    seatDensity: 0.30, kitchenRatio: 0.40, transferFeeBase: 6000, floorOptions: [1, 1, 1, 2], tags: ['market_stall'],
    facilityChance: { exhaust: 0.60, gas: 0.66, threePhase: 0.56, drainage: 0.80, greaseTrap: 0.48, fire: 0.70 },
    variants: [
      ['wetmarket_stall', '菜市场档口', [8, 30]], ['wetmarket_front', '菜市场门面', [18, 90]], ['farmmarket_outer', '农贸市场外围铺', [25, 150]],
      ['wholesale_support', '批发市场配套餐饮', [40, 280]], ['seafood_market_food', '水产市场餐饮铺', [50, 500]], ['meatveg_market_food', '肉菜市场配套餐饮', [25, 220]]
    ]
  },
  {
    id: 'education_commercial', name: '学校商业', weight: 8, areaRange: [8, 700], rentFactor: 0.86, trafficFactor: 1.03, visibilityBase: 69,
    seatDensity: 0.40, kitchenRatio: 0.36, transferFeeBase: 7000, floorOptions: [1, 1, 2, 3], tags: ['education'],
    facilityChance: { exhaust: 0.58, gas: 0.28, threePhase: 0.88, drainage: 0.87, greaseTrap: 0.72, fire: 0.94 },
    variants: [
      ['school_gate', '校门街铺', [15, 100]], ['university_street', '大学商业街铺', [25, 220]], ['campus_stall', '校园档口', [8, 35]],
      ['dorm_ground', '宿舍区底商', [20, 120]], ['canteen_window', '食堂窗口', [8, 30]], ['campus_complex', '校园综合商业铺', [80, 700]]
    ]
  },
  {
    id: 'office_commercial', name: '办公商务', weight: 7, areaRange: [30, 1800], rentFactor: 1.12, trafficFactor: 0.91, visibilityBase: 70,
    seatDensity: 0.36, kitchenRatio: 0.32, transferFeeBase: 18000, floorOptions: [1, 1, 2, 3, 4], tags: ['office'],
    facilityChance: { exhaust: 0.68, gas: 0.18, threePhase: 0.96, drainage: 0.92, greaseTrap: 0.78, fire: 0.98 },
    variants: [
      ['office_podium', '写字楼底商', [35, 220]], ['business_park_unit', '商务园区铺', [45, 350]], ['office_dining_floor', '写字楼餐饮层', [180, 900]],
      ['office_canteen', '办公园食堂铺', [120, 650]], ['cbd_street', 'CBD街铺', [50, 450]], ['business_center_dining', '商务中心餐饮铺', [150, 1800]]
    ]
  },
  {
    id: 'industrial_commercial', name: '工业园商业', weight: 6, areaRange: [15, 1800], rentFactor: 0.72, trafficFactor: 0.82, visibilityBase: 56,
    seatDensity: 0.43, kitchenRatio: 0.35, transferFeeBase: 5000, floorOptions: [1, 1, 1, 2], tags: ['industry'],
    facilityChance: { exhaust: 0.74, gas: 0.58, threePhase: 0.90, drainage: 0.84, greaseTrap: 0.70, fire: 0.90 },
    variants: [
      ['industrial_street', '工业园街铺', [25, 180]], ['factory_gate', '厂区入口铺', [20, 140]], ['industrial_canteen_stall', '园区食堂档口', [15, 60]],
      ['worker_residential', '工人生活区铺', [20, 160]], ['industrial_support', '产业园配套铺', [80, 500]], ['logistics_park_food', '物流园餐饮铺', [100, 1800]]
    ]
  },
  {
    id: 'transport_commercial', name: '交通商业', weight: 4, areaRange: [12, 2500], rentFactor: 1.26, trafficFactor: 1.14, visibilityBase: 82,
    seatDensity: 0.32, kitchenRatio: 0.38, transferFeeBase: 26000, floorOptions: [1, 1, 2, 3], tags: ['transport'],
    facilityChance: { exhaust: 0.60, gas: 0.06, threePhase: 0.98, drainage: 0.94, greaseTrap: 0.84, fire: 0.99 },
    variants: [
      ['metro_exit', '地铁口铺', [15, 120]], ['railway_outer', '火车站周边铺', [25, 260]], ['station_inside', '站内餐饮铺', [12, 100]],
      ['bus_station', '汽车站铺', [18, 140]], ['airport_food', '机场餐饮铺', [20, 350]], ['transport_hub_complex', '交通枢纽综合铺', [200, 2500]]
    ]
  },
  {
    id: 'tourism_commercial', name: '景区文旅', weight: 4, areaRange: [15, 2500], rentFactor: 1.02, trafficFactor: 0.94, visibilityBase: 73,
    seatDensity: 0.34, kitchenRatio: 0.34, transferFeeBase: 18000, floorOptions: [1, 1, 2], tags: ['tourism'],
    facilityChance: { exhaust: 0.58, gas: 0.48, threePhase: 0.78, drainage: 0.82, greaseTrap: 0.62, fire: 0.88 },
    variants: [
      ['scenic_gate', '景区入口铺', [20, 180]], ['scenic_inside', '景区内部铺', [15, 150]], ['ancient_town', '古城街铺', [25, 260]],
      ['tourist_street', '旅游商业街铺', [30, 350]], ['visitor_center_food', '游客中心餐饮铺', [80, 600]], ['resort_dining', '度假区餐饮物业', [180, 2500]]
    ]
  },
  {
    id: 'night_economy', name: '夜间经济', weight: 5, areaRange: [6, 900], rentFactor: 0.86, trafficFactor: 0.98, visibilityBase: 72,
    seatDensity: 0.34, kitchenRatio: 0.40, transferFeeBase: 7000, floorOptions: [1, 1, 1, 2], tags: ['night'],
    facilityChance: { exhaust: 0.56, gas: 0.52, threePhase: 0.72, drainage: 0.74, greaseTrap: 0.50, fire: 0.72 },
    variants: [
      ['night_stall', '夜市摊位', [6, 20]], ['snack_street', '小吃街铺', [12, 70]], ['late_night_street', '夜宵街铺', [25, 180]],
      ['barstreet_food', '酒吧街餐饮铺', [35, 220]], ['outdoor_plot', '露天经营位', [15, 160]], ['night_complex', '夜间商业综合铺', [150, 900]]
    ]
  },
  {
    id: 'standalone_catering', name: '独立餐饮物业', weight: 4, areaRange: [80, 3500], rentFactor: 0.94, trafficFactor: 0.88, visibilityBase: 76,
    seatDensity: 0.42, kitchenRatio: 0.31, transferFeeBase: 32000, floorOptions: [1, 1, 2, 3], tags: ['standalone'],
    facilityChance: { exhaust: 0.86, gas: 0.72, threePhase: 0.88, drainage: 0.90, greaseTrap: 0.80, fire: 0.92 },
    variants: [
      ['detached_street', '临街独栋', [120, 900]], ['courtyard_restaurant', '小院餐厅', [80, 500]], ['rear_yard_shop', '带后院商铺', [100, 650]],
      ['villa_catering', '别墅式餐饮物业', [180, 1200]], ['independent_building', '独立餐饮楼', [500, 3500]], ['catering_courtyard', '餐饮院落', [250, 2500]]
    ]
  },
  {
    id: 'large_catering', name: '大型餐饮物业', weight: 2.8, areaRange: [300, 5000], rentFactor: 0.82, trafficFactor: 0.86, visibilityBase: 75,
    seatDensity: 0.48, kitchenRatio: 0.29, transferFeeBase: 60000, floorOptions: [1, 1, 2, 3, 4], tags: ['large_catering'],
    facilityChance: { exhaust: 0.92, gas: 0.78, threePhase: 0.96, drainage: 0.95, greaseTrap: 0.90, fire: 0.98 },
    variants: [
      ['large_hotpot', '大型火锅物业', [350, 1600]], ['large_chinese', '大型中餐厅', [400, 2200]], ['seafood_hall', '海鲜酒楼物业', [500, 3000]],
      ['banquet_restaurant', '宴会餐厅', [700, 3800]], ['wedding_hotel_floor', '婚宴酒店餐饮层', [1000, 5000]], ['large_buffet', '大型自助餐物业', [450, 2200]]
    ]
  },
  {
    id: 'complex_project', name: '综合体项目', weight: 1.2, areaRange: [1000, 20000], rentFactor: 0.70, trafficFactor: 0.92, visibilityBase: 78,
    seatDensity: 0.52, kitchenRatio: 0.24, transferFeeBase: 120000, floorOptions: [1, 2, 3, 4, 5, 6], tags: ['project'],
    facilityChance: { exhaust: 0.94, gas: 0.30, threePhase: 0.99, drainage: 0.98, greaseTrap: 0.95, fire: 1.00 },
    variants: [
      ['complex_floor', '商业综合体整层', [1800, 8000]], ['mall_whole_floor', '购物中心整层', [1500, 7000]], ['themed_food_floor', '餐饮主题层', [1200, 6000]],
      ['commercial_podium', '商业裙楼', [2500, 12000]], ['complex_detached', '综合体独栋', [1800, 9000]], ['commercial_street_zone', '商业街整区', [5000, 20000]]
    ]
  },
  {
    id: 'institutional_catering', name: '单位/机构餐饮', weight: 2.2, areaRange: [120, 6000], rentFactor: 0.62, trafficFactor: 0.72, visibilityBase: 48,
    seatDensity: 0.55, kitchenRatio: 0.32, transferFeeBase: 10000, floorOptions: [1, 1, 2, 3], tags: ['institution'],
    facilityChance: { exhaust: 0.88, gas: 0.46, threePhase: 0.97, drainage: 0.96, greaseTrap: 0.90, fire: 0.99 },
    variants: [
      ['enterprise_canteen', '企业食堂', [300, 2500]], ['university_canteen', '高校食堂', [500, 4500]], ['hospital_canteen', '医院食堂', [250, 1800]],
      ['government_canteen', '机关食堂', [200, 1200]], ['park_dining_center', '园区餐饮中心', [500, 3500]], ['convention_catering', '会展中心餐饮', [800, 6000]]
    ]
  },
  {
    id: 'special_opportunity', name: '特殊机会物业', weight: 4, areaRange: [20, 2500], rentFactor: 0.88, trafficFactor: 0.90, visibilityBase: 64,
    seatDensity: 0.40, kitchenRatio: 0.33, transferFeeBase: 8000, floorOptions: [1, 1, 2, 3], tags: ['special_opportunity'],
    facilityChance: { exhaust: 0.72, gas: 0.56, threePhase: 0.82, drainage: 0.86, greaseTrap: 0.70, fire: 0.84 },
    variants: [
      ['urgent_transfer', '急转店', [20, 350]], ['failed_business_takeover', '倒闭店接盘', [30, 650]], ['equipped_sublease', '带设备转租', [25, 450]],
      ['developer招商', '开发商招商铺', [50, 1200]], ['asset_disposal', '资产处置铺', [80, 2500]], ['brand_exit', '品牌撤店遗留铺', [60, 1000]]
    ]
  }
];

function sizeBandForArea(area) {
  const value = Number(area) || 0;
  return SIZE_BANDS.find((row) => value <= row.max && value >= row.min)
    || (value < SIZE_BANDS[0].min ? SIZE_BANDS[0] : SIZE_BANDS[SIZE_BANDS.length - 1]);
}

function buildSubtypes() {
  const rows = [];
  CATEGORY_SPECS.forEach((category) => {
    category.variants.forEach((variant, variantIndex) => {
      const [id, name, areaRange] = variant;
      const midpoint = (areaRange[0] + areaRange[1]) / 2;
      const sizeBand = sizeBandForArea(midpoint);
      const localFactor = [0.96, 1.00, 1.05, 1.02, 1.08, 0.93][variantIndex] || 1;
      rows.push({
        id,
        categoryId: category.id,
        categoryName: category.name,
        name,
        weight: Math.max(0.2, category.weight * [1.12, 1.05, 0.92, 0.82, 0.88, 0.60][variantIndex]),
        tags: [...category.tags, `category_${category.id}`, `size_${sizeBand.id}`],
        areaRange,
        floorOptions: [...category.floorOptions],
        floor: category.floorOptions[0],
        baseVisibility: Math.max(18, Math.min(96, category.visibilityBase + [0, 2, 4, -1, 3, -4][variantIndex])),
        trafficFactor: category.trafficFactor * [0.98, 1.00, 1.04, 0.96, 1.05, 0.92][variantIndex],
        rentFactor: category.rentFactor * localFactor,
        seatDensity: category.seatDensity,
        kitchenRatio: category.kitchenRatio,
        transferFeeBase: Math.round(category.transferFeeBase * [0.75, 1.0, 1.15, 1.25, 1.10, 0.90][variantIndex]),
        facilityChance: { ...category.facilityChance },
        defaultScaleBandId: sizeBand.id
      });
    });
  });
  return rows;
}

const PROPERTY_SUBTYPES = buildSubtypes();
const PROPERTY_SUBTYPE_BY_ID = Object.fromEntries(PROPERTY_SUBTYPES.map((row) => [row.id, row]));
const PROPERTY_CATEGORIES = Object.fromEntries(CATEGORY_SPECS.map((row) => [row.id, { ...row, variants: undefined }]));

// 兼容 V0.2 旧 broad archetype ID；旧 UI / 存档可以继续读。
const PROPERTY_ARCHETYPES = {
  street_shop: { name: '临街底商', categoryId: 'street_commercial', rentFactor: 1.08, trafficFactor: 1.02, visibilityBase: 78, backOfHouse: 0.34, seatArea: 2.15 },
  community_shop: { name: '社区底商', categoryId: 'community_commercial', rentFactor: 0.88, trafficFactor: 0.90, visibilityBase: 66, backOfHouse: 0.32, seatArea: 2.05 },
  mall_stall: { name: '商场/美食城档口', categoryId: 'food_hall', rentFactor: 1.22, trafficFactor: 0.86, visibilityBase: 58, backOfHouse: 0.52, seatArea: 3.60 },
  upper_floor: { name: '二三层商铺', categoryId: 'street_commercial', rentFactor: 0.67, trafficFactor: 0.62, visibilityBase: 34, backOfHouse: 0.30, seatArea: 1.95 },
  market_stall: { name: '市场街铺', categoryId: 'market_commercial', rentFactor: 0.76, trafficFactor: 1.10, visibilityBase: 72, backOfHouse: 0.38, seatArea: 2.40 },
  office_podium: { name: '写字楼底商', categoryId: 'office_commercial', rentFactor: 1.12, trafficFactor: 0.92, visibilityBase: 70, backOfHouse: 0.31, seatArea: 2.05 },
  station_shop: { name: '交通枢纽铺', categoryId: 'transport_commercial', rentFactor: 1.28, trafficFactor: 1.16, visibilityBase: 82, backOfHouse: 0.42, seatArea: 2.65 },
  standalone: { name: '独立餐饮物业', categoryId: 'standalone_catering', rentFactor: 0.94, trafficFactor: 0.88, visibilityBase: 76, backOfHouse: 0.31, seatArea: 2.00 },
  large_catering: { name: '大型餐饮物业', categoryId: 'large_catering', rentFactor: 0.82, trafficFactor: 0.86, visibilityBase: 75, backOfHouse: 0.29, seatArea: 1.85 },
  project: { name: '餐饮项目', categoryId: 'complex_project', rentFactor: 0.70, trafficFactor: 0.92, visibilityBase: 78, backOfHouse: 0.24, seatArea: 1.95 },
  institutional: { name: '单位/机构餐饮', categoryId: 'institutional_catering', rentFactor: 0.62, trafficFactor: 0.72, visibilityBase: 48, backOfHouse: 0.32, seatArea: 1.70 },
  generic: { name: '普通商铺', categoryId: 'street_commercial', rentFactor: 1.00, trafficFactor: 0.90, visibilityBase: 56, backOfHouse: 0.34, seatArea: 2.20 }
};

function buildStructureTemplates() {
  const result = [];
  PROPERTY_SUBTYPES.forEach((subtype, index) => {
    const count = index < 48 ? 3 : 2; // 48*3 + 48*2 = 240
    const [min, max] = subtype.areaRange;
    for (let i = 0; i < count; i += 1) {
      const lowRatio = i / count;
      const highRatio = (i + 1) / count;
      const areaMin = Math.max(min, Math.round(min + (max - min) * lowRatio));
      const areaMax = Math.max(areaMin + 1, Math.round(min + (max - min) * highRatio));
      const midpoint = (areaMin + areaMax) / 2;
      const band = sizeBandForArea(midpoint);
      const floor = subtype.floorOptions[i % subtype.floorOptions.length] || 1;
      const shape = ['紧凑型', '标准型', '扩展型'][i] || `结构${i + 1}`;
      result.push({
        id: `${subtype.id}_structure_${i + 1}`,
        subtypeId: subtype.id,
        categoryId: subtype.categoryId,
        name: `${subtype.name}·${shape}`,
        areaRange: [areaMin, areaMax],
        sizeBandId: band.id,
        floor,
        frontageFactor: [0.68, 0.82, 1.02][i] || 0.82,
        depthFactor: [1.12, 1.00, 0.88][i] || 1,
        ceilingHeightRange: band.id === 'project' ? [4.8, 7.5] : band.id === 'super' ? [4.2, 6.2] : band.id === 'large' ? [3.8, 5.2] : [3.2, 4.8],
        kitchenRatio: Math.max(0.18, Math.min(0.58, subtype.kitchenRatio + [0.04, 0, -0.03][i])),
        seatDensity: subtype.seatDensity,
        roomPotential: band.id === 'project' ? [8, 40] : band.id === 'super' ? [5, 24] : band.id === 'large' ? [3, 14] : band.id === 'medium' ? [0, 8] : [0, 3]
      });
    }
  });
  return result;
}

const STRUCTURE_TEMPLATES = buildStructureTemplates();

const RESTAURANT_MODES = {
  fast_meal: { name: '快餐简餐', minArea: 18, idealArea: [32, 110], hard: ['drainage'], soft: ['threePhase', 'exhaust'], fitoutPerSqm: 1050, equipmentBase: 26000, maxEfficientArea: 260 },
  noodles: { name: '粉面', minArea: 20, idealArea: [30, 120], hard: ['drainage', 'heat'], soft: ['exhaust', 'threePhase'], fitoutPerSqm: 1150, equipmentBase: 30000, maxEfficientArea: 320 },
  wok: { name: '中式炒菜', minArea: 38, idealArea: [60, 260], hard: ['exhaust', 'drainage', 'heat', 'fire'], soft: ['gas', 'greaseTrap'], fitoutPerSqm: 1450, equipmentBase: 52000, maxEfficientArea: 900 },
  bbq: { name: '烧烤', minArea: 35, idealArea: [55, 260], hard: ['exhaust', 'fire', 'heat'], soft: ['drainage', 'greaseTrap'], fitoutPerSqm: 1550, equipmentBase: 54000, maxEfficientArea: 750 },
  hotpot: { name: '火锅', minArea: 65, idealArea: [100, 520], hard: ['fire', 'heat', 'drainage'], soft: ['exhaust', 'threePhase'], fitoutPerSqm: 1700, equipmentBase: 85000, maxEfficientArea: 1600 },
  beverage: { name: '饮品甜品', minArea: 10, idealArea: [18, 85], hard: ['power'], soft: ['drainage', 'threePhase'], fitoutPerSqm: 1250, equipmentBase: 32000, maxEfficientArea: 220 },
  bakery: { name: '烘焙轻食', minArea: 22, idealArea: [35, 130], hard: ['power'], soft: ['threePhase', 'drainage'], fitoutPerSqm: 1500, equipmentBase: 58000, maxEfficientArea: 320 },
  casual_dining: { name: '休闲正餐', minArea: 90, idealArea: [140, 600], hard: ['drainage', 'fire'], soft: ['exhaust', 'threePhase', 'greaseTrap'], fitoutPerSqm: 1750, equipmentBase: 120000, maxEfficientArea: 1500 },
  banquet: { name: '宴会酒楼', minArea: 500, idealArea: [900, 3200], hard: ['exhaust', 'drainage', 'fire', 'power'], soft: ['gas', 'greaseTrap'], fitoutPerSqm: 2100, equipmentBase: 420000, maxEfficientArea: 6000 },
  seafood: { name: '海鲜酒楼', minArea: 300, idealArea: [600, 2400], hard: ['exhaust', 'drainage', 'fire', 'power'], soft: ['gas', 'greaseTrap'], fitoutPerSqm: 2200, equipmentBase: 380000, maxEfficientArea: 5000 },
  buffet: { name: '大型自助餐', minArea: 350, idealArea: [550, 1800], hard: ['exhaust', 'drainage', 'fire', 'power'], soft: ['greaseTrap'], fitoutPerSqm: 1900, equipmentBase: 280000, maxEfficientArea: 3200 },
  group_meal: { name: '团餐/食堂', minArea: 180, idealArea: [350, 2200], hard: ['drainage', 'fire', 'power'], soft: ['exhaust', 'greaseTrap'], fitoutPerSqm: 1200, equipmentBase: 180000, maxEfficientArea: 7000 }
};

const landlordRows = [
  ['stable','普通个人房东',34,0.45,0.18,1.02], ['retired','退休持有型房东',7,0.52,0.12,0.99], ['family_holding','家庭持有型房东',9,0.48,0.20,1.00],
  ['investor','投资型房东',12,0.30,0.34,1.06], ['multi_property','多物业房东',8,0.38,0.22,1.03], ['urgent','急需现金房东',5,0.82,0.24,0.94],
  ['price_focused','价格强势房东',10,0.24,0.46,1.09], ['long_term','偏长期租约房东',8,0.60,0.11,0.99], ['former_operator','原经营者转房东',5,0.56,0.25,1.00],
  ['small_developer','小开发商',4,0.36,0.27,1.04], ['large_developer','大型开发商',2.4,0.18,0.18,1.08], ['mall_operator','商场运营公司',4,0.14,0.20,1.10],
  ['asset_manager','资产管理公司',3,0.20,0.23,1.07], ['state_property','国企物业',2,0.12,0.15,1.04], ['collective_property','集体物业',2.5,0.30,0.20,0.98],
  ['school_property','学校物业',1.8,0.15,0.12,0.97], ['park_operator','园区运营方',2.4,0.24,0.16,0.98], ['station_operator','交通枢纽运营方',1.2,0.10,0.14,1.12],
  ['scenic_operator','景区运营方',1.2,0.15,0.22,1.08], ['hotel_owner','酒店物业方',1.4,0.22,0.20,1.05], ['receiver','重组资产管理方',0.8,0.66,0.40,0.91],
  ['trust_company','信托/基金持有方',0.8,0.12,0.20,1.09], ['commercial_landlord','专业商业房东',3.2,0.28,0.27,1.06], ['local_company','本地企业持有方',2.6,0.42,0.26,1.01]
];
const LANDLORD_PROFILES = Object.fromEntries(landlordRows.map(([id,name,weight,negotiation,renewalRisk,askPremium]) => [id,{ id,name,weight,negotiation,renewalRisk,askPremium }]));

const LANDLORD_TRAITS = [
  ['strict','合同严格'],['negotiable','愿意议价'],['longterm','偏爱长期租户'],['cashflow','重视现金流'],['credit','重信用'],['renovation_support','愿给装修期'],
  ['hands_off','少干预经营'],['micromanage','爱管细节'],['price_anchor','价格锚定强'],['vacancy_anxious','怕空置'],['relationship','重熟人关系'],['formal','程序化'],
  ['fast_decision','决策快'],['slow_decision','决策慢'],['renewal_friendly','续租友好'],['increase_aggressive','涨租积极'],['maintenance_support','愿承担部分维修'],['maintenance_averse','维修责任推租户'],
  ['brand_preference','偏好知名品牌'],['first_store_friendly','愿接受新手'],['deposit_strict','押金要求高'],['payment_flexible','付款方式灵活'],['quiet_business','偏好低扰民业态'],['food_friendly','欢迎餐饮']
].map(([id,name],index) => ({ id,name,weight: [10,10,8,9,9,7,8,5,7,7,6,8,6,5,7,6,5,5,5,5,6,6,6,8][index] || 5 }));

const contractRows = [
  ['deposit1_pay3','押一付三',18,1,3,10,0.04,'fixed'], ['deposit2_pay3','押二付三',12,2,3,12,0.04,'fixed'], ['deposit2_pay1','押二付一',7,2,1,7,0.05,'fixed'],
  ['deposit1_pay1','押一付一',6,1,1,7,0.05,'fixed'], ['halfyear','半年付',4,2,6,15,0.04,'fixed'], ['annual','年付',2,2,12,20,0.03,'fixed'],
  ['longterm_friendly','长租低递增',7,1,3,30,0.025,'fixed'], ['shortterm_premium','短租高租金',3,1,1,3,0.08,'fixed'], ['step_rent','阶梯递增租',5,2,3,20,0.06,'fixed'],
  ['fixed_longterm','长期固定租',3,3,6,25,0.00,'fixed'], ['mall_min_turnover','保底+营业额抽成',4,3,1,30,0.05,'hybrid'], ['mall_turnover','纯营业额抽成',2,2,1,20,0.00,'turnover'],
  ['mall_deduction','商场扣点',4,3,1,20,0.04,'turnover'], ['mall_guarantee_deduction','保底+扣点',4,3,1,25,0.05,'hybrid'], ['long_free_rent','长免租期合同',3,2,3,60,0.05,'fixed'],
  ['fitout_period','装修期合同',5,2,3,45,0.04,'fixed'], ['equipment_lease','带设备租赁',3,2,3,15,0.04,'equipment'], ['equipment_transfer','设备转让+租赁',3,2,3,15,0.04,'transfer'],
  ['brand招商','品牌招商优惠',2,2,3,60,0.03,'fixed'], ['newmall招商','新商场招商',2,3,1,90,0.05,'hybrid'], ['joint_operation','联营合同',2,2,1,20,0.00,'joint'],
  ['canteen_concession','食堂承包',2,2,1,15,0.00,'concession'], ['whole_floor','整层租赁',1.5,3,3,60,0.04,'fixed'], ['whole_project','整项目租赁',0.8,3,6,120,0.03,'fixed']
];
const CONTRACT_PROFILES = Object.fromEntries(contractRows.map(([id,name,weight,depositMonths,paymentMonths,freeRentDays,annualIncrease,pricingMode]) => [id,{ id,name,weight,depositMonths,paymentMonths,freeRentDays,annualIncrease,pricingMode }]));

const HISTORICAL_USES = [
  '快餐店','粉面店','中式小炒','火锅店','烧烤店','奶茶店','咖啡店','烘焙店','酒楼','海鲜餐厅','自助餐','团餐食堂',
  '便利店','生鲜店','超市','水果店','熟食店','卤味店','服装店','美容美发','药店','手机店','家居店','教育培训',
  '办公室','仓库','健身房','酒吧','KTV','棋牌室','酒店餐厅','婚宴厅','空铺','毛坯新铺','品牌撤店','临时展销'
].map((name,index) => ({ id:`history_${index + 1}`, name, foodReady: index < 12 || [16,17,30,31,34].includes(index) }));

const VACANCY_REASONS = [
  ['new招商','新建项目招商',0.00,0.10], ['lease_end','原租户到期',0.00,0.20], ['business_transfer','经营不善转让',-0.04,0.68], ['career_change','老板转行',-0.02,0.50],
  ['return_home','老板回乡',-0.03,0.58], ['cash_stress','资金链紧张',-0.08,0.82], ['brand_exit','品牌撤店',-0.05,0.72], ['rent_exit','租金上涨退出',0.02,0.46],
  ['traffic_down','商圈客流下降',-0.07,0.55], ['equipment_old','设备老化',-0.05,0.44], ['property_dispute','物业纠纷',-0.08,0.64], ['fire_rectify','消防整改失败',-0.10,0.72],
  ['owner_sell','房东拟出售',-0.03,0.58], ['owner_retake','房东收回再出租',0.01,0.30], ['developer招商','开发商招商',0.01,0.22], ['mall_open','商业体新开业',0.03,0.18],
  ['tenant_mix','商业体业态调整',0.00,0.24], ['planning_move','规划搬迁影响',-0.12,0.86], ['roadworks','道路施工影响',-0.06,0.62], ['school_break','学校周期性空置',-0.04,0.40],
  ['park_adjust','园区结构调整',-0.03,0.38], ['asset_disposal','资产处置',-0.10,0.78], ['company_close','原单位关停',-0.06,0.70], ['upgrade_move','原经营者升级换址',0.02,0.28]
].map(([id,name,rentMod,urgency]) => ({ id,name,weight:1,rentMod,urgency }));

const advantageNames = [
  '转角位','双门头','超宽门面','大外摆区','独立停车场','近地铁','近学校','近写字楼','近社区入口','原餐饮装修','带可用设备','独立排烟',
  '燃气已通','大电量','独立上下水','隔油池齐全','消防条件好','高层高','少柱空间','方正户型','后门卸货','货梯直达','独立垃圾点','骑手取餐方便',
  '夜间可营业','招牌展示面大','可做明档','可做包间','带后院','带露台','景观面好','停车免费时段','物业费低','免租期可谈','租期稳定','已有稳定客群'
];
const ADVANTAGES = Object.fromEntries(advantageNames.map((name,index) => [`adv_${index + 1}`, { id:`adv_${index + 1}`, name, score: index < 6 ? 5 : index < 18 ? 4 : 3, rentFactor: index < 9 ? 1.02 : 1.00 }]));

const defectNames = [
  ['weak_visibility','门头可见性差',0.94,1,3500],['poor_parking','停车不便',0.97,1,0],['noise_neighbor','邻里噪音限制',0.96,1,0],['old_pipeline','管线老化',0.92,2,9000],
  ['delivery_access','骑手取餐动线差',0.97,1,1500],['short_lease','租期偏短',0.96,1,0],['no_exhaust','无独立排烟',0.88,2,22000],['weak_exhaust','排烟能力偏弱',0.94,1,9000],
  ['no_gas','无燃气',0.96,1,0],['weak_power','电力容量不足',0.93,2,18000],['poor_drainage','排水能力不足',0.93,2,14000],['no_grease_trap','无隔油设施',0.96,1,8000],
  ['fire_rectify','消防待整改',0.90,3,28000],['water_leak','漏水隐患',0.92,2,12000],['damp','返潮/潮湿',0.94,1,7000],['old_ac','空调系统老旧',0.96,1,12000],
  ['low_ceiling','层高偏低',0.95,1,0],['many_columns','柱网密集',0.95,1,5000],['deep_narrow','进深过深',0.96,1,0],['narrow_front','门宽偏窄',0.95,1,0],
  ['upper_no_lift','楼上无电梯',0.91,2,0],['bad_lift','电梯运力不足',0.95,1,0],['no_loading','卸货条件差',0.96,1,0],['garbage_route','垃圾清运动线差',0.96,1,0],
  ['odor_sensitive','周边对油烟敏感',0.92,2,0],['resident_complaint','居民投诉风险',0.91,2,0],['sign_limit','招牌限制严格',0.96,1,0],['outdoor_forbidden','禁止外摆',0.98,1,0],
  ['business_hour_limit','营业时间受限',0.93,2,0],['delivery_limit','外卖骑手进入受限',0.96,1,0],['property_fee_high','物业费偏高',0.95,1,0],['transfer_fee_high','转让费偏高',0.93,1,0],
  ['rent_increase_high','递增条款偏高',0.95,1,0],['owner_interference','房东干预较多',0.97,1,0],['shared_exhaust','共用排烟不稳定',0.92,2,12000],['shared_toilet','无独立卫生间',0.98,1,5000],
  ['few_parking','停车位不足',0.97,1,0],['far_transit','公共交通较远',0.96,1,0],['roadworks_risk','近期道路施工',0.92,2,0],['seasonal_flow','客流季节性强',0.94,1,0],
  ['office_weekend_weak','周末客流偏弱',0.96,1,0],['school_holiday_weak','寒暑假客流波动',0.95,1,0],['industrial_night_weak','夜间客流弱',0.97,1,0],['tourist_offseason','淡季波动大',0.94,1,0],
  ['high_competition','周边同类竞争高',0.95,1,0],['renovation_heavy','拆改量大',0.92,2,30000],['equipment_obsolete','遗留设备老化',0.96,1,16000],['none_material','无明显硬伤',1.00,0,0]
];
const DEFECTS = Object.fromEntries(defectNames.map(([id,name,rentFactor,risk,fitout],index) => [id,{ id,name,weight:id==='none_material'?18:1 + (index%4),rentFactor,risk,fitout }]));

const restrictionNames = [
  '禁止明火','禁止燃气','限制重油烟','禁止烧烤','禁止火锅','禁止夜间营业','限制营业至22点','限制外摆','禁止酒类经营','限制高噪音设备','限制大功率设备','排烟需接公共烟道',
  '垃圾定时清运','货车限时进场','骑手不得进入内场','招牌尺寸限制','门头不得改色','不得破坏承重结构','上下水改造需审批','消防改造需审批','燃气改造需审批','空调外机位置受限',
  '不得设置包间','不得设置舞台','不得经营活鲜','不得经营强气味品类','仅允许轻餐饮','仅允许餐饮配套','需统一营业时间','需统一收银','需营业额报送','需品牌审核'
];
const RESTRICTIONS = restrictionNames.map((name,index) => ({ id:`restriction_${index + 1}`, name, risk:index < 6 ? 2 : 1 }));

const TRANSACTION_METHODS = [
  { id:'standard_lease',name:'普通租赁',weight:34 },{ id:'transfer_lease',name:'转让+租赁',weight:16 },{ id:'equipped_lease',name:'带设备租赁',weight:8 },
  { id:'mall_hybrid',name:'保底+扣点',weight:7 },{ id:'turnover_share',name:'营业额抽成',weight:5 },{ id:'joint_operation',name:'联营',weight:4 },
  { id:'canteen_concession',name:'食堂承包',weight:4 },{ id:'whole_floor_lease',name:'整层租赁',weight:3 },{ id:'whole_building_lease',name:'整栋租赁',weight:2 },
  { id:'project_lease',name:'项目整体租赁',weight:1 },{ id:'developer招商',name:'开发商招商',weight:5 },{ id:'short_pop_up',name:'短期快闪/临租',weight:2 }
];

const FREE_VISUALS = Array.from({ length: 40 }, (_, index) => ({
  id: `visual_${index + 1}`,
  name: [
    '暖砖门脸','白砖门脸','旧式门头','玻璃门脸','市场雨棚','写字楼简洁立面','木格栅门脸','深色金属门脸','浅色石材门脸','红砖工业风',
    '骑楼立面','转角玻璃立面','社区暖色立面','夜市灯串门脸','古城木构立面','景区灰瓦立面','商场标准门脸','商场开放式门脸','机场标准店面','地铁通道店面',
    '工业园简洁门脸','校园青春风门脸','商务轻奢门脸','大型酒楼门脸','海鲜城门脸','火锅旗舰门脸','宴会厅入口','独栋庭院门脸','院落门楼','露台餐厅立面',
    '商业裙楼立面','整层餐饮导视','品牌撤店旧门脸','毛坯新铺','带设备旧店','资产处置旧铺','简洁白墙门脸','复古招牌门脸','现代灯箱门脸','极简无招牌门脸'
  ][index]
}));

const MARKET_INVENTORY_GUIDE = {
  micro: { stock: [500, 900], listed: [50, 80] },
  small: { stock: [900, 1600], listed: [80, 130] },
  small_mid: { stock: [700, 1200], listed: [60, 100] },
  medium: { stock: [350, 700], listed: [30, 60] },
  large: { stock: [120, 250], listed: [12, 25] },
  super: { stock: [30, 80], listed: [3, 10] },
  project: { stock: [5, 20], listed: [1, 4] }
};

module.exports = {
  SIZE_BANDS,
  DISTRICT_BASELINES,
  CATEGORY_SPECS,
  PROPERTY_CATEGORIES,
  PROPERTY_SUBTYPES,
  PROPERTY_SUBTYPE_BY_ID,
  PROPERTY_ARCHETYPES,
  STRUCTURE_TEMPLATES,
  RESTAURANT_MODES,
  LANDLORD_PROFILES,
  LANDLORD_TRAITS,
  CONTRACT_PROFILES,
  HISTORICAL_USES,
  VACANCY_REASONS,
  ADVANTAGES,
  DEFECTS,
  RESTRICTIONS,
  TRANSACTION_METHODS,
  FREE_VISUALS,
  MARKET_INVENTORY_GUIDE,
  sizeBandForArea
};
