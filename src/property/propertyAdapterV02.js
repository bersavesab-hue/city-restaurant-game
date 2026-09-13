'use strict';

const { SeededRng, hashString } = require('../foundation/rng.js');
const {
  SIZE_BANDS,
  DISTRICT_BASELINES,
  PROPERTY_SUBTYPES,
  PROPERTY_SUBTYPE_BY_ID,
  STRUCTURE_TEMPLATES,
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
  sizeBandForArea
} = require('./propertyPackV02.js');
const rules = require('./propertyRulesV02.js');

const NAMES = ['赵建国','周晓梅','李卫东','王秀兰','陈安','孙悦','郭志强','何静','刘晨','马小峰','郑海涛','吴桂芳','许文斌','张丽华','梁志伟','宋春梅','唐国强','谢红霞','蒋小军','邓慧'];
const BROKERS = ['安居商业地产','云州商铺网','城市铺面通','邻里商业顾问','华盛商业顾问','城市资产服务'];

const DISTRICT_CATEGORY_WEIGHTS = {
  university: { education_commercial: 2.4, food_hall: 1.7, street_commercial: 1.4, community_commercial: 1.2, night_economy: 1.3, mall_commercial: 1.0, large_catering: 0.35, complex_project: 0.12 },
  cbd: { office_commercial: 2.2, mall_commercial: 1.8, street_commercial: 1.4, large_catering: 1.1, complex_project: 0.8, food_hall: 1.0, community_commercial: 0.5 },
  hightech: { office_commercial: 2.2, industrial_commercial: 1.2, street_commercial: 1.1, mall_commercial: 1.0, institutional_catering: 1.0, large_catering: 0.6 },
  oldtown: { street_commercial: 1.8, community_commercial: 1.4, market_commercial: 1.3, night_economy: 1.2, standalone_catering: 1.0, tourism_commercial: 0.8, complex_project: 0.18 },
  village: { street_commercial: 1.7, community_commercial: 1.8, market_commercial: 1.2, night_economy: 1.2, food_hall: 0.7, large_catering: 0.2, complex_project: 0.04 },
  market: { market_commercial: 2.4, street_commercial: 1.5, food_hall: 1.3, special_opportunity: 1.0, community_commercial: 0.9, large_catering: 0.35 },
  industry: { industrial_commercial: 2.7, institutional_catering: 1.8, street_commercial: 1.0, community_commercial: 0.5, office_commercial: 0.6, large_catering: 0.3, complex_project: 0.08 }
};

function rngFor(seed, salt = '') {
  return new SeededRng(`property-v100:${seed}:${salt}`);
}

function deterministicPick(rows, seed, salt) {
  if (!Array.isArray(rows) || rows.length === 0) return null;
  return rows[hashString(`${seed}:${salt}`) % rows.length];
}

function weightedPick(rows, seed, salt, weightFn) {
  const rng = rngFor(seed, salt);
  return rng.weighted(rows, (row) => Math.max(0, Number(weightFn ? weightFn(row) : row.weight || 1)));
}

function pickDistinct(rows, count, seed, salt) {
  const pool = [...rows];
  const out = [];
  const rng = rngFor(seed, salt);
  while (pool.length && out.length < count) {
    const i = rng.int(0, pool.length - 1);
    out.push(pool.splice(i, 1)[0]);
  }
  return out;
}

