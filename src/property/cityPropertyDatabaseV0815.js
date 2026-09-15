'use strict';

const citySystem =
  require('../city/citySystem.js');

const propertyData =
  require('./propertyData.js');

const marketData =
  require('./propertyMarketData.js');

const propertyPack =
  require('./propertyPackV02.js');

const propertyAdapter =
  require('./propertyAdapterV02.js');

const VERSION = '0.8.15';
const DEFAULT_CITY_ID = 'yunzhou';

function clone(value) {
  return JSON.parse(
    JSON.stringify(value)
  );
}

function unique(values) {
  return Array.from(
    new Set(values)
  );
}

function getCity(cityId) {
  const id =
    cityId ||
    DEFAULT_CITY_ID;

  const city =
    citySystem
      .getBaseCity(
        id
      );

  return city
    ? clone(city)
    : null;
}

function getDistrict(
  districtId
) {
  const district =
    citySystem
      .getBaseDistrict(
        districtId
      );

  if (!district) {
    return null;
  }

  const marketProfile =
    propertyData
      .DISTRICT_PROFILES[
        districtId
      ] ||
    null;

  const propertyBaseline =
    propertyPack
      .DISTRICT_BASELINES[
        districtId
      ] ||
    null;

  return {
    ...clone(district),
    marketProfile:
      marketProfile
        ? clone(
            marketProfile
          )
        : null,
    propertyBaseline:
      propertyBaseline
        ? clone(
            propertyBaseline
          )
        : null,
    streetCount:
      getStreets(
        districtId
      ).length
  };
}

function getDistricts(
  cityId
) {
  const city =
    getCity(
      cityId
    );

  if (!city) {
    return [];
  }

  return city
    .districts
    .map(
      getDistrict
    )
    .filter(Boolean);
}

function getStreets(
  districtId
) {
  return propertyData
    .STREETS
    .filter(
      street =>
        !districtId ||
        street.districtId ===
          districtId
    )
    .map(clone);
}

function getStreet(
  streetId
) {
  const street =
    propertyData
      .STREETS
      .find(
        item =>
          item.id ===
          streetId
      );

  if (!street) {
    return null;
  }

  const district =
    citySystem
      .getBaseDistrict(
        street.districtId
      );

  return {
    ...clone(street),
    cityId:
      district
        ? district.cityId
        : DEFAULT_CITY_ID,
    districtName:
      district
        ? district.name
        : null
  };
}

function getPropertyCategories() {
  return Object
    .values(
      propertyPack
        .PROPERTY_CATEGORIES
    )
    .map(clone);
}

function getPropertyCategory(
  categoryId
) {
  const item =
    propertyPack
      .PROPERTY_CATEGORIES[
        categoryId
      ];

  return item
    ? clone(item)
    : null;
}

function getPropertySubtypes(
  filters
) {
  const f =
    filters ||
    {};

  let rows =
    propertyPack
      .PROPERTY_SUBTYPES;

  if (f.categoryId) {
    rows =
      rows.filter(
        item =>
          item.categoryId ===
            f.categoryId
      );
  }

  if (f.sizeBandId) {
    const band =
      propertyPack
        .SIZE_BANDS
        .find(
          item =>
            item.id ===
              f.sizeBandId
        );

    if (band) {
      rows =
        rows.filter(
          item =>
            item.areaRange[1] >=
              band.min &&
            item.areaRange[0] <=
              band.max
        );
    }
  }

  if (
    f.minArea != null ||
    f.maxArea != null
  ) {
    const min =
      f.minArea == null
        ? 0
        : Number(
            f.minArea
          );

    const max =
      f.maxArea == null
        ? Infinity
        : Number(
            f.maxArea
          );

    rows =
      rows.filter(
        item =>
          item.areaRange[1] >=
            min &&
          item.areaRange[0] <=
            max
      );
  }

  return rows
    .map(clone);
}

function getPropertySubtype(
  subtypeId
) {
  const item =
    propertyPack
      .PROPERTY_SUBTYPE_BY_ID[
        subtypeId
      ];

  return item
    ? clone(item)
    : null;
}

function getStructureTemplates(
  subtypeId
) {
  return propertyPack
    .STRUCTURE_TEMPLATES
    .filter(
      item =>
        !subtypeId ||
        item.subtypeId ===
          subtypeId ||
        item.propertySubtypeId ===
          subtypeId
    )
    .map(clone);
}

function getSizeBands() {
  return propertyPack
    .SIZE_BANDS
    .map(clone);
}

function getStats() {
  const city =
    getCity(
      DEFAULT_CITY_ID
    );

  const districtIds =
    city
      ? city.districts
      : [];

  const streets =
    propertyData
      .STREETS;

  const packStats =
    propertyAdapter
      .getPackStats();

  const streetsByDistrict =
    {};

  for (
    const districtId
    of districtIds
  ) {
    streetsByDistrict[
      districtId
    ] =
      streets.filter(
        street =>
          street.districtId ===
            districtId
      ).length;
  }

  return {
    version:VERSION,
    cityCount:
      city
        ? 1
        : 0,
    districtCount:
      districtIds.length,
    streetCount:
      streets.length,
    streetsByDistrict,
    potentialAddressCount:
      streets.length *
      marketData
        .CONFIG
        .potentialSlotsPerStreet,
    staticBaselineListingCount:
      streets.length *
      8,
    categoryCount:
      packStats.categories,
    subtypeCount:
      packStats.subtypes,
    structureTemplateCount:
      packStats.structures,
    sizeBandCount:
      packStats.sizeBands,
    landlordTypeCount:
      packStats.landlords,
    landlordTraitCount:
      packStats.landlordTraits,
    contractTemplateCount:
      packStats.contracts,
    historicalUseCount:
      packStats.historicalUses,
    vacancyReasonCount:
      packStats.vacancyReasons,
    restrictionCount:
      packStats.restrictions
  };
}

