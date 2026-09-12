"use strict";

const data = require("./propertyData.js");

/** * 商铺房源系统 V1 * * 默认市场规模： * 42 条街道 × 每街道 8 套房源 = 336 套可查询商铺。 * * 同一 seed 下房源稳定，不会每次打开界面就随机改变。 * 后续要做“每日房源刷新”，只需要改变 marketEpoch。 */

const DEFAULT_LISTINGS_PER_STREET = 8;

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

function pseudo(seed, salt) {
  let x = (seed + salt * 374761393) >>> 0;

  x = Math.imul(x ^ (x >>> 13), 1274126177);

  x = (x ^ (x >>> 16)) >>> 0;

  return x / 4294967295;
}

function pick(list, seed, salt) {
  if (!Array.isArray(list) || list.length === 0) {
    return null;
  }

  const index = Math.floor(pseudo(seed, salt) * list.length) % list.length;

  return list[index];
}

function copy(value) {
  return JSON.parse(JSON.stringify(value));
}

class PropertySystem {
  constructor() {
    this.marketEpoch = 1;
  }

  setMarketEpoch(epoch) {
    const value = Math.max(1, Math.floor(Number(epoch) || 1));

    this.marketEpoch = value;

    return value;
  }

  getMarketEpoch() {
    return this.marketEpoch;
  }

  getDistrictProfile(districtId) {
    const item = data.DISTRICT_PROFILES[districtId];

    return item ? copy(item) : null;
  }

  getStreets(districtId) {
    return data.STREETS.filter(
      (street) => street.districtId === districtId
    ).map(copy);
  }

  getStreet(streetId) {
    const item = data.STREETS.find((street) => street.id === streetId);

    return item ? copy(item) : null;
  }

  getPropertyType(typeId) {
    const item = data.PROPERTY_TYPES.find((type) => type.id === typeId);

    return item ? copy(item) : null;
  }

  getBroker(brokerId) {
    const item = data.BROKERS.find((broker) => broker.id === brokerId);

    return item ? copy(item) : null;
  }

  getBrokers() {
    return data.BROKERS.map(copy);
  }

  choosePropertyTypesForStreet(street) {
    const all = data.PROPERTY_TYPES;

    if (street.type.indexOf("商场") >= 0) {
      return all.filter((item) =>
        ["mall_shop", "foodcourt_stall", "street_shop", "corner_shop"].includes(
          item.id
        )
      );
    }

    if (
      street.type.indexOf("写字楼") >= 0 ||
      street.type.indexOf("科技") >= 0 ||
      street.type.indexOf("园区") >= 0
    ) {
      return all.filter((item) =>
        [
          "office_podium",
          "street_shop",
          "community_shop",
          "park_canteen",
          "corner_shop",
        ].includes(item.id)
      );
    }

    if (street.districtId === "market") {
      return all.filter((item) =>
        [
          "market_shop",
          "street_shop",
          "foodcourt_stall",
          "corner_shop",
        ].includes(item.id)
      );
    }

    if (street.districtId === "village") {
      return all.filter((item) =>
        ["village_shop", "street_shop", "duplex", "community_shop"].includes(
          item.id
        )
      );
    }

    if (street.districtId === "industry") {
      return all.filter((item) =>
        ["park_canteen", "street_shop", "community_shop", "detached"].includes(
          item.id
        )
      );
    }

    return all.filter((item) =>
      [
        "street_shop",
        "corner_shop",
        "community_shop",
        "duplex",
        "detached",
      ].includes(item.id)
    );
  }

