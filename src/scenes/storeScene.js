'use strict';

const runtime =
  globalThis
    .GameRuntime;

if (!runtime) {
  throw new Error(
    'StoreScene：GameRuntime 未初始化'
  );
}

const api =
  runtime.api ||
  {};

const gameState =
  require('../core/gameState.js');

const citySystem =
  require('../city/citySystem.js');

const sceneManager =
  require('../core/sceneManager.js');

const renovationSystem =
  require('../renovation/renovationSystem.js');

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

    this.selectedModule =
      null;
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

  enter() {
    this.selectedModule =
      null;
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
        width ||
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

  getCurrentShop() {
    const business =
      gameState
        .getBusiness();

    if (
      !business.hasShop ||
      !business
        .shops
        .length
    ) {
      return null;
    }

    return (
      business
        .shops
        .find(
          item =>
            item.id ===
            business
              .currentShopId
        ) ||
      business
        .shops[0]
    );
  }

  drawHeader(
    ctx,
    title,
    subtitle
  ) {
    ctx.fillStyle =
      COLORS.navy2;

    ctx.fillRect(
      0,
      0,
      DESIGN_W,
      67
    );

    this.text(
      ctx,
      title,
      15,
      22,
      17,
      COLORS.white,
      '700'
    );

    this.text(
      ctx,
      subtitle,
      15,
      45,
      8,
      'rgba(255,255,255,0.70)',
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
      13,
      '#FFE8AE',
      '700',
      'right'
    );

    this.text(
      ctx,
      '可用资金',
      376,
      45,
      7,
      '#D8E5EB',
      '500',
      'right'
    );
  }

  drawProgress(
    ctx,
    activeIndex,
    y
  ) {
    const steps = [
      '选址',
      '签约',
      '装修',
      '证照',
      '招聘',
      '开业'
    ];

    this.text(
      ctx,
      '开店进度',
      17,
      y,
      8,
      COLORS.muted,
      '700'
    );

    for (
      let i = 0;
      i <
      steps.length;
      i++
    ) {
      const x =
        24 +
        i *
          67;

      if (
        i <
        steps.length -
          1
      ) {
        ctx.strokeStyle =
          i <
          activeIndex
            ? COLORS.green
            : '#D8CEC1';

        ctx.lineWidth =
          3;

        ctx.beginPath();

        ctx.moveTo(
          x +
            14,
          y +
            28
        );

        ctx.lineTo(
          x +
            53,
          y +
            28
        );

        ctx.stroke();
      }

      this.roundedRect(
        ctx,
        x,
        y +
          17,
        22,
        22,
        11,
        i <=
          activeIndex
          ? (
              i ===
                activeIndex
                ? COLORS.gold
                : COLORS.green
            )
          : '#E7DED2'
      );

      this.text(
        ctx,
        i <
          activeIndex
          ? '✓'
          : String(
              i +
              1
            ),
        x +
          11,
        y +
          28,
        7.5,
        i <=
          activeIndex
          ? COLORS.white
          : COLORS.muted,
        '700',
        'center'
      );

      this.text(
        ctx,
        steps[i],
        x +
          11,
        y +
          51,
        6.5,
        i ===
          activeIndex
          ? COLORS.navy
          : COLORS.muted,
        i ===
          activeIndex
          ? '700'
          : '500',
        'center'
      );
    }
  }

  renderNoShop(
    ctx
  ) {
    this.drawHeader(
      ctx,
      '门店筹备',
      '这里管理自己的门店，不再把“门店”和“找铺市场”混在一起'
    );

    this.roundedRect(
      ctx,
      12,
      82,
      366,
      126,
      15,
      COLORS.panel,
      COLORS.line
    );

    this.text(
      ctx,
      '当前还没有已签约门店',
      24,
      108,
      15,
      COLORS.text,
      '700'
    );

    this.text(
      ctx,
      '经营目标',
      24,
      140,
      7,
      COLORS.orange,
      '700'
    );

    this.text(
      ctx,
      '选择合适商圈 → 看铺 → 谈判 → 签下第一家店',
      24,
      162,
      9,
      COLORS.navy,
      '700'
    );

    this.text(
      ctx,
      '门店页只显示你的经营资产；商圈与房源从城市地图进入。',
      24,
      188,
      7,
      COLORS.muted,
      '500'
    );

    this.drawProgress(
      ctx,
      0,
      242
    );

    this.roundedRect(
      ctx,
      12,
      335,
      366,
      156,
      14,
      COLORS.panel,
      COLORS.line
    );

    this.text(
      ctx,
      '正确流程',
      24,
      357,
      10,
      COLORS.text,
      '700'
    );

    const lines = [
      '① 城市地图选择商圈',
      '② 查看商圈人口、消费人群、需求与竞争',
      '③ 从商圈详情进入房源市场',
      '④ 实地看铺、谈判并签约'
    ];

    for (
      let i = 0;
      i <
      lines.length;
      i++
    ) {
      this.text(
        ctx,
        lines[i],
        24,
        389 +
          i *
            24,
        8,
        i ===
          1
          ? COLORS.orange
          : COLORS.text,
        i ===
          1
          ? '700'
          : '600'
      );
    }

    const actionY =
      this.contentBottom -
      54;

    this.roundedRect(
      ctx,
      12,
      actionY,
      366,
      42,
      12,
      COLORS.gold,
      '#D49434'
    );

    this.text(
      ctx,
      '回城市选择经营区域',
      195,
      actionY +
        21,
      10,
      '#26343B',
      '700',
      'center'
    );

    this.addButton(
      'go-city',
      12,
      actionY,
      366,
      42
    );
  }

  drawShopMetric(
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
      64,
      11,
      COLORS.panel2
    );

    this.text(
      ctx,
      label,
      x +
        11,
      y +
        15,
      6.8,
      COLORS.muted,
      '600'
    );

    this.text(
      ctx,
      value,
      x +
        11,
      y +
        37,
      11,
      color,
      '700'
    );

    this.text(
      ctx,
      sub,
      x +
        11,
      y +
        53,
      6.2,
      COLORS.muted,
      '500'
    );
  }

  drawModule(
    ctx,
    id,
    title,
    sub,
    x,
    y,
    w
  ) {
    this.roundedRect(
      ctx,
      x,
      y,
      w,
      69,
      12,
      COLORS.panel,
      COLORS.line
    );

    this.text(
      ctx,
      title,
      x +
        12,
      y +
        22,
      9,
      COLORS.text,
      '700'
    );

    this.text(
      ctx,
      sub,
      x +
        12,
      y +
        46,
      6.5,
      COLORS.muted,
      '500'
    );

    this.text(
      ctx,
      '›',
      x +
        w -
        15,
      y +
        22,
      13,
      COLORS.orange,
      '700',
      'center'
    );

    this.addButton(
      'module:' +
        id,
      x,
      y,
      w,
      69
    );
  }

  renderShop(
    ctx,
    shop
  ) {
    const district =
      citySystem
        .getDistrict(
          shop.districtId
        );

    this.drawHeader(
      ctx,
      '我的门店',
      district
        ? district.name +
          ' · ' +
          shop.address
        : shop.address
    );

    this.roundedRect(
      ctx,
      12,
      80,
      366,
      100,
      15,
      COLORS.panel,
      COLORS.line
    );

    this.roundedRect(
      ctx,
      24,
      94,
      76,
      26,
      9,
      '#FFF0D6',
      '#E4B564'
    );

    const renovation =
      renovationSystem
        .ensurePlan(
          shop.id
        );

    const statusLabel =
      shop.status ===
        'renovating'
        ? '装修中'
        : shop.status ===
            'renovated_pending_license'
          ? '装修完成'
          : '待装修';

    this.text(
      ctx,
      statusLabel,
      62,
      107,
      8,
      shop.status ===
        'renovated_pending_license'
        ? COLORS.green
        : COLORS.orange,
      '700',
      'center'
    );

    this.text(
      ctx,
      shop.name ||
        shop.address,
      24,
      143,
      14,
      COLORS.text,
      '700'
    );

    this.text(
      ctx,
      shop.status ===
        'renovating'
        ? '施工进行中 · 时间推进会更新工程进度'
        : shop.status ===
            'renovated_pending_license'
          ? '装修完成 · 下一步采购设备、办证与招聘'
          : '已签约 · 可自由规划楼层、桌椅、包厢与风格',
      24,
      165,
      7.5,
      COLORS.muted,
      '600'
    );

    this.text(
      ctx,
      '签约前投入 ' +
        money(
          shop
            .upfrontPaid
        ),
      365,
      108,
      8,
      COLORS.red,
      '700',
      'right'
    );

    const metricY =
      194;

    const gap =
      7;

    const w =
      (
        DESIGN_W -
        24 -
        gap *
          2
      ) /
      3;

    this.drawShopMetric(
      ctx,
      12,
      metricY,
      w,
      '面积',
      shop.grossArea +
        '㎡',
      '可用 ' +
        shop.usableArea +
        '㎡',
      COLORS.blue
    );

    this.drawShopMetric(
      ctx,
      12 +
        w +
        gap,
      metricY,
      w,
      '座位预估',
      shop.seatEstimate +
        '席',
      '装修后可调整',
      COLORS.green
    );

    this.drawShopMetric(
      ctx,
      12 +
        (
          w +
          gap
        ) *
          2,
      metricY,
      w,
      '月租',
      money(
        shop.monthlyRent
      ),
      shop
        .freeRentDays +
        '天免租',
      COLORS.red
    );

    this.drawProgress(
      ctx,
      2,
      284
    );

    this.roundedRect(
      ctx,
      12,
      365,
      366,
      82,
      13,
      COLORS.panel,
      COLORS.line
    );

    this.text(
      ctx,
      '租约摘要',
      24,
      385,
      9,
      COLORS.text,
      '700'
    );

    this.text(
      ctx,
      '押' +
        shop.depositMonths +
        ' · 付' +
        shop.paymentMonths +
        ' · 租期' +
        shop.leaseYears +
        '年',
      24,
      413,
      8,
      COLORS.navy,
      '700'
    );

    this.text(
      ctx,
      '转让费 ' +
        money(
          shop.transferFee
        ) +
        ' · 中介费 ' +
        money(
          shop.brokerFee
        ),
      24,
      436,
      7,
      COLORS.muted,
      '600'
    );

    const modulesY =
      463;

    this.text(
      ctx,
      '开业筹备',
      17,
      modulesY,
      8,
      COLORS.muted,
      '700'
    );

    const moduleW =
      177;

    this.drawModule(
      ctx,
      'renovation',
      shop.status ===
        'renovated_pending_license'
        ? '装修成果'
        : shop.status ===
            'renovating'
          ? '施工进度'
          : '自定义装修',
      shop.status ===
        'renovated_pending_license'
        ? '查看完工布局与经营参数'
        : '楼层、桌椅、包厢、风格、施工',
      12,
      modulesY +
        15,
      moduleW
    );

    this.drawModule(
      ctx,
      'equipment',
      '设备采购',
      '后厨、冷链、收银设备',
      201,
      modulesY +
        15,
      moduleW
    );

    this.drawModule(
      ctx,
      'license',
      '证照办理',
      '经营、消防、食品许可',
      12,
      modulesY +
        94,
      moduleW
    );

    this.drawModule(
      ctx,
      'staff',
      '招聘团队',
      '店长、厨师、服务人员',
      201,
      modulesY +
        94,
      moduleW
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
      renovationSystem
        .updateShop(
          shop.id
        );

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
      item.id.indexOf(
        'module:'
      ) ===
      0
    ) {
      const moduleId =
        item.id
          .split(':')[1];

      if (
        moduleId ===
        'renovation'
      ) {
        const shop =
          this.getCurrentShop();

        if (shop) {
          sceneManager
            .switchTo(
              'renovation',
              {
                shopId:
                  shop.id
              }
            );
        }

        return true;
      }

      const names = {
        renovation:
          '装修方案',

        equipment:
          '设备采购',

        license:
          '证照办理',

        staff:
          '招聘团队'
      };

      if (
        api &&
        typeof api
          .showToast ===
          'function'
      ) {
        api.showToast({
          title:
            (
              names[
                moduleId
              ] ||
              '筹备模块'
            ) +
            '将在下一阶段接入',

          icon:
            'none'
        });
      }

      return true;
    }

    return false;
  }
}

module.exports =
  new StoreScene();
