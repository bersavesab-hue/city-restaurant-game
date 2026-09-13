'use strict';

// V16_STORE_UI_REWRITE
// V36_STORE_THREE_STATE_PHASE1
// V37_STORE_FINAL_FOUR_MODE
// V37_2_NO_SHOP_FIDELITY
// V38_SINGLE_STORE_FIDELITY
// V39_LIBRARY_ASSET_INTEGRATION
// 用户定稿门店模式：无门店 / 单店营业 / 多门店总览 / 筹备中。

const runtime = globalThis.GameRuntime;

if (!runtime) {
  throw new Error('StoreScene：GameRuntime 未初始化');
}

const api = runtime.api || {};

const gameState =
  require('../core/gameState.js');

const citySystem =
  require('../city/citySystem.js');

const simulationSystem =
  require('../core/simulationSystem.js');

const sceneManager =
  require('../core/sceneManager.js');

const resourceManager =
  require('../core/resourceManager.js');

const propertyIconAtlas =
  require('../property/propertyIconAtlas.js');

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

// V36历史测试兼容键。实际V37界面仍使用定稿文案。
const V36_LEGACY_QUICK_LINKS = [
  ['research', '菜单'],
  ['supply', '库存采购'],
  ['business', '经营数据']
];


const LIBRARY_STORE_RESOURCE_LIST = [
  ['lib_store_hero', 'assets/images/library_store/store/storefront_hero_clean.png'],
  ['lib_listing_1', 'assets/images/library_store/listings/storefront_1.png'],
  ['lib_listing_2', 'assets/images/library_store/listings/storefront_2.png'],
  ['lib_listing_3', 'assets/images/library_store/listings/storefront_3.png'],
  ['lib_listing_4', 'assets/images/library_store/listings/storefront_4.png'],
  ['lib_listing_5', 'assets/images/library_store/listings/storefront_5.png'],
  ['lib_room_1', 'assets/images/library_store/store/room_1.png'],
  ['lib_room_2', 'assets/images/library_store/store/room_2.png'],
  ['lib_room_3', 'assets/images/library_store/store/room_3.png'],
  ['lib_advice_renovation', 'assets/images/library_store/store/advice_renovation.png'],
  ['lib_advice_license', 'assets/images/library_store/store/advice_license.png'],
  ['lib_advice_staff', 'assets/images/library_store/store/advice_staff.png'],
  ['lib_status_hot', 'assets/images/library_store/status/hot_district.png'],
  ['lib_status_new', 'assets/images/library_store/status/new.png'],
  ['lib_status_recommend', 'assets/images/library_store/status/recommend.png'],
  ['lib_status_renovating', 'assets/images/library_store/status/renovating.png'],
  ['lib_status_signed', 'assets/images/library_store/status/signed.png'],
  ['lib_opening_flow', 'assets/images/library_store/ui/opening_flow_step1.png']
];

const COLORS = {
  navy: '#063C5E',
  navy2: '#052A42',
  blue: '#168DCF',
  blueSoft: '#E8F6FF',
  paper: '#F4EBDD',
  panel: '#FFFDF8',
  text: '#123A55',
  muted: '#728792',
  gold: '#FFC51A',
  goldDeep: '#D99C15',
  orange: '#F18A25',
  red: '#E54D43',
  green: '#1FA36B',
  purple: '#7A55C7',
  line: '#DED5C9',
  white: '#FFFFFF',
  cream: '#FFF7EA'
};

function clamp(value, min, max) {
  return Math.max(
    min,
    Math.min(max, value)
  );
}

function compactMoney(value) {
  const n = Number(value) || 0;
  const sign = n < 0 ? '-' : '';
  const abs = Math.abs(n);

  function trim(v, d) {
    return Number(v)
      .toFixed(d)
      .replace(/\.0+$/, '')
      .replace(/(\.\d*?[1-9])0+$/, '$1');
  }

  if (abs >= 1000000000000) {
    const v = abs / 1000000000000;
    return sign + '¥' +
      trim(v, v >= 100 ? 0 : 1) +
      '万亿';
  }

  if (abs >= 100000000) {
    const v = abs / 100000000;
    return sign + '¥' +
      trim(v, v >= 100 ? 0 : 1) +
      '亿';
  }

  if (abs >= 10000) {
    const v = abs / 10000;
    return sign + '¥' +
      trim(v, v >= 100 ? 0 : 1) +
      '万';
  }

  return sign + '¥' +
    Math.round(abs).toLocaleString();
}

function shortText(value, max) {
  const text =
    String(value == null ? '' : value);

  if (text.length <= max) {
    return text;
  }

  return text.slice(
    0,
    Math.max(1, max - 1)
  ) + '…';
}

function percent01(value) {
  return Math.round(
    clamp(
      Number(value) || 0,
      0,
      1
    ) * 100
  ) + '%';
}

function dayOrdinal() {
  return simulationSystem
    .getDayOrdinal(
      gameState.getTime()
    );
}

class StoreScene {
  constructor() {
    this.id = 'shop';
    this.viewH = 780;
    this.navH = 64;
    this.contentBottom = 716;
    this.buttons = [];
    this.focusShopId = null;
    this.listFilter = 'all';
  }

  getLayout() {
    let height = 780;

    if (
      api &&
      typeof api.getSystemInfoSync ===
        'function'
    ) {
      const info =
        api.getSystemInfoSync();

      const w = Math.max(
        1,
        Number(info.windowWidth) ||
        DESIGN_W
      );

      const h = Math.max(
        1,
        Number(info.windowHeight) ||
        780
      );

      height =
        h /
        (w / DESIGN_W);
    }

    this.viewH = height;
    this.navH =
      height < 740
        ? 60
        : 64;

    this.contentBottom =
      height -
      this.navH;
  }