  generateListing(streetId, index) {
    const street = data.STREETS.find((item) => item.id === streetId);

    if (!street) {
      return null;
    }

    const district = data.DISTRICT_PROFILES[street.districtId];

    if (!district) {
      return null;
    }

    const seed = hashText(streetId + ":" + index + ":" + this.marketEpoch);

    const typePool = this.choosePropertyTypesForStreet(street);

    const propertyType = pick(typePool, seed, 1);

    const layoutType = pick(data.LAYOUT_TYPES, seed, 2);

    const areaRange = propertyType.maxArea - propertyType.minArea;

    let grossArea =
      propertyType.minArea + Math.round(areaRange * pseudo(seed, 3));

    grossArea = Math.max(
      propertyType.minArea,
      Math.min(propertyType.maxArea, grossArea)
    );

    const usableArea = Math.max(
      10,
      Math.round(grossArea * layoutType.usableRatio)
    );

    const kitchenSuggestedArea = Math.max(
      8,
      Math.round(usableArea * (0.26 + pseudo(seed, 4) * 0.12))
    );

    const diningSuggestedArea = Math.max(
      0,
      usableArea - kitchenSuggestedArea - Math.round(usableArea * 0.13)
    );

    const seatEstimate = Math.max(
      propertyType.id === "foodcourt_stall" ||
        propertyType.id === "park_canteen"
        ? 0
        : 6,

      Math.floor((diningSuggestedArea * layoutType.seatsFactor) / 1.55)
    );

    const frontage = Number(
      (
        propertyType.frontageMin +
        (propertyType.frontageMax - propertyType.frontageMin) * pseudo(seed, 5)
      ).toFixed(1)
    );

    const depth = Number((grossArea / Math.max(2.4, frontage)).toFixed(1));

    const floor = pick(propertyType.floorOptions, seed, 6);

    const ceilingHeight = Number(
      (
        3.0 +
        pseudo(seed, 7) * (propertyType.id === "detached" ? 2.1 : 1.2)
      ).toFixed(1)
    );

    const baseRentPerSqm =
      42 + street.traffic * 0.52 + street.competition * 0.18;

    const rentPerSqm = roundTo(
      baseRentPerSqm *
        district.averageRentFactor *
        street.rentFactor *
        propertyType.rentFactor *
        (0.88 + pseudo(seed, 8) * 0.24),
      1
    );

    const monthlyRent = roundTo(grossArea * rentPerSqm, 100);

    const propertyFeePerSqm =
      floor === "B1" ||
      propertyType.id === "mall_shop" ||
      propertyType.id === "office_podium"
        ? roundTo(4 + pseudo(seed, 9) * 16, 0.5)
        : roundTo(1 + pseudo(seed, 9) * 5, 0.5);

    const propertyFee = roundTo(grossArea * propertyFeePerSqm, 10);

    const depositMonths = 1 + Math.floor(pseudo(seed, 10) * 3);

    const paymentCycle = pick(data.PAYMENT_CYCLES, seed, 11);

    const freeRentDays = 3 + Math.floor(pseudo(seed, 12) * 28);

    const leaseYears = 1 + Math.floor(pseudo(seed, 13) * 5);

    const annualIncrease = Number((pseudo(seed, 14) * 0.08).toFixed(3));

    const previousBusiness = pick(data.PREVIOUS_BUSINESS_TYPES, seed, 15);

    const vacantMonths = Math.floor(pseudo(seed, 16) * 15);

    const vacancyReason = pick(data.VACANCY_REASONS, seed, 17);

    const risk1 = pick(data.RISK_LIBRARY, seed, 18);

    const risk2 =
      pseudo(seed, 19) > 0.68 ? pick(data.RISK_LIBRARY, seed, 20) : null;

    const riskMap = new Map();

    [risk1, risk2]
      .filter(Boolean)
      .forEach((risk) => riskMap.set(risk.id, risk));

    if (riskMap.size === 0) {
      riskMap.set("none", data.RISK_LIBRARY[0]);
    }

    if (riskMap.size > 1 && riskMap.has("none")) {
      riskMap.delete("none");
    }

    const risks = Array.from(riskMap.values());

    const landlord = pick(data.LANDLORD_PROFILES, seed, 21);

    const broker = pick(data.BROKERS, seed, 22);

    const transferFee =
      previousBusiness === "空置毛坯"
        ? 0
        : roundTo(monthlyRent * (0.4 + pseudo(seed, 23) * 5.6), 500);

    const brokerFee = roundTo(monthlyRent * broker.feeRate, 100);

    const exhaust =
      propertyType.id === "foodcourt_stall" || propertyType.id === "mall_shop"
        ? pseudo(seed, 24) > 0.27
        : pseudo(seed, 24) > 0.16;

    const gas =
      pseudo(seed, 25) >
      (propertyType.id === "mall_shop" || propertyType.id === "foodcourt_stall"
        ? 0.53
        : 0.22);

    const threePhase = pseudo(seed, 26) > 0.18;

    const drainage = pseudo(seed, 27) > 0.14;

    const greaseTrap = pseudo(seed, 28) > 0.31;

    const fireSprinkler =
      propertyType.id === "mall_shop" ||
      propertyType.id === "office_podium" ||
      propertyType.id === "foodcourt_stall"
        ? true
        : pseudo(seed, 29) > 0.24;

    const independentToilet = grossArea >= 80 && pseudo(seed, 30) > 0.36;

    const loadingAccess = clamp(
      Math.round(
        street.vehicleTraffic * 0.62 +
          street.parking * 0.28 +
          pseudo(seed, 31) * 18
      ),
      0,
      100
    );

    const riderAccess = clamp(
      Math.round(street.delivery * 0.78 + pseudo(seed, 32) * 22),
      0,
      100
    );

    const visibility = clamp(
      Math.round(
        street.traffic * 0.53 +
          propertyType.visibilityBonus +
          frontage * 2.1 +
          pseudo(seed, 33) * 18
      ),
      0,
      100
    );

    const noiseTolerance = clamp(
      Math.round(34 + street.night * 0.44 + pseudo(seed, 34) * 25),
      0,
      100
    );

    const electricCapacityKw = roundTo(
      25 + grossArea * (0.28 + pseudo(seed, 35) * 0.45),
      5
    );

    const waterPressure = clamp(Math.round(55 + pseudo(seed, 36) * 44), 0, 100);

    const renovationLevel =
      previousBusiness === "空置毛坯"
        ? "毛坯"
        : pseudo(seed, 37) > 0.58
        ? "可继续使用"
        : "需要翻新";

    const renovationEstimate =
      renovationLevel === "毛坯"
        ? roundTo(grossArea * (900 + pseudo(seed, 38) * 700), 1000)
        : renovationLevel === "需要翻新"
        ? roundTo(grossArea * (420 + pseudo(seed, 38) * 480), 1000)
        : roundTo(grossArea * (120 + pseudo(seed, 38) * 230), 1000);

    const riskRepairCost = risks.reduce(
      (total, risk) => total + (risk.costImpact || 0),
      0
    );

    const firstPaymentMonths = paymentCycle.monthsPerPayment;

    const upfrontCash =
      monthlyRent * (depositMonths + firstPaymentMonths) +
      transferFee +
      brokerFee +
      renovationEstimate +
      riskRepairCost;

    const monthlyFixedOccupancyCost = monthlyRent + propertyFee;

    const suitableFor = [];

    if (grossArea <= 55) {
      suitableFor.push("小吃", "奶茶", "咖啡", "面馆");
    }

    if (grossArea >= 45 && grossArea <= 160) {
      suitableFor.push("快餐", "简餐", "早餐加盟");
    }

    if (grossArea >= 90 && exhaust && gas) {
      suitableFor.push("炒菜馆", "烧烤");
    }

    if (grossArea >= 140 && exhaust && electricCapacityKw >= 70) {
      suitableFor.push("火锅", "大型正餐");
    }

    const code = String(10 + (seed % 89));

    return {
      id: streetId + "_P" + String(index + 1).padStart(2, "0"),

      marketEpoch: this.marketEpoch,

      districtId: street.districtId,

      streetId,

      address: street.name + code + "号",

      propertyTypeId: propertyType.id,

      propertyTypeName: propertyType.name,

      layoutTypeId: layoutType.id,

      layoutTypeName: layoutType.name,

      grossArea,

      usableArea,

      kitchenSuggestedArea,

      diningSuggestedArea,

      seatEstimate,

      floor,

      frontage,

      depth,

      ceilingHeight,

      corner: propertyType.id === "corner_shop",

      monthlyRent,

      rentPerSqm,

      propertyFee,

      propertyFeePerSqm,

      depositMonths,

      paymentCycleId: paymentCycle.id,

      paymentCycleName: paymentCycle.name,

      paymentMonths: paymentCycle.monthsPerPayment,

      freeRentDays,

      leaseYears,

      annualIncrease,

      transferFee,

      brokerFee,

      previousBusiness,

      vacantMonths,

      vacancyReason,

      renovationLevel,

      renovationEstimate,

      landlordId: landlord.id,

      landlordName: landlord.name,

      landlordNegotiation: landlord.negotiation,

      landlordRenewalRisk: landlord.renewalRisk,

      brokerId: broker.id,

      brokerName: broker.name,

      brokerAgency: broker.agency,

      exhaust,

      gas,

      threePhase,

      drainage,

      greaseTrap,

      fireSprinkler,

      independentToilet,

      electricCapacityKw,

      waterPressure,

      loadingAccess,

      riderAccess,

      parkingScore: street.parking,

      visibility,

      noiseTolerance,

      streetTraffic: street.traffic,

      streetCompetition: street.competition,

      nightIndex: street.night,

      risks: risks.map(copy),

      riskLevel: risks.reduce((max, risk) => Math.max(max, risk.level), 0),

      riskRepairCost,

      suitableFor,

      upfrontCash,

      monthlyFixedOccupancyCost,
    };
  }

