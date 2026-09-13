'use strict';

// V14_GOLDEN_UI_STORE

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
    '#07344B',
  navy2:
    '#082A3D',
  paper:
    '#F7EEDD',
  panel:
    'rgba(255,252,246,0.96)',
  text:
    '#14334A',
  muted:
    '#6A7B82',
  gold:
    '#F3B12B',
  orange:
    '#E98827',
  red:
    '#D04D45',
  green:
    '#269D67',
  blue:
    '#2D8EB6',
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

    if (shop) {
      renovationSystem
        .updateShop(
          shop.id
        );

      openingPrepSystem
        .updateShop(
          shop.id
        );
    }
  }

  addButton(
    id,
    x,
    y,
    w,
    h
  ) {
    const minW =
      40;

    const minH =
      36;

    const hitW =
      Math.max(
        minW,
        w
      );

    const hitH =
      Math.max(
        minH,
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
        rooms.push(room);
      }
    }

    return rooms;
  }

  drawHeader(
    ctx,
    shop
  ) {
    const district =
      shop
        ? citySystem
            .getDistrict(
              shop.districtId
            )
        : null;

    const gradient =
      ctx.createLinearGradient(
        0,
        0,
        390,
        0
      );

    gradient.addColorStop(
      0,
      COLORS.navy2
    );
    gradient.addColorStop(
      1,
      '#0E526D'
    );

    ctx.fillStyle =
      gradient;

    ctx.fillRect(
      0,
      0,
      390,
      73
    );

    ui.text(
      ctx,
      shop
        ? (
            shop.name ||
            '我的酒楼'
          )
        : '门店筹备',
      15,
      21,
      16,
      COLORS.white,
      '800'
    );

    ui.text(
      ctx,
      shop
        ? (
            (
              district
                ? district.name
                : '经营区域'
            ) +
            ' · ' +
            shop.address
          )
        : '从选址到开业，打造自己的餐饮品牌',
      15,
      47,
      7.2,
      '#CFE0E7',
      '500'
    );

    ui.text(
      ctx,
      money(
        gameState
          .getPlayer()
          .cash
      ),
      376,
      21,
      13,
      '#FFE6A3',
      '800',
      'right'
    );

    ui.text(
      ctx,
      '可用资金',
      376,
      46,
      6.5,
      '#CFE0E7',
      '500',
      'right'
    );
  }

  drawProgress(
    ctx,
    active
  ) {
    ui.card(
      ctx,
      9,
      362,
      372,
      91,
      {
        radius:
          14
      }
    );

    ui.text(
      ctx,
      '开店进度',
      21,
      382,
      10,
      COLORS.text,
      '800'
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
      36;

    const gap =
      62;

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
        i <
        5
      ) {
        ctx.fillStyle =
          i <
            active - 1
            ? '#38A56F'
            : '#D7D0C5';

        ctx.fillRect(
          x + 14,
          412,
          gap - 28,
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
        413,
        12,
        0,
        Math.PI *
        2
      );

      ctx.fillStyle =
        done
          ? '#38A56F'
          : current
            ? COLORS.gold
            : '#E4DED4';

      ctx.fill();

      ui.text(
        ctx,
        done
          ? '✓'
          : String(
              i + 1
            ),
        x,
        413,
        8,
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
        440,
        6.5,
        COLORS.text,
        '700',
        'center'
      );
    }
  }

  drawRoomStrip(
    ctx,
    shop
  ) {
    const rooms =
      this.getRooms(
        shop.id
      );

    ui.card(
      ctx,
      9,
      230,
      372,
      120,
      {
        radius:
          14
      }
    );

    ui.text(
      ctx,
      '包厢名称',
      20,
      249,
      10,
      COLORS.text,
      '800'
    );

    ui.text(
      ctx,
      '精致包厢 · 名称、人数、风格均可自定义',
      82,
      249,
      6.5,
      COLORS.muted,
      '500'
    );

    ui.card(
      ctx,
      297,
      237,
      70,
      24,
      {
        radius:
          12,
        fill:
          '#FFF4D8',
        stroke:
          '#E7C46F',
        shadow:
          false
      }
    );

    ui.text(
      ctx,
      '管理包厢 ›',
      332,
      249,
      6.4,
      COLORS.navy,
      '800',
      'center'
    );

    this.addButton(
      'room:manage',
      292,
      233,
      80,
      32
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
        265,
        cardW,
        70,
        {
          radius:
            9,
          fill:
            '#F8F3EA',
          stroke:
            '#DED3C5',
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
          267,
          cardW - 4,
          46,
          8,
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
          325,
          6.3,
          COLORS.text,
          '700'
        );

        ui.card(
          ctx,
          x + cardW - 22,
          315,
          17,
          17,
          {
            radius:
              6,
            fill:
              '#FFF1C8',
            stroke:
              '#E2BF66',
            shadow:
              false
          }
        );

        ui.text(
          ctx,
          '✎',
          x + cardW - 13.5,
          323.5,
          6.4,
          COLORS.navy,
          '800',
          'center'
        );

        this.addButton(
          'room:rename:' +
            rooms[i].id,
          x + cardW - 27,
          310,
          27,
          27
        );
      } else if (
        i < 3
      ) {
        ui.text(
          ctx,
          '待规划',
          x + cardW / 2,
          299,
          7.2,
          COLORS.muted,
          '700',
          'center'
        );

        ui.text(
          ctx,
          '进入装修添加',
          x + cardW / 2,
          320,
          5.5,
          COLORS.muted,
          '600',
          'center'
        );

        this.addButton(
          'room:manage',
          x,
          265,
          cardW,
          70
        );
      } else {
        ui.text(
          ctx,
          '+',
          x + cardW / 2,
          292,
          17,
          '#9D8D7C',
          '500',
          'center'
        );

        ui.text(
          ctx,
          '添加包厢',
          x + cardW / 2,
          318,
          6.2,
          COLORS.navy,
          '700',
          'center'
        );

        this.addButton(
          'room:manage',
          x,
          265,
          cardW,
          70
        );
      }
    }
  }

  renderNoShop(
    ctx
  ) {
    this.drawHeader(
      ctx,
      null
    );

    ui.card(
      ctx,
      10,
      88,
      370,
      246,
      {
        radius:
          18
      }
    );

    ui.coverImage(
      ctx,
      visualAssetSystem
        .get(
          'premium_explore_banner'
        ),
      20,
      99,
      350,
      118,
      14,
      'rgba(4,31,46,0.22)'
    );

    ui.text(
      ctx,
      '还没有自己的门店',
      28,
      239,
      15,
      COLORS.text,
      '800'
    );

    ui.text(
      ctx,
      '先选商圈，再看铺、谈判、签约。',
      28,
      268,
      8,
      COLORS.muted,
      '600'
    );

    ui.card(
      ctx,
      28,
      286,
      334,
      37,
      {
        radius:
          18,
        fill:
          '#F6B428',
        stroke:
          '#E6A01B',
        shadow:
          false
      }
    );

    ui.text(
      ctx,
      '去城市地图选择经营区域  ›',
      195,
      304.5,
      8.5,
      COLORS.text,
      '800',
      'center'
    );

    this.addButton(
      'go-city',
      24,
      282,
      342,
      45
    );

    ui.card(
      ctx,
      10,
      350,
      370,
      152,
      {
        radius:
          16
      }
    );

    ui.text(
      ctx,
      '开店流程',
      22,
      373,
      10,
      COLORS.text,
      '800'
    );

    const steps = [
      '① 查看商圈人口、消费人群和需求',
      '② 进入房源市场并实地看铺',
      '③ 谈判租金、转让费和免租期',
      '④ 签约后进入装修与开业筹备'
    ];

    for (
      let i = 0;
      i < steps.length;
      i++
    ) {
      ui.text(
        ctx,
        steps[i],
        24,
        405 +
          i *
          25,
        7.2,
        i === 0
          ? COLORS.orange
          : COLORS.text,
        i === 0
          ? '700'
          : '600'
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

    const plan =
      renovationSystem
        .ensurePlan(
          shop.id
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

    ui.card(
      ctx,
      9,
      87,
      372,
      132,
      {
        radius:
          17
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
      217,
      95,
      154,
      116,
      13,
      null
    );

    ctx.fillStyle =
      'rgba(34,24,18,0.62)';
    ctx.fillRect(
      265,
      108,
      92,
      26
    );

    ui.text(
      ctx,
      shop.name ||
        '我的酒楼',
      311,
      121,
      7.2,
      '#FFE8B0',
      '800',
      'center'
    );

    const status =
      shop.status ===
        'open'
        ? '营业中'
        : readiness &&
            readiness.ready
          ? '可试营业'
          : shop.status ===
              'renovating'
          ? '装修中'
          : readiness &&
              readiness.renovationReady
            ? '开业筹备'
            : '已签约';

    ui.pill(
      ctx,
      '✓ ' +
        status,
      20,
      101,
      72,
      25,
      '#FFF0C1',
      '#B36B1E'
    );

    ui.text(
      ctx,
      shop.name ||
        shop.address,
      20,
      151,
      17,
      COLORS.text,
      '800'
    );

    ui.text(
      ctx,
      shop.address,
      20,
      177,
      7,
      COLORS.muted,
      '600'
    );

    ui.card(
      ctx,
      20,
      189,
      78,
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
      '✎ 改名',
      59,
      201,
      7,
      COLORS.orange,
      '800',
      'center'
    );

    this.addButton(
      'shop:rename',
      16,
      185,
      86,
      32
    );

    this.drawRoomStrip(
      ctx,
      shop
    );

    let active =
      2;

    if (
      readiness &&
      readiness.renovationReady
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
      readiness &&
      readiness.permitsReady
    ) {
      active =
        5;
    }

    if (
      readiness &&
      readiness.ready
    ) {
      active =
        6;
    }

    this.drawProgress(
      ctx,
      active
    );

    ui.card(
      ctx,
      9,
      466,
      372,
      152,
      {
        radius:
          15
      }
    );

    ui.text(
      ctx,
      '下一步建议',
      20,
      486,
      11,
      COLORS.text,
      '800'
    );

    const cards = [
      {
        id:
          readiness &&
          readiness.ready &&
          shop.status !==
            'open'
            ? 'trial'
            : 'renovation',
        key:
          'premium_advice_renovation',
        title:
          readiness &&
          readiness.ready &&
          shop.status !==
            'open'
            ? '开始试营业'
            : readiness &&
                readiness.renovationReady
              ? '装修成果'
              : '店面装修',
        sub:
          readiness &&
          readiness.ready &&
          shop.status !==
            'open'
            ? '开门迎客并进入经营'
            : readiness &&
                readiness.renovationReady
              ? '查看空间与座位'
              : '布局、包厢、风格',
        action:
          readiness &&
          readiness.ready &&
          shop.status !==
            'open'
            ? '开业'
            : readiness &&
                readiness.renovationReady
              ? '查看'
              : '装修'
      },
      {
        id:
          'equipment',
        key:
          'visual_stove',
        title:
          readiness &&
          readiness.equipmentReady
            ? '设备已安装'
            : '设备采购',
        sub:
          readiness &&
          readiness.equipment &&
          readiness.equipment.status ===
            'ordered'
            ? '运输安装进行中'
            : '后厨、冷链、收银',
        action:
          readiness &&
          readiness.equipmentReady
            ? '查看'
            : '采购'
      },
      {
        id:
          'license',
        key:
          'premium_advice_permit',
        title:
          readiness &&
          readiness.permitsReady
            ? '证照已齐'
            : '证照办理',
        sub:
          readiness &&
          readiness.permits
            ? (
                readiness.permits.approved +
                '/' +
                readiness.permits.total +
                ' 已完成'
              )
            : '经营、消防、食品',
        action:
          '办证'
      },
      {
        id:
          'staff',
        key:
          'premium_advice_staff',
        title:
          readiness &&
          readiness.staffingReady
            ? '班组已齐'
            : '招聘团队',
        sub:
          readiness &&
          readiness.staffing
            ? (
                '覆盖率 ' +
                Math.round(
                  readiness.staffing.coverage *
                  100
                ) +
                '%'
              )
            : '店长、厨师、服务',
        action:
          '招聘'
      }
    ];

    for (
      let i = 0;
      i <
      cards.length;
      i++
    ) {
      const item =
        cards[i];

      const col =
        i %
        2;

      const row =
        Math.floor(
          i /
          2
        );

      const x =
        18 +
        col *
        181;

      const y =
        501 +
        row *
        56;

      ui.card(
        ctx,
        x,
        y,
        173,
        50,
        {
          radius:
            11,
          fill:
            '#FFFBF4',
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
        x + 5,
        y + 5,
        42,
        40,
        8,
        null
      );

      ui.text(
        ctx,
        item.title,
        x + 54,
        y + 14,
        8,
        COLORS.text,
        '800'
      );

      ui.text(
        ctx,
        item.sub,
        x + 54,
        y + 31,
        7,
        COLORS.muted,
        '600'
      );

      ui.text(
        ctx,
        item.action +
          ' ›',
        x + 160,
        y + 39,
        7,
        COLORS.orange,
        '800',
        'right'
      );

      this.addButton(
        'module:' +
          item.id,
        x,
        y,
        173,
        50
      );
    }

    if (
      finance &&
      finance.gap >
        0 &&
      finance.offer &&
      !finance.offer.existing
    ) {
      ui.pill(
        ctx,
        '周转金可补足开店缺口 ' +
          money(
            Math.min(
              finance.gap,
              finance
                .offer
                .creditLimit
            )
          ),
        168,
        473,
        202,
        24,
        '#FFF0D6',
        COLORS.orange,
        '#E9C174'
      );

      this.addButton(
        'module:finance',
        164,
        469,
        210,
        32
      );
    }

    if (
      this.contentBottom >
      684
    ) {
      const bannerY =
        Math.min(
          628,
          this.contentBottom -
            71
        );

      ui.coverImage(
        ctx,
        visualAssetSystem
          .get(
            'premium_explore_banner'
        ),
        10,
        bannerY,
        370,
        60,
        13,
        'rgba(4,32,48,0.45)'
      );

      ui.text(
        ctx,
        '探索更多优质商圈',
        28,
        bannerY + 21,
        10,
        COLORS.white,
        '800'
      );

      ui.text(
        ctx,
        '为下一家门店寻找黄金地段',
        28,
        bannerY + 42,
        6.5,
        '#E6F0F4',
        '500'
      );

      ui.card(
        ctx,
        283,
        bannerY + 14,
        78,
        32,
        {
          radius:
            16,
          fill:
            '#F7B628',
          stroke:
            '#E3A21B',
          shadow:
            false
        }
      );

      ui.text(
        ctx,
        '去拓展 ›',
        322,
        bannerY + 30,
        7,
        COLORS.text,
        '800',
        'center'
      );

      this.addButton(
        'go-city',
        278,
        bannerY + 8,
        90,
        44
      );
    }
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

        if (
          api &&
          typeof api.showToast ===
            'function'
        ) {
          api.showToast({
            title:
              result.ok
                ? '试营业开始！'
                : result.message,
            icon:
              'none'
          });
        }

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

            if (
              api &&
              typeof api.showToast ===
                'function'
            ) {
              api.showToast({
                title:
                  result.ok
                    ? (
                        '已到账 ' +
                        money(
                          result
                            .loan
                            .principal
                        )
                      )
                    : result.message,
                icon:
                  'none'
              });
            }

            textInput
              .requestRender();
          };

        if (
          offer &&
          offer.available &&
          api &&
          typeof api.showModal ===
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

      return true;
    }

    return false;
  }
}

module.exports =
  new StoreScene();
