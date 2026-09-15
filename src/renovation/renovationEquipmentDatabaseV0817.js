'use strict';

const renovationConfig =
  require('./renovationConfig.js');

const openingConfig =
  require('../opening/openingConfig.js');

const VERSION = '0.8.17';

function clone(value) {
  return JSON.parse(
    JSON.stringify(value)
  );
}

function hashText(text) {
  let value = 2166136261;

  const source =
    String(
      text ||
      ''
    );

  for (
    let i = 0;
    i < source.length;
    i++
  ) {
    value ^=
      source.charCodeAt(i);

    value =
      Math.imul(
        value,
        16777619
      );
  }

  return value >>> 0;
}

function unitFloat(
  seed,
  salt
) {
  let x =
    (
      hashText(
        String(seed) +
        ':' +
        String(salt)
      ) +
      0x9e3779b9
    ) >>>
    0;

  x ^= x << 13;
  x ^= x >>> 17;
  x ^= x << 5;

  return (
    x >>> 0
  ) /
  4294967295;
}

const CONSTRUCTION_PACKAGES = Object.freeze([
  {
    id:'site_protection',
    name:'现场保护与拆改',
    category:'preparation',
    baseCostPerSqm:34,
    daysPer100Sqm:0.8,
    qualitySensitive:false,
    required:true
  },
  {
    id:'waterproof',
    name:'后厨防水',
    category:'kitchen',
    baseCostPerSqm:52,
    daysPer100Sqm:0.7,
    qualitySensitive:true,
    required:true
  },
  {
    id:'plumbing',
    name:'给排水改造',
    category:'utility',
    baseCostPerSqm:46,
    daysPer100Sqm:0.9,
    qualitySensitive:true,
    required:true
  },
  {
    id:'electrical',
    name:'强弱电改造',
    category:'utility',
    baseCostPerSqm:58,
    daysPer100Sqm:1.0,
    qualitySensitive:true,
    required:true
  },
  {
    id:'exhaust',
    name:'排烟与补风',
    category:'kitchen',
    baseCostPerSqm:62,
    daysPer100Sqm:1.0,
    qualitySensitive:true,
    required:true
  },
  {
    id:'fire',
    name:'消防适配',
    category:'safety',
    baseCostPerSqm:38,
    daysPer100Sqm:0.8,
    qualitySensitive:true,
    required:true
  },
  {
    id:'floor',
    name:'地面工程',
    category:'finish',
    baseCostPerSqm:76,
    daysPer100Sqm:1.0,
    qualitySensitive:true,
    required:true
  },
  {
    id:'wall',
    name:'墙面工程',
    category:'finish',
    baseCostPerSqm:68,
    daysPer100Sqm:1.1,
    qualitySensitive:true,
    required:true
  },
  {
    id:'ceiling',
    name:'吊顶工程',
    category:'finish',
    baseCostPerSqm:64,
    daysPer100Sqm:1.0,
    qualitySensitive:true,
    required:true
  },
  {
    id:'lighting',
    name:'灯光与线路',
    category:'finish',
    baseCostPerSqm:42,
    daysPer100Sqm:0.7,
    qualitySensitive:true,
    required:true
  },
  {
    id:'signage',
    name:'门头与导视',
    category:'frontage',
    baseCostPerSqm:24,
    daysPer100Sqm:0.5,
    qualitySensitive:true,
    required:false
  },
  {
    id:'commissioning',
    name:'联调与清洁验收',
    category:'handover',
    baseCostPerSqm:18,
    daysPer100Sqm:0.6,
    qualitySensitive:false,
    required:true
  }
]);

