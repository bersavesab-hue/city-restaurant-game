'use strict';

const citySystem =
  require('./citySystem.js');

const demandSystem =
  require('./demandSystem.js');

const propertyMarketSystem =
  require('../property/propertyMarketSystem.js');

const simulationConfig =
  require('../core/simulationConfig.js');

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

const CUSTOMER_HINTS = {
  student: [
    '快餐',
    '小吃',
    '饮品'
  ],

  teacher: [
    '简餐',
    '咖啡',
    '品质餐'
  ],

  resident: [
    '家常菜',
    '早餐',
    '社区餐'
  ],

  elderly: [
    '早餐',
    '面点',
    '家常菜'
  ],

  family: [
    '正餐',
    '火锅',
    '亲子餐'
  ],

  office: [
    '工作餐',
    '咖啡',
    '轻食'
  ],

  business: [
    '商务餐',
    '品质正餐',
    '咖啡'
  ],

  tourist: [
    '地方特色',
    '小吃',
    '伴手餐'
  ],

  vendor: [
    '早餐',
    '快餐',
    '面饭'
  ],

  worker: [
    '快餐',
    '面饭',
    '夜宵'
  ],

  tenant: [
    '平价快餐',
    '外卖',
    '夜宵'
  ],

  driver: [
    '快餐',
    '早餐',
    '便捷餐'
  ],

  staff: [
    '工作餐',
    '简餐',
    '外卖'
  ],

  tech: [
    '咖啡',
    '轻食',
    '品质快餐'
  ]
};

class DistrictInsightSystem {
  getCompetitionLabel(
    saturation
  ) {
    const bands =
      simulationConfig
        .city
        .competitionBands;

    if (
      saturation >=
      bands.extreme
    ) {
      return '高度饱和';
    }

    if (
      saturation >=
      bands.high
    ) {
      return '竞争激烈';
    }

    if (
      saturation >=
      bands.medium
    ) {
      return '竞争中等';
    }

    return '竞争较低';
  }

  getCustomerGroups(
    districtId
  ) {
    const groups =
      demandSystem
        .getDemandByCustomerType(
          districtId
        );

    const total =
      Object.values(
        groups
      ).reduce(
        (
          sum,
          item
        ) =>
          sum +
          item.demand,
        0
      );

    return Object.values(
      groups
    )
      .map(
        item => ({
          ...item,

          share:
            total >
            0
              ? item.demand /
                total
              : 0
        })
      )
      .sort(
        (
          a,
          b
        ) =>
          b.share -
          a.share
      );
  }

  getMealProfile(
    district
  ) {
    const entries =
      Object.keys(
        district
          .mealDemand ||
        {}
      )
        .map(
          key => ({
            id:
              key,

            share:
              district
                .mealDemand[
                  key
                ] ||
              0
          })
        )
        .sort(
          (
            a,
            b
          ) =>
            b.share -
            a.share
        );

    return entries;
  }

  getDistrictEvents(
    districtId
  ) {
    const state =
      propertyMarketSystem
        .getState();

    const active =
      Array.isArray(
        state.activeEvents
      )
        ? state.activeEvents
        : [];

    const external =
      Array.isArray(
        state.externalModifiers
      )
        ? state.externalModifiers
        : [];

    return active
      .concat(
        external
      )
      .filter(
        event =>
          !event.districtId ||
          event.districtId ===
            districtId
      )
      .slice(
        0,
        5
      );
  }

  getBusinessHints(
    customerGroups
  ) {
    const result =
      [];

    for (
      let i = 0;
      i <
      Math.min(
        3,
        customerGroups.length
      );
      i++
    ) {
      const hints =
        CUSTOMER_HINTS[
          customerGroups[i]
            .typeId
        ] ||
        [];

      for (
        let j = 0;
        j <
        hints.length;
        j++
      ) {
        if (
          result.indexOf(
            hints[j]
          ) ===
          -1
        ) {
          result.push(
            hints[j]
          );
        }

        if (
          result.length >=
          5
        ) {
          return result;
        }
      }
    }

    return result;
  }

  getInsight(
    districtId
  ) {
    const district =
      citySystem
        .getDistrict(
          districtId
        );

    if (!district) {
      return null;
    }

    const demand =
      demandSystem
        .getDemandBreakdown(
          districtId
        );

    const customerGroups =
      this.getCustomerGroups(
        districtId
      );

    const mealProfile =
      this.getMealProfile(
        district
      );

    const market =
      propertyMarketSystem
        .getDistrictSummary(
          districtId
        );

    const events =
      this.getDistrictEvents(
        districtId
      );

    const rentLevel =
      district.rentIndex >=
        1.05
        ? '偏高'
        : district.rentIndex >=
            0.78
          ? '中高'
          : district.rentIndex >=
              0.52
            ? '中等'
            : '较低';

    const customerConcentration =
      customerGroups.length
        ? customerGroups[0]
            .share
        : 0;

    const diversity =
      customerConcentration >=
        0.68
        ? '客群集中'
        : customerConcentration >=
            0.48
          ? '主力明显'
          : '客群多元';

    return {
      id:
        district.id,

      name:
        district.name,

      population:
        district.population,

      residentPopulation:
        district
          .residentPopulation,

      populationDelta:
        district
          .populationDelta,

      currentDemand:
        demand
          ? demand.total
          : 0,

      dynamicDailyDemand:
        demand
          ? demand
              .dynamicDailyDemand
          : district
              .baseDemand,

      demandDeltaRatio:
        district
          .demandDeltaRatio,

      avgSpend:
        district.avgSpend,

      restaurantCount:
        district
          .restaurantCount,

      saturation:
        district.saturation,

      competitionLabel:
        this.getCompetitionLabel(
          district.saturation
        ),

      rentIndex:
        district.rentIndex,

      rentLevel,

      economyMomentum:
        district
          .economyMomentum,

      customerGroups,

      customerDiversity:
        diversity,

      mealProfile,

      peakMeal:
        mealProfile.length
          ? mealProfile[0]
              .id
          : null,

      businessHints:
        this.getBusinessHints(
          customerGroups
        ),

      market:
        market
          ? {
              activeListingCount:
                market
                  .activeListingCount,

              averageAskingRent:
                market
                  .averageAskingRent,

              averageDaysOnMarket:
                market
                  .averageDaysOnMarket,

              hottestStreet:
                market
                  .hottestStreet
            }
          : null,

      events,

      eventTrafficFactor:
        district
          .eventTrafficFactor,

      eventDemandFactor:
        district
          .eventDemandFactor,

      trendScore:
        clamp(
          (
            district
              .demandDeltaRatio *
            2
          ) +
          (
            district
              .populationDelta /
            Math.max(
              1,
              district
                .residentPopulation
            )
          ),
          -1,
          1
        )
    };
  }
}

module.exports =
  new DistrictInsightSystem();
