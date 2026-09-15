'use strict';

// V43_PROPERTY_IMAGE_REBUILD
// V44_PROPERTY_VISUAL_REPAIR

const runtime =
  globalThis.GameRuntime;

if (!runtime) {
  throw new Error(
    'ShopScene：GameRuntime 未初始化'
  );
}

const api =
  runtime.api ||
  {};

const gameState =
  require('../core/gameState.js');

const sceneManager =
  require('../core/sceneManager.js');

const citySystem =
  require('../city/citySystem.js');

const resourceManager =
  require('../core/resourceManager.js');

const propertyData =
  require('../property/propertyData.js');

const propertySystem =
  require('../property/propertySystem.js');

const propertyMarketSystem =
  require('../property/propertyMarketSystem.js');

const propertyIconAtlas =
  require('../property/propertyIconAtlas.js');

const propertyVisitSystem =
  require('../property/propertyVisitSystem.js');

const propertyNegotiationSystem =
  require('../property/propertyNegotiationSystem.js');

/**
 * 动态找铺页面 V2 · 看铺/谈判
 *
 * 城市 → 商圈 → 街道 → 实时挂牌 → 房源详情 → 实地看铺 → 谈判签约
 *
 * 页面不保存固定房源列表。
 * 所有挂牌、租金、竞争者、市场事件均来自 propertyMarketSystem。
 */

const DESIGN_W =
  390;

// V43_1_PROPERTY_CONSTANTS_HOTFIX
const V43_PROPERTY_ICONS = {
  area: 'area',
  frontage: 'frontage',
  exhaust: 'exhaust',
  gas: 'gas',
  power: 'power',
  competitor: 'competitor',
  event: 'event',
  filter: 'filter',
  sort: 'sort',
  lease: 'lease',
  floor: 'floor',
  layout: 'layout',
  warning: 'warning',
  broker: 'broker',
  landlord: 'landlord'
};

const V43_STOREFRONTS = [
  'assets/images/library_store/listings/storefront_1.png',
  'assets/images/library_store/listings/storefront_2.png',
  'assets/images/library_store/listings/storefront_3.png',
  'assets/images/library_store/listings/storefront_4.png',
  'assets/images/library_store/listings/storefront_5.png'
];


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

const DISTRICT_IDS = [
  'university',
  'cbd',
  'hightech',
  'oldtown',
  'village',
  'market',
  'industry'
];

const AREA_PRESETS = [
  {
    name:
      '不限面积',

    min:
      null,

    max:
      null
  },

  {
    name:
      '50㎡以下',

    min:
      null,

    max:
      50
  },

  {
    name:
      '50—100㎡',

    min:
      50,

    max:
      100
  },

  {
    name:
      '100—200㎡',

    min:
      100,

    max:
      200
  },

  {
    name:
      '200—350㎡',

    min:
      200,

    max:
      350
  },

  {
    name:
      '350㎡以上',

    min:
      350,

    max:
      null
  }
];

const RENT_PRESETS = [
  {
    name:
      '不限月租',

    max:
      null
  },

  {
    name:
      '¥5,000内',

    max:
      5000
  },

  {
    name:
      '¥8,000内',

    max:
      8000
  },

  {
    name:
      '¥12,000内',

    max:
      12000
  },

  {
    name:
      '¥20,000内',

    max:
      20000
  },

  {
    name:
      '¥35,000内',

    max:
      35000
  }
];

const UPFRONT_PRESETS = [
  {
    name:
      '不限入场资金',

    max:
      null
  },

  {
    name:
      '¥10万内',

    max:
      100000
  },

  {
    name:
      '¥20万内',

    max:
      200000
  },

  {
    name:
      '¥35万内',

    max:
      350000
  },

  {
    name:
      '¥60万内',

    max:
      600000
  },

  {
    name:
      '¥100万内',

    max:
      1000000
  }
];

const FLOOR_OPTIONS = [
  '不限楼层',
  '1层',
  'B1',
  '2层',
  '3层',
  '1-2层',
  '1-3层'
];

const PROPERTY_TYPE_OPTIONS = [
  null,
  'street_shop',
  'corner_shop',
  'community_shop',
  'mall_shop',
  'foodcourt_stall',
  'office_podium',
  'market_shop',
  'village_shop',
  'detached',
  'duplex',
  'station_shop',
  'park_canteen'
];

const LAYOUT_OPTIONS = [
  null,
  'single_bay',
  'double_bay',
  'long_narrow',
  'front_back',
  'corner_l',
  'through_shop',
  'duplex_layout',
  'high_ceiling',
  'mall_rect',
  'stall'
];

const RISK_OPTIONS = [
  {
    name:
      '不限风险',

    max:
      null
  },

  {
    name:
      '仅0级',

    max:
      0
  },

  {
    name:
      '最高1级',

    max:
      1
  },

  {
    name:
      '最高2级',

    max:
      2
  }
];

const SORT_MODES = [
  {
    name:
      '租金最低',

    key:
      'askingMonthlyRent',

    dir:
      'asc'
  },

  {
    name:
      '面积最小',

    key:
      'grossArea',

    dir:
      'asc'
  },

  {
    name:
      '关注最多',

    key:
      'watchers',

    dir:
      'desc'
  },

  {
    name:
      '竞争最多',

    key:
      'competitorCount',

    dir:
      'desc'
  },

  {
    name:
      '挂牌最久',

    key:
      'daysOnMarket',

    dir:
      'desc'
  },

  {
    name:
      '可见度最高',

    key:
      'visibility',

    dir:
      'desc'
  },

  {
    name:
      '入场资金最低',

    key:
      'liveUpfrontCash',

    dir:
      'asc'
  }
];

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

