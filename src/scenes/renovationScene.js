'use strict';

// V17_RENOVATION_UI_REWRITE
// V45_LIBRARY_RENOVATION_PHASE1
// V46_RENOVATION_PLAYABILITY_UI
// V47_RENOVATION_REFERENCE_REBUILD
// V48_DYNAMIC_FLOOR_GEOMETRY_UI
// V0849_AREA_TRUTH_RENOVATION_UI
// V0849_HOTFIX_RENOVATION_INTERACTION_LAYOUT
//
// Main renovation page rebuilt around the user's final reference:
// header -> template strip -> large coherent floor plan -> table/metrics -> CTA.
//
// V45 compatibility tokens:
// 'v45-renovation-library' v45_style_natural v45_style_chinese v45_style_modern
// v45_style_night v45_style_business v45_table_2 v45_table_4 v45_table_6 v45_table_8
// v45_stove v45_fridge v45_layout_kitchen v45_layout_dining v45_layout_private_medium
// 'visual_table_'

// Legacy compatibility tokens intentionally retained:
// premium_reno_header premium_floor_texture premium_template_1 premium_template_2
// premium_template_3 visual_stove visual_fridge visual_table_8
// 'template:save' 'template:save-as' 'shop:rename' 'room:add' 'room:rename:'
// 'room:seats:' 'room:style:' 'room:remove:' 'template:apply:'
// 'template:rename:' 'template:delete:' 'history:undo' 'history:redo'
// 'construction:start'

const runtime =
  globalThis.GameRuntime;

if (!runtime) {
  throw new Error(
    'RenovationScene：GameRuntime 未初始化'
  );
}

const api =
  runtime.api || {};

const gameState =
  require('../core/gameState.js');

const saveSystem =
  require('../core/saveSystem.js');

const sceneManager =
  require('../core/sceneManager.js');

const renovationSystem =
  require('../renovation/renovationSystem.js');

const renovationConfig =
  require('../renovation/renovationConfig.js');

const floorGeometrySystem =
  require('../renovation/floorGeometrySystem.js');

const customizationSystem =
  require('../ui/customizationSystem.js');

const textInput =
  require('../ui/textInput.js');

const visualAssetSystem =
  require('../ui/visualAssetSystem.js');

const resourceManager =
  require('../core/resourceManager.js');

const ui =
  require('../ui/premiumUi.js');

const DESIGN_W =
  390;

const COLORS = {
  navy: '#063B5A',
  navyDeep: '#032B43',
  paper: '#F7F0E4',
  panel: '#FFFDF7',
  panelWarm: '#FFF8E9',
  text: '#18384C',
  muted: '#718187',
  gold: '#F7B925',
  goldDeep: '#D99610',
  orange: '#E98125',
  red: '#D6534A',
  green: '#20A66B',
  blue: '#2D91BD',
  purple: '#7553C8',
  white: '#FFFFFF',
  line: '#DDD1BF',
  wall: '#3E3A35',
  tile: '#D7C4A9',
  kitchen: '#9D9B91',
  storage: '#B29E7C',
  dining: '#D8B98A',
  service: '#C5A777',
  room: '#C99E61'
};

const V45_HALL_STYLE_VISUAL = {
  simple: 'reno_style_modern',
  wood: 'reno_style_natural',
  modern_cn: 'reno_style_chinese',
  industrial: 'reno_style_modern',
  retro: 'reno_style_night',
  premium: 'reno_style_business'
};

const RENO_ASSETS = [
  ['reno_store_hero', 'assets/images/library_store/store/storefront_hero_clean.png'],

  ['reno_style_natural', 'assets/images/library_store/renovation/styles/natural.png'],
  ['reno_style_chinese', 'assets/images/library_store/renovation/styles/chinese.png'],
  ['reno_style_modern', 'assets/images/library_store/renovation/styles/modern.png'],
  ['reno_style_night', 'assets/images/library_store/renovation/styles/night_market.png'],
  ['reno_style_business', 'assets/images/library_store/renovation/styles/business.png'],

  ['reno_table_2', 'assets/images/library_store/renovation/furniture/table_2.png'],
  ['reno_table_4', 'assets/images/library_store/renovation/furniture/table_4.png'],
  ['reno_table_6', 'assets/images/library_store/renovation/furniture/table_6_rect.png'],
  ['reno_table_8', 'assets/images/library_store/renovation/furniture/table_6_long.png'],

  ['reno_stove', 'assets/images/library_store/renovation/furniture/stove.png'],
  ['reno_prep', 'assets/images/library_store/renovation/furniture/prep_counter.png'],
  ['reno_sink', 'assets/images/library_store/renovation/furniture/sink.png'],
  ['reno_fridge', 'assets/images/library_store/renovation/furniture/fridge.png'],
  ['reno_food_shelf', 'assets/images/library_store/renovation/furniture/food_shelf.png'],
  ['reno_storage_shelf', 'assets/images/library_store/renovation/furniture/storage_shelf.png'],
  ['reno_bar', 'assets/images/library_store/renovation/furniture/bar_counter.png'],
  ['reno_cashier', 'assets/images/library_store/renovation/furniture/cashier.png'],
  ['reno_sofa', 'assets/images/library_store/renovation/furniture/waiting_sofa.png'],

  ['reno_plant_1', 'assets/images/library_store/renovation/furniture/plant_1.png'],
  ['reno_plant_2', 'assets/images/library_store/renovation/furniture/plant_2.png'],
  ['reno_plant_3', 'assets/images/library_store/renovation/furniture/plant_3.png'],
  ['reno_pendant', 'assets/images/library_store/renovation/furniture/pendant_gold.png'],
  ['reno_screen', 'assets/images/library_store/renovation/furniture/screen_round.png'],

  ['reno_room_small', 'assets/images/library_store/renovation/layouts/private_small.png'],
  ['reno_room_medium', 'assets/images/library_store/renovation/layouts/private_medium.png'],
  ['reno_room_large', 'assets/images/library_store/renovation/layouts/private_large.png'],
  ['reno_corridor', 'assets/images/library_store/renovation/layouts/corridor.png'],

  ['reno_advice', 'assets/images/library_store/store/advice_renovation.png'],

  ['reno_glossy_money', 'assets/images/v44_glossy/money.png'],
  ['reno_glossy_star', 'assets/images/v44_glossy/star.png'],
  ['reno_glossy_target', 'assets/images/v44_glossy/target.png']
];

// Historical names remain available for V45/V17 compatibility.
const V45_RENO_RESOURCES =
  RENO_ASSETS;

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

function money(value) {
  const n =
    Number(value) || 0;

  const sign =
    n < 0
      ? '-'
      : '';

  const abs =
    Math.abs(n);

  function trim(
    v,
    decimals
  ) {
    return Number(v)
      .toFixed(decimals)
      .replace(/\.0+$/, '')
      .replace(
        /(\.\d*?[1-9])0+$/,
        '$1'
      );
  }

  if (
    abs >=
    100000000
  ) {
    const v =
      abs /
      100000000;

    return (
      sign +
      '¥' +
      trim(
        v,
        v >= 100
          ? 0
          : v >= 10
            ? 1
            : 2
      ) +
      '亿'
    );
  }

  if (
    abs >=
    10000
  ) {
    const v =
      abs /
      10000;

    return (
      sign +
      '¥' +
      trim(
        v,
        v >= 100
          ? 0
          : v >= 10
            ? 1
            : 2
      ) +
      '万'
    );
  }

  return (
    sign +
    '¥' +
    Math.round(
      abs
    ).toLocaleString()
  );
}

class RenovationScene {
  constructor() {
    this.id =
      'renovation';

    this.shopId =
      null;

    this.page =
      'layout';

    this.viewH =
      780;

    this.navH =
      64;

    this.contentBottom =
      716;

    this.buttons =
      [];

    this.previewMode =
      false;

    this.confirmingConstruction =
      false;

    this.areaDrag =
      null;
  }

  enter(payload) {
    const data =
      payload || {};

    if (data.shopId) {
      this.shopId =
        data.shopId;
    }

    const business =
      gameState.getBusiness();

    if (
      !this.shopId &&
      business.currentShopId
    ) {
      this.shopId =
        business.currentShopId;
    }

    renovationSystem
      .ensurePlan(
        this.shopId
      );

    this.page =
      [
        'layout',
        'zones',
        'furniture',
        'style',
        'rooms',
        'templates',
        'contractors'
      ].includes(
        data.page
      )
        ? data.page
        : 'layout';

    this.previewMode =
      false;

    this.confirmingConstruction =
      false;

    this.areaDrag =
      null;

    for (
      let i = 0;
      i <
      RENO_ASSETS.length;
      i++
    ) {
      const item =
        RENO_ASSETS[i];

      resourceManager
        .loadImage(
          item[0],
          item[1],
          'v47-renovation-reference'
        )
        .then(
          () => {
            if (
              runtime &&
              typeof runtime
                .requestRender ===
                'function'
            ) {
              runtime
                .requestRender();
            }
          }
        )
        .catch(
          () => {}
        );
    }

    // Legacy visual groups remain loaded as safe fallback.
    visualAssetSystem
      .loadGroup(
        'renovation'
      );

    visualAssetSystem
      .loadGroup(
        'premiumRenovation'
      );
  }

  exit() {
    this.buttons =
      [];
  }

  update() {
    if (this.shopId) {
      renovationSystem
        .updateShop(
          this.shopId
        );
    }
  }

  getLayout() {
    let height =
      780;

    if (
      api &&
      typeof api
        .getSystemInfoSync ===
        'function'
    ) {
      const info =
        api
          .getSystemInfoSync();

      const w =
        Math.max(
          1,
          Number(
            info.windowWidth
          ) ||
          DESIGN_W
        );

      const h =
        Math.max(
          1,
          Number(
            info.windowHeight
          ) ||
          780
        );

      height =
        h /
        (
          w /
          DESIGN_W
        );
    }

    this.viewH =
      height;

    this.navH =
      height < 740
        ? 60
        : 64;

    this.contentBottom =
      height -
      this.navH;
  }

  getShop() {
    const business =
      gameState.getBusiness();

    return (
      business.shops.find(
        item =>
          item.id ===
          this.shopId
      ) ||
      null
    );
  }

  getPlan() {
    return renovationSystem
      .ensurePlan(
        this.shopId
      );
  }

  getMetrics() {
    return renovationSystem
      .getMetrics(
        this.shopId
      );
  }

  getName(
    list,
    id
  ) {
    const item =
      list.find(
        value =>
          value.id ===
          id
      );

    return item
      ? item.name
      : id;
  }

  showToast(title) {
    if (
      api &&
      typeof api
        .showToast ===
        'function'
    ) {
      api.showToast({
        title,
        icon: 'none'
      });
    }
  }

  text(
    ctx,
    value,
    x,
    y,
    size,
    color,
    weight,
    align
  ) {
    ctx.save();

    const rawWeight =
      String(
        weight || '600'
      );

    const finalWeight =
      rawWeight === '800'
        ? '900'
        : rawWeight === '700'
          ? '800'
          : rawWeight;

    ctx.fillStyle =
      color ||
      COLORS.text;

    ctx.font =
      finalWeight +
      ' ' +
      Math.max(
        4.8,
        Number(size) ||
        5.5
      ) +
      'px "Noto Sans SC","Microsoft YaHei",sans-serif';

    ctx.textAlign =
      align ||
      'left';

    ctx.textBaseline =
      'middle';

    ctx.fillText(
      String(
        value == null
          ? ''
          : value
      ),
      x,
      y
    );

    ctx.restore();
  }

  addButton(
    id,
    x,
    y,
    w,
    h
  ) {
    const hitW =
      Math.max(
        36,
        w
      );

    const hitH =
      Math.max(
        36,
        h
      );

    this.buttons.push({
      id,
      x:
        x -
        (
          hitW -
          w
        ) /
        2,
      y:
        y -
        (
          hitH -
          h
        ) /
        2,
      w: hitW,
      h: hitH
    });
  }

  hitButton(
    x,
    y
  ) {
    for (
      let i =
        this.buttons.length - 1;
      i >= 0;
      i--
    ) {
      const b =
        this.buttons[i];

      if (
        x >= b.x &&
        x <= b.x + b.w &&
        y >= b.y &&
        y <= b.y + b.h
      ) {
        return b;
      }
    }

    return null;
  }

  roundedPath(
    ctx,
    x,
    y,
    w,
    h,
    r
  ) {
    const radius =
      Math.min(
        r,
        w / 2,
        h / 2
      );

    ctx.beginPath();
    ctx.moveTo(
      x + radius,
      y
    );
    ctx.arcTo(
      x + w,
      y,
      x + w,
      y + h,
      radius
    );
    ctx.arcTo(
      x + w,
      y + h,
      x,
      y + h,
      radius
    );
    ctx.arcTo(
      x,
      y + h,
      x,
      y,
      radius
    );
    ctx.arcTo(
      x,
      y,
      x + w,
      y,
      radius
    );
    ctx.closePath();
  }

