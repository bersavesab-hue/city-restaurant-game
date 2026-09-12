'use strict';

const gameState =
  require('../core/gameState.js');

const renovationSystem =
  require('../renovation/renovationSystem.js');

const renovationConfig =
  require('../renovation/renovationConfig.js');

function clone(value) {
  return JSON.parse(
    JSON.stringify(value)
  );
}

function cleanName(
  value,
  fallback,
  maxLength
) {
  const text =
    String(
      value == null
        ? ''
        : value
    )
      .replace(
        /\s+/g,
        ' '
      )
      .trim();

  const finalText =
    text ||
    String(
      fallback ||
      ''
    ).trim();

  return finalText.slice(
    0,
    Math.max(
      1,
      Number(
        maxLength
      ) ||
      12
    )
  );
}

class CustomizationSystem {
  getShop(
    shopId
  ) {
    return renovationSystem
      .getShop(
        shopId
      );
  }

  renameShop(
    shopId,
    name
  ) {
    const shop =
      this.getShop(
        shopId
      );

    if (!shop) {
      return {
        ok:
          false,
        message:
          '门店不存在'
      };
    }

    const next =
      cleanName(
        name,
        shop.name ||
          shop.address ||
          '我的酒楼',
        renovationConfig
          .nameRules
          .shopMaxLength
      );

    shop.name =
      next;

    return {
      ok:
        true,
      name:
        next
    };
  }

  renameRoom(
    shopId,
    roomId,
    name
  ) {
    const plan =
      renovationSystem
        .ensurePlan(
          shopId
        );

    if (!plan) {
      return {
        ok:
          false,
        message:
          '装修方案不存在'
      };
    }

    const store =
      gameState
        .getRenovations();

    const livePlan =
      store[
        shopId
      ];

    let room =
      null;

    for (
      let i = 0;
      i <
      livePlan.floors.length;
      i++
    ) {
      room =
        livePlan
          .floors[i]
          .privateRooms
          .find(
            item =>
              item.id ===
              roomId
          );

      if (room) {
        break;
      }
    }

    if (!room) {
      return {
        ok:
          false,
        message:
          '包厢不存在'
      };
    }

    room.name =
      cleanName(
        name,
        room.name ||
          '包厢',
        renovationConfig
          .nameRules
          .roomMaxLength
      );

    return {
      ok:
        true,
      name:
        room.name
    };
  }

  getTemplateList() {
    return clone(
      gameState
        .getRenovationTemplates()
    );
  }

  buildTemplate(
    shopId,
    name
  ) {
    const metrics =
      renovationSystem
        .getMetrics(
          shopId
        );

    if (!metrics) {
      return null;
    }

    const plan =
      metrics.plan;

    return {
      id:
        'tpl_' +
        Date.now()
          .toString(
            36
          ),

      name:
        cleanName(
          name,
          renovationConfig
            .templateRules
            .defaultNamePrefix,
          renovationConfig
            .nameRules
            .templateMaxLength
        ),

      sourceShopId:
        shopId,

      sourceArea:
        metrics.totalArea,

      sourceFloorCount:
        plan.floors.length,

      hallStyle:
        plan.hallStyle,

      materialGrade:
        plan.materialGrade,

      lightingLevel:
        plan.lightingLevel,

      floors:
        plan.floors.map(
          floor => {
            const area =
              Math.max(
                1,
                Number(
                  floor.area
                ) ||
                1
              );

            const tableDensity =
              {};

            Object.keys(
              floor.tables
            ).forEach(
              key => {
                tableDensity[
                  key
                ] =
                  (
                    floor
                      .tables[
                        key
                      ] ||
                    0
                  ) /
                  area;
              }
            );

            return {
              kitchenRatio:
                floor.kitchenRatio,

              storageRatio:
                floor.storageRatio,

              serviceRatio:
                floor.serviceRatio,

              aisleMode:
                floor.aisleMode,

              tableDensity,

              privateRooms:
                floor
                  .privateRooms
                  .map(
                    room => ({
                      name:
                        room.name ||
                        '',

                      seats:
                        room.seats,

                      style:
                        room.style
                    })
                  )
            };
          }
        )
    };
  }

  saveTemplate(
    shopId,
    name
  ) {
    const list =
      gameState
        .getRenovationTemplates();

    if (
      list.length >=
      renovationConfig
        .templateRules
        .maxTemplates
    ) {
      return {
        ok:
          false,
        message:
          '装修模板数量已达到上限'
      };
    }

    const template =
      this.buildTemplate(
        shopId,
        name
      );

    if (!template) {
      return {
        ok:
          false,
        message:
          '当前没有可保存的装修方案'
      };
    }

    list.unshift(
      template
    );

    return {
      ok:
        true,
      template:
        clone(
          template
        )
    };
  }