function inferLandlordProfile(item, seed, subtype) {
  if (item.landlordProfileId && LANDLORD_PROFILES[item.landlordProfileId]) return item.landlordProfileId;
  const text = `${item.landlordNegotiation || ''} ${item.landlordRenewalRisk || ''} ${item.propertyTypeName || ''}`;
  if (/机构|商场|运营/.test(text)) return subtype.categoryId === 'mall_commercial' ? 'mall_operator' : 'asset_manager';
  if (/高|易|好/.test(text)) return 'urgent';
  if (/低|难/.test(text)) return 'price_focused';
  const rows = Object.values(LANDLORD_PROFILES);
  return (weightedPick(rows, seed, 'landlord', (row) => {
    let w = row.weight || 1;
    if (subtype.categoryId === 'mall_commercial' && row.id === 'mall_operator') w *= 8;
    if (subtype.categoryId === 'institutional_catering' && ['school_property','park_operator','state_property','local_company'].includes(row.id)) w *= 7;
    if (subtype.categoryId === 'complex_project' && ['large_developer','asset_manager','state_property','trust_company'].includes(row.id)) w *= 6;
    if (subtype.categoryId === 'tourism_commercial' && row.id === 'scenic_operator') w *= 7;
    if (subtype.categoryId === 'transport_commercial' && row.id === 'station_operator') w *= 8;
    return w;
  }) || LANDLORD_PROFILES.stable).id;
}

function contractCandidates(subtype) {
  const category = subtype.categoryId;
  const ids = Object.keys(CONTRACT_PROFILES);
  if (category === 'mall_commercial' || category === 'food_hall') return ids.filter((id) => /mall|招商|fitout|deposit/.test(id));
  if (category === 'institutional_catering') return ids.filter((id) => ['canteen_concession','joint_operation','deposit1_pay3','fitout_period','longterm_friendly'].includes(id));
  if (category === 'complex_project') return ids.filter((id) => ['whole_floor','whole_project','longterm_friendly','fitout_period','fixed_longterm'].includes(id));
  if (category === 'special_opportunity') return ids.filter((id) => ['equipment_lease','equipment_transfer','deposit1_pay3','deposit2_pay3','fitout_period'].includes(id));
  return ids.filter((id) => !['canteen_concession','whole_project','whole_floor','mall_turnover','mall_deduction','mall_guarantee_deduction','mall_min_turnover'].includes(id));
}

function inferContractProfile(item, subtype, seed) {
  if (item.contractProfileId && CONTRACT_PROFILES[item.contractProfileId]) return item.contractProfileId;
  const deposit = Number(item.depositMonths);
  const payment = Number(item.paymentMonths);
  if (deposit === 1 && payment === 3) return 'deposit1_pay3';
  if (deposit === 2 && payment === 3) return 'deposit2_pay3';
  if (deposit === 2 && payment === 1) return 'deposit2_pay1';
  const rows = contractCandidates(subtype).map((id) => CONTRACT_PROFILES[id]);
  return (weightedPick(rows, seed, 'contract', (row) => row.weight) || CONTRACT_PROFILES.deposit1_pay3).id;
}

function inferHistoricalUse(item, seed) {
  if (item.previousBusiness) {
    const exact = HISTORICAL_USES.find((row) => row.name === item.previousBusiness);
    if (exact) return exact;
  }
  return deterministicPick(HISTORICAL_USES, seed, 'history') || HISTORICAL_USES[0];
}

function inferVacancyReason(item, seed) {
  if (item.vacancyReason) {
    const exact = VACANCY_REASONS.find((row) => row.name === item.vacancyReason);
    if (exact) return exact;
  }
  return deterministicPick(VACANCY_REASONS, seed, 'vacancy') || VACANCY_REASONS[0];
}

function inferDefects(item, seed, subtype) {
  if (Array.isArray(item.defectIds) && item.defectIds.length) return item.defectIds.filter((id) => DEFECTS[id]);
  const found = [];
  const text = (item.risks || []).join(' ');
  const mapping = [
    [/门头|可见/, 'weak_visibility'], [/停车/, 'poor_parking'], [/噪音|邻里/, 'noise_neighbor'], [/管线|老化/, 'old_pipeline'],
    [/骑手|取餐/, 'delivery_access'], [/租期/, 'short_lease'], [/排烟/, 'no_exhaust'], [/电力/, 'weak_power'], [/消防/, 'fire_rectify']
  ];
  mapping.forEach(([regex,id]) => { if (regex.test(text)) found.push(id); });
  if (found.length) return [...new Set(found)].slice(0, 3);
  const area = Number(item.grossArea || item.area) || 30;
  const baseChance = subtype.categoryId === 'special_opportunity' ? 0.72 : area > 900 ? 0.40 : 0.46;
  const rng = rngFor(seed, 'defects');
  if (!rng.chance(baseChance)) return ['none_material'];
  const pool = Object.values(DEFECTS).filter((row) => row.id !== 'none_material');
  const count = rng.chance(0.18) ? 3 : rng.chance(0.45) ? 2 : 1;
  return pickDistinct(pool, count, seed, 'defect-list').map((row) => row.id);
}