  drawImageCover(
    ctx,
    key,
    x,
    y,
    w,
    h,
    radius,
    overlay
  ) {
    const image =
      resourceManager
        .getImage(key);

    if (!image) {
      return false;
    }

    ui.coverImage(
      ctx,
      image,
      x,
      y,
      w,
      h,
      radius || 0,
      overlay || null
    );

    return true;
  }

  drawImageContain(
    ctx,
    key,
    x,
    y,
    w,
    h,
    alpha
  ) {
    const image =
      resourceManager
        .getImage(key);

    if (!image) {
      return false;
    }

    const iw =
      Number(
        image.width
      ) || w;

    const ih =
      Number(
        image.height
      ) || h;

    const scale =
      Math.min(
        w / iw,
        h / ih
      );

    const dw =
      iw * scale;

    const dh =
      ih * scale;

    ctx.save();

    if (
      Number.isFinite(
        Number(alpha)
      )
    ) {
      ctx.globalAlpha =
        alpha;
    }

    ctx.drawImage(
      image,
      x +
        (
          w - dw
        ) /
        2,
      y +
        (
          h - dh
        ) /
        2,
      dw,
      dh
    );

    ctx.restore();

    return true;
  }

  drawPill(
    ctx,
    label,
    x,
    y,
    w,
    h,
    fill,
    color
  ) {
    ui.card(
      ctx,
      x,
      y,
      w,
      h,
      {
        radius:
          h / 2,
        fill,
        stroke: false,
        shadow: false
      }
    );

    this.text(
      ctx,
      label,
      x + w / 2,
      y + h / 2,
      5.2,
      color,
      '800',
      'center'
    );
  }

  drawHeader(
    ctx,
    shop
  ) {
    const h =
      88;

    const hero =
      resourceManager
        .getImage(
          'reno_store_hero'
        );

    if (hero) {
      ui.coverImage(
        ctx,
        hero,
        0,
        0,
        DESIGN_W,
        h,
        0,
        null
      );
    } else {
      ctx.fillStyle =
        COLORS.navyDeep;
      ctx.fillRect(
        0,
        0,
        DESIGN_W,
        h
      );
    }

    const grad =
      ctx.createLinearGradient(
        0,
        0,
        DESIGN_W,
        0
      );

    grad.addColorStop(
      0,
      'rgba(3,34,48,0.86)'
    );

    grad.addColorStop(
      0.64,
      'rgba(3,34,48,0.48)'
    );

    grad.addColorStop(
      1,
      'rgba(3,34,48,0.74)'
    );

    ctx.fillStyle =
      grad;

    ctx.fillRect(
      0,
      0,
      DESIGN_W,
      h
    );

    ui.card(
      ctx,
      8,
      14,
      36,
      36,
      {
        radius: 11,
        fill:
          'rgba(4,55,78,0.91)',
        stroke:
          'rgba(255,255,255,0.32)',
        shadow: false
      }
    );

    this.text(
      ctx,
      '‹',
      26,
      32,
      19,
      '#FFE57C',
      '800',
      'center'
    );

    this.addButton(
      'back',
      4,
      10,
      44,
      44
    );

    ui.card(
      ctx,
      51,
      10,
      50,
      50,
      {
        radius: 9,
        fill:
          'rgba(255,255,255,0.92)',
        stroke:
          '#F0C757',
        shadow: false
      }
    );

    const thumb =
      resourceManager
        .getImage(
          'reno_store_hero'
        );

    if (thumb) {
      ui.coverImage(
        ctx,
        thumb,
        54,
        13,
        44,
        44,
        7,
        null
      );
    }

    this.text(
      ctx,
      shop.name ||
        '我的酒楼',
      109,
      19,
      13.5,
      COLORS.white,
      '800'
    );

    this.text(
      ctx,
      '位置 · ' +
        (
          shop.address ||
          '当前门店'
        ),
      109,
      40,
      5.4,
      '#E8F0F2',
      '600'
    );

    this.text(
      ctx,
      '用心打造，让美味更有温度',
      109,
      61,
      5.7,
      '#FFE19A',
      '700'
    );

    this.addButton(
      'shop:rename',
      104,
      7,
      176,
      58
    );

    ui.card(
      ctx,
      300,
      10,
      82,
      29,
      {
        radius: 13,
        fill:
          COLORS.gold,
        stroke:
          '#FFE19A',
        shadow: false
      }
    );

    this.text(
      ctx,
      '保存模板',
      341,
      24.5,
      6.3,
      COLORS.text,
      '800',
      'center'
    );

    this.addButton(
      'template:save',
      294,
      5,
      92,
      36
    );

    ui.card(
      ctx,
      300,
      45,
      82,
      27,
      {
        radius: 13,
        fill:
          '#FFFDF7',
        stroke:
          '#DED0B9',
        shadow: false
      }
    );

    this.text(
      ctx,
      '另存模板',
      341,
      58.5,
      6.0,
      COLORS.navy,
      '800',
      'center'
    );

    this.addButton(
      'template:save-as',
      294,
      42,
      92,
      36
    );
  }

  drawTemplateStrip(
    ctx,
    plan
  ) {
    const y =
      94;

    const h =
      99;

    ui.card(
      ctx,
      7,
      y,
      376,
      h,
      {
        radius: 14,
        fill:
          COLORS.panel,
        stroke:
          COLORS.line,
        shadow: false
      }
    );

    this.text(
      ctx,
      '装修模板',
      18,
      y + 16,
      9.2,
      COLORS.text,
      '800'
    );

    this.text(
      ctx,
      '选择心仪风格，或保存专属模板',
      82,
      y + 16,
      5.0,
      COLORS.muted,
      '600'
    );

    this.text(
      ctx,
      '模板管理 ›',
      371,
      y + 16,
      5.1,
      COLORS.navy,
      '800',
      'right'
    );

    this.addButton(
      'page:templates',
      310,
      y,
      68,
      25
    );

    const presets = [
      {
        id: 'wood',
        label: '原木风',
        key: 'reno_style_natural'
      },
      {
        id: 'modern_cn',
        label: '新中式',
        key: 'reno_style_chinese'
      },
      {
        id: 'premium',
        label: '商务雅间',
        key: 'reno_style_business'
      }
    ];

    for (
      let i = 0;
      i < 4;
      i++
    ) {
      const x =
        14 +
        i * 92;

      const cardY =
        y + 30;

      const cardW =
        84;

      const cardH =
        61;

      const selected =
        i < 3 &&
        plan.hallStyle ===
          presets[i].id;

      ui.card(
        ctx,
        x,
        cardY,
        cardW,
        cardH,
        {
          radius: 9,
          fill:
            '#FFF9EF',
          stroke:
            selected
              ? '#F0B619'
              : '#E1D7C8',
          lineWidth:
            selected
              ? 2
              : 1,
          shadow: false
        }
      );

      if (i < 3) {
        this.drawImageCover(
          ctx,
          presets[i].key,
          x + 3,
          cardY + 3,
          cardW - 6,
          40,
          7,
          null
        );

        if (selected) {
          this.drawPill(
            ctx,
            '✓',
            x + 62,
            cardY + 5,
            17,
            17,
            '#FFD33F',
            COLORS.text
          );
        }

        this.text(
          ctx,
          presets[i].label,
          x + 7,
          cardY + 51,
          5.3,
          COLORS.text,
          '800'
        );

        this.addButton(
          'builtin:style:' +
            presets[i].id,
          x,
          cardY,
          cardW,
          cardH
        );
      } else {
        this.text(
          ctx,
          '+',
          x + cardW / 2,
          cardY + 24,
          18,
          '#778690',
          '600',
          'center'
        );

        this.text(
          ctx,
          '新建模板',
          x + cardW / 2,
          cardY + 47,
          5.6,
          COLORS.navy,
          '800',
          'center'
        );

        this.addButton(
          'template:save-as',
          x,
          cardY,
          cardW,
          cardH
        );
      }
    }
  }

  getMainGeometry() {
    const y =
      this.viewH < 700
        ? 94
        : 200;

    const footerH =
      49;

    const lowerH =
      clamp(
        (
          this.contentBottom -
          y
        ) *
        0.23,
        112,
        132
      );

    const maxPlan =
      this.contentBottom -
      y -
      lowerH -
      footerH -
      22;

    const planH =
      clamp(
        maxPlan,
        this.viewH < 700
          ? 220
          : 276,
        348
      );

    const lowerY =
      y +
      planH +
      8;

    const footerY =
      this.contentBottom -
      footerH;

    return {
      y,
      planH,
      lowerY,
      lowerH:
        Math.max(
          86,
          Math.min(
            lowerH,
            footerY -
            lowerY -
            8
          )
        ),
      footerY,
      footerH
    };
  }

  drawZoneChip(
    ctx,
    label,
    x,
    y,
    w
  ) {
    ui.card(
      ctx,
      x,
      y,
      w,
      20,
      {
        radius: 7,
        fill:
          'rgba(42,45,43,0.74)',
        stroke:
          'rgba(255,255,255,0.18)',
        shadow: false
      }
    );

    this.text(
      ctx,
      label,
      x + w / 2,
      y + 10,
      5.9,
      COLORS.white,
      '800',
      'center'
    );
  }

  getGeometryFrame(
    geometry,
    x,
    y,
    w,
    h
  ) {
    const margin =
      7;

    const fitScale =
      Math.min(
        (
          w -
          margin * 2
        ) /
          Math.max(
            0.1,
            geometry.widthM
          ),
        (
          h -
          margin * 2
        ) /
          Math.max(
            0.1,
            geometry.depthM
          )
      );

    const areaM2 =
      Math.max(
        1,
        Number(
          geometry.areaM2
        ) ||
        (
          Number(geometry.widthM) *
          Number(geometry.depthM)
        ) ||
        1
      );

    // 不再让所有面积的房源都强制铺满画布。
    const areaVisualScale =
      clamp(
        Math.pow(
          areaM2 /
          320,
          0.26
        ),
        0.62,
        1
      );

    const scale =
      fitScale *
      areaVisualScale;

    const drawW =
      geometry.widthM *
      scale;

    const drawH =
      geometry.depthM *
      scale;

    return {
      scale,
      areaVisualScale,
      x:
        x +
        (
          w -
          drawW
        ) /
        2,
      y:
        y +
        (
          h -
          drawH
        ) /
        2,
      w:
        drawW,
      h:
        drawH
    };
  }

  mapGeometryPoint(
    frame,
    point
  ) {
    return {
      x:
        frame.x +
        point.x *
        frame.scale,

      y:
        frame.y +
        point.y *
        frame.scale
    };
  }

  geometryPath(
    ctx,
    geometry,
    frame
  ) {
    const polygon =
      geometry.polygon;

    if (
      !polygon ||
      !polygon.length
    ) {
      return;
    }

    const first =
      this.mapGeometryPoint(
        frame,
        polygon[0]
      );

    ctx.beginPath();

    ctx.moveTo(
      first.x,
      first.y
    );

    for (
      let i = 1;
      i <
      polygon.length;
      i++
    ) {
      const p =
        this.mapGeometryPoint(
          frame,
          polygon[i]
        );

      ctx.lineTo(
        p.x,
        p.y
      );
    }

    ctx.closePath();
  }

  drawGeometryObstacle(
    ctx,
    obstacle,
    frame
  ) {
    if (
      obstacle.type ===
      'column'
    ) {
      const p =
        this.mapGeometryPoint(
          frame,
          obstacle
        );

      ctx.save();

      ctx.fillStyle =
        '#6D665E';

      ctx.strokeStyle =
        '#4D4944';

      ctx.lineWidth =
        1;

      ctx.beginPath();

      ctx.arc(
        p.x,
        p.y,
        Math.max(
          2.5,
          obstacle.radius *
          frame.scale
        ),
        0,
        Math.PI * 2
      );

      ctx.fill();
      ctx.stroke();
      ctx.restore();

      return;
    }

    const x =
      frame.x +
      obstacle.x *
      frame.scale;

    const y =
      frame.y +
      obstacle.y *
      frame.scale;

    const w =
      obstacle.w *
      frame.scale;

    const h =
      obstacle.h *
      frame.scale;

    ui.card(
      ctx,
      x,
      y,
      w,
      h,
      {
        radius:
          3,
        fill:
          obstacle.type ===
            'stair'
            ? '#A79C8B'
            : '#D5D1C9',
        stroke:
          '#746E65',
        shadow: false
      }
    );

    this.text(
      ctx,
      obstacle.type ===
        'stair'
        ? '楼梯'
        : '卫生间',
      x + w / 2,
      y + h / 2,
      Math.max(
        4,
        Math.min(
          5.0,
          frame.scale *
          0.44
        )
      ),
      COLORS.text,
      '800',
      'center'
    );
  }

