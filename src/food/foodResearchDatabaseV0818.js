'use strict';

const pack =
  require('./foodPackV10.js');

const VERSION =
  '0.8.18';

const STARTER_RECIPE_IDS =
  Object.freeze(
    pack.RECIPES
      .slice(0, 12)
      .map(item => item.id)
  );

const RESEARCH_TRACKS =
  Object.freeze([
    {
      id:'home_cooking',
      name:'家常热菜',
      categories:[
        '招牌菜','热菜','凉菜','汤羹'
      ]
    },
    {
      id:'rice_meals',
      name:'米饭套餐',
      categories:[
        '米饭','盖饭','炒饭','套餐'
      ]
    },
    {
      id:'noodles_breakfast',
      name:'粉面早餐',
      categories:[
        '面条','粉面','饺馄饨','包点','早餐'
      ]
    },
    {
      id:'bbq_hotpot',
      name:'烧烤火锅',
      categories:[
        '烧烤','火锅','夜宵'
      ]
    },
    {
      id:'snacks',
      name:'小吃快餐',
      categories:[
        '小吃','儿童餐'
      ]
    },
    {
      id:'dessert_bakery',
      name:'甜点烘焙',
      categories:[
        '甜点','烘焙'
      ]
    },
    {
      id:'drinks',
      name:'饮品',
      categories:[
        '茶饮','咖啡','果饮'
      ]
    },
    {
      id:'healthy',
      name:'轻食健康',
      categories:[
        '轻食'
      ]
    }
  ]);

function clone(value) {
  return JSON.parse(
    JSON.stringify(value)
  );
}

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

function getTrackForRecipe(
  recipe
) {
  const found =
    RESEARCH_TRACKS
      .find(
        track =>
          track.categories
            .includes(
              recipe.category
            )
      );

  return found
    ? found.id
    : 'home_cooking';
}

function researchMeta(
  recipeOrId
) {
  const recipe =
    typeof recipeOrId ===
      'string'
      ? pack.RECIPE_BY_ID[
          recipeOrId
        ]
      : recipeOrId;

  if (!recipe) {
    return null;
  }

  const index =
    pack.RECIPES
      .findIndex(
        item =>
          item.id ===
          recipe.id
      );

  const starter =
    STARTER_RECIPE_IDS
      .includes(
        recipe.id
      );

  const ingredientCount =
    Array.isArray(
      recipe.ingredients
    )
      ? recipe.ingredients.length
      : 0;

  const totalMinutes =
    Math.max(
      0,
      Number(
        recipe.prepMinutes
      ) || 0
    ) +
    Math.max(
      0,
      Number(
        recipe.cookMinutes
      ) || 0
    );

  const difficultyScore =
    clamp(
      Math.round(
        (
          Number(
            recipe.skill
          ) || 20
        ) *
          0.62 +
        ingredientCount *
          3.2 +
        totalMinutes /
          5
      ),
      12,
      100
    );

  let tier = 1;

  if (
    difficultyScore >=
    72
  ) {
    tier = 4;
  } else if (
    difficultyScore >=
    56
  ) {
    tier = 3;
  } else if (
    difficultyScore >=
    40
  ) {
    tier = 2;
  }

  if (starter) {
    tier = 0;
  }

  const basePriceIndex =
    Math.max(
      0.4,
      Number(
        recipe.basePriceIndex
      ) || 1
    );

  const researchCost =
    starter
      ? 0
      : Math.max(
          600,
          Math.round(
            500 +
            tier *
              520 +
            difficultyScore *
              22 +
            ingredientCount *
              72 +
            basePriceIndex *
              680
          )
        );

  const researchDays =
    starter
      ? 0
      : clamp(
          1 +
          tier +
          Math.floor(
            totalMinutes /
            70
          ),
          2,
          7
        );

  return {
    recipeId:
      recipe.id,
    name:
      recipe.name,
    category:
      recipe.category,
    trackId:
      getTrackForRecipe(
        recipe
      ),
    starter,
    tier,
    difficultyScore,
    researchCost,
    researchDays,
    ingredientCount,
    totalMinutes,
    skill:
      Number(
        recipe.skill
      ) || 0,
    basePriceIndex
  };
}

function recipeRecord(
  recipeOrId
) {
  const recipe =
    typeof recipeOrId ===
      'string'
      ? pack.RECIPE_BY_ID[
          recipeOrId
        ]
      : recipeOrId;

  if (!recipe) {
    return null;
  }

  return {
    ...clone(recipe),
    research:
      researchMeta(
        recipe
      )
  };
}

function getRecipe(
  recipeId
) {
  return recipeRecord(
    recipeId
  );
}

