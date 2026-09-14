'use strict';

const gameState =
  require('./gameState.js');

const renovationSystem =
  require('../renovation/renovationSystem.js');

const openingPrepSystem =
  require('../opening/openingPrepSystem.js');

function permitSignature(
  state
) {
  const items =
    state &&
    state.items ||
    {};

  return Object.keys(
    items
  )
    .sort()
    .map(
      id => {
        const item =
          items[id] ||
          {};

        return [
          id,
          item.status,
          item.finishDay,
          item.issue
        ].join(':');
      }
    )
    .join('|');
}

function snapshotShop(
  shop
) {
  const plan =
    renovationSystem
      .ensurePlan(
        shop.id
      );

  const equipment =
    openingPrepSystem
      .ensureEquipment(
        shop.id
      );

  const permits =
    openingPrepSystem
      .getPermitState(
        shop.id
      );

  return [
    shop.status || '',
    plan
      ? plan.status
      : '',
    plan &&
    plan.construction
      ? plan
          .construction
          .finishMinute ||
        plan
          .construction
          .finishDay ||
        ''
      : '',
    equipment
      ? equipment.status
      : '',
    equipment
      ? equipment.deliveryDay
      : '',
    permitSignature(
      permits
    )
  ].join('~');
}

function updateShop(
  shop
) {
  const before =
    snapshotShop(
      shop
    );

  const renovationChanged =
    renovationSystem
      .updateShop(
        shop.id
      );

  const equipmentChanged =
    openingPrepSystem
      .updateEquipment(
        shop.id
      );

  const permitsChanged =
    openingPrepSystem
      .updatePermits(
        shop.id
      );

  openingPrepSystem
    .getReadiness(
      shop.id
    );

  const after =
    snapshotShop(
      shop
    );

  return (
    !!renovationChanged ||
    !!equipmentChanged ||
    !!permitsChanged ||
    before !==
      after
  );
}

function update(
  advancedMinutes
) {
  if (
    Number(
      advancedMinutes
    ) <=
    0
  ) {
    return false;
  }

  const business =
    gameState
      .getBusiness();

  const shops =
    Array.isArray(
      business.shops
    )
      ? business.shops
      : [];

  let changed =
    false;

  for (
    const shop
    of shops
  ) {
    if (
      !shop ||
      shop.status ===
        'open' ||
      shop.status ===
        'closed'
    ) {
      continue;
    }

    if (
      updateShop(
        shop
      )
    ) {
      changed =
        true;
    }
  }

  return changed;
}

module.exports = {
  update,
  updateShop
};
