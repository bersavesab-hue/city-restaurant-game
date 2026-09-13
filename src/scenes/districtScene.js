'use strict';

// V14_GOLDEN_UI_DISTRICT

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
    '#07344B',
  navy2:
    '#082A3D',
  paper:
    '#F7EEDD',
  text:
    '#14334A',
  muted:
    '#6A7B82',
  gold:
    '#F2B12A',
  orange:
    '#F17732',
  red:
    '#D64A42',
  green:
    '#158D70',
  blue:
    '#3A9CC4',
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
  return (
    Math.round(
      Number(value) *
      100
    ) +
    '%'
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
      height <
        740
        ? 60
        : 64;

    this.contentBottom =
      height -
      this.navH;
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
        40,
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
      'rgba(4,34,51,0.50)'
    );

    ctx.fillStyle =
      'rgba(2,31,47,0.72)';

    ctx.fillRect(
      0,
      65,
      DESIGN_W,
      27
    );

    ui.card(
      ctx,
      11,
      14,
      39,
      39,
      {
        radius:
          11,
        fill:
          'rgba(5,46,67,0.86)',
        stroke:
          'rgba(255,255,255,0.32)',
        shadow:
          false
      }
    );

    ui.text(
      ctx,
      '‹',
      30.5,
      33.5,
      22,
      '#FFE8A4',
      '800',
      'center'
    );

    this.addButton(
      'back',
      7,
      10,
      47,
      47
    );

    ui.text(
      ctx,
      insight.name,
      61,
      25,
      17,
      COLORS.white,
      '800'
    );

    ui.text(
      ctx,
      '核心商圈 · 人气、消费与租金实时变化',
      61,
      49,
      7,
      '#D8E7EC',
      '500'
    );

    ui.card(
      ctx,
      295,
      15,
      82,
      38,
      {
        radius:
          19,
        fill:
          '#F7B72D',
        stroke:
          '#FFE4A5',
        shadow:
          false
      }
    );

    ui.text(
      ctx,
      '查看房源 ›',
      336,
      34,
      7.2,
      COLORS.text,
      '800',
      'center'
    );

    this.addButton(
      'market',
      289,
      9,
      92,
      50
    );

    const event =
      insight.events &&
      insight.events[0];

    ui.text(
      ctx,
      '📣 城市动态',
      15,
      78.5,
      7.2,
      '#FFE6A7',
      '800'
    );

    ui.text(
      ctx,
      event
        ? (
            event.name ||
            '商圈事件变化'
          )
        : (
            insight
              .trendScore >
              0
              ? '区域客流与消费需求正在上升'
              : '当前商圈运行平稳'
          ),
      94,
      78.5,
      6.5,
      COLORS.white,
      '600'
    );
  }

  drawMetrics(
    ctx,
    insight
  ) {
    const cards = [
      {
        label:
          '活跃人口',
        value:
          insight
            .population
            .toLocaleString(),
        trend:
          insight
            .populationDelta >=
            0
            ? (
                '↑ +' +
                Math.abs(
                  insight
                    .populationDelta
                ).toLocaleString()
              )
            : (
                '↓ ' +
                Math.abs(
                  insight
                    .populationDelta
                ).toLocaleString()
              ),
        color:
          COLORS.blue,
        icon:
          '👥'
      },
      {
        label:
          '当前需求',
        value:
          insight
            .currentDemand
            .toLocaleString(),
        trend:
          (
            insight
              .demandDeltaRatio >=
              0
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
          insight
            .competitionLabel,
        color:
          COLORS.green,
        icon:
          '◉'
      }
    ];

    const gap =
      6;

    const w =
      (
        370 -
        gap *
          2
      ) /
      3;

    for (
      let i = 0;
      i <
      cards.length;
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
        103,
        w,
        84,
        {
          radius:
            13
        }
      );

      ui.text(
        ctx,
        item.icon,
        x + 13,
        120,
        13,
        item.color,
        '800'
      );

      ui.text(
        ctx,
        item.label,
        x + 34,
        119,
        7.2,
        COLORS.text,
        '800'
      );

      ui.text(
        ctx,
        item.value,
        x + 12,
        148,
        15,
        item.color,
        '800'
      );

      ui.text(
        ctx,
        item.trend,
        x + 12,
        174,
        6.3,
        item.color,
        '700'
      );
    }
  }

  drawCustomers(
    ctx,
    insight
  ) {
    ui.card(
      ctx,
      10,
      198,
      370,
      159,
      {
        radius:
          15
      }
    );

    ui.text(
      ctx,
      '消费人群结构',
      22,
      220,
      11,
      COLORS.text,
      '800'
    );

    ui.text(
      ctx,
      insight
        .customerDiversity,
      364,
      220,
      7,
      COLORS.orange,
      '700',
      'right'
    );

    const groups =
      insight
        .customerGroups
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

    for (
      let i = 0;
      i <
      groups.length;
      i++
    ) {
      const g =
        groups[i];

      const y =
        247 +
        i *
        27;

      ui.coverImage(
        ctx,
        visualAssetSystem
          .get(
            avatars[i]
          ),
        23,
        y - 11,
        25,
        25,
        13,
        null
      );

      ui.text(
        ctx,
        g.name,
        57,
        y,
        7.8,
        COLORS.text,
        '800'
      );

      const barX =
        128;

      const barW =
        151;

      ui.card(
        ctx,
        barX,
        y - 6,
        barW,
        12,
        {
          radius:
            6,
          fill:
            '#EEE5D7',
          stroke:
            false,
          shadow:
            false
        }
      );

      ui.card(
        ctx,
        barX,
        y - 6,
        Math.max(
          7,
          barW *
          Math.min(
            1,
            g.share
          )
        ),
        12,
        {
          radius:
            6,
          fill:
            i ===
              0
              ? '#F4B52C'
              : '#52ABD0',
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
        307,
        y,
        6.7,
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
        362,
        y,
        6.7,
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
    ui.card(
      ctx,
      10,
      368,
      370,
      129,
      {
        radius:
          15
      }
    );

    ui.text(
      ctx,
      '时段需求结构',
      22,
      389,
      11,
      COLORS.text,
      '800'
    );

    const meals =
      insight
        .mealProfile
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

    for (
      let i = 0;
      i <
      meals.length;
      i++
    ) {
      const m =
        meals[i];

      const x =
        43 +
        i *
        69;

      const h =
        13 +
        42 *
        (
          m.share /
          max
        );

      const y =
        461 -
        h;

      ui.card(
        ctx,
        x,
        y,
        36,
        h,
        {
          radius:
            7,
          fill:
            i ===
              1 ||
            i ===
              3
              ? '#EF7B38'
              : '#4AA8D0',
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
        x + 18,
        y - 9,
        6.8,
        i ===
          1 ||
        i ===
          3
          ? '#B34E21'
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
        x + 18,
        480,
        6.3,
        COLORS.text,
        '700',
        'center'
      );
    }
  }

  drawMarket(
    ctx,
    insight
  ) {
    ui.card(
      ctx,
      10,
      508,
      370,
      103,
      {
        radius:
          15
      }
    );

    ui.text(
      ctx,
      '经营环境',
      22,
      529,
      11,
      COLORS.text,
      '800'
    );

    const market =
      insight.market ||
      {};

    const values = [
      [
        '餐饮店',
        insight
          .restaurantCount +
          '家'
      ],
      [
        '竞争',
        insight
          .competitionLabel
      ],
      [
        '租金',
        insight
          .rentLevel +
          '·' +
          insight
            .rentIndex
            .toFixed(
              2
            )
      ],
      [
        '挂牌',
        (
          market
            .activeListingCount ||
          0
        ) +
          '套'
      ]
    ];

    for (
      let i = 0;
      i <
      values.length;
      i++
    ) {
      const x =
        23 +
        i *
        88;

      ui.text(
        ctx,
        values[i][0],
        x,
        558,
        6.5,
        COLORS.muted,
        '600'
      );

      ui.text(
        ctx,
        values[i][1],
        x,
        581,
        8.5,
        i ===
          1
          ? COLORS.red
          : i ===
              3
            ? COLORS.blue
            : COLORS.text,
        '800'
      );
    }
  }

  drawFit(
    ctx,
    insight
  ) {
    const y =
      622;

    if (
      y + 78 >
      this.contentBottom
    ) {
      return;
    }

    ui.card(
      ctx,
      10,
      y,
      370,
      72,
      {
        radius:
          15,
        fill:
          '#FFF8E5',
        stroke:
          '#E9C66D'
      }
    );

    ui.text(
      ctx,
      '经营适配',
      22,
      y + 18,
      9,
      COLORS.orange,
      '800'
    );

    const hints =
      insight
        .businessHints
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
        21 +
        i * 64;

      ui.pill(
        ctx,
        hints[i],
        x,
        y + 29,
        58,
        22,
        '#FFF1C8',
        COLORS.text,
        '#E9C873'
      );
    }

    ui.card(
      ctx,
      22,
      y + 53,
      112,
      28,
      {
        radius:
          14,
        fill:
          '#FFFDF7',
        stroke:
          '#D8CDBF',
        shadow:
          false
      }
    );

    ui.text(
      ctx,
      '☆ 收藏商圈',
      78,
      y + 67,
      7,
      COLORS.navy,
      '800',
      'center'
    );

    ui.card(
      ctx,
      145,
      y + 53,
      222,
      28,
      {
        radius:
          14,
        fill:
          '#F6B62B',
        stroke:
          '#E0A122',
        shadow:
          false
      }
    );

    ui.text(
      ctx,
      '选择该商圈开店  ›',
      256,
      y + 67,
      7.5,
      COLORS.text,
      '800',
      'center'
    );

    this.addButton(
      'open-here',
      139,
      y + 48,
      234,
      38
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

    if (
      item.id ===
      'market'
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
