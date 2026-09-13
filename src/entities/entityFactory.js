'use strict';

const PROPERTY_PACK = require('../property/propertyPackV02.js');
const PERSON_RULES = require('../person/personRulesV10.js');

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function round(value, digits = 0) {
  const m = 10 ** digits;
  return Math.round(value * m) / m;
}

class EntityFactory {
  constructor(registry, composer, rng) {
    this.registry = registry;
    this.composer = composer;
    this.rng = rng;
    this.serial = 0;
  }

  id(prefix) {
    this.serial += 1;
    return `${prefix}_${this.serial.toString(36)}`;
  }

  createProperty(options = {}) {
    const districtId = options.districtId || 'university';
    const district = this.registry.getItem('district_profiles', districtId);
    if (!district) throw new Error(`未知商圈: ${districtId}`);

    let tags = [...district.tags];
    const categoryWeights = {
      university: { education_commercial: 2.4, food_hall: 1.7, street_commercial: 1.4, community_commercial: 1.2, night_economy: 1.3, complex_project: 0.12 },
      cbd: { office_commercial: 2.2, mall_commercial: 1.8, street_commercial: 1.4, large_catering: 1.1, complex_project: 0.8 },
      hightech: { office_commercial: 2.2, industrial_commercial: 1.2, street_commercial: 1.1, institutional_catering: 1.0, complex_project: 0.18 },
      oldtown: { street_commercial: 1.8, community_commercial: 1.4, market_commercial: 1.3, night_economy: 1.2, standalone_catering: 1.0, complex_project: 0.18 },
      village: { street_commercial: 1.7, community_commercial: 1.8, market_commercial: 1.2, night_economy: 1.2, large_catering: 0.2, complex_project: 0.04 },
      market: { market_commercial: 2.4, street_commercial: 1.5, food_hall: 1.3, special_opportunity: 1.0, large_catering: 0.35 },
      industry: { industrial_commercial: 2.7, institutional_catering: 1.8, street_commercial: 1.0, large_catering: 0.3, complex_project: 0.08 }
    };
    const districtWeights = categoryWeights[districtId] || {};
    const legacyBuildingAliases = {
      street_shop: 'street_single',
      community_shop: 'community_ground',
      mall_stall: 'foodhall_stall',
      upper_floor: 'street_double',
      market_stall: 'wetmarket_front',
      office_podium: 'office_podium',
      station_shop: 'transport_hub_complex',
      standalone: 'detached_street',
      large_catering: 'large_chinese',
      project: 'complex_floor',
      institutional: 'enterprise_canteen',
      generic: 'street_single'
    };
    const requestedBuildingId = options.buildingTypeId && (legacyBuildingAliases[options.buildingTypeId] || options.buildingTypeId);
    const building = requestedBuildingId
      ? this.registry.getItem('property_buildings', requestedBuildingId)
      : this.composer.pickWeighted('property_buildings', tags, (row) => districtWeights[row.categoryId] == null ? 0.70 : districtWeights[row.categoryId]);
    if (!building) throw new Error('无法生成房屋类型');
    tags = this.composer.applyTags(tags, building);

    const range = building.areaRange || [20, 100];
    const area = round(options.area || this.rng.float(range[0], range[1]), 1);
    const floorOptions = Array.isArray(building.floorOptions) && building.floorOptions.length ? building.floorOptions : [building.floor || 1];
    const floor = options.floor || this.rng.pick(floorOptions) || 1;
    if (floor === 1) tags.push('floor_1'); else tags.push('upper_floor');
    const sizeBand = PROPERTY_PACK.sizeBandForArea(area);
    tags.push(`area_${sizeBand.id}`);

    const facilities = {};
    for (const key of ['exhaust', 'gas', 'threePhase', 'drainage', 'greaseTrap', 'fire']) {
      const forced = options.facilities && options.facilities[key];
      if (typeof forced === 'boolean') {
        facilities[key] = forced;
        tags.push(`${key}_${forced ? 'yes' : 'no'}`);
        continue;
      }
      const chance = Number((building.facilityChance || {})[key] ?? district.facilityBase?.[key] ?? 0.5);
      facilities[key] = this.rng.chance(chance);
      tags.push(`${key}_${facilities[key] ? 'yes' : 'no'}`);
    }

    const landlord = this.composer.pickWeighted('landlord_profiles', tags);
    const lease = this.composer.pickWeighted('lease_profiles', tags);
    const defect = this.rng.chance(0.42)
      ? this.composer.pickWeighted('property_defects', tags)
      : null;

    const visibility = clamp(
      (building.baseVisibility || 55) + (district.visibilityMod || 0) + this.rng.int(-8, 8),
      5, 98
    );
    const footTraffic = clamp(
      district.trafficIndex * (building.trafficFactor || 1) * (floor > 1 ? 0.58 : 1) * this.rng.float(0.88, 1.12),
      5, 100
    );
    const floorFactor = floor <= 1 ? 1 : floor === 2 ? 0.78 : floor === 3 ? 0.69 : 0.63;
    const baseRentPerSqm = district.rentPerSqm * (building.rentFactor || 1) * floorFactor * (sizeBand.rentFactor || 1);
    const rentPerSqm = round(baseRentPerSqm * this.rng.float(0.90, 1.10), 1);
    const monthlyRent = Math.max(300, Math.round(rentPerSqm * area / 10) * 10);
    const depositMonths = lease.depositMonths;
    const payMonths = lease.payMonths;
    const transferFee = Math.max(0, Math.round((building.transferFeeBase || 0) * this.rng.float(0.7, 1.3) / 100) * 100);
    const seats = Math.max(0, Math.floor(area * (building.seatDensity || 0.35)));

    const capability = {
      lightFood: true,
      beverage: facilities.threePhase || area < 40,
      noodles: facilities.drainage && (facilities.gas || facilities.threePhase),
      wok: facilities.exhaust && facilities.drainage && (facilities.gas || facilities.threePhase),
      bbq: facilities.exhaust && facilities.fire,
      hotpot: (facilities.gas || facilities.threePhase) && facilities.fire && facilities.drainage
    };

    return {
      id: this.id('property'),
      districtId,
      buildingTypeId: building.id,
      propertyCategoryId: building.categoryId || null,
      scaleBandId: sizeBand.id,
      area,
      floor,
      seats,
      visibility,
      footTraffic: round(footTraffic, 1),
      facilities,
      capability,
      landlordProfileId: landlord && landlord.id,
      leaseProfileId: lease && lease.id,
      defectId: defect && defect.id,
      monthlyRent,
      rentPerSqm,
      depositMonths,
      payMonths,
      freeRentDays: lease.freeRentDays,
      annualEscalation: lease.annualEscalation,
      transferFee,
      upfrontRentCost: monthlyRent * (depositMonths + payMonths) + transferFee,
      tags: [...new Set(tags)]
    };
  }

