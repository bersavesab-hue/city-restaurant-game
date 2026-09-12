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
    this.buttons.push({
      id,
      x,
      y,
      w,
      h
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
    ctx.fillStyle =
      COLORS.navy2;

    ctx.fillRect(
      0,
      0,
      DESIGN_W,
      66
    );

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
      shop.name ||
        '我的酒楼',
      68,
      21,
      16,
      COLORS.white,
      '700'
    );

    this.roundedRect(
      ctx,
      205,
      10,
      52,
      28,
      8,
      'rgba(255,255,255,0.10)',
      'rgba(255,255,255,0.18)'
    );

    this.text(
      ctx,
      '✎ 改名',
      231,
      24,
      6.8,
      '#FFE8AE',
      '700',
      'center'
    );

    this.addButton(
      'shop:rename',
      201,
      6,
      60,
      36
    );

    this.text(
      ctx,
      '自定义装修 · ' +
        shop.address,
      68,
      44,
      7.2,
      'rgba(255,255,255,0.72)',
      '500'
    );

    this.text(
      ctx,
      money(
        gameState
          .getPlayer()
          .cash
      ),
      376,
      22,
      12,
      '#FFE8AE',
      '700',
      'right'
    );

    this.text(
      ctx,
      '可用资金',
      376,
      44,
      6.5,
      '#D8E5EB',
      '500',
      'right'
    );
  }

  drawFloorTabs(
    ctx,
    plan
  ) {
    const y =
      72;

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
        29,
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
        y + 14.5,
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
        29
      );
    }
  }

  drawFloorPlan(
    ctx,
    metrics,
    floor
  ) {
    const x =
      10;

    const y =
      108;

    const w =
      370;

    const h =
      142;

    this.roundedRect(
      ctx,
      x,
      y,
      w,
      h,
      14,
      '#FDF9F1',
      '#CFC2B3'
    );

    const total =
      Math.max(
        1,
        floor.area
      );

    const zones = [
      {
        name: '后厨',
        ratio:
          floor.kitchenRatio,
        fill:
          '#EFC7A7'
      },
      {
        name: '储物',
        ratio:
          floor.storageRatio,
        fill:
          '#D8D0B7'
      },
      {
        name: '服务',
        ratio:
          floor.serviceRatio,
        fill:
          '#BDD8DF'
      }
    ];

    let cursor =
      x + 8;

    const innerY =
      y + 29;

    const innerH =
      h - 38;

    const innerW =
      w - 16;

    for (
      let i = 0;
      i < zones.length;
      i++
    ) {
      const zoneW =
        innerW *
        zones[i].ratio;

      this.roundedRect(
        ctx,
        cursor,
        innerY,
        zoneW,
        innerH,
        6,
        zones[i].fill
      );

      this.text(
        ctx,
        zones[i].name,
        cursor +
          zoneW / 2,
        innerY +
          13,
        6.5,
        COLORS.text,
        '700',
        'center'
      );

      cursor +=
        zoneW;
    }

    const diningX =
      cursor;

    const diningW =
      x +
      w -
      8 -
      diningX;

    this.roundedRect(
      ctx,
      diningX,
      innerY,
      diningW,
      innerH,
      6,
      '#E7F0E8'
    );

    this.text(
      ctx,
      '堂食/包厢',
      diningX +
        8,
      innerY +
        13,
      6.5,
      COLORS.green,
      '700'
    );

    const roomCount =
      floor
        .privateRooms
        .length;

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

      const rx =
        diningX +
        diningW -
        57;

      const ry =
        innerY +
        23 +
        i * 20;

      this.roundedRect(
        ctx,
        rx,
        ry,
        49,
        17,
        4,
        '#F1DDB8',
        '#D7B06B'
      );

      this.text(
        ctx,
        (
          room.name ||
          (
            '包' +
            room.seats
          )
        ).slice(
          0,
          5
        ),
        rx + 24.5,
        ry + 8.5,
        5.6,
        COLORS.text,
        '700',
        'center'
      );
    }

    const tableAreaW =
      Math.max(
        30,
        diningW -
        (
          roomCount
            ? 66
            : 10
        )
      );

    let tableIndex =
      0;

    const tableKeys =
      [
        '2',
        '4',
        '6',
        '8'
      ];

    for (
      let k = 0;
      k < tableKeys.length;
      k++
    ) {
      const key =
        tableKeys[k];

      const count =
        floor
          .tables[key] ||
        0;

      for (
        let i = 0;
        i <
        Math.min(
          count,
          18
        );
        i++
      ) {
        const col =
          tableIndex %
          Math.max(
            1,
            Math.floor(
              tableAreaW /
              27
            )
          );

        const row =
          Math.floor(
            tableIndex /
            Math.max(
              1,
              Math.floor(
                tableAreaW /
                27
              )
            )
          );

        const tx =
          diningX +
          13 +
          col *
            27;

        const ty =
          innerY +
          31 +
          row *
            23;

        if (
          ty >
          innerY +
          innerH -
          15
        ) {
          break;
        }

        this.roundedRect(
          ctx,
          tx,
          ty,
          key ===
            '2'
            ? 14
            : key ===
                '4'
              ? 18
              : 22,
          11,
          4,
          key ===
            '8'
            ? '#C39A73'
            : '#8EB5C8'
        );

        tableIndex +=
          1;
      }
    }

    const status =
      floor.valid
        ? '布局可用'
        : '面积超载';

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
      x +
        10,
      y +
        16,
      7.3,
      COLORS.text,
      '700'
    );

    this.text(
      ctx,
      status,
      x +
        w -
        10,
      y +
        16,
      7.3,
      floor.valid
        ? COLORS.green
        : COLORS.red,
      '700',
      'right'
    );
  }

  drawTopMetrics(
    ctx,
    metrics
  ) {
    const y =
      258;

    const gap =
      6;

    const w =
      (
        DESIGN_W -
        20 -
        gap * 2
      ) /
      3;

    const items = [
      [
        '总座位',
        metrics.totalSeats +
          '席',
        COLORS.blue
      ],
      [
        '预算',
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

      this.roundedRect(
        ctx,
        x,
        y,
        w,
        50,
        10,
        COLORS.panel2
      );

      this.text(
        ctx,
        items[i][0],
        x + 10,
        y + 13,
        6.5,
        COLORS.muted,
        '600'
      );

      this.text(
        ctx,
        items[i][1],
        x + 10,
        y + 34,
        10,
        items[i][2],
        '700'
      );
    }
  }

  drawPageTabs(ctx) {
    const y =
      316;

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
      359;

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

    let y =
      359;

    for (
      let i = 0;
      i <
      options.length;
      i++
    ) {
      const seats =
        options[i];

      const count =
        floor
          .tables[
            String(seats)
          ] ||
        0;

      this.drawAdjustRow(
        ctx,
        'table:' +
          seats,
        seats +
          '人桌',
        count +
          '张',
        '当前贡献 ' +
          (
            count *
            seats
          ) +
          '个堂食座位',
        y,
        count > 0,
        true
      );

      y += 58;
    }
  }

  renderRoomsPage(
    ctx,
    floor
  ) {
    let y =
      359;

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

    let y =
      359;

    this.drawCycleRow(
      ctx,
      'style:hall',
      '大厅风格',
      hall.name,
      '影响装修成本、吸引力和维护成本',
      y
    );

    y += 58;

    this.drawCycleRow(
      ctx,
      'style:material',
      '材料档次',
      material.name,
      '影响质量、耐用度与装修预算',
      y
    );

    y += 58;

    this.drawCycleRow(
      ctx,
      'style:lighting',
      '灯光方案',
      lighting.name,
      '影响氛围、客群感知和成本',
      y
    );

    y += 65;

    this.text(
      ctx,
      '施工队报价',
      14,
      y,
      8,
      COLORS.muted,
      '700'
    );

    y += 14;

    const quotes =
      renovationSystem
        .getContractorQuotes(
          this.shopId
        );

    for (
      let i = 0;
      i <
      quotes.length;
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

      this.roundedRect(
        ctx,
        10,
        y,
        370,
        47,
        10,
        selected
          ? '#FFF0D6'
          : COLORS.panel,
        selected
          ? '#E0B25F'
          : COLORS.line
      );

      this.text(
        ctx,
        q.name,
        20,
        y + 14,
        7.5,
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
          '天 · 可靠' +
          q.reliability,
        20,
        y + 33,
        6.5,
        COLORS.muted,
        '600'
      );

      this.text(
        ctx,
        selected
          ? '已选'
          : '选择',
        363,
        y + 23,
        7,
        selected
          ? COLORS.orange
          : COLORS.navy,
        '700',
        'right'
      );

      this.addButton(
        'contractor:' +
          q.id,
        10,
        y,
        370,
        47
      );

      y += 53;
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
      11,
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
        ? '确认方案并开始施工'
        : '当前布局超载，不能施工',
      195,
      actionY + 19.5,
      9,
      metrics.valid
        ? '#26343B'
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

    let y =
      359;

    this.roundedRect(
      ctx,
      10,
      y,
      370,
      45,
      11,
      COLORS.gold,
      '#D49434'
    );

    this.text(
      ctx,
      '保存当前装修方案为模板',
      195,
      y + 22.5,
      8.8,
      '#26343B',
      '700',
      'center'
    );

    this.addButton(
      'template:save',
      10,
      y,
      370,
      45
    );

    y +=
      55;

    this.text(
      ctx,
      '已保存模板 ' +
        templates.length +
        '/' +
        renovationConfig
          .templateRules
          .maxTemplates,
      14,
      y,
      7,
      COLORS.muted,
      '700'
    );

    y +=
      14;

    if (
      templates.length ===
      0
    ) {
      this.roundedRect(
        ctx,
        10,
        y,
        370,
        90,
        12,
        COLORS.panel,
        COLORS.line
      );

      this.text(
        ctx,
        '还没有保存装修模板',
        22,
        y + 27,
        10,
        COLORS.text,
        '700'
      );

      this.text(
        ctx,
        '保存后可在其他面积、其他楼层门店中按比例自动适配。',
        22,
        y + 55,
        7,
        COLORS.muted,
        '500'
      );

      return;
    }

    for (
      let i = 0;
      i <
      Math.min(
        templates.length,
        4
      );
      i++
    ) {
      const template =
        templates[i];

      this.roundedRect(
        ctx,
        10,
        y,
        370,
        56,
        11,
        COLORS.panel,
        COLORS.line
      );

      this.text(
        ctx,
        template.name,
        21,
        y + 17,
        8.5,
        COLORS.text,
        '700'
      );

      this.text(
        ctx,
        Math.round(
          template.sourceArea
        ) +
          '㎡ · ' +
          template.sourceFloorCount +
          '层 · 可跨门店缩放适配',
        21,
        y + 38,
        6.5,
        COLORS.muted,
        '500'
      );

      this.roundedRect(
        ctx,
        211,
        y + 9,
        51,
        38,
        8,
        '#E8F1E9',
        '#BDD4C3'
      );

      this.text(
        ctx,
        '使用',
        236.5,
        y + 28,
        7,
        COLORS.green,
        '700',
        'center'
      );

      this.addButton(
        'template:apply:' +
          template.id,
        207,
        y + 5,
        59,
        46
      );

      this.roundedRect(
        ctx,
        270,
        y + 9,
        51,
        38,
        8,
        '#FFF0D6',
        '#E4C47E'
      );

      this.text(
        ctx,
        '改名',
        295.5,
        y + 28,
        7,
        COLORS.orange,
        '700',
        'center'
      );

      this.addButton(
        'template:rename:' +
          template.id,
        266,
        y + 5,
        59,
        46
      );

      this.roundedRect(
        ctx,
        329,
        y + 9,
        42,
        38,
        8,
        '#F4E5E2',
        '#DABAB5'
      );

      this.text(
        ctx,
        '删除',
        350,
        y + 28,
        6.7,
        COLORS.red,
        '700',
        'center'
      );

      this.addButton(
        'template:delete:' +
          template.id,
        325,
        y + 5,
        50,
        46
      );

      y +=
        62;
    }

    if (
      templates.length >
      4
    ) {
      this.text(
        ctx,
        '还有 ' +
          (
            templates.length -
            4
          ) +
          ' 个模板，后续模板管理页继续显示',
        14,
        y + 8,
        6.5,
        COLORS.muted,
        '500'
      );
    }
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