function inferAdvantages(item, seed, subtype) {
  if (Array.isArray(item.advantageIds) && item.advantageIds.length) return item.advantageIds.filter((id) => ADVANTAGES[id]);
  const pool = Object.values(ADVANTAGES);
  const rng = rngFor(seed, 'advantages');
  const count = subtype.categoryId === 'complex_project' ? rng.int(2, 4) : rng.int(1, 3);
  return pickDistinct(pool, count, seed, 'adv-list').map((row) => row.id);
}

function inferRestrictions(item, seed, subtype) {
  if (Array.isArray(item.restrictions) && item.restrictions.length) return item.restrictions.map((x) => typeof x === 'string' ? x : x.name).filter(Boolean);
  const category = subtype.categoryId;
  const preferred = RESTRICTIONS.filter((row) => {
    if (category === 'mall_commercial' || category === 'food_hall') return /燃气|明火|营业时间|招牌|统一|骑手|审批|品牌/.test(row.name);
    if (category === 'community_commercial') return /夜间|油烟|噪音|外摆|招牌/.test(row.name);
    if (category === 'transport_commercial') return /统一|品牌|货车|骑手|招牌|明火/.test(row.name);
    if (category === 'institutional_catering') return /餐饮配套|统一|营业额|审批/.test(row.name);
    if (category === 'complex_project') return /审批|统一|品牌|货车|招牌/.test(row.name);
    return true;
  });
  const rng = rngFor(seed, 'restrictions');
  const count = ['mall_commercial','food_hall','transport_commercial'].includes(category) ? rng.int(1, 3) : rng.int(0, 2);
  return pickDistinct(preferred, count, seed, 'restriction-list').map((row) => row.name);
}

function normalizePhysicalFields(item, subtype, seed) {
  const out = { ...item };
  const rng = rngFor(seed, 'physical');
  const district = DISTRICT_BASELINES[out.districtId] || DISTRICT_BASELINES.university;
  const chances = subtype.facilityChance || {};
  for (const key of ['exhaust','gas','threePhase','drainage','greaseTrap','fire']) {
    if (typeof out[key] === 'boolean') continue;
    const p = Number(chances[key]);
    out[key] = rng.chance(Number.isFinite(p) ? p : 0.5);
  }
  const area = Math.max(6, Number(out.grossArea || out.area) || Math.round((subtype.areaRange[0] + subtype.areaRange[1]) / 2));
  out.grossArea = area;
  const floorOptions = subtype.floorOptions || [1];
  out.floor = out.floor || `${floorOptions[hashString(`${seed}:floor`) % floorOptions.length]}层`;
  out.frontage = Number(out.frontage) || Math.max(2, Math.round(Math.sqrt(area) * (0.62 + rng.next() * 0.32) * 10) / 10);
  out.depth = Number(out.depth) || Math.max(3, Math.round((area / Math.max(2, out.frontage)) * 10) / 10);
  out.ceilingHeight = Number(out.ceilingHeight) || (area >= 2500 ? round2(rng.float(4.8, 7.5)) : area >= 900 ? round2(rng.float(4.2, 6.2)) : round2(rng.float(3.2, 5.0)));
  out.visibility = rules.clamp(out.visibility == null ? subtype.baseVisibility + rng.int(-8, 8) : out.visibility, 5, 98);
  out.powerKw = Number(out.powerKw || out.electricKW) || Math.round(Math.max(8, area * (out.threePhase ? rng.float(0.16, 0.32) : rng.float(0.08, 0.14))));
  out.parkingSpaces = Number.isFinite(Number(out.parkingSpaces)) ? Number(out.parkingSpaces) : Math.max(0, Math.round((area / 80) * (district.parking || 50) / 100 * rng.float(0.55, 1.35)));
  out.loadingAccess = typeof out.loadingAccess === 'boolean' ? out.loadingAccess : rng.chance(area >= 400 ? 0.78 : area >= 180 ? 0.48 : 0.20);
  out.freightElevator = typeof out.freightElevator === 'boolean' ? out.freightElevator : (rules.parseFloor(out.floor) > 1 && area >= 180 ? rng.chance(0.68) : false);
  out.outdoorArea = Number.isFinite(Number(out.outdoorArea)) ? Number(out.outdoorArea) : Math.max(0, Math.round(area * (['standalone_catering','night_economy','tourism_commercial'].includes(subtype.categoryId) ? rng.float(0.05, 0.35) : rng.float(0, 0.08))));
  const propertyFeeRate = ['mall_commercial','complex_project','transport_commercial'].includes(subtype.categoryId) ? rng.float(18, 42) : rng.float(3, 16);
  out.propertyFeeMonthly = Number(out.propertyFeeMonthly) || Math.round(area * propertyFeeRate);
  return out;
}

