"use strict";

const propertyData = require("./propertyData.js");

const propertySystem = require("./propertySystem.js");

const marketData = require("./propertyMarketData.js");

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function roundTo(value, step) {
  return Math.round(value / step) * step;
}

function hashText(text) {
  let value = 2166136261;

  for (let i = 0; i < text.length; i++) {
    value ^= text.charCodeAt(i);

    value = Math.imul(value, 16777619);
  }

  return value >>> 0;
}

function compareNumbers(a, b) {
  return (Number(a) || 0) - (Number(b) || 0);
}

class PropertyMarketSystem {
  constructor() {
    this.reset();
  }

  reset(options) {
    const opts = options || {};

    this.state = {
      version: marketData.CONFIG.version,

      seed: Number(opts.seed) || 20260912,

      currentDay: Number(opts.currentDay) || 1,

      rngCounter: 0,

      initialized: false,

      listingState: {},

      activeEvents: [],

      externalModifiers: [],

      history: [],

      stats: {
        totalNewListings: 0,

        totalNpcRentals: 0,

        totalWithdrawals: 0,

        totalPriceCuts: 0,

        totalPriceRaises: 0,
      },
    };

    return this.getState();
  }

  getState() {
    return clone(this.state);
  }

  exportState() {
    return this.getState();
  }

  importState(value) {
    if (!value || value.version !== marketData.CONFIG.version) {
      return false;
    }

    this.state = clone(value);

    return true;
  }

  random(label) {
    const text =
      this.state.seed +
      ":" +
      this.state.currentDay +
      ":" +
      this.state.rngCounter +
      ":" +
      String(label || "");

    this.state.rngCounter += 1;

    const h = hashText(text);

    let x = (h + 0x9e3779b9) >>> 0;

    x ^= x << 13;

    x ^= x >>> 17;

    x ^= x << 5;

    return (x >>> 0) / 4294967295;
  }

  randomInt(min, max, label) {
    return min + Math.floor(this.random(label) * (max - min + 1));
  }

  pick(list, label) {
    if (!Array.isArray(list) || list.length === 0) {
      return null;
    }

    return list[this.randomInt(0, list.length - 1, label)];
  }

  pushHistory(item) {
    this.state.history.push({
      day: this.state.currentDay,

      ...clone(item),
    });

    const max = marketData.CONFIG.maxHistoryItems;

    if (this.state.history.length > max) {
      this.state.history.splice(0, this.state.history.length - max);
    }
  }

  getHistory(limit) {
    const amount = Math.max(1, Number(limit) || 50);

    return this.state.history.slice(-amount).map(clone);
  }

  makeTenantName(label) {
    const prefix = this.pick(marketData.BRAND_PREFIXES, label + ":prefix");

    const suffix = this.pick(marketData.BRAND_SUFFIXES, label + ":suffix");

    return prefix + suffix;
  }

  getStreet(streetId) {
    return propertyData.STREETS.find((item) => item.id === streetId) || null;
  }

  getDistrict(districtId) {
    return propertyData.DISTRICT_PROFILES[districtId] || null;
  }

  getBaseListing(streetId, slot) {
    return propertySystem.generateListing(streetId, slot);
  }

  getListingKey(streetId, slot) {
    return streetId + ":S" + String(slot + 1).padStart(2, "0");
  }

  getEventModifiersFor(street) {
    let trafficFactor = 1;

    let rentPressure = 1;

    let listingSupplyFactor = 1;

    let npcDemandFactor = 1;

    const all = this.state.activeEvents.concat(this.state.externalModifiers);

    for (let i = 0; i < all.length; i++) {
      const event = all[i];

      const applies =
        (!event.streetId && !event.districtId) ||
        event.streetId === street.id ||
        event.districtId === street.districtId;

      if (!applies) {
        continue;
      }

      trafficFactor *= Number(event.trafficFactor) || 1;

      rentPressure *= Number(event.rentPressure) || 1;

      listingSupplyFactor *= Number(event.listingSupplyFactor) || 1;

      npcDemandFactor *= Number(event.npcDemandFactor) || 1;
    }

    return {
      trafficFactor: clamp(trafficFactor, 0.45, 1.75),

      rentPressure: clamp(rentPressure, 0.7, 1.45),

      listingSupplyFactor: clamp(listingSupplyFactor, 0.55, 1.75),

      npcDemandFactor: clamp(npcDemandFactor, 0.5, 1.8),
    };
  }