  createPerson(options = {}) {
    const profile = PERSON_RULES.createPersonProfile(this.rng, options);
    return {
      id: this.id('person'),
      ...profile
    };
  }

  assignNpcRole(person, roleId, context = {}) {
    return PERSON_RULES.assignRole(person, roleId, context);
  }

  createCompetitor(options = {}) {
    const archetype = options.archetypeId
      ? this.registry.getItem('competitor_archetypes', options.archetypeId)
      : this.composer.pickWeighted('competitor_archetypes', []);
    const positioning = options.positioningId
      ? this.registry.getItem('brand_positions', options.positioningId)
      : this.composer.pickWeighted('brand_positions', archetype.tags || []);

    return {
      id: this.id('competitor'),
      name: options.name || `${positioning.name}${this.rng.int(1, 99)}号`,
      archetypeId: archetype.id,
      positioningId: positioning.id,
      cash: options.cash || this.rng.int(archetype.cashRange[0], archetype.cashRange[1]),
      aggression: archetype.aggression,
      imitationAbility: archetype.imitationAbility,
      expansionDesire: archetype.expansionDesire,
      priceWarTolerance: archetype.priceWarTolerance,
      qualityFocus: archetype.qualityFocus,
      observation: {},
      stores: [],
      status: 'active'
    };
  }
}

module.exports = { EntityFactory, clamp, round };
