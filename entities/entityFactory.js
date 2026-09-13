'use strict';

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
    const building = options.buildingTypeId
      ? this.registry.getItem('property_buildings', options.buildingTypeId)
      : this.composer.pickWeighted('property_buildings', tags);
    if (!building) throw new Error('无法生成房屋类型');
    tags = this.composer.applyTags(tags, building);

    const range = building.areaRange || [20, 100];
    const area = round(options.area || this.rng.float(range[0], range[1]), 1);
    const floor = options.floor || building.floor || 1;
    if (floor === 1) tags.push('floor_1'); else tags.push('upper_floor');
    if (area < 35) tags.push('area_small');
    else if (area < 80) tags.push('area_medium');
    else tags.push('area_large');

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
    const baseRentPerSqm = district.rentPerSqm * (building.rentFactor || 1) * (floor > 1 ? 0.72 : 1);
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
    let tags = [];
    const age = options.age || this.rng.int(18, 62);
    tags.push(age < 25 ? 'age_young' : age > 50 ? 'age_senior' : 'age_adult');

    const background = options.backgroundId
      ? this.registry.getItem('person_backgrounds', options.backgroundId)
      : this.composer.pickWeighted('person_backgrounds', tags);
    tags = this.composer.applyTags(tags, background);

    const traitA = this.composer.pickWeighted('person_traits', tags);
    tags = this.composer.applyTags(tags, traitA);
    const traitB = this.composer.pickWeighted('person_traits', tags, null, (row) => !traitA || row.id !== traitA.id);

    const names = this.registry.list('person_names');
    const name = options.name || (this.rng.pick(names) || { name: '陈安' }).name;

    const skills = {
      cooking: clamp((background.skills?.cooking || 20) + this.rng.int(-8, 12), 0, 100),
      service: clamp((background.skills?.service || 25) + this.rng.int(-8, 12), 0, 100),
      management: clamp((background.skills?.management || 20) + this.rng.int(-8, 12), 0, 100),
      sales: clamp((background.skills?.sales || 20) + this.rng.int(-8, 12), 0, 100),
      finance: clamp((background.skills?.finance || 15) + this.rng.int(-8, 12), 0, 100)
    };

    return {
      id: this.id('person'),
      name,
      age,
      backgroundId: background.id,
      traits: [traitA && traitA.id, traitB && traitB.id].filter(Boolean),
      skills,
      wealth: Math.max(0, Math.round((background.wealthBase || 20000) * this.rng.float(0.55, 1.8))),
      riskTolerance: clamp(50 + (traitA?.riskMod || 0) + (traitB?.riskMod || 0) + this.rng.int(-8, 8), 0, 100),
      patience: clamp(50 + (traitA?.patienceMod || 0) + (traitB?.patienceMod || 0) + this.rng.int(-8, 8), 0, 100),
      currentRole: null,
      employerId: null,
      relationshipIds: [],
      memory: [],
      tags: [...new Set(tags)]
    };
  }

  assignNpcRole(person, roleId, context = {}) {
    const role = this.registry.getItem('npc_roles', roleId);
    if (!role) throw new Error(`未知 NPC 角色: ${roleId}`);
    if (role.minAge && person.age < role.minAge) {
      return { ok: false, reason: `年龄不足 ${role.minAge}` };
    }
    const score = Object.entries(role.skillWeights || {}).reduce(
      (sum, [skill, weight]) => sum + (person.skills[skill] || 0) * weight,
      0
    );
    const threshold = Number(role.minFit || 0);
    if (score < threshold && !context.allowLowFit) {
      return { ok: false, reason: `岗位适配度不足`, score: round(score, 1) };
    }
    person.currentRole = roleId;
    person.employerId = context.employerId || null;
    return { ok: true, score: round(score, 1), person };
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