  getListingsByStreet(streetId, count) {
    const amount = Math.max(
      1,
      Math.floor(Number(count) || DEFAULT_LISTINGS_PER_STREET)
    );

    const result = [];

    for (let i = 0; i < amount; i++) {
      const listing = this.generateListing(streetId, i);

      if (listing) {
        result.push(listing);
      }
    }

    return result;
  }

  getListingsByDistrict(districtId) {
    const streets = this.getStreets(districtId);

    const result = [];

    for (let i = 0; i < streets.length; i++) {
      const listings = this.getListingsByStreet(streets[i].id);

      for (let j = 0; j < listings.length; j++) {
        result.push(listings[j]);
      }
    }

    return result;
  }

  getAllListings() {
    const result = [];

    for (let i = 0; i < data.STREETS.length; i++) {
      const listings = this.getListingsByStreet(data.STREETS[i].id);

      for (let j = 0; j < listings.length; j++) {
        result.push(listings[j]);
      }
    }

    return result;
  }

  getListing(listingId) {
    const match = String(listingId || "").match(/^(.*)_P(\d+)$/);

    if (!match) {
      return null;
    }

    const streetId = match[1];

    const index = Number(match[2]) - 1;

    if (index < 0) {
      return null;
    }

    return this.generateListing(streetId, index);
  }

