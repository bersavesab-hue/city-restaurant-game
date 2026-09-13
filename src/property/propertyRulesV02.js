'use strict';

const {
  SIZE_BANDS,
  DISTRICT_BASELINES,
  PROPERTY_ARCHETYPES,
  PROPERTY_SUBTYPES,
  PROPERTY_SUBTYPE_BY_ID,
  RESTAURANT_MODES,
  ADVANTAGES,
  DEFECTS,
  RESTRICTIONS,
  sizeBandForArea
} = require('./propertyPackV02.js');

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, Number(value) || 0));
}

function round(value, digits = 0) {
  const m = 10 ** digits;
  return Math.round((Number(value) || 0) * m) / m;
}

function bool(value, fallback = false) {
  return typeof value === 'boolean' ? value : fallback;
}

function parseFloor(value) {
  if (Number.isFinite(Number(value))) return Math.max(1, Math.round(Number(value)));
  const text = String(value || '');
  const m = text.match(/(\d+)/);
  return m ? Math.max(1, Number(m[1])) : 1;
}

function districtBaseline(districtId) {
  return DISTRICT_BASELINES[districtId] || DISTRICT_BASELINES.university;
}

function findSubtypeByText(item = {}) {
  const text = `${item.propertySubtypeId || ''} ${item.propertyTypeId || ''} ${item.propertyTypeName || ''} ${item.layoutTypeName || ''} ${item.address || ''}`.toLowerCase();
  const exact = PROPERTY_SUBTYPE_BY_ID[item.propertySubtypeId] || PROPERTY_SUBTYPE_BY_ID[item.propertyTypeId];
  if (exact) return exact;

  const keywordMap = [
    [/整区|commercial.street.zone|商业街整区/, 'commercial_street_zone'],
    [/整层|whole.floor|商业综合体/, 'complex_floor'],
    [/裙楼/, 'commercial_podium'],
    [/会展/, 'convention_catering'],
    [/婚宴/, 'wedding_hotel_floor'],
    [/海鲜.*酒楼|海鲜城/, 'seafood_hall'],
    [/大型.*火锅/, 'large_hotpot'],
    [/大型.*自助/, 'large_buffet'],
    [/宴会/, 'banquet_restaurant'],
    [/独栋|independent|detached/, 'detached_street'],
    [/院落|小院|庭院/, 'courtyard_restaurant'],
    [/带后院/, 'rear_yard_shop'],
    [/机场/, 'airport_food'],
    [/火车站|铁路站/, 'railway_outer'],
    [/地铁口/, 'metro_exit'],
    [/交通枢纽/, 'transport_hub_complex'],
    [/景区.*入口/, 'scenic_gate'],
    [/古城/, 'ancient_town'],
    [/度假区/, 'resort_dining'],
    [/夜市.*摊|摊位/, 'night_stall'],
    [/夜宵街/, 'late_night_street'],
    [/小吃街/, 'snack_street'],
    [/写字楼.*底商|办公.*底商/, 'office_podium'],
    [/办公.*食堂|写字楼.*食堂/, 'office_canteen'],
    [/工业园.*街铺/, 'industrial_street'],
    [/物流园/, 'logistics_park_food'],
    [/厂区.*入口/, 'factory_gate'],
    [/高校.*食堂/, 'university_canteen'],
    [/医院.*食堂/, 'hospital_canteen'],
    [/企业.*食堂/, 'enterprise_canteen'],
    [/机关.*食堂/, 'government_canteen'],
    [/食堂.*窗口|校园.*档口/, 'canteen_window'],
    [/大学.*商业街|学校.*商业街/, 'university_street'],
    [/校门/, 'school_gate'],
    [/菜市场.*档口/, 'wetmarket_stall'],
    [/菜市场.*门面/, 'wetmarket_front'],
    [/农贸/, 'farmmarket_outer'],
    [/批发市场/, 'wholesale_support'],
    [/美食城.*档口|food.?hall/, 'foodhall_stall'],
    [/美食广场/, 'foodcourt_unit'],
    [/商场.*b1|b1.*餐饮/, 'mall_b1'],
    [/商场|购物中心|mall/, 'mall_standard'],
    [/社区.*入口/, 'community_gate'],
    [/住宅.*底商|社区.*底商/, 'community_ground'],
    [/转角/, 'street_corner'],
    [/双开间/, 'street_double'],
    [/临街|街铺|底商|street/, 'street_single'],
    [/急转/, 'urgent_transfer'],
    [/倒闭.*接盘/, 'failed_business_takeover'],
    [/带设备.*转租/, 'equipped_sublease'],
    [/资产处置/, 'asset_disposal'],
    [/品牌撤店/, 'brand_exit']
  ];
  for (const [regex, id] of keywordMap) {
    if (regex.test(text) && PROPERTY_SUBTYPE_BY_ID[id]) return PROPERTY_SUBTYPE_BY_ID[id];
  }
  return PROPERTY_SUBTYPE_BY_ID.street_single || PROPERTY_SUBTYPES[0];
}

