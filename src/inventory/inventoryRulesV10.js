'use strict';

const database =
  require('./ingredientInventoryDatabaseV0819.js');

const STORAGE_BY_CATEGORY =
  database.STORAGE_BY_CATEGORY;

function storageFor(
  ingredient
) {
  if (
    ingredient &&
    ingredient.id
  ) {
    const row =
      database
        .getIngredient(
          ingredient.id
        );

    if (row) {
      return row
        .storageZoneId;
    }
  }

  return (
    STORAGE_BY_CATEGORY[
      ingredient &&
      ingredient.category
    ] ||
    'ambient'
  );
}

function freshness(
  lot,
  day
) {
  return (
    database
      .freshnessScore(
        lot,
        day
      )
  );
}

function lotStatus(
  lot,
  day
) {
  return (
    database
      .lotStatus(
        lot,
        day
      )
  );
}

function lotValue(
  lot
) {
  return (
    Math.round(
      (
        Number(
          lot &&
          lot.grams
        ) ||
        0
      ) /
      1000 *
      Number(
        lot &&
        lot.unitCostPerKg ||
        0
      ) *
      100
    ) /
    100
  );
}

module.exports = {
  STORAGE_BY_CATEGORY,
  storageFor,
  freshness,
  lotStatus,
  lotValue
};