function money(
  value
) {
  const n =
    Number(value) || 0;

  const sign =
    n < 0
      ? '-'
      : '';

  const abs =
    Math.abs(n);

  function trim(v, decimals) {
    return Number(v)
      .toFixed(decimals)
      .replace(/\.0+$/, '')
      .replace(/(\.\d*?[1-9])0+$/, '$1');
  }

  if (abs >= 1000000000000) {
    const v = abs / 1000000000000;
    return sign + '¥' +
      trim(v, v >= 100 ? 0 : v >= 10 ? 1 : 2) +
      '万亿';
  }

  if (abs >= 100000000) {
    const v = abs / 100000000;
    return sign + '¥' +
      trim(v, v >= 100 ? 0 : v >= 10 ? 1 : 2) +
      '亿';
  }

  if (abs >= 10000) {
    const v = abs / 10000;
    return sign + '¥' +
      trim(v, v >= 100 ? 0 : v >= 10 ? 1 : 2) +
      '万';
  }

  return sign + '¥' +
    Math.round(abs).toLocaleString();
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

function hashText(
  text
) {
  let value =
    2166136261;

  const source =
    String(
      text ||
      ''
    );

  for (
    let i = 0;
    i <
    source.length;
    i++
  ) {
    value ^=
      source
        .charCodeAt(i);

    value =
      Math.imul(
        value,
        16777619
      );
  }

  return (
    value >>>
    0
  );
}

function isLeapYear(
  year
) {
  return (
    year % 400 ===
      0 ||
    (
      year % 4 ===
        0 &&
      year % 100 !==
        0
    )
  );
}

function dayOrdinal(
  time
) {
  const y =
    Math.max(
      1,
      Math.floor(
        Number(
          time.year
        ) ||
        1
      )
    );

  const m =
    clamp(
      Math.floor(
        Number(
          time.month
        ) ||
        1
      ),
      1,
      12
    );

  const d =
    Math.max(
      1,
      Math.floor(
        Number(
          time.day
        ) ||
        1
      )
    );

  const y0 =
    y -
    1;

  let days =
    y0 *
      365 +
    Math.floor(
      y0 /
      4
    ) -
    Math.floor(
      y0 /
      100
    ) +
    Math.floor(
      y0 /
      400
    );

  const monthDays = [
    31,
    isLeapYear(
      y
    )
      ? 29
      : 28,
    31,
    30,
    31,
    30,
    31,
    31,
    30,
    31,
    30,
    31
  ];

  for (
    let i = 0;
    i <
    m -
      1;
    i++
  ) {
    days +=
      monthDays[i];
  }

  return (
    days +
    d
  );
}

class ShopScene {
  constructor() {
    this.id =
      'shop';

    this.mode =
      'browse';

    this.detailPage =
      0;

    this.page =
      0;

    this.pageSize =
      3;

    this.districtId =
      'university';

    this.streetId =
      null;

    this.selectedListingKey =
      null;

    this.visitModeId =
      'standard';

    this.lastVisitResult =
      null;

    this.lastNegotiationResult =
      null;

    this.lastSyncOrdinal =
      null;

    this.cachedListings =
      [];

    this.cachedDistrictSummary =
      null;

    this.cachedMarketOverview =
      null;

    this.localButtons =
      [];

    this.viewH =
      780;

    this.navH =
      64;

    this.contentBottom =
      716;

    this.filters = {
      areaIndex:
        0,

      rentIndex:
        0,

      upfrontIndex:
        0,

      floorIndex:
        0,

      propertyTypeIndex:
        0,

      layoutIndex:
        0,

      requireExhaust:
        false,

      requireGas:
        false,

      requireThreePhase:
        false,

      riskIndex:
        0
    };

    this.sortIndex =
      0;
  }

  getLayout() {
    let width =
      DESIGN_W;

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

      width =
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

    return {
      width,
      height,
      navH:
        this.navH,
      contentBottom:
        this.contentBottom
    };
  }

  showToast(
    text
  ) {
    if (
      api &&
      typeof api.showToast ===
        'function'
    ) {
      api.showToast({
        title:
          String(
            text
          ),
        icon:
          'none'
      });
    }
  }

  resetViewState() {
    this.mode =
      'browse';

    this.detailPage =
      0;

    this.page =
      0;

    this.streetId =
      null;

    this.selectedListingKey =
      null;

    this.visitModeId =
      'standard';

    this.lastVisitResult =
      null;

    this.lastNegotiationResult =
      null;
  }

  enter(
    payload
  ) {
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

    Object.values(V43_PROPERTY_ICONS)
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

    V43_STOREFRONTS.forEach((asset, index) => {
      resourceManager
        .loadImage(
          'v43_storefront_' + index,
          asset,
          'v43-property-storefronts'
        )
        .catch(() => {});
    });

    resourceManager
      .loadImage(
        'v43_property_header',
        'assets/images/v32_home/home_background.jpg',
        'v43-property-storefronts'
      )
      .catch(() => {});

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
      DISTRICT_IDS
        .indexOf(
          requested
        ) !==
      -1
    ) {
      this.districtId =
        requested;
    }

    citySystem
      .setCurrentDistrict(
        this.districtId
      );

    this.resetViewState();

    this.syncMarket(
      true
    );

    this.refreshData();
  }

  exit() {
    this.localButtons =
      [];
  }

  update() {
    const ordinal =
      dayOrdinal(
        gameState
          .getTime()
      );

    if (
      ordinal !==
      this.lastSyncOrdinal
    ) {
      this.syncMarket(
        false
      );

      this.refreshData();
    }
  }

  syncMarket(
    force
  ) {
    const ordinal =
      dayOrdinal(
        gameState
          .getTime()
      );

    const state =
      propertyMarketSystem
        .getState();

    if (
      !state.initialized
    ) {
      const world =
        gameState
          .getWorld();

      const seed =
        hashText(
          String(
            world.currentCityId
          ) +
          ':' +
          gameState
            .getCityName()
        );

      propertyMarketSystem
        .reset({
          seed:
            seed ||
            20260912,

          currentDay:
            ordinal
        });

      propertyMarketSystem
        .initialize({
          currentDay:
            ordinal
        });
    } else if (
      ordinal >
      state.currentDay
    ) {
      propertyMarketSystem
        .advanceDays(
          ordinal -
          state.currentDay
        );
    } else if (
      ordinal <
      state.currentDay
    ) {
      const world =
        gameState
          .getWorld();

      propertyMarketSystem
        .reset({
          seed:
            hashText(
              String(
                world.currentCityId
              ) +
              ':' +
              gameState
                .getCityName()
            ),

          currentDay:
            ordinal
        });

      propertyMarketSystem
        .initialize({
          currentDay:
            ordinal
        });
    }

    this.lastSyncOrdinal =
      ordinal;

    return (
      force ||
      true
    );
  }

  getPropertyTypeName(
    id
  ) {
    if (!id) {
      return '不限铺型';
    }

    const item =
      propertyData
        .PROPERTY_TYPES
        .find(
          type =>
            type.id ===
            id
        );

    return item
      ? item.name
      : '不限铺型';
  }

  getLayoutName(
    id
  ) {
    if (!id) {
      return '不限户型';
    }

    const item =
      propertyData
        .LAYOUT_TYPES
        .find(
          layout =>
            layout.id ===
            id
        );

    return item
      ? item.name
      : '不限户型';
  }

  makeLiveListing(
    item
  ) {
    const depositPaymentCount =
      (
        Number(
          item.depositMonths
        ) ||
        0
      ) +
      (
        Number(
          item.paymentMonths
        ) ||
        1
      );

    const liveUpfrontCash =
      Math.max(
        0,
        Math.round(
          (
            Number(
              item.upfrontCash
            ) ||
            0
          ) +
          (
            (
              Number(
                item.askingMonthlyRent
              ) ||
              0
            ) -
            (
              Number(
                item.monthlyRent
              ) ||
              0
            )
          ) *
            depositPaymentCount +
          (
            (
              Number(
                item.askingTransferFee
              ) ||
              0
            ) -
            (
              Number(
                item.transferFee
              ) ||
              0
            )
          )
        )
      );

    return {
      ...item,

      competitorCount:
        Array.isArray(
          item.competingTenants
        )
          ? item
              .competingTenants
              .length
          : 0,

      liveUpfrontCash
    };
  }

  refreshData() {
    this.cachedDistrictSummary =
      propertyMarketSystem
        .getDistrictSummary(
          this.districtId
        );

    this.cachedMarketOverview =
      propertyMarketSystem
        .getMarketOverview();

    let list =
      propertyMarketSystem
        .getLiveListings({
          districtId:
            this.districtId,

          streetId:
            this.streetId ||
            undefined
        })
        .map(
          item =>
            this
              .makeLiveListing(
                item
              )
        );

    const area =
      AREA_PRESETS[
        this.filters
          .areaIndex
      ];

    const rent =
      RENT_PRESETS[
        this.filters
          .rentIndex
      ];

    const upfront =
      UPFRONT_PRESETS[
        this.filters
          .upfrontIndex
      ];

    const floor =
      FLOOR_OPTIONS[
        this.filters
          .floorIndex
      ];

    const typeId =
      PROPERTY_TYPE_OPTIONS[
        this.filters
          .propertyTypeIndex
      ];

    const layoutId =
      LAYOUT_OPTIONS[
        this.filters
          .layoutIndex
      ];

    const risk =
      RISK_OPTIONS[
        this.filters
          .riskIndex
      ];

    list =
      list.filter(
        item => {
          if (
            area.min != null &&
            item.grossArea <
              area.min
          ) {
            return false;
          }

          if (
            area.max != null &&
            item.grossArea >
              area.max
          ) {
            return false;
          }

          if (
            rent.max != null &&
            item.askingMonthlyRent >
              rent.max
          ) {
            return false;
          }

          if (
            upfront.max !=
              null &&
            item.liveUpfrontCash >
              upfront.max
          ) {
            return false;
          }

          if (
            floor !==
              '不限楼层' &&
            item.floor !==
              floor
          ) {
            return false;
          }

          if (
            typeId &&
            item.propertyTypeId !==
              typeId
          ) {
            return false;
          }

          if (
            layoutId &&
            item.layoutTypeId !==
              layoutId
          ) {
            return false;
          }

          if (
            this.filters
              .requireExhaust &&
            !item.exhaust
          ) {
            return false;
          }

          if (
            this.filters
              .requireGas &&
            !item.gas
          ) {
            return false;
          }

          if (
            this.filters
              .requireThreePhase &&
            !item.threePhase
          ) {
            return false;
          }

          if (
            risk.max != null &&
            item.riskLevel >
              risk.max
          ) {
            return false;
          }

          return true;
        }
      );

    const sort =
      SORT_MODES[
        this.sortIndex
      ];

    list.sort(
      (
        a,
        b
      ) => {
        const av =
          Number(
            a[
              sort.key
            ]
          ) ||
          0;

        const bv =
          Number(
            b[
              sort.key
            ]
          ) ||
          0;

        return sort.dir ===
          'desc'
          ? bv -
              av
          : av -
              bv;
      }
    );

    this.cachedListings =
      list;

    const maxPage =
      Math.max(
        0,
        Math.ceil(
          list.length /
          this.pageSize
        ) -
        1
      );

    this.page =
      clamp(
        this.page,
        0,
        maxPage
      );
  }

  getSelectedListing() {
    if (
      !this
        .selectedListingKey
    ) {
      return null;
    }

    const live =
      propertyMarketSystem
        .getLiveListings({
          districtId:
            this.districtId
        })
        .find(
          item =>
            item.marketKey ===
            this
              .selectedListingKey
        );

    return live
      ? this
          .makeLiveListing(
            live
          )
      : null;
  }

  getDistrictName(
    districtId
  ) {
    const profile =
      propertySystem
        .getDistrictProfile(
          districtId
        );

    return profile
      ? profile.name
      : districtId;
  }

  getStreetName(
    streetId
  ) {
    if (!streetId) {
      return '全部街道';
    }

    const street =
      propertySystem
        .getStreet(
          streetId
        );

    return street
      ? street.name
      : '全部街道';
  }

  clearButtons() {
    this.localButtons =
      [];
  }

  addButton(
    id,
    x,
    y,
    w,
    h
  ) {
    this.localButtons
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
        this.localButtons
          .length -
        1;

      i >=
      0;

      i--
    ) {
      const button =
        this.localButtons[i];

      if (
        x >=
          button.x &&
        x <=
          button.x +
            button.w &&
        y >=
          button.y &&
        y <=
          button.y +
            button.h
      ) {
        return button;
      }
    }

    return null;
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
    ctx.save();

    ctx.fillStyle =
      color ||
      COLORS.text;

    const readableSize =
      Math.max(
        4.8,
        Number(size) || 5.5
      );

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

    ctx.font =
      finalWeight +
      ' ' +
      readableSize +
      'px "Noto Sans SC","Microsoft YaHei",sans-serif';

    ctx.textAlign =
      align || 'left';

    ctx.textBaseline =
      'middle';

    if (
      readableSize >= 10 &&
      finalWeight === '900'
    ) {
      ctx.shadowColor =
        'rgba(0,0,0,0.12)';
      ctx.shadowBlur = 0.8;
    }

    ctx.fillText(
      String(text),
      x,
      y
    );

    ctx.restore();
  }

  drawIcon(
    ctx,
    name,
    x,
    y,
    size,
    fallback
  ) {
    const glossyMap = {
      rent: 'money',
      hot: 'target',
      event: 'bulletin'
    };

    const glossyName =
      glossyMap[name];

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

    const aliases = {
      area: 'area',
      frontage: 'frontage',
      exhaust: 'exhaust',
      gas: 'gas',
      power: 'power',
      competitor: 'competitor',
      filter: 'filter',
      sort: 'sort',
      lease: 'lease',
      floor: 'floor',
      layout: 'layout',
      warning: 'warning',
      broker: 'broker',
      landlord: 'landlord',
      drainage: 'drainage',
      grease: 'grease',
      fire: 'fire',
      depth: 'depth',
      new: 'new'
    };

    const key =
      aliases[name] ||
      name;

    const image =
      resourceManager.getImage(
        'property_icons_01'
      );

    const region =
      propertyIconAtlas.icons[
        key
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

    this.roundedRect(
      ctx,
      x,
      y,
      size,
      size,
      Math.max(
        4,
        size * 0.23
      ),
      '#EEF3F5'
    );

    this.text(
      ctx,
      fallback || '·',
      x + size / 2,
      y + size / 2,
      Math.max(
        5,
        size * 0.32
      ),
      COLORS.navy,
      '700',
      'center'
    );
  }

  drawHeader(
    ctx,
    title,
    subtitle,
    backId
  ) {
    const h = 66;

    const headerImage =
      resourceManager.getImage(
        'v43_property_header'
      );

    if (headerImage) {
      ctx.save();
      ctx.drawImage(
        headerImage,
        0,
        0,
        DESIGN_W,
        h
      );

      const overlay =
        ctx.createLinearGradient(
          0,
          0,
          DESIGN_W,
          0
        );

      overlay.addColorStop(
        0,
        'rgba(2,38,59,0.82)'
      );

      overlay.addColorStop(
        0.60,
        'rgba(2,46,69,0.62)'
      );

      overlay.addColorStop(
        1,
        'rgba(2,38,59,0.78)'
      );

      ctx.fillStyle =
        overlay;

      ctx.fillRect(
        0,
        0,
        DESIGN_W,
        h
      );

      ctx.restore();
    } else {
      ctx.fillStyle =
        COLORS.navy2;

      ctx.fillRect(
        0,
        0,
        DESIGN_W,
        h
      );
    }

    ctx.fillStyle =
      '#E6B94B';

    ctx.fillRect(
      0,
      h - 1,
      DESIGN_W,
      1
    );

    if (backId) {
      this.roundedRect(
        ctx,
        10,
        13,
        46,
        34,
        10,
        'rgba(3,55,80,0.88)',
        'rgba(255,255,255,0.30)'
      );

      this.text(
        ctx,
        '‹',
        33,
        30,
        20,
        '#FFE070',
        '800',
        'center'
      );

      this.addButton(
        backId,
        6,
        8,
        54,
        44
      );
    }

    const textX =
      backId
        ? 69
        : 15;

    this.text(
      ctx,
      title,
      textX,
      20,
      14.2,
      COLORS.white,
      '800'
    );

    this.text(
      ctx,
      subtitle || '',
      textX,
      43,
      5.3,
      '#EAF3F6',
      '600'
    );

    const moneyIcon =
      resourceManager.getImage(
        'v44_glossy_money'
      );

    if (moneyIcon) {
      ctx.drawImage(
        moneyIcon,
        292,
        9,
        24,
        24
      );
    }

    this.text(
      ctx,
      money(
        gameState
          .getPlayer()
          .cash
      ),
      377,
      19,
      10,
      '#FFE37A',
      '800',
      'right'
    );

    const time =
      gameState.getTime();

    this.text(
      ctx,
      '第' +
        time.year +
        '年 ' +
        time.month +
        '月' +
        time.day +
        '日',
      377,
      43,
      5.1,
      '#E1ECF0',
      '600',
      'right'
    );
  }

  drawDistrictTabs(
    ctx,
    y
  ) {
    const gap =
      4;

    const x =
      8;

    const w =
      (
        DESIGN_W -
        16 -
        gap *
          6
      ) /
      7;

    for (
      let i = 0;
      i <
      DISTRICT_IDS
        .length;
      i++
    ) {
      const id =
        DISTRICT_IDS[i];

      const selected =
        id ===
        this.districtId;

      this.roundedRect(
        ctx,
        x +
          i *
          (
            w +
            gap
          ),
        y,
        w,
        32,
        9,
        selected
          ? COLORS.gold
          : '#E9DFD1',
        selected
          ? '#D39431'
          : '#D6C8B8'
      );

      this.text(
        ctx,
        this
          .getDistrictName(
            id
          )
          .replace(
            '商业中心',
            '商中心'
          ),
        x +
          i *
          (
            w +
            gap
          ) +
          w /
          2,
        y +
          16,
        7,
        selected
          ? '#26343B'
          : COLORS.text,
        selected
          ? '700'
          : '600',
        'center'
      );

      this.addButton(
        'district:' +
          id,
        x +
          i *
          (
            w +
            gap
          ),
        y,
        w,
        32
      );
    }
  }

  drawStreetTabs(
    ctx,
    y
  ) {
    const streets =
      propertySystem
        .getStreets(
          this.districtId
        );

    const items = [
      {
        id:
          null,

        name:
          '全部'
      },

      ...streets
        .map(
          item => ({
            id:
              item.id,

            name:
              item.name
          })
        )
    ];

    const gap =
      4;

    const x =
      8;

    const w =
      (
        DESIGN_W -
        16 -
        gap *
          6
      ) /
      7;

    for (
      let i = 0;
      i <
      items.length;
      i++
    ) {
      const item =
        items[i];

      const selected =
        (
          item.id ||
          null
        ) ===
        (
          this.streetId ||
          null
        );

      this.roundedRect(
        ctx,
        x +
          i *
          (
            w +
            gap
          ),
        y,
        w,
        28,
        8,
        selected
          ? '#DDEBF2'
          : '#F8F2E8',
        selected
          ? '#8DB6C9'
          : '#DACFC0'
      );

      this.text(
        ctx,
        item.name
          .replace(
            '大道',
            '大道'
          ),
        x +
          i *
          (
            w +
            gap
          ) +
          w /
          2,
        y +
          14,
        6.5,
        selected
          ? COLORS.navy
          : COLORS.muted,
        selected
          ? '700'
          : '600',
        'center'
      );

      this.addButton(
        'street:' +
          (
            item.id ||
            'all'
          ),
        x +
          i *
          (
            w +
            gap
          ),
        y,
        w,
        28
      );
    }
  }

  drawSummary(
    ctx,
    y
  ) {
    const summary =
      this.cachedDistrictSummary;

    if (!summary) {
      return;
    }

    this.roundedRect(
      ctx,
      8,
      y,
      374,
      61,
      13,
      COLORS.panel,
      COLORS.line
    );

    const metrics = [
      [
        'new',
        '挂牌',
        summary.activeListingCount +
          '套',
        COLORS.navy
      ],
      [
        'rent',
        '均租',
        money(
          summary.averageAskingRent
        ),
        COLORS.red
      ],
      [
        'event',
        '均挂',
        summary.averageDaysOnMarket +
          '天',
        COLORS.blue
      ],
      [
        'hot',
        '最热',
        summary.hottestStreet
          ? summary.hottestStreet.name
          : '--',
        COLORS.orange
      ]
    ];

    for (
      let i = 0;
      i < metrics.length;
      i++
    ) {
      const x =
        16 +
        i * 92;

      if (i > 0) {
        ctx.fillStyle =
          '#E6DDD2';

        ctx.fillRect(
          x - 5,
          y + 12,
          1,
          37
        );
      }

      this.drawIcon(
        ctx,
        metrics[i][0],
        x,
        y + 14,
        19,
        ''
      );

      this.text(
        ctx,
        metrics[i][1],
        x + 25,
        y + 18,
        4.9,
        COLORS.muted,
        '700'
      );

      this.text(
        ctx,
        metrics[i][2],
        x + 25,
        y + 39,
        8.2,
        metrics[i][3],
        '800'
      );
    }
  }

  getDistrictEvents() {
    const overview =
      this
        .cachedMarketOverview;

    if (
      !overview ||
      !Array.isArray(
        overview
          .activeEvents
      )
    ) {
      return [];
    }

    return overview
      .activeEvents
      .filter(
        event =>
          event.districtId ===
            this.districtId ||
          (
            event.streetId &&
            propertySystem
              .getStreet(
                event.streetId
              ) &&
            propertySystem
              .getStreet(
                event.streetId
              )
              .districtId ===
              this.districtId
          )
      );
  }

  drawEventBar(
    ctx,
    y
  ) {
    const events =
      this
        .getDistrictEvents();

    this.roundedRect(
      ctx,
      8,
      y,
      374,
      36,
      11,
      events.length
        ? '#FFF0D6'
        : '#F1EBE2',
      events.length
        ? '#E4B564'
        : '#D8CDC0'
    );

    this.drawIcon(
      ctx,
      'event',
      14,
      y +
        7,
      22,
      '事'
    );

    if (
      events.length
    ) {
      const first =
        events[0];

      this.text(
        ctx,
        first.name,
        44,
        y +
          13,
        8,
        COLORS.text,
        '700'
      );

      this.text(
        ctx,
        '剩余 ' +
          Math.max(
            0,
            first.endDay -
              (
                this
                  .cachedMarketOverview
                  .currentDay ||
                first.startDay
              ) +
              1
          ) +
          ' 天',
        44,
        y +
          27,
        6.5,
        COLORS.orange,
        '600'
      );

      this.text(
        ctx,
        events.length >
          1
          ? '+' +
              (
                events.length -
                1
              ) +
              '个事件 ›'
          : '查看影响 ›',
        370,
        y +
          18,
        7,
        COLORS.navy,
        '700',
        'right'
      );
    } else {
      this.text(
        ctx,
        '当前商圈暂无大型市场事件',
        44,
        y +
          18,
        8,
        COLORS.muted,
        '600'
      );
    }

    this.addButton(
      'events',
      8,
      y,
      374,
      36
    );
  }

  drawToolbar(
    ctx,
    y
  ) {
    const activeFilters =
      this.countActiveFilters();

    this.roundedRect(
      ctx,
      8,
      y,
      118,
      34,
      10,
      activeFilters
        ? '#E7F0E8'
        : '#F8F2E8',
      activeFilters
        ? '#93BE9D'
        : '#D6C9B9'
    );

    this.drawIcon(
      ctx,
      'filter',
      14,
      y +
        7,
      20,
      '筛'
    );

    this.text(
      ctx,
      '筛选' +
        (
          activeFilters
            ? ' ' +
              activeFilters
            : ''
        ),
      43,
      y +
        17,
      8,
      COLORS.text,
      '700'
    );

    this.addButton(
      'filter',
      8,
      y,
      118,
      34
    );

    this.roundedRect(
      ctx,
      132,
      y,
      154,
      34,
      10,
      '#F8F2E8',
      '#D6C9B9'
    );

    this.drawIcon(
      ctx,
      'sort',
      139,
      y +
        7,
      20,
      '序'
    );

    this.text(
      ctx,
      SORT_MODES[
        this.sortIndex
      ].name,
      168,
      y +
        17,
      8,
      COLORS.text,
      '700'
    );

    this.text(
      ctx,
      '›',
      277,
      y +
        17,
      13,
      COLORS.muted,
      '700',
      'center'
    );

    this.addButton(
      'sort',
      132,
      y,
      154,
      34
    );

    this.roundedRect(
      ctx,
      292,
      y,
      90,
      34,
      10,
      COLORS.navy,
      '#244A60'
    );

    this.text(
      ctx,
      this.cachedListings
        .length +
        '套',
      337,
      y +
        17,
      9,
      COLORS.white,
      '700',
      'center'
    );
  }

  countActiveFilters() {
    let count =
      0;

    [
      'areaIndex',
      'rentIndex',
      'upfrontIndex',
      'floorIndex',
      'propertyTypeIndex',
      'layoutIndex',
      'riskIndex'
    ]
      .forEach(
        key => {
          if (
            this.filters[
              key
            ] >
            0
          ) {
            count++;
          }
        }
      );

    if (
      this.filters
        .requireExhaust
    ) {
      count++;
    }

    if (
      this.filters
        .requireGas
    ) {
      count++;
    }

    if (
      this.filters
        .requireThreePhase
    ) {
      count++;
    }

    return count;
  }

  drawBadge(
    ctx,
    text,
    x,
    y,
    fill,
    color
  ) {
    const w =
      Math.max(
        32,
        text.length *
          7 +
          12
      );

    this.roundedRect(
      ctx,
      x,
      y,
      w,
      18,
      6,
      fill
    );

    this.text(
      ctx,
      text,
      x +
        w /
        2,
      y +
        9,
      6.5,
      color,
      '700',
      'center'
    );

    return w;
  }

  drawHardwareMini(
    ctx,
    item,
    x,
    y
  ) {
    const hardware = [
      [
        'exhaust',
        '排烟',
        item.exhaust
      ],
      [
        'gas',
        '燃气',
        item.gas
      ],
      [
        'power',
        '三相',
        item.threePhase
      ]
    ];

    for (
      let i = 0;
      i < hardware.length;
      i++
    ) {
      const cellX =
        x +
        i * 45;

      const ok =
        Boolean(
          hardware[i][2]
        );

      this.roundedRect(
        ctx,
        cellX,
        y,
        41,
        19,
        8,
        ok
          ? '#EAF7F1'
          : '#FFF0ED',
        ok
          ? '#B8DFCD'
          : '#E9C2BC'
      );

      this.drawIcon(
        ctx,
        hardware[i][0],
        cellX + 4,
        y + 4,
        11,
        ''
      );

      this.text(
        ctx,
        hardware[i][1],
        cellX + 18,
        y + 9.5,
        4.2,
        ok
          ? COLORS.green
          : COLORS.red,
        '800'
      );

      this.text(
        ctx,
        ok
          ? '✓'
          : '×',
        cellX + 36,
        y + 9.5,
        4.8,
        ok
          ? COLORS.green
          : COLORS.red,
        '800',
        'center'
      );
    }
  }

  drawListingCard(
    ctx,
    item,
    x,
    y,
    w,
    h
  ) {
    const hot =
      item.watchers >= 4 ||
      item.competitorCount >= 2;

    const isNew =
      item.daysOnMarket <= 3;

    const isCut =
      item.priceChangeRate < -0.01;

    this.roundedRect(
      ctx,
      x,
      y,
      w,
      h,
      13,
      COLORS.panel,
      '#D7CABC'
    );

    const imageIndex =
      Math.abs(
        String(item.marketKey || item.address)
          .split('')
          .reduce(
            (sum, ch) =>
              sum + ch.charCodeAt(0),
            0
          )
      ) %
      5;

    const photo =
      resourceManager.getImage(
        'v43_storefront_' +
        imageIndex
      );

    if (photo) {
      ctx.save();
      this.roundedPath(
        ctx,
        x + 8,
        y + 8,
        105,
        h - 16,
        9
      );
      ctx.clip();
      ctx.drawImage(
        photo,
        x + 8,
        y + 8,
        105,
        h - 16
      );
      ctx.restore();
    }

    let badgeX =
      x + 14;

    if (isNew) {
      badgeX +=
        this.drawBadge(
          ctx,
          '新上架',
          badgeX,
          y + 10,
          '#E4F0E8',
          COLORS.green
        ) + 4;
    }

    if (isCut) {
      badgeX +=
        this.drawBadge(
          ctx,
          '租金低',
          badgeX,
          y + 10,
          '#E7F2EA',
          COLORS.green
        ) + 4;
    }

    if (hot) {
      this.drawBadge(
        ctx,
        '多人关注',
        badgeX,
        y + 10,
        '#FFF0DD',
        COLORS.orange
      );
    }

    const tx =
      x + 123;

    this.text(
      ctx,
      item.address,
      tx,
      y + 22,
      9.2,
      COLORS.text,
      '800'
    );

    this.text(
      ctx,
      item.propertyTypeName +
        ' · ' +
        item.layoutTypeName +
        ' · ' +
        item.floor,
      tx,
      y + 39,
      5.2,
      COLORS.muted,
      '600'
    );

    this.text(
      ctx,
      money(
        item.askingMonthlyRent
      ),
      x + w - 12,
      y + 21,
      11.5,
      COLORS.red,
      '800',
      'right'
    );

    this.text(
      ctx,
      '/月',
      x + w - 12,
      y + 39,
      5.2,
      COLORS.muted,
      '600',
      'right'
    );

    const metricY =
      y + 50;

    const metrics = [
      ['area', item.grossArea + '㎡'],
      ['frontage', item.frontage + 'm'],
      ['competitor', item.competitorCount + '人']
    ];

    for (
      let i = 0;
      i < metrics.length;
      i++
    ) {
      const mx =
        tx + i * 62;
      this.drawIcon(
        ctx,
        metrics[i][0],
        mx,
        metricY,
        17,
        ''
      );
      this.text(
        ctx,
        metrics[i][1],
        mx + 21,
        metricY + 8.5,
        5.7,
        COLORS.text,
        '700'
      );
    }

    this.drawHardwareMini(
      ctx,
      item,
      tx,
      y + 74
    );

    this.text(
      ctx,
      '入场约 ' +
        money(
          item.liveUpfrontCash
        ),
      tx,
      y + h - 15,
      5.1,
      COLORS.red,
      '700'
    );

    this.text(
      ctx,
      '详情 ›',
      x + w - 12,
      y + h - 15,
      6.4,
      COLORS.navy,
      '800',
      'right'
    );

    this.addButton(
      'listing:' +
        item.marketKey,
      x,
      y,
      w,
      h
    );
  }

  drawPager(
    ctx,
    y
  ) {
    const totalPages =
      Math.max(
        1,
        Math.ceil(
          this
            .cachedListings
            .length /
          this.pageSize
        )
      );

    this.roundedRect(
      ctx,
      8,
      y,
      76,
      34,
      10,
      this.page >
        0
        ? '#E7EDF0'
        : '#EEE9E1',
      '#D2C8BB'
    );

    this.text(
      ctx,
      '‹ 上一页',
      46,
      y +
        17,
      8,
      this.page >
        0
        ? COLORS.navy
        : '#AAA198',
      '700',
      'center'
    );

    this.addButton(
      'page:prev',
      8,
      y,
      76,
      34
    );

    this.text(
      ctx,
      (
        this.page +
        1
      ) +
        ' / ' +
        totalPages,
      195,
      y +
        17,
      8,
      COLORS.muted,
      '700',
      'center'
    );

    this.roundedRect(
      ctx,
      306,
      y,
      76,
      34,
      10,
      this.page <
        totalPages -
          1
        ? '#E7EDF0'
        : '#EEE9E1',
      '#D2C8BB'
    );

    this.text(
      ctx,
      '下一页 ›',
      344,
      y +
        17,
      8,
      this.page <
        totalPages -
          1
        ? COLORS.navy
        : '#AAA198',
      '700',
      'center'
    );

    this.addButton(
      'page:next',
      306,
      y,
      76,
      34
    );
  }

  renderBrowse(
    ctx
  ) {
    this.drawHeader(
      ctx,
      this
        .getDistrictName(
          this.districtId
        ) +
        ' · 房源市场',

      '这里只负责找铺；已签约门店回“门店”页面管理',
      'market:back'
    );

    this.drawDistrictTabs(
      ctx,
      75
    );

    this.drawStreetTabs(
      ctx,
      113
    );

    this.drawSummary(
      ctx,
      149
    );

    this.drawEventBar(
      ctx,
      218
    );

    this.drawToolbar(
      ctx,
      262
    );

    const listTop =
      305;

    const availableH =
      this.contentBottom -
      listTop -
      45;

    const cardGap =
      7;

    const cardH =
      clamp(
        Math.floor(
          (
            availableH -
            cardGap *
              2
          ) /
          3
        ),
        100,
        121
      );

    const start =
      this.page *
      this.pageSize;

    const visible =
      this
        .cachedListings
        .slice(
          start,
          start +
            this.pageSize
        );

    if (
      visible.length ===
      0
    ) {
      this.roundedRect(
        ctx,
        8,
        listTop,
        374,
        Math.min(
          170,
          availableH
        ),
        14,
        COLORS.panel,
        COLORS.line
      );

      this.drawIcon(
        ctx,
        'filter',
        170,
        listTop +
          27,
        50,
        '筛'
      );

      this.text(
        ctx,
        '没有符合当前条件的挂牌',
        195,
        listTop +
          97,
        12,
        COLORS.text,
        '700',
        'center'
      );

      this.text(
        ctx,
        '可以放宽筛选，或等待新的房源进入市场',
        195,
        listTop +
          124,
        8,
        COLORS.muted,
        '500',
        'center'
      );
    } else {
      for (
        let i = 0;
        i <
        visible.length;
        i++
      ) {
        this.drawListingCard(
          ctx,
          visible[i],
          8,
          listTop +
            i *
              (
                cardH +
                cardGap
              ),
          374,
          cardH
        );
      }
    }

    this.drawPager(
      ctx,
      this.contentBottom -
        39
    );
  }

  drawFilterRow(
    ctx,
    id,
    icon,
    label,
    value,
    y
  ) {
    this.roundedRect(
      ctx,
      12,
      y,
      366,
      43,
      11,
      COLORS.panel,
      COLORS.line
    );

    this.drawIcon(
      ctx,
      icon,
      19,
      y +
        9,
      25,
      label.slice(
        0,
        1
      )
    );

    this.text(
      ctx,
      label,
      55,
      y +
        14,
      7,
      COLORS.muted,
      '600'
    );

    this.text(
      ctx,
      value,
      55,
      y +
        30,
      9,
      COLORS.text,
      '700'
    );

    this.text(
      ctx,
      '点击切换 ›',
      365,
      y +
        22,
      7,
      COLORS.navy,
      '700',
      'right'
    );

    this.addButton(
      id,
      12,
      y,
      366,
      43
    );
  }

  renderFilters(
    ctx
  ) {
    this.drawHeader(
      ctx,
      '筛选房源',
      '筛选不会冻结市场，时间推进后结果仍会变化',
      'filter:back'
    );

    let y =
      77;

    const rows = [
      [
        'filter:area',
        'area',
        '面积',
        AREA_PRESETS[
          this.filters
            .areaIndex
        ].name
      ],

      [
        'filter:rent',
        'rent',
        '月租上限',
        RENT_PRESETS[
          this.filters
            .rentIndex
        ].name
      ],

      [
        'filter:upfront',
        'lease',
        '签约前资金',
        UPFRONT_PRESETS[
          this.filters
            .upfrontIndex
        ].name
      ],

      [
        'filter:floor',
        'floor',
        '楼层',
        FLOOR_OPTIONS[
          this.filters
            .floorIndex
        ]
      ],

      [
        'filter:type',
        'frontage',
        '铺型',
        this
          .getPropertyTypeName(
            PROPERTY_TYPE_OPTIONS[
              this.filters
                .propertyTypeIndex
            ]
          )
      ],

      [
        'filter:layout',
        'layout',
        '户型',
        this
          .getLayoutName(
            LAYOUT_OPTIONS[
              this.filters
                .layoutIndex
            ]
          )
      ],

      [
        'filter:risk',
        'warning',
        '最大风险',
        RISK_OPTIONS[
          this.filters
            .riskIndex
        ].name
      ]
    ];

    for (
      let i = 0;
      i <
      rows.length;
      i++
    ) {
      this.drawFilterRow(
        ctx,
        rows[i][0],
        rows[i][1],
        rows[i][2],
        rows[i][3],
        y
      );

      y +=
        48;
    }

    const toggles = [
      [
        'filter:exhaust',
        'exhaust',
        '必须可排烟',
        this.filters
          .requireExhaust
      ],

      [
        'filter:gas',
        'gas',
        '必须有燃气',
        this.filters
          .requireGas
      ],

      [
        'filter:power',
        'power',
        '必须有三相电',
        this.filters
          .requireThreePhase
      ]
    ];

    const toggleY =
      y +
      2;

    const w =
      118;

    for (
      let i = 0;
      i <
      toggles.length;
      i++
    ) {
      const x =
        12 +
        i *
          126;

      const on =
        toggles[i][3];

      this.roundedRect(
        ctx,
        x,
        toggleY,
        w,
        48,
        11,
        on
          ? '#E4F1E8'
          : COLORS.panel,
        on
          ? '#8DB89B'
          : COLORS.line
      );

      this.drawIcon(
        ctx,
        toggles[i][1],
        x +
          8,
        toggleY +
          11,
        25,
        '✓'
      );

      this.text(
        ctx,
        toggles[i][2],
        x +
          39,
        toggleY +
          18,
        7,
        COLORS.text,
        '700'
      );

      this.text(
        ctx,
        on
          ? '已要求'
          : '不限',
        x +
          39,
        toggleY +
          34,
        6.5,
        on
          ? COLORS.green
          : COLORS.muted,
        '600'
      );

      this.addButton(
        toggles[i][0],
        x,
        toggleY,
        w,
        48
      );
    }

    const actionY =
      Math.min(
        this.contentBottom -
          50,
        toggleY +
          61
      );

    this.roundedRect(
      ctx,
      12,
      actionY,
      112,
      38,
      11,
      '#ECE5DB',
      '#D4C8BA'
    );

    this.text(
      ctx,
      '重置筛选',
      68,
      actionY +
        19,
      8,
      COLORS.muted,
      '700',
      'center'
    );

    this.addButton(
      'filter:reset',
      12,
      actionY,
      112,
      38
    );

    this.roundedRect(
      ctx,
      136,
      actionY,
      242,
      38,
      11,
      COLORS.gold,
      '#D49434'
    );

    this.text(
      ctx,
      '查看 ' +
        this
          .cachedListings
          .length +
        ' 套挂牌',
      257,
      actionY +
        19,
      9,
      '#29343A',
      '700',
      'center'
    );

    this.addButton(
      'filter:apply',
      136,
      actionY,
      242,
      38
    );
  }

  renderEvents(
    ctx
  ) {
    this.drawHeader(
      ctx,
      '商圈市场事件',
      this
        .getDistrictName(
          this.districtId
        ) +
        ' · 事件会真实改变客流、租金和找铺竞争',
      'events:back'
    );

    const events =
      this
        .getDistrictEvents();

    if (
      events.length ===
      0
    ) {
      this.roundedRect(
        ctx,
        12,
        87,
        366,
        160,
        15,
        COLORS.panel,
        COLORS.line
      );

      this.drawIcon(
        ctx,
        'event',
        167,
        112,
        56,
        '事'
      );

      this.text(
        ctx,
        '当前没有大型事件',
        195,
        190,
        12,
        COLORS.text,
        '700',
        'center'
      );

      this.text(
        ctx,
        '市场仍会因NPC租赁、挂牌周期和房东行为变化',
        195,
        218,
        7.5,
        COLORS.muted,
        '500',
        'center'
      );

      return;
    }

    for (
      let i = 0;
      i <
      events.length &&
      i <
        6;
      i++
    ) {
      const event =
        events[i];

      const y =
        80 +
        i *
          92;

      this.roundedRect(
        ctx,
        12,
        y,
        366,
        82,
        13,
        COLORS.panel,
        '#E3C58A'
      );

      this.drawIcon(
        ctx,
        'event',
        22,
        y +
          14,
        31,
        '事'
      );

      this.text(
        ctx,
        event.name,
        63,
        y +
          22,
        11,
        COLORS.text,
        '700'
      );

      this.text(
        ctx,
        event.description,
        63,
        y +
          43,
        6.7,
        COLORS.muted,
        '500'
      );

      this.text(
        ctx,
        '客流×' +
          event.trafficFactor
            .toFixed(
              2
            ) +
          '  租金压力×' +
          event.rentPressure
            .toFixed(
              2
            ) +
          '  NPC需求×' +
          event.npcDemandFactor
            .toFixed(
              2
            ),
        63,
        y +
          63,
        6.5,
        COLORS.orange,
        '700'
      );

      this.text(
        ctx,
        '至第' +
          event.endDay +
          '天',
        365,
        y +
          22,
        6.5,
        COLORS.muted,
        '600',
        'right'
      );
    }
  }

  drawDetailMetric(
    ctx,
    icon,
    label,
    value,
    x,
    y,
    w
  ) {
    this.roundedRect(
      ctx,
      x,
      y,
      w,
      48,
      10,
      COLORS.panel2
    );

    this.drawIcon(
      ctx,
      icon,
      x +
        7,
      y +
        12,
      24,
      label.slice(
        0,
        1
      )
    );

    this.text(
      ctx,
      label,
      x +
        38,
      y +
        14,
      6.5,
      COLORS.muted,
      '600'
    );

    this.text(
      ctx,
      value,
      x +
        38,
      y +
        33,
      9,
      COLORS.text,
      '700'
    );
  }

  drawBoolCell(
    ctx,
    icon,
    label,
    value,
    x,
    y
  ) {
    const w =
      57;

    this.roundedRect(
      ctx,
      x,
      y,
      w,
      50,
      10,
      value
        ? '#E9F2EB'
        : '#F2E7E3',
      value
        ? '#A1C2AA'
        : '#D7B1A8'
    );

    this.drawIcon(
      ctx,
      icon,
      x +
        17,
      y +
        5,
      24,
      label.slice(
        0,
        1
      )
    );

    this.text(
      ctx,
      label,
      x +
        w /
        2,
      y +
        37,
      6,
      value
        ? COLORS.green
        : COLORS.red,
      '700',
      'center'
    );

    this.text(
      ctx,
      value
        ? '✓'
        : '×',
      x +
        47,
      y +
        12,
      8,
      value
        ? COLORS.green
        : COLORS.red,
      '700',
      'center'
    );
  }

  renderDetailPageOne(
    ctx,
    item
  ) {
    const y0 = 76;

    this.roundedRect(
      ctx,
      10,
      y0,
      370,
      128,
      14,
      COLORS.panel,
      COLORS.line
    );

    const imageIndex =
      Math.abs(
        String(item.marketKey || item.address)
          .split('')
          .reduce(
            (sum, ch) =>
              sum + ch.charCodeAt(0),
            0
          )
      ) %
      5;

    const photo =
      resourceManager.getImage(
        'v43_storefront_' +
        imageIndex
      );

    if (photo) {
      ctx.save();
      this.roundedPath(
        ctx,
        18,
        y0 + 8,
        136,
        112,
        10
      );
      ctx.clip();
      ctx.drawImage(
        photo,
        18,
        y0 + 8,
        136,
        112
      );
      ctx.restore();
    }

    this.text(
      ctx,
      item.address,
      166,
      y0 + 21,
      12.5,
      COLORS.text,
      '800'
    );

    this.text(
      ctx,
      item.propertyTypeName +
        ' · ' +
        item.layoutTypeName +
        ' · ' +
        item.floor,
      166,
      y0 + 42,
      5.5,
      COLORS.muted,
      '600'
    );

    this.text(
      ctx,
      money(
        item.askingMonthlyRent
      ) +
        '/月',
      366,
      y0 + 22,
      14,
      COLORS.red,
      '800',
      'right'
    );

    this.text(
      ctx,
      '签约前约 ' +
        money(
          item.liveUpfrontCash
        ),
      366,
      y0 + 45,
      5.5,
      COLORS.orange,
      '700',
      'right'
    );

    this.text(
      ctx,
      '挂牌 ' +
        item.daysOnMarket +
        '天 · 关注 ' +
        item.watchers +
        ' · ' +
        item.competitorCount +
        '个竞争者',
      166,
      y0 + 66,
      5.4,
      COLORS.muted,
      '600'
    );

    const fastMetrics = [
      ['预算友好', item.liveUpfrontCash <= 80000 ? '高' : '中'],
      ['堂食能力', item.seatEstimate + '席'],
      ['外卖潜力', item.riderAccess >= 60 ? '高' : '中'],
      ['改造难度', item.riskLevel <= 1 ? '低' : '中']
    ];

    for (
      let i = 0;
      i < 4;
      i++
    ) {
      const mx =
        166 + (i % 2) * 100;
      const my =
        y0 + 83 + Math.floor(i / 2) * 20;

      this.text(
        ctx,
        fastMetrics[i][0],
        mx,
        my,
        4.6,
        COLORS.muted,
        '600'
      );

      this.text(
        ctx,
        fastMetrics[i][1],
        mx + 61,
        my,
        5.4,
        i === 3
          ? COLORS.orange
          : COLORS.green,
        '800'
      );
    }

    const gridY = 214;
    const metricW = 116;

    this.drawDetailMetric(ctx, 'area', '建筑面积', item.grossArea + '㎡', 10, gridY, metricW);
    this.drawDetailMetric(ctx, 'layout', '可用面积', item.usableArea + '㎡', 137, gridY, metricW);
    this.drawDetailMetric(ctx, 'floor', '估算座位', item.seatEstimate + '席', 264, gridY, metricW);
    this.drawDetailMetric(ctx, 'frontage', '门面宽', item.frontage + 'm', 10, gridY + 57, metricW);
    this.drawDetailMetric(ctx, 'depth', '进深', item.depth + 'm', 137, gridY + 57, metricW);
    this.drawDetailMetric(ctx, 'layout', '层高', item.ceilingHeight + 'm', 264, gridY + 57, metricW);

    this.roundedRect(
      ctx,
      10,
      gridY + 119,
      370,
      77,
      13,
      COLORS.panel,
      COLORS.line
    );

    this.text(
      ctx,
      '餐饮硬件条件',
      22,
      gridY + 136,
      7.5,
      COLORS.text,
      '800'
    );

    const boolY =
      gridY + 145;

    const bools = [
      ['exhaust', '排烟', item.exhaust],
      ['gas', '燃气', item.gas],
      ['power', '三相电', item.threePhase],
      ['drainage', '排水', item.drainage],
      ['grease', '隔油', item.greaseTrap],
      ['fire', '消防', item.fireSprinkler]
    ];

    for (
      let i = 0;
      i < bools.length;
      i++
    ) {
      this.drawBoolCell(
        ctx,
        bools[i][0],
        bools[i][1],
        bools[i][2],
        16 + i * 61,
        boolY
      );
    }

    const utilityY =
      gridY + 207;

    this.roundedRect(
      ctx,
      10,
      utilityY,
      370,
      90,
      13,
      COLORS.panel,
      COLORS.line
    );

    this.text(
      ctx,
      '经营能力评估',
      22,
      utilityY + 17,
      7.5,
      COLORS.text,
      '800'
    );

    this.text(
      ctx,
      '建议厨房 ' +
        item.kitchenSuggestedArea +
        '㎡ · 堂食 ' +
        item.diningSuggestedArea +
        '㎡ · 电容量 ' +
        item.electricCapacityKw +
        'kW',
      22,
      utilityY + 39,
      5.2,
      COLORS.text,
      '600'
    );

    this.text(
      ctx,
      '可见度 ' +
        item.visibility +
        ' · 停车 ' +
        item.parkingScore +
        ' · 骑手便利 ' +
        item.riderAccess +
        ' · 卸货 ' +
        item.loadingAccess,
      22,
      utilityY + 60,
      5.2,
      COLORS.text,
      '600'
    );

    this.text(
      ctx,
      '水压 ' +
        item.waterPressure +
        ' · 夜间容忍 ' +
        item.noiseTolerance +
        ' · 独立卫生间 ' +
        (
          item.independentToilet
            ? '有'
            : '无'
        ),
      22,
      utilityY + 78,
      5.2,
      COLORS.text,
      '600'
    );
  }

  renderDetailPageTwo(
    ctx,
    item
  ) {
    const y0 =
      77;

    this.roundedRect(
      ctx,
      10,
      y0,
      370,
      151,
      14,
      COLORS.panel,
      COLORS.line
    );

    this.text(
      ctx,
      '租约与入场成本',
      22,
      y0 +
        20,
      11,
      COLORS.text,
      '700'
    );

    const rows = [
      [
        '当前月租',
        money(
          item.askingMonthlyRent
        )
      ],

      [
        '物业费',
        money(
          item.propertyFee
        ) +
          '/月'
      ],

      [
        '押金/付款',
        item.depositMonths +
          '个月押金 · ' +
          item.paymentCycleName
      ],

      [
        '免租期/租期',
        item.freeRentDays +
          '天 · ' +
          item.leaseYears +
          '年'
      ],

      [
        '年递增',
        percent(
          item.annualIncrease
        )
      ],

      [
        '转让费',
        money(
          item.askingTransferFee
        )
      ],

      [
        '装修状态',
        item.renovationLevel +
          ' · 预计' +
          money(
            item.renovationEstimate
          )
      ]
    ];

    for (
      let i = 0;
      i <
      rows.length;
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
          180;

      const y =
        y0 +
        46 +
        row *
          27;

      this.text(
        ctx,
        rows[i][0],
        x,
        y,
        6.5,
        COLORS.muted,
        '600'
      );

      this.text(
        ctx,
        rows[i][1],
        x +
          58,
        y,
        7.3,
        COLORS.text,
        '700'
      );
    }

    const peopleY =
      239;

    this.roundedRect(
      ctx,
      10,
      peopleY,
      370,
      96,
      14,
      COLORS.panel,
      COLORS.line
    );

    this.drawIcon(
      ctx,
      'landlord',
      21,
      peopleY +
        13,
      30,
      '东'
    );

    this.text(
      ctx,
      '房东',
      61,
      peopleY +
        18,
      7,
      COLORS.muted,
      '600'
    );

    this.text(
      ctx,
      item.landlordName,
      61,
      peopleY +
        38,
      10,
      COLORS.text,
      '700'
    );

    this.text(
      ctx,
      '议价度 ' +
        item.landlordNegotiation +
        ' · 续租风险 ' +
        item.landlordRenewalRisk,
      61,
      peopleY +
        59,
      7,
      COLORS.muted,
      '600'
    );

    this.drawIcon(
      ctx,
      'broker',
      207,
      peopleY +
        13,
      30,
      '中'
    );

    this.text(
      ctx,
      '中介',
      247,
      peopleY +
        18,
      7,
      COLORS.muted,
      '600'
    );

    this.text(
      ctx,
      item.brokerName,
      247,
      peopleY +
        38,
      10,
      COLORS.text,
      '700'
    );

    this.text(
      ctx,
      item.brokerAgency,
      247,
      peopleY +
        59,
      6.5,
      COLORS.muted,
      '600'
    );

    const riskY =
      346;

    this.roundedRect(
      ctx,
      10,
      riskY,
      370,
      111,
      14,
      COLORS.panel,
      item.riskLevel >
        1
        ? '#D8A79D'
        : COLORS.line
    );

    this.drawIcon(
      ctx,
      'warning',
      20,
      riskY +
        12,
      29,
      '险'
    );

    this.text(
      ctx,
      '风险与历史',
      59,
      riskY +
        20,
      10,
      COLORS.text,
      '700'
    );

    this.text(
      ctx,
      '前业态：' +
        item.previousBusiness +
        ' · 空置' +
        item.vacantMonths +
        '个月 · ' +
        item.vacancyReason,
      22,
      riskY +
        49,
      7,
      COLORS.muted,
      '600'
    );

    const risks =
      Array.isArray(
        item.risks
      )
        ? item.risks
        : [];

    this.text(
      ctx,
      risks.length
        ? risks
            .map(
              risk =>
                risk.name
            )
            .join(
              ' / '
            )
        : '未发现明确硬伤',
      22,
      riskY +
        72,
      7.2,
      item.riskLevel >
        1
        ? COLORS.red
        : COLORS.green,
      '700'
    );

    this.text(
      ctx,
      '预计整改 ' +
        money(
          item.riskRepairCost
        ) +
        ' · 风险等级 ' +
        item.riskLevel,
      22,
      riskY +
        94,
      7,
      COLORS.muted,
      '600'
    );

    const competitionY =
      468;

    this.roundedRect(
      ctx,
      10,
      competitionY,
      370,
      112,
      14,
      COLORS.panel,
      COLORS.line
    );

    this.drawIcon(
      ctx,
      'competitor',
      20,
      competitionY +
        12,
      29,
      '竞'
    );

    this.text(
      ctx,
      '当前找铺竞争',
      59,
      competitionY +
        20,
      10,
      COLORS.text,
      '700'
    );

    this.text(
      ctx,
      '关注 ' +
        item.watchers +
        ' · 正式竞争者 ' +
        item.competitorCount,
      356,
      competitionY +
        20,
      7,
      COLORS.orange,
      '700',
      'right'
    );

    const tenants =
      Array.isArray(
        item.competingTenants
      )
        ? item.competingTenants
        : [];

    for (
      let i = 0;
      i <
      Math.min(
        tenants.length,
        3
      );
      i++
    ) {
      const tenant =
        tenants[i];

      this.text(
        ctx,
        '• ' +
          tenant.name +
          '｜' +
          tenant.archetypeName +
          '｜预算 ' +
          money(
            tenant.budget
          ),
        23,
        competitionY +
          48 +
          i *
            19,
        6.8,
        COLORS.text,
        '600'
      );
    }

    if (
      tenants.length ===
      0
    ) {
      this.text(
        ctx,
        '当前没有明确竞争者，但市场仍可能随时间新增NPC',
        23,
        competitionY +
          57,
        7,
        COLORS.muted,
        '600'
      );
    }

    this.text(
      ctx,
      '适合：' +
        (
          item.suitableFor
            .length
            ? item.suitableFor
                .join(
                  ' / '
                )
            : '需自行评估'
        ),
      22,
      competitionY +
        94,
      7,
      COLORS.green,
      '700'
    );
  }

  renderDetail(
    ctx
  ) {
    const item =
      this
        .getSelectedListing();

    if (!item) {
      this.mode =
        'browse';

      this.refreshData();

      this.renderBrowse(
        ctx
      );

      return;
    }

    this.drawHeader(
      ctx,
      '房源详情',
      item.address +
        ' · 实时挂牌数据',
      'detail:back'
    );

    if (
      this.detailPage ===
      0
    ) {
      this.renderDetailPageOne(
        ctx,
        item
      );
    } else {
      this.renderDetailPageTwo(
        ctx,
        item
      );
    }

    const actionY =
      this.contentBottom -
      48;

    this.roundedRect(
      ctx,
      10,
      actionY,
      86,
      38,
      11,
      '#E9E2D8',
      '#D3C6B7'
    );

    this.text(
      ctx,
      this.detailPage ===
        0
        ? '租约/风险 ›'
        : '‹ 铺面条件',
      53,
      actionY +
        19,
      7.5,
      COLORS.navy,
      '700',
      'center'
    );

    this.addButton(
      'detail:page',
      10,
      actionY,
      86,
      38
    );

    this.roundedRect(
      ctx,
      105,
      actionY,
      126,
      38,
      11,
      COLORS.navy,
      '#244A60'
    );

    this.text(
      ctx,
      '联系中介',
      168,
      actionY +
        19,
      8,
      COLORS.white,
      '700',
      'center'
    );

    this.addButton(
      'detail:broker',
      105,
      actionY,
      126,
      38
    );

    this.roundedRect(
      ctx,
      240,
      actionY,
      140,
      38,
      11,
      COLORS.gold,
      '#D49434'
    );

    const visit =
      propertyVisitSystem
        .getVisit(
          item.marketKey
        );

    this.text(
      ctx,
      visit
        ? '查看勘察报告'
        : '预约实地看铺',
      310,
      actionY +
        19,
      8,
      '#26343B',
      '700',
      'center'
    );

    this.addButton(
      'detail:visit',
      240,
      actionY,
      140,
      38
    );
  }


  drawVisitOption(
    ctx,
    modeId,
    y
  ) {
    const quote =
      propertyVisitSystem
        .getDynamicVisitQuote(
          this.selectedListingKey,
          modeId
        );

    if (!quote) {
      return;
    }

    const selected =
      this.visitModeId ===
      modeId;

    this.roundedRect(
      ctx,
      12,
      y,
      366,
      78,
      13,
      selected
        ? '#FFF0D6'
        : COLORS.panel,
      selected
        ? '#E2AE52'
        : COLORS.line,
      selected
        ? 1.5
        : 1
    );

    this.text(
      ctx,
      quote.name,
      24,
      y + 20,
      11,
      COLORS.text,
      '700'
    );

    this.text(
      ctx,
      quote.description,
      24,
      y + 41,
      6.8,
      COLORS.muted,
      '500'
    );

    this.text(
      ctx,
      '预计 ' +
        quote.hours +
        '小时 · ' +
        money(
          quote.cost
        ) +
        ' · 核验率 ' +
        Math.round(
          quote.accuracy *
          100
        ) +
        '%',
      24,
      y + 61,
      7.2,
      selected
        ? COLORS.orange
        : COLORS.navy,
      '700'
    );

    this.text(
      ctx,
      selected
        ? '已选择'
        : '选择 ›',
      363,
      y + 20,
      7.5,
      selected
        ? COLORS.orange
        : COLORS.navy,
      '700',
      'right'
    );

    this.addButton(
      'visit:mode:' +
        modeId,
      12,
      y,
      366,
      78
    );
  }

  renderVisitReport(
    ctx,
    visit
  ) {
    this.roundedRect(
      ctx,
      12,
      78,
      366,
      83,
      13,
      COLORS.panel,
      COLORS.line
    );

    this.text(
      ctx,
      visit.modeName +
        ' · 已完成',
      24,
      99,
      12,
      COLORS.text,
      '700'
    );

    this.text(
      ctx,
      '耗时 ' +
        visit.hours +
        '小时 · 成本 ' +
        money(
          visit.cost
        ) +
        ' · 中介可靠度 ' +
        visit.brokerReliability,
      24,
      122,
      7.2,
      COLORS.muted,
      '600'
    );

    this.text(
      ctx,
      '发现 ' +
        visit.negativeCount +
        ' 项需关注 · ' +
        visit.contradictedCount +
        ' 项与中介口径不一致 · 整改约 ' +
        money(
          visit.repairEstimate
        ),
      24,
      145,
      7.2,
      visit.negativeCount >
        0
        ? COLORS.orange
        : COLORS.green,
      '700'
    );

    const items =
      Array.isArray(
        visit.items
      )
        ? visit.items
        : [];

    const top =
      174;

    const rowH =
      39;

    for (
      let i = 0;
      i <
      Math.min(
        items.length,
        9
      );
      i++
    ) {
      const item =
        items[i];

      const y =
        top +
        i *
          rowH;

      const bad =
        !item.resultPositive;

      this.roundedRect(
        ctx,
        12,
        y,
        366,
        33,
        9,
        bad
          ? '#F7E9E5'
          : '#EAF3EC',
        bad
          ? '#DCB6AD'
          : '#B3CFBA'
      );

      this.text(
        ctx,
        item.label,
        23,
        y + 10,
        7,
        COLORS.muted,
        '600'
      );

      this.text(
        ctx,
        item.text,
        23,
        y + 23,
        7.5,
        bad
          ? COLORS.red
          : COLORS.green,
        '700'
      );

      this.text(
        ctx,
        item.contradicted
          ? '口径不符'
          : item.verified
            ? '已核验'
            : '低置信',
        365,
        y + 17,
        6.5,
        item.contradicted
          ? COLORS.red
          : COLORS.muted,
        '700',
        'right'
      );
    }

    const actionY =
      this.contentBottom -
      48;

    this.roundedRect(
      ctx,
      12,
      actionY,
      110,
      38,
      11,
      '#E9E2D8',
      '#D3C6B7'
    );

    this.text(
      ctx,
      '返回房源',
      67,
      actionY +
        19,
      8,
      COLORS.navy,
      '700',
      'center'
    );

    this.addButton(
      'visit:back',
      12,
      actionY,
      110,
      38
    );

    this.roundedRect(
      ctx,
      132,
      actionY,
      246,
      38,
      11,
      COLORS.gold,
      '#D49434'
    );

    this.text(
      ctx,
      '带着报告进入谈判',
      255,
      actionY +
        19,
      9,
      '#26343B',
      '700',
      'center'
    );

    this.addButton(
      'visit:negotiate',
      132,
      actionY,
      246,
      38
    );
  }

  renderVisit(
    ctx
  ) {
    const item =
      this.getSelectedListing();

    const visit =
      propertyVisitSystem
        .getVisit(
          this.selectedListingKey
        );

    if (
      !item &&
      !visit
    ) {
      this.mode =
        'browse';

      this.selectedListingKey =
        null;

      this.refreshData();

      this.renderBrowse(
        ctx
      );

      return;
    }

    this.drawHeader(
      ctx,
      visit
        ? '勘察报告'
        : '预约实地看铺',
      visit
        ? visit.address +
          ' · 已核验信息优先于中介口径'
        : item.address +
          ' · 时间会继续推进，NPC不会等你',
      'visit:back'
    );

    if (visit) {
      this.renderVisitReport(
        ctx,
        visit
      );

      return;
    }

    this.roundedRect(
      ctx,
      12,
      78,
      366,
      55,
      12,
      '#FFF0D6',
      '#E3BD77'
    );

    this.text(
      ctx,
      '看铺不是暂停菜单',
      24,
      95,
      8,
      COLORS.orange,
      '700'
    );

    this.text(
      ctx,
      '耗时越长核验越充分，但热门铺可能被竞争者提前拿下。',
      24,
      116,
      7,
      COLORS.text,
      '600'
    );

    this.drawVisitOption(
      ctx,
      'quick',
      146
    );

    this.drawVisitOption(
      ctx,
      'standard',
      233
    );

    this.drawVisitOption(
      ctx,
      'deep',
      320
    );

    const quote =
      propertyVisitSystem
        .getDynamicVisitQuote(
          this.selectedListingKey,
          this.visitModeId
        );

    const actionY =
      this.contentBottom -
      48;

    this.roundedRect(
      ctx,
      12,
      actionY,
      110,
      38,
      11,
      '#E9E2D8',
      '#D3C6B7'
    );

    this.text(
      ctx,
      '返回房源',
      67,
      actionY + 19,
      8,
      COLORS.navy,
      '700',
      'center'
    );

    this.addButton(
      'visit:back',
      12,
      actionY,
      110,
      38
    );

    this.roundedRect(
      ctx,
      132,
      actionY,
      246,
      38,
      11,
      COLORS.gold,
      '#D49434'
    );

    this.text(
      ctx,
      quote
        ? '开始 ' +
          quote.name +
          ' · ' +
          money(
            quote.cost
          )
        : '开始看铺',
      255,
      actionY + 19,
      9,
      '#26343B',
      '700',
      'center'
    );

    this.addButton(
      'visit:start',
      132,
      actionY,
      246,
      38
    );
  }

  drawTermRow(
    ctx,
    label,
    original,
    current,
    y
  ) {
    this.text(
      ctx,
      label,
      24,
      y,
      7,
      COLORS.muted,
      '600'
    );

    this.text(
      ctx,
      original,
      157,
      y,
      7.3,
      COLORS.muted,
      '600',
      'right'
    );

    this.text(
      ctx,
      current,
      365,
      y,
      8.5,
      COLORS.text,
      '700',
      'right'
    );
  }

  renderNegotiation(
    ctx
  ) {
    const item =
      this.getSelectedListing();

    if (!item) {
      this.showToast(
        '房源已经退出市场'
      );

      this.mode =
        'browse';

      this.selectedListingKey =
        null;

      this.refreshData();

      this.renderBrowse(
        ctx
      );

      return;
    }

    const started =
      propertyNegotiationSystem
        .start(
          item.marketKey
        );

    if (!started.ok) {
      this.showToast(
        started.message
      );

      this.mode =
        'visit';

      this.renderVisit(
        ctx
      );

      return;
    }

    const session =
      propertyNegotiationSystem
        .getSession(
          item.marketKey
        );

    const terms =
      session.currentTerms;

    const original =
      session.originalTerms;

    const upfront =
      propertyNegotiationSystem
        .calculateUpfront(
          item,
          terms
        );

    this.drawHeader(
      ctx,
      '租约谈判',
      item.address +
        ' · 第' +
        session.round +
        '/' +
        session.maxRounds +
        '轮',
      'negotiation:back'
    );

    this.roundedRect(
      ctx,
      12,
      78,
      366,
      72,
      13,
      COLORS.panel,
      COLORS.line
    );

    this.text(
      ctx,
      '房东态度：' +
        session.landlordAttitude,
      24,
      99,
      10,
      COLORS.text,
      '700'
    );

    this.text(
      ctx,
      session.lastMessage,
      24,
      123,
      7.3,
      COLORS.muted,
      '600'
    );

    this.text(
      ctx,
      '签约前预计 ' +
        money(
          upfront.total
        ),
      365,
      99,
      10,
      COLORS.red,
      '700',
      'right'
    );

    this.text(
      ctx,
      '现金 ' +
        money(
          gameState
            .getPlayer()
            .cash
        ),
      365,
      124,
      7,
      COLORS.muted,
      '600',
      'right'
    );

    this.roundedRect(
      ctx,
      12,
      162,
      366,
      171,
      13,
      COLORS.panel,
      COLORS.line
    );

    this.text(
      ctx,
      '挂牌条件',
      157,
      181,
      7,
      COLORS.muted,
      '700',
      'right'
    );

    this.text(
      ctx,
      '当前谈判条件',
      365,
      181,
      7,
      COLORS.navy,
      '700',
      'right'
    );

    this.drawTermRow(
      ctx,
      '月租',
      money(
        original.monthlyRent
      ),
      money(
        terms.monthlyRent
      ),
      207
    );

    this.drawTermRow(
      ctx,
      '转让费',
      money(
        original.transferFee
      ),
      money(
        terms.transferFee
      ),
      234
    );

    this.drawTermRow(
      ctx,
      '免租期',
      original.freeRentDays +
        '天',
      terms.freeRentDays +
        '天',
      261
    );

    this.drawTermRow(
      ctx,
      '押付',
      original.depositMonths +
        '押 / ' +
        original.paymentMonths +
        '付',
      terms.depositMonths +
        '押 / ' +
        terms.paymentMonths +
        '付',
      288
    );

    this.drawTermRow(
      ctx,
      '租期/递增',
      original.leaseYears +
        '年 / ' +
        percent(
          original.annualIncrease
        ),
      terms.leaseYears +
        '年 / ' +
        percent(
          terms.annualIncrease
        ),
      315
    );

    this.text(
      ctx,
      '谈判方向',
      18,
      354,
      8,
      COLORS.muted,
      '700'
    );

    const focuses = [
      [
        'rent',
        '压月租',
        '长期固定成本'
      ],
      [
        'transfer',
        '压转让费',
        '降低前期现金'
      ],
      [
        'freeRent',
        '争免租期',
        '缓冲装修开业'
      ],
      [
        'balanced',
        '综合谈判',
        '多项小幅争取'
      ]
    ];

    for (
      let i = 0;
      i <
      focuses.length;
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
        12 +
        col *
          184;

      const y =
        371 +
        row *
          72;

      this.roundedRect(
        ctx,
        x,
        y,
        174,
        62,
        11,
        COLORS.panel,
        '#D7CABC'
      );

      this.text(
        ctx,
        focuses[i][1],
        x + 12,
        y + 20,
        9,
        COLORS.text,
        '700'
      );

      this.text(
        ctx,
        focuses[i][2],
        x + 12,
        y + 42,
        6.7,
        COLORS.muted,
        '600'
      );

      this.text(
        ctx,
        '谈 ›',
        x + 160,
        y + 20,
        7.5,
        COLORS.orange,
        '700',
        'right'
      );

      this.addButton(
        'negotiate:' +
          focuses[i][0],
        x,
        y,
        174,
        62
      );
    }

    const infoY =
      526;

    this.roundedRect(
      ctx,
      12,
      infoY,
      366,
      49,
      11,
      '#EEF2F1',
      '#CCD8D5'
    );

    this.text(
      ctx,
      '谈判会消耗游戏时间；竞争者、挂牌热度和房东性格会影响结果。',
      24,
      infoY + 17,
      7,
      COLORS.muted,
      '600'
    );

    this.text(
      ctx,
      '最多 ' +
        session.maxRounds +
        ' 轮，任何时候都可以按当前条件签约。',
      24,
      infoY + 34,
      7,
      COLORS.navy,
      '700'
    );

    const actionY =
      this.contentBottom -
      48;

    this.roundedRect(
      ctx,
      12,
      actionY,
      110,
      38,
      11,
      '#E9E2D8',
      '#D3C6B7'
    );

    this.text(
      ctx,
      '返回报告',
      67,
      actionY + 19,
      8,
      COLORS.navy,
      '700',
      'center'
    );

    this.addButton(
      'negotiation:back',
      12,
      actionY,
      110,
      38
    );

    const enough =
      gameState
        .getPlayer()
        .cash >=
      upfront.total;

    this.roundedRect(
      ctx,
      132,
      actionY,
      246,
      38,
      11,
      enough
        ? COLORS.gold
        : '#D9D1C5',
      enough
        ? '#D49434'
        : '#C4BAAD'
    );

    this.text(
      ctx,
      enough
        ? '按当前条件签约 · ' +
          money(
            upfront.total
          )
        : '资金不足 · 需' +
          money(
            upfront.total
          ),
      255,
      actionY + 19,
      8.5,
      enough
        ? '#26343B'
        : COLORS.muted,
      '700',
      'center'
    );

    this.addButton(
      'negotiation:sign',
      132,
      actionY,
      246,
      38
    );
  }

  render(
    ctx
  ) {
    if (!ctx) {
      return;
    }

    this.getLayout();

    this.clearButtons();

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
      this.mode ===
      'filter'
    ) {
      this.renderFilters(
        ctx
      );
    } else if (
      this.mode ===
      'detail'
    ) {
      this.renderDetail(
        ctx
      );
    } else if (
      this.mode ===
      'visit'
    ) {
      this.renderVisit(
        ctx
      );
    } else if (
      this.mode ===
      'negotiation'
    ) {
      this.renderNegotiation(
        ctx
      );
    } else if (
      this.mode ===
      'events'
    ) {
      this.renderEvents(
        ctx
      );
    } else {
      this.renderBrowse(
        ctx
      );
    }

    ctx.restore();
  }

  cycle(
    key,
    max
  ) {
    this.filters[
      key
    ] =
      (
        this.filters[
          key
        ] +
        1
      ) %
      max;

    this.page =
      0;

    this.refreshData();
  }

  resetFilters() {
    this.filters = {
      areaIndex:
        0,

      rentIndex:
        0,

      upfrontIndex:
        0,

      floorIndex:
        0,

      propertyTypeIndex:
        0,

      layoutIndex:
        0,

      requireExhaust:
        false,

      requireGas:
        false,

      requireThreePhase:
        false,

      riskIndex:
        0
    };

    this.page =
      0;

    this.refreshData();
  }

  handleTap(
    x,
    y,
    target
  ) {
    const local =
      this.hitButton(
        x,
        y
      );

    if (!local) {
      return false;
    }

    const id =
      local.id;

    if (
      id ===
      'market:back'
    ) {
      sceneManager
        .switchTo(
          'district',
          {
            districtId:
              this.districtId
          }
        );

      return true;
    }

    if (
      id.indexOf(
        'district:'
      ) ===
      0
    ) {
      this.districtId =
        id.split(
          ':'
        )[1];

      this.streetId =
        null;

      this.page =
        0;

      citySystem
        .setCurrentDistrict(
          this.districtId
        );

      this.refreshData();

      return true;
    }

    if (
      id.indexOf(
        'street:'
      ) ===
      0
    ) {
      const value =
        id
          .split(
            ':'
          )[1];

      this.streetId =
        value ===
          'all'
          ? null
          : value;

      this.page =
        0;

      this.refreshData();

      return true;
    }

    if (
      id ===
      'filter'
    ) {
      this.mode =
        'filter';

      return true;
    }

    if (
      id ===
      'sort'
    ) {
      this.sortIndex =
        (
          this.sortIndex +
          1
        ) %
        SORT_MODES
          .length;

      this.page =
        0;

      this.refreshData();

      return true;
    }

    if (
      id ===
      'events'
    ) {
      this.mode =
        'events';

      return true;
    }

    if (
      id ===
      'events:back'
    ) {
      this.mode =
        'browse';

      return true;
    }

    if (
      id ===
      'page:prev'
    ) {
      this.page =
        Math.max(
          0,
          this.page -
            1
        );

      return true;
    }

    if (
      id ===
      'page:next'
    ) {
      const maxPage =
        Math.max(
          0,
          Math.ceil(
            this
              .cachedListings
              .length /
            this.pageSize
          ) -
          1
        );

      this.page =
        Math.min(
          maxPage,
          this.page +
            1
        );

      return true;
    }

    if (
      id.indexOf(
        'listing:'
      ) ===
      0
    ) {
      this.selectedListingKey =
        id.slice(
          'listing:'
            .length
        );

      this.detailPage =
        0;

      this.mode =
        'detail';

      return true;
    }

    if (
      id ===
      'detail:back'
    ) {
      this.mode =
        'browse';

      this.selectedListingKey =
        null;

      this.refreshData();

      return true;
    }

    if (
      id ===
      'detail:page'
    ) {
      this.detailPage =
        this.detailPage ===
          0
          ? 1
          : 0;

      return true;
    }

    if (
      id ===
      'detail:broker'
    ) {
      const item =
        this
          .getSelectedListing();

      if (item) {
        const visit =
          propertyVisitSystem
            .getVisit(
              item.marketKey
            );

        this.showToast(
          visit
            ? item.brokerName +
              '：可带勘察报告继续谈条件'
            : item.brokerName +
              '：建议先约时间实地核验'
        );
      }

      return true;
    }

    if (
      id ===
      'detail:visit'
    ) {
      const item =
        this
          .getSelectedListing();

      if (item) {
        this.mode =
          'visit';

        this.lastVisitResult =
          null;
      }

      return true;
    }

    if (
      id ===
      'visit:back'
    ) {
      this.mode =
        'detail';

      this.refreshData();

      return true;
    }

    if (
      id.indexOf(
        'visit:mode:'
      ) ===
      0
    ) {
      this.visitModeId =
        id.slice(
          'visit:mode:'
            .length
        );

      return true;
    }

    if (
      id ===
      'visit:start'
    ) {
      const result =
        propertyVisitSystem
          .inspect(
            this.selectedListingKey,
            this.visitModeId
          );

      this.lastVisitResult =
        result;

      if (!result.ok) {
        this.showToast(
          result.message
        );

        if (
          result.code ===
            'lost_to_competitor' ||
          result.code ===
            'lost_during_visit' ||
          result.code ===
            'listing_unavailable'
        ) {
          this.mode =
            'browse';

          this.selectedListingKey =
            null;

          this.syncMarket(
            true
          );

          this.refreshData();
        }
      }

      return true;
    }

    if (
      id ===
      'visit:negotiate'
    ) {
      const started =
        propertyNegotiationSystem
          .start(
            this.selectedListingKey
          );

      if (!started.ok) {
        this.showToast(
          started.message
        );

        return true;
      }

      this.mode =
        'negotiation';

      return true;
    }

    if (
      id ===
      'negotiation:back'
    ) {
      this.mode =
        'visit';

      return true;
    }

    if (
      id.indexOf(
        'negotiate:'
      ) ===
      0
    ) {
      const focus =
        id.slice(
          'negotiate:'
            .length
        );

      const result =
        propertyNegotiationSystem
          .negotiate(
            this.selectedListingKey,
            focus
          );

      this.lastNegotiationResult =
        result;

      if (!result.ok) {
        this.showToast(
          result.message
        );

        if (
          result.code ===
            'lost_to_competitor' ||
          result.code ===
            'lost_during_negotiation' ||
          result.code ===
            'listing_unavailable'
        ) {
          this.mode =
            'browse';

          this.selectedListingKey =
            null;

          this.syncMarket(
            true
          );

          this.refreshData();
        }
      } else {
        this.showToast(
          result.session
            .lastMessage
        );
      }

      return true;
    }

    if (
      id ===
      'negotiation:sign'
    ) {
      const result =
        propertyNegotiationSystem
          .signLease(
            this.selectedListingKey
          );

      if (!result.ok) {
        this.showToast(
          result.message
        );

        return true;
      }

      this.showToast(
        result.message
      );

      this.selectedListingKey =
        null;

      this.syncMarket(
        true
      );

      this.refreshData();

      sceneManager
        .switchTo(
          'shop',
          {
            shopId:
              result.shop.id
          }
        );

      return true;
    }

    if (
      id ===
      'filter:back' ||
      id ===
      'filter:apply'
    ) {
      this.mode =
        'browse';

      this.page =
        0;

      this.refreshData();

      return true;
    }

    if (
      id ===
      'filter:reset'
    ) {
      this.resetFilters();

      return true;
    }

    if (
      id ===
      'filter:area'
    ) {
      this.cycle(
        'areaIndex',
        AREA_PRESETS
          .length
      );

      return true;
    }

    if (
      id ===
      'filter:rent'
    ) {
      this.cycle(
        'rentIndex',
        RENT_PRESETS
          .length
      );

      return true;
    }

    if (
      id ===
      'filter:upfront'
    ) {
      this.cycle(
        'upfrontIndex',
        UPFRONT_PRESETS
          .length
      );

      return true;
    }

    if (
      id ===
      'filter:floor'
    ) {
      this.cycle(
        'floorIndex',
        FLOOR_OPTIONS
          .length
      );

      return true;
    }

    if (
      id ===
      'filter:type'
    ) {
      this.cycle(
        'propertyTypeIndex',
        PROPERTY_TYPE_OPTIONS
          .length
      );

      return true;
    }

    if (
      id ===
      'filter:layout'
    ) {
      this.cycle(
        'layoutIndex',
        LAYOUT_OPTIONS
          .length
      );

      return true;
    }

    if (
      id ===
      'filter:risk'
    ) {
      this.cycle(
        'riskIndex',
        RISK_OPTIONS
          .length
      );

      return true;
    }

    if (
      id ===
      'filter:exhaust'
    ) {
      this.filters
        .requireExhaust =
        !this.filters
          .requireExhaust;

      this.page =
        0;

      this.refreshData();

      return true;
    }

    if (
      id ===
      'filter:gas'
    ) {
      this.filters
        .requireGas =
        !this.filters
          .requireGas;

      this.page =
        0;

      this.refreshData();

      return true;
    }

    if (
      id ===
      'filter:power'
    ) {
      this.filters
        .requireThreePhase =
        !this.filters
          .requireThreePhase;

      this.page =
        0;

      this.refreshData();

      return true;
    }

    return false;
  }
}