  calculateStreetHeat(street) {
    const modifiers = this.getEventModifiersFor(street);

    const raw =
      street.traffic * 0.31 +
      street.night * 0.15 +
      street.delivery * 0.12 +
      street.parking * 0.07 +
      street.office * 0.1 +
      street.resident * 0.08 +
      street.student * 0.09 +
      street.worker * 0.08;

    return clamp(Math.round(raw * modifiers.trafficFactor), 0, 100);
  }

  calculateTargetActiveCount(street) {
    const district = this.getDistrict(street.districtId);

    const modifiers = this.getEventModifiersFor(street);

    const vacancyComponent = district.vacancyRate * 42;

    const supplyComponent = district.newListingRate * 24;

    const competitionReduction = (street.competition / 100) * 1.7;

    const raw = 2.4 + vacancyComponent + supplyComponent - competitionReduction;

    return clamp(
      Math.round(raw * modifiers.listingSupplyFactor),
      marketData.CONFIG.minActiveListingsPerStreet,
      marketData.CONFIG.maxActiveListingsPerStreet
    );
  }

  createListingState(street, slot, reason) {
    const base = this.getBaseListing(street.id, slot);

    if (!base) {
      return null;
    }

    const key = this.getListingKey(street.id, slot);

    const modifiers = this.getEventModifiersFor(street);

    const initialPremium = 0.94 + this.random(key + ":premium") * 0.16;

    const askingMonthlyRent = roundTo(
      base.monthlyRent * initialPremium * modifiers.rentPressure,
      100
    );

    const transferFactor =
      base.transferFee > 0 ? 0.84 + this.random(key + ":transfer") * 0.28 : 0;

    const askingTransferFee =
      base.transferFee > 0
        ? roundTo(base.transferFee * transferFactor, 500)
        : 0;

    const state = {
      key,

      streetId: street.id,

      districtId: street.districtId,

      slot,

      baseListingId: base.id,

      status: "active",

      listedDay: this.state.currentDay,

      daysOnMarket: 0,

      askingMonthlyRent,

      askingTransferFee,

      initialAskingMonthlyRent: askingMonthlyRent,

      initialAskingTransferFee: askingTransferFee,

      watchers: 0,

      competingTenants: [],

      lastPriceChangeDay: this.state.currentDay,

      priceChangeCount: 0,

      sourceReason: reason || "market_turnover",

      rentedBy: null,

      closedDay: null,

      closedReason: null,
    };

    this.state.listingState[key] = state;

    this.state.stats.totalNewListings += 1;

    this.pushHistory({
      type: "listing_added",

      listingKey: key,

      districtId: street.districtId,

      streetId: street.id,

      askingMonthlyRent,

      reason: state.sourceReason,
    });

    return state;
  }

  deactivateListing(item, reason, tenant) {
    item.status = reason === "npc_rented" ? "rented" : "inactive";

    item.closedDay = this.state.currentDay;

    item.closedReason = reason;

    if (tenant) {
      item.rentedBy = clone(tenant);
    }

    if (reason === "npc_rented") {
      this.state.stats.totalNpcRentals += 1;
    } else {
      this.state.stats.totalWithdrawals += 1;
    }

    this.pushHistory({
      type: reason,

      listingKey: item.key,

      districtId: item.districtId,

      streetId: item.streetId,

      renter: tenant ? tenant.name : null,
    });
  }

  getSlotCooldownDays(item) {
    if (!item || item.closedDay == null) {
      return 0;
    }

    if (item.closedReason === "npc_rented") {
      // 被租走的铺位不会第二天重新挂牌。
      // 租户经营失败/转让会在更后面的系统里重新释放。
      return 90;
    }

    // 房东主动撤盘后也要冷却一段时间。
    return 24;
  }

  isSlotAvailableForRelist(streetId, slot) {
    const key = this.getListingKey(streetId, slot);

    const old = this.state.listingState[key];

    if (!old) {
      return true;
    }

    if (old.status === "active") {
      return false;
    }

    const cooldown = this.getSlotCooldownDays(old);

    return (
      this.state.currentDay - (old.closedDay || this.state.currentDay) >=
      cooldown
    );
  }