function round2(value) { return Math.round(value * 100) / 100; }

function compatibleStructure(subtype, area, seed) {
  const candidates = STRUCTURE_TEMPLATES.filter((row) => row.subtypeId === subtype.id && area >= row.areaRange[0] * 0.82 && area <= row.areaRange[1] * 1.18);
  const fallback = STRUCTURE_TEMPLATES.filter((row) => row.subtypeId === subtype.id);
  return deterministicPick(candidates.length ? candidates : fallback, seed, 'structure');
}

function transactionMethodFor(subtype, seed) {
  const category = subtype.categoryId;
  const pool = TRANSACTION_METHODS.filter((row) => {
    if (category === 'institutional_catering') return ['canteen_concession','joint_operation','standard_lease'].includes(row.id);
    if (category === 'complex_project') return ['project_lease','whole_floor_lease','whole_building_lease','joint_operation','developer招商'].includes(row.id);
    if (category === 'mall_commercial' || category === 'food_hall') return ['mall_hybrid','turnover_share','standard_lease','developer招商'].includes(row.id);
    if (category === 'special_opportunity') return ['transfer_lease','equipped_lease','standard_lease','developer招商'].includes(row.id);
    return ['standard_lease','transfer_lease','equipped_lease','short_pop_up'].includes(row.id);
  });
  return weightedPick(pool, seed, 'transaction', (row) => row.weight) || TRANSACTION_METHODS[0];
}

