'use strict';

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

const premiumUi =
  require('../ui/premiumUi.js');

const DESIGN_W =
  390;

const COLORS = {
  navy: '#12384D',
  navy2: '#0A2A3B',
  paper: '#F4EBDD',
  panel: '#FFF9EF',
  panel2: '#F8F0E4',
  text: '#24323A',
  muted: '#718087',
  gold: '#E4AA48',
  orange: '#D9853E',
  red: '#BF584A',
  green: '#4B9567',
  blue: '#4C86A6',
  line: '#DED1C1',
  white: '#FFFFFF'
};

function money(value) {
  return (
    '¥' +
    Math.max(
      0,
      Math.round(
        Number(value) || 0
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

class RenovationScene {
  constructor() {
    this.id =
      'renovation';

    this.shopId =
      null;

    this.page =
      'layout';

    this.buttons =
      [];

    this.viewH =
      780;

    this.navH =
      64;

    this.contentBottom =
      716;
  }

  enter(payload) {
    const business =
      gameState
        .getBusiness();

    const data =
      payload || {};

    this.shopId =
      data.shopId ||
      business.currentShopId;

    if (this.shopId) {
      renovationSystem
        .ensurePlan(
          this.shopId
        );

      visualAssetSystem
        .loadGroup(
          'renovation'
        );

      visualAssetSystem
        .loadGroup(
          'premiumRenovation'
        );
    }

    this.page =
      'layout';
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

      height =
        screenH /
        (
          screenW /
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

  showToast(text) {
    if (
      api &&
      typeof api.showToast ===
        'function'
    ) {
      api.showToast({
        title:
          String(text),
        icon:
          'none'
      });
    }
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

  roundedRect(
    ctx,
    x,
    y,
    w,
    h,
    r,
    fill,
    stroke,
    width
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
        width || 1;
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

    const readableSize =
      Math.max(
        7.3,
        Number(
          size
        ) ||
        7.3
      );

    ctx.font =
      (
        weight ||
        '500'
      ) +
      ' ' +
      readableSize +
      'px sans-serif';

    ctx.textAlign =
      align ||
      'left';

    ctx.textBaseline =
      'middle';

    ctx.fillText(
      String(text),
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

  hitButton(x, y) {
    for (
      let i =
        this.buttons.length - 1;
      i >= 0;
      i--
    ) {
      const item =
        this.buttons[i];

      if (
        x >= item.x &&
        x <= item.x + item.w &&
        y >= item.y &&
        y <= item.y + item.h
      ) {
        return item;
      }
    }

    return null;
  }

  getShop() {
    return renovationSystem
      .getShop(
        this.shopId
      );
  }

  getMetrics() {
    return renovationSystem
      .getMetrics(
        this.shopId
      );
  }

  getPlan() {
    return renovationSystem
      .ensurePlan(
        this.shopId
      );
  }

  drawHeader(
    ctx,
    shop
  ) {
    premiumUi.coverImage(
      ctx,
      visualAssetSystem
        .get(
          'premium_reno_header'
        ),
      0,
      0,
      DESIGN_W,
      84,
      0,
      'rgba(3,31,47,0.50)'
    );

    ctx.fillStyle =
      'rgba(4,35,51,0.32)';

    ctx.fillRect(
      0,
      0,
      DESIGN_W,
      84
    );

    premiumUi.card(
      ctx,
      9,
      15,
      38,
      38,
      {
        radius:
          11,
        fill:
          'rgba(5,48,68,0.86)',
        stroke:
          'rgba(255,255,255,0.28)',
        shadow:
          false
      }
    );

    this.text(
      ctx,
      '‹',
      28,
      34,
      22,
      '#FFE6A0',
      '700',
      'center'
    );

    this.addButton(
      'back',
      5,
      11,
      46,
      46
    );

    this.text(
      ctx,
      shop.name ||
        '我的酒楼',
      59,
      22,
      16,
      COLORS.white,
      '700'
    );

    this.text(
      ctx,
      shop.address +
        ' · 自定义空间、桌椅、包厢与风格',
      59,
      47,
      6.8,
      '#D6E5EA',
      '500'
    );

    premiumUi.card(
      ctx,
      198,
      12,
      32,
      29,
      {
        radius:
          12,
        fill:
          'rgba(255,255,255,0.88)',
        stroke:
          'rgba(255,255,255,0.42)',
        shadow:
          false
      }
    );

    this.text(
      ctx,
      '↶',
      214,
      26.5,
      13,
      COLORS.navy,
      '700',
      'center'
    );

    this.addButton(
      'history:undo',
      194,
      8,
      40,
      37
    );

    premiumUi.card(
      ctx,
      236,
      12,
      32,
      29,
      {
        radius:
          12,
        fill:
          'rgba(255,255,255,0.88)',
        stroke:
          'rgba(255,255,255,0.42)',
        shadow:
          false
      }
    );

    this.text(
      ctx,
      '↷',
      252,
      26.5,
      13,
      COLORS.navy,
      '700',
      'center'
    );

    this.addButton(
      'history:redo',
      232,
      8,
      40,
      37
    );

    premiumUi.card(
      ctx,
      276,
      12,
      103,
      29,
      {
        radius:
          14,
        fill:
          '#F6B62B',
        stroke:
          '#FFE0A0',
        shadow:
          false
      }
    );

    this.text(
      ctx,
      '保存装修模板',
      327.5,
      26.5,
      6.8,
      COLORS.text,
      '700',
      'center'
    );

    this.addButton(
      'page:templates',
      272,
      8,
      111,
      37
    );

    this.text(
      ctx,
      money(
        gameState
          .getPlayer()
          .cash
      ),
      377,
      61,
      8,
      '#FFE8AE',
      '700',
      'right'
    );
  }

  drawTemplateStrip(
    ctx
  ) {
    const templates =
      customizationSystem
        .getTemplateList();

    const keys = [
      'premium_template_1',
      'premium_template_2',
      'premium_template_3'
    ];

    for (
      let i = 0;
      i < 3;
      i++
    ) {
      const x =
        10 +
        i *
        123;

      premiumUi.card(
        ctx,
        x,
        91,
        113,
        58,
        {
          radius:
            10,
          fill:
            '#FFF9EF',
          shadowBlur:
            5
        }
      );

      premiumUi.coverImage(
        ctx,
        visualAssetSystem
          .get(
            keys[i]
          ),
        x + 4,
        95,
        105,
        38,
        7,
        null
      );

      const template =
        templates[i];

      this.text(
        ctx,
        template
          ? template.name
          : (
              i ===
                0
                ? '暖木餐厅'
                : i ===
                    1
                  ? '现代轻奢'
                  : '中式雅宴'
            ),
        x + 7,
        141,
        6.2,
        COLORS.text,
        '700'
      );

      this.addButton(
        template
          ? (
              'template:apply:' +
              template.id
            )
          : 'page:templates',
        x,
        91,
        113,
        58
      );
    }
  }

  drawFloorTabs(
    ctx,
    plan
  ) {
    const y =
      156;

    const count =
      plan.floors.length;

    const gap =
      5;

    const w =
      Math.min(
        82,
        (
          DESIGN_W -
          20 -
          (
            count - 1
          ) *
          gap
        ) /
        count
      );

    for (
      let i = 0;
      i < count;
      i++
    ) {
      const active =
        i ===
        plan.activeFloor;

      const x =
        10 +
        i *
        (
          w +
          gap
        );

      this.roundedRect(
        ctx,
        x,
        y,
        w,
        27,
        8,
        active
          ? COLORS.gold
          : '#EEE5D8',
        active
          ? '#D49434'
          : '#D4C8BA'
      );

      this.text(
        ctx,
        plan
          .floors[i]
          .name,
        x +
          w / 2,
        y + 13.5,
        7.5,
        active
          ? '#26343B'
          : COLORS.muted,
        '700',
        'center'
      );

      this.addButton(
        'floor:' +
          i,
        x,
        y,
        w,
        27
      );
    }
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
    const image =
      visualAssetSystem
        .get(
          key
        );

    if (!image) {
      return false;
    }

    const iw =
      image.naturalWidth ||
      image.width ||
      1;

    const ih =
      image.naturalHeight ||
      image.height ||
      1;

    const scale =
      Math.min(
        w / iw,
        h / ih
      );

    const dw =
      iw *
      scale;

    const dh =
      ih *
      scale;

    ctx.save();

    ctx.globalAlpha =
      alpha == null
        ? 1
        : alpha;

    ctx.drawImage(
      image,
      x +
        (
          w -
          dw
        ) /
        2,
      y +
        (
          h -
          dh
        ) /
        2,
      dw,
      dh
    );

    ctx.restore();

    return true;
  }

  drawFloorPlan(
    ctx,
    metrics,
    floor
  ) {
    const x =
      10;

    const y =
      190;

    const w =
      370;

    const h =
      208;

    premiumUi.card(
      ctx,
      x,
      y,
      w,
      h,
      {
        radius:
          15,
        fill:
          '#F7F1E8',
        shadowBlur:
          8
      }
    );

    this.text(
      ctx,
      floor.name +
        ' · ' +
        floor.area +
        '㎡ · 座位' +
        floor.seats +
        ' · 剩余' +
        floor.remainingArea +
        '㎡',
      20,
      y + 17,
      7.3,
      COLORS.text,
      '700'
    );

    this.text(
      ctx,
      floor.valid
        ? '实时平面预览'
        : '面积超载',
      368,
      y + 17,
      6.8,
      floor.valid
        ? COLORS.green
        : COLORS.red,
      '700',
      'right'
    );

    const ix =
      18;

    const iy =
      y + 31;

    const iw =
      354;

    const ih =
      166;

    premiumUi.coverImage(
      ctx,
      visualAssetSystem
        .get(
          'premium_floor_texture'
        ),
      ix,
      iy,
      iw,
      ih,
      10,
      'rgba(255,249,240,0.50)'
    );

    this.roundedPath(
      ctx,
      ix,
      iy,
      iw,
      ih,
      10
    );

    ctx.save();
    ctx.clip();

    const serviceBlockW =
      Math.max(
        94,
        Math.min(
          142,
          iw *
          (
            floor.kitchenRatio +
            floor.storageRatio +
            floor.serviceRatio
          )
        )
      );

    const diningX =
      ix +
      serviceBlockW;

    const diningW =
      iw -
      serviceBlockW;

    const leftTotal =
      Math.max(
        0.01,
        floor.kitchenRatio +
        floor.storageRatio +
        floor.serviceRatio
      );

    const kitchenH =
      ih *
      floor.kitchenRatio /
      leftTotal;

    const storageH =
      ih *
      floor.storageRatio /
      leftTotal;

    const serviceH =
      ih -
      kitchenH -
      storageH;

    ctx.fillStyle =
      'rgba(239,179,137,0.72)';
    ctx.fillRect(
      ix,
      iy,
      serviceBlockW,
      kitchenH
    );

    ctx.fillStyle =
      'rgba(210,196,153,0.72)';
    ctx.fillRect(
      ix,
      iy +
        kitchenH,
      serviceBlockW,
      storageH
    );

    ctx.fillStyle =
      'rgba(133,193,208,0.68)';
    ctx.fillRect(
      ix,
      iy +
        kitchenH +
        storageH,
      serviceBlockW,
      serviceH
    );

    ctx.fillStyle =
      'rgba(220,240,225,0.50)';
    ctx.fillRect(
      diningX,
      iy,
      diningW,
      ih
    );

    ctx.restore();

    this.text(
      ctx,
      '后厨',
      ix + 10,
      iy + 12,
      6.5,
      '#683B2A',
      '700'
    );

    this.text(
      ctx,
      '仓储',
      ix + 10,
      iy +
        kitchenH +
        11,
      6.2,
      '#655B37',
      '700'
    );

    this.text(
      ctx,
      '服务',
      ix + 10,
      iy +
        kitchenH +
        storageH +
        11,
      6.2,
      '#26586B',
      '700'
    );

    this.text(
      ctx,
      '堂食 / 包厢',
      diningX + 10,
      iy + 12,
      6.5,
      COLORS.green,
      '700'
    );

    this.drawVisual(
      ctx,
      'visual_stove',
      ix + 8,
      iy + 22,
      serviceBlockW *
        0.48,
      Math.max(
        36,
        kitchenH - 27
      ),
      0.96
    );

    this.drawVisual(
      ctx,
      'visual_fridge',
      ix +
        serviceBlockW *
        0.50,
      iy + 22,
      serviceBlockW *
        0.40,
      Math.max(
        36,
        kitchenH - 27
      ),
      0.96
    );

    this.drawVisual(
      ctx,
      'visual_register',
      ix + 8,
      iy +
        kitchenH +
        storageH +
        14,
      serviceBlockW -
        16,
      Math.max(
        24,
        serviceH - 19
      ),
      0.94
    );

    const roomCount =
      floor
        .privateRooms
        .length;

    const roomLaneW =
      roomCount
        ? Math.min(
            74,
            Math.max(
              54,
              diningW *
                0.33
            )
          )
        : 0;

    if (
      roomCount >
      0
    ) {
      this.drawVisual(
        ctx,
        'visual_divider',
        diningX +
          diningW -
          roomLaneW -
          2,
        iy + 18,
        roomLaneW,
        ih - 22,
        0.30
      );
    }

    for (
      let i = 0;
      i <
      Math.min(
        roomCount,
        4
      );
      i++
    ) {
      const room =
        floor
          .privateRooms[i];

      const ry =
        iy +
        23 +
        i *
          31;

      premiumUi.card(
        ctx,
        diningX +
          diningW -
          roomLaneW +
          5,
        ry,
        roomLaneW -
          10,
        25,
        {
          radius:
            7,
          fill:
            'rgba(255,236,194,0.92)',
          stroke:
            '#DAB66D',
          shadow:
            false
        }
      );

      this.text(
        ctx,
        (
          room.name ||
          (
            '包厢' +
            (
              i + 1
            )
          )
        ).slice(
          0,
          6
        ),
        diningX +
          diningW -
          roomLaneW / 2,
        ry + 12.5,
        5.8,
        COLORS.text,
        '700',
        'center'
      );
    }

    const tableZoneW =
      diningW -
      (
        roomLaneW
          ? roomLaneW + 2
          : 4
      );

    let tableIndex =
      0;

    const tableKeys = [
      '2',
      '4',
      '6',
      '8'
    ];

    for (
      let k = 0;
      k <
      tableKeys.length;
      k++
    ) {
      const key =
        tableKeys[k];

      const count =
        floor.tables[
          key
        ] ||
        0;

      for (
        let i = 0;
        i <
        Math.min(
          count,
          16
        );
        i++
      ) {
        const cols =
          Math.max(
            1,
            Math.floor(
              tableZoneW /
              43
            )
          );

        const col =
          tableIndex %
          cols;

        const row =
          Math.floor(
            tableIndex /
            cols
          );

        const tx =
          diningX +
          10 +
          col *
            43;

        const ty =
          iy +
          32 +
          row *
            36;

        if (
          ty >
          iy +
          ih -
          25
        ) {
          break;
        }

        const tableW =
          key ===
            '2'
            ? 25
            : key ===
                '4'
              ? 30
              : key ===
                  '6'
                ? 34
                : 38;

        this.drawVisual(
          ctx,
          'visual_table_' +
            key,
          tx,
          ty,
          tableW,
          25,
          0.98
        );

        tableIndex +=
          1;
      }
    }

    this.drawVisual(
      ctx,
      'visual_plant',
      diningX + 5,
      iy +
        ih -
        37,
      29,
      32,
      0.95
    );

    this.drawVisual(
      ctx,
      'visual_light',
      diningX +
        Math.max(
          35,
          tableZoneW *
            0.44
        ),
      iy + 9,
      24,
      31,
      0.80
    );
  }

  drawTopMetrics(
    ctx,
    metrics
  ) {
    const y =
      407;

    const gap =
      6;

    const w =
      (
        DESIGN_W -
        20 -
        gap *
          2
      ) /
      3;

    const items = [
      [
        '总座位',
        metrics.totalSeats +
          '席',
        COLORS.green
      ],
      [
        '装修预算',
        money(
          metrics.totalCost
        ),
        COLORS.red
      ],
      [
        '预计工期',
        metrics.buildDays +
          '天',
        COLORS.orange
      ]
    ];

    for (
      let i = 0;
      i <
      items.length;
      i++
    ) {
      const x =
        10 +
        i *
        (
          w +
          gap
        );

      premiumUi.card(
        ctx,
        x,
        y,
        w,
        46,
        {
          radius:
            12,
          fill:
            '#FFF9EF'
        }
      );

      this.text(
        ctx,
        items[i][0],
        x + 9,
        y + 13,
        6.3,
        COLORS.muted,
        '600'
      );

      this.text(
        ctx,
        items[i][1],
        x + 9,
        y + 32,
        9.4,
        items[i][2],
        '700'
      );
    }
  }

  drawPageTabs(ctx) {
    const y =
      462;

    const tabs = [
      [
        'layout',
        '空间'
      ],
      [
        'tables',
        '桌椅'
      ],
      [
        'rooms',
        '包厢'
      ],
      [
        'style',
        '风格'
      ],
      [
        'templates',
        '模板'
      ]
    ];

    const gap =
      4;

    const w =
      (
        DESIGN_W -
        20 -
        gap * 4
      ) /
      5;

    for (
      let i = 0;
      i <
      tabs.length;
      i++
    ) {
      const active =
        this.page ===
        tabs[i][0];

      const x =
        10 +
        i *
        (
          w +
          gap
        );

      this.roundedRect(
        ctx,
        x,
        y,
        w,
        32,
        9,
        active
          ? COLORS.navy
          : '#EAE1D5',
        active
          ? '#244A60'
          : '#D5C8B9'
      );

      this.text(
        ctx,
        tabs[i][1],
        x +
          w / 2,
        y + 16,
        7.5,
        active
          ? COLORS.white
          : COLORS.text,
        '700',
        'center'
      );

      this.addButton(
        'page:' +
          tabs[i][0],
        x,
        y,
        w,
        32
      );
    }
  }

  drawAdjustRow(
    ctx,
    id,
    label,
    value,
    sub,
    y,
    canMinus,
    canPlus
  ) {
    this.roundedRect(
      ctx,
      10,
      y,
      370,
      52,
      11,
      COLORS.panel,
      COLORS.line
    );

    this.text(
      ctx,
      label,
      22,
      y + 17,
      8.5,
      COLORS.text,
      '700'
    );

    this.text(
      ctx,
      sub,
      22,
      y + 36,
      6.5,
      COLORS.muted,
      '500'
    );

    this.roundedRect(
      ctx,
      252,
      y + 10,
      32,
      32,
      8,
      canMinus
        ? '#E9E2D8'
        : '#F0ECE6'
    );

    this.text(
      ctx,
      '−',
      268,
      y + 26,
      15,
      canMinus
        ? COLORS.navy
        : '#B6AEA5',
      '700',
      'center'
    );

    this.addButton(
      id +
        ':minus',
      248,
      y + 6,
      40,
      40
    );

    this.text(
      ctx,
      value,
      312,
      y + 26,
      9,
      COLORS.text,
      '700',
      'center'
    );

    this.roundedRect(
      ctx,
      340,
      y + 10,
      32,
      32,
      8,
      canPlus
        ? COLORS.gold
        : '#E3DDD4'
    );

    this.text(
      ctx,
      '+',
      356,
      y + 26,
      14,
      canPlus
        ? '#26343B'
        : '#B6AEA5',
      '700',
      'center'
    );

    this.addButton(
      id +
        ':plus',
      336,
      y + 6,
      40,
      40
    );
  }

  renderLayoutPage(
    ctx,
    floor
  ) {
    let y =
      503;

    this.drawAdjustRow(
      ctx,
      'zone:kitchen',
      '后厨面积',
      pct(
        floor.kitchenRatio
      ),
      '决定出餐承载与后厨动线',
      y,
      true,
      true
    );

    y += 58;

    this.drawAdjustRow(
      ctx,
      'zone:storage',
      '仓储面积',
      pct(
        floor.storageRatio
      ),
      '影响备货能力与操作空间',
      y,
      true,
      true
    );

    y += 58;

    this.drawAdjustRow(
      ctx,
      'zone:service',
      '服务/收银区',
      pct(
        floor.serviceRatio
      ),
      '收银、等位、传菜和服务站',
      y,
      true,
      true
    );

    y += 58;

    const aisle =
      renovationConfig
        .aisleModes[
          floor.aisleMode
        ];

    this.roundedRect(
      ctx,
      10,
      y,
      370,
      52,
      11,
      COLORS.panel,
      COLORS.line
    );

    this.text(
      ctx,
      '桌间通道',
      22,
      y + 17,
      8.5,
      COLORS.text,
      '700'
    );

    this.text(
      ctx,
      '越宽舒适度越高，但会占用更多可摆桌面积',
      22,
      y + 36,
      6.5,
      COLORS.muted,
      '500'
    );

    this.roundedRect(
      ctx,
      280,
      y + 10,
      90,
      32,
      8,
      '#E6EEF1',
      '#B8CBD3'
    );

    this.text(
      ctx,
      aisle.name +
        ' ›',
      325,
      y + 26,
      8,
      COLORS.navy,
      '700',
      'center'
    );

    this.addButton(
      'aisle:cycle',
      276,
      y + 6,
      98,
      40
    );
  }

  renderTablesPage(
    ctx,
    floor
  ) {
    const options = [
      2,
      4,
      6,
      8
    ];

    const keys = {
      2:
        'premium_table_2',
      4:
        'premium_table_4',
      6:
        'premium_table_6',
      8:
        'premium_table_8'
    };

    premiumUi.card(
      ctx,
      10,
      503,
      370,
      126,
      {
        radius:
          13
      }
    );

    this.text(
      ctx,
      '餐桌类型',
      21,
      520,
      9,
      COLORS.text,
      '700'
    );

    this.text(
      ctx,
      '数量变化会立即更新座位、拥挤度和预算',
      92,
      520,
      6.2,
      COLORS.muted,
      '500'
    );

    for (
      let i = 0;
      i <
      options.length;
      i++
    ) {
      const seats =
        options[i];

      const count =
        floor.tables[
          String(
            seats
          )
        ] ||
        0;

      const x =
        18 +
        i *
        91;

      premiumUi.card(
        ctx,
        x,
        535,
        82,
        83,
        {
          radius:
            10,
          fill:
            '#FFF8ED',
          shadow:
            false
        }
      );

      premiumUi.coverImage(
        ctx,
        visualAssetSystem
          .get(
            keys[
              seats
            ]
          ),
        x + 5,
        540,
        72,
        42,
        7,
        null
      );

      this.text(
        ctx,
        seats +
          '人桌',
        x + 41,
        590,
        6.5,
        COLORS.text,
        '700',
        'center'
      );

      this.roundedRect(
        ctx,
        x + 5,
        600,
        19,
        16,
        7,
        '#EAE3D8'
      );

      this.text(
        ctx,
        '−',
        x + 14.5,
        608,
        8,
        COLORS.navy,
        '700',
        'center'
      );

      this.addButton(
        'table:' +
          seats +
          ':minus',
        x + 2,
        597,
        25,
        22
      );

      this.text(
        ctx,
        count,
        x + 41,
        608,
        6.8,
        COLORS.text,
        '700',
        'center'
      );

      this.roundedRect(
        ctx,
        x + 58,
        600,
        19,
        16,
        7,
        COLORS.gold
      );

      this.text(
        ctx,
        '+',
        x + 67.5,
        608,
        8,
        COLORS.text,
        '700',
        'center'
      );

      this.addButton(
        'table:' +
          seats +
          ':plus',
        x + 55,
        597,
        25,
        22
      );
    }
  }

  renderRoomsPage(
    ctx,
    floor
  ) {
    let y =
      503;

    const rooms =
      floor
        .privateRooms;

    if (!rooms.length) {
      this.roundedRect(
        ctx,
        10,
        y,
        370,
        84,
        12,
        COLORS.panel,
        COLORS.line
      );

      this.text(
        ctx,
        '当前楼层没有包厢',
        22,
        y + 25,
        11,
        COLORS.text,
        '700'
      );

      this.text(
        ctx,
        '新增后会占用堂食面积，同时提高多人聚餐和高客单承载。',
        22,
        y + 54,
        7,
        COLORS.muted,
        '500'
      );

      y += 94;
    } else {
      for (
        let i = 0;
        i <
        Math.min(
          rooms.length,
          4
        );
        i++
      ) {
        const room =
          rooms[i];

        const style =
          renovationConfig
            .privateRoomStyles
            .find(
              item =>
                item.id ===
                room.style
            ) ||
          renovationConfig
            .privateRoomStyles[0];

        this.roundedRect(
          ctx,
          10,
          y,
          370,
          55,
          11,
          COLORS.panel,
          COLORS.line
        );

        this.text(
          ctx,
          room.name ||
            (
              '包厢' +
              (
                i + 1
              )
            ),
          22,
          y + 17,
          8.5,
          COLORS.text,
          '700'
        );

        this.text(
          ctx,
          room.seats +
            '人 · ' +
            style.name,
          22,
          y + 38,
          7,
          COLORS.muted,
          '600'
        );

        this.roundedRect(
          ctx,
          151,
          y + 10,
          52,
          34,
          8,
          '#F5EEE4',
          '#D8CBBB'
        );

        this.text(
          ctx,
          '✎ 名称',
          177,
          y + 27,
          6.6,
          COLORS.orange,
          '700',
          'center'
        );

        this.addButton(
          'room:rename:' +
            room.id,
          147,
          y + 6,
          60,
          42
        );

        this.roundedRect(
          ctx,
          211,
          y + 10,
          66,
          34,
          8,
          '#E7EEF1'
        );

        this.text(
          ctx,
          '人数 ›',
          244,
          y + 27,
          7,
          COLORS.navy,
          '700',
          'center'
        );

        this.addButton(
          'room:seats:' +
            room.id,
          207,
          y + 6,
          74,
          42
        );

        this.roundedRect(
          ctx,
          283,
          y + 10,
          56,
          34,
          8,
          '#FFF0D6'
        );

        this.text(
          ctx,
          '风格 ›',
          311,
          y + 27,
          7,
          COLORS.orange,
          '700',
          'center'
        );

        this.addButton(
          'room:style:' +
            room.id,
          279,
          y + 6,
          64,
          42
        );

        this.roundedRect(
          ctx,
          345,
          y + 10,
          27,
          34,
          8,
          '#F2E4E1'
        );

        this.text(
          ctx,
          '×',
          358.5,
          y + 27,
          9,
          COLORS.red,
          '700',
          'center'
        );

        this.addButton(
          'room:remove:' +
            room.id,
          341,
          y + 6,
          35,
          42
        );

        y += 61;
      }
    }

    if (
      rooms.length <
      8 &&
      y <
      this.contentBottom -
        58
    ) {
      this.roundedRect(
        ctx,
        10,
        y,
        370,
        40,
        11,
        COLORS.gold,
        '#D49434'
      );

      this.text(
        ctx,
        '+ 新增包厢',
        195,
        y + 20,
        8.5,
        '#26343B',
        '700',
        'center'
      );

      this.addButton(
        'room:add',
        10,
        y,
        370,
        40
      );
    }
  }

  drawCycleRow(
    ctx,
    id,
    label,
    value,
    sub,
    y
  ) {
    this.roundedRect(
      ctx,
      10,
      y,
      370,
      52,
      11,
      COLORS.panel,
      COLORS.line
    );

    this.text(
      ctx,
      label,
      22,
      y + 17,
      8.5,
      COLORS.text,
      '700'
    );

    this.text(
      ctx,
      sub,
      22,
      y + 36,
      6.5,
      COLORS.muted,
      '500'
    );

    this.text(
      ctx,
      value +
        ' ›',
      365,
      y + 26,
      8,
      COLORS.navy,
      '700',
      'right'
    );

    this.addButton(
      id,
      10,
      y,
      370,
      52
    );
  }

  renderStylePage(
    ctx,
    metrics
  ) {
    const plan =
      metrics.plan;

    const hall =
      renovationConfig
        .hallStyles
        .find(
          item =>
            item.id ===
            plan.hallStyle
        );

    const material =
      renovationConfig
        .materialGrades
        .find(
          item =>
            item.id ===
            plan.materialGrade
        );

    const lighting =
      renovationConfig
        .lightingLevels
        .find(
          item =>
            item.id ===
            plan.lightingLevel
        );

    const items = [
      {
        id:
          'style:hall',
        label:
          '大厅风格',
        value:
          hall.name,
        icon:
          '▣'
      },
      {
        id:
          'style:material',
        label:
          '材料',
        value:
          material.name,
        icon:
          '▤'
      },
      {
        id:
          'style:lighting',
        label:
          '灯光',
        value:
          lighting.name,
        icon:
          '☼'
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
      items.length;
      i++
    ) {
      const item =
        items[i];

      const x =
        10 +
        i *
        (
          w +
          gap
        );

      premiumUi.card(
        ctx,
        x,
        503,
        w,
        73,
        {
          radius:
            12,
          fill:
            i ===
              0
              ? '#FFF2D3'
              : '#FFF9EF'
        }
      );

      this.text(
        ctx,
        item.icon,
        x + 13,
        522,
        13,
        i ===
          0
          ? COLORS.orange
          : COLORS.blue,
        '700'
      );

      this.text(
        ctx,
        item.label,
        x + 34,
        520,
        6.5,
        COLORS.muted,
        '600'
      );

      this.text(
        ctx,
        item.value,
        x + 12,
        551,
        8,
        COLORS.text,
        '700'
      );

      this.text(
        ctx,
        '点击切换 ›',
        x +
          w -
          10,
        565,
        5.5,
        COLORS.navy,
        '600',
        'right'
      );

      this.addButton(
        item.id,
        x,
        503,
        w,
        73
      );
    }

    this.text(
      ctx,
      '施工队报价',
      14,
      594,
      7,
      COLORS.muted,
      '700'
    );

    const quotes =
      renovationSystem
        .getContractorQuotes(
          this.shopId
        );

    for (
      let i = 0;
      i <
      Math.min(
        3,
        quotes.length
      );
      i++
    ) {
      const q =
        quotes[i];

      const selected =
        q.id ===
        plan.selectedContractorId ||
        (
          !plan.selectedContractorId &&
          i === 0
        );

      const x =
        10 +
        i *
        123;

      premiumUi.card(
        ctx,
        x,
        604,
        113,
        52,
        {
          radius:
            10,
          fill:
            selected
              ? '#FFF0D0'
              : '#FFF9EF',
          stroke:
            selected
              ? '#DFB35B'
              : '#DED1C1',
          shadow:
            false
        }
      );

      this.text(
        ctx,
        q.name
          .slice(
            0,
            7
          ),
        x + 8,
        618,
        6.5,
        COLORS.text,
        '700'
      );

      this.text(
        ctx,
        money(
          q.price
        ) +
          ' · ' +
          q.days +
          '天',
        x + 8,
        638,
        5.8,
        COLORS.muted,
        '600'
      );

      this.text(
        ctx,
        selected
          ? '✓ 已选'
          : '选择',
        x + 103,
        647,
        5.5,
        selected
          ? COLORS.orange
          : COLORS.navy,
        '700',
        'right'
      );

      this.addButton(
        'contractor:' +
          q.id,
        x,
        604,
        113,
        52
      );
    }

    const actionY =
      this.contentBottom -
      49;

    this.roundedRect(
      ctx,
      10,
      actionY,
      370,
      39,
      13,
      metrics.valid
        ? COLORS.gold
        : '#DED7CD',
      metrics.valid
        ? '#D49434'
        : '#C4BAAD'
    );

    this.text(
      ctx,
      metrics.valid
        ? '确认方案并开始施工  ›'
        : '当前布局超载，不能施工',
      195,
      actionY + 19.5,
      8.8,
      metrics.valid
        ? COLORS.text
        : COLORS.muted,
      '700',
      'center'
    );

    this.addButton(
      'construction:start',
      10,
      actionY,
      370,
      39
    );
  }

  renderTemplatesPage(
    ctx,
    metrics
  ) {
    const templates =
      customizationSystem
        .getTemplateList();

    premiumUi.card(
      ctx,
      10,
      503,
      370,
      42,
      {
        radius:
          12,
        fill:
          '#FFF2D3',
        stroke:
          '#E5BE63'
      }
    );

    this.text(
      ctx,
      '＋ 保存当前装修方案为模板',
      195,
      524,
      8,
      COLORS.text,
      '700',
      'center'
    );

    this.addButton(
      'template:save',
      10,
      503,
      370,
      42
    );

    const visualKeys = [
      'premium_template_1',
      'premium_template_2',
      'premium_template_3'
    ];

    for (
      let i = 0;
      i < 3;
      i++
    ) {
      const x =
        10 +
        i *
        123;

      const item =
        templates[i];

      premiumUi.card(
        ctx,
        x,
        556,
        113,
        105,
        {
          radius:
            11,
          fill:
            '#FFF9EF'
        }
      );

      premiumUi.coverImage(
        ctx,
        visualAssetSystem
          .get(
            visualKeys[i]
          ),
        x + 5,
        561,
        103,
        51,
        8,
        null
      );

      this.text(
        ctx,
        item
          ? item.name
          : (
              '灵感模板' +
              (
                i + 1
              )
            ),
        x + 7,
        622,
        6.6,
        COLORS.text,
        '700'
      );

      if (item) {
        this.roundedRect(
          ctx,
          x + 5,
          636,
          48,
          19,
          7,
          '#E5F1E8'
        );

        this.text(
          ctx,
          '使用',
          x + 29,
          645.5,
          5.8,
          COLORS.green,
          '700',
          'center'
        );

        this.addButton(
          'template:apply:' +
            item.id,
          x + 2,
          633,
          54,
          25
        );

        this.roundedRect(
          ctx,
          x + 58,
          636,
          49,
          19,
          7,
          '#FFF0D6'
        );

        this.text(
          ctx,
          '改名',
          x + 82.5,
          645.5,
          5.8,
          COLORS.orange,
          '700',
          'center'
        );

        this.addButton(
          'template:rename:' +
            item.id,
          x + 55,
          633,
          55,
          25
        );
      } else {
        this.text(
          ctx,
          '保存后可跨门店适配',
          x + 7,
          646,
          5.2,
          COLORS.muted,
          '500'
        );
      }
    }

    if (
      templates.length >
      3
    ) {
      this.text(
        ctx,
        '还有 ' +
          (
            templates.length -
            3
          ) +
          ' 个已保存模板',
        15,
        677,
        6.2,
        COLORS.muted,
        '600'
      );
    }

    this.text(
      ctx,
      '模板保存：空间比例、桌椅密度、包厢名称/风格、材料与灯光。',
      15,
      Math.min(
        this.contentBottom -
          22,
        699
      ),
      6,
      COLORS.muted,
      '500'
    );
  }

  renderConstruction(
    ctx,
    shop,
    plan
  ) {
    const construction =
      plan.construction;

    this.drawHeader(
      ctx,
      shop
    );

    this.roundedRect(
      ctx,
      12,
      92,
      366,
      166,
      15,
      COLORS.panel,
      COLORS.line
    );

    this.text(
      ctx,
      plan.status ===
        'completed'
        ? '装修已完成'
        : '正在施工',
      24,
      123,
      17,
      plan.status ===
        'completed'
        ? COLORS.green
        : COLORS.orange,
      '700'
    );

    this.text(
      ctx,
      construction
        ? construction
            .contractor
            .name
        : '施工记录',
      24,
      154,
      9,
      COLORS.text,
      '700'
    );

    this.text(
      ctx,
      construction
        ? '总价 ' +
          money(
            construction.paid
          ) +
          ' · 第' +
          construction.startDay +
          '天开工 · 第' +
          construction.finishDay +
          '天完工'
        : '',
      24,
      181,
      7,
      COLORS.muted,
      '600'
    );

    if (construction) {
      const currentDay =
        require('../core/simulationSystem.js')
          .getDayOrdinal(
            gameState
              .getTime()
          );

      const total =
        Math.max(
          1,
          construction.finishDay -
          construction.startDay
        );

      const progress =
        Math.max(
          0,
          Math.min(
            1,
            (
              currentDay -
              construction.startDay
            ) /
            total
          )
        );

      this.roundedRect(
        ctx,
        24,
        209,
        330,
        13,
        7,
        '#E8E0D5'
      );

      this.roundedRect(
        ctx,
        24,
        209,
        Math.max(
          8,
          330 *
          (
            plan.status ===
              'completed'
              ? 1
              : progress
          )
        ),
        13,
        7,
        plan.status ===
          'completed'
          ? COLORS.green
          : COLORS.gold
      );

      this.text(
        ctx,
        plan.status ===
          'completed'
          ? '100%'
          : Math.round(
              progress *
              100
            ) +
            '%',
        359,
        238,
        7,
        COLORS.muted,
        '700',
        'right'
      );
    }

    this.roundedRect(
      ctx,
      12,
      278,
      366,
      142,
      14,
      COLORS.panel,
      COLORS.line
    );

    const metrics =
      construction
        ? construction
            .snapshot
        : this.getMetrics();

    this.text(
      ctx,
      '完工方案',
      24,
      301,
      10,
      COLORS.text,
      '700'
    );

    this.text(
      ctx,
      '座位 ' +
        metrics.totalSeats +
        '席 · 包厢 ' +
        metrics.roomCount +
        '间 · 后厨 ' +
        metrics.kitchenArea +
        '㎡',
      24,
      333,
      8,
      COLORS.navy,
      '700'
    );

    this.text(
      ctx,
      '舒适度×' +
        metrics.comfort.toFixed(2) +
        ' · 吸引力×' +
        metrics.appeal.toFixed(2) +
        ' · 运营效率×' +
        metrics
          .operationalEfficiency
          .toFixed(2),
      24,
      362,
      7.5,
      COLORS.muted,
      '600'
    );

    this.text(
      ctx,
      plan.status ===
        'completed'
        ? '下一步：设备采购、证照与招聘'
        : '时间继续推进，施工进度会随游戏日期变化。',
      24,
      397,
      7,
      plan.status ===
        'completed'
        ? COLORS.green
        : COLORS.orange,
      '700'
    );

    const actionY =
      this.contentBottom -
      50;

    this.roundedRect(
      ctx,
      12,
      actionY,
      366,
      40,
      11,
      COLORS.navy,
      '#244A60'
    );

    this.text(
      ctx,
      '返回门店',
      195,
      actionY + 20,
      9,
      COLORS.white,
      '700',
      'center'
    );

    this.addButton(
      'back',
      12,
      actionY,
      366,
      40
    );
  }

  render(ctx) {
    if (!ctx) {
      return;
    }

    this.getLayout();
    this.buttons = [];

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

    this.drawFloorTabs(
      ctx,
      plan
    );

    const floor =
      metrics.floors[
        plan.activeFloor
      ];

    this.drawFloorPlan(
      ctx,
      metrics,
      floor
    );

    this.drawTopMetrics(
      ctx,
      metrics
    );

    this.drawPageTabs(
      ctx
    );

    if (
      this.page ===
      'layout'
    ) {
      this.renderLayoutPage(
        ctx,
        floor
      );
    } else if (
      this.page ===
      'tables'
    ) {
      this.renderTablesPage(
        ctx,
        floor
      );
    } else if (
      this.page ===
      'rooms'
    ) {
      this.renderRoomsPage(
        ctx,
        floor
      );
    } else if (
      this.page ===
      'style'
    ) {
      this.renderStylePage(
        ctx,
        metrics
      );
    } else {
      this.renderTemplatesPage(
        ctx,
        metrics
      );
    }

    ctx.restore();
  }

  handleTap(x, y) {
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
      'history:undo'
    ) {
      const result =
        renovationSystem
          .undo(
            this.shopId
          );

      this.showToast(
        result
          ? '已撤销上一步'
          : '没有可撤销操作'
      );

      return true;
    }

    if (
      id ===
      'history:redo'
    ) {
      const result =
        renovationSystem
          .redo(
            this.shopId
          );

      this.showToast(
        result
          ? '已重做'
          : '没有可重做操作'
      );

      return true;
    }

    if (
      id ===
      'shop:rename'
    ) {
      const shop =
        this.getShop();

      if (shop) {
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
      }

      return true;
    }

    const plan =
      this.getPlan();

    const floorIndex =
      plan.activeFloor;

    if (
      id.indexOf(
        'floor:'
      ) ===
      0
    ) {
      renovationSystem
        .setActiveFloor(
          this.shopId,
          Number(
            id.split(':')[1]
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

    if (
      id.indexOf(
        'zone:'
      ) ===
      0
    ) {
      const parts =
        id.split(':');

      const map = {
        kitchen:
          'kitchenRatio',
        storage:
          'storageRatio',
        service:
          'serviceRatio'
      };

      renovationSystem
        .adjustZone(
          this.shopId,
          floorIndex,
          map[
            parts[1]
          ],
          parts[2] ===
            'plus'
            ? 0.02
            : -0.02
        );

      return true;
    }

    if (
      id ===
      'aisle:cycle'
    ) {
      renovationSystem
        .cycleAisle(
          this.shopId,
          floorIndex
        );
      return true;
    }

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
            item =>
              item.id ===
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
            'room:seats:'.length
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
            'room:style:'.length
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
            'room:remove:'.length
          )
        );
      return true;
    }

    if (
      id ===
      'template:save'
    ) {
      const templates =
        customizationSystem
          .getTemplateList();

      textInput
        .requestText({
          title:
            '保存装修模板',

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
                ? '装修模板已保存'
                : result.message
            );

            textInput
              .requestRender();
          }
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
          ? (
              result.metrics
                .valid
                ? '模板已套用并自动适配当前门店'
                : '模板已套用，但当前面积需要继续调整'
            )
          : result.message
      );

      if (result.ok) {
        this.page =
          'layout';
      }

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

      const template =
        customizationSystem
          .getTemplateList()
          .find(
            item =>
              item.id ===
              templateId
          );

      if (template) {
        textInput
          .requestText({
            title:
              '修改模板名称',

            value:
              template.name,

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
                  ? '模板名称已更新'
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
      const templateId =
        id.slice(
          'template:delete:'
            .length
        );

      const remove =
        () => {
          const result =
            customizationSystem
              .deleteTemplate(
                templateId
              );

          this.showToast(
            result.ok
              ? '模板已删除'
              : result.message
          );

          textInput
            .requestRender();
        };

      if (
        api &&
        typeof api.showModal ===
          'function'
      ) {
        api.showModal({
          title:
            '删除装修模板',

          content:
            '删除后不能恢复，确定删除吗？',

          confirmText:
            '删除',

          cancelText:
            '取消',

          success:
            result => {
              if (
                result &&
                result.confirm
              ) {
                remove();
              }
            }
        });
      } else {
        remove();
      }

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
      id.indexOf(
        'contractor:'
      ) ===
      0
    ) {
      renovationSystem
        .selectContractor(
          this.shopId,
          id.slice(
            'contractor:'.length
          )
        );
      return true;
    }

    if (
      id ===
      'construction:start'
    ) {
      const result =
        renovationSystem
          .startConstruction(
            this.shopId
          );

      this.showToast(
        result.ok
          ? '已开工，预计第' +
            result.finishDay +
            '天完成'
          : result.message
      );

      return true;
    }

    return false;
  }
}

module.exports =
  new RenovationScene();