function validate() {
  const issues = [];
  const city =
    getCity(
      DEFAULT_CITY_ID
    );

  if (!city) {
    issues.push(
      '缺少默认城市 ' +
      DEFAULT_CITY_ID
    );
  }

  const districtIds =
    city
      ? city.districts
      : [];

  const duplicateDistrictIds =
    districtIds.filter(
      (
        id,
        index
      ) =>
        districtIds.indexOf(
          id
        ) !==
        index
    );

  for (
    const id
    of unique(
      duplicateDistrictIds
    )
  ) {
    issues.push(
      '商圈ID重复: ' +
      id
    );
  }

  for (
    const districtId
    of districtIds
  ) {
    if (
      !citySystem
        .getBaseDistrict(
          districtId
        )
    ) {
      issues.push(
        '城市引用不存在商圈: ' +
        districtId
      );
    }

    if (
      !propertyData
        .DISTRICT_PROFILES[
          districtId
        ]
    ) {
      issues.push(
        '商圈缺少房源市场画像: ' +
        districtId
      );
    }

    if (
      !propertyPack
        .DISTRICT_BASELINES[
          districtId
        ]
    ) {
      issues.push(
        '商圈缺少完整房源基线: ' +
        districtId
      );
    }

    const count =
      getStreets(
        districtId
      ).length;

    if (count !== 6) {
      issues.push(
        districtId +
        ' 街道数量应为6，实际=' +
        count
      );
    }
  }

  const streetIds =
    propertyData
      .STREETS
      .map(
        street =>
          street.id
      );

  if (
    unique(
      streetIds
    ).length !==
    streetIds.length
  ) {
    issues.push(
      '街道ID存在重复'
    );
  }

  for (
    const street
    of propertyData
        .STREETS
  ) {
    if (
      districtIds.indexOf(
        street.districtId
      ) ===
      -1
    ) {
      issues.push(
        '街道引用不存在商圈: ' +
        street.id +
        ' -> ' +
        street.districtId
      );
    }
  }

  const categoryIds =
    Object.keys(
      propertyPack
        .PROPERTY_CATEGORIES
    );

  const subtypeIds =
    propertyPack
      .PROPERTY_SUBTYPES
      .map(
        item =>
          item.id
      );

  if (
    unique(
      subtypeIds
    ).length !==
    subtypeIds.length
  ) {
    issues.push(
      '二级铺型ID存在重复'
    );
  }

  for (
    const subtype
    of propertyPack
        .PROPERTY_SUBTYPES
  ) {
    if (
      categoryIds.indexOf(
        subtype.categoryId
      ) ===
      -1
    ) {
      issues.push(
        '二级铺型引用不存在大类: ' +
        subtype.id +
        ' -> ' +
        subtype.categoryId
      );
    }
  }

  const stats =
    getStats();

  if (
    stats.districtCount !== 7
  ) {
    issues.push(
      '商圈总数应为7，实际=' +
      stats.districtCount
    );
  }

  if (
    stats.streetCount !== 42
  ) {
    issues.push(
      '街道总数应为42，实际=' +
      stats.streetCount
    );
  }

  if (
    stats.potentialAddressCount !==
    756
  ) {
    issues.push(
      '潜在铺位应为756，实际=' +
      stats.potentialAddressCount
    );
  }

  if (
    stats.categoryCount !== 16 ||
    stats.subtypeCount !== 96 ||
    stats.structureTemplateCount !== 240
  ) {
    issues.push(
      '完整房源包规模异常: ' +
      JSON.stringify({
        categories:
          stats.categoryCount,
        subtypes:
          stats.subtypeCount,
        structures:
          stats.structureTemplateCount
      })
    );
  }

  return {
    ok:
      issues.length ===
      0,
    version:VERSION,
    issues,
    stats
  };
}

function getCityGraph(
  cityId
) {
  const city =
    getCity(
      cityId
    );

  if (!city) {
    return null;
  }

  return {
    ...city,
    districts:
      getDistricts(
        city.id
      ).map(
        district => ({
          ...district,
          streets:
            getStreets(
              district.id
            )
        })
      )
  };
}

function enrichDynamicListing(
  rawListing,
  context
) {
  const raw =
    rawListing ||
    {};

  const enriched =
    propertyAdapter
      .enrichListing(
        raw,
        context ||
        {}
      );

  const street =
    getStreet(
      enriched.streetId ||
      raw.streetId
    );

  const districtId =
    enriched.districtId ||
    raw.districtId ||
    (
      street &&
      street.districtId
    ) ||
    null;

  const district =
    districtId
      ? getDistrict(
          districtId
        )
      : null;

  return {
    ...enriched,
    databaseVersion:VERSION,
    cityId:
      district
        ? district.cityId
        : DEFAULT_CITY_ID,
    districtName:
      district
        ? district.name
        : null,
    streetName:
      street
        ? street.name
        : null
  };
}

function diagnose() {
  return validate();
}

module.exports = {
  VERSION,
  DEFAULT_CITY_ID,
  getCity,
  getDistrict,
  getDistricts,
  getStreets,
  getStreet,
  getPropertyCategories,
  getPropertyCategory,
  getPropertySubtypes,
  getPropertySubtype,
  getStructureTemplates,
  getSizeBands,
  getStats,
  getCityGraph,
  enrichDynamicListing,
  validate,
  diagnose
};