  renameTemplate(
    templateId,
    name
  ) {
    const list =
      gameState
        .getRenovationTemplates();

    const item =
      list.find(
        template =>
          template.id ===
          templateId
      );

    if (!item) {
      return {
        ok:
          false,
        message:
          '模板不存在'
      };
    }

    item.name =
      cleanName(
        name,
        item.name,
        renovationConfig
          .nameRules
          .templateMaxLength
      );

    return {
      ok:
        true,
      name:
        item.name
    };
  }

  deleteTemplate(
    templateId
  ) {
    const list =
      gameState
        .getRenovationTemplates();

    const index =
      list.findIndex(
        item =>
          item.id ===
          templateId
      );

    if (
      index <
      0
    ) {
      return {
        ok:
          false,
        message:
          '模板不存在'
      };
    }

    list.splice(
      index,
      1
    );

    return {
      ok:
        true
    };
  }

  applyTemplate(
    shopId,
    templateId
  ) {
    const templates =
      gameState
        .getRenovationTemplates();

    const template =
      templates.find(
        item =>
          item.id ===
          templateId
      );

    if (!template) {
      return {
        ok:
          false,
        message:
          '模板不存在'
      };
    }

    renovationSystem
      .ensurePlan(
        shopId
      );

    const plan =
      gameState
        .getRenovations()[
          shopId
        ];

    if (!plan) {
      return {
        ok:
          false,
        message:
          '当前门店没有装修方案'
      };
    }

    if (
      plan.status !==
      'draft'
    ) {
      return {
        ok:
          false,
        message:
          '施工开始后不能套用模板'
      };
    }

    plan.hallStyle =
      template.hallStyle;

    plan.materialGrade =
      template.materialGrade;

    plan.lightingLevel =
      template.lightingLevel;

    for (
      let i = 0;
      i <
      plan.floors.length;
      i++
    ) {
      const source =
        template.floors[
          Math.min(
            i,
            template
              .floors
              .length -
              1
          )
        ];

      const target =
        plan.floors[i];

      if (!source) {
        continue;
      }

      target.kitchenRatio =
        source.kitchenRatio;

      target.storageRatio =
        source.storageRatio;

      target.serviceRatio =
        source.serviceRatio;

      target.aisleMode =
        source.aisleMode;

      const area =
        Math.max(
          1,
          Number(
            target.area
          ) ||
          1
        );

      Object.keys(
        target.tables
      ).forEach(
        key => {
          const density =
            Number(
              source
                .tableDensity[
                  key
                ]
            ) ||
            0;

          target.tables[
            key
          ] =
            Math.max(
              0,
              Math.round(
                density *
                area
              )
            );
        }
      );

      const sourceRooms =
        Array.isArray(
          source.privateRooms
        )
          ? source.privateRooms
          : [];

      const scale =
        area /
        Math.max(
          1,
          template.sourceArea /
          Math.max(
            1,
            template
              .sourceFloorCount
          )
        );

      const roomCount =
        Math.max(
          0,
          Math.min(
            8,
            Math.round(
              sourceRooms.length *
              Math.min(
                1.5,
                Math.max(
                  0.55,
                  scale
                )
              )
            )
          )
        );

      target.privateRooms =
        [];

      for (
        let r = 0;
        r <
        roomCount;
        r++
      ) {
        const sourceRoom =
          sourceRooms[
            Math.min(
              r,
              sourceRooms.length -
                1
            )
          ];

        if (!sourceRoom) {
          break;
        }

        target
          .privateRooms
          .push({
            id:
              'room_' +
              Date.now()
                .toString(
                  36
                ) +
              '_' +
              i +
              '_' +
              r,

            name:
              cleanName(
                sourceRoom.name,
                '包厢' +
                  (
                    r +
                    1
                  ),
                renovationConfig
                  .nameRules
                  .roomMaxLength
              ),

            seats:
              sourceRoom.seats,

            style:
              sourceRoom.style
          });
      }
    }

    plan.selectedContractorId =
      null;

    return {
      ok:
        true,
      template:
        clone(
          template
        ),
      metrics:
        renovationSystem
          .getMetrics(
            shopId
          )
    };
  }
}

module.exports =
  new CustomizationSystem();
