'use strict';

// V16_STORE_UI_REWRITE
// V36_STORE_THREE_STATE_PHASE1
// 门店第一阶段：无门店 / 筹备中 / 营业中三状态动态主页。
// 视觉优先复用资料库已导入仓库的 premium/store 资源。

const runtime = globalThis.GameRuntime;

if (!runtime) {
  throw new Error('StoreScene：GameRuntime 未初始化');
}

const api = runtime.api || {};

const gameState = require('../core/gameState.js');
const citySystem = require('../city/citySystem.js');
const simulationSystem = require('../core/simulationSystem.js');
const sceneManager = require('../core/sceneManager.js');

const propertyMarketSystem =
  require('../property/propertyMarketSystem.js');

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

const DESIGN_W = 390;

const COLORS = {
  navy: '#073E61',
  navyDeep: '#052D47',
  blue: '#148FD0',
  blueSoft: '#EAF7FF',
  paper: '#F4EBDD',
  panel: '#FFFDF8',
  text: '#123A55',
  muted: '#6C8391',
  gold: '#F6C22C',
  goldDeep: '#D99A17',
  orange: '#F08123',
  red: '#E65145',
  green: '#24A36A',
  purple: '#7655C7',
  line: '#DDD4C7',
  white: '#FFFFFF'
};

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function compactMoney(value) {
  const n = Number(value) || 0;
  const abs = Math.abs(n);

  function trim(v, d) {
    return Number(v)
      .toFixed(d)
      .replace(/\.0+$/, '')
      .replace(/(\.\d*?[1-9])0+$/, '$1');
  }

  if (abs >= 1000000000000) {
    const v = n / 1000000000000;
    return '¥' + trim(v, Math.abs(v) >= 100 ? 0 : 1) + '万亿';
  }

  if (abs >= 100000000) {
    const v = n / 100000000;
    return '¥' + trim(v, Math.abs(v) >= 100 ? 0 : 1) + '亿';
  }

  if (abs >= 10000) {
    const v = n / 10000;
    return '¥' + trim(v, Math.abs(v) >= 100 ? 0 : 1) + '万';
  }

  return '¥' + Math.round(n).toLocaleString();
}

function percent(value) {
  return Math.round(clamp(Number(value) || 0, 0, 1) * 100) + '%';
}

function shortText(value, max) {
  const text = String(value == null ? '' : value);
  if (text.length <= max) return text;
  return text.slice(0, Math.max(1, max - 1)) + '…';
}

class StoreScene {
  constructor() {
    this.id = 'shop';
    this.viewH = 780;
    this.navH = 64;
    this.contentBottom = 716;
    this.buttons = [];
  }

  getLayout() {
    let height = 780;

    if (api && typeof api.getSystemInfoSync === 'function') {
      const info = api.getSystemInfoSync();

      const w = Math.max(
        1,
        Number(info.windowWidth) || DESIGN_W
      );

      const h = Math.max(
        1,
        Number(info.windowHeight) || 780
      );

      height = h / (w / DESIGN_W);
    }

    this.viewH = height;
    this.navH = height < 740 ? 60 : 64;
    this.contentBottom = height - this.navH;
  }

  enter() {
    // 保持旧视觉回归测试兼容的多行调用形式。
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
        'premiumDistrict'
      );

