'use strict';

// V18_DISTRICT_UI_REWRITE
// 商圈详情页全量重写：只保留系统数据与真实交互，不复用旧页面布局。

const runtime =
  globalThis.GameRuntime;

if (!runtime) {
  throw new Error(
    'DistrictScene：GameRuntime 未初始化'
  );
}

const api =
  runtime.api || {};

const gameState =
  require('../core/gameState.js');

const citySystem =
  require('../city/citySystem.js');

const districtInsightSystem =
  require('../city/districtInsightSystem.js');

const sceneManager =
  require('../core/sceneManager.js');

const visualAssetSystem =
  require('../ui/visualAssetSystem.js');

const ui =
  require('../ui/premiumUi.js');

const DESIGN_W =
  390;

const COLORS = {
  navy:
    '#0A3B59',
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
    '#E6762B',
  red:
    '#D85049',
  green:
    '#239B72',
  blue:
    '#3A9FC7',
  white:
    '#FFFFFF'
};

const MEAL_NAMES = {
  breakfast:
    '早餐',
  lunch:
    '午餐',
  afternoon:
    '下午茶',
  dinner:
    '晚餐',
  night:
    '夜宵'
};

const MEAL_TIMES = {
  breakfast:
    '7:00-10:00',
  lunch:
    '11:00-14:00',
  afternoon:
    '14:00-17:00',
  dinner:
    '17:00-21:00',
  night:
    '21:00-24:00'
};

