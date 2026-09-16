'use strict';

const assert =
  require('assert');

const moduleUnderTest =
  require('../src/food/foodResearchSystemV0818.js');

const recipes = [
  {
    id:'dish_001',
    name:'初始菜',
    category:'热菜',
    research:{
      recipeId:'dish_001',
      starter:true,
      trackId:'home',
      tier:0,
      researchCost:0,
      researchDays:0
    }
  },
  {
    id:'dish_013',
    name:'研发菜',
    category:'热菜',
    research:{
      recipeId:'dish_013',
      starter:false,
      trackId:'home',
      tier:2,
      researchCost:1800,
      researchDays:3
    }
  },
  {
    id:'dish_014',
    name:'老档菜',
    category:'热菜',
    research:{
      recipeId:'dish_014',
      starter:false,
      trackId:'home',
      tier:2,
      researchCost:1900,
      researchDays:3
    }
  }
];

const fakeDb = {
  STARTER_RECIPE_IDS:[
    'dish_001'
  ],
  pack:{
    RECIPES:
      recipes.map(
        item => ({
          id:item.id
        })
      )
  },
  getRecipe(id) {
    const row =
      recipes.find(
        item =>
          item.id ===
          id
      );

    return row
      ? JSON.parse(
          JSON.stringify(
            row
          )
        )
      : null;
  },
  queryRecipes() {
    return recipes.map(
      item =>
        JSON.parse(
          JSON.stringify(
            item
          )
        )
    );
  },
  getStats() {
    return {
      recipes:3,
      researchableRecipes:2
    };
  }
};

let minute =
  10000;

const data = {
  player:{
    cash:10000
  },
  business:{
    restaurantOperations:{
      shops:{
        old_shop:{
          menu:[
            {
              recipeId:
                'dish_014'
            }
          ]
        }
      }
    }
  }
};

const state = {
  getBusiness() {
    return data.business;
  },
  getTime() {
    return {
      year:1,
      month:1,
      day:1,
      hour:0,
      minute:0
    };
  },
  spendCash(value) {
    if (
      data.player.cash <
      value
    ) {
      return false;
    }

    data.player.cash -=
      value;

    return true;
  },
  addCash(value) {
    data.player.cash +=
      value;
  },
  getPlayer() {
    return data.player;
  }
};

const events = [];

const system =
  moduleUnderTest
    .createSystem({
      gameState:state,
      database:fakeDb,
      currentMinute:() =>
        minute,
      bus:{
        emit(type,payload) {
          events.push({
            type,
            payload
          });
        },
        syncDomain() {
        }
      }
    });

const store =
  system.ensureState();

assert.ok(
  store
    .unlockedRecipeIds
    .includes(
      'dish_001'
    )
);

assert.ok(
  store
    .unlockedRecipeIds
    .includes(
      'dish_014'
    ),
  '老存档菜单菜品必须自动接管为已掌握'
);

assert.equal(
  system.isUnlocked(
    'dish_013'
  ),
  false
);

const cashBefore =
  data.player.cash;

const started =
  system.startResearch(
    'dish_013'
  );

assert.ok(
  started.ok
);

assert.equal(
  cashBefore -
  data.player.cash,
  1800
);

assert.equal(
  started
    .project
    .finishMinute -
  started
    .project
    .startMinute,
  3 *
  1440
);

minute +=
  2 *
  1440;

assert.equal(
  system.sync(
    'before-finish'
  ).changed,
  false
);

assert.equal(
  system.isUnlocked(
    'dish_013'
  ),
  false
);

minute +=
  1440;

const done =
  system.sync(
    'finish'
  );

assert.ok(
  done.changed
);

assert.equal(
  done.completed.length,
  1
);

assert.ok(
  system.isUnlocked(
    'dish_013'
  )
);

assert.equal(
  system
    .getOverview()
    .activeProjects
    .length,
  0
);

assert.ok(
  events.some(
    item =>
      item.type ===
      'food.research.started'
  )
);

assert.ok(
  events.some(
    item =>
      item.type ===
      'food.research.completed'
  )
);

console.log(
  'V0.8.18 food research system tests passed'
);