  ensureStreetDepth(street) {
    const calculatedTarget = this.calculateTargetActiveCount(street);

    const target = Math.min(
      calculatedTarget,
      marketData.CONFIG.minActiveListingsPerStreet + 1
    );

    const active = Object.values(this.state.listingState).filter(
      (item) => item.streetId === street.id && item.status === "active"
    );

    if (active.length >= target) {
      return;
    }

    const usedSlots = new Set(active.map((item) => item.slot));

    const candidates = [];

    for (
      let slot = 0;
      slot < marketData.CONFIG.potentialSlotsPerStreet;
      slot++
    ) {
      if (
        !usedSlots.has(slot) &&
        this.isSlotAvailableForRelist(street.id, slot)
      ) {
        candidates.push(slot);
      }
    }

    while (active.length < target && candidates.length > 0) {
      const pickIndex = this.randomInt(
        0,
        candidates.length - 1,
        street.id + ":depth"
      );

      const slot = candidates.splice(pickIndex, 1)[0];

      const created = this.createListingState(street, slot, "market_supply");

      if (created) {
        active.push(created);
      }
    }
  }

  initialize(options) {
    const opts = options || {};

    if (opts.seed != null) {
      this.state.seed = Number(opts.seed) || this.state.seed;
    }

    if (opts.currentDay != null) {
      this.state.currentDay = Math.max(
        1,
        Math.floor(Number(opts.currentDay) || 1)
      );
    }

    for (let i = 0; i < propertyData.STREETS.length; i++) {
      this.ensureStreetDepth(propertyData.STREETS[i]);
    }

    this.state.initialized = true;

    return this.getMarketOverview();
  }

  cleanupExpiredEvents() {
    this.state.activeEvents = this.state.activeEvents.filter(
      (event) => event.endDay >= this.state.currentDay
    );

    this.state.externalModifiers = this.state.externalModifiers.filter(
      (event) => event.endDay == null || event.endDay >= this.state.currentDay
    );
  }

  maybeCreateEvent() {
    if (this.state.activeEvents.length >= marketData.CONFIG.maxActiveEvents) {
      return null;
    }

    // 平均不是每天都有大事件。
    if (this.random("event_roll") > 0.075) {
      return null;
    }

    const pool = marketData.EVENT_TEMPLATES;

    const weighted = [];

    for (let i = 0; i < pool.length; i++) {
      const count = Math.max(1, Math.round(pool[i].weight / 2));

      for (let j = 0; j < count; j++) {
        weighted.push(pool[i]);
      }
    }

    const template = this.pick(weighted, "event_template");

    if (!template) {
      return null;
    }

    const districtId = this.pick(template.eligibleDistricts, "event_district");

    const duration = this.randomInt(
      template.minDuration,
      template.maxDuration,
      "event_duration"
    );

    const event = {
      id:
        template.id + "_" + this.state.currentDay + "_" + this.state.rngCounter,

      templateId: template.id,

      name: template.name,

      districtId,

      streetId: null,

      startDay: this.state.currentDay,

      endDay: this.state.currentDay + duration - 1,

      trafficFactor: template.trafficFactor,

      rentPressure: template.rentPressure,

      listingSupplyFactor: template.listingSupplyFactor,

      npcDemandFactor: template.npcDemandFactor,

      description: template.description,
    };

    this.state.activeEvents.push(event);

    this.pushHistory({
      type: "market_event_started",

      eventId: event.id,

      name: event.name,

      districtId: event.districtId,

      endDay: event.endDay,
    });

    return clone(event);
  }

  addExternalModifier(modifier) {
    if (!modifier || !modifier.id) {
      return false;
    }

    const item = {
      id: String(modifier.id),

      name: String(modifier.name || modifier.id),

      districtId: modifier.districtId || null,

      streetId: modifier.streetId || null,

      startDay: this.state.currentDay,

      endDay: modifier.endDay == null ? null : Number(modifier.endDay),

      trafficFactor: Number(modifier.trafficFactor) || 1,

      rentPressure: Number(modifier.rentPressure) || 1,

      listingSupplyFactor: Number(modifier.listingSupplyFactor) || 1,

      npcDemandFactor: Number(modifier.npcDemandFactor) || 1,

      description: String(modifier.description || ""),
    };

    this.state.externalModifiers = this.state.externalModifiers.filter(
      (old) => old.id !== item.id
    );

    this.state.externalModifiers.push(item);

    this.pushHistory({
      type: "external_modifier_added",

      modifierId: item.id,

      districtId: item.districtId,

      streetId: item.streetId,
    });

    return true;
  }

  removeExternalModifier(id) {
    const before = this.state.externalModifiers.length;

    this.state.externalModifiers = this.state.externalModifiers.filter(
      (item) => item.id !== id
    );

    return before !== this.state.externalModifiers.length;
  }

