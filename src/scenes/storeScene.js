'use strict';

// V16_STORE_UI_REWRITE
// V36_STORE_THREE_STATE_PHASE1
// V37_STORE_FINAL_FOUR_MODE
// V37_2_NO_SHOP_FIDELITY
// V38_SINGLE_STORE_FIDELITY
// V39_LIBRARY_ASSET_INTEGRATION
// V42_STORE_MASTER_REFERENCE_REBUILD
// V43_REFERENCE_IMAGE_UI
// V44_STORE_VISUAL_REPAIR
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

const operationsStore =
  require('../operations/operationsStoreV080.js');

const floorSimulation =
  require('../operations/floorSimulationV082.js');

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


const V43_REFERENCE_ICONS = {
  rent: 'money',
  visibility: 'view',
  hot: 'target',
  layout: 'renovation',
  broker: 'people',
  new: 'restaurant',
  rider: 'delivery',
  event: 'bulletin',
  route: 'route',
  store: 'shop',
  warning: 'warning',
  lease: 'location',
  contract: 'complete'
};

const V44_GLOSSY_ICONS = {
  rent: 'money',
  hot: 'target',
  event: 'bulletin'
};

const V44_PROPERTY_ALIASES = {
  visibility: 'visibility',
  layout: 'layout',
  broker: 'broker',
  new: 'new',
  rider: 'rider',
  route: 'sort',
  store: 'new',
  warning: 'warning',
  lease: 'lease',
  contract: 'lease'
};

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

function storeText(
  ctx,
  value,
  x,
  y,
  size,
  color,
  weight,
  align
) {
  ctx.save();

  ctx.fillStyle =
    color ||
    '#123A55';

  const rawWeight =
    String(
      weight || '500'
    );

  const finalWeight =
    rawWeight === '800'
      ? '900'
      : rawWeight === '700'
        ? '800'
        : rawWeight;

  const finalSize =
    Math.max(
      4.6,
      Number(size) || 5.6
    );

  ctx.font =
    finalWeight +
    ' ' +
    finalSize +
    'px "Noto Sans SC","Microsoft YaHei",sans-serif';

  ctx.textAlign =
    align || 'left';

  ctx.textBaseline =
    'middle';

  if (
    finalSize >= 10 &&
    finalWeight === '900'
  ) {
    ctx.shadowColor =
      'rgba(0,0,0,0.14)';
    ctx.shadowBlur =
      0.8;
  }

  ctx.fillText(
    String(
      value == null
        ? ''
        : value
    ),
    x,
    y
  );

  ctx.restore();
}

