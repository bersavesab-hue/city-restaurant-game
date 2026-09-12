'use strict';

const runtime =
  globalThis.GameRuntime || {};

const resourceManager =
  require('../core/resourceManager.js');

const GROUPS = {
  store: [
    {
      key: 'visual_storefront_hero',
      path: 'assets/images/runtime/store/storefront_hero.webp'
    }
  ],

  district: [
    {
      key: 'visual_district_banner',
      path: 'assets/images/runtime/district/district_banner.webp'
    }
  ],

  renovation: [
    { key: 'visual_table_2', path: 'assets/images/runtime/renovation/table_2.webp' },
    { key: 'visual_table_4', path: 'assets/images/runtime/renovation/table_4.webp' },
    { key: 'visual_table_6', path: 'assets/images/runtime/renovation/table_6.webp' },
    { key: 'visual_table_8', path: 'assets/images/runtime/renovation/table_8.webp' },
    { key: 'visual_register', path: 'assets/images/runtime/renovation/register.webp' },
    { key: 'visual_stove', path: 'assets/images/runtime/renovation/stove.webp' },
    { key: 'visual_fridge', path: 'assets/images/runtime/renovation/fridge.webp' },
    { key: 'visual_plant', path: 'assets/images/runtime/renovation/plant.webp' },
    { key: 'visual_light', path: 'assets/images/runtime/renovation/light.webp' },
    { key: 'visual_divider', path: 'assets/images/runtime/renovation/divider.webp' },
    { key: 'visual_style_wood', path: 'assets/images/runtime/renovation/style_wood.webp' },
    { key: 'visual_style_chinese', path: 'assets/images/runtime/renovation/style_chinese.webp' },
    { key: 'visual_style_modern', path: 'assets/images/runtime/renovation/style_modern.webp' },
    { key: 'visual_style_night', path: 'assets/images/runtime/renovation/style_night.webp' },
    { key: 'visual_style_business', path: 'assets/images/runtime/renovation/style_business.webp' }
  ],

  premiumStore: [
    { key: 'premium_store_hero', path: 'assets/images/premium/store/store_hero.jpg' },
    { key: 'premium_room_1', path: 'assets/images/premium/store/room_1.jpg' },
    { key: 'premium_room_2', path: 'assets/images/premium/store/room_2.jpg' },
    { key: 'premium_room_3', path: 'assets/images/premium/store/room_3.jpg' },
    { key: 'premium_advice_renovation', path: 'assets/images/premium/store/advice_renovation.jpg' },
    { key: 'premium_advice_permit', path: 'assets/images/premium/store/advice_permit.jpg' },
    { key: 'premium_advice_staff', path: 'assets/images/premium/store/advice_staff.jpg' },
    { key: 'premium_explore_banner', path: 'assets/images/premium/store/explore_banner.jpg' }
  ],

  premiumDistrict: [
    { key: 'premium_district_header', path: 'assets/images/premium/district/header_city.jpg' },
    { key: 'premium_avatar_1', path: 'assets/images/premium/district/avatar_1.jpg' },
    { key: 'premium_avatar_2', path: 'assets/images/premium/district/avatar_2.jpg' },
    { key: 'premium_avatar_3', path: 'assets/images/premium/district/avatar_3.jpg' },
    { key: 'premium_avatar_4', path: 'assets/images/premium/district/avatar_4.jpg' },
    { key: 'premium_demand_ambience', path: 'assets/images/premium/district/demand_ambience.jpg' }
  ],

  premiumRenovation: [
    { key: 'premium_reno_header', path: 'assets/images/premium/renovation/header_interior.jpg' },
    { key: 'premium_template_1', path: 'assets/images/premium/renovation/template_1.jpg' },
    { key: 'premium_template_2', path: 'assets/images/premium/renovation/template_2.jpg' },
    { key: 'premium_template_3', path: 'assets/images/premium/renovation/template_3.jpg' },
    { key: 'premium_table_2', path: 'assets/images/premium/renovation/table2.jpg' },
    { key: 'premium_table_4', path: 'assets/images/premium/renovation/table4.jpg' },
    { key: 'premium_table_6', path: 'assets/images/premium/renovation/table6.jpg' },
    { key: 'premium_table_8', path: 'assets/images/premium/renovation/table8.jpg' },
    { key: 'premium_floor_texture', path: 'assets/images/premium/renovation/floor_texture.jpg' }
  ]
};

const loadingGroups =
  new Map();

function requestRender() {
  if (
    runtime &&
    typeof runtime.requestRender ===
      'function'
  ) {
    runtime.requestRender();
  }
}

function loadGroup(name) {
  if (!GROUPS[name]) {
    return Promise.resolve([]);
  }

  if (loadingGroups.has(name)) {
    return loadingGroups.get(name);
  }

  const promise =
    resourceManager
      .loadImages(
        GROUPS[name],
        'visual:' + name
      )
      .then(
        images => {
          requestRender();
          return images;
        }
      )
      .catch(
        error => {
          console.warn(
            '视觉资源加载失败：' + name,
            error
          );

          requestRender();
          return [];
        }
      )
      .finally(
        () => {
          loadingGroups.delete(name);
        }
      );

  loadingGroups.set(
    name,
    promise
  );

  return promise;
}

function get(key) {
  return resourceManager
    .getImage(key);
}

function releaseGroup(name) {
  resourceManager
    .releaseGroup(
      'visual:' + name
    );
}

module.exports = {
  GROUPS,
  loadGroup,
  get,
  releaseGroup
};
