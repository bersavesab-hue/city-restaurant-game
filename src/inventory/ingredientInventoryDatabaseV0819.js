'use strict';

const foodPack =
  require('../food/foodPackV10.js');

const VERSION =
  '0.8.19';

const STORAGE_ZONES =
  Object.freeze({
    ambient:{
      id:'ambient',
      name:'常温库',
      minTempC:10,
      maxTempC:26,
      defaultCapacityKg:600
    },
    chilled:{
      id:'chilled',
      name:'冷藏库',
      minTempC:0,
      maxTempC:5,
      defaultCapacityKg:320
    },
    frozen:{
      id:'frozen',
      name:'冷冻库',
      minTempC:-22,
      maxTempC:-15,
      defaultCapacityKg:220
    }
  });

const CATEGORY_PROFILES =
  Object.freeze({
    rice_grain:{name:'米粮杂粮',storage:'ambient',handling:'dry',turnover:'slow'},
    flour_noodle:{name:'面粉粉面',storage:'ambient',handling:'dry',turnover:'slow'},
    pork:{name:'猪肉',storage:'chilled',handling:'raw_meat',turnover:'fast'},
    beef:{name:'牛肉',storage:'chilled',handling:'raw_meat',turnover:'fast'},
    lamb:{name:'羊肉',storage:'chilled',handling:'raw_meat',turnover:'fast'},
    poultry:{name:'禽类',storage:'chilled',handling:'raw_meat',turnover:'fast'},
    seafood:{name:'水产海鲜',storage:'chilled',handling:'seafood',turnover:'fast'},
    egg_dairy:{name:'蛋奶',storage:'chilled',handling:'cold_chain',turnover:'normal'},
    tofu_soy:{name:'豆制品',storage:'chilled',handling:'cold_chain',turnover:'fast'},
    leafy:{name:'叶菜',storage:'chilled',handling:'produce',turnover:'fast'},
    root:{name:'根茎菜',storage:'ambient',handling:'produce',turnover:'normal'},
    fruit_veg:{name:'瓜果蔬菜',storage:'chilled',handling:'produce',turnover:'fast'},
    mushroom:{name:'菌菇',storage:'chilled',handling:'produce',turnover:'fast'},
    aromatics:{name:'葱姜蒜香辛料',storage:'ambient',handling:'dry_or_fresh',turnover:'normal'},
    seasoning:{name:'调味品',storage:'ambient',handling:'dry',turnover:'slow'},
    oil_fat:{name:'油脂酱料',storage:'ambient',handling:'sealed',turnover:'slow'},
    fruit:{name:'水果',storage:'chilled',handling:'produce',turnover:'fast'},
    beverage:{name:'饮品原料',storage:'ambient',handling:'dry_or_sealed',turnover:'slow'},
    bakery:{name:'烘焙原料',storage:'ambient',handling:'dry',turnover:'slow'},
    frozen_processed:{name:'冻品半成品',storage:'frozen',handling:'frozen',turnover:'normal'}
  });

const STORAGE_BY_CATEGORY =
  Object.freeze(
    Object.fromEntries(
      Object.entries(
        CATEGORY_PROFILES
      ).map(
        ([id, profile]) => [
          id,
          profile.storage
        ]
      )
    )
  );

function clone(value) {
  return JSON.parse(
    JSON.stringify(value)
  );
}

function clamp(
  value,
  min,
  max
) {
  return Math.max(
    min,
    Math.min(
      max,
      value
    )
  );
}

function perishability(
  shelfDays
) {
  const days =
    Math.max(
      1,
      Number(
        shelfDays
      ) || 1
    );

  if (days <= 2) {
    return 'ultra_fresh';
  }

  if (days <= 5) {
    return 'high';
  }

  if (days <= 14) {
    return 'medium';
  }

  if (days <= 60) {
    return 'low';
  }

  return 'shelf_stable';
}

function nearExpiryDays(
  shelfDays
) {
  const days =
    Math.max(
      1,
      Number(
        shelfDays
      ) || 1
    );

  if (days <= 2) {
    return 1;
  }

  return clamp(
    Math.ceil(
      days *
      0.18
    ),
    1,
    7
  );
}

function getIngredient(
  ingredientId
) {
  const item =
    foodPack
      .INGREDIENTS
      .find(
        row =>
          row.id ===
          ingredientId
      );

  if (!item) {
    return null;
  }

  const profile =
    CATEGORY_PROFILES[
      item.category
    ] ||
    null;

  const storage =
    profile
      ? profile.storage
      : 'ambient';

  return {
    ...clone(item),
    databaseVersion:VERSION,
    categoryName:
      profile
        ? profile.name
        : item.category,
    storageZoneId:
      storage,
    storageZone:
      clone(
        STORAGE_ZONES[
          storage
        ]
      ),
    handling:
      profile
        ? profile.handling
        : 'general',
    turnover:
      profile
        ? profile.turnover
        : 'normal',
    perishability:
      perishability(
        item.shelfDays
      ),
    nearExpiryDays:
      nearExpiryDays(
        item.shelfDays
      ),
    inventoryBaseUnit:'g',
    procurementUnit:
      item.unit,
    usableYield:
      Number(
        item.usableYield
      ) || 1
  };
}

