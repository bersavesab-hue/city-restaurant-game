'use strict';

/**
 * 图集运行时切片器。
 * 不需要把所有小组件拆成独立文件；也可以只加载一张 atlas，
 * 再按 atlas_regions.json 中的坐标直接 drawImage 裁切绘制。
 */

const resourceManager =
  require('../core/resourceManager.js');

const REGIONS = {
  ui_components_v1: {
    path:
      'assets/images/generated/atlases/ui_components_v1.png',

    regions: {
      marker_red: [20,65,145,235],
      marker_orange: [140,65,265,235],
      marker_blue: [255,65,380,235],
      marker_green: [365,65,490,235],
      marker_purple: [480,65,605,235],
      marker_gold: [590,65,710,235],
      badge_hot: [750,285,955,355],
      badge_new: [950,285,1110,355],
      badge_recommend: [750,350,865,430],
      badge_renovating: [850,350,995,430],
      badge_signed: [975,350,1115,430]
    }
  },

  renovation_assets_v1: {
    path:
      'assets/images/generated/atlases/renovation_assets_v1.png',

    regions: {
      table_2: [10,0,180,180],
      table_4: [175,0,365,180],
      table_6: [355,0,555,180],
      table_8: [545,0,770,180],
      chair: [850,15,980,185],
      chair_leather: [965,15,1122,185],
      bar_counter: [15,210,435,375],
      cashier_counter: [445,210,770,375],
      waiting_sofa: [775,210,1122,375],
      stove: [10,385,175,585],
      prep_table: [170,385,340,585],
      sink: [325,385,480,585],
      fridge: [455,380,620,585],
      food_shelf: [605,385,790,585],
      dish_shelf: [780,385,955,585],
      storage_shelf: [940,385,1122,585]
    }
  }
};

function normalizeRegion(
  region
) {
  return {
    sx:
      region[0],

    sy:
      region[1],

    sw:
      region[2] -
      region[0],

    sh:
      region[3] -
      region[1]
  };
}

function loadAtlas(
  atlasId
) {
  const atlas =
    REGIONS[
      atlasId
    ];

  if (!atlas) {
    return Promise.reject(
      new Error(
        '未知图集：' +
          atlasId
      )
    );
  }

  return resourceManager
    .loadImage(
      'atlas:' +
        atlasId,
      atlas.path,
      'atlas:' +
        atlasId
    );
}

function draw(
  ctx,
  atlasId,
  regionId,
  x,
  y,
  w,
  h
) {
  const atlas =
    REGIONS[
      atlasId
    ];

  if (
    !atlas ||
    !atlas.regions[
      regionId
    ]
  ) {
    return false;
  }

  const image =
    resourceManager
      .getImage(
        'atlas:' +
          atlasId
      );

  if (!image) {
    return false;
  }

  const r =
    normalizeRegion(
      atlas.regions[
        regionId
      ]
    );

  ctx.drawImage(
    image,
    r.sx,
    r.sy,
    r.sw,
    r.sh,
    x,
    y,
    w,
    h
  );

  return true;
}

module.exports = {
  REGIONS,
  loadAtlas,
  draw,
  normalizeRegion
};