module.exports =
  new ShopScene();


/* V104_SHOP_BRIDGE_START */
const __v104TrafficShop = require('../city/customerTrafficSystem.js');
const __v104ShopScene = module.exports;

if (__v104ShopScene && !__v104ShopScene.__v104TrafficBridge) {
  __v104ShopScene.__v104TrafficBridge = true;

  if (typeof __v104ShopScene.makeLiveListing === 'function') {
    const __oldMakeLiveListingV104 = __v104ShopScene.makeLiveListing;
    __v104ShopScene.makeLiveListing = function makeLiveListingV104(item) {
      const live = __oldMakeLiveListingV104.call(this, item);
      const format = __v104TrafficShop.classifyStore(live || item || {});
      return {
        ...live,
        businessFormat: format,
        businessFormatId: format.id,
        businessFormatName: format.name,
        dineInAllowed: format.dineInAllowed,
        seatCapacityByFormat: format.seatCapacity,
        hotKitchenReady: format.hotKitchenReady
      };
    };
  }

  // 房源详情标题直接告诉玩家“这个铺位适合干什么”，不额外挤一个大页面。
  if (typeof __v104ShopScene.drawHeader === 'function') {
    const __oldDrawHeaderV104 = __v104ShopScene.drawHeader;
    __v104ShopScene.drawHeader = function drawHeaderV104(ctx, title, subtitle, backId) {
      let nextSubtitle = subtitle;
      if (title === '房源详情' && typeof this.getSelectedListing === 'function') {
        const item = this.getSelectedListing();
        if (item) {
          const format = item.businessFormat || __v104TrafficShop.classifyStore(item);
          nextSubtitle = (item.address || '当前铺位') + ' · ' + format.name + (format.dineInAllowed ? ' · ' + format.seatCapacity + '座' : ' · 非堂食');
        }
      }
      return __oldDrawHeaderV104.call(this, ctx, title, nextSubtitle, backId);
    };
  }
}
/* V104_SHOP_BRIDGE_END */