  searchListings(filters) {
    const f = filters || {};

    let source;

    if (f.streetId) {
      source = this.getListingsByStreet(f.streetId);
    } else if (f.districtId) {
      source = this.getListingsByDistrict(f.districtId);
    } else {
      source = this.getAllListings();
    }

    let result = source.filter((listing) => {
      if (f.minArea != null && listing.grossArea < Number(f.minArea)) {
        return false;
      }

      if (f.maxArea != null && listing.grossArea > Number(f.maxArea)) {
        return false;
      }

      if (
        f.maxMonthlyRent != null &&
        listing.monthlyRent > Number(f.maxMonthlyRent)
      ) {
        return false;
      }

      if (
        f.maxUpfrontCash != null &&
        listing.upfrontCash > Number(f.maxUpfrontCash)
      ) {
        return false;
      }

      if (f.propertyTypeId && listing.propertyTypeId !== f.propertyTypeId) {
        return false;
      }

      if (f.floor && listing.floor !== f.floor) {
        return false;
      }

      if (f.requireExhaust === true && !listing.exhaust) {
        return false;
      }

      if (f.requireGas === true && !listing.gas) {
        return false;
      }

      if (f.requireThreePhase === true && !listing.threePhase) {
        return false;
      }

      if (
        f.maxRiskLevel != null &&
        listing.riskLevel > Number(f.maxRiskLevel)
      ) {
        return false;
      }

      if (
        f.minVisibility != null &&
        listing.visibility < Number(f.minVisibility)
      ) {
        return false;
      }

      if (f.minSeats != null && listing.seatEstimate < Number(f.minSeats)) {
        return false;
      }

      return true;
    });

    const sortBy = f.sortBy || "upfrontCash";

    const sortDir = f.sortDir === "desc" ? -1 : 1;

    result = result.sort((a, b) => {
      const av = Number(a[sortBy]) || 0;

      const bv = Number(b[sortBy]) || 0;

      return (av - bv) * sortDir;
    });

    return result;
  }

  getMarketStats() {
    const all = this.getAllListings();

    const districtCounts = {};

    for (let i = 0; i < all.length; i++) {
      const id = all[i].districtId;

      districtCounts[id] = (districtCounts[id] || 0) + 1;
    }

    const averageRent = all.length
      ? Math.round(
          all.reduce((sum, item) => sum + item.monthlyRent, 0) / all.length
        )
      : 0;

    const averageArea = all.length
      ? Math.round(
          all.reduce((sum, item) => sum + item.grossArea, 0) / all.length
        )
      : 0;

    return {
      marketEpoch: this.marketEpoch,

      districtCount: Object.keys(data.DISTRICT_PROFILES).length,

      streetCount: data.STREETS.length,

      listingCount: all.length,

      averageMonthlyRent: averageRent,

      averageGrossArea: averageArea,

      districtCounts,
    };
  }
}

module.exports = new PropertySystem();