const MATERIAL_CATALOG = Object.freeze([
  { id:'floor_tile_basic', name:'基础防滑地砖', category:'floor', grade:'budget', unit:'㎡', unitPrice:76, durability:76, maintenance:82 },
  { id:'floor_tile_commercial', name:'商用防滑砖', category:'floor', grade:'standard', unit:'㎡', unitPrice:118, durability:88, maintenance:87 },
  { id:'floor_stone', name:'耐磨仿石材', category:'floor', grade:'good', unit:'㎡', unitPrice:186, durability:92, maintenance:84 },
  { id:'floor_terrazzo', name:'高耐磨水磨石', category:'floor', grade:'premium', unit:'㎡', unitPrice:268, durability:95, maintenance:89 },

  { id:'wall_paint_basic', name:'耐擦洗墙漆', category:'wall', grade:'budget', unit:'㎡', unitPrice:38, durability:72, maintenance:80 },
  { id:'wall_panel_standard', name:'商用护墙板', category:'wall', grade:'standard', unit:'㎡', unitPrice:96, durability:86, maintenance:86 },
  { id:'wall_wood_good', name:'防火木饰面', category:'wall', grade:'good', unit:'㎡', unitPrice:168, durability:88, maintenance:78 },
  { id:'wall_stone_premium', name:'轻质石材饰面', category:'wall', grade:'premium', unit:'㎡', unitPrice:248, durability:93, maintenance:84 },

  { id:'ceiling_grid', name:'基础格栅吊顶', category:'ceiling', grade:'budget', unit:'㎡', unitPrice:72, durability:74, maintenance:85 },
  { id:'ceiling_fireboard', name:'防火板吊顶', category:'ceiling', grade:'standard', unit:'㎡', unitPrice:108, durability:87, maintenance:86 },
  { id:'ceiling_acoustic', name:'吸音复合吊顶', category:'ceiling', grade:'good', unit:'㎡', unitPrice:158, durability:89, maintenance:84 },
  { id:'ceiling_design', name:'设计造型吊顶', category:'ceiling', grade:'premium', unit:'㎡', unitPrice:236, durability:86, maintenance:72 },

  { id:'kitchen_wall_tile', name:'后厨防油墙砖', category:'kitchen', grade:'budget', unit:'㎡', unitPrice:88, durability:82, maintenance:90 },
  { id:'kitchen_ss304', name:'304不锈钢护墙', category:'kitchen', grade:'standard', unit:'㎡', unitPrice:228, durability:96, maintenance:96 },
  { id:'waterproof_standard', name:'标准防水系统', category:'waterproof', grade:'standard', unit:'㎡', unitPrice:78, durability:88, maintenance:86 },
  { id:'waterproof_heavy', name:'重载防水系统', category:'waterproof', grade:'good', unit:'㎡', unitPrice:126, durability:95, maintenance:91 },

  { id:'wire_commercial', name:'商用阻燃线缆', category:'electrical', grade:'standard', unit:'米', unitPrice:18, durability:91, maintenance:88 },
  { id:'distribution_box', name:'商用配电箱', category:'electrical', grade:'good', unit:'套', unitPrice:2600, durability:94, maintenance:89 },
  { id:'pipe_ppr', name:'商用PPR给水管', category:'plumbing', grade:'standard', unit:'米', unitPrice:34, durability:91, maintenance:88 },
  { id:'pipe_drain', name:'耐油排水管', category:'plumbing', grade:'good', unit:'米', unitPrice:52, durability:94, maintenance:91 },

  { id:'exhaust_duct', name:'镀锌排烟风管', category:'exhaust', grade:'standard', unit:'㎡', unitPrice:142, durability:88, maintenance:84 },
  { id:'exhaust_duct_ss', name:'不锈钢排烟风管', category:'exhaust', grade:'premium', unit:'㎡', unitPrice:288, durability:96, maintenance:92 },
  { id:'fire_board', name:'A级防火板', category:'fire', grade:'standard', unit:'㎡', unitPrice:96, durability:91, maintenance:89 },
  { id:'fire_door', name:'商用防火门', category:'fire', grade:'good', unit:'樘', unitPrice:1680, durability:94, maintenance:91 }
]);