function queryIngredients(
  filters
) {
  const f =
    filters ||
    {};

  return foodPack
    .INGREDIENTS
    .filter(
      item =>
        (
          !f.category ||
          item.category ===
            f.category
        ) &&
        (
          !f.storage ||
          STORAGE_BY_CATEGORY[
            item.category
          ] ===
            f.storage
        ) &&
        (
          !f.perishability ||
          perishability(
            item.shelfDays
          ) ===
            f.perishability
        )
    )
    .map(
      item =>
        getIngredient(
          item.id
        )
    );
}

function getCategories() {
  const counts = {};

  for (
    const item
    of foodPack
        .INGREDIENTS
  ) {
    counts[
      item.category
    ] =
      (
        counts[
          item.category
        ] ||
        0
      ) +
      1;
  }

  return Object
    .entries(
      CATEGORY_PROFILES
    )
    .map(
      ([id, profile]) => ({
        id,
        ...clone(profile),
        ingredientCount:
          counts[id] ||
          0
      })
    );
}

function getStorageZones() {
  return Object
    .values(
      STORAGE_ZONES
    )
    .map(clone);
}

function freshnessScore(
  lot,
  day
) {
  if (!lot) {
    return 0;
  }

  const received =
    Number(
      lot.receivedDay
    ) || 0;

  const expiry =
    Number(
      lot.expiryDay
    ) || received;

  const current =
    Number(
      day
    ) || received;

  const total =
    Math.max(
      1,
      expiry -
      received
    );

  const remain =
    expiry -
    current;

  return clamp(
    Math.round(
      remain /
      total *
      100
    ),
    0,
    100
  );
}

function lotStatus(
  lot,
  day,
  ingredientValue
) {
  if (!lot) {
    return {
      status:'missing',
      daysRemaining:null,
      freshness:0,
      nearExpiry:false,
      expired:true
    };
  }

  const ingredient =
    ingredientValue ||
    getIngredient(
      lot.ingredientId
    );

  const current =
    Number(
      day
    ) || 0;

  const expiry =
    Number(
      lot.expiryDay
    ) || current;

  const remaining =
    expiry -
    current;

  const warningDays =
    ingredient
      ? ingredient
          .nearExpiryDays
      : 1;

  let status =
    'fresh';

  if (remaining < 0) {
    status =
      'expired';
  } else if (remaining === 0) {
    status =
      'expires_today';
  } else if (
    remaining <=
    warningDays
  ) {
    status =
      'near_expiry';
  }

  return {
    status,
    daysRemaining:
      remaining,
    freshness:
      freshnessScore(
        lot,
        current
      ),
    nearExpiry:
      status ===
        'near_expiry' ||
      status ===
        'expires_today',
    expired:
      status ===
        'expired'
  };
}

function normalizeLot(
  lot,
  day
) {
  if (!lot) {
    return null;
  }

  const ingredient =
    getIngredient(
      lot.ingredientId
    );

  const received =
    Number(
      lot.receivedDay
    ) || 0;

  const shelfDays =
    ingredient
      ? ingredient.shelfDays
      : 1;

  const expiry =
    lot.expiryDay == null
      ? received +
        Math.max(
          1,
          Number(
            shelfDays
          ) || 1
        )
      : Number(
          lot.expiryDay
        );

  const originalGrams =
    Math.max(
      Number(
        lot.originalGrams
      ) ||
      Number(
        lot.grams
      ) ||
      0,
      Number(
        lot.grams
      ) ||
      0
    );

  const normalized = {
    ...clone(lot),
    batchNo:
      lot.batchNo ||
      String(
        lot.id ||
        (
          lot.ingredientId +
          ':' +
          received
        )
      ),
    ingredientName:
      lot.ingredientName ||
      (
        ingredient
          ? ingredient.name
          : lot.ingredientId
      ),
    originalGrams,
    grams:
      Math.max(
        0,
        Number(
          lot.grams
        ) || 0
      ),
    storage:
      lot.storage ||
      (
        ingredient
          ? ingredient
              .storageZoneId
          : 'ambient'
      ),
    receivedDay:
      received,
    expiryDay:
      expiry,
    quality:
      clamp(
        Number(
          lot.quality
        ) || 75,
        0,
        100
      )
  };

  return {
    ...normalized,
    status:
      lotStatus(
        normalized,
        day,
        ingredient
      )
  };
}

