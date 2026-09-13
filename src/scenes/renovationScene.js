'use strict';

// V17_RENOVATION_UI_REWRITE
// V45_LIBRARY_RENOVATION_PHASE1
// V46_RENOVATION_PLAYABILITY_UI
// 装修页全量重做，不再叠旧页面布局。

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

const sceneManager =
  require('../core/sceneManager.js');

const renovationSystem =
  require('../renovation/renovationSystem.js');

const renovationConfig =
  require('../renovation/renovationConfig.js');

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

const V45_RENO_RESOURCES = [
  ['v45_store_hero', 'assets/images/library_store/store/storefront_hero_clean.png'],

  ['v45_style_natural', 'assets/images/library_store/renovation/styles/natural.png'],
  ['v45_style_chinese', 'assets/images/library_store/renovation/styles/chinese.png'],
  ['v45_style_modern', 'assets/images/library_store/renovation/styles/modern.png'],
  ['v45_style_night', 'assets/images/library_store/renovation/styles/night_market.png'],
  ['v45_style_business', 'assets/images/library_store/renovation/styles/business.png'],

  ['v45_table_2', 'assets/images/library_store/renovation/furniture/table_2.png'],
  ['v45_table_4', 'assets/images/library_store/renovation/furniture/table_4.png'],
  ['v45_table_6', 'assets/images/library_store/renovation/furniture/table_6_rect.png'],
  ['v45_table_8', 'assets/images/library_store/renovation/furniture/table_6_long.png'],
  ['v45_stove', 'assets/images/library_store/renovation/furniture/stove.png'],
  ['v45_fridge', 'assets/images/library_store/renovation/furniture/fridge.png'],
  ['v45_sink', 'assets/images/library_store/renovation/furniture/sink.png'],
  ['v45_cashier', 'assets/images/library_store/renovation/furniture/cashier.png'],
  ['v45_waiting_sofa', 'assets/images/library_store/renovation/furniture/waiting_sofa.png'],
  ['v45_plant', 'assets/images/library_store/renovation/furniture/plant_1.png'],
  ['v45_pendant', 'assets/images/library_store/renovation/furniture/pendant_gold.png'],
  ['v45_screen', 'assets/images/library_store/renovation/furniture/screen_round.png'],

  ['v45_layout_kitchen', 'assets/images/library_store/renovation/layouts/kitchen.png'],
  ['v45_layout_storage', 'assets/images/library_store/renovation/layouts/storage.png'],
  ['v45_layout_service', 'assets/images/library_store/renovation/layouts/service.png'],
  ['v45_layout_dining', 'assets/images/library_store/renovation/layouts/dining.png'],
  ['v45_layout_private_small', 'assets/images/library_store/renovation/layouts/private_small.png'],
  ['v45_layout_private_medium', 'assets/images/library_store/renovation/layouts/private_medium.png'],
  ['v45_layout_private_large', 'assets/images/library_store/renovation/layouts/private_large.png'],
  ['v45_layout_private_luxury', 'assets/images/library_store/renovation/layouts/private_luxury.png'],
  ['v45_layout_corridor', 'assets/images/library_store/renovation/layouts/corridor.png'],

  ['v45_advice_renovation', 'assets/images/library_store/store/advice_renovation.png']
];

const V45_RENO_VISUAL_MAP = {
  premium_template_1: 'v45_style_natural',
  premium_template_2: 'v45_style_chinese',
  premium_template_3: 'v45_style_modern',

  visual_table_2: 'v45_table_2',
  visual_table_4: 'v45_table_4',
  visual_table_6: 'v45_table_6',
  visual_table_8: 'v45_table_8',

  visual_stove: 'v45_stove',
  visual_fridge: 'v45_fridge'
};

const V45_HALL_STYLE_VISUAL = {
  simple: 'v45_style_modern',
  wood: 'v45_style_natural',
  modern_cn: 'v45_style_chinese',
  industrial: 'v45_style_modern',
  retro: 'v45_style_night',
  premium: 'v45_style_business'
};