function queryRecipes(
  filters
) {
  const f =
    filters ||
    {};

  let rows =
    pack.RECIPES
      .slice();

  if (f.category) {
    rows =
      rows.filter(
        item =>
          item.category ===
          f.category
      );
  }

  if (f.trackId) {
    rows =
      rows.filter(
        item =>
          getTrackForRecipe(
            item
          ) ===
          f.trackId
      );
  }

  if (f.tag) {
    rows =
      rows.filter(
        item =>
          Array.isArray(
            item.tags
          ) &&
          item.tags.includes(
            f.tag
          )
      );
  }

  if (
    f.maxTier != null
  ) {
    rows =
      rows.filter(
        item =>
          researchMeta(
            item
          ).tier <=
          Number(
            f.maxTier
          )
      );
  }

  if (
    f.starter != null
  ) {
    rows =
      rows.filter(
        item =>
          STARTER_RECIPE_IDS
            .includes(
              item.id
            ) ===
          !!f.starter
      );
  }

  return rows
    .map(
      recipeRecord
    );
}

function getResearchTracks() {
  return RESEARCH_TRACKS
    .map(
      track => {
        const recipes =
          queryRecipes({
            trackId:
              track.id
          });

        return {
          ...clone(track),
          recipeCount:
            recipes.length,
          starterCount:
            recipes.filter(
              item =>
                item.research
                  .starter
            ).length
        };
      }
    );
}

function getVariants(
  recipeId
) {
  const variants =
    pack
      .buildVariantCatalog();

  const rows =
    recipeId
      ? variants.filter(
          item =>
            item.recipeId ===
            recipeId
        )
      : variants;

  return clone(
    rows
  );
}

function getStats() {
  const variants =
    pack
      .buildVariantCatalog();

  return {
    version:VERSION,
    ingredients:
      pack.INGREDIENTS.length,
    recipes:
      pack.RECIPES.length,
    starterRecipes:
      STARTER_RECIPE_IDS.length,
    researchableRecipes:
      Math.max(
        0,
        pack.RECIPES.length -
        STARTER_RECIPE_IDS.length
      ),
    variants:
      variants.length,
    methods:
      pack.COOKING_METHODS.length,
    flavors:
      pack.FLAVOR_PROFILES.length,
    dishCategories:
      pack.DISH_CATEGORIES.length,
    portions:
      pack.PORTION_SPECS.length,
    menuStrategies:
      pack.MENU_STRATEGIES.length,
    researchTracks:
      RESEARCH_TRACKS.length
  };
}

function validate() {
  const issues = [];

  const ingredientIds =
    new Set(
      pack.INGREDIENTS
        .map(
          item =>
            item.id
        )
    );

  const recipeIds =
    pack.RECIPES
      .map(
        item =>
          item.id
      );

  if (
    new Set(
      recipeIds
    ).size !==
    recipeIds.length
  ) {
    issues.push(
      '配方ID存在重复'
    );
  }

  for (
    const recipe
    of pack.RECIPES
  ) {
    if (
      !Array.isArray(
        recipe.ingredients
      ) ||
      recipe.ingredients.length ===
        0
    ) {
      issues.push(
        recipe.id +
        ' 缺少食材'
      );
      continue;
    }

    for (
      const line
      of recipe.ingredients
    ) {
      if (
        !ingredientIds.has(
          line.ingredientId
        )
      ) {
        issues.push(
          recipe.id +
          ' 引用不存在食材 ' +
          line.ingredientId
        );
      }
    }

    const meta =
      researchMeta(
        recipe
      );

    if (
      !meta ||
      meta.tier <
        0 ||
      meta.tier >
        4
    ) {
      issues.push(
        recipe.id +
        ' 研发分级异常'
      );
    }

    if (
      !meta.starter &&
      (
        meta.researchCost <=
          0 ||
        meta.researchDays <
          2
      )
    ) {
      issues.push(
        recipe.id +
        ' 研发成本/工期异常'
      );
    }
  }

  const stats =
    getStats();

  if (
    stats.recipes !==
    96
  ) {
    issues.push(
      '基础配方应为96，实际=' +
      stats.recipes
    );
  }

  if (
    stats.starterRecipes !==
    12
  ) {
    issues.push(
      '初始菜品应为12，实际=' +
      stats.starterRecipes
    );
  }

  if (
    stats.researchableRecipes !==
    84
  ) {
    issues.push(
      '可研发菜品应为84，实际=' +
      stats.researchableRecipes
    );
  }

  if (
    stats.variants <
    288
  ) {
    issues.push(
      '菜品变体不足288，实际=' +
      stats.variants
    );
  }

  if (
    stats.researchTracks !==
    8
  ) {
    issues.push(
      '研发路线应为8'
    );
  }

  return {
    ok:
      issues.length ===
      0,
    issues,
    stats
  };
}

module.exports = {
  VERSION,
  pack,
  STARTER_RECIPE_IDS,
  RESEARCH_TRACKS,
  getTrackForRecipe,
  researchMeta,
  recipeRecord,
  getRecipe,
  queryRecipes,
  getResearchTracks,
  getVariants,
  getStats,
  validate
};