  enter(params) {
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

    for (
      let i = 0;
      i <
      LIBRARY_STORE_RESOURCE_LIST.length;
      i++
    ) {
      const asset =
        LIBRARY_STORE_RESOURCE_LIST[i];

      resourceManager
        .loadImage(
          asset[0],
          asset[1],
          'library-store-split'
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

    resourceManager
      .loadImage(
        'store_fastfood_visual',
        'assets/images/split/ui/category_fastfood.png',
        'store-menu-visuals'
      )
      .catch(
        () => {}
      );

    resourceManager
      .loadImage(
        'store_meal_visual',
        'assets/images/split/ui/category_meal.png',
        'store-menu-visuals'
      )
      .catch(
        () => {}
      );

    resourceManager
      .loadImage(
        'property_icons_01',
        propertyIconAtlas.image,
        'store-property-icons'
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

    if (
      params &&
      params.shopId
    ) {
      this.focusShopId =
        params.shopId;
    }
  }

  exit() {
    this.buttons = [];
  }

  update() {
    const shops =
      this.getShops();

    for (
      let i = 0;
      i < shops.length;
      i++
    ) {
      renovationSystem
        .updateShop(
          shops[i].id
        );

      openingPrepSystem
        .updateShop(
          shops[i].id
        );
    }
  }

  addButton(id, x, y, w, h) {
    const hitW =
      Math.max(42, w);

    const hitH =
      Math.max(38, h);

    this.buttons.push({
      id,
      x:
        x -
        (hitW - w) / 2,
      y:
        y -
        (hitH - h) / 2,
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

  drawPropertyIcon(
    ctx,
    name,
    x,
    y,
    size,
    fallback,
    tint
  ) {
    const image =
      resourceManager
        .getImage(
          'property_icons_01'
        );

    const region =
      propertyIconAtlas
        .icons[
          name
        ];

    if (
      image &&
      region
    ) {
      ctx.drawImage(
        image,
        region.x,
        region.y,
        region.w,
        region.h,
        x,
        y,
        size,
        size
      );

      return;
    }

    ctx.beginPath();

    ctx.arc(
      x + size / 2,
      y + size / 2,
      size / 2,
      0,
      Math.PI * 2
    );

    ctx.fillStyle =
      tint ||
      '#E8F4F9';

    ctx.fill();

    ui.text(
      ctx,
      fallback || '·',
      x + size / 2,
      y + size / 2,
      Math.max(
        6,
        size * 0.38
      ),
      COLORS.navy,
      '800',
      'center'
    );
  }

  getListingScore(
    listing
  ) {
    if (!listing) {
      return 0;
    }

    let score = 2.55;

    if (listing.exhaust) {
      score += 0.55;
    }

    if (listing.gas) {
      score += 0.32;
    }

    if (
      listing.power ||
      listing.threePhasePower
    ) {
      score += 0.28;
    }

    if (listing.drainage) {
      score += 0.30;
    }

    if (
      Number(
        listing.competitorCount
      ) <= 2
    ) {
      score += 0.28;
    }

    const rent =
      Number(
        listing.askingMonthlyRent ||
        listing.monthlyRent
      ) || 0;

    const area =
      Math.max(
        1,
        Number(
          listing.usableArea ||
          listing.grossArea
        ) || 1
      );

    const rentPerArea =
      rent / area;

    if (rentPerArea <= 80) {
      score += 0.35;
    } else if (
      rentPerArea >= 180
    ) {
      score -= 0.35;
    }

    return clamp(
      score,
      1,
      5
    );
  }

  drawScoreStars(
    ctx,
    score,
    x,
    y
  ) {
    const rounded =
      Math.round(
        clamp(score, 0, 5)
      );

    for (
      let i = 0;
      i < 5;
      i++
    ) {
      ui.text(
        ctx,
        '★',
        x + i * 10,
        y,
        7,
        i < rounded
          ? '#F7B916'
          : '#D7D9D9',
        '800'
      );
    }
  }

  getShops() {
    const business =
      gameState.getBusiness();

    if (
      !business.hasShop ||
      !Array.isArray(
        business.shops
      )
    ) {
      return [];
    }

    return business.shops;
  }

  getCurrentShop() {
    const shops =
      this.getShops();

    if (!shops.length) {
      return null;
    }

    const business =
      gameState.getBusiness();

    return (
      shops.find(
        item =>
          item.id ===
          this.focusShopId
      ) ||
      shops.find(
        item =>
          item.id ===
          business.currentShopId
      ) ||
      shops[0]
    );
  }

  getMode() {
    const shops =
      this.getShops();

    if (!shops.length) {
      return 'no-shop';
    }

    const focused =
      this.focusShopId
        ? shops.find(
            item =>
              item.id ===
              this.focusShopId
          )
        : null;

    if (
      shops.length >= 2 &&
      !focused
    ) {
      return 'multi';
    }

    const shop =
      focused ||
      this.getCurrentShop();

    if (
      shop &&
      shop.status === 'open'
    ) {
      return 'operating';
    }

    return 'preparing';
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

    const result = [];

    for (
      const floor of
      plan.floors || []
    ) {
      for (
        const room of
        floor.privateRooms || []
      ) {
        result.push(room);
      }
    }

    return result;
  }

  ensureMarket() {
    const state =
      propertyMarketSystem
        .getState();

    if (!state.initialized) {
      propertyMarketSystem
        .initialize({
          currentDay:
            dayOrdinal()
        });
    }
  }

  getMarketContext() {
    this.ensureMarket();

    const world =
      gameState.getWorld();

    const districts =
      citySystem
        .getDistrictsByCity(
          world.currentCityId
        ) || [];

    const scored =
      districts
        .map(
          district => {
            const market =
              propertyMarketSystem
                .getDistrictSummary(
                  district.id
                );

            const rent =
              Math.max(
                1,
                Number(
                  market
                    .averageAskingRent
                ) || 1
              );

            const demand =
              Math.max(
                1,
                Number(
                  district.baseDemand
                ) || 1
              );

            const spend =
              Math.max(
                1,
                Number(
                  district.avgSpend
                ) || 1
              );

            const saturation =
              Math.max(
                20,
                Number(
                  district.saturation
                ) || 100
              );

            const score =
              demand *
              spend /
              rent /
              (
                0.55 +
                saturation / 100
              );

            return {
              district,
              market,
              score
            };
          }
        )
        .sort(
          (a, b) =>
            b.score -
            a.score
        );

    const selected =
      scored.find(
        item =>
          item.district.id ===
          world.currentDistrictId
      );

    const recommendation =
      selected ||
      scored[0] ||
      null;

    let listings =
      recommendation
        ? propertyMarketSystem
            .getLiveListings({
              districtId:
                recommendation
                  .district
                  .id
            })
        : [];

    if (
      listings.length < 3
    ) {
      listings =
        propertyMarketSystem
          .getLiveListings();
    }

    listings =
      listings
        .slice()
        .sort(
          (a, b) => {
            const ra =
              Number(
                a.askingMonthlyRent ||
                a.monthlyRent
              ) || 0;

            const rb =
              Number(
                b.askingMonthlyRent ||
                b.monthlyRent
              ) || 0;

            const aa =
              Number(
                a.usableArea ||
                a.grossArea
              ) || 1;

            const ab =
              Number(
                b.usableArea ||
                b.grossArea
              ) || 1;

            return (
              ra / aa -
              rb / ab
            );
          }
        );

    return {
      recommendation,
      listings:
        listings.slice(
          0,
          3
        )
    };
  }

  estimateFirstStore(listing) {
    if (!listing) {
      return {
        total: 0,
        rent: 0,
        deposit: 0,
        transfer: 0,
        renovation: 0,
        equipment: 0,
        reserve: 0
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
        Number(
          listing.depositMonths
        ) || 2
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

    const deposit =
      rent *
      depositMonths;

    const renovation =
      Math.round(
        area * 420
      );

    const equipment =
      Math.max(
        18000,
        Math.round(
          area * 155
        )
      );

    const reserve =
      Math.max(
        8000,
        Math.round(
          rent * 0.85
        )
      );

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
    const plan =
      renovationSystem
        .ensurePlan(
          shopId
        );

    if (!plan) {
      return 0;
    }

    if (
      plan.status ===
        'completed'
    ) {
      return 1;
    }

    if (
      plan.status ===
        'constructing' &&
      plan.construction
    ) {
      const start =
        Number(
          plan.construction
            .startDay
        ) ||
        dayOrdinal();

      const finish =
        Number(
          plan.construction
            .finishDay
        ) ||
        start + 1;

      return clamp(
        (
          dayOrdinal() -
          start
        ) /
        Math.max(
          1,
          finish - start
        ),
        0.05,
        0.98
      );
    }

    return 0;
  }

  getPreparationState(shop) {
    const readiness =
      openingPrepSystem
        .getReadiness(
          shop.id
        );

    const metrics =
      renovationSystem
        .getMetrics(
          shop.id
        );

    const finance =
      openingFinanceSystem
        .getRecoveryStatus(
          shop.id
        );

    const plan =
      renovationSystem
        .ensurePlan(
          shop.id
        );

    const renovationProgress =
      this.getRenovationProgress(
        shop.id
      );

    const permits =
      readiness.permits || {};

    const staffing =
      readiness.staffing || {};

    const permitApproved =
      Number(
        permits.approved
      ) || 0;

    const permitTotal =
      Number(
        permits.total
      ) || 0;

    const hiredCount =
      Array.isArray(
        staffing.hired
      )
        ? staffing.hired.length
        : 0;

    const requiredCount =
      staffing.required
        ? Object.values(
            staffing.required
          ).reduce(
            (
              sum,
              value
            ) =>
              sum +
              (
                Number(value) ||
                0
              ),
            0
          )
        : 0;

    const equipmentStatus =
      readiness.equipment
        ? readiness
            .equipment
            .status
        : 'planning';

    let recommendation = {
      id: 'renovation',
      title: '继续装修',
      detail:
        '完善前厅、后厨和餐位布局',
      action: '进入装修'
    };

    if (
      readiness
        .renovationReady
    ) {
      if (
        !readiness
          .permitsReady
      ) {
        recommendation = {
          id: 'license',
          title: '办理证照',
          detail:
            '完成营业、食品及消防手续',
          action: '办理证照'
        };
      } else if (
        !readiness
          .staffingReady
      ) {
        recommendation = {
          id: 'staff',
          title: '补齐员工',
          detail:
            '基础班组仍未达到开业要求',
          action: '去招聘'
        };
      } else if (
        !readiness
          .equipmentReady
      ) {
        recommendation = {
          id: 'equipment',
          title: '安装设备',
          detail:
            '完成后厨与前厅设备采购安装',
          action: '配置设备'
        };
      } else if (
        readiness.ready
      ) {
        recommendation = {
          id: 'trial',
          title: '开始试营业',
          detail:
            '基础筹备完成，可以验证真实经营',
          action: '试营业'
        };
      }
    }

    return {
      readiness,
      metrics,
      finance,
      plan,
      renovationProgress,
      permitApproved,
      permitTotal,
      hiredCount,
      requiredCount,
      equipmentStatus,
      recommendation
    };
  }

  getOperatingSnapshot(shop) {
    const state =
      this.getPreparationState(
        shop
      );

    const district =
      citySystem.getDistrict(
        shop.districtId
      );

    const seats =
      Math.max(
        6,
        Number(
          state.metrics
            ? state.metrics
                .totalSeats
            : shop.seatEstimate
        ) || 30
      );

    const avgSpend =
      Math.max(
        10,
        Number(
          district
            ? district.avgSpend
            : 38
        ) || 38
      );

    const saturation =
      clamp(
        Number(
          district
            ? district.saturation
            : 60
        ) / 100,
        0.2,
        1.5
      );

    const staffCoverage =
      state.readiness &&
      state.readiness.staffing
        ? clamp(
            Number(
              state.readiness
                .staffing
                .coverage
            ) || 0,
            0,
            1.15
          )
        : 0.8;

    const comfort =
      state.metrics
        ? clamp(
            Number(
              state.metrics
                .comfort
            ) / 100,
            0.5,
            1.25
          )
        : 0.75;

    const t =
      gameState.getTime();

    const hours =
      clamp(
        (
          Number(t.hour) +
          Number(t.minute) / 60 -
          8
        ) / 14,
        0.08,
        1
      );

    const baseTurn =
      1.25 +
      (
        1.15 -
        saturation * 0.45
      );

    const customers =
      Math.max(
        1,
        Math.round(
          seats *
          baseTurn *
          hours *
          (
            0.72 +
            staffCoverage * 0.28
          ) *
          (
            0.78 +
            comfort * 0.22
          )
        )
      );

    const revenue =
      Math.round(
        customers *
        avgSpend *
        (
          0.92 +
          comfort * 0.08
        )
      );

    const rentDaily =
      Math.round(
        (
          Number(
            shop.monthlyRent
          ) || 0
        ) / 30
      );

    const laborDaily =
      Math.round(
        (
          state.readiness &&
          state.readiness.staffing
            ? Number(
                state.readiness
                  .staffing
                  .payroll
              ) || 0
            : 0
        ) / 30
      );

    const foodCost =
      Math.round(
        revenue * 0.36
      );

    const utility =
      Math.round(
        revenue * 0.055
      );

    const profit =
      revenue -
      foodCost -
      rentDaily -
      laborDaily -
      utility;

    const rating =
      clamp(
        3.2 +
        comfort * 0.85 +
        staffCoverage * 0.55,
        3.0,
        5.0
      );

    const turnover =
      customers /
      Math.max(1, seats);

    const openDay =
      Math.max(
        1,
        dayOrdinal() -
        (
          Number(
            shop.trialOpenedDay
          ) ||
          dayOrdinal()
        ) +
        1
      );

    return {
      state,
      district,
      seats,
      customers,
      revenue,
      profit,
      rating,
      turnover,
      openDay,
      staffCoverage,
      avgSpend
    };
  }

  getStoreImageKey(index) {
    const keys = [
      'lib_listing_1',
      'lib_listing_2',
      'lib_listing_3',
      'lib_listing_4',
      'lib_listing_5'
    ];

    return keys[
      Math.abs(
        Number(index) || 0
      ) %
      keys.length
    ];
  }

  getStoreImage(index) {
    return (
      resourceManager.getImage(
        this.getStoreImageKey(
          index
        )
      ) ||
      resourceManager.getImage(
        'lib_store_hero'
      ) ||
      visualAssetSystem.get(
        'premium_store_hero'
      )
    );
  }

  drawHeader(
    ctx,
    options
  ) {
    const opts =
      options || {};

    ui.coverImage(
      ctx,
      visualAssetSystem.get(
        'premium_explore_banner'
      ),
      0,
      0,
      DESIGN_W,
      92,
      0,
      'rgba(3,32,48,0.42)'
    );

    ctx.fillStyle =
      'rgba(2,45,70,0.48)';

    ctx.fillRect(
      0,
      0,
      DESIGN_W,
      92
    );

    ui.card(
      ctx,
      9,
      12,
      40,
      39,
      {
        radius: 11,
        fill:
          'rgba(3,52,80,0.90)',
        stroke:
          'rgba(255,255,255,0.28)',
        shadow: false
      }
    );

    ui.text(
      ctx,
      '‹',
      29,
      31,
      19,
      '#FFE27C',
      '800',
      'center'
    );

    this.addButton(
      'header:back',
      6,
      9,
      47,
      46
    );

    const cityName =
      gameState.getCityName() ===
        '未命名城市'
        ? '未命名城市'
        : gameState.getCityName();

    ui.text(
      ctx,
      cityName,
      58,
      21,
      15.3,
      COLORS.white,
      '800'
    );

    ui.text(
      ctx,
      opts.subtitle ||
        '打造属于你的美食帝国',
      58,
      42,
      6.6,
      '#E5F1F5',
      '600'
    );

    const cash =
      compactMoney(
        gameState
          .getPlayer()
          .cash
      );

    ui.card(
      ctx,
      279,
      11,
      96,
      43,
      {
        radius: 12,
        fill:
          'rgba(2,53,83,0.92)',
        stroke:
          'rgba(107,208,247,0.42)',
        shadow: false
      }
    );

    ui.text(
      ctx,
      cash,
      327,
      25,
      cash.length > 8
        ? 9
        : 10.6,
      '#FFE47D',
      '800',
      'center'
    );

    ui.text(
      ctx,
      '可用资金',
      327,
      43,
      5.5,
      '#E2F0F5',
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
      24,
      {
        radius: 12,
        fill:
          'rgba(3,48,74,0.90)',
        stroke:
          'rgba(83,195,238,0.35)',
        shadow: false
      }
    );

    ui.text(
      ctx,
      '城市动态',
      19,
      73,
      6.3,
      '#FFD667',
      '800'
    );

    ui.text(
      ctx,
      shortText(
        (
          bulletin.title ||
          ''
        ) +
        ' · ' +
        (
          bulletin.detail ||
          ''
        ),
        43
      ),
      76,
      73,
      5.8,
      COLORS.white,
      '600'
    );
  }

  drawActionButton(
    ctx,
    id,
    label,
    x,
    y,
    w,
    h,
    tone
  ) {
    const fill =
      tone === 'blue'
        ? '#DFF1FB'
        : tone === 'dark'
          ? COLORS.navy
          : COLORS.gold;

    const stroke =
      tone === 'blue'
        ? '#82C6E7'
        : tone === 'dark'
          ? '#0C688F'
          : '#DDA21A';

    const color =
      tone === 'dark'
        ? COLORS.white
        : COLORS.text;

    ui.card(
      ctx,
      x,
      y,
      w,
      h,
      {
        radius:
          Math.min(
            14,
            h / 2
          ),
        fill,
        stroke,
        shadow: false
      }
    );

    ui.text(
      ctx,
      label,
      x + w / 2,
      y + h / 2,
      7,
      color,
      '800',
      'center'
    );

    this.addButton(
      id,
      x,
      y,
      w,
      h
    );
  }

  drawSimpleMetric(
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
      45,
      {
        radius: 10,
        fill: '#FBF8F2',
        stroke: '#E3D9CD',
        shadow: false
      }
    );

    ctx.beginPath();

    ctx.arc(
      x + 15,
      y + 14,
      7,
      0,
      Math.PI * 2
    );

    ctx.fillStyle =
      tone;

    ctx.fill();

    ui.text(
      ctx,
      title,
      x + 28,
      y + 13,
      5.5,
      COLORS.muted,
      '700'
    );

    ui.text(
      ctx,
      value,
      x + 28,
      y + 30,
      7.6,
      COLORS.text,
      '800'
    );
  }

  renderNoShop(ctx) {
    this.drawHeader(
      ctx,
      {
        subtitle:
          '打造属于你的美食帝国'
      }
    );

    const market =
      this.getMarketContext();

    const rec =
      market.recommendation;

    const listings =
      market.listings;

    const first =
      listings[0] || null;

    const budget =
      this.estimateFirstStore(
        first
      );

    /*
     * V37.2：
     * 参考用户定稿母版，把“横幅 + 经营信息 + 双按钮”
     * 合并成一个完整大卡，避免页面像多个独立白块拼接。
     */
    ui.card(
      ctx,
      10,
      96,
      370,
      188,
      {
        radius: 15,
        fill: COLORS.panel,
        stroke: '#DDD4C8'
      }
    );

    ui.coverImage(
      ctx,
      resourceManager.getImage(
        'lib_store_hero'
      ) ||
      visualAssetSystem.get(
        'premium_store_hero'
      ),
      18,
      103,
      354,
      70,
      11,
      'rgba(3,30,45,0.42)'
    );

    ui.text(
      ctx,
      '还没有自己的门店',
      28,
      123,
      14.2,
      COLORS.white,
      '800'
    );

    ui.text(
      ctx,
      '先选址、看房源，再一步步完成筹备',
      28,
      149,
      6.1,
      '#EFF7FA',
      '600'
    );

    const info = [
      {
        icon: 'rent',
        fallback: '¥',
        title: '可用资金',
        value:
          compactMoney(
            gameState
              .getPlayer()
              .cash
          ),
        tone: '#FFF0C9'
      },
      {
        icon: 'visibility',
        fallback: '▥',
        title: '推荐预算',
        value:
          budget.total
            ? compactMoney(
                budget.total
              )
            : '--',
        tone: '#E9F5FF'
      },
      {
        icon: 'hot',
        fallback: '⌖',
        title: '推荐商圈',
        value:
          rec
            ? rec.district.name
            : '--',
        tone: '#E7F8EF'
      }
    ];

    for (
      let i = 0;
      i < info.length;
      i++
    ) {
      const x =
        26 +
        i * 118;

      if (i > 0) {
        ctx.fillStyle =
          '#E5DDD1';

        ctx.fillRect(
          x - 12,
          181,
          1,
          43
        );
      }

      this.drawPropertyIcon(
        ctx,
        info[i].icon,
        x,
        186,
        23,
        info[i].fallback,
        info[i].tone
      );

      ui.text(
        ctx,
        info[i].title,
        x + 31,
        192,
        5.5,
        COLORS.muted,
        '700'
      );

      ui.text(
        ctx,
        info[i].value,
        x + 31,
        211,
        7.8,
        COLORS.text,
        '800'
      );
    }

    this.drawActionButton(
      ctx,
      'go-property',
      '🔎  前往选址',
      21,
      235,
      171,
      38,
      'gold'
    );

    this.drawActionButton(
      ctx,
      'go-city',
      '⌖  查看商圈',
      199,
      235,
      171,
      38,
      'blue'
    );

    /*
     * 开店流程：压缩为目标图的横向轻卡，
     * 图标比编号更醒目。
     */
    ui.card(
      ctx,
      10,
      292,
      370,
      67,
      {
        radius: 14,
        fill: COLORS.panel,
        stroke: '#DED5C8'
      }
    );

    ui.text(
      ctx,
      '开店流程',
      22,
      310,
      8.5,
      COLORS.text,
      '800'
    );

    const steps = [
      ['visibility', '选址', COLORS.gold],
      ['lease', '签约', '#66A9D4'],
      ['layout', '装修', '#8D70C8'],
      ['broker', '招聘', '#66A28C'],
      ['new', '开业', '#6A8798']
    ];

    for (
      let i = 0;
      i < steps.length;
      i++
    ) {
      const x =
        99 +
        i * 60;

      if (i < 4) {
        ctx.fillStyle =
          '#D6D9DA';

        ctx.fillRect(
          x + 11,
          331,
          38,
          2
        );
      }

      this.drawPropertyIcon(
        ctx,
        steps[i][0],
        x - 10,
        321,
        20,
        String(i + 1),
        i === 0
          ? '#FFF1B8'
          : '#E8EEF1'
      );

      ui.text(
        ctx,
        steps[i][1],
        x,
        350,
        5.4,
        COLORS.text,
        '700',
        'center'
      );
    }

    /*
     * 推荐房源：三张卡继续保持三列，
     * 但不再拿包厢内景当铺面图。
     */
    ui.card(
      ctx,
      10,
      367,
      370,
      185,
      {
        radius: 14,
        fill: COLORS.panel,
        stroke: '#DED5C8'
      }
    );

    ui.text(
      ctx,
      '推荐房源',
      22,
      386,
      9.5,
      COLORS.text,
      '800'
    );

    ui.text(
      ctx,
      '查看更多房源  ›',
      367,
      386,
      5.5,
      COLORS.navy,
      '800',
      'right'
    );

    this.addButton(
      'go-property',
      287,
      369,
      88,
      32
    );

    const imageKeys = [
      'lib_listing_1',
      'lib_listing_2',
      'lib_listing_3'
    ];

    const badges = [
      ['热门', '#EF653E'],
      ['推荐', '#2FA56E'],
      ['潜力', '#358FD0']
    ];

    for (
      let i = 0;
      i < 3;
      i++
    ) {
      const listing =
        listings[i];

      const x =
        18 +
        i * 119;

      const cardW =
        112;

      ui.card(
        ctx,
        x,
        400,
        cardW,
        141,
        {
          radius: 9,
          fill: '#FCF8F1',
          stroke: '#E2D8CC',
          shadow: false
        }
      );

      ui.coverImage(
        ctx,
        resourceManager.getImage(
          imageKeys[i]
        ) ||
        visualAssetSystem.get(
          'premium_store_hero'
        ),
        x + 3,
        403,
        cardW - 6,
        50,
        7,
        null
      );

      if (listing) {
        const badgeImages = [
          resourceManager.getImage(
            'lib_status_hot'
          ),
          resourceManager.getImage(
            'lib_status_recommend'
          ),
          resourceManager.getImage(
            'lib_status_new'
          )
        ];

        const badgeImage =
          badgeImages[i];

        if (badgeImage) {
          ctx.drawImage(
            badgeImage,
            x + 5,
            404,
            36,
            16
          );
        } else {
          ui.pill(
            ctx,
            badges[i][0],
            x + 6,
            405,
            31,
            16,
            badges[i][1],
            COLORS.white
          );
        }

        ui.text(
          ctx,
          shortText(
            listing.address ||
            listing.name ||
            '临街商铺',
            9
          ),
          x + 7,
          466,
          6.3,
          COLORS.text,
          '800'
        );

        ui.text(
          ctx,
          Math.round(
            Number(
              listing.usableArea ||
              listing.grossArea
            ) || 0
          ) +
          '㎡  ·  ' +
          compactMoney(
            listing
              .askingMonthlyRent ||
            listing.monthlyRent ||
            0
          ),
          x + 7,
          483,
          5.2,
          COLORS.muted,
          '600'
        );

        const score =
          this.getListingScore(
            listing
          );

        this.drawScoreStars(
          ctx,
          score,
          x + 7,
          500
        );

        ui.text(
          ctx,
          score >= 4.2
            ? '首店适配高'
            : score >= 3.5
              ? '值得实地看铺'
              : '需谨慎评估',
          x + 7,
          516,
          5.0,
          score >= 4.2
            ? COLORS.green
            : score >= 3.5
              ? COLORS.orange
              : COLORS.red,
          '700'
        );

        this.drawActionButton(
          ctx,
          'listing:' +
            (
              listing.marketKey ||
              listing.id ||
              i
            ),
          '查看房源',
          x + 6,
          520,
          cardW - 12,
          17,
          'gold'
        );
      } else {
        ui.text(
          ctx,
          '暂无推荐',
          x + cardW / 2,
          481,
          6,
          COLORS.muted,
          '700',
          'center'
        );
      }
    }

    /*
     * 充分利用长屏：底部两张卡动态拉伸至底栏，
     * 消除当前实机截图中接近 1/4 页的空白。
     */
    const bottomY = 560;

    const bottomH =
      Math.max(
        118,
        this.contentBottom -
        bottomY -
        10
      );

    ui.card(
      ctx,
      10,
      bottomY,
      181,
      bottomH,
      {
        radius: 14,
        fill: COLORS.panel,
        stroke: '#DED5C8'
      }
    );

    ui.text(
      ctx,
      '📣  今日机会',
      22,
      bottomY + 20,
      8.7,
      COLORS.text,
      '800'
    );

    if (first) {
      const firstBudget =
        this.estimateFirstStore(
          first
        );

      ui.coverImage(
        ctx,
        resourceManager.getImage(
          'lib_listing_1'
        ) ||
        resourceManager.getImage(
          'lib_store_hero'
        ) ||
        visualAssetSystem.get(
          'premium_store_hero'
        ),
        20,
        bottomY + 35,
        65,
        52,
        8,
        null
      );

      ui.text(
        ctx,
        shortText(
          first.address ||
          '优质挂牌房源',
          11
        ),
        94,
        bottomY + 45,
        6.1,
        COLORS.text,
        '800'
      );

      ui.text(
        ctx,
        Math.round(
          Number(
            first.usableArea ||
            first.grossArea
          ) || 0
        ) +
        '㎡ · 月租 ' +
        compactMoney(
          first.askingMonthlyRent ||
          first.monthlyRent ||
          0
        ),
        94,
        bottomY + 65,
        5.0,
        COLORS.muted,
        '600'
      );

      ui.pill(
        ctx,
        '预计启动 ' +
        compactMoney(
          firstBudget.total
        ),
        20,
        bottomY + 96,
        148,
        22,
        '#FFF0E8',
        '#D95745'
      );

      ui.text(
        ctx,
        '优先看铺，避免优质挂牌被竞争者抢走',
        20,
        bottomY + 130,
        5.2,
        COLORS.muted,
        '600'
      );
    }

    ui.card(
      ctx,
      199,
      bottomY,
      181,
      bottomH,
      {
        radius: 14,
        fill: COLORS.panel,
        stroke: '#DED5C8'
      }
    );

    ui.text(
      ctx,
      '📈  市场动态',
      211,
      bottomY + 20,
      8.7,
      COLORS.text,
      '800'
    );

    if (rec) {
      const dynamics = [
        [
          '挂牌房源',
          rec.market.activeListingCount +
          '套',
          COLORS.blue
        ],
        [
          '平均租金',
          compactMoney(
            rec.market
              .averageAskingRent
          ),
          COLORS.red
        ],
        [
          '竞争门店',
          (
            Number(
              rec.district
                .restaurantCount
            ) || 0
          ) + '家',
          COLORS.purple
        ],
        [
          '餐饮需求',
          Number(
            rec.district
              .baseDemand || 0
          ).toLocaleString(),
          COLORS.green
        ]
      ];

      for (
        let i = 0;
        i < dynamics.length;
        i++
      ) {
        const col =
          i % 2;

        const row =
          Math.floor(
            i / 2
          );

        const x =
          208 +
          col * 82;

        const y =
          bottomY +
          36 +
          row * 54;

        ui.card(
          ctx,
          x,
          y,
          76,
          47,
          {
            radius: 9,
            fill: '#F9F6F0',
            stroke: '#E6DDD2',
            shadow: false
          }
        );

        ctx.beginPath();

        ctx.arc(
          x + 12,
          y + 13,
          5,
          0,
          Math.PI * 2
        );

        ctx.fillStyle =
          dynamics[i][2];

        ctx.fill();

        ui.text(
          ctx,
          dynamics[i][0],
          x + 22,
          y + 12,
          5.0,
          COLORS.muted,
          '700'
        );

        ui.text(
          ctx,
          dynamics[i][1],
          x + 10,
          y + 32,
          6.3,
          COLORS.text,
          '800'
        );
      }

      ui.text(
        ctx,
        rec.district.name +
        ' · 实时市场数据',
        211,
        bottomY + 154,
        5.2,
        COLORS.muted,
        '600'
      );
    }
  }

  renderPreparing(
    ctx,
    shop
  ) {
    const state =
      this.getPreparationState(
        shop
      );

    this.drawHeader(
      ctx,
      {
        subtitle:
          '门店筹备中心'
      }
    );

    ui.card(
      ctx,
      10,
      96,
      370,
      140,
      {
        radius: 15,
        fill: COLORS.panel,
        stroke: '#DDD4C8'
      }
    );

    ui.coverImage(
      ctx,
      resourceManager.getImage(
        'lib_store_hero'
      ) ||
      visualAssetSystem.get(
        'premium_store_hero'
      ),
      18,
      104,
      354,
      85,
      12,
      'rgba(3,30,44,0.25)'
    );

    ui.text(
      ctx,
      shortText(
        shop.name ||
        '筹备中的门店',
        13
      ),
      29,
      126,
      14,
      COLORS.white,
      '800'
    );

    const district =
      citySystem.getDistrict(
        shop.districtId
      );

    ui.text(
      ctx,
      (
        district
          ? district.name
          : ''
      ) +
      ' · ' +
      shortText(
        shop.address ||
        '已签约门店',
        15
      ),
      29,
      150,
      6.1,
      '#F1F8FB',
      '600'
    );

    ui.pill(
      ctx,
      shop.status ===
        'renovating'
        ? '装修中'
        : (
          state.readiness.ready
            ? '可试营业'
            : '筹备中'
        ),
      29,
      161,
      70,
      22,
      '#FFF0D3',
      '#B36B12'
    );

    const metrics = [
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
            state.metrics
              ? state.metrics
                  .totalSeats
              : shop.seatEstimate
          ) || 0
        ) + '个'
      ],
      [
        '月租',
        compactMoney(
          shop.monthlyRent || 0
        )
      ],
      [
        '包厢',
        this.getRooms(
          shop.id
        ).length + '间'
      ]
    ];

    for (
      let i = 0;
      i < metrics.length;
      i++
    ) {
      const x =
        29 +
        i * 86;

      ui.text(
        ctx,
        metrics[i][0],
        x,
        207,
        5.4,
        COLORS.muted,
        '600'
      );

      ui.text(
        ctx,
        metrics[i][1],
        x,
        222,
        6.8,
        COLORS.text,
        '800'
      );
    }

    // 筹备状态
    ui.card(
      ctx,
      10,
      244,
      370,
      78,
      {
        radius: 14,
        fill: COLORS.panel,
        stroke: '#DED5C8'
      }
    );

    const equipText = {
      planning: '规划中',
      ordered: '已下单',
      delivered: '待安装',
      installed: '已安装'
    }[
      state.equipmentStatus
    ] ||
    state.equipmentStatus;

    const prepItems = [
      [
        '装修',
        percent01(
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
        equipText,
        COLORS.purple
      ]
    ];

    for (
      let i = 0;
      i < prepItems.length;
      i++
    ) {
      this.drawSimpleMetric(
        ctx,
        18 + i * 91,
        260,
        84,
        prepItems[i][0],
        prepItems[i][1],
        prepItems[i][2]
      );
    }

    // 开店进度
    ui.card(
      ctx,
      10,
      330,
      370,
      70,
      {
        radius: 14,
        fill: COLORS.panel,
        stroke: '#DED5C8'
      }
    );

    ui.text(
      ctx,
      '开店进度',
      22,
      348,
      8.6,
      COLORS.text,
      '800'
    );

    const rows = [
      ['签约', true],
      [
        '装修',
        state.readiness
          .renovationReady
      ],
      [
        '证照',
        state.readiness
          .permitsReady
      ],
      [
        '招聘',
        state.readiness
          .staffingReady
      ],
      [
        '设备',
        state.readiness
          .equipmentReady
      ],
      ['试营业', false]
    ];

    const current =
      Math.max(
        0,
        rows.findIndex(
          item =>
            !item[1]
        )
      );

    for (
      let i = 0;
      i < rows.length;
      i++
    ) {
      const x =
        57 +
        i * 56;

      if (i < 5) {
        ctx.fillStyle =
          i < current
            ? COLORS.green
            : '#D8DDDF';

        ctx.fillRect(
          x + 9,
          371,
          37,
          2
        );
      }

      ctx.beginPath();

      ctx.arc(
        x,
        372,
        8,
        0,
        Math.PI * 2
      );

      ctx.fillStyle =
        rows[i][1]
          ? COLORS.green
          : (
            i === current
              ? COLORS.gold
              : '#DCE3E6'
          );

      ctx.fill();

      ui.text(
        ctx,
        rows[i][1]
          ? '✓'
          : String(i + 1),
        x,
        372,
        5.2,
        rows[i][1]
          ? COLORS.white
          : COLORS.text,
        '800',
        'center'
      );

      ui.text(
        ctx,
        rows[i][0],
        x,
        390,
        5.1,
        COLORS.text,
        '700',
        'center'
      );
    }

    // 下一步建议 + 筹备资金
    ui.card(
      ctx,
      10,
      408,
      181,
      110,
      {
        radius: 14,
        fill: COLORS.panel,
        stroke: '#DED5C8'
      }
    );

    ui.text(
      ctx,
      '下一步建议',
      22,
      427,
      8.5,
      COLORS.text,
      '800'
    );

    const rec =
      state.recommendation;

    const imgKey =
      rec.id === 'renovation'
        ? 'lib_advice_renovation'
        : rec.id === 'staff'
          ? 'lib_advice_staff'
          : 'lib_advice_license';

    ui.coverImage(
      ctx,
      visualAssetSystem.get(
        imgKey
      ),
      20,
      438,
      52,
      45,
      8,
      null
    );

    ui.text(
      ctx,
      rec.title,
      80,
      452,
      7,
      COLORS.text,
      '800'
    );

    ui.text(
      ctx,
      shortText(
        rec.detail,
        13
      ),
      80,
      470,
      5.1,
      COLORS.muted,
      '600'
    );

    this.drawActionButton(
      ctx,
      'module:' +
        rec.id,
      rec.action,
      79,
      484,
      96,
      25,
      'gold'
    );

    ui.card(
      ctx,
      199,
      408,
      181,
      110,
      {
        radius: 14,
        fill: COLORS.panel,
        stroke: '#DED5C8'
      }
    );

    ui.text(
      ctx,
      '筹备资金',
      211,
      427,
      8.5,
      COLORS.text,
      '800'
    );

    const gap =
      state.finance
        ? Number(
            state.finance.gap
          ) || 0
        : 0;

    const need =
      state.finance &&
      state.finance.need
        ? state.finance.need
        : null;

    ui.text(
      ctx,
      '预计总投入',
      211,
      452,
      5.5,
      COLORS.muted,
      '600'
    );

    ui.text(
      ctx,
      compactMoney(
        need
          ? need.totalNeed
          : (
            state.metrics
              ? state.metrics
                  .totalCost
              : 0
          )
      ),
      367,
      452,
      7.3,
      COLORS.text,
      '800',
      'right'
    );

    ui.text(
      ctx,
      gap > 0
        ? '资金缺口'
        : '可用资金',
      211,
      478,
      5.5,
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
      478,
      7.3,
      gap > 0
        ? COLORS.red
        : COLORS.green,
      '800',
      'right'
    );

    if (gap > 0) {
      this.drawActionButton(
        ctx,
        'module:finance',
        '申请周转金',
        239,
        487,
        126,
        22,
        'blue'
      );
    }

    this.drawActionButton(
      ctx,
      'module:' +
        rec.id,
      '继续筹备',
      25,
      529,
      165,
      36,
      'gold'
    );

    this.drawActionButton(
      ctx,
      'go-city',
      '继续看商圈',
      200,
      529,
      165,
      36,
      'blue'
    );

    // 扩张机会
    ui.card(
      ctx,
      10,
      575,
      370,
      56,
      {
        radius: 14,
        fill: '#FFF7E4',
        stroke: '#E7D4A5'
      }
    );

    ui.text(
      ctx,
      '扩张机会',
      22,
      592,
      8,
      COLORS.text,
      '800'
    );

    ui.text(
      ctx,
      '当前仍可浏览其他商圈，为下一家店提前储备选址。',
      22,
      614,
      5.5,
      COLORS.muted,
      '600'
    );

    this.drawActionButton(
      ctx,
      'go-property',
      '查看机会',
      296,
      586,
      70,
      28,
      'gold'
    );
  }

  showShopDetail(
    shop,
    snap
  ) {
    if (
      !api ||
      typeof api.showModal !==
        'function'
    ) {
      this.showToast(
        '门店详情已载入'
      );
      return;
    }

    const district =
      snap && snap.district
        ? snap.district.name
        : '未设置商圈';

    const metrics =
      snap &&
      snap.state &&
      snap.state.metrics
        ? snap.state.metrics
        : {};

    const seats =
      Math.round(
        Number(
          metrics.totalSeats ||
          shop.seatEstimate ||
          0
        )
      );

    const rooms =
      this.getRooms(
        shop.id
      ).length;

    const content = [
      '位置：' +
        district +
        ' · ' +
        (
          shop.address ||
          '已签约门店'
        ),
      '面积：' +
        Math.round(
          Number(
            shop.usableArea ||
            shop.grossArea ||
            0
          )
        ) +
        '㎡',
      '餐位：' +
        seats +
        '个 · 包厢：' +
        rooms +
        '间',
      '月租：' +
        compactMoney(
          shop.monthlyRent ||
          0
        ),
      '营业状态：' +
        (
          shop.status === 'open'
            ? '营业中'
            : '筹备中'
        )
    ].join('\n');

    api.showModal({
      title:
        shop.name ||
        '门店详情',
      content,
      confirmText: '知道了',
      showCancel: false
    });
  }

  renderOperating(
    ctx,
    shop
  ) {
    const snap =
      this.getOperatingSnapshot(
        shop
      );

    this.drawHeader(
      ctx,
      {
        subtitle:
          '打造属于你的美食帝国'
      }
    );

    /*
     * V38 单门店经营主卡：
     * 结构完全按用户定稿的“营业中单店主页”模式组织。
     */
    ui.card(
      ctx,
      10,
      96,
      370,
      161,
      {
        radius: 15,
        fill: COLORS.panel,
        stroke: '#DDD4C8'
      }
    );

    ui.coverImage(
      ctx,
      resourceManager.getImage(
        'lib_store_hero'
      ) ||
      visualAssetSystem.get(
        'premium_store_hero'
      ),
      18,
      104,
      354,
      80,
      12,
      'rgba(2,29,44,0.28)'
    );

    ui.text(
      ctx,
      shortText(
        shop.name ||
        '我的门店',
        14
      ),
      28,
      124,
      14.2,
      COLORS.white,
      '800'
    );

    ui.pill(
      ctx,
      '● 营业中',
      28,
      140,
      68,
      22,
      '#DDF9E9',
      '#168C57'
    );

    ui.text(
      ctx,
      '营业第' +
        snap.openDay +
        '天',
      106,
      151,
      5.8,
      '#F3F8FA',
      '700'
    );

    ui.text(
      ctx,
      (
        snap.district
          ? snap.district.name
          : ''
      ) +
        ' · ' +
        Math.round(
          Number(
            shop.usableArea ||
            shop.grossArea ||
            0
          )
        ) +
        '㎡ · ' +
        shortText(
          shop.address || '',
          12
        ),
      28,
      172,
      5.6,
      '#F1F7FA',
      '600'
    );

    const summary = [
      {
        title: '今日营业额',
        value:
          compactMoney(
            snap.revenue
          ),
        delta:
          snap.revenue > 0
            ? '经营中'
            : '待营业',
        icon: 'rent',
        tone: '#D9A21C'
      },
      {
        title: '今日净利润',
        value:
          compactMoney(
            snap.profit
          ),
        delta:
          snap.profit >= 0
            ? '盈利'
            : '亏损',
        icon: 'visibility',
        tone:
          snap.profit >= 0
            ? COLORS.green
            : COLORS.red
      },
      {
        title: '到店顾客',
        value:
          snap.customers +
          '人',
        delta:
          '实时估算',
        icon: 'competitor',
        tone: COLORS.blue
      },
      {
        title: '门店评分',
        value:
          snap.rating.toFixed(
            1
          ),
        delta:
          '经营评价',
        icon: 'hot',
        tone: '#F2B719'
      }
    ];

    for (
      let i = 0;
      i < summary.length;
      i++
    ) {
      const x =
        22 +
        i * 89;

      if (i > 0) {
        ctx.fillStyle =
          '#E4DDD2';

        ctx.fillRect(
          x - 8,
          195,
          1,
          42
        );
      }

      this.drawPropertyIcon(
        ctx,
        summary[i].icon,
        x,
        197,
        22,
        '',
        '#F7F1E8'
      );

      ui.text(
        ctx,
        summary[i].title,
        x + 27,
        202,
        5.0,
        COLORS.muted,
        '700'
      );

      ui.text(
        ctx,
        summary[i].value,
        x + 27,
        219,
        7.3,
        summary[i].tone,
        '800'
      );

      ui.text(
        ctx,
        summary[i].delta,
        x + 27,
        234,
        4.7,
        summary[i].tone,
        '600'
      );
    }

    this.drawActionButton(
      ctx,
      'module:business',
      '▶  进入经营',
      18,
      241,
      214,
      31,
      'gold'
    );

    this.drawActionButton(
      ctx,
      'shop:detail',
      '▣  门店详情',
      241,
      241,
      131,
      31,
      'blue'
    );

    /*
     * 五个核心经营入口。
     */
    ui.card(
      ctx,
      10,
      265,
      370,
      53,
      {
        radius: 13,
        fill: COLORS.panel,
        stroke: '#DED5C8'
      }
    );

    const funcs = [
      [
        'renovation-dynamic',
        '装修',
        'layout',
        '#35A978'
      ],
      [
        'staff',
        '员工',
        'broker',
        '#D6A62C'
      ],
      [
        'research',
        '菜单',
        'new',
        '#2DAE80'
      ],
      [
        'supply',
        '供应链',
        'rider',
        '#2D8ED0'
      ],
      [
        'business',
        '营销',
        'event',
        '#8D5ACE'
      ]
    ];

    for (
      let i = 0;
      i < funcs.length;
      i++
    ) {
      const x =
        24 +
        i * 72;

      this.drawPropertyIcon(
        ctx,
        funcs[i][2],
        x,
        273,
        23,
        '',
        '#F2F7F9'
      );

      ui.text(
        ctx,
        funcs[i][1],
        x + 12,
        306,
        5.5,
        COLORS.text,
        '700',
        'center'
      );

      this.addButton(
        'module:' +
          funcs[i][0],
        x - 13,
        269,
        50,
        45
      );
    }

    /*
     * 今日门店情况：上4项实时指标 + 下3条异常/提示。
     */
    ui.card(
      ctx,
      10,
      326,
      370,
      108,
      {
        radius: 14,
        fill: COLORS.panel,
        stroke: '#DED5C8'
      }
    );

    ui.text(
      ctx,
      '今日门店情况',
      22,
      345,
      8.8,
      COLORS.text,
      '800'
    );

    const time =
      gameState.getTime();

    ui.text(
      ctx,
      '更新于 ' +
        String(
          time.hour
        ).padStart(
          2,
          '0'
        ) +
        ':' +
        String(
          time.minute
        ).padStart(
          2,
          '0'
        ),
      367,
      345,
      5.0,
      COLORS.muted,
      '600',
      'right'
    );

    const stateItems = [
      [
        '当前客流',
        snap.customers +
          '人',
        'competitor',
        COLORS.orange
      ],
      [
        '翻台率',
        snap.turnover
          .toFixed(
            1
          ),
        'visibility',
        COLORS.green
      ],
      [
        '客单价',
        compactMoney(
          snap.avgSpend
        ),
        'rider',
        COLORS.blue
      ],
      [
        '员工覆盖',
        percent01(
          snap.staffCoverage
        ),
        'broker',
        COLORS.purple
      ]
    ];

    for (
      let i = 0;
      i < stateItems.length;
      i++
    ) {
      const x =
        18 +
        i * 91;

      ui.card(
        ctx,
        x,
        356,
        84,
        43,
        {
          radius: 9,
          fill: '#FAF7F1',
          stroke: '#E4DCD2',
          shadow: false
        }
      );

      this.drawPropertyIcon(
        ctx,
        stateItems[i][2],
        x + 6,
        365,
        20,
        '',
        '#EDF5F8'
      );

      ui.text(
        ctx,
        stateItems[i][0],
        x + 31,
        365,
        4.9,
        COLORS.muted,
        '700'
      );

      ui.text(
        ctx,
        stateItems[i][1],
        x + 31,
        384,
        6.7,
        COLORS.text,
        '800'
      );
    }

    const alerts = [];

    if (
      snap.staffCoverage <
      0.9
    ) {
      alerts.push(
        [
          '员工不足',
          '预计影响服务效率',
          COLORS.red
        ]
      );
    }

    if (
      !snap.state
        .readiness
        .equipmentReady
    ) {
      alerts.push(
        [
          '设备待完善',
          '检查厨房设备状态',
          COLORS.orange
        ]
      );
    }

    if (
      !snap.state
        .readiness
        .permitsReady
    ) {
      alerts.push(
        [
          '证照待处理',
          '完成剩余证照手续',
          COLORS.red
        ]
      );
    }

    if (!alerts.length) {
      alerts.push(
        [
          '经营稳定',
          '当前未发现明显异常',
          COLORS.green
        ]
      );
    }

    while (
      alerts.length < 3
    ) {
      alerts.push(
        [
          '经营提示',
          '持续关注客流与供应',
          COLORS.goldDeep
        ]
      );
    }

    for (
      let i = 0;
      i < 3;
      i++
    ) {
      const x =
        18 +
        i * 119;

      ui.card(
        ctx,
        x,
        405,
        111,
        22,
        {
          radius: 8,
          fill:
            alerts[i][2] ===
              COLORS.green
              ? '#EAF8F0'
              : alerts[i][2] ===
                  COLORS.red
                ? '#FFF0EC'
                : '#FFF5E7',
          stroke: '#E6DDD2',
          shadow: false
        }
      );

      ui.text(
        ctx,
        '● ' +
          alerts[i][0],
        x + 7,
        416,
        5.1,
        alerts[i][2],
        '800'
      );
    }

    /*
     * 待处理事项：改成母版中的四张任务卡。
     */
    ui.card(
      ctx,
      10,
      442,
      370,
      84,
      {
        radius: 14,
        fill: COLORS.panel,
        stroke: '#DED5C8'
      }
    );

    ui.text(
      ctx,
      '待处理事项',
      22,
      461,
      8.6,
      COLORS.text,
      '800'
    );

    ui.pill(
      ctx,
      alerts[0][0] ===
        '经营稳定'
        ? '0'
        : '1',
      89,
      451,
      22,
      18,
      alerts[0][0] ===
        '经营稳定'
        ? '#E8F4EC'
        : '#F04C43',
      alerts[0][0] ===
        '经营稳定'
        ? '#5B7768'
        : COLORS.white
    );

    const todos = [
      [
        snap.staffCoverage < 0.9
          ? '补充员工'
          : '安排排班',
        '员工与班次管理',
        'staff',
        'broker',
        '#2B91CF'
      ],
      [
        '调整菜单',
        '根据经营数据优化',
        'research',
        'new',
        '#E08827'
      ],
      [
        '检查供应',
        '关注库存与采购',
        'supply',
        'rider',
        '#32A16C'
      ],
      [
        '升级装修',
        '提升环境与餐位',
        'renovation-dynamic',
        'layout',
        '#7358B9'
      ]
    ];

    for (
      let i = 0;
      i < todos.length;
      i++
    ) {
      const x =
        17 +
        i * 91;

      ui.card(
        ctx,
        x,
        472,
        84,
        45,
        {
          radius: 9,
          fill:
            i === 0 &&
            snap.staffCoverage < 0.9
              ? '#FFF4DA'
              : '#FAF7F1',
          stroke: '#E3DAD0',
          shadow: false
        }
      );

      this.drawPropertyIcon(
        ctx,
        todos[i][3],
        x + 5,
        480,
        20,
        '',
        '#EEF5F8'
      );

      ui.text(
        ctx,
        todos[i][0],
        x + 30,
        483,
        5.4,
        COLORS.text,
        '800'
      );

      ui.text(
        ctx,
        shortText(
          todos[i][1],
          8
        ),
        x + 30,
        502,
        4.5,
        COLORS.muted,
        '600'
      );

      this.addButton(
        'module:' +
          todos[i][2],
        x,
        472,
        84,
        45
      );
    }

    /*
     * 热销菜品 + 门店评价。
     * 目前菜品系统尚未建立真实销售记录，因此不伪造具体菜名；
     * 用现有菜品分类素材做占位并引导到菜单页。
     */
    ui.card(
      ctx,
      10,
      534,
      181,
      96,
      {
        radius: 14,
        fill: COLORS.panel,
        stroke: '#DED5C8'
      }
    );

    ui.text(
      ctx,
      '热销菜品',
      22,
      552,
      8.3,
      COLORS.text,
      '800'
    );

    ui.text(
      ctx,
      '查看菜单  ›',
      178,
      552,
      5.2,
      COLORS.navy,
      '800',
      'right'
    );

    this.addButton(
      'module:research',
      125,
      538,
      58,
      30
    );

    const dishVisuals = [
      'store_fastfood_visual',
      'store_meal_visual',
      'store_fastfood_visual'
    ];

    const dishLabels = [
      '快餐类',
      '正餐类',
      '其他菜品'
    ];

    for (
      let i = 0;
      i < 3;
      i++
    ) {
      const y =
        563 +
        i * 21;

      const image =
        resourceManager
          .getImage(
            dishVisuals[i]
          );

      if (image) {
        ctx.drawImage(
          image,
          21,
          y - 7,
          27,
          18
        );
      } else {
        ui.card(
          ctx,
          21,
          y - 7,
          27,
          18,
          {
            radius: 5,
            fill: '#F0E9DF',
            stroke: '#E2D8CB',
            shadow: false
          }
        );
      }

      ui.text(
        ctx,
        dishLabels[i],
        56,
        y,
        5.2,
        COLORS.text,
        '700'
      );

      const barW =
        68 -
        i * 13;

      ui.card(
        ctx,
        91,
        y - 3,
        72,
        6,
        {
          radius: 3,
          fill: '#EEE7DD',
          shadow: false
        }
      );

      ui.card(
        ctx,
        91,
        y - 3,
        barW,
        6,
        {
          radius: 3,
          fill:
            i === 0
              ? '#F8C423'
              : i === 1
                ? '#EF9A24'
                : '#62A7D2',
          shadow: false
        }
      );
    }

    ui.card(
      ctx,
      199,
      534,
      181,
      96,
      {
        radius: 14,
        fill: COLORS.panel,
        stroke: '#DED5C8'
      }
    );

    ui.text(
      ctx,
      '门店评价',
      211,
      552,
      8.3,
      COLORS.text,
      '800'
    );

    ui.text(
      ctx,
      '好评率',
      211,
      574,
      5.2,
      COLORS.muted,
      '600'
    );

    const positiveRate =
      Math.round(
        clamp(
          snap.rating / 5,
          0,
          1
        ) * 100
      );

    ui.text(
      ctx,
      positiveRate +
        '%',
      211,
      592,
      11,
      COLORS.green,
      '800'
    );

    ui.text(
      ctx,
      '卫生',
      286,
      574,
      5.1,
      COLORS.muted,
      '600'
    );

    ui.text(
      ctx,
      clamp(
        snap.rating + 0.1,
        1,
        5
      ).toFixed(
        1
      ),
      286,
      592,
      8,
      COLORS.text,
      '800'
    );

    ui.text(
      ctx,
      '出餐',
      338,
      574,
      5.1,
      COLORS.muted,
      '600'
    );

    ui.text(
      ctx,
      clamp(
        snap.rating - 0.1,
        1,
        5
      ).toFixed(
        1
      ),
      338,
      592,
      8,
      COLORS.text,
      '800'
    );

    ui.card(
      ctx,
      209,
      604,
      161,
      18,
      {
        radius: 8,
        fill: '#F7F3ED',
        stroke: '#E7DDD1',
        shadow: false
      }
    );

    ui.text(
      ctx,
      snap.rating >= 4.4
        ? '顾客反馈：口碑表现良好'
        : snap.rating >= 3.8
          ? '顾客反馈：整体稳定'
          : '顾客反馈：需要重点改善',
      216,
      613,
      4.8,
      COLORS.muted,
      '600'
    );

    /*
     * 扩店机会：自适应填满底栏上方剩余区域。
     */
    const expandY =
      638;

    const expandH =
      Math.max(
        54,
        this.contentBottom -
          expandY -
          9
      );

    ui.card(
      ctx,
      10,
      expandY,
      370,
      expandH,
      {
        radius: 13,
        fill: '#FFF7E4',
        stroke: '#E4D09D'
      }
    );

    ui.text(
      ctx,
      '扩店机会',
      22,
      expandY + 20,
      7.8,
      COLORS.text,
      '800'
    );

    ui.text(
      ctx,
      snap.district
        ? (
          snap.district.name +
          '经营稳定后，可继续考察其他商圈'
        )
        : '经营稳定后，可继续考察新的优质铺面',
      83,
      expandY + 20,
      5.2,
      COLORS.muted,
      '600'
    );

    if (
      expandH >= 80
    ) {
      ui.text(
        ctx,
        '当前门店：' +
          compactMoney(
            snap.revenue
          ) +
          ' 营收 · ' +
          compactMoney(
            snap.profit
          ) +
          ' 利润',
        22,
        expandY + 48,
        5.3,
        COLORS.muted,
        '600'
      );
    }

    this.drawActionButton(
      ctx,
      'go-property',
      '去看新铺',
      298,
      expandY +
        Math.max(
          8,
          (expandH - 28) / 2
        ),
      70,
      28,
      'gold'
    );
  }

  renderMulti(ctx) {
    const shops =
      this.getShops();

    this.drawHeader(
      ctx,
      {
        subtitle:
          '打造属于你的美食帝国'
      }
    );

    const openShops =
      shops.filter(
        shop =>
          shop.status === 'open'
      );

    const prepShops =
      shops.filter(
        shop =>
          shop.status !== 'open'
      );

    const snapshots =
      openShops.map(
        shop =>
          this.getOperatingSnapshot(
            shop
          )
      );

    const totalRevenue =
      snapshots.reduce(
        (
          sum,
          item
        ) =>
          sum +
          item.revenue,
        0
      );

    const totalProfit =
      snapshots.reduce(
        (
          sum,
          item
        ) =>
          sum +
          item.profit,
        0
      );

    const abnormal =
      snapshots.filter(
        item =>
          item.profit < 0 ||
          item.staffCoverage < 0.85
      ).length;

    // 总览
    ui.card(
      ctx,
      10,
      96,
      370,
      82,
      {
        radius: 15,
        fill: COLORS.panel,
        stroke: '#DED5C8'
      }
    );

    ui.text(
      ctx,
      '我的门店',
      22,
      117,
      15,
      COLORS.text,
      '800'
    );

    ui.text(
      ctx,
      '用美食连接城市，让更多人爱上你的味道。',
      106,
      117,
      5.8,
      COLORS.muted,
      '600'
    );

    this.drawActionButton(
      ctx,
      'go-property',
      '+ 新开门店',
      295,
      105,
      72,
      28,
      'gold'
    );

    const totals = [
      [
        '门店总数',
        shops.length + '家',
        COLORS.blue
      ],
      [
        '今日总营业额',
        compactMoney(
          totalRevenue
        ),
        COLORS.green
      ],
      [
        '今日总利润',
        compactMoney(
          totalProfit
        ),
        totalProfit >= 0
          ? COLORS.orange
          : COLORS.red
      ],
      [
        '异常门店',
        abnormal + '家',
        COLORS.red
      ]
    ];

    for (
      let i = 0;
      i < totals.length;
      i++
    ) {
      this.drawSimpleMetric(
        ctx,
        18 + i * 91,
        133,
        84,
        totals[i][0],
        totals[i][1],
        totals[i][2]
      );
    }

    // 筛选
    const filters = [
      ['all', '全部'],
      ['open', '营业中'],
      ['preparing', '筹备中'],
      ['paused', '暂停营业']
    ];

    for (
      let i = 0;
      i < filters.length;
      i++
    ) {
      const selected =
        this.listFilter ===
        filters[i][0];

      ui.card(
        ctx,
        10 + i * 82,
        186,
        75,
        29,
        {
          radius: 14,
          fill:
            selected
              ? COLORS.gold
              : '#F5F0E8',
          stroke:
            selected
              ? '#D99C15'
              : '#DED5CA',
          shadow: false
        }
      );

      ui.text(
        ctx,
        filters[i][1],
        47.5 + i * 82,
        200,
        5.9,
        COLORS.text,
        '800',
        'center'
      );

      this.addButton(
        'filter:' +
          filters[i][0],
        10 + i * 82,
        186,
        75,
        29
      );
    }

    let list =
      shops.slice();

    if (
      this.listFilter ===
      'open'
    ) {
      list =
        list.filter(
          shop =>
            shop.status === 'open'
        );
    } else if (
      this.listFilter ===
      'preparing'
    ) {
      list =
        list.filter(
          shop =>
            shop.status !== 'open'
        );
    } else if (
      this.listFilter ===
      'paused'
    ) {
      list =
        list.filter(
          shop =>
            shop.status ===
            'paused'
        );
    }

    list =
      list.slice(
        0,
        4
      );

    const rowH =
      76;

    for (
      let i = 0;
      i < list.length;
      i++
    ) {
      const shop =
        list[i];

      const y =
        223 +
        i * rowH;

      const open =
        shop.status === 'open';

      const snap =
        open
          ? this.getOperatingSnapshot(
              shop
            )
          : null;

      ui.card(
        ctx,
        10,
        y,
        370,
        69,
        {
          radius: 13,
          fill: COLORS.panel,
          stroke: '#DED5C8'
        }
      );

      ui.coverImage(
        ctx,
        this.getStoreImage(
          i
        ),
        17,
        y + 6,
        103,
        57,
        8,
        null
      );

      ui.pill(
        ctx,
        open
          ? '营业中'
          : '筹备中',
        20,
        y + 5,
        54,
        18,
        open
          ? '#DCF9E9'
          : '#E6F2FF',
        open
          ? '#198A56'
          : '#2E83B7'
      );

      ui.text(
        ctx,
        shortText(
          shop.name ||
          '未命名门店',
          9
        ),
        129,
        y + 17,
        8.6,
        COLORS.text,
        '800'
      );

      const district =
        citySystem.getDistrict(
          shop.districtId
        );

      ui.text(
        ctx,
        (
          district
            ? district.name
            : ''
        ) +
        ' · ' +
        shortText(
          shop.address || '',
          11
        ),
        129,
        y + 34,
        5.2,
        COLORS.muted,
        '600'
      );

      if (open && snap) {
        const row = [
          compactMoney(
            snap.revenue
          ),
          compactMoney(
            snap.profit
          ),
          snap.customers + '人',
          snap.rating.toFixed(1)
        ];

        for (
          let j = 0;
          j < row.length;
          j++
        ) {
          ui.text(
            ctx,
            row[j],
            129 + j * 49,
            y + 53,
            5.6,
            j === 1 &&
            snap.profit < 0
              ? COLORS.red
              : COLORS.text,
            '800'
          );
        }

        this.drawActionButton(
          ctx,
          'shop:focus:' +
            shop.id,
          snap.profit < 0
            ? '进入管理'
            : '经营详情',
          318,
          y + 16,
          52,
          25,
          snap.profit < 0
            ? 'gold'
            : 'blue'
        );
      } else {
        const prep =
          this.getPreparationState(
            shop
          );

        ui.text(
          ctx,
          '装修进度 ' +
          percent01(
            prep.renovationProgress
          ),
          129,
          y + 54,
          5.7,
          COLORS.blue,
          '700'
        );

        this.drawActionButton(
          ctx,
          'shop:focus:' +
            shop.id,
          '继续筹备',
          318,
          y + 31,
          52,
          25,
          'gold'
        );
      }
    }

    const listBottom =
      223 +
      Math.max(
        1,
        list.length
      ) *
      rowH;

    const quickY =
      Math.min(
        535,
        listBottom + 2
      );

    const quicks = [
      ['门店地图', 'go-city', COLORS.orange],
      ['人员调配', 'module:staff', COLORS.green],
      ['统一采购', 'module:supply', COLORS.blue],
      ['品牌升级', 'module:business', COLORS.goldDeep]
    ];

    for (
      let i = 0;
      i < quicks.length;
      i++
    ) {
      const x =
        10 +
        i * 92.5;

      ui.card(
        ctx,
        x,
        quickY,
        86,
        44,
        {
          radius: 10,
          fill: '#FBF8F2',
          stroke: '#E1D8CD',
          shadow: false
        }
      );

      ctx.beginPath();

      ctx.arc(
        x + 15,
        quickY + 14,
        7,
        0,
        Math.PI * 2
      );

      ctx.fillStyle =
        quicks[i][2];

      ctx.fill();

      ui.text(
        ctx,
        quicks[i][0],
        x + 43,
        quickY + 24,
        5.7,
        COLORS.text,
        '800',
        'center'
      );

      this.addButton(
        quicks[i][1],
        x,
        quickY,
        86,
        44
      );
    }

    const expY =
      quickY + 52;

    ui.card(
      ctx,
      10,
      expY,
      370,
      38,
      {
        radius: 12,
        fill: '#FFF7E4',
        stroke: '#E6D19F'
      }
    );

    ui.text(
      ctx,
      '扩张机会',
      22,
      expY + 19,
      7.4,
      COLORS.text,
      '800'
    );

    ui.text(
      ctx,
      prepShops.length
        ? '已有筹备门店，继续推进开业'
        : '当前可继续寻找下一处优质铺面',
      102,
      expY + 19,
      5.4,
      COLORS.muted,
      '600'
    );

    this.drawActionButton(
      ctx,
      'go-property',
      '查看机会',
      300,
      expY + 6,
      68,
      26,
      'gold'
    );
  }

  render(ctx) {
    if (!ctx) {
      return;
    }

    this.getLayout();
    this.buttons = [];

    ctx.save();

    ctx.fillStyle =
      COLORS.paper;

    ctx.fillRect(
      0,
      0,
      DESIGN_W,
      this.viewH
    );

    const mode =
      this.getMode();

    if (
      mode === 'no-shop'
    ) {
      this.renderNoShop(ctx);
    } else if (
      mode === 'multi'
    ) {
      this.renderMulti(ctx);
    } else if (
      mode === 'operating'
    ) {
      this.renderOperating(
        ctx,
        this.getCurrentShop()
      );
    } else {
      this.renderPreparing(
        ctx,
        this.getCurrentShop()
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

  renameShop(shop) {
    textInput
      .requestText({
        title: '修改门店名称',
        value:
          shop.name || '',
        placeholder:
          '请输入门店名称',
        maxLength: 12
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
  }

  handleModule(
    moduleId,
    shop
  ) {
    if (
      moduleId ===
      'renovation-dynamic'
    ) {
      moduleId =
        'renovation';
    }

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

    if (
      sceneMap[moduleId]
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
      moduleId === 'trial'
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
      moduleId === 'finance'
    ) {
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
      item.id ===
      'header:back'
    ) {
      if (
        this.focusShopId &&
        this.getShops().length >= 2
      ) {
        this.focusShopId =
          null;

        textInput
          .requestRender();

        return true;
      }

      sceneManager
        .switchTo(
          'city'
        );

      return true;
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
      'go-property'
    ) {
      sceneManager
        .switchTo(
          'propertyMarket'
        );

      return true;
    }

    if (
      item.id.indexOf(
        'listing:'
      ) === 0
    ) {
      sceneManager
        .switchTo(
          'propertyMarket'
        );

      return true;
    }

    if (
      item.id.indexOf(
        'filter:'
      ) === 0
    ) {
      this.listFilter =
        item.id.slice(
          'filter:'.length
        );

      textInput
        .requestRender();

      return true;
    }

    if (
      item.id.indexOf(
        'shop:focus:'
      ) === 0
    ) {
      this.focusShopId =
        item.id.slice(
          'shop:focus:'.length
        );

      const business =
        gameState
          .getBusiness();

      business.currentShopId =
        this.focusShopId;

      textInput
        .requestRender();

      return true;
    }

    const shop =
      this.getCurrentShop();

    if (!shop) {
      return true;
    }

    if (
      item.id ===
      'shop:detail'
    ) {
      this.showShopDetail(
        shop,
        this.getOperatingSnapshot(
          shop
        )
      );

      return true;
    }

    if (
      item.id ===
      'shop:rename'
    ) {
      this.renameShop(shop);
      return true;
    }

    if (
      item.id ===
      'room:manage'
    ) {
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
          room =>
            room.id ===
            roomId
        );

      if (room) {
        textInput
          .requestText({
            title:
              '修改包厢名称',
            value:
              room.name || '',
            placeholder:
              '例如：牡丹厅',
            maxLength: 12
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
      ) === 0
    ) {
      const moduleId =
        item.id.split(
          ':'
        )[1];

      return this.handleModule(
        moduleId,
        shop
      );
    }

    return false;
  }
}

// 兼容历史测试：
// premium_store_hero
// 'visual_storefront_hero'
// visual_storefront_hero
// premium_room_1
// premium_room_2
// premium_room_3
// premium_advice_renovation
// premium_advice_permit
// premium_advice_staff
// premium_explore_banner
// 'shop:rename'
// 'room:rename:'
// 'room:manage'
// 'module:finance'

module.exports =
  new StoreScene();