const CONTRACTOR_PROFILES = Object.freeze([
  { id:'steady_local', name:'城建装饰工程', tier:'standard', priceFactor:0.96, speedFactor:1.02, reliability:88, quality:84, specialty:'中小型餐饮门店', minArea:20, maxArea:900 },
  { id:'fast_build', name:'远景工程服务', tier:'fast', priceFactor:1.08, speedFactor:0.82, reliability:84, quality:82, specialty:'快速交付', minArea:20, maxArea:1200 },
  { id:'budget_team', name:'万家建设设计', tier:'budget', priceFactor:0.88, speedFactor:1.10, reliability:74, quality:72, specialty:'预算型项目', minArea:15, maxArea:600 },
  { id:'kitchen_pro', name:'鼎盛餐饮空间', tier:'specialist', priceFactor:1.06, speedFactor:0.94, reliability:91, quality:90, specialty:'后厨与排烟', minArea:40, maxArea:1600 },
  { id:'wood_design', name:'禾木餐饮空间', tier:'design', priceFactor:1.12, speedFactor:1.00, reliability:89, quality:93, specialty:'原木与中式空间', minArea:30, maxArea:1000 },
  { id:'premium_build', name:'匠造装饰工程', tier:'premium', priceFactor:1.18, speedFactor:0.96, reliability:95, quality:96, specialty:'高品质餐饮空间', minArea:50, maxArea:2500 },
  { id:'chain_rollout', name:'青禾建设设计', tier:'chain', priceFactor:1.03, speedFactor:0.88, reliability:93, quality:89, specialty:'连锁标准化', minArea:20, maxArea:1800 },
  { id:'large_project', name:'筑味建设设计', tier:'large', priceFactor:1.10, speedFactor:0.97, reliability:92, quality:92, specialty:'大型餐饮项目', minArea:300, maxArea:20000 },
  { id:'night_market', name:'新街工程服务', tier:'specialist', priceFactor:0.94, speedFactor:0.86, reliability:82, quality:80, specialty:'夜市与轻量改造', minArea:6, maxArea:400 },
  { id:'mall_commercial', name:'华盛装饰工程', tier:'commercial', priceFactor:1.09, speedFactor:0.91, reliability:94, quality:91, specialty:'商场与写字楼', minArea:20, maxArea:1800 },
  { id:'old_building', name:'安居工程服务', tier:'retrofit', priceFactor:1.00, speedFactor:1.06, reliability:90, quality:86, specialty:'老铺整改', minArea:15, maxArea:1200 },
  { id:'project_integrator', name:'云州餐饮工程', tier:'integrator', priceFactor:1.14, speedFactor:0.95, reliability:96, quality:94, specialty:'设计施工一体化', minArea:80, maxArea:20000 }
]);

