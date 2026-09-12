'use strict';

const runtime =
  globalThis
    .GameRuntime;

if (!runtime) {
  throw new Error(
    'DistrictScene：GameRuntime 未初始化'
  );
}

const api =
  runtime.api ||
  {};

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

const DESIGN_W =
  390;

const COLORS = {
  navy:
    '#12384D',

  navy2:
    '#0A2A3B',

  paper:
    '#F4EBDD',

  panel:
    '#FFF9EF',

  panel2:
    '#F8F0E4',

  text:
    '#24323A',

  muted:
    '#718087',

  gold:
    '#E4AA48',

  orange:
    '#D9853E',

  red:
    '#BF584A',

  green:
    '#4B9567',

  blue:
    '#4C86A6',

  line:
    '#DED1C1',

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

function money(
  value
) {
  return (
    '¥' +
    Math.max(
      0,
      Math.round(
        Number(
          value
        ) ||
        0
      )
    ).toLocaleString()
  );
}

function percent(
  value
) {
  return (
    Math.round(
      Number(
        value
      ) *
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

      const screenW =
        Math.max(
          1,
          Number(
            info.windowWidth
          ) ||
          DESIGN_W
        );

      const screenH =
        Math.max(
          1,
          Number(
            info.windowHeight
          ) ||
          780
        );

      const scale =
        screenW /
        DESIGN_W;

      height =
        screenH /
        scale;
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

  enter(
    payload
  ) {
    const data =
      payload ||
      {};

    const requested =
      data.districtId ||
      gameState
        .getWorld()
        .currentDistrictId ||
      'university';

    const district =
      citySystem
        .getDistrict(
          requested
        );

    if (district) {
      this.districtId =
        requested;

      citySystem
        .setCurrentDistrict(
          requested
        );

      visualAssetSystem
        .loadGroup(
          'district'
        );
    }
  }

  exit() {
    this.buttons =
      [];
  }

  update() {
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
        w /
          2,
        h /
          2
      );

    ctx.beginPath();

    ctx.moveTo(
      x +
        radius,
      y
    );

    ctx.arcTo(
      x +
        w,
      y,
      x +
        w,
      y +
        h,
      radius
    );

    ctx.arcTo(
      x +
        w,
      y +
        h,
      x,
      y +
        h,
      radius
    );

    ctx.arcTo(
      x,
      y +
        h,
      x,
      y,
      radius
    );

    ctx.arcTo(
      x,
      y,
      x +
        w,
      y,
      radius
    );

    ctx.closePath();
  }

  roundedRect(
    ctx,
    x,
    y,
    w,
    h,
    r,
    fill,
    stroke,
    lineWidth
  ) {
    this.roundedPath(
      ctx,
      x,
      y,
      w,
      h,
      r
    );

    if (fill) {
      ctx.fillStyle =
        fill;

      ctx.fill();
    }

    if (stroke) {
      ctx.strokeStyle =
        stroke;

      ctx.lineWidth =
        lineWidth ||
        1;

      ctx.stroke();
    }
  }

  text(
    ctx,
    text,
    x,
    y,
    size,
    color,
    weight,
    align
  ) {
    ctx.fillStyle =
      color ||
      COLORS.text;

    ctx.font =
      (
        weight ||
        '500'
      ) +
      ' ' +
      size +
      'px sans-serif';

    ctx.textAlign =
      align ||
      'left';

    ctx.textBaseline =
      'middle';

    ctx.fillText(
      String(
        text
      ),
      x,
      y
    );
  }

  addButton(
    id,
    x,
    y,
    w,
    h
  ) {
    this.buttons
      .push({
        id,
        x,
        y,
        w,
        h
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
      i >=
        0;
      i--
    ) {
      const item =
        this.buttons[
          i
        ];

      if (
        x >=
          item.x &&
        x <=
          item.x +
            item.w &&
        y >=
          item.y &&
        y <=
          item.y +
            item.h
      ) {
        return item;
      }
    }

    return null;
  }

  drawHeader(
    ctx,
    insight
  ) {
    const banner =
      visualAssetSystem
        .get(
          'visual_district_banner'
        );

    if (banner) {
      ctx.drawImage(
        banner,
        0,
        0,
        DESIGN_W,
        67
      );

      ctx.fillStyle =
        'rgba(5,35,52,0.70)';

      ctx.fillRect(
        0,
        0,
        DESIGN_W,
        67
      );
    } else {
      ctx.fillStyle =
        COLORS.navy2;

      ctx.fillRect(
        0,
        0,
        DESIGN_W,
        67
      );
    }

    this.roundedRect(
      ctx,
      10,
      13,
      44,
      34,
      10,
      'rgba(255,255,255,0.10)',
      'rgba(255,255,255,0.15)'
    );

    this.text(
      ctx,
      '‹',
      32,
      30,
      22,
      COLORS.white,
      '700',
      'center'
    );

    this.addButton(
      'back',
      6,
      8,
      54,
      44
    );

    this.text(
      ctx,
      insight.name,
      68,
      22,
      17,
      COLORS.white,
      '700'
    );

    this.text(
      ctx,
      '商圈详情 · 人口、需求、客群和租金均为动态值',
      68,
      45,
      7.5,
      'rgba(255,255,255,0.70)',
      '500'
    );

    this.roundedRect(
      ctx,
      292,
      14,
      86,
      34,
      10,
      COLORS.gold,
      '#D49434'
    );

    this.text(
      ctx,
      '查看房源 ›',
      335,
      31,
      8.5,
      '#26343B',
      '700',
      'center'
    );

    this.addButton(
      'find-property',
      288,
      9,
      94,
      44
    );
  }

  drawMetric(
    ctx,
    x,
    y,
    w,
    label,
    value,
    sub,
    color
  ) {
    this.roundedRect(
      ctx,
      x,
      y,
      w,
      66,
      12,
      COLORS.panel,
      COLORS.line
    );

    this.text(
      ctx,
      label,
      x +
        12,
      y +
        16,
      7,
      COLORS.muted,
      '600'
    );

    this.text(
      ctx,
      value,
      x +
        12,
      y +
        37,
      13,
      color,
      '700'
    );

    this.text(
      ctx,
      sub,
      x +
        12,
      y +
        54,
      6.5,
      COLORS.muted,
      '500'
    );
  }

  drawCustomerPanel(
    ctx,
    insight,
    y
  ) {
    this.roundedRect(
      ctx,
      10,
      y,
      370,
      156,
      14,
      COLORS.panel,
      COLORS.line
    );

    this.text(
      ctx,
      '消费人群',
      22,
      y +
        20,
      11,
      COLORS.text,
      '700'
    );

    this.text(
      ctx,
      insight.customerDiversity,
      366,
      y +
        20,
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

    for (
      let i = 0;
      i <
      groups.length;
      i++
    ) {
      const item =
        groups[i];

      const rowY =
        y +
        47 +
        i *
          25;

      this.text(
        ctx,
        item.name,
        22,
        rowY,
        7.5,
        COLORS.text,
        '700'
      );

      this.roundedRect(
        ctx,
        91,
        rowY -
          5,
        178,
        10,
        5,
        '#EEE5D8'
      );

      this.roundedRect(
        ctx,
        91,
        rowY -
          5,
        Math.max(
          4,
          178 *
            item.share
        ),
        10,
        5,
        i ===
          0
          ? COLORS.gold
          : COLORS.blue
      );

      this.text(
        ctx,
        percent(
          item.share
        ),
        285,
        rowY,
        7,
        COLORS.muted,
        '600'
      );

      this.text(
        ctx,
        item.demand
          .toLocaleString() +
          '人',
        365,
        rowY,
        7,
        COLORS.navy,
        '700',
        'right'
      );
    }
  }

  drawMealPanel(
    ctx,
    insight,
    y
  ) {
    this.roundedRect(
      ctx,
      10,
      y,
      370,
      105,
      14,
      COLORS.panel,
      COLORS.line
    );

    this.text(
      ctx,
      '时段需求结构',
      22,
      y +
        19,
      10,
      COLORS.text,
      '700'
    );

    const meal =
      insight
        .mealProfile;

    const maxShare =
      meal.length
        ? meal[0]
            .share
        : 1;

    for (
      let i = 0;
      i <
      meal.length;
      i++
    ) {
      const item =
        meal[i];

      const x =
        22 +
        i *
          69;

      const barMax =
        54;

      const barH =
        Math.max(
          5,
          barMax *
          (
            item.share /
            Math.max(
              0.01,
              maxShare
            )
          )
        );

      this.roundedRect(
        ctx,
        x,
        y +
          75 -
          barH,
        43,
        barH,
        6,
        i ===
          0
          ? COLORS.orange
          : '#8EB5C8'
      );

      this.text(
        ctx,
        MEAL_NAMES[
          item.id
        ] ||
          item.id,
        x +
          21.5,
        y +
          89,
        6.5,
        COLORS.muted,
        '600',
        'center'
      );
    }
  }

  drawMarketPanel(
    ctx,
    insight,
    y
  ) {
    this.roundedRect(
      ctx,
      10,
      y,
      370,
      105,
      14,
      COLORS.panel,
      COLORS.line
    );

    this.text(
      ctx,
      '经营环境',
      22,
      y +
        19,
      10,
      COLORS.text,
      '700'
    );

    const market =
      insight.market;

    const lines = [
      [
        '餐饮店',
        insight
          .restaurantCount +
          '家'
      ],

      [
        '竞争',
        insight
          .competitionLabel +
          ' · ' +
          insight
            .saturation +
          '%'
      ],

      [
        '租金',
        insight
          .rentLevel +
          ' · 指数 ' +
          insight
            .rentIndex
            .toFixed(
              2
            )
      ],

      [
        '挂牌',
        market
          ? market
              .activeListingCount +
            '套 · 均租' +
            money(
              market
                .averageAskingRent
            )
          : '--'
      ]
    ];

    for (
      let i = 0;
      i <
      lines.length;
      i++
    ) {
      const col =
        i %
        2;

      const row =
        Math.floor(
          i /
          2
        );

      const x =
        22 +
        col *
          184;

      const yy =
        y +
        47 +
        row *
          31;

      this.text(
        ctx,
        lines[i][0],
        x,
        yy,
        6.5,
        COLORS.muted,
        '600'
      );

      this.text(
        ctx,
        lines[i][1],
        x +
          42,
        yy,
        7.5,
        COLORS.text,
        '700'
      );
    }
  }

  drawHintPanel(
    ctx,
    insight,
    y
  ) {
    this.roundedRect(
      ctx,
      10,
      y,
      370,
      74,
      14,
      '#FFF0D6',
      '#E3BD77'
    );

    this.text(
      ctx,
      '经营适配',
      22,
      y +
        18,
      8,
      COLORS.orange,
      '700'
    );

    const hints =
      insight
        .businessHints
        .join(
          ' / '
        );

    this.text(
      ctx,
      hints ||
        '暂无明显品类偏好',
      22,
      y +
        40,
      9,
      COLORS.text,
      '700'
    );

    const event =
      insight
        .events
        .length
        ? insight
            .events[0]
        : null;

    this.text(
      ctx,
      event
        ? '当前事件：' +
          event.name
        : '当前无大型商圈事件',
      22,
      y +
        59,
      6.5,
      event
        ? COLORS.red
        : COLORS.muted,
      '600'
    );
  }

  render(
    ctx
  ) {
    if (!ctx) {
      return;
    }

    this.getLayout();

    this.buttons =
      [];

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

    const y0 =
      78;

    const gap =
      8;

    const w =
      (
        DESIGN_W -
        20 -
        gap *
          2
      ) /
      3;

    const popTrend =
      insight
        .populationDelta >
        0
        ? '↑'
        : insight
            .populationDelta <
            0
          ? '↓'
          : '→';

    const demandTrend =
      insight
        .demandDeltaRatio >
        0.005
        ? '↑'
        : insight
            .demandDeltaRatio <
            -0.005
          ? '↓'
          : '→';

    this.drawMetric(
      ctx,
      10,
      y0,
      w,
      '活跃人口',
      insight
        .population
        .toLocaleString(),
      popTrend +
        ' 常住' +
        insight
          .residentPopulation
          .toLocaleString(),
      COLORS.blue
    );

    this.drawMetric(
      ctx,
      10 +
        w +
        gap,
      y0,
      w,
      '当前需求',
      insight
        .currentDemand
        .toLocaleString(),
      demandTrend +
        ' 日基数' +
        Math.round(
          insight
            .dynamicDailyDemand
        ).toLocaleString(),
      COLORS.red
    );

    this.drawMetric(
      ctx,
      10 +
        (
          w +
          gap
        ) *
          2,
      y0,
      w,
      '平均客单',
      money(
        insight
          .avgSpend
      ),
      insight
        .competitionLabel,
      COLORS.green
    );

    let y =
      y0 +
      78;

    this.drawCustomerPanel(
      ctx,
      insight,
      y
    );

    y +=
      168;

    this.drawMealPanel(
      ctx,
      insight,
      y
    );

    y +=
      117;

    this.drawMarketPanel(
      ctx,
      insight,
      y
    );

    y +=
      117;

    if (
      y +
        74 <
      this.contentBottom -
        6
    ) {
      this.drawHintPanel(
        ctx,
        insight,
        y
      );
    }

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
      'find-property'
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