function enrichListing(rawItem, context = {}) {
  const raw = { ...(rawItem || {}) };
  const seed = raw.marketKey || raw.id || `${raw.address || 'property'}:${context.currentDay || 0}`;
  const districtId = raw.districtId || context.districtId || 'university';
  const subtype = rules.normalizePropertySubtype({ ...raw, districtId });
  let item = normalizePhysicalFields({ ...raw, districtId }, subtype, seed);
  const kind = rules.normalizePropertyKind(item);
  const scaleBand = sizeBandForArea(item.grossArea);
  const structure = compatibleStructure(subtype, item.grossArea, seed);

  const landlordProfileId = inferLandlordProfile(item, seed, subtype);
  const landlordProfile = LANDLORD_PROFILES[landlordProfileId] || LANDLORD_PROFILES.stable;
  const landlordTraits = pickDistinct(LANDLORD_TRAITS, 2, seed, 'landlord-traits').map((row) => row.id);
  const contractProfileId = inferContractProfile(item, subtype, seed);
  const contractProfile = CONTRACT_PROFILES[contractProfileId] || CONTRACT_PROFILES.deposit1_pay3;
  const history = inferHistoricalUse(item, seed);
  const vacancy = inferVacancyReason(item, seed);
  const defectIds = inferDefects(item, seed, subtype);
  const advantageIds = inferAdvantages(item, seed, subtype);
  const restrictions = inferRestrictions(item, seed, subtype);
  const transaction = transactionMethodFor(subtype, seed);
  const visual = deterministicPick(FREE_VISUALS, seed, 'visual') || FREE_VISUALS[0];

  item.propertySubtypeId = subtype.id;
  item.propertyTypeId = item.propertyTypeId || subtype.id;
  item.propertyTypeName = item.propertyTypeName || subtype.name;
  item.previousBusiness = item.previousBusiness || history.name;
  item.vacancyReason = item.vacancyReason || vacancy.name;
  item.renovationLevel = item.renovationLevel || (history.foodReady ? '餐饮旧装' : deterministicPick(['毛坯','简装','非餐饮旧装'], seed, 'renovation'));
  item.restrictions = restrictions;
  item.advantageIds = advantageIds;
  item.defectIds = defectIds;
  item.defectId = defectIds[0] || 'none_material';

  item.depositMonths = Number.isFinite(Number(item.depositMonths)) ? Number(item.depositMonths) : contractProfile.depositMonths;
  item.paymentMonths = Number.isFinite(Number(item.paymentMonths)) ? Number(item.paymentMonths) : contractProfile.paymentMonths;
  item.freeRentDays = Number.isFinite(Number(item.freeRentDays)) ? Number(item.freeRentDays) : contractProfile.freeRentDays;
  item.annualIncrease = Number.isFinite(Number(item.annualIncrease)) ? Number(item.annualIncrease) : contractProfile.annualIncrease;
  item.leaseYears = Number.isFinite(Number(item.leaseYears)) ? Number(item.leaseYears) : (scaleBand.id === 'project' ? 8 : scaleBand.id === 'super' ? 6 : scaleBand.id === 'large' ? 5 : 3);
  item.paymentCycleName = item.paymentCycleName || contractProfile.name;

  item.landlordName = item.landlordName || deterministicPick(NAMES, seed, 'landlord-name') || '赵建国';
  item.landlordNegotiation = item.landlordNegotiation || (landlordProfile.negotiation >= 0.68 ? '高' : landlordProfile.negotiation >= 0.38 ? '中' : '低');
  item.landlordRenewalRisk = item.landlordRenewalRisk || (landlordProfile.renewalRisk >= 0.38 ? '较高' : landlordProfile.renewalRisk >= 0.20 ? '中' : '较低');
  item.brokerName = item.brokerName || deterministicPick(NAMES, seed, 'broker-name') || '陈安';
  item.brokerAgency = item.brokerAgency || deterministicPick(BROKERS, seed, 'broker-agency') || '云州商铺网';

  const fairRent = rules.fairMonthlyRent(item, districtId, defectIds);
  if (!Number(item.monthlyRent)) item.monthlyRent = fairRent;
  if (!Number(item.askingMonthlyRent)) {
    const vacancyFactor = 1 + Number(vacancy.rentMod || 0);
    item.askingMonthlyRent = Math.max(200, Math.round(fairRent * landlordProfile.askPremium * vacancyFactor / 10) * 10);
  }
  const rentAssessment = rules.classifyRent(Number(item.askingMonthlyRent), fairRent);

  const capacities = rules.estimatePhysicalCapacity(item, subtype);
  const modes = rules.evaluateRestaurantModes(item);
  const viableModes = modes.filter((row) => row.viable);
  const topMode = viableModes[0] || modes[0];
  const startup = rules.estimateStartup(item, topMode ? topMode.id : 'fast_meal');

  const risks = Array.isArray(item.risks) ? [...item.risks] : [];
  defectIds.filter((id) => id !== 'none_material').forEach((id) => {
    const defect = DEFECTS[id];
    if (defect && !risks.includes(defect.name)) risks.push(defect.name);
  });
  if (!item.exhaust && !risks.some((x) => /排烟/.test(String(x)))) risks.push('无独立排烟，重油烟业态受限');
  if (!item.gas && !item.threePhase && !risks.some((x) => /热源|燃气|电力/.test(String(x)))) risks.push('热源条件弱，需先解决燃气或电力');
  if (rules.parseFloor(item.floor) > 1 && !risks.some((x) => /楼层/.test(String(x)))) risks.push('非首层，自然进店率通常更低');

  const defectRisk = defectIds.map((id) => DEFECTS[id]?.risk || 0).reduce((a,b) => Math.max(a,b),0);
  const riskLevel = Math.max(Number(item.riskLevel) || 0, defectRisk, risks.length >= 5 ? 3 : risks.length >= 3 ? 2 : risks.length >= 1 ? 1 : 0);
  const sizeFirstStorePenalty = { micro:0, small:0, small_mid:3, medium:10, large:28, super:48, project:68 }[scaleBand.id] || 0;
  const firstStoreScore = Math.round(rules.clamp(
    78 + (topMode ? (topMode.score - 70) * 0.33 : -12)
      - Math.max(0, rentAssessment.ratio - 1) * 35
      - riskLevel * 6
      + (item.visibility - 55) * 0.10
      - sizeFirstStorePenalty,
    3, 96
  ));

  const tags = [];
  if (firstStoreScore >= 78) tags.push('适合首店');
  if (rentAssessment.id === 'below') tags.push('租金有优势');
  if (item.exhaust && item.drainage && (item.gas || item.threePhase)) tags.push('餐饮硬件较全');
  if (!item.exhaust) tags.push('重油烟受限');
  if (Number(item.competitorCount || 0) >= 2) tags.push('竞租较热');
  if (scaleBand.id === 'large') tags.push('大型门店');
  if (scaleBand.id === 'super') tags.push('超大型项目');
  if (scaleBand.id === 'project') tags.push('集团级项目');
  if (history.foodReady) tags.push('原餐饮基础');

  return {
    ...item,
    propertyV02: true,
    propertyPackVersion: '1.0.0',
    propertyKind: kind,
    propertyKindName: subtype.categoryName,
    propertyCategoryId: subtype.categoryId,
    propertyCategoryName: subtype.categoryName,
    propertySubtypeId: subtype.id,
    propertySubtypeName: subtype.name,
    structureTemplateId: structure?.id || null,
    structureTemplateName: structure?.name || null,
    scaleBandId: scaleBand.id,
    scaleBandName: scaleBand.name,
    landlordProfileId,
    landlordProfileName: landlordProfile.name,
    landlordTraitIds: landlordTraits,
    contractProfileId,
    contractPricingMode: contractProfile.pricingMode,
    historicalUseId: history.id,
    vacancyReasonId: vacancy.id,
    vacancyUrgency: vacancy.urgency,
    transactionMethodId: transaction.id,
    transactionMethodName: transaction.name,
    defectIds,
    advantageIds,
    advantages: advantageIds.map((id) => ADVANTAGES[id]?.name).filter(Boolean),
    visualVariantId: visual.id,
    visualVariantName: visual.name,
    risks,
    riskLevel,
    projectComplexity: rules.projectComplexity(item),
    physicalCapacity: capacities,
    restaurantModes: modes,
    recommendedModeId: topMode ? topMode.id : null,
    recommendedModeName: topMode ? topMode.name : '轻餐饮',
    fairMonthlyRent: fairRent,
    rentAssessment,
    startupEstimate: startup,
    firstStoreScore,
    v02Tags: tags,
    composition: {
      fixed: ['districtId','grossArea','floor','frontage','depth','ceilingHeight','exhaust','gas','threePhase','drainage','fire','powerKw'],
      weighted: ['propertySubtypeId','structureTemplateId','landlordProfileId','landlordTraitIds','contractProfileId','historicalUseId','vacancyReasonId','advantageIds','defectIds','restrictions','transactionMethodId'],
      free: ['visualVariantId']
    }
  };
}