function normalizePropertySubtype(item = {}) {
  return findSubtypeByText(item);
}

function normalizePropertyKind(item = {}) {
  const subtype = normalizePropertySubtype(item);
  const categoryId = subtype.categoryId;
  if (categoryId === 'community_commercial') return 'community_shop';
  if (categoryId === 'mall_commercial' || categoryId === 'food_hall') return 'mall_stall';
  if (categoryId === 'market_commercial') return 'market_stall';
  if (categoryId === 'office_commercial') return 'office_podium';
  if (categoryId === 'transport_commercial') return 'station_shop';
  if (categoryId === 'standalone_catering') return 'standalone';
  if (categoryId === 'large_catering') return 'large_catering';
  if (categoryId === 'complex_project') return 'project';
  if (categoryId === 'institutional_catering') return 'institutional';
  const floor = parseFloor(item.floor);
  if (floor > 1 && ['street_commercial', 'special_opportunity'].includes(categoryId)) return 'upper_floor';
  return 'street_shop';
}

function facilityView(item = {}) {
  const heat = bool(item.gas) || bool(item.threePhase) || Number(item.powerKw || item.electricKW || 0) >= 18;
  return {
    exhaust: bool(item.exhaust),
    gas: bool(item.gas),
    threePhase: bool(item.threePhase),
    drainage: bool(item.drainage, true),
    greaseTrap: bool(item.greaseTrap),
    fire: bool(item.fire, true),
    heat,
    power: bool(item.threePhase) || Number(item.powerKw || item.electricKW || 0) >= 8
  };
}

function areaRentFactor(area) {
  const band = sizeBandForArea(area);
  return band ? band.rentFactor : 1;
}

function estimatePhysicalCapacity(item, kindOrSubtype) {
  const subtype = typeof kindOrSubtype === 'object'
    ? kindOrSubtype
    : PROPERTY_SUBTYPE_BY_ID[kindOrSubtype] || normalizePropertySubtype(item);
  const archetype = PROPERTY_ARCHETYPES[normalizePropertyKind(item)] || PROPERTY_ARCHETYPES.generic;
  const area = Math.max(1, Number(item.grossArea || item.area) || 1);
  const kitchenRatio = clamp(subtype?.kitchenRatio ?? archetype.backOfHouse ?? 0.34, 0.18, 0.62);
  const serviceAndStorageRatio = area >= 2500 ? 0.18 : area >= 900 ? 0.15 : area >= 400 ? 0.12 : 0.09;
  const diningArea = Math.max(0, area * (1 - kitchenRatio - serviceAndStorageRatio));
  const seatArea = area >= 900 ? 2.2 : area >= 400 ? 2.05 : area >= 180 ? 1.95 : 1.85;
  let seats = Math.floor(diningArea / seatArea);
  if (subtype?.id === 'foodhall_stall' || subtype?.id === 'canteen_window' || subtype?.id === 'night_stall') seats = Math.min(seats, 8);
  if (area < 18) seats = Math.min(seats, 4);
  const rooms = area < 180 ? 0 : area < 400 ? Math.floor(area / 120) : area < 900 ? Math.floor(area / 90) : Math.floor(area / 80);
  return {
    kitchenRatio: round(kitchenRatio, 2),
    backOfHouseRatio: round(kitchenRatio + serviceAndStorageRatio, 2),
    estimatedDiningArea: round(diningArea, 1),
    maxPracticalSeats: Math.max(0, seats),
    estimatedPrivateRooms: Math.max(0, Math.min(60, rooms)),
    scaleBandId: sizeBandForArea(area).id,
    scaleBandName: sizeBandForArea(area).name
  };
}