const COLORS = {
  navy:
    '#0A3A57',
  navyDeep:
    '#062A40',
  paper:
    '#F6EFE2',
  panel:
    '#FFFDF8',
  text:
    '#18374B',
  muted:
    '#708188',
  gold:
    '#F5B62D',
  orange:
    '#E57D22',
  red:
    '#D75349',
  green:
    '#2B9A69',
  blue:
    '#2E8FB7',
  white:
    '#FFFFFF'
};

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
  }

  enter(payload) {
    for (
      let i = 0;
      i < V45_RENO_RESOURCES.length;
      i++
    ) {
      const item =
        V45_RENO_RESOURCES[i];

      resourceManager
        .loadImage(
          item[0],
          item[1],
          'v45-renovation-library'
        )
        .then(
          () => {
            if (
              runtime &&
              typeof runtime.requestRender ===
                'function'
            ) {
              runtime.requestRender();
            }
          }
        )
        .catch(
          () => {}
        );
    }

    const data =
      payload ||
      {};

    if (data.shopId) {
      this.shopId =
        data.shopId;
    }

    const business =
      gameState
        .getBusiness();

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
        'rooms',
        'style',
        'templates',
        'contractors'
      ].includes(
        data.page
      )
        ? data.page
        : 'layout';

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
        api.getSystemInfoSync();

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
      height <
        740
        ? 60
        : 64;

    this.contentBottom =
      height -
      this.navH;
  }

  getScale() {
    return clamp(
      (
        this.contentBottom -
        82
      ) /
      560,
      0.88,
      1.13
    );
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
        icon:
          'none'
      });
    }
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
        42,
        w
      );

    const hitH =
      Math.max(
        38,
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
      w:
        hitW,
      h:
        hitH
    });
  }

  hitButton(
    x,
    y
  ) {
    for (
      let i =
        this.buttons.length -
        1;
      i >= 0;
      i--
    ) {
      const b =
        this.buttons[i];

      if (
        x >= b.x &&
        x <=
          b.x +
          b.w &&
        y >= b.y &&
        y <=
          b.y +
          b.h
      ) {
        return b;
      }
    }

    return null;
  }

  getShop() {
    const business =
      gameState
        .getBusiness();

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

  drawVisual(
    ctx,
    key,
    x,
    y,
    w,
    h,
    alpha
  ) {
    const mappedKey =
      V45_RENO_VISUAL_MAP[
        key
      ] ||
      key;

    const libraryImage =
      resourceManager
        .getImage(
          mappedKey
        );

    const image =
      libraryImage ||
      visualAssetSystem
        .get(
          key
        );

    if (!image) {
      return false;
    }

    ctx.save();

    if (
      Number.isFinite(
        Number(alpha)
      )
    ) {
      ctx.globalAlpha =
        alpha;
    }

    ui.coverImage(
      ctx,
      image,
      x,
      y,
      w,
      h,
      7,
      null
    );

    ctx.restore();

    return true;
  }
  drawHeader(
    ctx,
    shop
  ) {
    ui.coverImage(
      ctx,
      resourceManager
        .getImage(
          'v45_store_hero'
        ) ||
      visualAssetSystem
        .get(
          'premium_reno_header'
        ),
      0,
      0,
      DESIGN_W,
      80,
      0,
      'rgba(3,31,47,0.40)'
    );

    ctx.fillStyle =
      'rgba(4,34,50,0.34)';

    ctx.fillRect(
      0,
      0,
      DESIGN_W,
      80
    );

    ui.card(
      ctx,
      8,
      13,
      38,
      38,
      {
        radius:
          11,
        fill:
          'rgba(5,48,68,0.88)',
        stroke:
          'rgba(255,255,255,0.30)',
        shadow:
          false
      }
    );

    ui.text(
      ctx,
      '‹',
      27,
      32,
      22,
      '#FFE59B',
      '800',
      'center'
    );

    this.addButton(
      'back',
      4,
      9,
      46,
      46
    );

    ui.text(
      ctx,
      shop.name ||
        '我的酒楼',
      56,
      20,
      15.5,
      COLORS.white,
      '800'
    );

    ui.text(
      ctx,
      '位置 · ' +
        shop.address,
      56,
      42,
      6.7,
      '#DDEBF0',
      '600'
    );

    ui.text(
      ctx,
      '用心打造，让美味更有温度！',
      56,
      62,
      6.6,
      '#FFE1A0',
      '600'
    );

    this.addButton(
      'shop:rename',
      52,
      8,
      186,
      57
    );

    ui.card(
      ctx,
      296,
      10,
      86,
      29,
      {
        radius:
          13,
        fill:
          COLORS.gold,
        stroke:
          '#FFE19A',
        shadow:
          false
      }
    );

    ui.text(
      ctx,
      '保存模板',
      339,
      24.5,
      6.6,
      COLORS.text,
      '800',
      'center'
    );

    this.addButton(
      'template:save',
      291,
      6,
      96,
      37
    );

    ui.card(
      ctx,
      296,
      43,
      86,
      27,
      {
        radius:
          12,
        fill:
          '#FFFDF7',
        stroke:
          '#D7CDBF',
        shadow:
          false
      }
    );

    ui.text(
      ctx,
      '▧ 另存模板',
      339,
      56.5,
      6.4,
      COLORS.navy,
      '800',
      'center'
    );

    this.addButton(
      'template:save-as',
      291,
      39,
      96,
      35
    );
  }

  drawTemplateStrip(
    ctx
  ) {
    const sy =
      this.getScale();

    const y =
      84;

    const h =
      95 *
      sy;

    ui.card(
      ctx,
      8,
      y,
      374,
      h,
      {
        radius:
          14,
        fill:
          COLORS.panel
      }
    );

    ui.text(
      ctx,
      '装修模板',
      20,
      y + 19,
      10.4,
      COLORS.text,
      '800'
    );

    ui.text(
      ctx,
      '选择心仪风格，或保存您的专属模板',
      82,
      y + 19,
      5.9,
      COLORS.muted,
      '500'
    );

    ui.text(
      ctx,
      '模板管理 ›',
      370,
      y + 19,
      6,
      COLORS.navy,
      '700',
      'right'
    );

    this.addButton(
      'page:templates',
      305,
      y + 3,
      73,
      29
    );

    const templates =
      customizationSystem
        .getTemplateList();

    const keys = [
      'v45_style_natural',
      'v45_style_chinese',
      'v45_style_business'
    ];

    const cardY =
      y + 28;

    const cardH =
      h - 36;

    for (
      let i = 0;
      i < 4;
      i++
    ) {
      const x =
        14 +
        i *
        91;

      ui.card(
        ctx,
        x,
        cardY,
        84,
        cardH,
        {
          radius:
            9,
          fill:
            i === 0
              ? '#FFF7DD'
              : '#FFF9F0',
          stroke:
            i === 0
              ? '#E7B62B'
              : '#DED4C7',
          shadow:
            false
        }
      );

      if (
        i < 3
      ) {
        this.drawVisual(
          ctx,
          keys[i],
          x + 3,
          cardY + 3,
          78,
          Math.max(
            33,
            cardH - 19
          ),
          1
        );

        ui.text(
          ctx,
          templates[i]
            ? templates[i].name
            : (
                '装修模板' +
                String.fromCharCode(
                  65 + i
                )
              ),
          x + 5,
          cardY +
            cardH -
            7,
          5.8,
          COLORS.text,
          '700'
        );

        this.addButton(
          templates[i]
            ? (
                'template:apply:' +
                templates[i].id
              )
            : 'page:templates',
          x,
          cardY,
          84,
          cardH
        );
      } else {
        ui.text(
          ctx,
          '+',
          x + 42,
          cardY +
            cardH *
            0.42,
          17,
          '#9B8F83',
          '500',
          'center'
        );

        ui.text(
          ctx,
          '新建模板',
          x + 42,
          cardY +
            cardH *
            0.72,
          6,
          COLORS.navy,
          '700',
          'center'
        );

        this.addButton(
          'template:save-as',
          x,
          cardY,
          84,
          cardH
        );
      }
    }
  }

  drawFloorPlan(
    ctx,
    metrics,
    floor
  ) {
    const sy =
      this.getScale();

    const y =
      184 *
      sy -
      80 *
      (
        sy -
        1
      );

    const h =
      256 *
      sy;

    ui.card(
      ctx,
      8,
      y,
      374,
      h,
      {
        radius:
          15,
        fill:
          COLORS.panel
      }
    );

    ui.text(
      ctx,
      '餐厅平面图',
      20,
      y + 19,
      10.5,
      COLORS.text,
      '800'
    );

    ui.text(
      ctx,
      '调整区域与家具，打造理想餐厅布局',
      84,
      y + 19,
      5.8,
      COLORS.muted,
      '500'
    );

    ui.text(
      ctx,
      '↶',
      271,
      y + 19,
      10,
      COLORS.navy,
      '800',
      'center'
    );

    ui.text(
      ctx,
      '↷',
      299,
      y + 19,
      10,
      COLORS.navy,
      '800',
      'center'
    );

    this.addButton(
      'history:undo',
      257,
      y + 4,
      29,
      29
    );

    this.addButton(
      'history:redo',
      285,
      y + 4,
      29,
      29
    );

    ui.card(
      ctx,
      318,
      y + 6,
      55,
      26,
      {
        radius:
          10,
        fill:
          '#FFF8E6',
        stroke:
          '#E5C56F',
        shadow:
          false
      }
    );

    ui.text(
      ctx,
      '全屏预览',
      345.5,
      y + 19,
      5.8,
      COLORS.navy,
      '800',
      'center'
    );

    this.addButton(
      'preview',
      314,
      y + 2,
      63,
      34
    );

    const px =
      15;

    const py =
      y + 37;

    const pw =
      286;

    const ph =
      h - 45;

    ui.coverImage(
      ctx,
      visualAssetSystem
        .get(
          'premium_floor_texture'
        ),
      px,
      py,
      pw,
      ph,
      9,
      'rgba(255,249,240,0.48)'
    );

    const serviceW =
      pw *
      0.44;

    const roomW =
      pw *
      0.30;

    ctx.save();

    ctx.beginPath();
    ctx.roundRect(
      px,
      py,
      pw,
      ph,
      9
    );
    ctx.clip();

    ctx.fillStyle =
      'rgba(72,78,79,0.32)';

    ctx.fillRect(
      px,
      py,
      serviceW,
      ph *
        0.39
    );

    ctx.fillStyle =
      'rgba(109,104,85,0.28)';

    ctx.fillRect(
      px + serviceW,
      py,
      pw -
        serviceW -
        roomW,
      ph *
        0.39
    );

    ctx.fillStyle =
      'rgba(246,240,228,0.68)';

    ctx.fillRect(
      px,
      py +
        ph *
        0.39,
      pw -
        roomW,
      ph *
        0.61
    );

    ctx.fillStyle =
      'rgba(224,197,146,0.40)';

    ctx.fillRect(
      px +
        pw -
        roomW,
      py,
      roomW,
      ph
    );

    ctx.restore();

    ui.text(
      ctx,
      '后厨',
      px +
        serviceW /
        2,
      py + 17,
      7,
      COLORS.white,
      '800',
      'center'
    );

    ui.text(
      ctx,
      '仓储',
      px +
        serviceW +
        (
          pw -
          serviceW -
          roomW
        ) /
        2,
      py + 17,
      7,
      COLORS.white,
      '800',
      'center'
    );

    ui.text(
      ctx,
      '服务区',
      px + 45,
      py +
        ph *
        0.56,
      6.5,
      COLORS.text,
      '700',
      'center'
    );

    ui.text(
      ctx,
      '堂食区',
      px + 146,
      py +
        ph *
        0.73,
      6.8,
      COLORS.text,
      '800',
      'center'
    );

    this.drawVisual(
      ctx,
      'v45_layout_kitchen',
      px + 6,
      py + 25,
      serviceW - 12,
      ph * 0.27,
      0.88
    );

    this.drawVisual(
      ctx,
      'visual_stove',
      px + 11,
      py + 29,
      serviceW *
        0.52,
      ph *
        0.23,
      0.98
    );

    this.drawVisual(
      ctx,
      'visual_fridge',
      px +
        serviceW *
        0.60,
      py + 29,
      serviceW *
        0.29,
      ph *
        0.23,
      0.98
    );

    this.drawVisual(
      ctx,
      'v45_layout_dining',
      px + 78,
      py + ph * 0.44,
      107,
      ph * 0.47,
      0.30
    );

    const rooms =
      floor.privateRooms
        .slice(
          0,
          3
        );

    for (
      let i = 0;
      i < 3;
      i++
    ) {
      const ry =
        py +
        6 +
        i *
        (
          ph /
          3
        );

      ui.card(
        ctx,
        px +
          pw -
          roomW +
          5,
        ry,
        roomW - 10,
        ph /
          3 -
          10,
        {
          radius:
            6,
          fill:
            'rgba(255,236,190,0.76)',
          stroke:
            '#D5A958',
          shadow:
            false
        }
      );

      ui.text(
        ctx,
        rooms[i]
          ? rooms[i].name
          : (
              '包厢名称' +
              (
                i + 1
              )
            ),
        px +
          pw -
          roomW /
          2,
        ry + 13,
        5.8,
        COLORS.text,
        '700',
        'center'
      );

      this.drawVisual(
        ctx,
        'visual_table_8',
        px +
          pw -
          roomW /
          2 -
          20,
        ry + 20,
        40,
        Math.max(
          27,
          ph /
            3 -
            36
        ),
        0.98
      );

      if (
        rooms[i]
      ) {
        this.addButton(
          'room:rename:' +
            rooms[i].id,
          px +
            pw -
            roomW +
            5,
          ry,
          roomW -
            10,
          ph /
            3 -
            10
        );
      }
    }

    const tableKeys = [
      '2',
      '4',
      '6',
      '8'
    ];

    let tableIndex =
      0;

    for (
      let k = 0;
      k <
      tableKeys.length;
      k++
    ) {
      const key =
        tableKeys[k];

      const count =
        Math.min(
          floor.tables[
            key
          ] ||
          0,
          10
        );

      for (
        let i = 0;
        i <
        count;
        i++
      ) {
        const col =
          tableIndex %
          3;

        const row =
          Math.floor(
            tableIndex /
            3
          );

        const tx =
          px +
          91 +
          col *
            47;

        const ty =
          py +
          ph *
            0.45 +
          row *
            39;

        if (
          ty >
          py +
            ph -
            31
        ) {
          break;
        }

        this.drawVisual(
          ctx,
          'visual_table_' +
            key,
          tx,
          ty,
          key ===
            '2'
            ? 27
            : key ===
                '4'
              ? 31
              : key ===
                  '6'
                ? 34
                : 37,
          26,
          0.98
        );

        tableIndex +=
          1;
      }
    }

    const toolbox = [
      [
        'page:zones',
        'v45_layout_kitchen',
        '区域'
      ],
      [
        'page:furniture',
        'v45_table_4',
        '家具'
      ],
      [
        'page:style',
        'v45_style_chinese',
        '风格'
      ],
      [
        'page:rooms',
        'v45_layout_private_medium',
        '包厢'
      ],
      [
        'aisle:cycle',
        'v45_layout_corridor',
        '动线'
      ],
      [
        'floor:next',
        'v45_layout_corridor',
        (
          '楼层 ' +
          (
            metrics.plan
              .activeFloor +
            1
          ) +
          'F'
        )
      ]
    ];

    const toolX =
      307;

    const toolW =
      67;

    const toolH =
      (
        ph -
        25
      ) /
      6;

    for (
      let i = 0;
      i <
      toolbox.length;
      i++
    ) {
      const ty =
        py +
        i *
        (
          toolH +
          5
        );

      ui.card(
        ctx,
        toolX,
        ty,
        toolW,
        toolH,
        {
          radius:
            9,
          fill:
            '#FFF9EE',
          stroke:
            '#DCCFBE',
          shadow:
            false
        }
      );

      this.drawVisual(
        ctx,
        toolbox[i][1],
        toolX + 5,
        ty + 4,
        24,
        Math.max(
          18,
          toolH - 8
        ),
        1
      );

      ui.text(
        ctx,
        toolbox[i][2],
        toolX + 47,
        ty +
          toolH /
          2,
        5.4,
        COLORS.text,
        '700',
        'center'
      );

      this.addButton(
        toolbox[i][0],
        toolX,
        ty,
        toolW,
        toolH
      );
    }
  }

  drawTablePicker(
    ctx,
    floor
  ) {
    const sy =
      this.getScale();

    const y =
      446 *
      sy -
      80 *
      (
        sy -
        1
      );

    const h =
      112 *
      sy;

    ui.card(
      ctx,
      8,
      y,
      203,
      h,
      {
        radius:
          13,
        fill:
          COLORS.panel
      }
    );

    ui.text(
      ctx,
      '餐桌类型',
      18,
      y + 18,
      9.5,
      COLORS.text,
      '800'
    );

    const keys = [
      '2',
      '4',
      '6',
      '8'
    ];

    for (
      let i = 0;
      i <
      keys.length;
      i++
    ) {
      const key =
        keys[i];

      const x =
        15 +
        i *
        48;

      this.drawVisual(
        ctx,
        'visual_table_' +
          key,
        x,
        y + 28,
        40,
        Math.max(
          35,
          h - 67
        ),
        0.98
      );

      ui.text(
        ctx,
        key +
          '人桌',
        x + 20,
        y +
          h -
          29,
        5.7,
        COLORS.text,
        '700',
        'center'
      );

      ui.text(
        ctx,
        '−  ' +
          (
            floor.tables[
              key
            ] ||
            0
          ) +
          '  +',
        x + 20,
        y +
          h -
          11,
        6,
        COLORS.navy,
        '800',
        'center'
      );

      this.addButton(
        'table:' +
          key +
          ':minus',
        x - 3,
        y +
          h -
          25,
        20,
        27
      );

      this.addButton(
        'table:' +
          key +
          ':plus',
        x + 24,
        y +
          h -
          25,
        20,
        27
      );
    }
  }

  drawMetrics(
    ctx,
    metrics
  ) {
    const sy =
      this.getScale();

    const y =
      446 *
      sy -
      80 *
      (
        sy -
        1
      );

    const h =
      112 *
      sy;

    ui.card(
      ctx,
      218,
      y,
      164,
      h,
      {
        radius:
          13,
        fill:
          COLORS.panel
      }
    );

    ui.text(
      ctx,
      '装修数据预览',
      230,
      y + 18,
      9.2,
      COLORS.text,
      '800'
    );

    const items = [
      [
        '座位数',
        metrics.totalSeats,
        COLORS.green
      ],
      [
        '预算',
        money(
          metrics.totalCost
        ),
        COLORS.orange
      ],
      [
        '工期',
        metrics.buildDays +
          '天',
        COLORS.red
      ],
      [
        '舒适度',
        Math.round(
          metrics.comfort *
          100
        ),
        '#D94E6A'
      ],
      [
        '吸引力',
        Math.round(
          metrics.appeal *
          100
        ),
        '#DCA72B'
      ],
      [
        '运营效率',
        Math.round(
          metrics
            .operationalEfficiency *
          100
        ),
        COLORS.blue
      ]
    ];

    for (
      let i = 0;
      i <
      items.length;
      i++
    ) {
      const col =
        i %
        3;

      const row =
        Math.floor(
          i /
          3
        );

      const x =
        226 +
        col *
          52;

      const iy =
        y +
        36 +
        row *
          (
            (
              h -
              43
            ) /
            2
          );

      ui.text(
        ctx,
        items[i][0],
        x,
        iy,
        5.4,
        COLORS.muted,
        '600'
      );

      ui.text(
        ctx,
        String(
          items[i][1]
        ),
        x,
        iy + 17,
        7.4,
        items[i][2],
        '800'
      );
    }
  }

  drawFooter(
    ctx,
    metrics
  ) {
    const y =
      this.contentBottom -
      43;

    ui.card(
      ctx,
      10,
      y,
      94,
      34,
      {
        radius:
          17,
        fill:
          '#FFFDF7',
        stroke:
          '#D8CABB',
        shadow:
          false
      }
    );

    ui.text(
      ctx,
      '效果预览',
      57,
      y + 17,
      7,
      COLORS.navy,
      '800',
      'center'
    );

    this.addButton(
      'preview',
      6,
      y - 4,
      102,
      42
    );

    ui.card(
      ctx,
      112,
      y,
      268,
      34,
      {
        radius:
          17,
        fill:
          metrics.valid
            ? COLORS.gold
            : '#D9D4CB',
        stroke:
          metrics.valid
            ? '#DB9F1F'
            : '#C4BCAF',
        shadow:
          false
      }
    );

    ui.text(
      ctx,
      metrics.valid
        ? '选择施工队并开始施工  ›'
        : '当前布局存在问题，暂不能施工',
      246,
      y + 17,
      8,
      metrics.valid
        ? COLORS.text
        : COLORS.muted,
      '800',
      'center'
    );

    if (
      metrics.valid
    ) {
      this.addButton(
        'construction:start',
        106,
        y - 4,
        278,
        42
      );
    }
  }

  drawSecondaryHeader(
    ctx,
    title,
    subtitle
  ) {
    const sy =
      this.getScale();

    const y =
      184 *
      sy -
      80 *
      (
        sy -
        1
      );

    ui.card(
      ctx,
      8,
      y,
      374,
      41,
      {
        radius:
          13,
        fill:
          COLORS.panel
      }
    );

    ui.text(
      ctx,
      title,
      20,
      y + 14,
      10,
      COLORS.text,
      '800'
    );

    ui.text(
      ctx,
      subtitle,
      20,
      y + 29,
      5.8,
      COLORS.muted,
      '500'
    );

    ui.card(
      ctx,
      304,
      y + 8,
      65,
      25,
      {
        radius:
          12,
        fill:
          '#FFF6E0',
        stroke:
          '#E4C477',
        shadow:
          false
      }
    );

    ui.text(
      ctx,
      '返回平面图',
      336.5,
      y + 20.5,
      5.9,
      COLORS.navy,
      '800',
      'center'
    );

    this.addButton(
      'page:layout',
      298,
      y + 4,
      78,
      33
    );

    return y + 48;
  }

  renderZones(
    ctx,
    metrics,
    floor
  ) {
    const y =
      this.drawSecondaryHeader(
        ctx,
        '区域面积',
        '调整后厨、仓储、服务区比例，堂食面积自动联动'
      );

    const rows = [
      {
        key:
          'kitchenRatio',
        label:
          '后厨',
        image:
          'v45_layout_kitchen',
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
          'v45_layout_storage',
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
          'v45_layout_service',
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

    let drawY =
      y;

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

      const area =
        floor.area *
        ratio;

      ui.card(
        ctx,
        10,
        drawY,
        370,
        74,
        {
          radius: 13,
          fill:
            COLORS.panel,
          stroke:
            '#DDD2C3',
          shadow: false
        }
      );

      this.drawVisual(
        ctx,
        item.image,
        18,
        drawY + 8,
        74,
        58,
        1
      );

      ui.text(
        ctx,
        item.label,
        105,
        drawY + 17,
        8.5,
        COLORS.text,
        '800'
      );

      ui.text(
        ctx,
        Math.round(
          ratio *
          100
        ) +
        '% · ' +
        area.toFixed(1) +
        '㎡',
        105,
        drawY + 38,
        7.1,
        COLORS.orange,
        '800'
      );

      ui.text(
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
        105,
        drawY + 57,
        5.5,
        COLORS.muted,
        '600'
      );

      ui.card(
        ctx,
        283,
        drawY + 17,
        32,
        32,
        {
          radius: 15,
          fill:
            '#F3EFE7',
          stroke:
            '#D3C8B9',
          shadow: false
        }
      );

      ui.text(
        ctx,
        '−',
        299,
        drawY + 33,
        11,
        COLORS.navy,
        '800',
        'center'
      );

      this.addButton(
        'zone:' +
          item.key +
          ':minus',
        278,
        drawY + 12,
        42,
        42
      );

      ui.card(
        ctx,
        329,
        drawY + 17,
        32,
        32,
        {
          radius: 15,
          fill:
            COLORS.gold,
          stroke:
            '#DDA11F',
          shadow: false
        }
      );

      ui.text(
        ctx,
        '+',
        345,
        drawY + 33,
        10,
        COLORS.text,
        '800',
        'center'
      );

      this.addButton(
        'zone:' +
          item.key +
          ':plus',
        324,
        drawY + 12,
        42,
        42
      );

      drawY +=
        81;
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
      10,
      drawY,
      370,
      72,
      {
        radius: 13,
        fill:
          '#F5FAF7',
        stroke:
          '#C9DFD2',
        shadow: false
      }
    );

    this.drawVisual(
      ctx,
      'v45_layout_dining',
      18,
      drawY + 8,
      84,
      56,
      1
    );

    ui.text(
      ctx,
      '堂食区',
      114,
      drawY + 19,
      8.5,
      COLORS.text,
      '800'
    );

    ui.text(
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
      114,
      drawY + 43,
      7.2,
      COLORS.green,
      '800'
    );

    ui.text(
      ctx,
      '餐位与包厢共用堂食面积',
      250,
      drawY + 43,
      5.3,
      COLORS.muted,
      '600'
    );

    drawY +=
      80;

    const aisle =
      renovationConfig
        .aisleModes[
          floor.aisleMode
        ];

    ui.card(
      ctx,
      10,
      drawY,
      370,
      62,
      {
        radius: 13,
        fill:
          '#FFF8E8',
        stroke:
          '#E5C975',
        shadow: false
      }
    );

    this.drawVisual(
      ctx,
      'v45_layout_corridor',
      18,
      drawY + 8,
      70,
      46,
      1
    );

    ui.text(
      ctx,
      '动线模式',
      101,
      drawY + 18,
      7.6,
      COLORS.text,
      '800'
    );

    ui.text(
      ctx,
      aisle.name +
        ' · 舒适 ' +
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
      101,
      drawY + 41,
      5.6,
      COLORS.muted,
      '600'
    );

    ui.card(
      ctx,
      300,
      drawY + 14,
      62,
      31,
      {
        radius: 15,
        fill:
          COLORS.gold,
        stroke:
          '#DDA11F',
        shadow: false
      }
    );

    ui.text(
      ctx,
      '切换',
      331,
      drawY + 29.5,
      6.2,
      COLORS.text,
      '800',
      'center'
    );

    this.addButton(
      'aisle:cycle',
      294,
      drawY + 9,
      74,
      41
    );
  }

  renderFurniture(
    ctx,
    metrics,
    floor
  ) {
    const y =
      this.drawSecondaryHeader(
        ctx,
        '家具配置',
        '餐桌决定餐位，软装影响舒适度、吸引力和预算'
      );

    ui.text(
      ctx,
      '餐桌组合',
      18,
      y + 13,
      8.3,
      COLORS.text,
      '800'
    );

    const tableKeys = [
      '2',
      '4',
      '6',
      '8'
    ];

    for (
      let i = 0;
      i < 4;
      i++
    ) {
      const key =
        tableKeys[i];

      const x =
        10 +
        i * 93;

      ui.card(
        ctx,
        x,
        y + 27,
        86,
        126,
        {
          radius: 12,
          fill:
            '#FFF9EF',
          stroke:
            '#DDD2C3',
          shadow: false
        }
      );

      this.drawVisual(
        ctx,
        'visual_table_' +
          key,
        x + 8,
        y + 34,
        70,
        63,
        1
      );

      ui.text(
        ctx,
        key +
          '人桌',
        x + 43,
        y + 103,
        6.2,
        COLORS.text,
        '800',
        'center'
      );

      ui.text(
        ctx,
        '数量 ' +
        (
          floor.tables[
            key
          ] || 0
        ),
        x + 43,
        y + 121,
        5.5,
        COLORS.muted,
        '600',
        'center'
      );

      ui.card(
        ctx,
        x + 7,
        y + 130,
        30,
        18,
        {
          radius: 8,
          fill:
            '#F2EEE7',
          stroke:
            '#D4C9BB',
          shadow: false
        }
      );

      ui.text(
        ctx,
        '−',
        x + 22,
        y + 139,
        8,
        COLORS.navy,
        '800',
        'center'
      );

      this.addButton(
        'table:' +
          key +
          ':minus',
        x + 4,
        y + 126,
        36,
        26
      );

      ui.card(
        ctx,
        x + 49,
        y + 130,
        30,
        18,
        {
          radius: 8,
          fill:
            COLORS.gold,
          stroke:
            '#DDA11F',
          shadow: false
        }
      );

      ui.text(
        ctx,
        '+',
        x + 64,
        y + 139,
        7,
        COLORS.text,
        '800',
        'center'
      );

      this.addButton(
        'table:' +
          key +
          ':plus',
        x + 46,
        y + 126,
        36,
        26
      );
    }

    const decorY =
      y + 169;

    ui.text(
      ctx,
      '软装配置',
      18,
      decorY,
      8.3,
      COLORS.text,
      '800'
    );

    const decorItems =
      renovationConfig
        .decorItems;

    for (
      let i = 0;
      i <
      decorItems.length;
      i++
    ) {
      const item =
        decorItems[i];

      const x =
        10 +
        i * 93;

      const count =
        Number(
          metrics
            .decorCounts[
              item.id
            ]
        ) || 0;

      ui.card(
        ctx,
        x,
        decorY + 14,
        86,
        128,
        {
          radius: 12,
          fill:
            '#FFF9EF',
          stroke:
            '#DDD2C3',
          shadow: false
        }
      );

      this.drawVisual(
        ctx,
        item.imageKey,
        x + 8,
        decorY + 21,
        70,
        63,
        1
      );

      ui.text(
        ctx,
        item.name,
        x + 43,
        decorY + 91,
        6.1,
        COLORS.text,
        '800',
        'center'
      );

      ui.text(
        ctx,
        money(
          item.cost
        ) +
          ' · ' +
          count +
          '/' +
          item.max,
        x + 43,
        decorY + 108,
        4.8,
        COLORS.muted,
        '600',
        'center'
      );

      ui.card(
        ctx,
        x + 7,
        decorY + 116,
        30,
        18,
        {
          radius: 8,
          fill:
            '#F2EEE7',
          stroke:
            '#D4C9BB',
          shadow: false
        }
      );

      ui.text(
        ctx,
        '−',
        x + 22,
        decorY + 125,
        8,
        COLORS.navy,
        '800',
        'center'
      );

      this.addButton(
        'decor:' +
          item.id +
          ':minus',
        x + 4,
        decorY + 112,
        36,
        26
      );

      ui.card(
        ctx,
        x + 49,
        decorY + 116,
        30,
        18,
        {
          radius: 8,
          fill:
            COLORS.gold,
          stroke:
            '#DDA11F',
          shadow: false
        }
      );

      ui.text(
        ctx,
        '+',
        x + 64,
        decorY + 125,
        7,
        COLORS.text,
        '800',
        'center'
      );

      this.addButton(
        'decor:' +
          item.id +
          ':plus',
        x + 46,
        decorY + 112,
        36,
        26
      );
    }

    const impactY =
      decorY + 151;

    ui.card(
      ctx,
      10,
      impactY,
      370,
      63,
      {
        radius: 13,
        fill:
          '#F3F8FA',
        stroke:
          '#C7DCE6',
        shadow: false
      }
    );

    ui.text(
      ctx,
      '当前软装 ' +
        money(
          metrics.decorCost
        ),
      22,
      impactY + 19,
      7.1,
      COLORS.text,
      '800'
    );

    ui.text(
      ctx,
      '装修评分 ' +
        metrics
          .renovationScore,
      151,
      impactY + 19,
      7.1,
      COLORS.orange,
      '800'
    );

    ui.text(
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
      22,
      impactY + 44,
      5.4,
      COLORS.muted,
      '600'
    );
  }

  renderContractors(
    ctx,
    metrics
  ) {
    const y =
      this.drawSecondaryHeader(
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

    let drawY =
      y;

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
        10,
        drawY,
        370,
        88,
        {
          radius: 13,
          fill:
            selected
              ? '#FFF8DE'
              : COLORS.panel,
          stroke:
            selected
              ? '#E2B52B'
              : '#DDD2C3',
          shadow: false
        }
      );

      this.drawVisual(
        ctx,
        'v45_advice_renovation',
        18,
        drawY + 9,
        64,
        70,
        1
      );

      ui.text(
        ctx,
        quote.name,
        95,
        drawY + 19,
        8.1,
        COLORS.text,
        '800'
      );

      ui.text(
        ctx,
        '报价 ' +
          money(
            quote.price
          ) +
          ' · 工期 ' +
          quote.days +
          '天',
        95,
        drawY + 41,
        6.1,
        COLORS.orange,
        '800'
      );

      ui.text(
        ctx,
        '可靠度 ' +
          quote
            .reliability +
          ' · 质量 ' +
          quote
            .quality,
        95,
        drawY + 62,
        5.5,
        COLORS.muted,
        '600'
      );

      ui.card(
        ctx,
        303,
        drawY + 24,
        57,
        32,
        {
          radius: 15,
          fill:
            selected
              ? COLORS.gold
              : '#E7F2F7',
          stroke:
            selected
              ? '#DDA11F'
              : '#AFCFDD',
          shadow: false
        }
      );

      ui.text(
        ctx,
        selected
          ? '已选'
          : '选择',
        331.5,
        drawY + 40,
        6.2,
        COLORS.text,
        '800',
        'center'
      );

      this.addButton(
        'contractor:select:' +
          quote.id,
        296,
        drawY + 18,
        71,
        44
      );

      drawY +=
        96;
    }

    ui.card(
      ctx,
      10,
      drawY,
      370,
      73,
      {
        radius: 13,
        fill:
          metrics.valid
            ? '#F2F9F4'
            : '#FFF1EC',
        stroke:
          metrics.valid
            ? '#BDDCC7'
            : '#E4B6A9',
        shadow: false
      }
    );

    ui.text(
      ctx,
      '装修评分 ' +
        metrics
          .renovationScore +
        ' · 预算 ' +
        money(
          metrics.totalCost
        ),
      22,
      drawY + 20,
      7.2,
      metrics.valid
        ? COLORS.green
        : COLORS.red,
      '800'
    );

    ui.text(
      ctx,
      '预计经营影响：客流 ×' +
        metrics
          .operatingImpact
          .trafficFactor
          .toFixed(2) +
        ' · 客单 ×' +
        metrics
          .operatingImpact
          .spendFactor
          .toFixed(2),
      22,
      drawY + 43,
      5.3,
      COLORS.muted,
      '600'
    );

    ui.card(
      ctx,
      252,
      drawY + 17,
      108,
      38,
      {
        radius: 18,
        fill:
          metrics.valid
            ? COLORS.gold
            : '#D9D4CB',
        stroke:
          metrics.valid
            ? '#DDA11F'
            : '#C4BCAF',
        shadow: false
      }
    );

    ui.text(
      ctx,
      metrics.valid
        ? '确认施工'
        : '方案无效',
      306,
      drawY + 36,
      7,
      metrics.valid
        ? COLORS.text
        : COLORS.muted,
      '800',
      'center'
    );

    if (
      metrics.valid
    ) {
      this.addButton(
        'construction:confirm',
        245,
        drawY + 11,
        122,
        50
      );
    }
  }

  renderRooms(
    ctx,
    metrics,
    floor
  ) {
    const y =
      this.drawSecondaryHeader(
        ctx,
        '包厢管理',
        '添加、改名、调整人数和风格'
      );

    const bottom =
      this.contentBottom -
      12;

    const available =
      bottom -
      y;

    const rooms =
      floor.privateRooms;

    const rowH =
      Math.max(
        56,
        Math.min(
          74,
          available /
            Math.max(
              1,
              Math.min(
                rooms.length +
                  1,
                6
              )
            )
        )
      );

    let drawY =
      y;

    for (
      let i = 0;
      i <
      Math.min(
        rooms.length,
        5
      );
      i++
    ) {
      const room =
        rooms[i];

      ui.card(
        ctx,
        10,
        drawY,
        370,
        rowH - 6,
        {
          radius:
            12,
          fill:
            '#FFF9EF',
          stroke:
            '#DDD2C3',
          shadow:
            false
        }
      );

      this.drawVisual(
        ctx,
        'visual_table_8',
        19,
        drawY + 7,
        47,
        rowH - 20,
        0.98
      );

      ui.text(
        ctx,
        room.name,
        76,
        drawY + 18,
        8.2,
        COLORS.text,
        '800'
      );

      ui.text(
        ctx,
        room.seats +
          '人 · ' +
          this.getName(
            renovationConfig
              .privateRoomStyles,
            room.style
          ),
        76,
        drawY + 38,
        6.2,
        COLORS.muted,
        '600'
      );

      const controls = [
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
        j <
        controls.length;
        j++
      ) {
        const x =
          196 +
          j * 43;

        ui.card(
          ctx,
          x,
          drawY + 14,
          38,
          27,
          {
            radius:
              10,
            fill:
              j === 3
                ? '#FFF0EB'
                : '#FFF5D9',
            stroke:
              j === 3
                ? '#E8B1A8'
                : '#E1C16D',
            shadow:
              false
          }
        );

        ui.text(
          ctx,
          controls[j][1],
          x + 19,
          drawY + 27.5,
          5.7,
          j === 3
            ? COLORS.red
            : COLORS.navy,
          '800',
          'center'
        );

        this.addButton(
          controls[j][0],
          x - 3,
          drawY + 10,
          44,
          35
        );
      }

      drawY +=
        rowH;
    }

    if (
      rooms.length <
      8 &&
      drawY <
        bottom -
        45
    ) {
      ui.card(
        ctx,
        10,
        drawY,
        370,
        39,
        {
          radius:
            14,
          fill:
            '#FFF8E4',
          stroke:
            '#E8C874',
          shadow:
            false
        }
      );

      ui.text(
        ctx,
        '+ 添加一个新包厢',
        195,
        drawY + 19.5,
        7.4,
        COLORS.navy,
        '800',
        'center'
      );

      this.addButton(
        'room:add',
        6,
        drawY - 3,
        378,
        45
      );
    }
  }

  renderStyle(
    ctx,
    metrics
  ) {
    const y =
      this.drawSecondaryHeader(
        ctx,
        '装修风格',
        '大厅、材料和灯光均会联动成本与吸引力'
      );

    const plan =
      metrics.plan;

    const rows = [
      {
        id:
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
          'v45_style_natural'
      },
      {
        id:
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
          plan.materialGrade === 'premium'
            ? 'v45_style_business'
            : plan.materialGrade === 'good'
              ? 'v45_style_chinese'
              : 'v45_style_natural'
      },
      {
        id:
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
          plan.lightingLevel === 'premium'
            ? 'v45_style_business'
            : plan.lightingLevel === 'layered'
              ? 'v45_style_modern'
              : 'v45_style_natural'
      }
    ];

    let drawY =
      y;

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
        10,
        drawY,
        370,
        82,
        {
          radius:
            14,
          fill:
            COLORS.panel
        }
      );

      this.drawVisual(
        ctx,
        item.key,
        18,
        drawY + 8,
        96,
        66,
        1
      );

      ui.text(
        ctx,
        item.label,
        128,
        drawY + 24,
        8.5,
        COLORS.text,
        '800'
      );

      ui.text(
        ctx,
        item.value,
        128,
        drawY + 50,
        7.5,
        COLORS.orange,
        '700'
      );

      ui.card(
        ctx,
        292,
        drawY + 23,
        69,
        34,
        {
          radius:
            16,
          fill:
            COLORS.gold,
          stroke:
            '#DDA11F',
          shadow:
            false
        }
      );

      ui.text(
        ctx,
        '切换 ›',
        326.5,
        drawY + 40,
        6.7,
        COLORS.text,
        '800',
        'center'
      );

      this.addButton(
        item.id,
        286,
        drawY + 18,
        81,
        44
      );

      drawY +=
        90;
    }
  }

  renderTemplates(
    ctx
  ) {
    const y =
      this.drawSecondaryHeader(
        ctx,
        '模板管理',
        '保存、套用、改名或删除你的装修模板'
      );

    const templates =
      customizationSystem
        .getTemplateList();

    let drawY =
      y;

    if (
      !templates.length
    ) {
      ui.card(
        ctx,
        10,
        drawY,
        370,
        96,
        {
          radius:
            14,
          fill:
            COLORS.panel
        }
      );

      ui.text(
        ctx,
        '暂时还没有自定义模板',
        195,
        drawY + 31,
        9,
        COLORS.text,
        '800',
        'center'
      );

      ui.text(
        ctx,
        '点击顶部“保存模板”即可保存当前装修方案。',
        195,
        drawY + 57,
        6.3,
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
        10,
        drawY,
        370,
        57,
        {
          radius:
            12,
          fill:
            '#FFF9EF',
          stroke:
            '#DDD2C3',
          shadow:
            false
        }
      );

      ui.text(
        ctx,
        item.name,
        22,
        drawY + 19,
        8.1,
        COLORS.text,
        '800'
      );

      ui.text(
        ctx,
        item.sourceFloorCount +
          '层 · 原面积 ' +
          Math.round(
            item.sourceArea
          ) +
          '㎡',
        22,
        drawY + 38,
        5.8,
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
        j <
        actions.length;
        j++
      ) {
        const x =
          239 +
          j * 44;

        ui.card(
          ctx,
          x,
          drawY + 14,
          39,
          28,
          {
            radius:
              10,
            fill:
              j === 2
                ? '#FFF0EB'
                : '#FFF5D9',
            stroke:
              j === 2
                ? '#E7B0A6'
                : '#E1C16D',
            shadow:
              false
          }
        );

        ui.text(
          ctx,
          actions[j][1],
          x + 19.5,
          drawY + 28,
          5.7,
          j === 2
            ? COLORS.red
            : COLORS.navy,
          '800',
          'center'
        );

        this.addButton(
          actions[j][0],
          x - 3,
          drawY + 10,
          45,
          36
        );
      }

      drawY +=
        64;
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

    ui.card(
      ctx,
      15,
      120,
      360,
      258,
      {
        radius:
          18,
        fill:
          COLORS.panel
      }
    );

    this.drawVisual(
      ctx,
      'v45_advice_renovation',
      28,
      137,
      78,
      95,
      1
    );

    ui.text(
      ctx,
      plan.status ===
        'completed'
        ? '装修已经完工'
        : '装修施工中',
      228,
      157,
      16,
      COLORS.text,
      '800',
      'center'
    );

    ui.text(
      ctx,
      construction
        ? construction.contractor.name
        : '施工团队',
      195,
      192,
      8.3,
      COLORS.orange,
      '700',
      'center'
    );

    ui.text(
      ctx,
      construction
        ? (
            '已支付 ' +
            money(
              construction.paid
            ) +
            ' · 预计 ' +
            construction.contractor.days +
            ' 天'
          )
        : '',
      195,
      222,
      7,
      COLORS.muted,
      '600',
      'center'
    );

    ui.card(
      ctx,
      45,
      256,
      300,
      12,
      {
        radius:
          6,
        fill:
          '#E7E0D5',
        stroke:
          false,
        shadow:
          false
      }
    );

    ui.card(
      ctx,
      45,
      256,
      plan.status ===
        'completed'
        ? 300
        : 168,
      12,
      {
        radius:
          6,
        fill:
          COLORS.gold,
        stroke:
          false,
        shadow:
          false
      }
    );

    ui.text(
      ctx,
      plan.status ===
        'completed'
        ? '可以返回门店继续筹备开业'
        : '施工期间仍可查看进度，完成后自动进入下一阶段',
      195,
      306,
      6.8,
      COLORS.muted,
      '600',
      'center'
    );

    ui.card(
      ctx,
      69,
      330,
      252,
      36,
      {
        radius:
          18,
        fill:
          COLORS.gold,
        stroke:
          '#DDA11F',
        shadow:
          false
      }
    );

    ui.text(
      ctx,
      '返回门店  ›',
      195,
      348,
      8,
      COLORS.text,
      '800',
      'center'
    );

    this.addButton(
      'back',
      63,
      325,
      264,
      46
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

    this.drawTemplateStrip(
      ctx
    );

    const floor =
      metrics.floors[
        plan.activeFloor
      ];

    if (
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
        'contractors'
    ) {
      this.renderContractors(
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
        'style'
    ) {
      this.renderStyle(
        ctx,
        metrics
      );
    } else if (
      this.page ===
        'templates'
    ) {
      this.renderTemplates(
        ctx
      );
    } else {
      this.drawFloorPlan(
        ctx,
        metrics,
        floor
      );

      this.drawTablePicker(
        ctx,
        floor
      );

      this.drawMetrics(
        ctx,
        metrics
      );

      this.drawFooter(
        ctx,
        metrics
      );
    }

    ctx.restore();
  }

  saveTemplate(
    mode
  ) {
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
      id ===
      'back'
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
            shop.name ||
            '',
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
      const metrics =
        this.getMetrics();

      if (metrics) {
        this.showToast(
          '装修评分 ' +
            metrics.renovationScore +
            ' · 座位 ' +
            metrics.totalSeats +
            ' · 舒适度 ' +
            Math.round(
              metrics.comfort *
              100
            ) +
            ' · 吸引力 ' +
            Math.round(
              metrics.appeal *
              100
            )
        );
      }

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
        'zone:'
      ) ===
      0
    ) {
      const parts =
        id.split(':');

      const key =
        parts[1];

      const delta =
        parts[2] ===
          'plus'
          ? 0.02
          : -0.02;

      const plan =
        this.getPlan();

      renovationSystem
        .adjustZone(
          this.shopId,
          plan.activeFloor,
          key,
          delta
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
      id.indexOf(
        'page:'
      ) ===
      0
    ) {
      this.page =
        id.split(':')[1];

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

      renovationSystem
        .adjustTable(
          this.shopId,
          floorIndex,
          Number(
            parts[1]
          ),
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

      this.page =
        'style';

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

      this.page =
        'style';

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

      this.page =
        'style';

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
          'room:rename:'.length
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
              room.name ||
              '',
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

      const plan =
        this.getPlan();

      if (
        !plan
          .selectedContractorId &&
        quotes[0]
      ) {
        renovationSystem
          .selectContractor(
            this.shopId,
            quotes[0].id
          );
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

      textInput
        .requestRender();

      return true;
    }

    return false;
  }
}

module.exports =
  new RenovationScene();