function enrichListings(rows, context = {}) {
  return (rows || []).map((row) => enrichListing(row, context));
}

function chooseSubtype(options, seed) {
  if (options.propertySubtypeId && PROPERTY_SUBTYPE_BY_ID[options.propertySubtypeId]) return PROPERTY_SUBTYPE_BY_ID[options.propertySubtypeId];
  if (options.buildingTypeId && PROPERTY_SUBTYPE_BY_ID[options.buildingTypeId]) return PROPERTY_SUBTYPE_BY_ID[options.buildingTypeId];
  const area = Number(options.area);
  const districtId = options.districtId || 'university';
  const categoryId = options.categoryId;
  const rows = PROPERTY_SUBTYPES.filter((row) => {
    if (categoryId && row.categoryId !== categoryId) return false;
    if (area && (area < row.areaRange[0] * 0.75 || area > row.areaRange[1] * 1.25)) return false;
    return true;
  });
  const weights = DISTRICT_CATEGORY_WEIGHTS[districtId] || {};
  return weightedPick(rows.length ? rows : PROPERTY_SUBTYPES, seed, 'subtype', (row) => (row.weight || 1) * (weights[row.categoryId] == null ? 0.75 : weights[row.categoryId]));
}

function generateListing(options = {}) {
  const seed = options.seed || `${options.districtId || 'university'}:${options.serial || 1}`;
  const rng = rngFor(seed, 'generate');
  const districtId = options.districtId || 'university';
  const subtype = chooseSubtype(options, seed);
  const area = Math.max(6, Number(options.area) || Math.round(rng.float(subtype.areaRange[0], subtype.areaRange[1]) * 10) / 10);
  const floorOptions = subtype.floorOptions || [1];
  const floor = options.floor || floorOptions[rng.int(0, floorOptions.length - 1)];
  const marketKey = options.marketKey || `v10:${hashString(seed).toString(36)}`;
  const raw = {
    marketKey,
    id: marketKey,
    districtId,
    propertySubtypeId: subtype.id,
    propertyTypeId: subtype.id,
    propertyTypeName: subtype.name,
    layoutTypeName: area >= 2500 ? '项目级空间' : area >= 900 ? '超大整铺' : area >= 400 ? '大型整铺' : area >= 180 ? '中型整铺' : area >= 80 ? '标准整铺' : '小型铺面',
    address: options.address || `${DISTRICT_BASELINES[districtId]?.name || '云州'}·${(hashString(seed) % 668) + 1}号`,
    grossArea: area,
    floor: `${floor}层`,
    ...(options.facilities || {}),
    daysOnMarket: rng.int(0, area >= 900 ? 120 : 55),
    watchers: rng.int(0, area >= 900 ? 8 : 24),
    competingTenants: Array.from({ length: rng.int(0, area >= 2500 ? 2 : 4) }, (_, i) => `npc_tenant_${i + 1}`),
    vacantMonths: rng.int(0, area >= 900 ? 18 : 9)
  };
  return enrichListing(raw, { districtId });
}

function getPackStats() {
  return {
    categories: 16,
    subtypes: PROPERTY_SUBTYPES.length,
    structures: STRUCTURE_TEMPLATES.length,
    sizeBands: SIZE_BANDS.length,
    landlords: Object.keys(LANDLORD_PROFILES).length,
    landlordTraits: LANDLORD_TRAITS.length,
    contracts: Object.keys(CONTRACT_PROFILES).length,
    historicalUses: HISTORICAL_USES.length,
    vacancyReasons: VACANCY_REASONS.length,
    advantages: Object.keys(ADVANTAGES).length,
    defects: Object.keys(DEFECTS).length,
    restrictions: RESTRICTIONS.length,
    transactionMethods: TRANSACTION_METHODS.length,
    visuals: FREE_VISUALS.length
  };
}

module.exports = {
  enrichListing,
  enrichListings,
  generateListing,
  getPackStats,
  chooseSubtype
};