function restrictionBlocksMode(item, modeId) {
  const text = (item.restrictions || []).map((x) => typeof x === 'string' ? x : x.name).join(' ');
  if (/仅允许轻餐饮/.test(text) && !['beverage','bakery','fast_meal'].includes(modeId)) return true;
  if (/禁止明火|禁止燃气/.test(text) && ['wok','bbq','hotpot','seafood','banquet'].includes(modeId)) return true;
  if (/限制重油烟/.test(text) && ['wok','bbq','seafood'].includes(modeId)) return true;
  if (/禁止烧烤/.test(text) && modeId === 'bbq') return true;
  if (/禁止火锅/.test(text) && modeId === 'hotpot') return true;
  if (/不得经营活鲜/.test(text) && modeId === 'seafood') return true;
  return false;
}

function evaluateMode(item, modeId) {
  const mode = RESTAURANT_MODES[modeId];
  if (!mode) throw new Error(`未知餐饮模式: ${modeId}`);
  const facilities = facilityView(item);
  const area = Math.max(0, Number(item.grossArea || item.area) || 0);
  const floor = parseFloor(item.floor);
  const visibility = clamp(item.visibility == null ? 55 : item.visibility, 0, 100);
  const missing = [];
  const softMissing = [];
  for (const key of mode.hard || []) if (!facilities[key]) missing.push(key);
  for (const key of mode.soft || []) if (!facilities[key]) softMissing.push(key);
  if (area < mode.minArea) missing.push('area');
  if (restrictionBlocksMode(item, modeId)) missing.push('propertyRestriction');

  let score = 100;
  score -= missing.length * 24;
  score -= softMissing.length * 6;
  if (area < mode.idealArea[0]) score -= 12;
  if (area > mode.idealArea[1]) {
    const oversize = area / Math.max(1, mode.idealArea[1]);
    score -= Math.min(34, (oversize - 1) * 13);
  }
  if (mode.maxEfficientArea && area > mode.maxEfficientArea) score -= Math.min(25, (area / mode.maxEfficientArea - 1) * 18);
  if (floor > 1) {
    if (['beverage','bakery','banquet','buffet'].includes(modeId)) score -= 4;
    else score -= 10;
  }
  score += (visibility - 55) * 0.08;

  const categoryId = normalizePropertySubtype(item).categoryId;
  if (categoryId === 'institutional_catering' && modeId === 'group_meal') score += 12;
  if (categoryId === 'large_catering' && ['banquet','seafood','buffet','hotpot','casual_dining'].includes(modeId)) score += 7;
  if (categoryId === 'complex_project' && ['banquet','buffet','casual_dining','group_meal'].includes(modeId)) score += 6;
  if (categoryId === 'food_hall' && ['beverage','bakery','fast_meal','noodles'].includes(modeId)) score += 6;
  if (categoryId === 'night_economy' && ['bbq','hotpot'].includes(modeId)) score += 5;
  score = clamp(score, 0, 100);

  return { id: modeId, name: mode.name, score: Math.round(score), viable: missing.length === 0, missing, softMissing };
}

function evaluateRestaurantModes(item) {
  const rows = Object.keys(RESTAURANT_MODES).map((id) => evaluateMode(item, id));
  rows.sort((a, b) => b.score - a.score);
  return rows;
}

function fairMonthlyRent(item, districtId, defectIds) {
  const district = districtBaseline(districtId);
  const subtype = normalizePropertySubtype(item);
  const area = Math.max(6, Number(item.grossArea || item.area) || 30);
  const floor = parseFloor(item.floor);
  const visibility = clamp(item.visibility == null ? subtype.baseVisibility : item.visibility, 0, 100);
  const defects = (Array.isArray(defectIds) ? defectIds : [defectIds]).filter(Boolean).map((id) => DEFECTS[id]).filter(Boolean);
  const floorFactor = floor <= 1 ? 1 : floor === 2 ? 0.78 : floor === 3 ? 0.69 : 0.63;
  const visibilityFactor = clamp(0.82 + visibility / 300, 0.82, 1.14);
  const hardware = facilityView(item);
  let hardwareFactor = 0.93;
  if (hardware.exhaust) hardwareFactor += 0.025;
  if (hardware.gas || hardware.threePhase) hardwareFactor += 0.025;
  if (hardware.drainage) hardwareFactor += 0.015;
  if (hardware.fire) hardwareFactor += 0.01;
  const defectFactor = defects.reduce((m, d) => m * (d.rentFactor || 1), 1);
  const advantageFactor = (item.advantageIds || []).map((id) => ADVANTAGES[id]).filter(Boolean).reduce((m, a) => m * (a.rentFactor || 1), 1);
  const sizeFactor = areaRentFactor(area);
  const supplyFactor = Number(district.supplyPressure || 1);
  const monthly = district.rentPerSqm * area * subtype.rentFactor * floorFactor * visibilityFactor * hardwareFactor * defectFactor * advantageFactor * sizeFactor * supplyFactor;
  return Math.max(200, Math.round(monthly / 10) * 10);
}