  drawGeometryShell(
    ctx,
    geometry,
    x,
    y,
    w,
    h
  ) {
    const frame =
      this.getGeometryFrame(
        geometry,
        x,
        y,
        w,
        h
      );

    ctx.save();

    this.geometryPath(
      ctx,
      geometry,
      frame
    );

    ctx.fillStyle =
      COLORS.tile;

    ctx.fill();

    ctx.clip();

    // 1m floor grid. Shape remains in real proportions.
    ctx.strokeStyle =
      'rgba(91,72,51,0.12)';

    ctx.lineWidth =
      0.65;

    const meter =
      Math.max(
        5,
        frame.scale
      );

    for (
      let gx =
        frame.x;
      gx <=
        frame.x +
        frame.w +
        0.1;
      gx += meter
    ) {
      ctx.beginPath();
      ctx.moveTo(
        gx,
        frame.y
      );
      ctx.lineTo(
        gx,
        frame.y +
        frame.h
      );
      ctx.stroke();
    }

    for (
      let gy =
        frame.y;
      gy <=
        frame.y +
        frame.h +
        0.1;
      gy += meter
    ) {
      ctx.beginPath();
      ctx.moveTo(
        frame.x,
        gy
      );
      ctx.lineTo(
        frame.x +
        frame.w,
        gy
      );
      ctx.stroke();
    }

    ctx.restore();

    ctx.save();

    this.geometryPath(
      ctx,
      geometry,
      frame
    );

    ctx.strokeStyle =
      COLORS.wall;

    ctx.lineWidth =
      2.4;

    ctx.stroke();

    ctx.restore();

    return frame;
  }