  buildTenantForListing(listing, item) {
    const candidatePool = marketData.TENANT_ARCHETYPES.filter((type) => {
      if (
        listing.grossArea < type.areaMin ||
        listing.grossArea > type.areaMax
      ) {
        return false;
      }

      if (type.requireExhaust && !listing.exhaust) {
        return false;
      }

      if (type.requireGas && !listing.gas) {
        return false;
      }

      return true;
    });

    const archetype = this.pick(
      candidatePool.length ? candidatePool : marketData.TENANT_ARCHETYPES,
      item.key + ":tenant"
    );

    if (!archetype) {
      return null;
    }

    const budget = roundTo(
      archetype.budgetMin +
        this.random(item.key + ":budget") *
          (archetype.budgetMax - archetype.budgetMin),
      1000
    );

    return {
      id:
        "npc_" +
        hashText(
          item.key + ":" + this.state.currentDay + ":" + archetype.id
        ).toString(36),

      name: this.makeTenantName(item.key + ":brand"),

      archetypeId: archetype.id,

      archetypeName: archetype.name,

      budget,

      priceSensitivity: archetype.priceSensitivity,

      locationSensitivity: archetype.locationSensitivity,
    };
  }

  calculateAttractiveness(listing, item, street) {
    const heat = this.calculateStreetHeat(street);

    const baseRent = Math.max(1, listing.monthlyRent);

    const priceRatio = item.askingMonthlyRent / baseRent;

    const hardware =
      (listing.exhaust ? 12 : 0) +
      (listing.gas ? 7 : 0) +
      (listing.threePhase ? 6 : 0) +
      (listing.drainage ? 5 : 0) +
      (listing.fireSprinkler ? 4 : 0);

    const sizeFit = listing.grossArea >= 40 && listing.grossArea <= 220 ? 9 : 4;

    const raw =
      heat * 0.36 +
      listing.visibility * 0.22 +
      listing.riderAccess * 0.08 +
      listing.parkingScore * 0.06 +
      hardware +
      sizeFit -
      Math.max(0, (priceRatio - 1) * 55) -
      listing.riskLevel * 4;

    return clamp(Math.round(raw), 0, 100);
  }

  updateListing(item) {
    if (item.status !== "active") {
      return;
    }

    const street = this.getStreet(item.streetId);

    if (!street) {
      return;
    }

    const base = this.getBaseListing(item.streetId, item.slot);

    if (!base) {
      return;
    }

    const modifiers = this.getEventModifiersFor(street);

    item.daysOnMarket = this.state.currentDay - item.listedDay;

    const attractiveness = this.calculateAttractiveness(base, item, street);

    const expectedWatchers = clamp(
      Math.round(
        attractiveness / 25 + this.random(item.key + ":watchers") * 2 - 1.2
      ),
      0,
      8
    );

    item.watchers = expectedWatchers;

    const targetCompetitors = clamp(
      Math.round((attractiveness / 38) * modifiers.npcDemandFactor),
      0,
      3
    );

    while (item.competingTenants.length < targetCompetitors) {
      const tenant = this.buildTenantForListing(base, item);

      if (!tenant) {
        break;
      }

      if (!item.competingTenants.some((old) => old.id === tenant.id)) {
        item.competingTenants.push(tenant);
      } else {
        break;
      }
    }

    if (item.competingTenants.length > targetCompetitors) {
      item.competingTenants = item.competingTenants.slice(0, targetCompetitors);
    }

    const priceRatio = item.askingMonthlyRent / Math.max(1, base.monthlyRent);

    const rentChance =
      clamp(
        0.0015 +
          attractiveness * 0.00019 +
          item.watchers * 0.0016 +
          item.competingTenants.length * 0.0045 -
          Math.max(0, priceRatio - 1) * 0.028,
        0.001,
        0.075
      ) * modifiers.npcDemandFactor;

    if (
      item.competingTenants.length > 0 &&
      this.random(item.key + ":rent") < rentChance
    ) {
      const tenant = this.pick(item.competingTenants, item.key + ":winner");

      this.deactivateListing(item, "npc_rented", tenant);

      return;
    }

    const withdrawChance =
      item.daysOnMarket > 120
        ? 0.045
        : item.daysOnMarket > 75
        ? 0.022
        : item.daysOnMarket > 40
        ? 0.009
        : 0.002;

    if (this.random(item.key + ":withdraw") < withdrawChance) {
      this.deactivateListing(item, "owner_withdrawn", null);

      return;
    }

    const daysSincePriceChange =
      this.state.currentDay - item.lastPriceChangeDay;

    if (daysSincePriceChange >= 7) {
      let change = 0;

      if (item.daysOnMarket >= 60 && item.watchers <= 2) {
        change = -(0.035 + this.random(item.key + ":cut60") * 0.055);
      } else if (item.daysOnMarket >= 30 && item.watchers <= 2) {
        change = -(0.02 + this.random(item.key + ":cut30") * 0.035);
      } else if (item.daysOnMarket >= 14 && item.watchers <= 1) {
        change = -(0.01 + this.random(item.key + ":cut14") * 0.025);
      } else if (
        item.watchers >= 6 &&
        attractiveness >= 78 &&
        item.daysOnMarket <= 18
      ) {
        change = 0.01 + this.random(item.key + ":raise") * 0.025;
      }

      if (change !== 0) {
        const oldRent = item.askingMonthlyRent;

        item.askingMonthlyRent = roundTo(
          Math.max(
            base.monthlyRent * 0.72,
            item.askingMonthlyRent * (1 + change)
          ),
          100
        );

        item.lastPriceChangeDay = this.state.currentDay;

        item.priceChangeCount += 1;

        if (item.askingMonthlyRent < oldRent) {
          this.state.stats.totalPriceCuts += 1;
        } else {
          this.state.stats.totalPriceRaises += 1;
        }

        this.pushHistory({
          type: item.askingMonthlyRent < oldRent ? "price_cut" : "price_raise",

          listingKey: item.key,

          streetId: item.streetId,

          oldRent,

          newRent: item.askingMonthlyRent,
        });
      }
    }
  }