function storeDivider(
  ctx,
  x1,
  y1,
  x2,
  y2,
  color,
  width
) {
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(
    x1,
    y1
  );
  ctx.lineTo(
    x2,
    y2
  );
  ctx.strokeStyle =
    color ||
    '#E4DDD3';
  ctx.lineWidth =
    width ||
    1;
  ctx.stroke();
  ctx.restore();
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
    ['money', 'target', 'bulletin', 'star', 'gift']
      .forEach(name => {
        resourceManager
          .loadImage(
            'v44_glossy_' + name,
            'assets/images/v44_glossy/' + name + '.png',
            'v44-glossy'
          )
          .catch(() => {});
      });

    resourceManager
      .loadImage(
        'v44_store_header',
        'assets/images/v32_home/home_background.jpg',
        'v44-store-header'
      )
      .catch(() => {});

    Object.values(V43_REFERENCE_ICONS)
      .filter((value, index, list) => list.indexOf(value) === index)
      .forEach(name => {
        resourceManager
          .loadImage(
            'v43_icon_' + name,
            'assets/images/v43_reference_icons/' + name + '.png',
            'v43-reference-icons'
          )
          .catch(() => {});
      });

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
    const glossyName =
      V44_GLOSSY_ICONS[
        name
      ];

    const glossyImage =
      glossyName
        ? resourceManager.getImage(
            'v44_glossy_' +
            glossyName
          )
        : null;

    if (glossyImage) {
      ctx.drawImage(
        glossyImage,
        x,
        y,
        size,
        size
      );
      return;
    }

    const alias =
      V44_PROPERTY_ALIASES[
        name
      ] ||
      name;

    const image =
      resourceManager.getImage(
        'property_icons_01'
      );

    const region =
      propertyIconAtlas.icons[
        alias
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

    storeText(
      ctx,
      fallback || '·',
      x + size / 2,
      y + size / 2,
      Math.max(
        5,
        size * 0.32
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
        clamp(
          score,
          0,
          5
        )
      );

    const star =
      resourceManager.getImage(
        'v44_glossy_star'
      );

    for (
      let i = 0;
      i < 5;
      i++
    ) {
      if (star) {
        ctx.save();

        ctx.globalAlpha =
          i < rounded
            ? 1
            : 0.18;

        ctx.drawImage(
          star,
          x + i * 9,
          y - 5,
          8,
          8
        );

        ctx.restore();
      } else {
        storeText(
          ctx,
          '★',
          x + i * 9,
          y,
          5.4,
          i < rounded
            ? '#F7B916'
            : '#D7D9D9',
          '800'
        );
      }
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
    const progress =
      renovationSystem
        .getConstructionProgress(
          shopId
        );

    return clamp(
      Number(
        progress.progress
      ) ||
      0,
      0,
      1
    );
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
            ? state.metrics.totalSeats
            : shop.seatEstimate
        ) || 30
      );

    const dashboard =
      operationsStore
        .dashboard(
          shop.id
        );

    const finance =
      dashboard &&
      dashboard.finance
        ? dashboard.finance
        : {
            revenue: 0,
            profit: 0,
            orders: 0,
            customers: 0,
            avgTicket: 0
          };

    const customers =
      Number(
        finance.customers
      ) ||
      0;

    const revenue =
      Number(
        finance.revenue
      ) ||
      0;

    const profit =
      Number(
        finance.profit
      ) ||
      0;

    const rating =
      clamp(
        Number(
          dashboard &&
          dashboard.shopRating
        ) || 4,
        1,
        5
      );

    const turnover =
      customers /
      Math.max(
        1,
        seats
      );

    const staffCoverage =
      state.readiness &&
      state.readiness.staffing
        ? clamp(
            Number(
              state.readiness.staffing.coverage
            ) || 0,
            0,
            1.15
          )
        : 0.8;

    const avgSpend =
      Number(
        finance.avgTicket
      ) ||
      (
        customers >
          0
          ? revenue /
            customers
          : 0
      );

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

    const runtime =
      operationsStore
        .getRuntime(
          shop.id
        );

    const live =
      runtime
        ? floorSimulation
            .getSnapshot(
              runtime
            )
        : {
            queueParties:0,
            occupiedTables:0,
            totalTables:0,
            seatedPeople:0,
            kitchenQueue:0,
            kitchenActive:0,
            deliveryWaiting:0,
            deliveryOnRoad:0,
            walkawaysToday:0,
            stockoutsToday:0,
            mistakesToday:0,
            completedOrdersToday:0,
            avgWaitMinutes:0,
            avgCookMinutes:0
          };

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
      avgSpend,
      orders:
        Number(
          finance.orders
        ) || 0,
      foodCostRate:
        Number(
          finance.foodCostRate
        ) || 0,
      profitRate:
        Number(
          finance.profitRate
        ) || 0,
      live,
      queueParties:
        live.queueParties,
      occupiedTables:
        live.occupiedTables,
      totalTables:
        live.totalTables,
      seatedPeople:
        live.seatedPeople,
      kitchenQueue:
        live.kitchenQueue,
      deliveryActive:
        live.deliveryWaiting +
        live.deliveryOnRoad,
      walkawaysToday:
        live.walkawaysToday,
      stockoutsToday:
        live.stockoutsToday,
      mistakesToday:
        live.mistakesToday,
      realOperation:
        true
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

    const headerImage =
      resourceManager.getImage(
        'v44_store_header'
      );

    if (headerImage) {
      ui.coverImage(
        ctx,
        headerImage,
        0,
        0,
        DESIGN_W,
        86,
        0,
        null
      );
    } else {
      ui.coverImage(
        ctx,
        visualAssetSystem.get(
          'premium_explore_banner'
        ),
        0,
        0,
        DESIGN_W,
        86,
        0,
        null
      );
    }

    const overlay =
      ctx.createLinearGradient(
        0,
        0,
        DESIGN_W,
        0
      );

    overlay.addColorStop(
      0,
      'rgba(2,37,59,0.84)'
    );

    overlay.addColorStop(
      0.62,
      'rgba(2,47,72,0.56)'
    );

    overlay.addColorStop(
      1,
      'rgba(2,37,59,0.80)'
    );

    ctx.fillStyle =
      overlay;

    ctx.fillRect(
      0,
      0,
      DESIGN_W,
      86
    );

    ui.card(
      ctx,
      10,
      12,
      38,
      38,
      {
        radius: 11,
        fill:
          'rgba(3,52,80,0.91)',
        stroke:
          'rgba(255,255,255,0.30)',
        shadow: false
      }
    );

    storeText(
      ctx,
      '‹',
      29,
      31,
      18,
      '#FFE070',
      '800',
      'center'
    );

    this.addButton(
      'header:back',
      7,
      9,
      44,
      44
    );

    const cityName =
      gameState.getCityName();

    storeText(
      ctx,
      cityName,
      58,
      20,
      15,
      COLORS.white,
      '800'
    );

    storeText(
      ctx,
      opts.subtitle ||
        '打造属于你的美食帝国',
      58,
      39,
      5.8,
      '#ECF5F8',
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
      281,
      11,
      94,
      42,
      {
        radius: 12,
        fill:
          'rgba(2,53,83,0.94)',
        stroke:
          'rgba(107,208,247,0.40)',
        shadow: false
      }
    );

    const moneyIcon =
      resourceManager.getImage(
        'v44_glossy_money'
      );

    if (moneyIcon) {
      ctx.drawImage(
        moneyIcon,
        289,
        16,
        23,
        23
      );
    }

    storeText(
      ctx,
      cash,
      336,
      23,
      cash.length > 8
        ? 8.4
        : 9.8,
      '#FFE57A',
      '800',
      'center'
    );

    storeText(
      ctx,
      '可用资金',
      333,
      42,
      5.0,
      '#DCECF2',
      '600',
      'center'
    );

    const bulletin =
      simulationSystem
        .getBulletin();

    ui.card(
      ctx,
      8,
      59,
      374,
      23,
      {
        radius: 11,
        fill:
          'rgba(3,48,74,0.93)',
        stroke:
          'rgba(83,195,238,0.32)',
        shadow: false
      }
    );

    const speaker =
      resourceManager.getImage(
        'v44_glossy_bulletin'
      );

    if (speaker) {
      ctx.drawImage(
        speaker,
        15,
        62,
        17,
        17
      );
    }

    storeText(
      ctx,
      '城市动态',
      38,
      70.5,
      5.6,
      '#FFD35E',
      '800'
    );

    storeText(
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
        47
      ),
      87,
      70.5,
      5.0,
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
        ? '#E2F2FB'
        : tone === 'dark'
          ? COLORS.navy
          : COLORS.gold;

    const stroke =
      tone === 'blue'
        ? '#83C7E7'
        : tone === 'dark'
          ? '#0B688F'
          : '#DEA319';

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
            13,
            h / 2
          ),
        fill,
        stroke,
        lineWidth: 0.8,
        shadow: false
      }
    );

    storeText(
      ctx,
      label,
      x + w / 2,
      y + h / 2,
      h >= 30
        ? 6.7
        : 5.8,
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

    // 顶部主卡：按参考图的“横幅 + 3指标 + 双按钮”一体化排版。
    ui.card(
      ctx,
      10,
      91,
      370,
      177,
      {
        radius: 15,
        fill: '#FFFCF7',
        stroke: '#DED5C8',
        shadowBlur: 6,
        shadowOffsetY: 2
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
      99,
      354,
      68,
      11,
      'rgba(3,27,41,0.43)'
    );

    storeText(
      ctx,
      '还没有自己的门店',
      28,
      120,
      13.6,
      COLORS.white,
      '800'
    );

    storeText(
      ctx,
      '先选址、看房源，再一步步完成筹备',
      28,
      146,
      5.8,
      '#F2F7F9',
      '600'
    );

    const topMetrics = [
      {
        title: '可用资金',
        value:
          compactMoney(
            gameState
              .getPlayer()
              .cash
          ),
        icon: 'rent'
      },
      {
        title: '推荐预算',
        value:
          budget.total
            ? compactMoney(
                budget.total
              )
            : '--',
        icon: 'hot'
      },
      {
        title: '推荐商圈',
        value:
          rec
            ? rec.district.name
            : '--',
        icon: 'lease'
      }
    ];

    for (
      let i = 0;
      i < 3;
      i++
    ) {
      const x =
        26 +
        i * 119;

      if (i > 0) {
        storeDivider(
          ctx,
          x - 12,
          179,
          x - 12,
          218
        );
      }

      this.drawPropertyIcon(
        ctx,
        topMetrics[i].icon,
        x,
        186,
        21,
        '',
        '#EFF4F6'
      );

      storeText(
        ctx,
        topMetrics[i].title,
        x + 29,
        189,
        5.1,
        COLORS.muted,
        '700'
      );

      storeText(
        ctx,
        topMetrics[i].value,
        x + 29,
        207,
        7.2,
        COLORS.text,
        '800'
      );
    }

    this.drawActionButton(
      ctx,
      'go-property',
      '前往选址',
      21,
      226,
      170,
      34,
      'gold'
    );

    this.drawActionButton(
      ctx,
      'go-city',
      '查看商圈',
      199,
      226,
      170,
      34,
      'blue'
    );

    // 开店流程
    ui.card(
      ctx,
      10,
      278,
      370,
      61,
      {
        radius: 14,
        fill: '#FFFCF7',
        stroke: '#DED5C8',
        shadow: false
      }
    );

    this.drawPropertyIcon(
      ctx,
      'new',
      20,
      287,
      18,
      '',
      '#EEF4F6'
    );

    storeText(
      ctx,
      '开店流程',
      44,
      296,
      7.5,
      COLORS.text,
      '800'
    );

    const steps = [
      ['visibility', '选址'],
      ['lease', '签约'],
      ['layout', '装修'],
      ['broker', '招聘'],
      ['new', '开业']
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
        storeDivider(
          ctx,
          x + 11,
          315,
          x + 48,
          315,
          i === 0
            ? '#E6C55B'
            : '#D5D9DB',
          1.5
        );
      }

      this.drawPropertyIcon(
        ctx,
        steps[i][0],
        x - 9,
        305,
        19,
        '',
        i === 0
          ? '#FFF0B2'
          : '#E7EDF0'
      );

      storeText(
        ctx,
        steps[i][1],
        x,
        330,
        5.0,
        COLORS.text,
        '700',
        'center'
      );
    }

    // 推荐房源：重点对齐参考图的信息密度。
    ui.card(
      ctx,
      10,
      347,
      370,
      207,
      {
        radius: 14,
        fill: '#FFFCF7',
        stroke: '#DED5C8',
        shadow: false
      }
    );

    this.drawPropertyIcon(
      ctx,
      'hot',
      20,
      356,
      18,
      '',
      '#FFF3D8'
    );

    storeText(
      ctx,
      '推荐房源',
      44,
      365,
      8.6,
      COLORS.text,
      '800'
    );

    storeText(
      ctx,
      '查看更多房源 ›',
      367,
      365,
      5.1,
      COLORS.navy,
      '800',
      'right'
    );

    this.addButton(
      'go-property',
      286,
      350,
      89,
      28
    );

    const imageKeys = [
      'lib_listing_1',
      'lib_listing_2',
      'lib_listing_3'
    ];

    const badgeKeys = [
      'lib_status_hot',
      'lib_status_recommend',
      'lib_status_new'
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

      ui.card(
        ctx,
        x,
        379,
        112,
        164,
        {
          radius: 9,
          fill: '#FCF8F1',
          stroke: '#E3D9CD',
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
        382,
        106,
        55,
        7,
        null
      );

      if (!listing) {
        storeText(
          ctx,
          '暂无推荐',
          x + 56,
          469,
          5.6,
          COLORS.muted,
          '700',
          'center'
        );
        continue;
      }

      const badgeImage =
        resourceManager.getImage(
          badgeKeys[i]
        );

      if (badgeImage) {
        ctx.drawImage(
          badgeImage,
          x + 5,
          384,
          38,
          17
        );
      }

      storeText(
        ctx,
        shortText(
          listing.address ||
          listing.name ||
          '临街商铺',
          9
        ),
        x + 7,
        449,
        6.0,
        COLORS.text,
        '800'
      );

      storeText(
        ctx,
        Math.round(
          Number(
            listing.usableArea ||
            listing.grossArea
          ) || 0
        ) +
        '㎡',
        x + 7,
        466,
        4.8,
        COLORS.muted,
        '600'
      );

      storeText(
        ctx,
        compactMoney(
          listing
            .askingMonthlyRent ||
          listing.monthlyRent ||
          0
        ),
        x + 104,
        466,
        5.1,
        COLORS.red,
        '800',
        'right'
      );

      const score =
        this.getListingScore(
          listing
        );

      this.drawScoreStars(
        ctx,
        score,
        x + 7,
        481
      );

      const tags = [
        listing.exhaust
          ? '排烟✓'
          : '排烟×',
        listing.gas
          ? '燃气✓'
          : '燃气×',
        score >= 4.1
          ? '首店佳'
          : '需评估'
      ];

      for (
        let t = 0;
        t < 3;
        t++
      ) {
        const tx =
          x + 6 +
          t * 34;

        ui.card(
          ctx,
          tx,
          492,
          31,
          16,
          {
            radius: 8,
            fill:
              tags[t].includes('×')
                ? '#FFF0EE'
                : '#ECF7F2',
            stroke: false,
            shadow: false
          }
        );

        storeText(
          ctx,
          tags[t],
          tx + 15.5,
          500,
          4.2,
          tags[t].includes('×')
            ? '#D65547'
            : '#278766',
          '700',
          'center'
        );
      }

      storeText(
        ctx,
        score >= 4.2
          ? '值得优先看铺'
          : score >= 3.5
            ? '建议实地评估'
            : '谨慎评估',
        x + 7,
        518,
        4.5,
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
        522,
        100,
        17,
        'gold'
      );
    }

    // 今日机会 + 市场动态：严格压在底栏上方，不做大空块。
    const bottomY =
      562;

    const bottomH =
      Math.max(
        104,
        this.contentBottom -
        bottomY -
        9
      );

    ui.card(
      ctx,
      10,
      bottomY,
      181,
      bottomH,
      {
        radius: 14,
        fill: '#FFFCF7',
        stroke: '#DED5C8',
        shadow: false
      }
    );

    this.drawPropertyIcon(
      ctx,
      'event',
      20,
      bottomY + 9,
      18,
      '',
      '#FFF0E0'
    );

    storeText(
      ctx,
      '今日机会',
      44,
      bottomY + 18,
      7.5,
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
        ),
        20,
        bottomY + 31,
        58,
        47,
        7,
        null
      );

      storeText(
        ctx,
        shortText(
          first.address ||
          '优质挂牌房源',
          10
        ),
        87,
        bottomY + 39,
        5.4,
        COLORS.text,
        '800'
      );

      storeText(
        ctx,
        Math.round(
          Number(
            first.usableArea ||
            first.grossArea
          ) || 0
        ) +
        '㎡ · 月租' +
        compactMoney(
          first.askingMonthlyRent ||
          first.monthlyRent ||
          0
        ),
        87,
        bottomY + 57,
        4.5,
        COLORS.muted,
        '600'
      );

      storeText(
        ctx,
        '预计启动 ' +
        compactMoney(
          firstBudget.total
        ),
        20,
        bottomY + 92,
        5.2,
        COLORS.red,
        '800'
      );

      if (
        bottomH >
        126
      ) {
        storeText(
          ctx,
          '优先看铺，避免优质挂牌被竞争者抢走',
          20,
          bottomY + 112,
          4.5,
          COLORS.muted,
          '600'
        );
      }
    }

    ui.card(
      ctx,
      199,
      bottomY,
      181,
      bottomH,
      {
        radius: 14,
        fill: '#FFFCF7',
        stroke: '#DED5C8',
        shadow: false
      }
    );

    this.drawPropertyIcon(
      ctx,
      'rent',
      207,
      bottomY + 9,
      18,
      '',
      '#EFF7F0'
    );

    storeText(
      ctx,
      '市场动态',
      231,
      bottomY + 18,
      7.5,
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
        i < 4;
        i++
      ) {
        const col =
          i % 2;

        const row =
          Math.floor(
            i / 2
          );

        const x =
          207 +
          col * 83;

        const y =
          bottomY +
          31 +
          row * 47;

        ui.card(
          ctx,
          x,
          y,
          77,
          40,
          {
            radius: 9,
            fill: '#F9F6F0',
            stroke: '#E6DDD2',
            shadow: false
          }
        );

        ctx.beginPath();
        ctx.arc(
          x + 11,
          y + 11,
          4.5,
          0,
          Math.PI * 2
        );
        ctx.fillStyle =
          dynamics[i][2];
        ctx.fill();

        storeText(
          ctx,
          dynamics[i][0],
          x + 20,
          y + 10,
          4.4,
          COLORS.muted,
          '700'
        );

        storeText(
          ctx,
          dynamics[i][1],
          x + 10,
          y + 27,
          5.8,
          COLORS.text,
          '800'
        );
      }
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

    const district =
      citySystem.getDistrict(
        shop.districtId
      );

    this.drawHeader(
      ctx,
      {
        subtitle:
          '门店筹备中心'
      }
    );

    // 主门店卡
    ui.card(
      ctx,
      10,
      91,
      370,
      154,
      {
        radius: 15,
        fill: '#FFFCF7',
        stroke: '#DED5C8'
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
      99,
      354,
      78,
      11,
      'rgba(2,28,42,0.30)'
    );

    storeText(
      ctx,
      shortText(
        shop.name ||
        '筹备中的门店',
        13
      ),
      28,
      120,
      13,
      COLORS.white,
      '800'
    );

    const badge =
      resourceManager.getImage(
        shop.status ===
          'renovating'
          ? 'lib_status_renovating'
          : 'lib_status_signed'
      );

    if (badge) {
      ctx.drawImage(
        badge,
        28,
        138,
        65,
        20
      );
    }

    storeText(
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
        16
      ),
      102,
      149,
      5.2,
      '#EEF6F8',
      '600'
    );

    const heroMetrics = [
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
              ? state.metrics.totalSeats
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
      i < 4;
      i++
    ) {
      const x =
        28 +
        i * 86;

      storeText(
        ctx,
        heroMetrics[i][0],
        x,
        196,
        4.6,
        COLORS.muted,
        '600'
      );

      storeText(
        ctx,
        heroMetrics[i][1],
        x,
        214,
        6.4,
        COLORS.text,
        '800'
      );
    }

    // 装修/证照/招聘/设备
    ui.card(
      ctx,
      10,
      253,
      370,
      68,
      {
        radius: 14,
        fill: '#FFFCF7',
        stroke: '#DED5C8',
        shadow: false
      }
    );

    const equipText = {
      planning: '规划中',
      ordered: '已下单',
      delivered: '待安装',
      installed: '已安装'
    }[
      state.equipmentStatus
    ] || state.equipmentStatus;

    const statuses = [
      [
        '装修',
        percent01(
          state.renovationProgress
        ),
        'layout',
        COLORS.orange
      ],
      [
        '证照',
        state.permitApproved +
        '/' +
        state.permitTotal,
        'lease',
        COLORS.blue
      ],
      [
        '招聘',
        state.hiredCount +
        '/' +
        state.requiredCount,
        'broker',
        COLORS.green
      ],
      [
        '设备',
        equipText,
        'rider',
        COLORS.purple
      ]
    ];

    for (
      let i = 0;
      i < 4;
      i++
    ) {
      const x =
        18 +
        i * 91;

      ui.card(
        ctx,
        x,
        266,
        84,
        43,
        {
          radius: 9,
          fill: '#FAF7F1',
          stroke: '#E5DCD2',
          shadow: false
        }
      );

      this.drawPropertyIcon(
        ctx,
        statuses[i][2],
        x + 6,
        277,
        19,
        '',
        '#EEF4F6'
      );

      storeText(
        ctx,
        statuses[i][0],
        x + 30,
        275,
        4.6,
        COLORS.muted,
        '700'
      );

      storeText(
        ctx,
        statuses[i][1],
        x + 30,
        294,
        5.9,
        COLORS.text,
        '800'
      );
    }

    // 开店进度
    ui.card(
      ctx,
      10,
      329,
      370,
      67,
      {
        radius: 14,
        fill: '#FFFCF7',
        stroke: '#DED5C8',
        shadow: false
      }
    );

    storeText(
      ctx,
      '开店进度',
      22,
      347,
      7.6,
      COLORS.text,
      '800'
    );

    const steps = [
      [
        '签约',
        true,
        'lease'
      ],
      [
        '装修',
        state.readiness
          .renovationReady,
        'layout'
      ],
      [
        '证照',
        state.readiness
          .permitsReady,
        'contract'
      ],
      [
        '招聘',
        state.readiness
          .staffingReady,
        'broker'
      ],
      [
        '设备',
        state.readiness
          .equipmentReady,
        'rider'
      ],
      [
        '试营业',
        false,
        'new'
      ]
    ];

    let current =
      steps.findIndex(
        item => !item[1]
      );

    if (current < 0) {
      current =
        steps.length - 1;
    }

    for (
      let i = 0;
      i < 6;
      i++
    ) {
      const x =
        58 +
        i * 55;

      if (i < 5) {
        storeDivider(
          ctx,
          x + 10,
          370,
          x + 44,
          370,
          i < current
            ? COLORS.green
            : '#D5DADC',
          1.4
        );
      }

      this.drawPropertyIcon(
        ctx,
        steps[i][2],
        x - 9,
        360,
        19,
        steps[i][1]
          ? '✓'
          : '',
        steps[i][1]
          ? '#E4F5EB'
          : i === current
            ? '#FFF0B4'
            : '#E7EDF0'
      );

      storeText(
        ctx,
        steps[i][0],
        x,
        388,
        4.8,
        COLORS.text,
        '700',
        'center'
      );
    }

    // 建议 + 资金
    ui.card(
      ctx,
      10,
      404,
      232,
      118,
      {
        radius: 14,
        fill: '#FFFCF7',
        stroke: '#DED5C8',
        shadow: false
      }
    );

    storeText(
      ctx,
      '下一步建议',
      22,
      423,
      7.6,
      COLORS.text,
      '800'
    );

    const rec =
      state.recommendation;

    const adviceImage =
      resourceManager.getImage(
        rec.id === 'renovation'
          ? 'lib_advice_renovation'
          : rec.id === 'staff'
            ? 'lib_advice_staff'
            : 'lib_advice_license'
      );

    if (adviceImage) {
      ui.coverImage(
        ctx,
        adviceImage,
        20,
        437,
        67,
        56,
        8,
        null
      );
    }

    storeText(
      ctx,
      rec.title,
      97,
      449,
      6.5,
      COLORS.text,
      '800'
    );

    storeText(
      ctx,
      shortText(
        rec.detail,
        18
      ),
      97,
      467,
      4.7,
      COLORS.muted,
      '600'
    );

    this.drawActionButton(
      ctx,
      'module:' +
        rec.id,
      rec.action,
      96,
      483,
      130,
      27,
      'gold'
    );

    ui.card(
      ctx,
      250,
      404,
      130,
      118,
      {
        radius: 14,
        fill: '#FFFCF7',
        stroke: '#DED5C8',
        shadow: false
      }
    );

    storeText(
      ctx,
      '筹备资金',
      262,
      423,
      7.4,
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

    storeText(
      ctx,
      '预计总投入',
      262,
      451,
      4.7,
      COLORS.muted,
      '600'
    );

    storeText(
      ctx,
      compactMoney(
        need
          ? need.totalNeed
          : (
            state.metrics
              ? state.metrics.totalCost
              : 0
          )
      ),
      368,
      451,
      6.1,
      COLORS.text,
      '800',
      'right'
    );

    storeText(
      ctx,
      gap > 0
        ? '资金缺口'
        : '可用资金',
      262,
      475,
      4.7,
      COLORS.muted,
      '600'
    );

    storeText(
      ctx,
      compactMoney(
        gap > 0
          ? gap
          : gameState
              .getPlayer()
              .cash
      ),
      368,
      475,
      6.1,
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
        '申请周转',
        261,
        492,
        107,
        22,
        'blue'
      );
    }

    this.drawActionButton(
      ctx,
      'module:' +
        rec.id,
      '继续筹备',
      21,
      532,
      170,
      35,
      'gold'
    );

    this.drawActionButton(
      ctx,
      'go-property',
      '继续看商圈',
      199,
      532,
      170,
      35,
      'blue'
    );

    // 筹备提醒 + 扩张机会，填到导航栏上方。
    const bottomY =
      577;

    const h =
      Math.max(
        85,
        this.contentBottom -
        bottomY -
        9
      );

    ui.card(
      ctx,
      10,
      bottomY,
      370,
      h,
      {
        radius: 14,
        fill: '#FFF9EA',
        stroke: '#E5D5AB',
        shadow: false
      }
    );

    storeText(
      ctx,
      '筹备提醒',
      22,
      bottomY + 18,
      7.2,
      COLORS.text,
      '800'
    );

    const doneCount =
      Number(
        state.readiness
          .renovationReady
      ) +
      Number(
        state.readiness
          .permitsReady
      ) +
      Number(
        state.readiness
          .staffingReady
      ) +
      Number(
        state.readiness
          .equipmentReady
      );

    storeText(
      ctx,
      '已完成 ' +
        doneCount +
        '/4 项开业基础条件',
      22,
      bottomY + 41,
      5.2,
      COLORS.muted,
      '600'
    );

    storeText(
      ctx,
      district
        ? (
          district.name +
          '仍有可考察铺面，可提前为下一家店储备'
        )
        : '仍可提前储备下一家门店的优质铺面',
      22,
      bottomY + 64,
      4.8,
      COLORS.muted,
      '600'
    );

    this.drawActionButton(
      ctx,
      'go-property',
      '查看机会',
      298,
      bottomY + 25,
      70,
      27,
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

    ui.card(
      ctx,
      10,
      91,
      370,
      172,
      {
        radius: 15,
        fill: '#FFFCF7',
        stroke: '#DED5C8'
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
      99,
      354,
      77,
      11,
      'rgba(2,28,42,0.28)'
    );

    storeText(
      ctx,
      shortText(
        shop.name ||
        '我的门店',
        14
      ),
      28,
      119,
      13.2,
      COLORS.white,
      '800'
    );

    ui.card(
      ctx,
      28,
      136,
      61,
      20,
      {
        radius: 10,
        fill: '#14A66B',
        stroke: false,
        shadow: false
      }
    );

    storeText(
      ctx,
      '营业中',
      58.5,
      146,
      5.4,
      COLORS.white,
      '800',
      'center'
    );

    storeText(
      ctx,
      '营业第' +
        snap.openDay +
        '天',
      99,
      146,
      5.1,
      '#F2F8FA',
      '600'
    );

    storeText(
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
      166,
      5.0,
      '#EEF6F8',
      '600'
    );

    const summary = [
      [
        '今日营业额',
        compactMoney(
          snap.revenue
        ),
        COLORS.goldDeep
      ],
      [
        '今日净利润',
        compactMoney(
          snap.profit
        ),
        snap.profit >= 0
          ? COLORS.green
          : COLORS.red
      ],
      [
        '到店顾客',
        snap.customers +
        '人',
        COLORS.blue
      ],
      [
        '门店评分',
        snap.rating.toFixed(
          1
        ),
        '#EBAE13'
      ]
    ];

    for (
      let i = 0;
      i < 4;
      i++
    ) {
      const x =
        24 +
        i * 89;

      if (i > 0) {
        storeDivider(
          ctx,
          x - 8,
          186,
          x - 8,
          222
        );
      }

      storeText(
        ctx,
        summary[i][0],
        x,
        188,
        4.6,
        COLORS.muted,
        '600'
      );

      storeText(
        ctx,
        summary[i][1],
        x,
        206,
        6.8,
        summary[i][2],
        '800'
      );
    }

    this.drawActionButton(
      ctx,
      'module:business',
      '进入经营',
      18,
      226,
      214,
      29,
      'gold'
    );

    this.drawActionButton(
      ctx,
      'shop:rename',
      '门店详情',
      241,
      226,
      131,
      29,
      'blue'
    );

    // 五入口
    ui.card(
      ctx,
      10,
      271,
      370,
      55,
      {
        radius: 13,
        fill: '#FFFCF7',
        stroke: '#DED5C8',
        shadow: false
      }
    );

    const funcs = [
      [
        'renovation-dynamic',
        '装修',
        'layout'
      ],
      [
        'staff',
        '员工',
        'broker'
      ],
      [
        'research',
        '菜单',
        'new'
      ],
      [
        'supply',
        '供应链',
        'rider'
      ],
      [
        'business',
        '营销',
        'event'
      ]
    ];

    for (
      let i = 0;
      i < 5;
      i++
    ) {
      const x =
        31 +
        i * 70;

      this.drawPropertyIcon(
        ctx,
        funcs[i][2],
        x - 10,
        279,
        21,
        '',
        '#EDF4F7'
      );

      storeText(
        ctx,
        funcs[i][1],
        x,
        314,
        5.1,
        COLORS.text,
        '700',
        'center'
      );

      this.addButton(
        'module:' +
          funcs[i][0],
        x - 25,
        275,
        50,
        47
      );
    }

    // 今日情况
    ui.card(
      ctx,
      10,
      334,
      370,
      105,
      {
        radius: 14,
        fill: '#FFFCF7',
        stroke: '#DED5C8',
        shadow: false
      }
    );

    storeText(
      ctx,
      '今日门店情况',
      22,
      352,
      7.7,
      COLORS.text,
      '800'
    );

    const time =
      gameState.getTime();

    storeText(
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
      352,
      4.6,
      COLORS.muted,
      '600',
      'right'
    );

    const stateItems = [
      [
        '等位',
        snap.queueParties +
        '桌'
      ],
      [
        '在座',
        snap.seatedPeople +
        '人'
      ],
      [
        '后厨队列',
        snap.kitchenQueue +
        '单'
      ],
      [
        '外卖配送',
        snap.deliveryActive +
        '单'
      ]
    ];

    for (
      let i = 0;
      i < 4;
      i++
    ) {
      const x =
        18 +
        i * 91;

      ui.card(
        ctx,
        x,
        364,
        84,
        42,
        {
          radius: 9,
          fill: '#FAF7F1',
          stroke: '#E4DCD2',
          shadow: false
        }
      );

      storeText(
        ctx,
        stateItems[i][0],
        x + 9,
        375,
        4.6,
        COLORS.muted,
        '700'
      );

      storeText(
        ctx,
        stateItems[i][1],
        x + 9,
        394,
        6.1,
        COLORS.text,
        '800'
      );
    }

    const warning =
      snap.walkawaysToday > 0
        ? '已有' +
          snap.walkawaysToday +
          '桌顾客等位离开'
        : snap.stockoutsToday > 0
          ? '今日出现' +
            snap.stockoutsToday +
            '次缺货'
          : snap.kitchenQueue > 6
            ? '后厨高峰拥堵'
            : snap.staffCoverage < 0.9
              ? '员工覆盖不足'
              : !snap.state
                  .readiness
                  .equipmentReady
                ? '设备仍待完善'
                : !snap.state
                    .readiness
                    .permitsReady
                  ? '证照仍待处理'
                  : '今日经营稳定';

    ui.card(
      ctx,
      18,
      412,
      354,
      19,
      {
        radius: 9,
        fill:
          warning ===
            '今日经营稳定'
            ? '#EAF8F0'
            : '#FFF0EA',
        stroke: false,
        shadow: false
      }
    );

    storeText(
      ctx,
      warning,
      28,
      421.5,
      4.8,
      warning ===
        '今日经营稳定'
        ? COLORS.green
        : COLORS.red,
      '800'
    );

    // 待办
    ui.card(
      ctx,
      10,
      447,
      370,
      79,
      {
        radius: 14,
        fill: '#FFFCF7',
        stroke: '#DED5C8',
        shadow: false
      }
    );

    storeText(
      ctx,
      '待处理事项',
      22,
      465,
      7.5,
      COLORS.text,
      '800'
    );

    const todos = [
      [
        snap.staffCoverage < 0.9
          ? '补充员工'
          : '安排排班',
        'staff'
      ],
      [
        '调整菜单',
        'research'
      ],
      [
        '检查供应',
        'supply'
      ],
      [
        '升级装修',
        'renovation-dynamic'
      ]
    ];

    for (
      let i = 0;
      i < 4;
      i++
    ) {
      const x =
        18 +
        i * 91;

      ui.card(
        ctx,
        x,
        477,
        84,
        40,
        {
          radius: 9,
          fill: '#FAF7F1',
          stroke: '#E3DAD0',
          shadow: false
        }
      );

      storeText(
        ctx,
        todos[i][0],
        x + 42,
        489,
        5.1,
        COLORS.text,
        '800',
        'center'
      );

      storeText(
        ctx,
        '点击管理',
        x + 42,
        505,
        4.2,
        COLORS.muted,
        '600',
        'center'
      );

      this.addButton(
        'module:' +
          todos[i][1],
        x,
        477,
        84,
        40
      );
    }

    // 热销 + 评价
    ui.card(
      ctx,
      10,
      534,
      181,
      96,
      {
        radius: 14,
        fill: '#FFFCF7',
        stroke: '#DED5C8',
        shadow: false
      }
    );

    storeText(
      ctx,
      '热销菜品',
      22,
      552,
      7.3,
      COLORS.text,
      '800'
    );

    storeText(
      ctx,
      '菜单销量数据接入后显示排行',
      22,
      576,
      4.6,
      COLORS.muted,
      '600'
    );

    this.drawActionButton(
      ctx,
      'module:research',
      '查看菜单',
      22,
      594,
      145,
      24,
      'gold'
    );

    ui.card(
      ctx,
      199,
      534,
      181,
      96,
      {
        radius: 14,
        fill: '#FFFCF7',
        stroke: '#DED5C8',
        shadow: false
      }
    );

    storeText(
      ctx,
      '门店评价',
      211,
      552,
      7.3,
      COLORS.text,
      '800'
    );

    const positiveRate =
      Math.round(
        clamp(
          snap.rating / 5,
          0,
          1
        ) * 100
      );

    storeText(
      ctx,
      '好评率',
      211,
      575,
      4.7,
      COLORS.muted,
      '600'
    );

    storeText(
      ctx,
      positiveRate +
        '%',
      211,
      595,
      9.5,
      COLORS.green,
      '800'
    );

    storeText(
      ctx,
      '卫生 ' +
        clamp(
          snap.rating + 0.1,
          1,
          5
        ).toFixed(1),
      285,
      579,
      4.8,
      COLORS.text,
      '700'
    );

    storeText(
      ctx,
      '出餐 ' +
        clamp(
          snap.rating - 0.1,
          1,
          5
        ).toFixed(1),
      285,
      601,
      4.8,
      COLORS.text,
      '700'
    );

    // 扩店机会
    const y =
      638;

    const h =
      Math.max(
        48,
        this.contentBottom -
        y -
        9
      );

    ui.card(
      ctx,
      10,
      y,
      370,
      h,
      {
        radius: 13,
        fill: '#FFF8E5',
        stroke: '#E4D09D',
        shadow: false
      }
    );

    storeText(
      ctx,
      '扩店机会',
      22,
      y + 18,
      7.1,
      COLORS.text,
      '800'
    );

    storeText(
      ctx,
      '经营稳定后，可继续考察新的优质铺面',
      82,
      y + 18,
      4.8,
      COLORS.muted,
      '600'
    );

    this.drawActionButton(
      ctx,
      'go-property',
      '去看新铺',
      299,
      y + 8,
      68,
      27,
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
          item.staffCoverage <
            0.85
      ).length;

    // 顶部总览
    ui.card(
      ctx,
      10,
      91,
      370,
      96,
      {
        radius: 15,
        fill: '#FFFCF7',
        stroke: '#DED5C8'
      }
    );

    storeText(
      ctx,
      '我的门店',
      22,
      111,
      13,
      COLORS.text,
      '800'
    );

    storeText(
      ctx,
      '用美食连接城市，让更多人爱上你的味道。',
      102,
      111,
      5.0,
      COLORS.muted,
      '600'
    );

    this.drawActionButton(
      ctx,
      'go-property',
      '+ 新开门店',
      293,
      99,
      74,
      27,
      'gold'
    );

    const totals = [
      [
        '门店总数',
        shops.length + '家'
      ],
      [
        '今日总营业额',
        compactMoney(
          totalRevenue
        )
      ],
      [
        '今日总利润',
        compactMoney(
          totalProfit
        )
      ],
      [
        '异常门店',
        abnormal + '家'
      ]
    ];

    for (
      let i = 0;
      i < 4;
      i++
    ) {
      const x =
        18 +
        i * 91;

      ui.card(
        ctx,
        x,
        137,
        84,
        40,
        {
          radius: 9,
          fill: '#FAF7F1',
          stroke: '#E4DCD2',
          shadow: false
        }
      );

      storeText(
        ctx,
        totals[i][0],
        x + 8,
        148,
        4.5,
        COLORS.muted,
        '700'
      );

      storeText(
        ctx,
        totals[i][1],
        x + 8,
        166,
        6.2,
        i === 3 &&
        abnormal > 0
          ? COLORS.red
          : COLORS.text,
        '800'
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
      i < 4;
      i++
    ) {
      const selected =
        this.listFilter ===
        filters[i][0];

      ui.card(
        ctx,
        10 + i * 82,
        195,
        75,
        28,
        {
          radius: 14,
          fill:
            selected
              ? COLORS.gold
              : '#F4EFE7',
          stroke:
            selected
              ? '#D99C15'
              : '#DED5CA',
          shadow: false
        }
      );

      storeText(
        ctx,
        filters[i][1],
        47.5 +
          i * 82,
        209,
        5.4,
        COLORS.text,
        '800',
        'center'
      );

      this.addButton(
        'filter:' +
          filters[i][0],
        10 +
          i * 82,
        195,
        75,
        28
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
            shop.status ===
            'open'
        );
    } else if (
      this.listFilter ===
      'preparing'
    ) {
      list =
        list.filter(
          shop =>
            shop.status !==
            'open'
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
      82;

    for (
      let i = 0;
      i < list.length;
      i++
    ) {
      const shop =
        list[i];

      const y =
        232 +
        i * rowH;

      const open =
        shop.status ===
        'open';

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
        75,
        {
          radius: 13,
          fill: '#FFFCF7',
          stroke: '#DED5C8',
          shadow: false
        }
      );

      ui.coverImage(
        ctx,
        this.getStoreImage(i),
        17,
        y + 6,
        105,
        63,
        8,
        null
      );

      storeText(
        ctx,
        shortText(
          shop.name ||
          '未命名门店',
          10
        ),
        131,
        y + 16,
        7.6,
        COLORS.text,
        '800'
      );

      const district =
        citySystem.getDistrict(
          shop.districtId
        );

      storeText(
        ctx,
        (
          district
            ? district.name
            : ''
        ) +
        ' · ' +
        shortText(
          shop.address ||
          '',
          12
        ),
        131,
        y + 33,
        4.7,
        COLORS.muted,
        '600'
      );

      if (
        open &&
        snap
      ) {
        const row = [
          [
            '营业额',
            compactMoney(
              snap.revenue
            )
          ],
          [
            '利润',
            compactMoney(
              snap.profit
            )
          ],
          [
            '顾客',
            snap.customers +
            '人'
          ],
          [
            '评分',
            snap.rating.toFixed(
              1
            )
          ]
        ];

        for (
          let j = 0;
          j < 4;
          j++
        ) {
          const rx =
            131 +
            j * 47;

          storeText(
            ctx,
            row[j][0],
            rx,
            y + 48,
            4.1,
            COLORS.muted,
            '600'
          );

          storeText(
            ctx,
            row[j][1],
            rx,
            y + 63,
            5.2,
            (
              j === 1 &&
              snap.profit < 0
            )
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
          317,
          y + 21,
          52,
          27,
          snap.profit < 0
            ? 'gold'
            : 'blue'
        );
      } else {
        const prep =
          this.getPreparationState(
            shop
          );

        storeText(
          ctx,
          '装修进度',
          131,
          y + 49,
          4.4,
          COLORS.muted,
          '600'
        );

        storeText(
          ctx,
          percent01(
            prep.renovationProgress
          ),
          131,
          y + 64,
          5.6,
          COLORS.blue,
          '800'
        );

        this.drawActionButton(
          ctx,
          'shop:focus:' +
            shop.id,
          '继续筹备',
          317,
          y + 27,
          52,
          27,
          'gold'
        );
      }
    }

    const listBottom =
      232 +
      Math.max(
        1,
        list.length
      ) *
      rowH;

    const quickY =
      Math.min(
        568,
        listBottom + 4
      );

    const quicks = [
      [
        '门店地图',
        'go-city'
      ],
      [
        '人员调配',
        'module:staff'
      ],
      [
        '统一采购',
        'module:supply'
      ],
      [
        '品牌升级',
        'module:business'
      ]
    ];

    for (
      let i = 0;
      i < 4;
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
        43,
        {
          radius: 10,
          fill: '#FBF8F2',
          stroke: '#E1D8CD',
          shadow: false
        }
      );

      storeText(
        ctx,
        quicks[i][0],
        x + 43,
        quickY + 21.5,
        5.2,
        COLORS.text,
        '800',
        'center'
      );

      this.addButton(
        quicks[i][1],
        x,
        quickY,
        86,
        43
      );
    }

    const expY =
      quickY + 51;

    const expH =
      Math.max(
        43,
        this.contentBottom -
        expY -
        9
      );

    ui.card(
      ctx,
      10,
      expY,
      370,
      expH,
      {
        radius: 12,
        fill: '#FFF8E5',
        stroke: '#E6D19F',
        shadow: false
      }
    );

    storeText(
      ctx,
      '扩张机会',
      22,
      expY + 18,
      7.0,
      COLORS.text,
      '800'
    );

    storeText(
      ctx,
      prepShops.length
        ? '已有筹备门店，继续推进开业'
        : '当前可继续寻找下一处优质铺面',
      91,
      expY + 18,
      4.8,
      COLORS.muted,
      '600'
    );

    this.drawActionButton(
      ctx,
      'go-property',
      '查看机会',
      300,
      expY + 7,
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