const CUSTOMER_NOTES = {
  白领:
    '周边写字楼，上班族为主',
  商务客:
    '商务洽谈、会议宴请',
  游客:
    '旅游观光、休闲消费',
  学生:
    '周边高校、年轻群体',
  居民:
    '社区家庭与日常消费',
  工人:
    '园区职工与工作餐',
  家庭:
    '家庭聚餐与周末消费'
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

function pct(value) {
  const n =
    Number(value) ||
    0;

  return (
    Math.round(
      n <= 1
        ? n * 100
        : n
    ) +
    '%'
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

class DistrictScene {
  constructor() {
    this.id =
      'district';

    this.districtId =
      'university';

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

  getScale() {
    return clamp(
      (
        this.contentBottom -
        93
      ) /
      555,
      0.88,
      1.13
    );
  }

  enter(payload) {
    const data =
      payload ||
      {};

    const requested =
      data.districtId ||
      gameState
        .getWorld()
        .currentDistrictId ||
      'university';

    if (
      citySystem
        .getDistrict(
          requested
        )
    ) {
      this.districtId =
        requested;

      citySystem
        .setCurrentDistrict(
          requested
        );
    }

    visualAssetSystem
      .loadGroup(
        'district'
      );

    visualAssetSystem
      .loadGroup(
        'premiumDistrict'
      );
  }

  exit() {
    this.buttons =
      [];
  }

  update() {
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
        x <= b.x + b.w &&
        y >= b.y &&
        y <= b.y + b.h
      ) {
        return b;
      }
    }

    return null;
  }

  drawHeader(
    ctx,
    insight
  ) {
    ui.coverImage(
      ctx,
      visualAssetSystem
        .get(
          'premium_district_header'
        ) ||
      visualAssetSystem
        .get(
          'visual_district_banner'
        ),
      0,
      0,
      DESIGN_W,
      92,
      0,
      'rgba(3,33,50,0.43)'
    );

    ctx.fillStyle =
      'rgba(4,35,54,0.33)';

    ctx.fillRect(
      0,
      0,
      DESIGN_W,
      92
    );

    ui.card(
      ctx,
      8,
      14,
      39,
      39,
      {
        radius:
          11,
        fill:
          'rgba(6,48,69,0.88)',
        stroke:
          'rgba(255,255,255,0.34)',
        shadow:
          false
      }
    );

    ui.text(
      ctx,
      '‹',
      27.5,
      33.5,
      22,
      '#FFE69B',
      '800',
      'center'
    );

    this.addButton(
      'back',
      4,
      10,
      47,
      47
    );

    ui.text(
      ctx,
      insight.name,
      58,
      23,
      16,
      COLORS.white,
      '800'
    );

    ui.text(
      ctx,
      '📍 城市核心商圈 · 人气旺盛 · 潜力持续变化',
      58,
      48,
      6.6,
      '#DDEBF0',
      '600'
    );

    ui.card(
      ctx,
      298,
      16,
      80,
      37,
      {
        radius:
          18,
        fill:
          COLORS.gold,
        stroke:
          '#FFE29A',
        shadow:
          false
      }
    );

    ui.text(
      ctx,
      '查看房源 ›',
      338,
      34.5,
      7.3,
      COLORS.text,
      '800',
      'center'
    );

    this.addButton(
      'market',
      291,
      9,
      94,
      51
    );

    ui.card(
      ctx,
      7,
      64,
      376,
      24,
      {
        radius:
          11,
        fill:
          'rgba(4,38,58,0.90)',
        stroke:
          'rgba(78,192,235,0.34)',
        shadow:
          false
      }
    );

    ui.text(
      ctx,
      '📣 城市动态',
      14,
      76,
      6.7,
      '#FFD264',
      '800'
    );

    const event =
      insight.events &&
      insight.events[0];

    ui.text(
      ctx,
      event
        ? (
            event.name ||
            '区域客流持续上升'
          )
        : '区域客流持续变化 · 商业配套动态调整',
      86,
      76,
      6.1,
      COLORS.white,
      '600'
    );
  }

  drawMetrics(
    ctx,
    insight
  ) {
    const sy =
      this.getScale();

    const y =
      96;

    const h =
      82 *
      sy;

    const cards = [
      {
        label:
          '活跃人口',
        value:
          insight.population
            .toLocaleString(),
        trend:
          (
            insight.populationDelta >= 0
              ? '↑ +'
              : '↓ '
          ) +
          Math.abs(
            insight.populationDelta
          ).toLocaleString(),
        color:
          COLORS.blue,
        note:
          '实时客流与常住人口联动',
        icon:
          '👥'
      },
      {
        label:
          '当前需求',
        value:
          insight.currentDemand
            .toLocaleString(),
        trend:
          (
            insight.demandDeltaRatio >= 0
              ? '↑ +'
              : '↓ '
          ) +
          Math.abs(
            Math.round(
              insight
                .demandDeltaRatio *
              100
            )
          ) +
          '%',
        color:
          COLORS.red,
        note:
          '餐饮需求随事件动态变化',
        icon:
          '▥'
      },
      {
        label:
          '平均客单',
        value:
          money(
            insight.avgSpend
          ),
        trend:
          insight.competitionLabel,
        color:
          COLORS.green,
        note:
          '消费水平与客群实时联动',
        icon:
          '◎'
      }
    ];

    const gap =
      5;

    const w =
      (
        370 -
        gap * 2
      ) /
      3;

    for (
      let i = 0;
      i < 3;
      i++
    ) {
      const item =
        cards[i];

      const x =
        10 +
        i *
        (
          w +
          gap
        );

      ui.card(
        ctx,
        x,
        y,
        w,
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
        item.icon,
        x + 12,
        y + 18,
        12,
        item.color,
        '800'
      );

      ui.text(
        ctx,
        item.label,
        x + 36,
        y + 17,
        7,
        COLORS.text,
        '800'
      );

      ui.text(
        ctx,
        item.value,
        x + 11,
        y + 44,
        14,
        item.color,
        '800'
      );

      ui.text(
        ctx,
        item.trend,
        x + 11,
        y + 61,
        6.3,
        item.color,
        '700'
      );

      if (
        h >
        76
      ) {
        ui.text(
          ctx,
          item.note,
          x + 11,
          y +
            h -
            8,
          5.1,
          COLORS.muted,
          '500'
        );
      }
    }
  }

  drawCustomers(
    ctx,
    insight
  ) {
    const sy =
      this.getScale();

    const y =
      184 *
      sy -
      82 *
      (
        sy -
        1
      );

    const h =
      130 *
      sy;

    ui.card(
      ctx,
      10,
      y,
      370,
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
      '消费人群结构',
      21,
      y + 20,
      10.5,
      COLORS.text,
      '800'
    );

    ui.text(
      ctx,
      '多元客群 · 商机汇聚',
      362,
      y + 20,
      6.4,
      COLORS.orange,
      '700',
      'right'
    );

    const groups =
      insight.customerGroups
        .slice(
          0,
          4
        );

    const avatars = [
      'premium_avatar_1',
      'premium_avatar_2',
      'premium_avatar_3',
      'premium_avatar_4'
    ];

    const rowGap =
      Math.max(
        24,
        (
          h -
          42
        ) /
        4
      );

    for (
      let i = 0;
      i <
      groups.length;
      i++
    ) {
      const g =
        groups[i];

      const cy =
        y +
        44 +
        i *
        rowGap;

      ui.coverImage(
        ctx,
        visualAssetSystem
          .get(
            avatars[i]
          ),
        20,
        cy - 11,
        24,
        24,
        12,
        null
      );

      ui.text(
        ctx,
        g.name,
        53,
        cy,
        7.7,
        COLORS.text,
        '800'
      );

      ui.text(
        ctx,
        CUSTOMER_NOTES[
          g.name
        ] ||
        '消费偏好随商圈动态变化',
        91,
        cy,
        5.6,
        COLORS.muted,
        '500'
      );

      const barX =
        160;

      const barW =
        120;

      ui.card(
        ctx,
        barX,
        cy - 5,
        barW,
        10,
        {
          radius:
            5,
          fill:
            '#ECE6DC',
          stroke:
            false,
          shadow:
            false
        }
      );

      ui.card(
        ctx,
        barX,
        cy - 5,
        Math.max(
          8,
          barW *
            Math.min(
              1,
              g.share
            )
        ),
        10,
        {
          radius:
            5,
          fill:
            i === 0
              ? COLORS.gold
              : '#53A9CE',
          stroke:
            false,
          shadow:
            false
        }
      );

      ui.text(
        ctx,
        pct(
          g.share
        ),
        318,
        cy,
        6.6,
        COLORS.text,
        '700',
        'right'
      );

      ui.text(
        ctx,
        Math.round(
          g.demand
        ) +
          '人',
        364,
        cy,
        6.6,
        COLORS.text,
        '800',
        'right'
      );
    }
  }

  drawMeals(
    ctx,
    insight
  ) {
    const sy =
      this.getScale();

    const y =
      321 *
      sy -
      82 *
      (
        sy -
        1
      );

    const h =
      113 *
      sy;

    ui.card(
      ctx,
      10,
      y,
      370,
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
      '时段需求结构',
      21,
      y + 20,
      10.5,
      COLORS.text,
      '800'
    );

    ui.text(
      ctx,
      '午餐与晚餐通常是核心时段',
      365,
      y + 20,
      6.2,
      COLORS.orange,
      '700',
      'right'
    );

    const meals =
      insight.mealProfile
        .slice(
          0,
          5
        );

    const max =
      Math.max(
        0.01,
        ...meals.map(
          item =>
            item.share
        )
      );

    const baseY =
      y +
      h -
      34;

    for (
      let i = 0;
      i <
      meals.length;
      i++
    ) {
      const m =
        meals[i];

      const x =
        25 +
        i *
        72;

      const barH =
        17 +
        Math.min(
          51,
          49 *
            (
              m.share /
              max
            )
        );

      ui.card(
        ctx,
        x,
        baseY -
          barH,
        41,
        barH,
        {
          radius:
            7,
          fill:
            i === 1 ||
            i === 3
              ? '#F17B39'
              : '#4BA8D0',
          stroke:
            false,
          shadow:
            false
        }
      );

      ui.text(
        ctx,
        pct(
          m.share
        ),
        x + 20.5,
        baseY -
          barH -
          8,
        6.8,
        i === 1 ||
        i === 3
          ? '#B94E21'
          : COLORS.text,
        '800',
        'center'
      );

      ui.text(
        ctx,
        MEAL_NAMES[
          m.id
        ] ||
        m.id,
        x + 20.5,
        baseY + 9,
        6.5,
        COLORS.text,
        '800',
        'center'
      );

      ui.text(
        ctx,
        MEAL_TIMES[
          m.id
        ] ||
        '',
        x + 20.5,
        baseY + 23,
        5,
        COLORS.muted,
        '500',
        'center'
      );
    }
  }

  drawMarket(
    ctx,
    insight
  ) {
    const sy =
      this.getScale();

    const y =
      440 *
      sy -
      82 *
      (
        sy -
        1
      );

    const h =
      76 *
      sy;

    ui.card(
      ctx,
      10,
      y,
      370,
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
      '经营环境',
      21,
      y + 20,
      10.5,
      COLORS.text,
      '800'
    );

    const market =
      insight.market ||
      {};

    const items = [
      [
        '餐饮店',
        insight.restaurantCount +
          '家',
        COLORS.navy
      ],
      [
        '竞争强度',
        insight.competitionLabel,
        COLORS.red
      ],
      [
        '租金',
        insight.rentLevel +
          '·' +
          insight.rentIndex
            .toFixed(
              2
            ),
        COLORS.navy
      ],
      [
        '挂牌房源',
        (
          market.activeListingCount ||
          0
        ) +
          '套',
        COLORS.blue
      ],
      [
        '商圈饱和度',
        insight.saturation +
          '%',
        insight.saturation >=
          95
          ? COLORS.red
          : COLORS.green
      ]
    ];

    for (
      let i = 0;
      i <
      items.length;
      i++
    ) {
      const x =
        21 +
        i *
        71;

      ui.text(
        ctx,
        items[i][0],
        x,
        y + 45,
        5.6,
        COLORS.muted,
        '600'
      );

      ui.text(
        ctx,
        items[i][1],
        x,
        y + 62,
        7.1,
        items[i][2],
        '800'
      );
    }
  }

  drawFit(
    ctx,
    insight
  ) {
    const sy =
      this.getScale();

    const ctaH =
      43;

    const h =
      72 *
      sy;

    const ctaY =
      this.contentBottom -
      ctaH -
      7;

    const y =
      ctaY -
      h -
      7;

    ui.card(
      ctx,
      10,
      y,
      370,
      h,
      {
        radius:
          15,
        fill:
          '#FFF9E9',
        stroke:
          '#E9CB78'
      }
    );

    ui.text(
      ctx,
      '经营适配',
      21,
      y + 18,
      9.4,
      COLORS.text,
      '800'
    );

    const hints =
      insight.businessHints
        .slice(
          0,
          5
        );

    for (
      let i = 0;
      i <
      hints.length;
      i++
    ) {
      const x =
        18 +
        i *
        72;

      ui.pill(
        ctx,
        hints[i],
        x,
        y + 29,
        66,
        22,
        '#FFF1CF',
        COLORS.text,
        '#E9C873'
      );
    }

    ui.text(
      ctx,
      '匹配结果会随客群、竞争、租金与城市事件持续变化。',
      22,
      y + h - 10,
      5.7,
      COLORS.muted,
      '600'
    );

    ui.card(
      ctx,
      12,
      ctaY,
      113,
      35,
      {
        radius:
          17,
        fill:
          '#FFFDF7',
        stroke:
          '#D5C9BA',
        shadow:
          false
      }
    );

    ui.text(
      ctx,
      '☆ 收藏商圈',
      68.5,
      ctaY + 17.5,
      7.3,
      COLORS.navy,
      '800',
      'center'
    );

    ui.card(
      ctx,
      133,
      ctaY,
      245,
      35,
      {
        radius:
          17,
        fill:
          COLORS.gold,
        stroke:
          '#DE9F1E',
        shadow:
          false
      }
    );

    ui.text(
      ctx,
      '📍 选择该商圈开店  ›',
      255.5,
      ctaY + 17.5,
      8.1,
      COLORS.text,
      '800',
      'center'
    );

    this.addButton(
      'open-here',
      128,
      ctaY - 4,
      255,
      43
    );
  }

  render(ctx) {
    if (!ctx) {
      return;
    }

    this.getLayout();

    const insight =
      districtInsightSystem
        .getInsight(
          this.districtId
        );

    if (!insight) {
      sceneManager
        .switchTo(
          'city'
        );

      return;
    }

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

    this.drawHeader(
      ctx,
      insight
    );

    this.drawMetrics(
      ctx,
      insight
    );

    this.drawCustomers(
      ctx,
      insight
    );

    this.drawMeals(
      ctx,
      insight
    );

    this.drawMarket(
      ctx,
      insight
    );

    this.drawFit(
      ctx,
      insight
    );

    ctx.restore();
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
      'back'
    ) {
      sceneManager
        .switchTo(
          'city'
        );

      return true;
    }

    if (
      item.id ===
        'market' ||
      item.id ===
        'open-here'
    ) {
      sceneManager
        .switchTo(
          'propertyMarket',
          {
            districtId:
              this.districtId,
            source:
              'district'
          }
        );

      return true;
    }

    return false;
  }
}

module.exports =
  new DistrictScene();