  maybeAddOrganicListing(street) {
    const active = Object.values(this.state.listingState).filter(
      (item) => item.streetId === street.id && item.status === "active"
    );

    const target = this.calculateTargetActiveCount(street);

    if (active.length >= marketData.CONFIG.maxActiveListingsPerStreet) {
      return null;
    }

    const district = this.getDistrict(street.districtId);

    const modifiers = this.getEventModifiersFor(street);

    const deficit = Math.max(0, target - active.length);

    const chance =
      clamp(
        0.012 + district.newListingRate * 0.08 + deficit * 0.025,
        0.01,
        0.22
      ) * modifiers.listingSupplyFactor;

    if (this.random(street.id + ":new_listing") > chance) {
      return null;
    }

    const occupied = new Set(active.map((item) => item.slot));

    const candidates = [];

    for (
      let slot = 0;
      slot < marketData.CONFIG.potentialSlotsPerStreet;
      slot++
    ) {
      if (
        !occupied.has(slot) &&
        this.isSlotAvailableForRelist(street.id, slot)
      ) {
        candidates.push(slot);
      }
    }

    if (candidates.length === 0) {
      return null;
    }

    const slot = this.pick(candidates, street.id + ":slot");

    return this.createListingState(street, slot, "organic_new_listing");
  }

  tickDay(context) {
    if (!this.state.initialized) {
      this.initialize();
    }

    this.state.currentDay += 1;

    this.state.rngCounter = 0;

    this.cleanupExpiredEvents();

    this.maybeCreateEvent();

    const listingValues = Object.values(this.state.listingState);

    for (let i = 0; i < listingValues.length; i++) {
      this.updateListing(listingValues[i]);
    }

    for (let i = 0; i < propertyData.STREETS.length; i++) {
      const street = propertyData.STREETS[i];

      this.maybeAddOrganicListing(street);

      this.ensureStreetDepth(street);
    }

    if (context && Array.isArray(context.modifiers)) {
      for (let i = 0; i < context.modifiers.length; i++) {
        this.addExternalModifier(context.modifiers[i]);
      }
    }

    return this.getMarketOverview();
  }

  advanceDays(days, context) {
    const amount = Math.max(0, Math.floor(Number(days) || 0));

    let result = this.getMarketOverview();

    for (let i = 0; i < amount; i++) {
      result = this.tickDay(context);
    }

    return result;
  }

