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
    {
      key: 'visual_table_2',
      path: 'assets/images/runtime/renovation/table_2.webp'
    },
    {
      key: 'visual_table_4',
      path: 'assets/images/runtime/renovation/table_4.webp'
    },
    {
      key: 'visual_table_6',
      path: 'assets/images/runtime/renovation/table_6.webp'
    },
    {
      key: 'visual_table_8',
      path: 'assets/images/runtime/renovation/table_8.webp'
    },
    {
      key: 'visual_register',
      path: 'assets/images/runtime/renovation/register.webp'
    },
    {
      key: 'visual_stove',
      path: 'assets/images/runtime/renovation/stove.webp'
    },
    {
      key: 'visual_fridge',
      path: 'assets/images/runtime/renovation/fridge.webp'
    },
    {
      key: 'visual_plant',
      path: 'assets/images/runtime/renovation/plant.webp'
    },
    {
      key: 'visual_light',
      path: 'assets/images/runtime/renovation/light.webp'
    },
    {
      key: 'visual_divider',
      path: 'assets/images/runtime/renovation/divider.webp'
    },
    {
      key: 'visual_style_wood',
      path: 'assets/images/runtime/renovation/style_wood.webp'
    },
    {
      key: 'visual_style_chinese',
      path: 'assets/images/runtime/renovation/style_chinese.webp'
    },
    {
      key: 'visual_style_modern',
      path: 'assets/images/runtime/renovation/style_modern.webp'
    },
    {
      key: 'visual_style_night',
      path: 'assets/images/runtime/renovation/style_night.webp'
    },
    {
      key: 'visual_style_business',
      path: 'assets/images/runtime/renovation/style_business.webp'
    }
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

function loadGroup(
  name
) {
  if (
    !GROUPS[name]
  ) {
    return Promise.resolve(
      []
    );
  }

  if (
    loadingGroups.has(
      name
    )
  ) {
    return loadingGroups.get(
      name
    );
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
            '视觉资源加载失败：' +
            name,
            error
          );

          requestRender();

          return [];
        }
      )
      .finally(
        () => {
          loadingGroups.delete(
            name
          );
        }
      );

  loadingGroups.set(
    name,
    promise
  );

  return promise;
}

function get(
  key
) {
  return resourceManager
    .getImage(
      key
    );
}

function releaseGroup(
  name
) {
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
