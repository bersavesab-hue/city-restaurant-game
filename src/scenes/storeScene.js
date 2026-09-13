'use strict';

// V16_STORE_UI_REWRITE
// 门店主页彻底重做：不再叠旧布局，按正式目标UI重新排版。

const runtime =
  globalThis.GameRuntime;

if (!runtime) {
  throw new Error(
    'StoreScene：GameRuntime 未初始化'
  );
}

const api =
  runtime.api || {};

const gameState =
  require('../core/gameState.js');

const citySystem =
  require('../city/citySystem.js');

const simulationSystem =
  require('../core/simulationSystem.js');

const sceneManager =
  require('../core/sceneManager.js');

const renovationSystem =
  require('../renovation/renovationSystem.js');

const openingPrepSystem =
  require('../opening/openingPrepSystem.js');

const openingFinanceSystem =
  require('../finance/openingFinanceSystem.js');

const customizationSystem =
  require('../ui/customizationSystem.js');

const textInput =
  require('../ui/textInput.js');

const visualAssetSystem =
  require('../ui/visualAssetSystem.js');

const ui =
  require('../ui/premiumUi.js');

const DESIGN_W =
  390;

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
  return (
    '¥' +
    Math.max(
      0,
      Math.round(
        Number(value) ||
        0
      )
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

class StoreScene {
  constructor() {
    this.id =
      'shop';

    this.viewH =
      780;

    this.navH =
      64;

    this.contentBottom =
      716;

    this.buttons =
      [];
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

  enter() {
    visualAssetSystem
      .loadGroup(
        'store'
      );

    visualAssetSystem
      .loadGroup(
        'premiumStore'
      );

    visualAssetSystem
      .loadGroup(
        'renovation'
      );
  }

  exit() {
    this.buttons =
      [];
  }

  update() {
    const shop =
      this.getCurrentShop();

    if (!shop) {
      return;
    }

    renovationSystem
      .updateShop(
        shop.id
      );

    openingPrepSystem
      .updateShop(
        shop.id
      );
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

  getCurrentShop() {
    const business =
      gameState
        .getBusiness();

    if (
      !business.hasShop ||
      !business.shops.length
    ) {
      return null;
    }

    return (
      business.shops.find(
        item =>
          item.id ===
          business.currentShopId
      ) ||
      business.shops[0]
    );
  }

  getRooms(shopId) {
    const plan =
      renovationSystem
        .ensurePlan(
          shopId
        );

    if (!plan) {
      return [];
    }

    const rooms =
      [];

    for (
      const floor of
      plan.floors
    ) {
      for (
        const room of
        floor.privateRooms
      ) {
        rooms.push(
          room
        );
      }
    }

    return rooms;
  }

  getScale() {
    return clamp(
      (
        this.contentBottom -
        90
      ) /
      560,
      0.88,
      1.13
    );
  }

  drawHeader(
    ctx,
    shop
  ) {
    const h =
      90;

    ui.coverImage(
      ctx,
      visualAssetSystem
        .get(
          'premium_explore_banner'
        ),
      0,
      0,
      DESIGN_W,
      h,
      0,
      'rgba(4,31,48,0.50)'
    );

    ctx.fillStyle =
      'rgba(4,35,54,0.44)';

    ctx.fillRect(
      0,
      0,
      DESIGN_W,
      h
    );

    ui.card(
      ctx,
      8,
      13,
      39,
      39,
      {
        radius:
          11,
        fill:
          'rgba(5,47,67,0.88)',
        stroke:
          'rgba(255,255,255,0.30)',
        shadow:
          false
      }
    );

    ui.text(
      ctx,
      '‹',
      27.5,
      32.5,
      22,
      '#FFE59B',
      '800',
      'center'
    );

    this.addButton(
      'go-city',
      4,
      9,
      47,
      47
    );

    const cityName =
      gameState
        .getCityName() ||
      '城市名称';

    ui.text(
      ctx,
      cityName,
      58,
      22,
      15,
      COLORS.white,
      '800'
    );

    ui.text(
      ctx,
      '打造属于你的美食帝国',
      58,
      44,
      7,
      '#DAEAF0',
      '600'
    );

    ui.card(
      ctx,
      285,
      11,
      96,
      43,
      {
        radius:
          12,
        fill:
          'rgba(5,39,59,0.86)',
        stroke:
          'rgba(255,255,255,0.30)',
        shadow:
          false
      }
    );

    ui.text(
      ctx,
      money(
        gameState
          .getPlayer()
          .cash
      ),
      333,
      26,
      11.4,
      '#FFF0A9',
      '800',
      'center'
    );

    ui.text(
      ctx,
      '可用资金',
      333,
      44,
      6.3,
      '#D9E9EE',
      '600',
      'center'
    );

    const bulletin =
      simulationSystem
        .getBulletin();

    ui.card(
      ctx,
      8,
      61,
      374,
      23,
      {
        radius:
          11,
        fill:
          'rgba(3,39,59,0.88)',
        stroke:
          'rgba(64,183,230,0.35)',
        shadow:
          false
      }
    );

    ui.text(
      ctx,
      '📣 城市动态',
      15,
      72.5,
      6.7,
      '#FFD46B',
      '800'
    );

    ui.text(
      ctx,
      (
        bulletin.title +
        ' · ' +
        bulletin.detail
      ).slice(
        0,
        42
      ),
      87,
      72.5,
      6.1,
      COLORS.white,
      '600'
    );

    if (shop) {
      const district =
        citySystem
          .getDistrict(
            shop.districtId
          );

      ui.text(
        ctx,
        district
          ? district.name
          : '',
        374,
        72.5,
        5.8,
        '#D9E9EE',
        '600',
        'right'
      );
    }
  }

  drawStoreHero(
    ctx,
    shop,
    readiness
  ) {
    const sy =
      this.getScale();

    const y =
      96;

    const h =
      140 *
      sy;

    ui.card(
      ctx,
      9,
      y,
      372,
      h,
      {
        radius:
          17,
        fill:
          COLORS.panel
      }
    );

    ui.coverImage(
      ctx,
      visualAssetSystem
        .get(
          'premium_store_hero'
        ) ||
      visualAssetSystem
        .get(
          'visual_storefront_hero'
        ),
      211,
      y + 6,
      161,
      h - 12,
      13,
      null
    );

    const status =
      shop.status ===
        'open'
        ? '营业中'
        : readiness.ready
          ? '可试营业'
          : shop.status ===
              'renovating'
            ? '装修中'
            : readiness
                .renovationReady
              ? '开业筹备'
              : '已签约';

    ui.pill(
      ctx,
      '✓ ' +
        status,
      20,
      y + 13,
      72,
      24,
      '#FFF0C1',
      '#A9681F'
    );

    ui.text(
      ctx,
      shop.name ||
        '我的酒楼',
      20,
      y + 59,
      17,
      COLORS.text,
      '800'
    );

    ui.text(
      ctx,
      '📍 ' +
        shop.address,
      20,
      y + 85,
      7,
      COLORS.text,
      '600'
    );

    ui.text(
      ctx,
      '一座好酒楼，从这里开始！',
      21,
      y + 111,
      7.4,
      COLORS.orange,
      '700'
    );

    ui.card(
      ctx,
      20,
      y + h - 32,
      80,
      24,
      {
        radius:
          12,
        fill:
          '#FFF5D8',
        stroke:
          '#E8C36C',
        shadow:
          false
      }
    );

    ui.text(
      ctx,
      '✎ 修改名称',
      60,
      y + h - 20,
      6.6,
      COLORS.orange,
      '800',
      'center'
    );

    this.addButton(
      'shop:rename',
      16,
      y + h - 37,
      88,
      34
    );

    ui.card(
      ctx,
      111,
      y + h - 32,
      80,
      24,
      {
        radius:
          12,
        fill:
          '#FFFDF7',
        stroke:
          '#D8CCBE',
        shadow:
          false
      }
    );

    ui.text(
      ctx,
      '⚙ 门店设置',
      151,
      y + h - 20,
      6.4,
      COLORS.navy,
      '800',
      'center'
    );

    this.addButton(
      'store:settings',
      107,
      y + h - 37,
      88,
      34
    );
  }

  drawRooms(
    ctx,
    shop
  ) {
    const sy =
      this.getScale();

    const y =
      243 *
      sy -
      90 *
      (
        sy -
        1
      );

    const h =
      102 *
      sy;

    const rooms =
      this.getRooms(
        shop.id
      );

    ui.card(
      ctx,
      9,
      y,
      372,
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
      '包厢名称',
      20,
      y + 19,
      10.2,
      COLORS.text,
      '800'
    );

    ui.text(
      ctx,
      '精致包厢 · 宴请宾朋 · 名称和风格可自定义',
      83,
      y + 19,
      5.9,
      COLORS.muted,
      '500'
    );

    ui.card(
      ctx,
      304,
      y + 8,
      65,
      23,
      {
        radius:
          11,
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
      '管理包厢 ›',
      336.5,
      y + 19.5,
      6.1,
      COLORS.navy,
      '800',
      'center'
    );

    this.addButton(
      'room:manage',
      298,
      y + 4,
      78,
      31
    );

    const images = [
      'premium_room_1',
      'premium_room_2',
      'premium_room_3'
    ];

    const cardW =
      82;

    const gap =
      8;

    const cardY =
      y + 34;

    const cardH =
      h - 42;

    for (
      let i = 0;
      i < 4;
      i++
    ) {
      const x =
        18 +
        i *
        (
          cardW +
          gap
        );

      ui.card(
        ctx,
        x,
        cardY,
        cardW,
        cardH,
        {
          radius:
            8,
          fill:
            '#FBF7EF',
          stroke:
            '#DFD4C5',
          shadow:
            false
        }
      );

      if (
        i < 3 &&
        rooms[i]
      ) {
        ui.coverImage(
          ctx,
          visualAssetSystem
            .get(
              images[i]
            ),
          x + 2,
          cardY + 2,
          cardW - 4,
          Math.max(
            33,
            cardH - 20
          ),
          7,
          null
        );

        ui.text(
          ctx,
          rooms[i].name ||
            (
              '包厢' +
              (
                i + 1
              )
            ),
          x + 5,
          cardY + cardH - 7,
          6,
          COLORS.text,
          '700'
        );

        ui.text(
          ctx,
          '✎',
          x + cardW - 12,
          cardY + cardH - 7,
          6.3,
          COLORS.navy,
          '800',
          'center'
        );

        this.addButton(
          'room:rename:' +
            rooms[i].id,
          x + cardW - 25,
          cardY + cardH - 22,
          28,
          28
        );
      } else if (
        i === 3
      ) {
        ui.text(
          ctx,
          '+',
          x + cardW / 2,
          cardY + cardH * 0.42,
          16,
          '#A29180',
          '500',
          'center'
        );

        ui.text(
          ctx,
          '添加包厢',
          x + cardW / 2,
          cardY + cardH * 0.72,
          6.1,
          COLORS.navy,
          '700',
          'center'
        );

        this.addButton(
          'room:manage',
          x,
          cardY,
          cardW,
          cardH
        );
      } else {
        ui.text(
          ctx,
          '待规划',
          x + cardW / 2,
          cardY + cardH * 0.43,
          6.5,
          COLORS.muted,
          '700',
          'center'
        );

        ui.text(
          ctx,
          '进入装修添加',
          x + cardW / 2,
          cardY + cardH * 0.70,
          5.3,
          COLORS.muted,
          '500',
          'center'
        );

        this.addButton(
          'room:manage',
          x,
          cardY,
          cardW,
          cardH
        );
      }
    }
  }

  drawProgress(
    ctx,
    active
  ) {
    const sy =
      this.getScale();

    const y =
      352 *
      sy -
      90 *
      (
        sy -
        1
      );

    const h =
      83 *
      sy;

    ui.card(
      ctx,
      9,
      y,
      372,
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
      '开店进度',
      20,
      y + 19,
      10.2,
      COLORS.text,
      '800'
    );

    ui.card(
      ctx,
      306,
      y + 7,
      62,
      23,
      {
        radius:
          11,
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
      '查看详情 ›',
      337,
      y + 18.5,
      5.9,
      COLORS.navy,
      '800',
      'center'
    );

    const labels = [
      '选址',
      '签约',
      '装修',
      '证照',
      '招聘',
      '开业'
    ];

    const startX =
      37;

    const gap =
      62;

    const lineY =
      y +
      h *
      0.58;

    for (
      let i = 0;
      i < 6;
      i++
    ) {
      const x =
        startX +
        i *
        gap;

      if (
        i < 5
      ) {
        ctx.fillStyle =
          i <
            active - 1
            ? '#DDA52A'
            : '#D8D2C9';

        ctx.fillRect(
          x + 13,
          lineY - 1,
          gap - 26,
          3
        );
      }

      const done =
        i <
        active - 1;

      const current =
        i ===
        active - 1;

      ctx.beginPath();

      ctx.arc(
        x,
        lineY,
        11.5,
        0,
        Math.PI *
          2
      );

      ctx.fillStyle =
        done
          ? '#DDA52A'
          : current
            ? COLORS.gold
            : '#E7E2DA';

      ctx.fill();

      ui.text(
        ctx,
        done
          ? '✓'
          : String(
              i + 1
            ),
        x,
        lineY,
        7.4,
        done
          ? COLORS.white
          : COLORS.text,
        '800',
        'center'
      );

      ui.text(
        ctx,
        labels[i],
        x,
        lineY + 23,
        6.4,
        COLORS.text,
        '700',
        'center'
      );
    }
  }

  drawAdvice(
    ctx,
    shop,
    readiness
  ) {
    const sy =
      this.getScale();

    const y =
      442 *
      sy -
      90 *
      (
        sy -
        1
      );

    const h =
      106 *
      sy;

    ui.card(
      ctx,
      9,
      y,
      372,
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
      '下一步建议',
      20,
      y + 20,
      10.5,
      COLORS.text,
      '800'
    );

    ui.text(
      ctx,
      '稳扎稳打，开好每一家店！',
      368,
      y + 20,
      6.2,
      COLORS.orange,
      '700',
      'right'
    );

    const cards = [
      {
        id:
          readiness.ready &&
          shop.status !==
            'open'
            ? 'trial'
            : 'renovation',
        key:
          'premium_advice_renovation',
        title:
          readiness.ready &&
          shop.status !==
            'open'
            ? '开始试营业'
            : '开始店面装修',
        sub:
          readiness.renovationReady
            ? '查看并调整当前装修方案'
            : '选择装修风格，打造独特体验',
        action:
          readiness.ready &&
          shop.status !==
            'open'
            ? '开业'
            : '去装修'
      },
      {
        id:
          'license',
        key:
          'premium_advice_permit',
        title:
          '办理营业证照',
        sub:
          readiness.permitsReady
            ? '证照已齐，可查看办理详情'
            : '完成各类证照办理',
        action:
          '去办证照'
      },
      {
        id:
          'staff',
        key:
          'premium_advice_staff',
        title:
          '招聘经营团队',
        sub:
          readiness.staffingReady
            ? '基础班组已齐'
            : '组建专业团队准备开业',
        action:
          '去招聘'
      }
    ];

    const cardW =
      113;

    for (
      let i = 0;
      i < 3;
      i++
    ) {
      const item =
        cards[i];

      const x =
        17 +
        i *
        119;

      const top =
        y + 31;

      ui.card(
        ctx,
        x,
        top,
        cardW,
        h - 38,
        {
          radius:
            10,
          fill:
            '#FFF9EF',
          stroke:
            '#E2D8CB',
          shadow:
            false
        }
      );

      ui.coverImage(
        ctx,
        visualAssetSystem
          .get(
            item.key
          ),
        x + 4,
        top + 4,
        44,
        h - 46,
        7,
        null
      );

      ui.text(
        ctx,
        item.title,
        x + 52,
        top + 15,
        6.5,
        COLORS.text,
        '800'
      );

      ui.text(
        ctx,
        item.sub,
        x + 52,
        top + 31,
        5.2,
        COLORS.muted,
        '500'
      );

      ui.card(
        ctx,
        x + 51,
        top + h - 67,
        55,
        22,
        {
          radius:
            11,
          fill:
            COLORS.gold,
          stroke:
            '#E1A31F',
          shadow:
            false
        }
      );

      ui.text(
        ctx,
        item.action +
          ' ›',
        x + 78.5,
        top + h - 56,
        5.7,
        COLORS.text,
        '800',
        'center'
      );

      this.addButton(
        'module:' +
          item.id,
        x,
        top,
        cardW,
        h - 38
      );
    }
  }

  drawExplore(
    ctx
  ) {
    const y =
      this.contentBottom -
      66;

    ui.coverImage(
      ctx,
      visualAssetSystem
        .get(
          'premium_explore_banner'
        ),
      10,
      y,
      370,
      57,
      13,
      'rgba(3,34,51,0.44)'
    );

    ui.text(
      ctx,
      '探索更多优质商圈',
      66,
      y + 20,
      9.5,
      COLORS.white,
      '800'
    );

    ui.text(
      ctx,
      '寻找下一个黄金地段，扩展你的餐饮版图',
      66,
      y + 38,
      5.9,
      '#E5F0F4',
      '600'
    );

    ui.card(
      ctx,
      295,
      y + 13,
      68,
      31,
      {
        radius:
          15,
        fill:
          COLORS.gold,
        stroke:
          '#E1A11D',
        shadow:
          false
      }
    );

    ui.text(
      ctx,
      '去拓展 ›',
      329,
      y + 28.5,
      6.7,
      COLORS.text,
      '800',
      'center'
    );

    this.addButton(
      'go-city',
      289,
      y + 7,
      80,
      43
    );
  }

  renderNoShop(
    ctx
  ) {
    this.drawHeader(
      ctx,
      null
    );

    const available =
      this.contentBottom -
      104;

    const heroH =
      Math.max(
        205,
        Math.min(
          292,
          available *
            0.44
        )
      );

    ui.card(
      ctx,
      10,
      99,
      370,
      heroH,
      {
        radius:
          18,
        fill:
          COLORS.panel
      }
    );

    ui.coverImage(
      ctx,
      visualAssetSystem
        .get(
          'premium_explore_banner'
        ),
      18,
      107,
      354,
      heroH *
        0.55,
      14,
      'rgba(4,31,46,0.17)'
    );

    ui.text(
      ctx,
      '还没有自己的门店',
      28,
      126 +
        heroH *
        0.55,
      15,
      COLORS.text,
      '800'
    );

    ui.text(
      ctx,
      '从商圈、房源、谈判到装修，第一家店从选址开始。',
      28,
      151 +
        heroH *
        0.55,
      7.1,
      COLORS.muted,
      '600'
    );

    ui.card(
      ctx,
      27,
      168 +
        heroH *
        0.55,
      335,
      38,
      {
        radius:
          19,
        fill:
          COLORS.gold,
        stroke:
          '#DEA11F',
        shadow:
          false
      }
    );

    ui.text(
      ctx,
      '去城市地图选择黄金商圈  ›',
      194.5,
      187 +
        heroH *
        0.55,
      8.2,
      COLORS.text,
      '800',
      'center'
    );

    this.addButton(
      'go-city',
      22,
      163 +
        heroH *
        0.55,
      345,
      48
    );

    const processY =
      112 +
      heroH;

    const processH =
      Math.max(
        118,
        this.contentBottom -
        processY -
        12
      );

    ui.card(
      ctx,
      10,
      processY,
      370,
      processH,
      {
        radius:
          16,
        fill:
          COLORS.panel
      }
    );

    ui.text(
      ctx,
      '开店流程',
      22,
      processY + 23,
      10.5,
      COLORS.text,
      '800'
    );

    const steps = [
      [
        '1',
        '选择商圈',
        '先看人口、需求、客单和竞争'
      ],
      [
        '2',
        '挑选房源',
        '实地看铺，确认面积、排烟和风险'
      ],
      [
        '3',
        '谈判签约',
        '租金、转让费、免租期都能谈'
      ],
      [
        '4',
        '装修筹备',
        '布局、设备、证照、招聘后开业'
      ]
    ];

    const rowH =
      Math.max(
        25,
        (
          processH -
          38
        ) /
        4
      );

    for (
      let i = 0;
      i < 4;
      i++
    ) {
      const cy =
        processY +
        45 +
        i *
        rowH;

      ctx.beginPath();

      ctx.arc(
        36,
        cy,
        10,
        0,
        Math.PI *
          2
      );

      ctx.fillStyle =
        i === 0
          ? COLORS.gold
          : '#E3DDD3';

      ctx.fill();

      ui.text(
        ctx,
        steps[i][0],
        36,
        cy,
        6.7,
        COLORS.text,
        '800',
        'center'
      );

      ui.text(
        ctx,
        steps[i][1],
        56,
        cy - 5,
        7.5,
        COLORS.text,
        '800'
      );

      ui.text(
        ctx,
        steps[i][2],
        56,
        cy + 10,
        5.9,
        COLORS.muted,
        '500'
      );
    }
  }

  renderShop(
    ctx,
    shop
  ) {
    this.drawHeader(
      ctx,
      shop
    );

    const readiness =
      openingPrepSystem
        .getReadiness(
          shop.id
        );

    const finance =
      openingFinanceSystem
        .getRecoveryStatus(
          shop.id
        );

    this.drawStoreHero(
      ctx,
      shop,
      readiness
    );

    this.drawRooms(
      ctx,
      shop
    );

    let active =
      2;

    if (
      readiness
        .renovationReady
    ) {
      active =
        4;
    } else if (
      shop.status ===
        'renovating'
    ) {
      active =
        3;
    }

    if (
      readiness
        .permitsReady
    ) {
      active =
        5;
    }

    if (
      readiness
        .ready
    ) {
      active =
        6;
    }

    this.drawProgress(
      ctx,
      active
    );

    this.drawAdvice(
      ctx,
      shop,
      readiness
    );

    if (
      finance &&
      finance.gap >
        0 &&
      finance.offer &&
      !finance.offer
        .existing
    ) {
      const y =
        this.contentBottom -
        103;

      ui.card(
        ctx,
        20,
        y,
        176,
        30,
        {
          radius:
            14,
          fill:
            '#FFF3D8',
          stroke:
            '#E6BF69',
          shadow:
            false
        }
      );

      ui.text(
        ctx,
        '资金缺口 ' +
          money(
            finance.gap
          ) +
          ' · 可申请周转金 ›',
        108,
        y + 15,
        6.1,
        COLORS.orange,
        '800',
        'center'
      );

      this.addButton(
        'module:finance',
        16,
        y - 4,
        184,
        38
      );
    }

    this.drawExplore(
      ctx
    );
  }

  render(ctx) {
    if (!ctx) {
      return;
    }

    this.getLayout();

    this.buttons =
      [];

    ctx.save();

    ctx.fillStyle =
      COLORS.paper;

    ctx.fillRect(
      0,
      0,
      DESIGN_W,
      this.viewH
    );

    const shop =
      this.getCurrentShop();

    if (shop) {
      this.renderShop(
        ctx,
        shop
      );
    } else {
      this.renderNoShop(
        ctx
      );
    }

    ctx.restore();
  }

  showToast(
    title
  ) {
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

    if (
      item.id ===
      'go-city'
    ) {
      sceneManager
        .switchTo(
          'city'
        );

      return true;
    }

    if (
      item.id ===
      'store:settings'
    ) {
      const shop =
        this.getCurrentShop();

      if (!shop) {
        return true;
      }

      textInput
        .requestText({
          title:
            '门店设置 · 修改名称',
          value:
            shop.name ||
            '',
          placeholder:
            '请输入门店名称',
          maxLength:
            12
        })
        .then(
          value => {
            if (!value) {
              return;
            }

            customizationSystem
              .renameShop(
                shop.id,
                value
              );

            textInput
              .requestRender();
          }
        );

      return true;
    }

    if (
      item.id ===
      'shop:rename'
    ) {
      const shop =
        this.getCurrentShop();

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
            12
        })
        .then(
          value => {
            if (!value) {
              return;
            }

            customizationSystem
              .renameShop(
                shop.id,
                value
              );

            textInput
              .requestRender();
          }
        );

      return true;
    }

    if (
      item.id ===
      'room:manage'
    ) {
      const shop =
        this.getCurrentShop();

      if (shop) {
        sceneManager
          .switchTo(
            'renovation',
            {
              shopId:
                shop.id,
              page:
                'rooms'
            }
          );
      }

      return true;
    }

    if (
      item.id.indexOf(
        'room:rename:'
      ) ===
      0
    ) {
      const shop =
        this.getCurrentShop();

      if (!shop) {
        return true;
      }

      const roomId =
        item.id.slice(
          'room:rename:'.length
        );

      const room =
        this.getRooms(
          shop.id
        )
        .find(
          roomItem =>
            roomItem.id ===
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
              12
          })
          .then(
            value => {
              if (!value) {
                return;
              }

              customizationSystem
                .renameRoom(
                  shop.id,
                  roomId,
                  value
                );

              textInput
                .requestRender();
            }
          );
      }

      return true;
    }

    if (
      item.id.indexOf(
        'module:'
      ) ===
      0
    ) {
      const moduleId =
        item.id.split(
          ':'
        )[1];

      const shop =
        this.getCurrentShop();

      if (!shop) {
        return true;
      }

      const sceneMap = {
        renovation:
          'renovation',
        equipment:
          'equipment',
        license:
          'license',
        staff:
          'staff'
      };

      if (
        sceneMap[
          moduleId
        ]
      ) {
        sceneManager
          .switchTo(
            sceneMap[
              moduleId
            ],
            {
              shopId:
                shop.id
            }
          );

        return true;
      }

      if (
        moduleId ===
        'trial'
      ) {
        const result =
          openingPrepSystem
            .startTrialOpening(
              shop.id
            );

        this.showToast(
          result.ok
            ? '试营业开始！'
            : result.message
        );

        textInput
          .requestRender();

        return true;
      }

      if (
        moduleId ===
        'finance'
      ) {
        const offer =
          openingFinanceSystem
            .getOffer(
              shop.id
            );

        const accept =
          () => {
            const result =
              openingFinanceSystem
                .acceptOffer(
                  shop.id
                );

            this.showToast(
              result.ok
                ? (
                    '已到账 ' +
                    money(
                      result
                        .loan
                        .principal
                    )
                  )
                : result.message
            );

            textInput
              .requestRender();
          };

        if (
          offer &&
          offer.available &&
          api &&
          typeof api
            .showModal ===
            'function'
        ) {
          api.showModal({
            title:
              '开店周转金',
            content:
              '可借 ' +
              money(
                offer.principal
              ) +
              '，期限 ' +
              offer.termMonths +
              ' 个月，预计月还 ' +
              money(
                offer.monthlyPayment
              ) +
              '。确认申请？',
            confirmText:
              '申请',
            cancelText:
              '取消',
            success:
              result => {
                if (
                  result &&
                  result.confirm
                ) {
                  accept();
                }
              }
          });
        } else {
          accept();
        }

        return true;
      }
    }

    return false;
  }
}

module.exports =
  new StoreScene();