  drawFloorCanvas(
    ctx,
    metrics,
    floor,
    x,
    y,
    w,
    h
  ) {
    const shop =
      this.getShop();

    const floorGeometry =
      floor.floorGeometry ||
      floorGeometrySystem
        .getFloorGeometry(
          shop,
          floor.index,
          floor.area,
          metrics.plan
            .floors
            .length
        );

    const frame =
      this.drawGeometryShell(
        ctx,
        floorGeometry,
        x,
        y,
        w,
        h
      );

    const floorMetric =
      metrics.floors.find(
        item =>
          item.index ===
          floor.index
      ) || floor;

    const kitchenRatio =
      clamp(
        Number(
          floor.kitchenRatio
        ) || 0,
        0,
        1
      );

    const storageRatio =
      clamp(
        Number(
          floor.storageRatio
        ) || 0,
        0,
        1
      );

    const serviceRatio =
      clamp(
        Number(
          floor.serviceRatio
        ) || 0,
        0,
        1
      );

    const diningRatio =
      Math.max(
        0,
        1 -
        kitchenRatio -
        storageRatio -
        serviceRatio
      );

    const backRatio =
      clamp(
        kitchenRatio +
        storageRatio,
        0.01,
        0.88
      );

    const kitchenWidthRatio =
      clamp(
        kitchenRatio /
        backRatio,
        0.08,
        0.92
      );

    const lowerRatio =
      Math.max(
        0.01,
        serviceRatio +
        diningRatio
      );

    const serviceWidthRatio =
      clamp(
        serviceRatio /
        lowerRatio,
        0.05,
        0.72
      );

    // All zone fills are clipped by the actual property polygon.
    ctx.save();

    this.geometryPath(
      ctx,
      floorGeometry,
      frame
    );

    ctx.clip();

    ctx.fillStyle =
      'rgba(92,98,96,0.31)';

    ctx.fillRect(
      frame.x,
      frame.y,
      frame.w *
        kitchenWidthRatio,
      frame.h *
        backRatio
    );

    ctx.fillStyle =
      'rgba(133,112,80,0.28)';

    ctx.fillRect(
      frame.x +
        frame.w *
        kitchenWidthRatio,
      frame.y,
      frame.w *
        (
          1 -
          kitchenWidthRatio
        ),
      frame.h *
        backRatio
    );

    ctx.fillStyle =
      'rgba(171,136,88,0.22)';

    ctx.fillRect(
      frame.x,
      frame.y +
        frame.h *
        backRatio,
      frame.w *
        serviceWidthRatio,
      frame.h *
        (
          1 -
          backRatio
        )
    );

    ctx.fillStyle =
      'rgba(233,207,161,0.25)';

    ctx.fillRect(
      frame.x +
        frame.w *
        serviceWidthRatio,
      frame.y +
        frame.h *
        backRatio,
      frame.w *
        (
          1 -
          serviceWidthRatio
        ),
      frame.h *
        (
          1 -
          backRatio
        )
    );

    ctx.restore();

    // White dashed boundaries are draggable and are derived from the same
    // ratios used by the area calculator.
    ctx.save();

    ctx.strokeStyle =
      'rgba(255,255,255,0.92)';

    ctx.lineWidth = 2;
    ctx.setLineDash([5, 4]);

    ctx.beginPath();
    ctx.moveTo(
      frame.x,
      frame.y +
        frame.h *
        backRatio
    );
    ctx.lineTo(
      frame.x + frame.w,
      frame.y +
        frame.h *
        backRatio
    );
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(
      frame.x +
        frame.w *
        kitchenWidthRatio,
      frame.y
    );
    ctx.lineTo(
      frame.x +
        frame.w *
        kitchenWidthRatio,
      frame.y +
        frame.h *
        backRatio
    );
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(
      frame.x +
        frame.w *
        serviceWidthRatio,
      frame.y +
        frame.h *
        backRatio
    );
    ctx.lineTo(
      frame.x +
        frame.w *
        serviceWidthRatio,
      frame.y + frame.h
    );
    ctx.stroke();
    ctx.restore();

    const dragHandles = [
      {
        type: 'back',
        x: frame.x + frame.w * 0.5,
        y: frame.y + frame.h * backRatio
      },
      {
        type: 'kitchen-storage',
        x: frame.x + frame.w * kitchenWidthRatio,
        y: frame.y + frame.h * backRatio * 0.5
      },
      {
        type: 'service',
        x: frame.x + frame.w * serviceWidthRatio,
        y:
          frame.y +
          frame.h *
          (
            backRatio +
            (
              1 -
              backRatio
            ) *
            0.5
          )
      }
    ];

    for (
      let i = 0;
      i <
      dragHandles.length;
      i++
    ) {
      const handle =
        dragHandles[i];

      const active =
        this.areaDrag &&
        this.areaDrag.type ===
          handle.type &&
        this.areaDrag.floorIndex ===
          floor.index;

      ctx.save();
      ctx.beginPath();
      ctx.arc(
        handle.x,
        handle.y,
        active
          ? 7
          : 5.5,
        0,
        Math.PI * 2
      );
      ctx.fillStyle =
        active
          ? '#FFB300'
          : '#FFD95A';
      ctx.strokeStyle =
        '#FFFFFF';
      ctx.lineWidth =
        1.5;
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }

    this.floorCanvasInteraction = {
      frame,
      floorIndex: floor.index,
      backRatio,
      kitchenWidthRatio,
      serviceWidthRatio
    };

    const chipY =
      frame.y + 6;

    this.drawZoneChip(
      ctx,
      '后厨 ' +
        Number(
          floorMetric
            .kitchenArea ||
          floor.area *
            kitchenRatio
        ).toFixed(0) +
        '㎡',
      frame.x + 6,
      chipY,
      61
    );

    this.drawZoneChip(
      ctx,
      '仓储 ' +
        Number(
          floorMetric
            .storageArea ||
          floor.area *
            storageRatio
        ).toFixed(0) +
        '㎡',
      frame.x +
        frame.w *
        kitchenWidthRatio +
        3,
      chipY,
      59
    );

    this.drawZoneChip(
      ctx,
      '服务 ' +
        Number(
          floorMetric
            .serviceArea ||
          floor.area *
            serviceRatio
        ).toFixed(0) +
        '㎡',
      frame.x + 6,
      frame.y +
        frame.h *
        backRatio +
        5,
      59
    );

    this.drawZoneChip(
      ctx,
      '堂食 ' +
        Number(
          floorMetric
            .diningArea ||
          floor.area *
            diningRatio
        ).toFixed(0) +
        '㎡',
      frame.x +
        frame.w *
        serviceWidthRatio +
        4,
      frame.y +
        frame.h *
        backRatio +
        5,
      63
    );

    // Kitchen equipment is scaled by the room's real on-screen dimensions.
    const kitchenY =
      frame.y +
      frame.h *
      0.08;

    const kitchenH =
      Math.max(
        25,
        frame.h *
        0.22
      );

    this.drawImageContain(
      ctx,
      'reno_stove',
      frame.x +
        frame.w *
        0.04,
      kitchenY,
      frame.w *
        0.18,
      kitchenH,
      1
    );

    this.drawImageContain(
      ctx,
      'reno_prep',
      frame.x +
        frame.w *
        0.23,
      kitchenY,
      frame.w *
        0.18,
      kitchenH,
      1
    );

    this.drawImageContain(
      ctx,
      'reno_sink',
      frame.x +
        frame.w *
        0.43,
      kitchenY,
      frame.w *
        0.11,
      kitchenH,
      1
    );

    this.drawImageContain(
      ctx,
      'reno_fridge',
      frame.x +
        frame.w *
        0.55,
      kitchenY,
      frame.w *
        0.09,
      kitchenH,
      1
    );

    this.drawImageContain(
      ctx,
      'reno_storage_shelf',
      frame.x +
        frame.w *
        0.72,
      frame.y +
        frame.h *
        0.10,
      frame.w *
        0.19,
      frame.h *
        0.17,
      1
    );

    this.drawImageContain(
      ctx,
      'reno_cashier',
      frame.x +
        frame.w *
        0.03,
      frame.y +
        frame.h *
        0.55,
      frame.w *
        0.16,
      frame.h *
        0.14,
      1
    );

    // Obstacles are part of the real shell, not furniture.
    for (
      let i = 0;
      i <
      floorGeometry
        .obstacles
        .length;
      i++
    ) {
      this.drawGeometryObstacle(
        ctx,
        floorGeometry
          .obstacles[i],
        frame
      );
    }

    // Private rooms only appear when this property shape actually supports them.
    const rooms =
      floor.privateRooms ||
      [];

    const maxRoomDraw =
      floorGeometry
        .canPrivateRoom
        ? Math.min(
            rooms.length,
            Math.max(
              1,
              floorGeometry
                .recommendedMaxRooms
            ),
            3
          )
        : 0;

    if (
      maxRoomDraw > 0
    ) {
      const roomW =
        Math.min(
          frame.w * 0.27,
          80
        );

      for (
        let i = 0;
        i <
        maxRoomDraw;
        i++
      ) {
        const rh =
          frame.h *
          0.22;

        const rx =
          frame.x +
          frame.w -
          roomW -
          4;

        const ry =
          frame.y +
          frame.h *
          0.40 +
          i *
          (
            rh + 4
          );

        ui.card(
          ctx,
          rx,
          ry,
          roomW,
          rh,
          {
            radius: 5,
            fill:
              'rgba(255,239,199,0.86)',
            stroke:
              '#CFA453',
            shadow: false
          }
        );

        this.text(
          ctx,
          rooms[i].name,
          rx +
            roomW / 2,
          ry + 11,
          4.8,
          COLORS.text,
          '800',
          'center'
        );

        this.drawImageContain(
          ctx,
          rooms[i].seats >=
            8
            ? 'reno_table_8'
            : 'reno_table_6',
          rx + 7,
          ry + 17,
          roomW - 14,
          rh - 22,
          1
        );

        this.addButton(
          'room:rename:' +
            rooms[i].id,
          rx,
          ry,
          roomW,
          rh
        );
      }
    }

    // Tables use real-space candidate slots produced by the floorGeometry engine.
    const tableQueue =
      [];

    for (
      const key
      of [
        '8',
        '6',
        '4',
        '2'
      ]
    ) {
      const count =
        Math.max(
          0,
          Number(
            floor.tables[
              key
            ]
          ) || 0
        );

      for (
        let i = 0;
        i < count;
        i++
      ) {
        tableQueue.push(
          key
        );
      }
    }

    const slots =
      floorMetric
        .usableDiningSlots ||
      renovationSystem
        .getUsableDiningSlots(
          floorGeometry,
          floor
        );

    for (
      let i = 0;
      i <
      Math.min(
        tableQueue.length,
        slots.length
      );
      i++
    ) {
      const key =
        tableQueue[i];

      const slot =
        this.mapGeometryPoint(
          frame,
          slots[i]
        );

      const realArea =
        renovationConfig
          .tableFootprint[
            key
          ] ||
        7.6;

      const basePx =
        Math.sqrt(
          realArea
        ) *
        frame.scale *
        0.72;

      const tw =
        clamp(
          basePx,
          20,
          key ===
            '8'
            ? 50
            : 43
        );

      const th =
        clamp(
          tw *
          (
            key ===
              '8'
              ? 0.72
              : 0.82
          ),
          17,
          38
        );

      this.drawImageContain(
        ctx,
        'reno_table_' +
          key,
        slot.x -
          tw / 2,
        slot.y -
          th / 2,
        tw,
        th,
        1
      );
    }

    // Decor remains furniture and therefore follows the real shell.
    const plants =
      Math.min(
        5,
        Number(
          metrics.decorCounts &&
          metrics.decorCounts.plant
        ) || 0
      );

    const plantSlots =
      slots.filter(
        (
          value,
          index
        ) =>
          index % 2 === 1
      );

    for (
      let i = 0;
      i <
      Math.min(
        plants,
        plantSlots.length
      );
      i++
    ) {
      const p =
        this.mapGeometryPoint(
          frame,
          plantSlots[
            plantSlots.length -
            1 -
            i
          ]
        );

      this.drawImageContain(
        ctx,
        i % 2
          ? 'reno_plant_2'
          : 'reno_plant_1',
        p.x - 10,
        p.y - 12,
        20,
        24,
        1
      );
    }

    // Entrances are generated by the property floorGeometry.
    for (
      let i = 0;
      i <
      floorGeometry
        .entrances
        .length;
      i++
    ) {
      const entrance =
        floorGeometry
          .entrances[i];

      const p =
        this.mapGeometryPoint(
          frame,
          entrance
        );

      ctx.save();

      ctx.fillStyle =
        i === 0
          ? '#D6534A'
          : '#2D91BD';

      ctx.beginPath();

      if (
        entrance.side ===
          'south'
      ) {
        ctx.moveTo(
          p.x,
          p.y + 3
        );
        ctx.lineTo(
          p.x - 7,
          p.y - 7
        );
        ctx.lineTo(
          p.x + 7,
          p.y - 7
        );
      } else {
        ctx.moveTo(
          p.x,
          p.y - 3
        );
        ctx.lineTo(
          p.x - 7,
          p.y + 7
        );
        ctx.lineTo(
          p.x + 7,
          p.y + 7
        );
      }

      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    this.text(
      ctx,
      floorGeometry
        .shapeName +
        ' · ' +
        floorGeometry
          .widthM
          .toFixed(1) +
        'm × ' +
        floorGeometry
          .depthM
          .toFixed(1) +
        'm · ' +
        floorGeometry
          .areaM2
          .toFixed(0) +
        '㎡',
      x + w / 2,
      y + h - 7,
      4.6,
      COLORS.navy,
      '800',
      'center'
    );
  }
  drawToolButton(
    ctx,
    id,
    imageKey,
    label,
    x,
    y,
    w,
    h,
    active
  ) {
    const compact =
      w < 64;

    ui.card(
      ctx,
      x,
      y,
      w,
      h,
      {
        radius: 10,
        fill:
          active
            ? '#FFF2BF'
            : '#FFFDF7',
        stroke:
          active
            ? '#E8B326'
            : '#DED2C1',
        lineWidth:
          active
            ? 1.5
            : 1,
        shadow: false
      }
    );

    this.drawImageContain(
      ctx,
      imageKey,
      x +
        (
          compact
            ? 4
            : 7
        ),
      y + 6,
      compact
        ? 19
        : 25,
      h - 12,
      1
    );

    this.text(
      ctx,
      label,
      compact
        ? x + w * 0.68
        : x + 42,
      y + h / 2,
      compact
        ? 4.6
        : 5.3,
      COLORS.navy,
      '800',
      'center'
    );

    this.addButton(
      id,
      x,
      y,
      w,
      h
    );
  }

  drawFloorPlan(
    ctx,
    metrics,
    floor,
    geometry
  ) {
    const y =
      geometry.y;

    const h =
      geometry.planH;

    ui.card(
      ctx,
      7,
      y,
      376,
      h,
      {
        radius: 14,
        fill:
          COLORS.panel,
        stroke:
          COLORS.line,
        shadow: false
      }
    );

    this.text(
      ctx,
      '平面图',
      18,
      y + 17,
      9.8,
      COLORS.text,
      '800'
    );

    const floorGeometry =
      floor.geometry ||
      floorGeometrySystem
        .getFloorGeometry(
          this.getShop(),
          floor.index,
          floor.area,
          metrics.plan
            .floors
            .length
        );

    this.text(
      ctx,
      '拖动黄点/虚线调面积 · ' +
        floorGeometry.shapeName +
        ' · ' +
        floorGeometry.areaM2.toFixed(0) +
        '㎡',
      64,
      y + 17,
      4.9,
      COLORS.muted,
      '600'
    );

    this.text(
      ctx,
      '↶',
      263,
      y + 17,
      10,
      COLORS.navy,
      '800',
      'center'
    );

    this.text(
      ctx,
      '↷',
      301,
      y + 17,
      10,
      COLORS.navy,
      '800',
      'center'
    );

    this.addButton(
      'history:undo',
      245,
      y + 3,
      36,
      27
    );

    this.addButton(
      'history:redo',
      283,
      y + 3,
      36,
      27
    );

    ui.card(
      ctx,
      323,
      y + 5,
      51,
      25,
      {
        radius: 10,
        fill:
          '#FFF4D5',
        stroke:
          '#E2C16B',
        shadow: false
      }
    );

    this.text(
      ctx,
      '全屏预览',
      348.5,
      y + 17.5,
      5.2,
      COLORS.navy,
      '800',
      'center'
    );

    this.addButton(
      'preview',
      321,
      y + 2,
      55,
      31
    );

    const planX =
      14;

    const planY =
      y + 35;

    const planW =
      362;

    const toolGap =
      4;

    const toolH =
      40;

    const toolY =
      y +
      h -
      toolH -
      7;

    const planH =
      Math.max(
        120,
        toolY -
        planY -
        6
      );

    this.drawFloorCanvas(
      ctx,
      metrics,
      floor,
      planX,
      planY,
      planW,
      planH
    );

    const tools = [
      ['page:zones', 'reno_prep', '区域'],
      ['page:furniture', 'reno_table_4', '家具'],
      [
        'page:style',
        V45_HALL_STYLE_VISUAL[
          metrics.plan
            .hallStyle
        ] ||
          'reno_style_natural',
        '风格'
      ],
      ['page:rooms', 'reno_table_8', '包厢'],
      ['aisle:cycle', 'reno_corridor', '动线'],
      [
        'floor:next',
        'reno_room_small',
        '楼层' +
          (
            metrics.plan
              .activeFloor +
            1
          )
      ]
    ];

    const toolW =
      (
        planW -
        toolGap *
        (
          tools.length -
          1
        )
      ) /
      tools.length;

    for (
      let i = 0;
      i <
      tools.length;
      i++
    ) {
      this.drawToolButton(
        ctx,
        tools[i][0],
        tools[i][1],
        tools[i][2],
        planX +
          i *
          (
            toolW +
            toolGap
          ),
        toolY,
        toolW,
        toolH,
        false
      );
    }
  }

  drawTablePicker(
    ctx,
    floor,
    geometry
  ) {
    const x =
      7;

    const y =
      geometry.lowerY;

    const w =
      207;

    const h =
      geometry.lowerH;

    ui.card(
      ctx,
      x,
      y,
      w,
      h,
      {
        radius: 13,
        fill:
          COLORS.panel,
        stroke:
          COLORS.line,
        shadow: false
      }
    );

    this.text(
      ctx,
      '餐桌类型',
      x + 12,
      y + 16,
      8.3,
      COLORS.text,
      '800'
    );

    const keys =
      ['2', '4', '6', '8'];

    const cellW =
      47;

    for (
      let i = 0;
      i < 4;
      i++
    ) {
      const key =
        keys[i];

      const cx =
        x +
        7 +
        i *
        (
          cellW + 3
        );

      const imageH =
        Math.min(
          61,
          h - 52
        );

      this.drawImageContain(
        ctx,
        'reno_table_' +
          key,
        cx,
        y + 26,
        cellW,
        imageH,
        1
      );

      this.text(
        ctx,
        key +
          '人桌',
        cx +
          cellW / 2,
        y +
          h -
          29,
        5.1,
        COLORS.text,
        '800',
        'center'
      );

      const count =
        Number(
          floor.tables[
            key
          ]
        ) || 0;

      this.text(
        ctx,
        '数量 ' +
          count,
        cx +
          cellW / 2,
        y +
          h -
          12,
        5.1,
        COLORS.navy,
        '800',
        'center'
      );

      this.addButton(
        'table:' +
          key +
          ':plus',
        cx,
        y + 24,
        cellW,
        h - 24
      );
    }
  }

  drawChairIcon(
    ctx,
    x,
    y
  ) {
    ctx.save();

    ctx.fillStyle =
      COLORS.green;

    ctx.beginPath();
    ctx.roundRect(
      x,
      y + 7,
      18,
      10,
      3
    );
    ctx.fill();

    ctx.fillRect(
      x + 2,
      y,
      14,
      8
    );

    ctx.fillRect(
      x + 2,
      y + 16,
      3,
      6
    );

    ctx.fillRect(
      x + 13,
      y + 16,
      3,
      6
    );

    ctx.restore();
  }

  drawCalendarIcon(
    ctx,
    x,
    y
  ) {
    ctx.save();

    ctx.strokeStyle =
      COLORS.red;

    ctx.lineWidth =
      2;

    ctx.strokeRect(
      x,
      y + 4,
      20,
      18
    );

    ctx.fillStyle =
      COLORS.red;

    ctx.fillRect(
      x,
      y + 8,
      20,
      3
    );

    ctx.fillRect(
      x + 4,
      y,
      3,
      6
    );

    ctx.fillRect(
      x + 13,
      y,
      3,
      6
    );

    ctx.restore();
  }

  drawHeartIcon(
    ctx,
    x,
    y
  ) {
    ctx.save();

    ctx.fillStyle =
      '#F24872';

    ctx.beginPath();

    ctx.moveTo(
      x + 10,
      y + 20
    );

    ctx.bezierCurveTo(
      x - 4,
      y + 10,
      x + 2,
      y,
      x + 10,
      y + 6
    );

    ctx.bezierCurveTo(
      x + 18,
      y,
      x + 24,
      y + 10,
      x + 10,
      y + 20
    );

    ctx.fill();

    ctx.restore();
  }

  drawGearIcon(
    ctx,
    x,
    y
  ) {
    ctx.save();

    ctx.strokeStyle =
      '#238FD6';

    ctx.fillStyle =
      '#238FD6';

    ctx.lineWidth =
      2;

    ctx.beginPath();

    ctx.arc(
      x + 10,
      y + 10,
      8,
      0,
      Math.PI * 2
    );

    ctx.stroke();

    for (
      let i = 0;
      i < 8;
      i++
    ) {
      const a =
        Math.PI *
        i /
        4;

      ctx.fillRect(
        x +
          9 +
          Math.cos(a) * 10,
        y +
          9 +
          Math.sin(a) * 10,
        3,
        3
      );
    }

    ctx.beginPath();

    ctx.arc(
      x + 10,
      y + 10,
      3,
      0,
      Math.PI * 2
    );

    ctx.fill();

    ctx.restore();
  }

  drawMetricIcon(
    ctx,
    type,
    x,
    y
  ) {
    if (
      type === 'seat'
    ) {
      this.drawChairIcon(
        ctx,
        x,
        y
      );

      return;
    }

    if (
      type === 'budget'
    ) {
      if (
        this.drawImageContain(
          ctx,
          'reno_glossy_money',
          x - 2,
          y - 2,
          25,
          25,
          1
        )
      ) {
        return;
      }
    }

    if (
      type === 'days'
    ) {
      this.drawCalendarIcon(
        ctx,
        x,
        y
      );

      return;
    }

    if (
      type === 'comfort'
    ) {
      this.drawHeartIcon(
        ctx,
        x,
        y
      );

      return;
    }

    if (
      type === 'appeal'
    ) {
      if (
        this.drawImageContain(
          ctx,
          'reno_glossy_star',
          x - 2,
          y - 2,
          25,
          25,
          1
        )
      ) {
        return;
      }
    }

    if (
      type === 'efficiency'
    ) {
      this.drawGearIcon(
        ctx,
        x,
        y
      );
    }
  }

  drawMetrics(
    ctx,
    metrics,
    geometry
  ) {
    const x =
      219;

    const y =
      geometry.lowerY;

    const w =
      164;

    const h =
      geometry.lowerH;

    ui.card(
      ctx,
      x,
      y,
      w,
      h,
      {
        radius: 13,
        fill:
          COLORS.panel,
        stroke:
          COLORS.line,
        shadow: false
      }
    );

    this.text(
      ctx,
      '装修数据预览',
      x + 11,
      y + 16,
      8.1,
      COLORS.text,
      '800'
    );

    this.text(
      ctx,
      '实时计算',
      x + w - 10,
      y + 16,
      4.7,
      COLORS.muted,
      '600',
      'right'
    );

    const comfort =
      Math.round(
        metrics.comfort *
        100
      );

    const appeal =
      Math.round(
        metrics.appeal *
        100
      );

    const efficiency =
      Math.round(
        metrics
          .operationalEfficiency *
        100
      );

    const trafficDelta =
      Math.round(
        (
          metrics
            .operatingImpact
            .trafficFactor -
          1
        ) *
        100
      );

    const spendDelta =
      Math.round(
        (
          metrics
            .operatingImpact
            .spendFactor -
          1
        ) *
        100
      );

    const serviceDelta =
      Math.round(
        (
          metrics
            .operatingImpact
            .serviceFactor -
          1
        ) *
        100
      );

    const floor =
      metrics.floors[
        metrics.plan
          .activeFloor
      ];

    const remaining =
      floor
        .remainingArea;

    const items = [
      {
        type: 'efficiency',
        label: '本层面积',
        value:
          floor.area +
          '㎡',
        sub:
          '房源可用'
      },
      {
        type: 'comfort',
        label: '可摆面积',
        value:
          floor
            .effectiveDiningArea +
          '㎡',
        sub:
          '已扣结构净空'
      },
      {
        type:
          remaining >= 0
            ? 'appeal'
            : 'days',
        label: '剩余面积',
        value:
          remaining +
          '㎡',
        sub:
          remaining >= 0
            ? '仍可布置'
            : '已经超出'
      },
      {
        type: 'seat',
        label: '总座位',
        value:
          metrics.totalSeats,
        sub:
          '全部楼层'
      },
      {
        type: 'budget',
        label: '总预算',
        value:
          money(
            metrics.totalCost
          ),
        sub:
          metrics.buildDays +
          '天工期'
      },
      {
        type: 'efficiency',
        label: '面积状态',
        value:
          floor.valid
            ? '可施工'
            : '需调整',
        sub:
          floor.valid
            ? Math.round(
                floor
                  .areaUtilization *
                100
              ) +
              '%占用'
            : floor
                .areaWarnings[0]
      }
    ];

    const top =
      y + 29;

    const cellW =
      51;

    const rowH =
      (
        h - 35
      ) /
      2;

    for (
      let i = 0;
      i <
      items.length;
      i++
    ) {
      const col =
        i % 3;

      const row =
        Math.floor(
          i / 3
        );

      const cx =
        x +
        7 +
        col *
        cellW;

      const cy =
        top +
        row *
        rowH;

      if (col > 0) {
        ctx.fillStyle =
          '#ECE3D7';

        ctx.fillRect(
          cx - 4,
          cy + 3,
          1,
          rowH - 7
        );
      }

      this.drawMetricIcon(
        ctx,
        items[i].type,
        cx,
        cy + 3
      );

      this.text(
        ctx,
        items[i].label,
        cx + 25,
        cy + 7,
        4.4,
        COLORS.muted,
        '700'
      );

      this.text(
        ctx,
        items[i].value,
        cx + 25,
        cy + 24,
        6.2,
        i === 1
          ? COLORS.goldDeep
          : i === 2
            ? COLORS.red
            : i === 3
              ? '#D94E6A'
              : i === 4
                ? '#DCA72B'
                : i === 5
                  ? COLORS.blue
                  : COLORS.green,
        '800'
      );

      this.text(
        ctx,
        items[i].sub,
        cx + 25,
        cy + 39,
        4.0,
        COLORS.green,
        '700'
      );
    }
  }

  drawFooter(
    ctx,
    metrics,
    geometry
  ) {
    const y =
      geometry.footerY +
      5;

    ui.card(
      ctx,
      9,
      y,
      102,
      37,
      {
        radius: 18,
        fill:
          '#FFFDF7',
        stroke:
          '#D9CCBA',
        shadow: false
      }
    );

    this.text(
      ctx,
      '效果预览',
      60,
      y + 18.5,
      6.5,
      COLORS.navy,
      '800',
      'center'
    );

    this.addButton(
      'preview',
      5,
      y - 3,
      110,
      44
    );

    ui.card(
      ctx,
      120,
      y,
      262,
      37,
      {
        radius: 18,
        fill:
          metrics.valid
            ? COLORS.gold
            : '#D9D4CB',
        stroke:
          metrics.valid
            ? '#D89911'
            : '#C6BEB2',
        lineWidth: 1.2,
        shadow: false
      }
    );

    this.text(
      ctx,
      metrics.valid
        ? '选择施工队并开始施工  ›'
        : '当前布局存在问题，暂不能施工',
      251,
      y + 18.5,
      7.2,
      metrics.valid
        ? COLORS.text
        : COLORS.muted,
      '800',
      'center'
    );

    if (metrics.valid) {
      this.addButton(
        'construction:start',
        116,
        y - 3,
        270,
        44
      );
    }
  }

  drawSecondaryShell(
    ctx,
    title,
    subtitle
  ) {
    const geometry =
      this.getMainGeometry();

    const y =
      geometry.y;

    const h =
      this.contentBottom -
      y -
      8;

    ui.card(
      ctx,
      7,
      y,
      376,
      h,
      {
        radius: 14,
        fill:
          COLORS.panel,
        stroke:
          COLORS.line,
        shadow: false
      }
    );

    this.text(
      ctx,
      title,
      19,
      y + 19,
      9.6,
      COLORS.text,
      '800'
    );

    this.text(
      ctx,
      subtitle,
      19,
      y + 39,
      5.2,
      COLORS.muted,
      '600'
    );

    ui.card(
      ctx,
      305,
      y + 9,
      62,
      29,
      {
        radius: 14,
        fill:
          '#FFF0BC',
        stroke:
          '#E0B543',
        shadow: false
      }
    );

    this.text(
      ctx,
      '返回平面图',
      336,
      y + 23.5,
      5.2,
      COLORS.navy,
      '800',
      'center'
    );

    this.addButton(
      'page:layout',
      299,
      y + 5,
      74,
      37
    );

    return {
      y:
        y + 51,
      h:
        h - 59
    };
  }

  renderZones(
    ctx,
    metrics,
    floor
  ) {
    const shell =
      this.drawSecondaryShell(
        ctx,
        '区域面积',
        '后厨、仓储、服务区改变后，堂食面积自动联动'
      );

    const rows = [
      {
        key:
          'kitchenRatio',
        label:
          '后厨',
        image:
          'reno_stove',
        min:
          renovationConfig
            .zoneRules
            .minKitchenRatio,
        max:
          renovationConfig
            .zoneRules
            .maxKitchenRatio
      },
      {
        key:
          'storageRatio',
        label:
          '仓储',
        image:
          'reno_storage_shelf',
        min:
          renovationConfig
            .zoneRules
            .minStorageRatio,
        max:
          renovationConfig
            .zoneRules
            .maxStorageRatio
      },
      {
        key:
          'serviceRatio',
        label:
          '服务区',
        image:
          'reno_cashier',
        min:
          renovationConfig
            .zoneRules
            .minServiceRatio,
        max:
          renovationConfig
            .zoneRules
            .maxServiceRatio
      }
    ];

    let y =
      shell.y;

    for (
      let i = 0;
      i <
      rows.length;
      i++
    ) {
      const item =
        rows[i];

      const ratio =
        Number(
          floor[
            item.key
          ]
        ) || 0;

      ui.card(
        ctx,
        16,
        y,
        358,
        68,
        {
          radius: 12,
          fill:
            '#FFF9EF',
          stroke:
            '#E0D5C7',
          shadow: false
        }
      );

      this.drawImageContain(
        ctx,
        item.image,
        23,
        y + 7,
        62,
        54,
        1
      );

      this.text(
        ctx,
        item.label,
        97,
        y + 18,
        8.1,
        COLORS.text,
        '800'
      );

      this.text(
        ctx,
        Math.round(
          ratio *
          100
        ) +
        '% · ' +
        (
          floor.area *
          ratio
        ).toFixed(1) +
        '㎡',
        97,
        y + 40,
        6.7,
        COLORS.orange,
        '800'
      );

      this.text(
        ctx,
        '范围 ' +
        Math.round(
          item.min *
          100
        ) +
        '%–' +
        Math.round(
          item.max *
          100
        ) +
        '%',
        190,
        y + 40,
        4.8,
        COLORS.muted,
        '600'
      );

      this.drawPill(
        ctx,
        '−',
        294,
        y + 19,
        29,
        29,
        '#F0ECE5',
        COLORS.navy
      );

      this.drawPill(
        ctx,
        '+',
        333,
        y + 19,
        29,
        29,
        COLORS.gold,
        COLORS.text
      );

      this.addButton(
        'zone:' +
          item.key +
          ':minus',
        288,
        y + 13,
        41,
        41
      );

      this.addButton(
        'zone:' +
          item.key +
          ':plus',
        327,
        y + 13,
        41,
        41
      );

      y += 76;
    }

    const diningRatio =
      Math.max(
        0,
        1 -
        floor.kitchenRatio -
        floor.storageRatio -
        floor.serviceRatio
      );

    ui.card(
      ctx,
      16,
      y,
      358,
      61,
      {
        radius: 12,
        fill:
          '#EFF8F2',
        stroke:
          '#C4DECD',
        shadow: false
      }
    );

    this.drawImageContain(
      ctx,
      'reno_table_4',
      22,
      y + 6,
      59,
      49,
      1
    );

    this.text(
      ctx,
      '堂食区',
      96,
      y + 18,
      7.8,
      COLORS.text,
      '800'
    );

    this.text(
      ctx,
      Math.round(
        diningRatio *
        100
      ) +
        '% · ' +
        (
          floor.area *
          diningRatio
        ).toFixed(1) +
        '㎡',
      96,
      y + 41,
      6.6,
      COLORS.green,
      '800'
    );

    y += 70;

    const aisle =
      renovationConfig
        .aisleModes[
          floor.aisleMode
        ];

    ui.card(
      ctx,
      16,
      y,
      358,
      58,
      {
        radius: 12,
        fill:
          '#FFF6DD',
        stroke:
          '#E3C36B',
        shadow: false
      }
    );

    this.drawImageContain(
      ctx,
      'reno_corridor',
      22,
      y + 6,
      60,
      46,
      1
    );

    this.text(
      ctx,
      '动线 · ' +
        aisle.name,
      96,
      y + 18,
      7.2,
      COLORS.text,
      '800'
    );

    this.text(
      ctx,
      '舒适 ' +
        Math.round(
          aisle.comfort *
          100
        ) +
        ' · 效率 ' +
        Math.round(
          aisle
            .serviceEfficiency *
          100
        ),
      96,
      y + 39,
      5.2,
      COLORS.muted,
      '600'
    );

    this.drawPill(
      ctx,
      '切换',
      306,
      y + 15,
      51,
      29,
      COLORS.gold,
      COLORS.text
    );

    this.addButton(
      'aisle:cycle',
      300,
      y + 9,
      63,
      41
    );
  }

  renderFurniture(
    ctx,
    metrics,
    floor
  ) {
    const shell =
      this.drawSecondaryShell(
        ctx,
        '家具与软装',
        '餐桌决定餐位；空间不足时会明确提示，不再出现“按钮没反应”'
      );

    const tableY =
      shell.y;

    this.text(
      ctx,
      '餐桌',
      19,
      tableY + 9,
      7.8,
      COLORS.text,
      '800'
    );

    const keys =
      ['2', '4', '6', '8'];

    const cols =
      2;

    const cardGap =
      8;

    const cardW =
      171;

    const cardH =
      78;

    const tableStartY =
      tableY + 21;

    for (
      let i = 0;
      i <
      keys.length;
      i++
    ) {
      const key =
        keys[i];

      const col =
        i %
        cols;

      const row =
        Math.floor(
          i /
          cols
        );

      const x =
        16 +
        col *
        (
          cardW +
          cardGap
        );

      const cardY =
        tableStartY +
        row *
        (
          cardH +
          cardGap
        );

      const count =
        Number(
          floor.tables[
            key
          ]
        ) || 0;

      ui.card(
        ctx,
        x,
        cardY,
        cardW,
        cardH,
        {
          radius: 11,
          fill:
            '#FFF9EF',
          stroke:
            '#DFD5C8',
          shadow: false
        }
      );

      this.drawImageContain(
        ctx,
        'reno_table_' +
          key,
        x + 7,
        cardY + 8,
        69,
        55,
        1
      );

      this.text(
        ctx,
        key +
          '人桌',
        x + 88,
        cardY + 17,
        6.0,
        COLORS.text,
        '800'
      );

      this.text(
        ctx,
        '已摆 ' +
          count +
          ' 张',
        x + 88,
        cardY + 35,
        5.1,
        COLORS.muted,
        '700'
      );

      const minusX =
        x + 91;

      const plusX =
        x + 132;

      const buttonY =
        cardY + 47;

      ui.card(
        ctx,
        minusX,
        buttonY,
        32,
        24,
        {
          radius: 9,
          fill:
            '#F2EEE7',
          stroke:
            '#D7CCBC',
          shadow: false
        }
      );

      ui.card(
        ctx,
        plusX,
        buttonY,
        32,
        24,
        {
          radius: 9,
          fill:
            '#FFE49A',
          stroke:
            '#E1B43A',
          shadow: false
        }
      );

      this.text(
        ctx,
        '−',
        minusX + 16,
        buttonY + 12,
        8.5,
        COLORS.navy,
        '800',
        'center'
      );

      this.text(
        ctx,
        '+',
        plusX + 16,
        buttonY + 12,
        8.5,
        COLORS.navy,
        '800',
        'center'
      );

      this.addButton(
        'table:' +
          key +
          ':minus',
        minusX - 2,
        buttonY - 4,
        36,
        32
      );

      this.addButton(
        'table:' +
          key +
          ':plus',
        plusX - 2,
        buttonY - 4,
        36,
        32
      );
    }

    const decorY =
      tableStartY +
      2 *
      (
        cardH +
        cardGap
      ) +
      7;

    this.text(
      ctx,
      '软装',
      19,
      decorY,
      7.8,
      COLORS.text,
      '800'
    );

    const items =
      renovationConfig
        .decorItems ||
      [];

    for (
      let i = 0;
      i <
      Math.min(
        items.length,
        4
      );
      i++
    ) {
      const item =
        items[i];

      const x =
        16 +
        i * 89;

      const count =
        Number(
          metrics.decorCounts &&
          metrics.decorCounts[
            item.id
          ]
        ) || 0;

      ui.card(
        ctx,
        x,
        decorY + 13,
        82,
        90,
        {
          radius: 11,
          fill:
            '#FFF9EF',
          stroke:
            '#DFD5C8',
          shadow: false
        }
      );

      const imageMap = {
        plant:
          'reno_plant_1',
        pendant:
          'reno_pendant',
        screen:
          'reno_screen',
        sofa:
          'reno_sofa'
      };

      this.drawImageContain(
        ctx,
        imageMap[
          item.id
        ] ||
          'reno_plant_1',
        x + 8,
        decorY + 19,
        66,
        39,
        1
      );

      this.text(
        ctx,
        item.name,
        x + 41,
        decorY + 61,
        5.2,
        COLORS.text,
        '800',
        'center'
      );

      this.text(
        ctx,
        '− ' +
          count +
          ' +',
        x + 41,
        decorY + 88,
        5.8,
        COLORS.navy,
        '800',
        'center'
      );

      this.addButton(
        'decor:' +
          item.id +
          ':minus',
        x + 3,
        decorY + 73,
        32,
        30
      );

      this.addButton(
        'decor:' +
          item.id +
          ':plus',
        x + 48,
        decorY + 73,
        32,
        30
      );
    }

    const impactY =
      decorY + 117;

    ui.card(
      ctx,
      16,
      impactY,
      358,
      56,
      {
        radius: 12,
        fill:
          '#EFF7FA',
        stroke:
          '#C5DDE8',
        shadow: false
      }
    );

    this.text(
      ctx,
      '装修评分 ' +
        metrics.renovationScore +
        ' · 软装 ' +
        money(
          metrics.decorCost
        ),
      28,
      impactY + 17,
      7.0,
      COLORS.text,
      '800'
    );

    this.text(
      ctx,
      '客流 ×' +
        metrics
          .operatingImpact
          .trafficFactor
          .toFixed(2) +
        ' · 客单 ×' +
        metrics
          .operatingImpact
          .spendFactor
          .toFixed(2) +
        ' · 服务 ×' +
        metrics
          .operatingImpact
          .serviceFactor
          .toFixed(2),
      28,
      impactY + 38,
      5.2,
      COLORS.muted,
      '600'
    );
  }

  renderStyle(
    ctx,
    metrics
  ) {
    const shell =
      this.drawSecondaryShell(
        ctx,
        '装修风格',
        '大厅、材料、灯光共同影响成本、舒适度与吸引力'
      );

    const plan =
      metrics.plan;

    const rows = [
      {
        action:
          'style:hall',
        label:
          '大厅风格',
        value:
          this.getName(
            renovationConfig
              .hallStyles,
            plan.hallStyle
          ),
        key:
          V45_HALL_STYLE_VISUAL[
            plan.hallStyle
          ] ||
          'reno_style_natural'
      },
      {
        action:
          'style:material',
        label:
          '装修材料',
        value:
          this.getName(
            renovationConfig
              .materialGrades,
            plan.materialGrade
          ),
        key:
          plan.materialGrade ===
            'premium'
            ? 'reno_style_business'
            : plan.materialGrade ===
                'good'
              ? 'reno_style_chinese'
              : 'reno_style_natural'
      },
      {
        action:
          'style:lighting',
        label:
          '灯光氛围',
        value:
          this.getName(
            renovationConfig
              .lightingLevels,
            plan.lightingLevel
          ),
        key:
          plan.lightingLevel ===
            'premium'
            ? 'reno_style_business'
            : plan.lightingLevel ===
                'layered'
              ? 'reno_style_modern'
              : 'reno_style_natural'
      }
    ];

    let y =
      shell.y;

    for (
      let i = 0;
      i <
      rows.length;
      i++
    ) {
      const item =
        rows[i];

      ui.card(
        ctx,
        16,
        y,
        358,
        90,
        {
          radius: 12,
          fill:
            '#FFF9EF',
          stroke:
            '#DED3C5',
          shadow: false
        }
      );

      this.drawImageCover(
        ctx,
        item.key,
        23,
        y + 8,
        112,
        74,
        9,
        null
      );

      this.text(
        ctx,
        item.label,
        151,
        y + 23,
        8.2,
        COLORS.text,
        '800'
      );

      this.text(
        ctx,
        item.value,
        151,
        y + 51,
        7.0,
        COLORS.orange,
        '800'
      );

      this.drawPill(
        ctx,
        '切换 ›',
        297,
        y + 28,
        59,
        33,
        COLORS.gold,
        COLORS.text
      );

      this.addButton(
        item.action,
        291,
        y + 22,
        71,
        45
      );

      y += 98;
    }
  }

  renderRooms(
    ctx,
    metrics,
    floor
  ) {
    const shell =
      this.drawSecondaryShell(
        ctx,
        '包厢管理',
        '添加、改名、调整人数和风格'
      );

    const rooms =
      floor.privateRooms ||
      [];

    let y =
      shell.y;

    const maxDraw =
      Math.min(
        rooms.length,
        5
      );

    for (
      let i = 0;
      i < maxDraw;
      i++
    ) {
      const room =
        rooms[i];

      ui.card(
        ctx,
        16,
        y,
        358,
        62,
        {
          radius: 11,
          fill:
            '#FFF9EF',
          stroke:
            '#DED3C5',
          shadow: false
        }
      );

      this.drawImageContain(
        ctx,
        'reno_table_8',
        23,
        y + 7,
        58,
        48,
        1
      );

      this.text(
        ctx,
        room.name,
        94,
        y + 19,
        7.6,
        COLORS.text,
        '800'
      );

      this.text(
        ctx,
        room.seats +
          '人 · ' +
          this.getName(
            renovationConfig
              .privateRoomStyles,
            room.style
          ),
        94,
        y + 42,
        5.3,
        COLORS.muted,
        '600'
      );

      const actions = [
        [
          'room:rename:' +
            room.id,
          '改名'
        ],
        [
          'room:seats:' +
            room.id,
          '人数'
        ],
        [
          'room:style:' +
            room.id,
          '风格'
        ],
        [
          'room:remove:' +
            room.id,
          '删除'
        ]
      ];

      for (
        let j = 0;
        j < 4;
        j++
      ) {
        const ax =
          216 +
          j * 37;

        this.drawPill(
          ctx,
          actions[j][1],
          ax,
          y + 18,
          33,
          27,
          j === 3
            ? '#FFF0EA'
            : '#FFF2C9',
          j === 3
            ? COLORS.red
            : COLORS.navy
        );

        this.addButton(
          actions[j][0],
          ax - 2,
          y + 14,
          37,
          35
        );
      }

      y += 69;
    }

    if (
      rooms.length < 8
    ) {
      ui.card(
        ctx,
        16,
        y,
        358,
        42,
        {
          radius: 13,
          fill:
            '#FFF5D4',
          stroke:
            '#E3BD51',
          shadow: false
        }
      );

      this.text(
        ctx,
        '+ 添加一个新包厢',
        195,
        y + 21,
        6.6,
        COLORS.navy,
        '800',
        'center'
      );

      this.addButton(
        'room:add',
        12,
        y - 2,
        366,
        46
      );
    }
  }

  renderTemplates(
    ctx
  ) {
    const shell =
      this.drawSecondaryShell(
        ctx,
        '模板管理',
        '保存、套用、改名或删除装修模板'
      );

    const templates =
      customizationSystem
        .getTemplateList();

    let y =
      shell.y;

    if (!templates.length) {
      ui.card(
        ctx,
        16,
        y,
        358,
        92,
        {
          radius: 12,
          fill:
            '#FFF9EF',
          stroke:
            '#DED3C5',
          shadow: false
        }
      );

      this.text(
        ctx,
        '暂时还没有自定义模板',
        195,
        y + 31,
        8.0,
        COLORS.text,
        '800',
        'center'
      );

      this.text(
        ctx,
        '点击顶部“保存模板”即可保存当前方案',
        195,
        y + 58,
        5.3,
        COLORS.muted,
        '600',
        'center'
      );

      return;
    }

    for (
      let i = 0;
      i <
      Math.min(
        templates.length,
        6
      );
      i++
    ) {
      const item =
        templates[i];

      ui.card(
        ctx,
        16,
        y,
        358,
        58,
        {
          radius: 11,
          fill:
            '#FFF9EF',
          stroke:
            '#DED3C5',
          shadow: false
        }
      );

      this.text(
        ctx,
        item.name,
        28,
        y + 19,
        7.4,
        COLORS.text,
        '800'
      );

      this.text(
        ctx,
        item.sourceFloorCount +
          '层 · 原面积 ' +
          Math.round(
            item.sourceArea
          ) +
          '㎡',
        28,
        y + 40,
        5.0,
        COLORS.muted,
        '600'
      );

      const actions = [
        [
          'template:apply:' +
            item.id,
          '套用'
        ],
        [
          'template:rename:' +
            item.id,
          '改名'
        ],
        [
          'template:delete:' +
            item.id,
          '删除'
        ]
      ];

      for (
        let j = 0;
        j < 3;
        j++
      ) {
        const ax =
          247 +
          j * 38;

        this.drawPill(
          ctx,
          actions[j][1],
          ax,
          y + 15,
          34,
          28,
          j === 2
            ? '#FFF0EA'
            : '#FFF2C9',
          j === 2
            ? COLORS.red
            : COLORS.navy
        );

        this.addButton(
          actions[j][0],
          ax - 2,
          y + 11,
          38,
          36
        );
      }

      y += 65;
    }
  }

  renderContractors(
    ctx,
    metrics
  ) {
    const shell =
      this.drawSecondaryShell(
        ctx,
        '选择施工队',
        '报价、工期、可靠度和质量均来自当前装修方案'
      );

    const plan =
      metrics.plan;

    const quotes =
      renovationSystem
        .getContractorQuotes(
          this.shopId
        );

    let y =
      shell.y;

    for (
      let i = 0;
      i <
      quotes.length;
      i++
    ) {
      const quote =
        quotes[i];

      const selected =
        plan
          .selectedContractorId ===
        quote.id ||
        (
          !plan
            .selectedContractorId &&
          i === 0
        );

      ui.card(
        ctx,
        16,
        y,
        358,
        82,
        {
          radius: 12,
          fill:
            selected
              ? '#FFF5D1'
              : '#FFF9EF',
          stroke:
            selected
              ? '#E3B32A'
              : '#DED3C5',
          shadow: false
        }
      );

      this.drawImageContain(
        ctx,
        'reno_advice',
        22,
        y + 8,
        58,
        66,
        1
      );

      this.text(
        ctx,
        quote.name,
        92,
        y + 18,
        7.8,
        COLORS.text,
        '800'
      );

      this.text(
        ctx,
        '报价 ' +
          money(
            quote.price
          ) +
          ' · 工期 ' +
          quote.days +
          '天',
        92,
        y + 41,
        5.8,
        COLORS.orange,
        '800'
      );

      this.text(
        ctx,
        '可靠度 ' +
          quote.reliability +
          ' · 质量 ' +
          quote.quality,
        92,
        y + 62,
        5.0,
        COLORS.muted,
        '600'
      );

      this.drawPill(
        ctx,
        selected
          ? '已选'
          : '选择',
        304,
        y + 26,
        54,
        31,
        selected
          ? COLORS.gold
          : '#E7F3F8',
        COLORS.text
      );

      this.addButton(
        'contractor:select:' +
          quote.id,
        298,
        y + 20,
        66,
        43
      );

      y += 90;
    }

    ui.card(
      ctx,
      16,
      y,
      358,
      71,
      {
        radius: 12,
        fill:
          '#EFF8F2',
        stroke:
          '#C4DECD',
        shadow: false
      }
    );

    this.text(
      ctx,
      '可用面积 ' +
        metrics.totalArea +
        '㎡ · 预算 ' +
        money(
          metrics.totalCost
        ),
      28,
      y + 19,
      6.8,
      COLORS.green,
      '800'
    );

    this.text(
      ctx,
      '当前现金 ' +
        money(
          gameState
            .getPlayer()
            .cash
        ) +
        ' · 支付金额以所选报价为准',
      28,
      y + 43,
      5.0,
      COLORS.muted,
      '600'
    );

    this.drawPill(
      ctx,
      metrics.valid
        ? this
            .confirmingConstruction
          ? '再次确认'
          : '确认施工'
        : '方案无效',
      286,
      y + 22,
      72,
      34,
      metrics.valid
        ? COLORS.gold
        : '#D9D4CB',
      metrics.valid
        ? COLORS.text
        : COLORS.muted
    );

    if (metrics.valid) {
      this.addButton(
        'construction:confirm',
        280,
        y + 16,
        84,
        46
      );
    }
  }

  renderConstruction(
    ctx,
    shop,
    plan
  ) {
    this.drawHeader(
      ctx,
      shop
    );

    const construction =
      plan.construction;

    const progressInfo =
      renovationSystem
        .getConstructionProgress(
          shop.id
        );

    const progress =
      plan.status ===
        'completed'
        ? 1
        : progressInfo
            .progress;

    ui.card(
      ctx,
      16,
      118,
      358,
      270,
      {
        radius: 17,
        fill:
          COLORS.panel,
        stroke:
          COLORS.line,
        shadow: false
      }
    );

    this.drawImageCover(
      ctx,
      'reno_advice',
      29,
      135,
      88,
      114,
      11,
      null
    );

    this.text(
      ctx,
      plan.status ===
        'completed'
        ? '装修已经完工'
        : '装修施工中',
      233,
      156,
      15,
      COLORS.text,
      '800',
      'center'
    );

    this.text(
      ctx,
      construction
        ? construction
            .contractor
            .name
        : '施工团队',
      232,
      190,
      7.5,
      COLORS.orange,
      '800',
      'center'
    );

    this.text(
      ctx,
      construction
        ? (
            '已支付 ' +
            money(
              construction.paid
            ) +
            ' · 预计 ' +
            construction
              .contractor
              .days +
            '天'
          )
        : '',
      232,
      216,
      6.1,
      COLORS.muted,
      '600',
      'center'
    );

    ui.card(
      ctx,
      41,
      273,
      308,
      12,
      {
        radius: 6,
        fill:
          '#E7DFD2',
        stroke: false,
        shadow: false
      }
    );

    ui.card(
      ctx,
      41,
      273,
      Math.max(
        8,
        308 *
        progress
      ),
      12,
      {
        radius: 6,
        fill:
          COLORS.gold,
        stroke: false,
        shadow: false
      }
    );

    this.text(
      ctx,
      plan.status ===
        'completed'
        ? '可以返回门店继续筹备开业'
        : (
            '实际进度 ' +
            Math.round(
              progress *
              100
            ) +
            '% · 剩余约' +
            Math.ceil(
              progressInfo
                .remainingMinutes /
              60
            ) +
            '小时'
          ),
      195,
      320,
      5.8,
      COLORS.muted,
      '600',
      'center'
    );

    this.drawPill(
      ctx,
      '返回门店 ›',
      95,
      344,
      200,
      35,
      COLORS.gold,
      COLORS.text
    );

    this.addButton(
      'back',
      88,
      338,
      214,
      47
    );

    if (
      plan.status ===
        'completed'
    ) {
      this.drawPill(
        ctx,
        '升级装修',
        282,
        401,
        76,
        32,
        '#E7F3F8',
        COLORS.navy
      );

      this.addButton(
        'renovation:upgrade',
        276,
        395,
        88,
        44
      );
    }
  }

  renderPreview(
    ctx,
    metrics
  ) {
    const plan =
      metrics.plan;

    const floor =
      plan.floors[
        plan.activeFloor
      ];

    const floorMetric =
      metrics.floors[
        plan.activeFloor
      ];

    this.text(
      ctx,
      '真实面积预览',
      18,
      30,
      12,
      COLORS.text,
      '800'
    );

    this.text(
      ctx,
      floor.name +
        ' · 可用 ' +
        floor.area +
        '㎡ · ' +
        floorMetric
          .geometry
          .shapeName,
      18,
      54,
      5.8,
      COLORS.muted,
      '700'
    );

    this.drawPill(
      ctx,
      '关闭预览',
      298,
      17,
      72,
      34,
      COLORS.gold,
      COLORS.text
    );

    this.addButton(
      'preview:close',
      292,
      11,
      84,
      46
    );

    this.drawFloorCanvas(
      ctx,
      metrics,
      floor,
      12,
      72,
      366,
      Math.max(
        300,
        this.contentBottom -
        190
      )
    );

    const summaryY =
      this.contentBottom -
      102;

    ui.card(
      ctx,
      12,
      summaryY,
      366,
      88,
      {
        radius: 13,
        fill:
          floorMetric.valid
            ? '#EFF8F2'
            : '#FFF0EA',
        stroke:
          floorMetric.valid
            ? '#C4DECD'
            : '#E8B3A9',
        shadow: false
      }
    );

    this.text(
      ctx,
      '面积核算',
      25,
      summaryY + 18,
      7.7,
      COLORS.text,
      '800'
    );

    this.text(
      ctx,
      '后厨 ' +
        floorMetric.kitchenArea +
        ' + 仓储 ' +
        floorMetric.storageArea +
        ' + 服务 ' +
        floorMetric.serviceArea +
        ' + 堂食 ' +
        floorMetric.diningArea +
        ' = ' +
        floor.area +
        '㎡',
      25,
      summaryY + 42,
      5.5,
      COLORS.navy,
      '700'
    );

    this.text(
      ctx,
      '结构/门口净空 ' +
        floorMetric
          .structuralReservedArea +
        '㎡ · 家具占用 ' +
        floorMetric
          .occupiedArea +
        '㎡ · 剩余 ' +
        floorMetric
          .remainingArea +
        '㎡',
      25,
      summaryY + 65,
      5.4,
      floorMetric.valid
        ? COLORS.green
        : COLORS.red,
      '800'
    );
  }

  render(ctx) {
    if (!ctx) {
      return;
    }

    this.getLayout();

    this.buttons =
      [];

    const shop =
      this.getShop();

    if (!shop) {
      sceneManager
        .switchTo(
          'shop'
        );

      return;
    }

    renovationSystem
      .updateShop(
        shop.id
      );

    const metrics =
      this.getMetrics();

    if (!metrics) {
      return;
    }

    const plan =
      metrics.plan;

    ctx.save();

    ctx.fillStyle =
      COLORS.paper;

    ctx.fillRect(
      0,
      0,
      DESIGN_W,
      this.viewH
    );

    if (
      this.previewMode &&
      plan.status !==
        'constructing' &&
      plan.status !==
        'completed'
    ) {
      this.renderPreview(
        ctx,
        metrics
      );

      ctx.restore();

      return;
    }

    if (
      plan.status ===
        'constructing' ||
      plan.status ===
        'completed'
    ) {
      this.renderConstruction(
        ctx,
        shop,
        plan
      );

      ctx.restore();

      return;
    }

    this.drawHeader(
      ctx,
      shop
    );

    if (this.viewH >= 700) {
      this.drawTemplateStrip(
        ctx,
        plan
      );
    }

    const floor =
      plan.floors[
        plan.activeFloor
      ];

    if (
      this.page ===
        'layout'
    ) {
      const geometry =
        this.getMainGeometry();

      this.drawFloorPlan(
        ctx,
        metrics,
        floor,
        geometry
      );

      this.drawTablePicker(
        ctx,
        floor,
        geometry
      );

      this.drawMetrics(
        ctx,
        metrics,
        geometry
      );

      this.drawFooter(
        ctx,
        metrics,
        geometry
      );
    } else if (
      this.page ===
        'zones'
    ) {
      this.renderZones(
        ctx,
        metrics,
        floor
      );
    } else if (
      this.page ===
        'furniture'
    ) {
      this.renderFurniture(
        ctx,
        metrics,
        floor
      );
    } else if (
      this.page ===
        'style'
    ) {
      this.renderStyle(
        ctx,
        metrics
      );
    } else if (
      this.page ===
        'rooms'
    ) {
      this.renderRooms(
        ctx,
        metrics,
        floor
      );
    } else if (
      this.page ===
        'templates'
    ) {
      this.renderTemplates(
        ctx
      );
    } else if (
      this.page ===
        'contractors'
    ) {
      this.renderContractors(
        ctx,
        metrics
      );
    }

    ctx.restore();
  }

  saveTemplate(mode) {
    const templates =
      customizationSystem
        .getTemplateList();

    textInput
      .requestText({
        title:
          mode ===
            'save-as'
            ? '另存装修模板'
            : '保存装修模板',
        value:
          renovationConfig
            .templateRules
            .defaultNamePrefix +
          (
            templates.length +
            1
          ),
        placeholder:
          '请输入模板名称',
        maxLength:
          renovationConfig
            .nameRules
            .templateMaxLength
      })
      .then(
        value => {
          if (!value) {
            return;
          }

          const result =
            customizationSystem
              .saveTemplate(
                this.shopId,
                value
              );

          this.showToast(
            result.ok
              ? '模板已保存'
              : result.message
          );

          textInput
            .requestRender();
        }
      );
  }

  handleTap(
    x,
    y
  ) {
    const item =
      this.hitButton(
        x,
        y
      );

    if (!item) {
      return false;
    }

    const id =
      item.id;

    if (
      id !==
        'construction:confirm'
    ) {
      this.confirmingConstruction =
        false;
    }

    if (
      id === 'back'
    ) {
      sceneManager
        .switchTo(
          'shop'
        );

      return true;
    }

    if (
      id ===
      'shop:rename'
    ) {
      const shop =
        this.getShop();

      if (!shop) {
        return true;
      }

      textInput
        .requestText({
          title:
            '修改酒楼名称',
          value:
            shop.name || '',
          placeholder:
            '请输入酒楼名称',
          maxLength:
            renovationConfig
              .nameRules
              .shopMaxLength
        })
        .then(
          value => {
            if (!value) {
              return;
            }

            const result =
              customizationSystem
                .renameShop(
                  this.shopId,
                  value
                );

            this.showToast(
              result.ok
                ? '酒楼名称已保存'
                : result.message
            );

            textInput
              .requestRender();
          }
        );

      return true;
    }

    if (
      id ===
      'template:save'
    ) {
      this.saveTemplate(
        'save'
      );

      return true;
    }

    if (
      id ===
      'template:save-as'
    ) {
      this.saveTemplate(
        'save-as'
      );

      return true;
    }

    if (
      id ===
      'history:undo'
    ) {
      this.showToast(
        renovationSystem
          .undo(
            this.shopId
          )
          ? '已撤销'
          : '没有可撤销操作'
      );

      return true;
    }

    if (
      id ===
      'history:redo'
    ) {
      this.showToast(
        renovationSystem
          .redo(
            this.shopId
          )
          ? '已重做'
          : '没有可重做操作'
      );

      return true;
    }

    if (
      id ===
      'preview'
    ) {
      this.previewMode =
        true;

      return true;
    }

    if (
      id ===
      'preview:close'
    ) {
      this.previewMode =
        false;

      return true;
    }

    if (
      id ===
      'renovation:upgrade'
    ) {
      const result =
        renovationSystem
          .beginUpgrade(
            this.shopId
          );

      if (result.ok) {
        this.page =
          'layout';

        saveSystem
          .autoSave(true);
      }

      this.showToast(
        result.message
      );

      return true;
    }

    if (
      id ===
      'floor:next'
    ) {
      const plan =
        this.getPlan();

      renovationSystem
        .setActiveFloor(
          this.shopId,
          (
            plan.activeFloor +
            1
          ) %
          plan.floors.length
        );

      return true;
    }

    if (
      id ===
      'aisle:cycle'
    ) {
      const plan =
        this.getPlan();

      renovationSystem
        .cycleAisle(
          this.shopId,
          plan.activeFloor
        );

      return true;
    }

    if (
      id.indexOf(
        'page:'
      ) ===
      0
    ) {
      this.page =
        id.split(':')[1];

      return true;
    }

    if (
      id.indexOf(
        'builtin:style:'
      ) ===
      0
    ) {
      const style =
        id.slice(
          'builtin:style:'
            .length
        );

      renovationSystem
        .mutatePlan(
          this.shopId,
          plan => {
            plan.hallStyle =
              style;

            if (
              style ===
              'premium'
            ) {
              plan.materialGrade =
                'premium';

              plan.lightingLevel =
                'premium';
            } else if (
              style ===
              'modern_cn'
            ) {
              plan.materialGrade =
                'good';

              plan.lightingLevel =
                'layered';
            } else {
              plan.materialGrade =
                'standard';

              plan.lightingLevel =
                'warm';
            }
          }
        );

      return true;
    }

    const plan =
      this.getPlan();

    const floorIndex =
      plan.activeFloor;

    if (
      id.indexOf(
        'table:'
      ) ===
      0
    ) {
      const parts =
        id.split(':');

      const tableKey =
        String(
          Number(
            parts[1]
          )
        );

      const delta =
        parts[2] ===
          'plus'
          ? 1
          : -1;

      const beforeCount =
        Number(
          plan.floors[
            floorIndex
          ].tables[
            tableKey
          ]
        ) || 0;

      renovationSystem
        .adjustTable(
          this.shopId,
          floorIndex,
          Number(
            parts[1]
          ),
          delta
        );

      const currentPlan =
        this.getPlan();

      const afterCount =
        Number(
          currentPlan
            .floors[
              floorIndex
            ]
            .tables[
              tableKey
            ]
        ) || 0;

      if (
        delta > 0 &&
        afterCount <=
          beforeCount
      ) {
        const currentMetrics =
          this.getMetrics();

        const floorMetrics =
          currentMetrics &&
          currentMetrics
            .floors
            .find(
              value =>
                value.index ===
                floorIndex
            );

        const totalTables =
          Object.values(
            currentPlan
              .floors[
                floorIndex
              ]
              .tables
          )
          .reduce(
            (
              sum,
              value
            ) =>
              sum +
              Math.max(
                0,
                Number(value) ||
                0
              ),
            0
          );

        const slots =
          floorMetrics &&
          floorMetrics
            .usableDiningSlots
            ? floorMetrics
                .usableDiningSlots
                .length
            : 0;

        this.showToast(
          slots > 0 &&
          totalTables >=
            slots
            ? '餐桌落位点已满，请拖动分区扩大堂食区'
            : '堂食可用面积不足，请扩大堂食区或减少其他家具'
        );
      } else {
        saveSystem
          .autoSave(true);
      }

      return true;
    }

    if (
      id.indexOf(
        'zone:'
      ) ===
      0
    ) {
      const parts =
        id.split(':');

      renovationSystem
        .adjustZone(
          this.shopId,
          floorIndex,
          parts[1],
          parts[2] ===
            'plus'
            ? 0.02
            : -0.02
        );

      return true;
    }

    if (
      id.indexOf(
        'decor:'
      ) ===
      0
    ) {
      const parts =
        id.split(':');

      renovationSystem
        .adjustDecor(
          this.shopId,
          parts[1],
          parts[2] ===
            'plus'
            ? 1
            : -1
        );

      return true;
    }

    if (
      id ===
      'style:hall'
    ) {
      renovationSystem
        .cycleGlobal(
          this.shopId,
          'hallStyle'
        );

      return true;
    }

    if (
      id ===
      'style:material'
    ) {
      renovationSystem
        .cycleGlobal(
          this.shopId,
          'materialGrade'
        );

      return true;
    }

    if (
      id ===
      'style:lighting'
    ) {
      renovationSystem
        .cycleGlobal(
          this.shopId,
          'lightingLevel'
        );

      return true;
    }

    if (
      id ===
      'room:add'
    ) {
      renovationSystem
        .addPrivateRoom(
          this.shopId,
          floorIndex
        );

      return true;
    }

    if (
      id.indexOf(
        'room:rename:'
      ) ===
      0
    ) {
      const roomId =
        id.slice(
          'room:rename:'
            .length
        );

      const room =
        plan
          .floors[
            floorIndex
          ]
          .privateRooms
          .find(
            value =>
              value.id ===
              roomId
          );

      if (room) {
        textInput
          .requestText({
            title:
              '修改包厢名称',
            value:
              room.name || '',
            placeholder:
              '例如：牡丹厅',
            maxLength:
              renovationConfig
                .nameRules
                .roomMaxLength
          })
          .then(
            value => {
              if (!value) {
                return;
              }

              const result =
                customizationSystem
                  .renameRoom(
                    this.shopId,
                    roomId,
                    value
                  );

              this.showToast(
                result.ok
                  ? '包厢名称已保存'
                  : result.message
              );

              textInput
                .requestRender();
            }
          );
      }

      return true;
    }

    if (
      id.indexOf(
        'room:seats:'
      ) ===
      0
    ) {
      renovationSystem
        .cycleRoomSeats(
          this.shopId,
          floorIndex,
          id.slice(
            'room:seats:'
              .length
          )
        );

      return true;
    }

    if (
      id.indexOf(
        'room:style:'
      ) ===
      0
    ) {
      renovationSystem
        .cycleRoomStyle(
          this.shopId,
          floorIndex,
          id.slice(
            'room:style:'
              .length
          )
        );

      return true;
    }

    if (
      id.indexOf(
        'room:remove:'
      ) ===
      0
    ) {
      renovationSystem
        .removePrivateRoom(
          this.shopId,
          floorIndex,
          id.slice(
            'room:remove:'
              .length
          )
        );

      return true;
    }

    if (
      id.indexOf(
        'template:apply:'
      ) ===
      0
    ) {
      const result =
        customizationSystem
          .applyTemplate(
            this.shopId,
            id.slice(
              'template:apply:'
                .length
            )
          );

      this.showToast(
        result.ok
          ? '模板已套用'
          : result.message
      );

      this.page =
        'layout';

      return true;
    }

    if (
      id.indexOf(
        'template:rename:'
      ) ===
      0
    ) {
      const templateId =
        id.slice(
          'template:rename:'
            .length
        );

      const item =
        customizationSystem
          .getTemplateList()
          .find(
            value =>
              value.id ===
              templateId
          );

      if (item) {
        textInput
          .requestText({
            title:
              '修改模板名称',
            value:
              item.name,
            placeholder:
              '请输入模板名称',
            maxLength:
              renovationConfig
                .nameRules
                .templateMaxLength
          })
          .then(
            value => {
              if (!value) {
                return;
              }

              const result =
                customizationSystem
                  .renameTemplate(
                    templateId,
                    value
                  );

              this.showToast(
                result.ok
                  ? '模板名称已保存'
                  : result.message
              );

              textInput
                .requestRender();
            }
          );
      }

      return true;
    }

    if (
      id.indexOf(
        'template:delete:'
      ) ===
      0
    ) {
      const result =
        customizationSystem
          .deleteTemplate(
            id.slice(
              'template:delete:'
                .length
            )
          );

      this.showToast(
        result.ok
          ? '模板已删除'
          : result.message
      );

      return true;
    }

    if (
      id.indexOf(
        'contractor:select:'
      ) ===
      0
    ) {
      renovationSystem
        .selectContractor(
          this.shopId,
          id.slice(
            'contractor:select:'
              .length
          )
        );

      return true;
    }

    if (
      id ===
      'construction:start'
    ) {
      this.page =
        'contractors';

      return true;
    }

    if (
      id ===
      'construction:confirm'
    ) {
      const quotes =
        renovationSystem
          .getContractorQuotes(
            this.shopId
          );

      const current =
        this.getPlan();

      if (
        !current
          .selectedContractorId &&
        quotes[0]
      ) {
        renovationSystem
          .selectContractor(
            this.shopId,
            quotes[0].id
          );
      }

      if (
        !this
          .confirmingConstruction
      ) {
        const selected =
          renovationSystem
            .getContractorQuotes(
              this.shopId
            )
            .find(
              item =>
                item.id ===
                this.getPlan()
                  .selectedContractorId
            );

        this.confirmingConstruction =
          true;

        this.showToast(
          '再次点击确认施工 · 支付' +
          money(
            selected &&
            selected.price
          ) +
          ' · 余额' +
          money(
            gameState
              .getPlayer()
              .cash -
            (
              selected &&
              selected.price ||
              0
            )
          )
        );

        return true;
      }

      const result =
        renovationSystem
          .startConstruction(
            this.shopId
          );

      this.showToast(
        result.ok
          ? '施工已经开始'
          : result.message
      );

      this.confirmingConstruction =
        false;

      if (result.ok) {
        saveSystem
          .autoSave(true);
      }

      textInput
        .requestRender();

      return true;
    }

    return false;
  }

  handleTouchStart(
    x,
    y
  ) {
    const data =
      this.floorCanvasInteraction;

    if (
      !data ||
      this.page !==
        'layout' ||
      this.previewMode
    ) {
      return false;
    }

    const frame =
      data.frame;

    if (
      x < frame.x ||
      x > frame.x + frame.w ||
      y < frame.y ||
      y > frame.y + frame.h
    ) {
      return false;
    }

    const horizontalY =
      frame.y +
      frame.h *
      data.backRatio;

    const topSplitX =
      frame.x +
      frame.w *
      data.kitchenWidthRatio;

    const serviceSplitX =
      frame.x +
      frame.w *
      data.serviceWidthRatio;

    let type = null;

    if (
      Math.abs(
        y -
        horizontalY
      ) <= 18
    ) {
      type = 'back';
    } else if (
      y < horizontalY &&
      Math.abs(
        x -
        topSplitX
      ) <= 18
    ) {
      type =
        'kitchen-storage';
    } else if (
      y > horizontalY &&
      Math.abs(
        x -
        serviceSplitX
      ) <= 18
    ) {
      type = 'service';
    }

    if (!type) {
      return false;
    }

    const plan =
      this.getPlan();

    renovationSystem
      .mutatePlan(
        this.shopId,
        () => {},
        {
          skipHistory: false
        }
      );

    this.areaDrag = {
      type,
      floorIndex:
        data.floorIndex,
      start:
        {
          kitchenRatio:
            plan.floors[
              data.floorIndex
            ].kitchenRatio,
          storageRatio:
            plan.floors[
              data.floorIndex
            ].storageRatio,
          serviceRatio:
            plan.floors[
              data.floorIndex
            ].serviceRatio
        }
    };

    return true;
  }

  handleTouchMove(
    x,
    y
  ) {
    if (
      !this.areaDrag ||
      !this.floorCanvasInteraction
    ) {
      return false;
    }

    const drag =
      this.areaDrag;

    const frame =
      this.floorCanvasInteraction
        .frame;

    const values = {
      ...drag.start
    };

    if (
      drag.type ===
        'back'
    ) {
      const back =
        clamp(
          (
            y -
            frame.y
          ) /
          frame.h,
          renovationConfig
            .zoneRules
            .minKitchenRatio +
          renovationConfig
            .zoneRules
            .minStorageRatio,
          1 -
          renovationConfig
            .zoneRules
            .minDiningRatio -
          values.serviceRatio
        );

      values.kitchenRatio =
        back -
        values.storageRatio;
    } else if (
      drag.type ===
        'kitchen-storage'
    ) {
      const back =
        values.kitchenRatio +
        values.storageRatio;

      values.kitchenRatio =
        clamp(
          (
            x -
            frame.x
          ) /
          frame.w *
          back,
          renovationConfig
            .zoneRules
            .minKitchenRatio,
          renovationConfig
            .zoneRules
            .maxKitchenRatio
        );

      values.storageRatio =
        back -
        values.kitchenRatio;
    } else {
      const lower =
        1 -
        values.kitchenRatio -
        values.storageRatio;

      values.serviceRatio =
        (
          x -
          frame.x
        ) /
        frame.w *
        lower;
    }

    renovationSystem
      .setZoneRatios(
        this.shopId,
        drag.floorIndex,
        values,
        {
          skipHistory: true
        }
      );

    return true;
  }

  handleTouchEnd() {
    if (!this.areaDrag) {
      return false;
    }

    this.areaDrag =
      null;

    saveSystem
      .autoSave(true);

    return true;
  }
}

module.exports =
  new RenovationScene();