const EQUIPMENT_SKUS = Object.freeze([
  { id:'cooking_wok_2', groupId:'cooking', name:'双头炒灶', price:11800, capacity:30, powerKw:0.8, gas:true, installDays:2, durability:86 },
  { id:'cooking_induction_4', groupId:'cooking', name:'四头电磁灶', price:16800, capacity:38, powerKw:12, gas:false, installDays:2, durability:90 },
  { id:'cooking_steam', groupId:'cooking', name:'商用蒸柜', price:13800, capacity:42, powerKw:10, gas:false, installDays:2, durability:88 },
  { id:'cooking_oven', groupId:'cooking', name:'商用烤箱', price:19800, capacity:34, powerKw:9, gas:false, installDays:2, durability:91 },
  { id:'cooking_range_heavy', groupId:'cooking', name:'重载综合灶台', price:26800, capacity:58, powerKw:3, gas:true, installDays:3, durability:94 },

  { id:'cold_upright', groupId:'cold', name:'四门立式冷柜', price:8200, capacity:46, powerKw:1.2, gas:false, installDays:1, durability:88 },
  { id:'cold_freezer', groupId:'cold', name:'商用冷冻柜', price:9800, capacity:52, powerKw:1.6, gas:false, installDays:1, durability:90 },
  { id:'cold_workbench', groupId:'cold', name:'冷藏工作台', price:7600, capacity:38, powerKw:0.9, gas:false, installDays:1, durability:87 },
  { id:'cold_display', groupId:'cold', name:'展示冷柜', price:12800, capacity:48, powerKw:1.4, gas:false, installDays:1, durability:86 },
  { id:'cold_room', groupId:'cold', name:'小型冷库机组', price:42800, capacity:160, powerKw:5.5, gas:false, installDays:4, durability:94 },

  { id:'prep_ss_table', groupId:'prep', name:'不锈钢操作台', price:2600, capacity:30, powerKw:0, gas:false, installDays:1, durability:93 },
  { id:'prep_mixer', groupId:'prep', name:'商用搅拌机', price:4800, capacity:36, powerKw:1.5, gas:false, installDays:1, durability:88 },
  { id:'prep_cutter', groupId:'prep', name:'切配机', price:6200, capacity:42, powerKw:1.8, gas:false, installDays:1, durability:87 },
  { id:'prep_scale', groupId:'prep', name:'电子计量台', price:1200, capacity:60, powerKw:0.1, gas:false, installDays:1, durability:84 },
  { id:'prep_hot_hold', groupId:'prep', name:'保温备餐台', price:6800, capacity:48, powerKw:2.2, gas:false, installDays:1, durability:89 },

  { id:'dishwash_sink', groupId:'dishwash', name:'三星水池', price:3600, capacity:32, powerKw:0, gas:false, installDays:1, durability:94 },
  { id:'dishwash_hood', groupId:'dishwash', name:'揭盖式洗碗机', price:19800, capacity:58, powerKw:9, gas:false, installDays:2, durability:90 },
  { id:'dishwash_conveyor', groupId:'dishwash', name:'长龙式洗碗机', price:58800, capacity:160, powerKw:18, gas:false, installDays:3, durability:93 },
  { id:'dishwash_disinfection', groupId:'dishwash', name:'热风消毒柜', price:6200, capacity:44, powerKw:3.5, gas:false, installDays:1, durability:88 },
  { id:'dishwash_water', groupId:'dishwash', name:'净水软化系统', price:9800, capacity:90, powerKw:0.8, gas:false, installDays:2, durability:91 },

  { id:'pos_basic', groupId:'pos', name:'基础收银机', price:2600, capacity:70, powerKw:0.25, gas:false, installDays:1, durability:84 },
  { id:'pos_touch', groupId:'pos', name:'触屏收银终端', price:4200, capacity:95, powerKw:0.35, gas:false, installDays:1, durability:89 },
  { id:'pos_kds', groupId:'pos', name:'后厨显示终端', price:3600, capacity:80, powerKw:0.3, gas:false, installDays:1, durability:87 },
  { id:'pos_order', groupId:'pos', name:'自助点餐终端', price:8800, capacity:120, powerKw:0.5, gas:false, installDays:1, durability:88 },
  { id:'pos_network', groupId:'pos', name:'门店网络套装', price:5200, capacity:150, powerKw:0.8, gas:false, installDays:1, durability:91 }
]);

function getConstructionPackages() {
  return clone(
    CONSTRUCTION_PACKAGES
  );
}

function getMaterials(filters) {
  const f =
    filters ||
    {};

  return clone(
    MATERIAL_CATALOG
      .filter(
        item =>
          (
            !f.category ||
            item.category ===
              f.category
          ) &&
          (
            !f.grade ||
            item.grade ===
              f.grade
          )
      )
  );
}

function getContractorProfiles() {
  return clone(
    CONTRACTOR_PROFILES
  );
}

function getEquipmentGroups() {
  return clone(
    openingConfig
      .equipment
  );
}

