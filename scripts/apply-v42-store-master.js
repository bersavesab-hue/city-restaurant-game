'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const file = path.join(ROOT, 'src/scenes/storeScene.js');
let source = fs.readFileSync(file, 'utf8');

if (!source.includes('V42_STORE_MASTER_REFERENCE_REBUILD')) {
  source = source.replace(
    '// V39_LIBRARY_ASSET_INTEGRATION\n',
    '// V39_LIBRARY_ASSET_INTEGRATION\n// V42_STORE_MASTER_REFERENCE_REBUILD\n'
  );

  if (!source.includes('function storeText(')) {
    const helperNeedle = /function dayOrdinal\(\) \{[\s\S]*?\n\}\n\nclass StoreScene/;
    const helperMatch = source.match(helperNeedle);

    if (!helperMatch) {
      throw new Error('V42: 无法定位 dayOrdinal/class 边界');
    }

    const original = helperMatch[0];
    const classPos = original.lastIndexOf('\n\nclass StoreScene');

    source = source.replace(
      original,
      original.slice(0, classPos) +
      `\n
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

  ctx.font =
    (
      weight ||
      '500'
    ) +
    ' ' +
    Math.max(
      4.6,
      Number(size) ||
      5.6
    ) +
    'px "Noto Sans SC","Microsoft YaHei",sans-serif';

  ctx.textAlign =
    align ||
    'left';

  ctx.textBaseline =
    'middle';

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
\n` +
      original.slice(classPos)
    );
  }

  const replaceMethod = function(startName, nextName, body) {
    const re = new RegExp(
      '  ' + startName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') +
      '[\\s\\S]*?\\n  ' +
      nextName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    );

    if (!re.test(source)) {
      throw new Error('V42: 无法定位 ' + startName + ' -> ' + nextName);
    }

    source = source.replace(
      re,
      body + '\n\n  ' + nextName
    );
  };

  replaceMethod(
    'drawHeader(',
    'drawActionButton(',
    `  drawHeader(
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
      86,
      0,
      'rgba(1,31,48,0.47)'
    );

    ctx.fillStyle =
      'rgba(2,43,67,0.40)';

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
          'rgba(255,255,255,0.27)',
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
      gameState.getCityName() ===
        '未命名城市'
        ? '未命名城市'
        : gameState.getCityName();

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
      6.0,
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

    storeText(
      ctx,
      cash,
      328,
      24,
      cash.length > 8
        ? 8.6
        : 10.2,
      '#FFE57A',
      '800',
      'center'
    );

    storeText(
      ctx,
      '可用资金',
      328,
      42,
      5.3,
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

    storeText(
      ctx,
      '城市动态',
      19,
      70.5,
      5.8,
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
        50
      ),
      72,
      70.5,
      5.3,
      COLORS.white,
      '600'
    );
  }`
  );

  replaceMethod(
    'drawActionButton(',
    'drawSimpleMetric(',
    `  drawActionButton(
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
  }`
  );

  replaceMethod(
    'renderNoShop(ctx) {',
    'renderPreparing(',
    `  renderNoShop(ctx) {
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
        icon: 'visibility'
      },
      {
        title: '推荐商圈',
        value:
          rec
            ? rec.district.name
            : '--',
        icon: 'hot'
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

    storeText(
      ctx,
      '开店流程',
      22,
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

    storeText(
      ctx,
      '推荐房源',
      22,
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

      for (
        let s = 0;
        s < 5;
        s++
      ) {
        storeText(
          ctx,
          '★',
          x + 7 + s * 9,
          481,
          5.6,
          s <
          Math.round(score)
            ? '#F7B916'
            : '#D8D9D9',
          '800'
        );
      }

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

    storeText(
      ctx,
      '今日机会',
      22,
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

    storeText(
      ctx,
      '市场动态',
      211,
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
  }`
  );

  replaceMethod(
    'renderPreparing(',
    'showShopDetail(',
    `  renderPreparing(
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
  }`
  );

  // Current repo V39 has showShopDetail then renderOperating.
  replaceMethod(
    'renderOperating(',
    'renderMulti(ctx) {',
    `  renderOperating(
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
        '当前客流',
        snap.customers +
        '人'
      ],
      [
        '翻台率',
        snap.turnover.toFixed(
          1
        )
      ],
      [
        '客单价',
        compactMoney(
          snap.avgSpend
        )
      ],
      [
        '员工覆盖',
        percent01(
          snap.staffCoverage
        )
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
      snap.staffCoverage < 0.9
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
  }`
  );

  replaceMethod(
    'renderMulti(ctx) {',
    'render(ctx) {',
    `  renderMulti(ctx) {
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
  }`
  );

  fs.writeFileSync(file, source, 'utf8');
}

console.log('V42 四态门店母版重构已应用');