function classifyRent(askingRent, fairRent) {
  const ask = Math.max(1, Number(askingRent) || 1);
  const fair = Math.max(1, Number(fairRent) || 1);
  const ratio = ask / fair;
  if (ratio <= 0.88) return { id:'below', name:'明显低于参考', ratio:round(ratio,2), score:92 };
  if (ratio <= 1.05) return { id:'fair', name:'合理区间', ratio:round(ratio,2), score:82 };
  if (ratio <= 1.18) return { id:'slightly_high', name:'略高', ratio:round(ratio,2), score:66 };
  if (ratio <= 1.35) return { id:'high', name:'偏高', ratio:round(ratio,2), score:48 };
  return { id:'very_high', name:'明显偏高', ratio:round(ratio,2), score:28 };
}

function estimateStartup(item, modeId) {
  const mode = RESTAURANT_MODES[modeId] || RESTAURANT_MODES.fast_meal;
  const area = Math.max(6, Number(item.grossArea || item.area) || 30);
  const rent = Math.max(0, Number(item.askingMonthlyRent || item.monthlyRent) || 0);
  const deposit = Math.max(0, Number(item.depositMonths) || 0);
  const payment = Math.max(1, Number(item.paymentMonths) || 1);
  const transfer = Math.max(0, Number(item.askingTransferFee || item.transferFee) || 0);
  const renovationLevel = String(item.renovationLevel || '简装');
  const renovationFactor = /餐饮旧装|带设备/.test(renovationLevel) ? 0.58 : /毛坯/.test(renovationLevel) ? 1.18 : 0.85;
  const defectFix = (item.defectIds || [item.defectId]).filter(Boolean).map((id) => DEFECTS[id]).filter(Boolean).reduce((sum, d) => sum + Number(d.fitout || 0), 0);
  const scale = sizeBandForArea(area);
  const scaleEfficiency = scale.id === 'project' ? 0.78 : scale.id === 'super' ? 0.84 : scale.id === 'large' ? 0.90 : 1;
  const fitout = Math.round(area * mode.fitoutPerSqm * renovationFactor * scaleEfficiency + defectFix);
  const equipmentScale = Math.pow(Math.max(1, area / Math.max(35, mode.idealArea[0])), 0.62);
  const equipment = Math.round(mode.equipmentBase * equipmentScale);
  const openingInventory = Math.round(Math.max(3500, equipment * 0.10));
  const workingCapital = Math.round(Math.max(rent * 3, fitout * 0.16, area * 180));
  const propertyFeeDeposit = Math.round(Math.max(0, Number(item.propertyFeeMonthly || 0)) * 3);
  const initialRent = rent * (deposit + payment);
  const total = initialRent + transfer + fitout + equipment + openingInventory + workingCapital + propertyFeeDeposit;
  return { initialRent, transfer, fitout, equipment, openingInventory, workingCapital, propertyFeeDeposit, total };
}

function projectComplexity(item) {
  const area = Number(item.grossArea || item.area) || 0;
  const band = sizeBandForArea(area);
  const base = { micro:10, small:18, small_mid:28, medium:42, large:58, super:74, project:90 }[band.id] || 30;
  let score = base;
  if (parseFloor(item.floor) > 1) score += 4;
  if (Array.isArray(item.restrictions)) score += Math.min(8, item.restrictions.length * 1.5);
  if (area >= 900) score += 4;
  if (area >= 2500) score += 4;
  return Math.round(clamp(score, 5, 100));
}

module.exports = {
  clamp,
  round,
  bool,
  parseFloor,
  districtBaseline,
  normalizePropertyKind,
  normalizePropertySubtype,
  facilityView,
  areaRentFactor,
  estimatePhysicalCapacity,
  evaluateMode,
  evaluateRestaurantModes,
  fairMonthlyRent,
  classifyRent,
  estimateStartup,
  projectComplexity,
  restrictionBlocksMode
};