function getEquipmentGrades() {
  return clone(
    openingConfig
      .qualityGrades
  );
}

function getEquipmentSkus(filters) {
  const f =
    filters ||
    {};

  return clone(
    EQUIPMENT_SKUS
      .filter(
        item =>
          !f.groupId ||
          item.groupId ===
            f.groupId
      )
  );
}

function contractorEligible(
  profile,
  area
) {
  const value =
    Math.max(
      1,
      Number(area) ||
      1
    );

  return (
    value >=
      profile.minArea *
      0.75 &&
    value <=
      profile.maxArea *
      1.25
  );
}

function quoteContractors(
  metrics,
  shopId,
  seed
) {
  if (!metrics) {
    return [];
  }

  const area =
    Number(
      metrics.totalArea
    ) ||
    60;

  let pool =
    CONTRACTOR_PROFILES
      .filter(
        item =>
          contractorEligible(
            item,
            area
          )
      );

  if (
    pool.length <
    3
  ) {
    pool =
      CONTRACTOR_PROFILES
        .slice();
  }

  const scored =
    pool
      .map(
        (
          profile,
          index
        ) => ({
          profile,
          score:
            unitFloat(
              String(seed) +
              ':' +
              shopId,
              profile.id +
              ':' +
              index
            )
        })
      )
      .sort(
        (
          a,
          b
        ) =>
          a.score -
          b.score
      )
      .slice(
        0,
        3
      );

  return scored
    .map(
      (
        item,
        index
      ) => {
        const profile =
          item.profile;

        const priceNoise =
          0.97 +
          unitFloat(
            shopId,
            profile.id +
            ':price:' +
            seed
          ) *
          0.06;

        const speedNoise =
          0.96 +
          unitFloat(
            shopId,
            profile.id +
            ':speed:' +
            seed
          ) *
          0.08;

        const reliabilityNoise =
          Math.round(
            (
              unitFloat(
                shopId,
                profile.id +
                ':reliability:' +
                seed
              ) -
              0.5
            ) *
            4
          );

        const qualityNoise =
          Math.round(
            (
              unitFloat(
                shopId,
                profile.id +
                ':quality:' +
                seed
              ) -
              0.5
            ) *
            4
          );

        return {
          id:
            'contractor_' +
            index,
          profileId:
            profile.id,
          name:
            profile.name,
          tier:
            profile.tier,
          specialty:
            profile.specialty,
          price:
            Math.max(
              1,
              Math.round(
                Number(
                  metrics.totalCost
                ) *
                profile.priceFactor *
                priceNoise
              )
            ),
          days:
            Math.max(
              4,
              Math.round(
                Number(
                  metrics.buildDays
                ) *
                profile.speedFactor *
                speedNoise
              )
            ),
          reliability:
            Math.max(
              60,
              Math.min(
                99,
                profile.reliability +
                reliabilityNoise
              )
            ),
          quality:
            Math.max(
              60,
              Math.min(
                99,
                profile.quality +
                qualityNoise
              )
            )
        };
      }
    )
    .sort(
      (
        a,
        b
      ) =>
        a.price -
        b.price
    );
}

function estimateConstructionBreakdown(
  metrics
) {
  if (!metrics) {
    return [];
  }

  const totalArea =
    Math.max(
      1,
      Number(
        metrics.totalArea
      ) ||
      1
    );

  const kitchenArea =
    Math.max(
      0,
      Number(
        metrics.kitchenArea
      ) ||
      0
    );

  return CONSTRUCTION_PACKAGES
    .map(
      item => {
        let areaFactor =
          1;

        if (
          item.category ===
            'kitchen'
        ) {
          areaFactor =
            Math.max(
              0.16,
              kitchenArea /
              totalArea
            );
        }

        if (
          item.category ===
            'frontage'
        ) {
          areaFactor =
            0.25;
        }

        if (
          item.category ===
            'handover'
        ) {
          areaFactor =
            0.5;
        }

        const referenceCost =
          Math.round(
            totalArea *
            item.baseCostPerSqm *
            areaFactor
          );

        const referenceDays =
          Number(
            Math.max(
              0.2,
              (
                totalArea /
                100
              ) *
              item.daysPer100Sqm *
              Math.max(
                0.35,
                areaFactor
              )
            )
              .toFixed(
                1
              )
          );

        return {
          ...clone(item),
          referenceCost,
          referenceDays
        };
      }
    );
}

