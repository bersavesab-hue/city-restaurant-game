'use strict';

const assert =
  require('assert');

const database =
  require('../src/food/foodResearchDatabaseV0818.js');

const validation =
  database.validate();

assert.ok(
  validation.ok,
  validation.issues.join('; ')
);

const stats =
  validation.stats;

assert.ok(
  stats.ingredients >=
  190
);

assert.equal(
  stats.recipes,
  96
);

assert.equal(
  stats.starterRecipes,
  12
);

assert.equal(
  stats.researchableRecipes,
  84
);

assert.ok(
  stats.variants >=
  288
);

assert.ok(
  stats.methods >=
  30
);

assert.ok(
  stats.menuStrategies >=
  20
);

assert.equal(
  stats.researchTracks,
  8
);

const starter =
  database
    .getRecipe(
      database
        .STARTER_RECIPE_IDS[0]
    );

assert.ok(starter);
assert.equal(
  starter.research.starter,
  true
);
assert.equal(
  starter.research.researchCost,
  0
);
assert.equal(
  starter.research.researchDays,
  0
);

const locked =
  database
    .getRecipe(
      'dish_013'
    );

assert.ok(locked);
assert.equal(
  locked.research.starter,
  false
);
assert.ok(
  locked.research.researchCost >
  0
);
assert.ok(
  locked.research.researchDays >=
  2
);
assert.ok(
  locked.research.researchDays <=
  7
);

for (
  const track
  of database
      .getResearchTracks()
) {
  assert.ok(
    track.recipeCount >
    0,
    track.id +
    ' 研发路线不能为空'
  );
}

assert.equal(
  database
    .getVariants(
      'dish_001'
    )
    .length,
  3
);

console.log(
  'V0.8.18 food/research database tests passed'
);