    visualAssetSystem
      .loadGroup(
        'renovation'
      );
  }

  exit() {
    this.buttons = [];
  }

  update() {
    const shop = this.getCurrentShop();

    if (shop) {
      renovationSystem.updateShop(shop.id);
      openingPrepSystem.updateShop(shop.id);
    }
  }

  addButton(id, x, y, w, h) {
    const hitW = Math.max(42, w);
    const hitH = Math.max(38, h);

    this.buttons.push({
      id,
      x: x - (hitW - w) / 2,
      y: y - (hitH - h) / 2,
      w: hitW,
      h: hitH
    });
  }

  hitButton(x, y) {
    for (let i = this.buttons.length - 1; i >= 0; i--) {
      const b = this.buttons[i];

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
    const business = gameState.getBusiness();

    if (
      !business.hasShop ||
      !Array.isArray(business.shops) ||
      !business.shops.length
    ) {
      return null;
    }

    return (
      business.shops.find(
        item => item.id === business.currentShopId
      ) ||
      business.shops[0]
    );
  }

  getMode(shop) {
    if (!shop) return 'no-shop';
    if (shop.status === 'open') return 'operating';
    return 'preparing';
  }

  getRooms(shopId) {
    const plan = renovationSystem.ensurePlan(shopId);

    if (!plan) return [];

    const rooms = [];

    for (const floor of plan.floors || []) {
      for (const room of floor.privateRooms || []) {
        rooms.push(room);
      }
    }

    return rooms;
  }

  getMarketContext() {
    const state = propertyMarketSystem.getState();

    if (!state.initialized) {
      const day =
        simulationSystem.getDayOrdinal(
          gameState.getTime()
        );

      propertyMarketSystem.initialize({
        currentDay: day
      });
    }

    const world = gameState.getWorld();

    const districts =
      citySystem.getDistrictsByCity(
        world.currentCityId
      ) || [];

    const scored = districts
      .map(district => {
        const market =
          propertyMarketSystem.getDistrictSummary(
            district.id
          );

        const rent =
          Math.max(
            1,
            Number(market.averageAskingRent) ||
            1
          );

        const demand =
          Math.max(
            1,
            Number(district.baseDemand) ||
            1
          );

        const spend =
          Math.max(
            1,
            Number(district.avgSpend) ||
            1
          );

        const saturation =
          Math.max(
            20,
            Number(district.saturation) ||
            100
          );

        const score =
          demand *
          spend /
          rent /
          (0.55 + saturation / 100);

        return {
          district,
          market,
          score
        };
      })
      .sort((a, b) => b.score - a.score);

    const selected =
      scored.find(
        item =>
          item.district.id ===
          world.currentDistrictId
      );

    const recommendation =
      selected || scored[0] || null;

    const listings = recommendation
      ? propertyMarketSystem.getLiveListings({
          districtId: recommendation.district.id
        })
      : [];

    listings.sort((a, b) => {
      const rentA =
        Number(a.askingMonthlyRent || a.monthlyRent) || 0;

      const rentB =
        Number(b.askingMonthlyRent || b.monthlyRent) || 0;

      if (rentA !== rentB) return rentA - rentB;

      return (
        Number(b.usableArea || b.grossArea) -
        Number(a.usableArea || a.grossArea)
      );
    });

    return {
      recommendation,
      listing: listings[0] || null,
      listingCount: listings.length
    };
  }

  estimateFirstStore(listing) {
    if (!listing) {
      return {
        rent: 0,
        deposit: 0,
        transfer: 0,
        renovation: 0,
        equipment: 18000,
        reserve: 8000,
        total: 26000
      };
    }

    const rent =
      Number(
        listing.askingMonthlyRent ||
        listing.monthlyRent
      ) || 0;

    const depositMonths =
      Math.max(
        1,
        Number(listing.depositMonths) || 2
      );

    const transfer =
      Number(
        listing.askingTransferFee ||
        listing.transferFee
      ) || 0;

    const area =
      Math.max(
        20,
        Number(
          listing.usableArea ||
          listing.grossArea
        ) || 60
      );

    const deposit = rent * depositMonths;
    const renovation = Math.round(area * 420);
    const equipment = Math.max(18000, Math.round(area * 155));
    const reserve = Math.max(8000, Math.round(rent * 0.85));

    return {
      rent,
      deposit,
      transfer,
      renovation,
      equipment,
      reserve,
      total:
        deposit +
        transfer +
        renovation +
        equipment +
        reserve
    };
  }

  getRenovationProgress(shopId) {
    const plan = renovationSystem.ensurePlan(shopId);

    if (!plan) return 0;

    if (plan.status === 'completed') {
      return 1;
    }

    if (
      plan.status === 'constructing' &&
      plan.construction
    ) {
      const day =
        simulationSystem.getDayOrdinal(
          gameState.getTime()
        );

      const start =
        Number(plan.construction.startDay) ||
        day;

      const finish =
        Number(plan.construction.finishDay) ||
        start + 1;

      return clamp(
        (day - start) /
        Math.max(1, finish - start),
        0.05,
        0.98
      );
    }

    return 0;
  }

  getPreparationState(shop) {
    const readiness =
      openingPrepSystem.getReadiness(shop.id);

    const metrics =
      renovationSystem.getMetrics(shop.id);

    const finance =
      openingFinanceSystem.getRecoveryStatus(shop.id);

    const renovationProgress =
      this.getRenovationProgress(shop.id);

    const permitApproved =
      readiness.permits
        ? Number(readiness.permits.approved) || 0
        : 0;

    const permitTotal =
      readiness.permits
        ? Number(readiness.permits.total) || 0
        : 0;

    const staffing =
      readiness.staffing || {};

    const hiredCount =
      Array.isArray(staffing.hired)
        ? staffing.hired.length
        : 0;

    const requiredCount =
      staffing.required
        ? Object.values(staffing.required)
            .reduce(
              (sum, value) =>
                sum + (Number(value) || 0),
              0
            )
        : 0;

    const equipmentStatus =
      readiness.equipment
        ? readiness.equipment.status
        : 'planning';

    let recommendation = {
      id: 'renovation',
      title: '继续装修',
      detail: '完善前厅、后厨和餐位布局',
      action: '进入装修'
    };

    if (readiness.renovationReady) {
      if (!readiness.permitsReady) {
        recommendation = {
          id: 'license',
          title: '办理证照',
          detail: '完成营业、食品及消防手续',
          action: '办理证照'
        };
      } else if (!readiness.staffingReady) {
        recommendation = {
          id: 'staff',
          title: '补齐员工',
          detail: '厨师和服务班组仍未达到开业要求',
          action: '去招聘'
        };
      } else if (!readiness.equipmentReady) {
        recommendation = {
          id: 'equipment',
          title: '安装设备',
          detail: '完成后厨与前厅设备采购安装',
          action: '配置设备'
        };
      } else if (readiness.ready) {
        recommendation = {
          id: 'trial',
          title: '开始试营业',
          detail: '基础筹备已完成，可以验证真实经营',
          action: '试营业'
        };
      }
    }

    return {
      readiness,
      metrics,
      finance,
      renovationProgress,
      permitApproved,
      permitTotal,
      hiredCount,
      requiredCount,
      equipmentStatus,
      recommendation
    };
  }

  drawHeader(ctx, shop) {
    const h = 88;

    ui.coverImage(
      ctx,
      visualAssetSystem.get('premium_explore_banner'),
      0,
      0,
      DESIGN_W,
      h,
      0,
      'rgba(4,31,48,0.48)'
    );

    ctx.fillStyle = 'rgba(2,41,65,0.45)';
    ctx.fillRect(0, 0, DESIGN_W, h);

    const cityName =
      gameState.getCityName() === '未命名城市'
        ? '美食市'
        : gameState.getCityName();

    ui.text(
      ctx,
      cityName,
      18,
      22,
      15.5,
      COLORS.white,
      '800'
    );

    ui.text(
      ctx,
      '门店经营中心',
      18,
      45,
      7,
      '#DCECF3',
      '600'
    );

    const cash =
      compactMoney(
        gameState.getPlayer().cash
      );

    ui.card(
      ctx,
      268,
      10,
      108,
      43,
      {
        radius: 12,
        fill: 'rgba(3,52,81,0.92)',
        stroke: 'rgba(98,202,244,0.42)',
        shadow: false
      }
    );

    ui.text(
      ctx,
      cash,
      322,
      25,
      cash.length > 8 ? 9.7 : 11,
      '#FFF0A0',
      '800',
      'center'
    );

    ui.text(
      ctx,
      '可用资金',
      322,
      43,
      5.9,
      '#E5F2F7',
      '600',
      'center'
    );

    const bulletin =
      simulationSystem.getBulletin();

    ui.card(
      ctx,
      10,
      58,
      366,
      23,
      {
        radius: 11,
        fill: 'rgba(2,49,75,0.89)',
        stroke: 'rgba(61,184,231,0.38)',
        shadow: false
      }
    );

    ui.text(
      ctx,
      '城市动态',
      20,
      69.5,
      6.2,
      '#FFD967',
      '800'
    );

    ui.text(
      ctx,
      shortText(
        (bulletin.title || '') +
        ' · ' +
        (bulletin.detail || ''),
        43
      ),
      74,
      69.5,
      5.7,
      COLORS.white,
      '600'
    );

    if (shop) {
      const business = gameState.getBusiness();
      const count =
        Array.isArray(business.shops)
          ? business.shops.length
          : 0;

      if (count > 1) {
        ui.text(
          ctx,
          '‹',
          331,
          69.5,
          10,
          '#FFE180',
          '800',
          'center'
        );

        ui.text(
          ctx,
          '›',
          369,
          69.5,
          10,
          '#FFE180',
          '800',
          'center'
        );

        const index =
          Math.max(
            0,
            business.shops.findIndex(
              item => item.id === shop.id
            )
          );

        ui.text(
          ctx,
          (index + 1) + '/' + count,
          350,
          69.5,
          5.8,
          COLORS.white,
          '700',
          'center'
        );

        this.addButton(
          'shop:prev',
          314,
          55,
          34,
          28
        );

        this.addButton(
          'shop:next',
          352,
          55,
          34,
          28
        );
      }
    }
  }

  drawHeroImage(ctx, x, y, w, h, overlay) {
    const image =
      visualAssetSystem.get('premium_store_hero') ||
      visualAssetSystem.get('visual_storefront_hero');

    ui.coverImage(
      ctx,
      image,
      x,
      y,
      w,
      h,
      14,
      overlay || null
    );
  }

  drawPrimaryButton(
    ctx,
    id,
    text,
    x,
    y,
    w,
    h,
    blue
  ) {
    ui.card(
      ctx,
      x,
      y,
      w,
      h,
      {
        radius: h / 2,
        fill: blue
          ? '#138DDA'
          : COLORS.gold,
        stroke: blue
          ? '#6DD0FF'
          : '#E0A11C',
        shadow: false
      }
    );

    ui.text(
      ctx,
      text + '  ›',
      x + w / 2,
      y + h / 2,
      8.2,
      blue ? COLORS.white : COLORS.text,
      '800',
      'center'
    );

    this.addButton(
      id,
      x - 3,
      y - 3,
      w + 6,
      h + 6
    );
  }

  drawMiniMetric(
    ctx,
    x,
    y,
    w,
    title,
    value,
    tone
  ) {
    ui.card(
      ctx,
      x,
      y,
      w,
      48,
      {
        radius: 10,
        fill: '#FBF8F2',
        stroke: '#E1D8CB',
        shadow: false
      }
    );

    ctx.beginPath();
    ctx.arc(
      x + 17,
      y + 16,
      8,
      0,
      Math.PI * 2
    );
    ctx.fillStyle = tone;
    ctx.fill();

    ui.text(
      ctx,
      title,
      x + 32,
      y + 13,
      5.8,
      COLORS.muted,
      '700'
    );

    ui.text(
      ctx,
      value,
      x + 32,
      y + 31,
      8.5,
      COLORS.text,
      '800'
    );
  }

  renderNoShop(ctx) {
    this.drawHeader(ctx, null);

    const market = this.getMarketContext();
    const rec = market.recommendation;
    const listing = market.listing;
    const estimate =
      this.estimateFirstStore(listing);

    const cash =
      gameState.getPlayer().cash;

    ui.card(
      ctx,
      10,
      96,
      370,
      177,
      {
        radius: 18,
        fill: COLORS.panel,
        stroke: '#D9D0C3'
      }
    );

    this.drawHeroImage(
      ctx,
      18,
      104,
      354,
      104,
      'rgba(4,31,47,0.22)'
    );

    ui.text(
      ctx,
      '还没有门店',
      29,
      132,
      18,
      COLORS.white,
      '800'
    );

    ui.text(
      ctx,
      '第一家店，从选对商圈和房源开始',
      29,
      157,
      7.1,
      '#F4FAFC',
      '600'
    );

    ui.text(
      ctx,
      '当前可用资金 ' +
      compactMoney(cash),
      29,
      188,
      7.3,
      '#FFE27B',
      '800'
    );

    this.drawPrimaryButton(
      ctx,
      'go-city',
      '去选址',
      27,
      221,
      160,
      39,
      false
    );

    this.drawPrimaryButton(
      ctx,
      'go-property',
      '查看房源',
      203,
      221,
      160,
      39,
      true
    );

    const y = 282;

    ui.card(
      ctx,
      10,
      y,
      181,
      130,
      {
        radius: 15,
        fill: COLORS.panel,
        stroke: '#DED5C8'
      }
    );

    ui.text(
      ctx,
      '推荐商圈',
      23,
      y + 20,
      10,
      COLORS.text,
      '800'
    );

    if (rec) {
      ui.text(
        ctx,
        rec.district.name,
        23,
        y + 47,
        12,
        COLORS.navy,
        '800'
      );

      ui.pill(
        ctx,
        '需求 ' +
        Number(
          rec.district.baseDemand || 0
        ).toLocaleString() +
        '/日',
        23,
        y + 61,
        95,
        22,
        '#EAF6FF',
        '#157DB5'
      );

      ui.text(
        ctx,
        '客单 ' +
        compactMoney(
          rec.district.avgSpend || 0
        ),
        23,
        y + 96,
        6.4,
        COLORS.text,
        '700'
      );

      ui.text(
        ctx,
        '平均挂牌租金 ' +
        compactMoney(
          rec.market.averageAskingRent || 0
        ),
        23,
        y + 114,
        6.1,
        COLORS.muted,
        '600'
      );

      this.addButton(
        'go-district:' +
        rec.district.id,
        10,
        y,
        181,
        130
      );
    }

    ui.card(
      ctx,
      199,
      y,
      181,
      130,
      {
        radius: 15,
        fill: COLORS.panel,
        stroke: '#DED5C8'
      }
    );

    ui.text(
      ctx,
      '今日优质房源',
      212,
      y + 20,
      10,
      COLORS.text,
      '800'
    );

    if (listing) {
      ui.text(
        ctx,
        shortText(
          listing.address ||
          listing.name ||
          '临街餐饮铺',
          13
        ),
        212,
        y + 47,
        9,
        COLORS.navy,
        '800'
      );

      ui.text(
        ctx,
        Math.round(
          Number(
            listing.grossArea ||
            listing.usableArea ||
            0
          )
        ) +
        '㎡ · ' +
        (listing.floor || '临街'),
        212,
        y + 68,
        6.2,
        COLORS.muted,
        '600'
      );

      ui.text(
        ctx,
        '月租 ' +
        compactMoney(
          listing.askingMonthlyRent ||
          listing.monthlyRent ||
          0
        ),
        212,
        y + 92,
        7.6,
        COLORS.red,
        '800'
      );

      ui.text(
        ctx,
        '当前 ' +
        market.listingCount +
        ' 套可看',
        212,
        y + 113,
        5.9,
        COLORS.green,
        '700'
      );

      this.addButton(
        'go-property',
        199,
        y,
        181,
        130
      );
    } else {
      ui.text(
        ctx,
        '当前商圈暂无挂牌',
        212,
        y + 60,
        7.1,
        COLORS.muted,
        '700'
      );

      ui.text(
        ctx,
        '可以切换商圈继续寻找',
        212,
        y + 84,
        5.9,
        COLORS.muted,
        '600'
      );
    }

    ui.card(
      ctx,
      10,
      421,
      370,
      99,
      {
        radius: 15,
        fill: COLORS.panel,
        stroke: '#DED5C8'
      }
    );

    ui.text(
      ctx,
      '首店预算预估',
      23,
      442,
      10,
      COLORS.text,
      '800'
    );

    ui.text(
      ctx,
      '基于当前推荐房源实时估算',
      367,
      442,
      5.8,
      COLORS.muted,
      '600',
      'right'
    );

    const budgetItems = [
      ['押租', estimate.deposit],
      ['转让', estimate.transfer],
      ['装修', estimate.renovation],
      ['设备', estimate.equipment],
      ['周转', estimate.reserve]
    ];

    for (let i = 0; i < budgetItems.length; i++) {
      const bx = 18 + i * 71.5;

      ui.text(
        ctx,
        budgetItems[i][0],
        bx + 32,
        468,
        5.5,
        COLORS.muted,
        '700',
        'center'
      );

      ui.text(
        ctx,
        compactMoney(
          budgetItems[i][1]
        ),
        bx + 32,
        487,
        6.5,
        COLORS.text,
        '800',
        'center'
      );
    }

    ui.text(
      ctx,
      '预计启动资金',
      23,
      510,
      6.1,
      COLORS.muted,
      '700'
    );

    ui.text(
      ctx,
      compactMoney(
        estimate.total
      ),
      367,
      510,
      9,
      estimate.total <= cash
        ? COLORS.green
        : COLORS.red,
      '800',
      'right'
    );

    ui.card(
      ctx,
      10,
      529,
      370,
      105,
      {
        radius: 15,
        fill: COLORS.panel,
        stroke: '#DED5C8'
      }
    );

    ui.text(
      ctx,
      '开店步骤',
      23,
      550,
      10,
      COLORS.text,
      '800'
    );

    const steps = [
      ['选址', COLORS.orange],
      ['看铺', COLORS.blue],
      ['谈判', COLORS.purple],
      ['签约', COLORS.green],
      ['筹备', COLORS.goldDeep]
    ];

    for (let i = 0; i < steps.length; i++) {
      const sx = 37 + i * 77.5;

      if (i < steps.length - 1) {
        ctx.fillStyle = '#D7D0C5';
        ctx.fillRect(
          sx + 12,
          584,
          53,
          2
        );
      }

      ctx.beginPath();
      ctx.arc(
        sx,
        584,
        12,
        0,
        Math.PI * 2
      );
      ctx.fillStyle = steps[i][1];
      ctx.fill();

      ui.text(
        ctx,
        String(i + 1),
        sx,
        584,
        6.7,
        COLORS.white,
        '800',
        'center'
      );

      ui.text(
        ctx,
        steps[i][0],
        sx,
        613,
        6.3,
        COLORS.text,
        '700',
        'center'
      );
    }
  }

  drawShopHero(
    ctx,
    shop,
    state,
    operating
  ) {
    ui.card(
      ctx,
      10,
      96,
      370,
      171,
      {
        radius: 18,
        fill: COLORS.panel,
        stroke: '#D8D0C4'
      }
    );

    this.drawHeroImage(
      ctx,
      18,
      104,
      354,
      105,
      'rgba(2,30,45,0.18)'
    );

    ui.text(
      ctx,
      shortText(
        shop.name || '我的餐厅',
        12
      ),
      28,
      130,
      17,
      COLORS.white,
      '800'
    );

    const district =
      citySystem.getDistrict(
        shop.districtId
      );

    ui.text(
      ctx,
      (district
        ? district.name
        : '') +
      ' · ' +
      shortText(
        shop.address || '已签约门店',
        15
      ),
      28,
      154,
      6.7,
      '#F1F8FB',
      '600'
    );

    ui.pill(
      ctx,
      operating
        ? '营业中'
        : (
          shop.status === 'renovating'
            ? '装修中'
            : (
              state.readiness.ready
                ? '可试营业'
                : '筹备中'
            )
        ),
      28,
      169,
      78,
      24,
      operating
        ? '#E8FFF2'
        : '#FFF2D6',
      operating
        ? '#198B57'
        : '#B46C14'
    );

    ui.card(
      ctx,
      18,
      215,
      354,
      43,
      {
        radius: 11,
        fill: 'rgba(3,53,82,0.95)',
        stroke: 'rgba(86,197,239,0.42)',
        shadow: false
      }
    );

    const metrics =
      state.metrics || {};

    const rooms =
      this.getRooms(shop.id);

    const items = [
      [
        '面积',
        Math.round(
          Number(
            shop.usableArea ||
            shop.grossArea ||
            0
          )
        ) + '㎡'
      ],
      [
        '餐位',
        Math.round(
          Number(
            metrics.totalSeats ||
            shop.seatEstimate ||
            0
          )
        ) + '个'
      ],
      [
        '包厢',
        rooms.length + '间'
      ],
      [
        '月租',
        compactMoney(
          shop.monthlyRent || 0
        )
      ]
    ];

    for (let i = 0; i < items.length; i++) {
      const mx = 32 + i * 86;

      ui.text(
        ctx,
        items[i][0],
        mx,
        228,
        5.6,
        '#BBD5E2',
        '600'
      );

      ui.text(
        ctx,
        items[i][1],
        mx,
        246,
        7.4,
        COLORS.white,
        '800'
      );
    }

    this.addButton(
      'shop:rename',
      18,
      104,
      200,
      98
    );
  }

  drawPreparationSummary(
    ctx,
    shop,
    state
  ) {
    ui.card(
      ctx,
      10,
      277,
      370,
      93,
      {
        radius: 15,
        fill: COLORS.panel,
        stroke: '#DDD4C8'
      }
    );

    ui.text(
      ctx,
      '开店筹备',
      22,
      297,
      10,
      COLORS.text,
      '800'
    );

    const equipmentLabel = {
      planning: '规划中',
      ordered: '已下单',
      delivered: '待安装',
      installed: '已安装'
    }[
      state.equipmentStatus
    ] || state.equipmentStatus;

    const items = [
      [
        '装修',
        percent(
          state.renovationProgress
        ),
        COLORS.orange
      ],
      [
        '证照',
        state.permitApproved +
        '/' +
        state.permitTotal,
        COLORS.blue
      ],
      [
        '招聘',
        state.hiredCount +
        '/' +
        state.requiredCount,
        COLORS.green
      ],
      [
        '设备',
        equipmentLabel,
        COLORS.purple
      ]
    ];

    for (let i = 0; i < items.length; i++) {
      this.drawMiniMetric(
        ctx,
        18 + i * 91,
        311,
        84,
        items[i][0],
        items[i][1],
        items[i][2]
      );
    }
  }

  drawPreparationProgress(
    ctx,
    state
  ) {
    ui.card(
      ctx,
      10,
      379,
      370,
      91,
      {
        radius: 15,
        fill: COLORS.panel,
        stroke: '#DDD4C8'
      }
    );

    ui.text(
      ctx,
      '开店进度',
      22,
      399,
      10,
      COLORS.text,
      '800'
    );

    const rows = [
      {
        label: '签约',
        done: true
      },
      {
        label: '装修',
        done:
          state.readiness
            .renovationReady
      },
      {
        label: '证照',
        done:
          state.readiness
            .permitsReady
      },
      {
        label: '招聘',
        done:
          state.readiness
            .staffingReady
      },
      {
        label: '设备',
        done:
          state.readiness
            .equipmentReady
      },
      {
        label: '试营业',
        done: false
      }
    ];

    let currentIndex =
      rows.findIndex(
        item => !item.done
      );

    if (currentIndex < 0) {
      currentIndex =
        rows.length - 1;
    }

    const startX = 36;
    const gap = 63;

    for (let i = 0; i < rows.length; i++) {
      const x =
        startX +
        i * gap;

      if (i < rows.length - 1) {
        ctx.fillStyle =
          i < currentIndex
            ? '#36A46E'
            : '#D4D9DB';

        ctx.fillRect(
          x + 11,
          431,
          gap - 22,
          3
        );
      }

      ctx.beginPath();
      ctx.arc(
        x,
        432,
        10,
        0,
        Math.PI * 2
      );

      ctx.fillStyle =
        rows[i].done
          ? COLORS.green
          : (
            i === currentIndex
              ? COLORS.gold
              : '#DCE3E6'
          );

      ctx.fill();

      ui.text(
        ctx,
        rows[i].done
          ? '✓'
          : String(i + 1),
        x,
        432,
        6,
        rows[i].done
          ? COLORS.white
          : COLORS.text,
        '800',
        'center'
      );

      ui.text(
        ctx,
        rows[i].label,
        x,
        456,
        5.7,
        COLORS.text,
        '700',
        'center'
      );
    }
  }

  drawPreparationBottom(
    ctx,
    shop,
    state
  ) {
    ui.card(
      ctx,
      10,
      479,
      181,
      124,
      {
        radius: 15,
        fill: COLORS.panel,
        stroke: '#DDD4C8'
      }
    );

    ui.text(
      ctx,
      '下一步建议',
      22,
      499,
      10,
      COLORS.text,
      '800'
    );

    const rec =
      state.recommendation;

    const imageKey =
      rec.id === 'renovation'
        ? 'premium_advice_renovation'
        : rec.id === 'staff'
          ? 'premium_advice_staff'
          : 'premium_advice_permit';

    ui.coverImage(
      ctx,
      visualAssetSystem.get(imageKey),
      20,
      513,
      58,
      52,
      9,
      null
    );

    ui.text(
      ctx,
      rec.title,
      86,
      526,
      8.2,
      COLORS.text,
      '800'
    );

    ui.text(
      ctx,
      shortText(
        rec.detail,
        14
      ),
      86,
      546,
      5.3,
      COLORS.muted,
      '600'
    );

    this.drawPrimaryButton(
      ctx,
      'module:' + rec.id,
      rec.action,
      82,
      562,
      94,
      31,
      false
    );

    ui.card(
      ctx,
      199,
      479,
      181,
      124,
      {
        radius: 15,
        fill: COLORS.panel,
        stroke: '#DDD4C8'
      }
    );

    ui.text(
      ctx,
      '筹备资金',
      211,
      499,
      10,
      COLORS.text,
      '800'
    );

    const need =
      state.finance &&
      state.finance.need
        ? state.finance.need
        : (
          state.finance &&
          state.finance.offer &&
          state.finance.offer.need
            ? state.finance.offer.need
            : null
        );

    const totalNeed =
      need
        ? need.totalNeed
        : (
          state.metrics
            ? state.metrics.totalCost
            : 0
        );

    const gap =
      state.finance
        ? Number(state.finance.gap) || 0
        : 0;

    ui.text(
      ctx,
      '预计总投入',
      211,
      526,
      5.9,
      COLORS.muted,
      '600'
    );

    ui.text(
      ctx,
      compactMoney(
        totalNeed || 0
      ),
      367,
      526,
      8.2,
      COLORS.text,
      '800',
      'right'
    );

    ui.text(
      ctx,
      gap > 0
        ? '资金缺口'
        : '当前资金',
      211,
      550,
      5.9,
      COLORS.muted,
      '600'
    );

    ui.text(
      ctx,
      compactMoney(
        gap > 0
          ? gap
          : gameState
              .getPlayer()
              .cash
      ),
      367,
      550,
      8.2,
      gap > 0
        ? COLORS.red
        : COLORS.green,
      '800',
      'right'
    );

    if (gap > 0) {
      this.drawPrimaryButton(
        ctx,
        'module:finance',
        '申请周转金',
        247,
        562,
        118,
        31,
        true
      );
    } else {
      ui.text(
        ctx,
        '资金状态正常',
        289,
        580,
        6.5,
        COLORS.green,
        '700',
        'center'
      );
    }

    this.drawPrimaryButton(
      ctx,
      'module:' +
        state.recommendation.id,
      state.recommendation.action,
      25,
      614,
      165,
      38,
      false
    );

    this.drawPrimaryButton(
      ctx,
      'go-city',
      '继续看商圈',
      200,
      614,
      165,
      38,
      true
    );
  }

  renderPreparing(
    ctx,
    shop
  ) {
    const state =
      this.getPreparationState(
        shop
      );

    this.drawHeader(ctx, shop);
    this.drawShopHero(
      ctx,
      shop,
      state,
      false
    );
    this.drawPreparationSummary(
      ctx,
      shop,
      state
    );
    this.drawPreparationProgress(
      ctx,
      state
    );
    this.drawPreparationBottom(
      ctx,
      shop,
      state
    );
  }

  drawOperatingMetrics(
    ctx,
    shop,
    state
  ) {
    const district =
      citySystem.getDistrict(
        shop.districtId
      );

    const metrics =
      state.metrics || {};

    ui.card(
      ctx,
      10,
      277,
      370,
      118,
      {
        radius: 15,
        fill: COLORS.panel,
        stroke: '#DDD4C8'
      }
    );

    ui.text(
      ctx,
      '经营概览',
      22,
      297,
      10,
      COLORS.text,
      '800'
    );

    ui.text(
      ctx,
      '第一阶段展示真实门店结构与商圈经营环境',
      367,
      297,
      5.3,
      COLORS.muted,
      '600',
      'right'
    );

    const items = [
      [
        '餐位',
        Math.round(
          Number(
            metrics.totalSeats ||
            shop.seatEstimate ||
            0
          )
        ) + '个',
        COLORS.blue
      ],
      [
        '商圈需求',
        Number(
          district
            ? district.baseDemand
            : 0
        ).toLocaleString(),
        COLORS.green
      ],
      [
        '商圈客单',
        compactMoney(
          district
            ? district.avgSpend
            : 0
        ),
        COLORS.orange
      ],
      [
        '竞争店',
        (
          district
            ? district.restaurantCount
            : 0
        ) + '家',
        COLORS.purple
      ],
      [
        '饱和度',
        (
          district
            ? district.saturation
            : 0
        ) + '%',
        COLORS.red
      ],
      [
        '月租',
        compactMoney(
          shop.monthlyRent || 0
        ),
        COLORS.goldDeep
      ]
    ];

    for (let i = 0; i < items.length; i++) {
      const row = i < 3 ? 0 : 1;
      const col = i % 3;

      this.drawMiniMetric(
        ctx,
        18 + col * 121,
        310 + row * 50,
        113,
        items[i][0],
        items[i][1],
        items[i][2]
      );
    }
  }

  drawRoomsAndQuick(
    ctx,
    shop,
    state
  ) {
    ui.card(
      ctx,
      10,
      405,
      181,
      151,
      {
        radius: 15,
        fill: COLORS.panel,
        stroke: '#DDD4C8'
      }
    );

    ui.text(
      ctx,
      '店面与包厢',
      22,
      425,
      10,
      COLORS.text,
      '800'
    );

    ui.text(
      ctx,
      '管理 ›',
      178,
      425,
      5.9,
      COLORS.navy,
      '800',
      'right'
    );

    this.addButton(
      'room:manage',
      135,
      408,
      50,
      32
    );

    const rooms =
      this.getRooms(
        shop.id
      );

    const images = [
      'premium_room_1',
      'premium_room_2',
      'premium_room_3'
    ];

    for (let i = 0; i < 3; i++) {
      const rx =
        18 + i * 55;

      ui.card(
        ctx,
        rx,
        439,
        50,
        78,
        {
          radius: 8,
          fill: '#FBF7EF',
          stroke: '#E2D8CB',
          shadow: false
        }
      );

      if (rooms[i]) {
        ui.coverImage(
          ctx,
          visualAssetSystem.get(
            images[i]
          ),
          rx + 2,
          441,
          46,
          42,
          6,
          null
        );

        ui.text(
          ctx,
          shortText(
            rooms[i].name ||
            ('包厢' + (i + 1)),
            5
          ),
          rx + 25,
          493,
          5.5,
          COLORS.text,
          '700',
          'center'
        );

        ui.text(
          ctx,
          (Number(rooms[i].seats) || 0) +
          '人',
          rx + 25,
          508,
          5.1,
          COLORS.muted,
          '600',
          'center'
        );

        this.addButton(
          'room:rename:' +
          rooms[i].id,
          rx,
          439,
          50,
          78
        );
      } else {
        ui.text(
          ctx,
          '待规划',
          rx + 25,
          475,
          5.5,
          COLORS.muted,
          '700',
          'center'
        );

        this.addButton(
          'room:manage',
          rx,
          439,
          50,
          78
        );
      }
    }

    ui.text(
      ctx,
      '当前 ' +
      rooms.length +
      ' 间包厢',
      22,
      540,
      5.8,
      COLORS.muted,
      '600'
    );

    ui.card(
      ctx,
      199,
      405,
      181,
      151,
      {
        radius: 15,
        fill: COLORS.panel,
        stroke: '#DDD4C8'
      }
    );

    ui.text(
      ctx,
      '快捷入口',
      211,
      425,
      10,
      COLORS.text,
      '800'
    );

    const quick = [
      ['staff', '员工', COLORS.blue],
      ['research', '菜单', COLORS.orange],
      ['supply', '库存采购', COLORS.green],
      ['business', '经营数据', COLORS.purple]
    ];

    for (let i = 0; i < quick.length; i++) {
      const qx =
        211 +
        (i % 2) * 80;

      const qy =
        443 +
        Math.floor(i / 2) * 50;

      ui.card(
        ctx,
        qx,
        qy,
        72,
        42,
        {
          radius: 10,
          fill: '#F8F5EF',
          stroke: '#E2D8CB',
          shadow: false
        }
      );

      ctx.beginPath();
      ctx.arc(
        qx + 14,
        qy + 14,
        7,
        0,
        Math.PI * 2
      );

      ctx.fillStyle =
        quick[i][2];
      ctx.fill();

      ui.text(
        ctx,
        quick[i][1],
        qx + 36,
        qy + 21,
        6.1,
        COLORS.text,
        '800',
        'center'
      );

      this.addButton(
        'module:' +
        quick[i][0],
        qx,
        qy,
        72,
        42
      );
    }

    ui.text(
      ctx,
      '员工覆盖 ' +
      percent(
        state.readiness
          .staffing
          .coverage
      ),
      211,
      544,
      5.7,
      COLORS.muted,
      '600'
    );
  }

  drawOperatingBottom(
    ctx,
    shop,
    state
  ) {
    const district =
      citySystem.getDistrict(
        shop.districtId
      );

    ui.card(
      ctx,
      10,
      566,
      370,
      73,
      {
        radius: 15,
        fill: COLORS.panel,
        stroke: '#DDD4C8'
      }
    );

    ui.text(
      ctx,
      '门店状态',
      22,
      586,
      9.5,
      COLORS.text,
      '800'
    );

    const comfort =
      state.metrics
        ? Math.round(
            Number(
              state.metrics.comfort
            ) || 0
          )
        : 0;

    const reputation =
      Math.round(
        Number(
          gameState
            .getPlayer()
            .reputation
        ) || 0
      );

    const lines = [
      '装修舒适 ' + comfort,
      '证照 ' +
        state.permitApproved +
        '/' +
        state.permitTotal,
      '品牌声望 ' + reputation,
      '商圈 ' +
        (
          district
            ? district.name
            : '-'
        )
    ];

    for (let i = 0; i < lines.length; i++) {
      ui.text(
        ctx,
        lines[i],
        22 + (i % 2) * 170,
        611 +
          Math.floor(i / 2) * 17,
        5.8,
        i === 0
          ? COLORS.green
          : COLORS.muted,
        '700'
      );
    }

    this.drawPrimaryButton(
      ctx,
      'module:research',
      '管理菜单',
      27,
      648,
      160,
      38,
      false
    );

    this.drawPrimaryButton(
      ctx,
      'module:business',
      '查看数据',
      203,
      648,
      160,
      38,
      true
    );
  }

  renderOperating(
    ctx,
    shop
  ) {
    const state =
      this.getPreparationState(
        shop
      );

    this.drawHeader(ctx, shop);

    this.drawShopHero(
      ctx,
      shop,
      state,
      true
    );

    this.drawOperatingMetrics(
      ctx,
      shop,
      state
    );

    this.drawRoomsAndQuick(
      ctx,
      shop,
      state
    );

    this.drawOperatingBottom(
      ctx,
      shop,
      state
    );
  }

  render(ctx) {
    if (!ctx) return;

    this.getLayout();
    this.buttons = [];

    ctx.save();

    ctx.fillStyle = COLORS.paper;
    ctx.fillRect(
      0,
      0,
      DESIGN_W,
      this.viewH
    );

    const shop =
      this.getCurrentShop();

    const mode =
      this.getMode(shop);

    if (mode === 'no-shop') {
      this.renderNoShop(ctx);
    } else if (
      mode === 'preparing'
    ) {
      this.renderPreparing(
        ctx,
        shop
      );
    } else {
      this.renderOperating(
        ctx,
        shop
      );
    }

    ctx.restore();
  }

  showToast(title) {
    if (
      api &&
      typeof api.showToast ===
        'function'
    ) {
      api.showToast({
        title,
        icon: 'none'
      });
    }
  }

  cycleShop(direction) {
    const business =
      gameState.getBusiness();

    const shops =
      Array.isArray(
        business.shops
      )
        ? business.shops
        : [];

    if (shops.length < 2) {
      return false;
    }

    let index =
      shops.findIndex(
        item =>
          item.id ===
          business.currentShopId
      );

    if (index < 0) index = 0;

    index =
      (
        index +
        direction +
        shops.length
      ) %
      shops.length;

    business.currentShopId =
      shops[index].id;

    return true;
  }

  renameShop(shop) {
    textInput
      .requestText({
        title: '修改门店名称',
        value: shop.name || '',
        placeholder: '请输入门店名称',
        maxLength: 12
      })
      .then(value => {
        if (!value) return;

        customizationSystem
          .renameShop(
            shop.id,
            value
          );

        textInput
          .requestRender();
      });
  }

  handleModule(
    moduleId,
    shop
  ) {
    const sceneMap = {
      renovation:
          'renovation',
      equipment:
          'equipment',
      license:
          'license',
      staff:
          'staff',
      research:
          'research',
      supply:
          'supply',
      business:
          'business'
    };

    if (sceneMap[moduleId]) {
      sceneManager.switchTo(
        sceneMap[moduleId],
        {
          shopId: shop.id
        }
      );

      return true;
    }

    if (moduleId === 'trial') {
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

    if (moduleId === 'finance') {
      const offer =
        openingFinanceSystem
          .getOffer(
            shop.id
          );

      const accept = () => {
        const result =
          openingFinanceSystem
            .acceptOffer(
              shop.id
            );

        this.showToast(
          result.ok
            ? (
              '已到账 ' +
              compactMoney(
                result.loan.principal
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
        typeof api.showModal ===
          'function'
      ) {
        api.showModal({
          title: '开店周转金',
          content:
            '可借 ' +
            compactMoney(
              offer.principal
            ) +
            '，期限 ' +
            offer.termMonths +
            ' 个月，预计月还 ' +
            compactMoney(
              offer.monthlyPayment
            ) +
            '。确认申请？',
          confirmText: '申请',
          cancelText: '取消',
          success: result => {
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

    return false;
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

    if (
      item.id === 'go-city'
    ) {
      sceneManager.switchTo(
        'city'
      );
      return true;
    }

    if (
      item.id === 'go-property'
    ) {
      sceneManager.switchTo(
        'propertyMarket'
      );
      return true;
    }

    if (
      item.id.indexOf(
        'go-district:'
      ) === 0
    ) {
      const districtId =
        item.id.slice(
          'go-district:'.length
        );

      citySystem.setCurrentDistrict(
        districtId
      );

      sceneManager.switchTo(
        'district',
        {
          districtId
        }
      );

      return true;
    }

    if (
      item.id === 'shop:prev'
    ) {
      this.cycleShop(-1);
      return true;
    }

    if (
      item.id === 'shop:next'
    ) {
      this.cycleShop(1);
      return true;
    }

    const shop =
      this.getCurrentShop();

    if (!shop) {
      return true;
    }

    if (
      item.id === 'shop:rename' ||
      item.id === 'store:settings'
    ) {
      this.renameShop(shop);
      return true;
    }

    if (
      item.id === 'room:manage'
    ) {
      sceneManager.switchTo(
        'renovation',
        {
          shopId: shop.id,
          page: 'rooms'
        }
      );

      return true;
    }

    if (
      item.id.indexOf(
        'room:rename:'
      ) === 0
    ) {
      const roomId =
        item.id.slice(
          'room:rename:'.length
        );

      const room =
        this.getRooms(
          shop.id
        )
        .find(
          item =>
            item.id === roomId
        );

      if (room) {
        textInput
          .requestText({
            title: '修改包厢名称',
            value: room.name || '',
            placeholder: '例如：牡丹厅',
            maxLength: 12
          })
          .then(value => {
            if (!value) return;

            customizationSystem
              .renameRoom(
                shop.id,
                roomId,
                value
              );

            textInput
              .requestRender();
          });
      }

      return true;
    }

    if (
      item.id.indexOf(
        'module:'
      ) === 0
    ) {
      const moduleId =
        item.id.split(':')[1];

      return this.handleModule(
        moduleId,
        shop
      );
    }

    return false;
  }
}

// 兼容旧测试与旧资源契约：
// premium_store_hero
// premium_room_1 / premium_room_2 / premium_room_3
// premium_advice_renovation
// premium_advice_permit
// premium_advice_staff
// premium_explore_banner
// 'shop:rename' / 'room:rename:' / 'room:manage'
// 动态module路由 / 'module:finance'

module.exports =
  new StoreScene();