function getStats() {
  return {
    version:VERSION,
    constructionPackages:
      CONSTRUCTION_PACKAGES.length,
    materials:
      MATERIAL_CATALOG.length,
    contractorProfiles:
      CONTRACTOR_PROFILES.length,
    hallStyles:
      renovationConfig
        .hallStyles
        .length,
    privateRoomStyles:
      renovationConfig
        .privateRoomStyles
        .length,
    materialGrades:
      renovationConfig
        .materialGrades
        .length,
    lightingLevels:
      renovationConfig
        .lightingLevels
        .length,
    decorItems:
      renovationConfig
        .decorItems
        .length,
    equipmentGroups:
      openingConfig
        .equipment
        .length,
    equipmentSkus:
      EQUIPMENT_SKUS.length,
    equipmentGrades:
      openingConfig
        .qualityGrades
        .length
  };
}

function validate() {
  const issues = [];

  function uniqueIds(
    list,
    label
  ) {
    const ids =
      list.map(
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
        label +
        ' ID存在重复'
      );
    }
  }

  uniqueIds(
    CONSTRUCTION_PACKAGES,
    '施工项目'
  );

  uniqueIds(
    MATERIAL_CATALOG,
    '材料'
  );

  uniqueIds(
    CONTRACTOR_PROFILES,
    '施工队'
  );

  uniqueIds(
    EQUIPMENT_SKUS,
    '设备型号'
  );

  const groupIds =
    new Set(
      openingConfig
        .equipment
        .map(
          item =>
            item.id
        )
    );

  for (
    const sku
    of EQUIPMENT_SKUS
  ) {
    if (
      !groupIds.has(
        sku.groupId
      )
    ) {
      issues.push(
        '设备型号引用不存在功能组: ' +
        sku.id +
        ' -> ' +
        sku.groupId
      );
    }
  }

  const gradeIds =
    new Set(
      renovationConfig
        .materialGrades
        .map(
          item =>
            item.id
        )
    );

  for (
    const material
    of MATERIAL_CATALOG
  ) {
    if (
      !gradeIds.has(
        material.grade
      )
    ) {
      issues.push(
        '材料引用不存在装修等级: ' +
        material.id +
        ' -> ' +
        material.grade
      );
    }
  }

  const stats =
    getStats();

  const expected = {
    constructionPackages:12,
    materials:24,
    contractorProfiles:12,
    hallStyles:6,
    privateRoomStyles:5,
    materialGrades:4,
    lightingLevels:4,
    decorItems:4,
    equipmentGroups:5,
    equipmentSkus:25,
    equipmentGrades:3
  };

  for (
    const key
    of Object.keys(
      expected
    )
  ) {
    if (
      stats[
        key
      ] !==
      expected[
        key
      ]
    ) {
      issues.push(
        key +
        ' 数量异常，期望=' +
        expected[
          key
        ] +
        ' 实际=' +
        stats[
          key
        ]
      );
    }
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
  renovationConfig,
  openingConfig,
  CONSTRUCTION_PACKAGES,
  MATERIAL_CATALOG,
  CONTRACTOR_PROFILES,
  EQUIPMENT_SKUS,
  getConstructionPackages,
  getMaterials,
  getContractorProfiles,
  getEquipmentGroups,
  getEquipmentGrades,
  getEquipmentSkus,
  quoteContractors,
  estimateConstructionBreakdown,
  getStats,
  validate
};