function capacitySummary(
  state
) {
  const capacity =
    state &&
    state.capacityKg &&
    typeof state.capacityKg ===
      'object'
      ? state.capacityKg
      : {};

  const used = {
    ambient:0,
    chilled:0,
    frozen:0
  };

  for (
    const lot
    of (
      state &&
      state.lots ||
      []
    )
  ) {
    if (
      !lot ||
      Number(
        lot.grams
      ) <=
        0
    ) {
      continue;
    }

    const ingredient =
      getIngredient(
        lot.ingredientId
      );

    const zone =
      lot.storage ||
      (
        ingredient
          ? ingredient
              .storageZoneId
          : 'ambient'
      );

    if (
      used[zone] ==
      null
    ) {
      used[zone] =
        0;
    }

    used[zone] +=
      Number(
        lot.grams
      ) /
      1000;
  }

  const rows =
    getStorageZones()
      .map(
        zone => {
          const cap =
            Math.max(
              0,
              Number(
                capacity[
                  zone.id
                ]
              ) ||
              zone
                .defaultCapacityKg
            );

          const usedKg =
            Number(
              (
                used[
                  zone.id
                ] ||
                0
              ).toFixed(3)
            );

          const ratio =
            cap >
            0
              ? usedKg /
                cap
              : 1;

          return {
            id:
              zone.id,
            name:
              zone.name,
            capacityKg:
              cap,
            usedKg,
            freeKg:
              Number(
                Math.max(
                  0,
                  cap -
                  usedKg
                ).toFixed(3)
              ),
            usageRatio:
              Number(
                ratio.toFixed(4)
              ),
            status:
              ratio >= 0.95
                ? 'critical'
                : ratio >= 0.8
                  ? 'high'
                  : 'ok'
          };
        }
      );

  return {
    rows,
    totalCapacityKg:
      rows.reduce(
        (
          sum,
          row
        ) =>
          sum +
          row.capacityKg,
        0
      ),
    totalUsedKg:
      Number(
        rows.reduce(
          (
            sum,
            row
          ) =>
            sum +
            row.usedKg,
          0
        ).toFixed(3)
      )
  };
}

function lotRows(
  state
) {
  const day =
    Number(
      state &&
      state.day
    ) || 0;

  return (
    state &&
    state.lots ||
    []
  )
    .filter(
      lot =>
        lot &&
        Number(
          lot.grams
        ) >
          0
    )
    .map(
      lot =>
        normalizeLot(
          lot,
          day
        )
    )
    .sort(
      (
        a,
        b
      ) =>
        a.expiryDay -
        b.expiryDay ||
        a.receivedDay -
        b.receivedDay
    );
}

function getStats() {
  return {
    version:VERSION,
    ingredients:
      foodPack
        .INGREDIENTS
        .length,
    categories:
      Object.keys(
        CATEGORY_PROFILES
      ).length,
    storageZones:
      Object.keys(
        STORAGE_ZONES
      ).length,
    ambientIngredients:
      queryIngredients({
        storage:'ambient'
      }).length,
    chilledIngredients:
      queryIngredients({
        storage:'chilled'
      }).length,
    frozenIngredients:
      queryIngredients({
        storage:'frozen'
      }).length
  };
}

function validate() {
  const issues = [];

  const ids =
    foodPack
      .INGREDIENTS
      .map(
        item =>
          item.id
      );

  if (
    new Set(
      ids
    ).size !==
    ids.length
  ) {
    issues.push(
      '食材ID存在重复'
    );
  }

  const categories =
    new Set(
      foodPack
        .INGREDIENTS
        .map(
          item =>
            item.category
        )
    );

  for (
    const category
    of categories
  ) {
    if (
      !CATEGORY_PROFILES[
        category
      ]
    ) {
      issues.push(
        '食材分类缺少库存档案: ' +
        category
      );
    }
  }

  for (
    const item
    of foodPack
        .INGREDIENTS
  ) {
    const row =
      getIngredient(
        item.id
      );

    if (!row) {
      issues.push(
        '无法读取食材: ' +
        item.id
      );
      continue;
    }

    if (
      !STORAGE_ZONES[
        row.storageZoneId
      ]
    ) {
      issues.push(
        item.id +
        ' 引用不存在仓储温区'
      );
    }

    if (
      row.shelfDays <=
        0 ||
      row.usableYield <=
        0
    ) {
      issues.push(
        item.id +
        ' 保质期/净料率异常'
      );
    }
  }

  const stats =
    getStats();

  if (
    stats.ingredients !==
    243
  ) {
    issues.push(
      '正式食材应为243种，实际=' +
      stats.ingredients
    );
  }

  if (
    stats.categories !==
    20
  ) {
    issues.push(
      '食材分类应为20类，实际=' +
      stats.categories
    );
  }

  if (
    stats.storageZones !==
    3
  ) {
    issues.push(
      '仓储温区应为3个'
    );
  }

  if (
    stats.ambientIngredients +
    stats.chilledIngredients +
    stats.frozenIngredients !==
    stats.ingredients
  ) {
    issues.push(
      '仓储温区映射未覆盖全部食材'
    );
  }

  return {
    ok:
      issues.length ===
      0,
    issues,
    stats
  };
}

module.exports = {
  VERSION,
  foodPack,
  STORAGE_ZONES,
  CATEGORY_PROFILES,
  STORAGE_BY_CATEGORY,
  perishability,
  nearExpiryDays,
  getIngredient,
  queryIngredients,
  getCategories,
  getStorageZones,
  freshnessScore,
  lotStatus,
  normalizeLot,
  capacitySummary,
  lotRows,
  getStats,
  validate
};