  getLiveListings(filters) {
    const f = filters || {};

    const result = [];

    const states = Object.values(this.state.listingState);

    for (let i = 0; i < states.length; i++) {
      const item = states[i];

      if (item.status !== "active") {
        continue;
      }

      if (f.districtId && item.districtId !== f.districtId) {
        continue;
      }

      if (f.streetId && item.streetId !== f.streetId) {
        continue;
      }

      const base = this.getBaseListing(item.streetId, item.slot);

      if (!base) {
        continue;
      }

      const merged = {
        ...base,

        marketKey: item.key,

        askingMonthlyRent: item.askingMonthlyRent,

        askingTransferFee: item.askingTransferFee,

        daysOnMarket: item.daysOnMarket,

        watchers: item.watchers,

        competingTenants: clone(item.competingTenants),

        marketStatus: item.status,

        listedDay: item.listedDay,

        priceChangeCount: item.priceChangeCount,

        priceChangeRate: Number(
          (
            (item.askingMonthlyRent - item.initialAskingMonthlyRent) /
            Math.max(1, item.initialAskingMonthlyRent)
          ).toFixed(4)
        ),
      };

      if (f.minArea != null && merged.grossArea < Number(f.minArea)) {
        continue;
      }

      if (f.maxArea != null && merged.grossArea > Number(f.maxArea)) {
        continue;
      }

      if (
        f.maxMonthlyRent != null &&
        merged.askingMonthlyRent > Number(f.maxMonthlyRent)
      ) {
        continue;
      }

      if (f.floor && merged.floor !== f.floor) {
        continue;
      }

      if (f.propertyTypeId && merged.propertyTypeId !== f.propertyTypeId) {
        continue;
      }

      if (f.requireExhaust === true && !merged.exhaust) {
        continue;
      }

      if (f.requireGas === true && !merged.gas) {
        continue;
      }

      if (f.maxRiskLevel != null && merged.riskLevel > Number(f.maxRiskLevel)) {
        continue;
      }

      result.push(merged);
    }

    const sortBy = f.sortBy || "askingMonthlyRent";

    const dir = f.sortDir === "desc" ? -1 : 1;

    result.sort((a, b) => compareNumbers(a[sortBy], b[sortBy]) * dir);

    return result;
  }

  getStreetSummary(streetId) {
    const street = this.getStreet(streetId);

    if (!street) {
      return null;
    }

    const listings = this.getLiveListings({
      streetId,
    });

    const avgRent = listings.length
      ? Math.round(
          listings.reduce((sum, item) => sum + item.askingMonthlyRent, 0) /
            listings.length
        )
      : 0;

    const avgDays = listings.length
      ? Math.round(
          listings.reduce((sum, item) => sum + item.daysOnMarket, 0) /
            listings.length
        )
      : 0;

    const competition = listings.reduce(
      (sum, item) => sum + item.competingTenants.length,
      0
    );

    return {
      streetId,

      name: street.name,

      districtId: street.districtId,

      marketHeat: this.calculateStreetHeat(street),

      activeListingCount: listings.length,

      averageAskingRent: avgRent,

      averageDaysOnMarket: avgDays,

      competingTenantCount: competition,

      activeEventCount: this.state.activeEvents.filter(
        (event) =>
          event.districtId === street.districtId || event.streetId === street.id
      ).length,
    };
  }

  getDistrictSummary(districtId) {
    const streets = propertyData.STREETS.filter(
      (street) => street.districtId === districtId
    );

    const listings = this.getLiveListings({
      districtId,
    });

    const summaries = streets.map((street) => this.getStreetSummary(street.id));

    return {
      districtId,

      activeListingCount: listings.length,

      averageAskingRent: listings.length
        ? Math.round(
            listings.reduce((sum, item) => sum + item.askingMonthlyRent, 0) /
              listings.length
          )
        : 0,

      averageDaysOnMarket: listings.length
        ? Math.round(
            listings.reduce((sum, item) => sum + item.daysOnMarket, 0) /
              listings.length
          )
        : 0,

      hottestStreet:
        summaries.slice().sort((a, b) => b.marketHeat - a.marketHeat)[0] ||
        null,

      streetSummaries: summaries,
    };
  }

  getMarketOverview() {
    const live = this.getLiveListings();

    const districtIds = Object.keys(propertyData.DISTRICT_PROFILES);

    const districtSummaries = districtIds.map((id) =>
      this.getDistrictSummary(id)
    );

    return {
      currentDay: this.state.currentDay,

      potentialPropertyCount:
        propertyData.STREETS.length * marketData.CONFIG.potentialSlotsPerStreet,

      activeListingCount: live.length,

      activeEventCount: this.state.activeEvents.length,

      activeEvents: clone(this.state.activeEvents),

      stats: clone(this.state.stats),

      districtSummaries,
    };
  }
}

module.exports = new PropertyMarketSystem();
