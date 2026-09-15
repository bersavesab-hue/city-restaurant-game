'use strict';

const gameState =
  require('./gameState.js');

const VERSION =
  '0.8.38';

function clone(value) {
  if (value === undefined) {
    return undefined;
  }

  return JSON.parse(
    JSON.stringify(value)
  );
}

function createSafety(options) {
  const opts =
    options ||
    {};

  const deps = {
    gameState:
      opts.gameState ||
      gameState
  };

  function getStore() {
    const data =
      deps.gameState
        .getData();

    data.progress =
      data.progress &&
      typeof data.progress ===
        'object'
        ? data.progress
        : {};

    data.progress.interactionSafety =
      data.progress.interactionSafety &&
      typeof data.progress.interactionSafety ===
        'object'
        ? data.progress.interactionSafety
        : {
            version:VERSION,
            sequence:0,
            failures:[],
            repairs:[],
            metrics:{
              actions:0,
              exceptions:0,
              rollbacks:0,
              repairs:0
            }
          };

    const state =
      data.progress
        .interactionSafety;

    state.version =
      VERSION;

    state.failures =
      Array.isArray(
        state.failures
      )
        ? state.failures
        : [];

    state.repairs =
      Array.isArray(
        state.repairs
      )
        ? state.repairs
        : [];

    state.metrics =
      state.metrics ||
      {};

    return state;
  }

  function validateCriticalState() {
    const data =
      deps.gameState
        .getData();

    const issues = [];

    const cash =
      Number(
        data.player &&
        data.player.cash
      );

    if (
      !Number.isFinite(
        cash
      )
    ) {
      issues.push({
        code:
          'CASH_NOT_FINITE'
      });
    }

    if (
      Number.isFinite(cash) &&
      cash <
      0
    ) {
      issues.push({
        code:
          'CASH_NEGATIVE',
        value:cash
      });
    }

    const business =
      data.business ||
      {};

    if (
      !Array.isArray(
        business.shops
      )
    ) {
      issues.push({
        code:
          'SHOPS_NOT_ARRAY'
      });
    }

    const shops =
      Array.isArray(
        business.shops
      )
        ? business.shops
        : [];

    if (
      business.currentShopId &&
      !shops.some(
        item =>
          item &&
          item.id ===
          business.currentShopId
      )
    ) {
      issues.push({
        code:
          'CURRENT_SHOP_INVALID',
        value:
          business.currentShopId
      });
    }

    const time =
      data.time ||
      {};

    for (
      const key
      of [
        'year',
        'month',
        'day',
        'hour',
        'minute'
      ]
    ) {
      if (
        !Number.isFinite(
          Number(
            time[key]
          )
        )
      ) {
        issues.push({
          code:
            'TIME_INVALID',
          key,
          value:
            time[key]
        });
      }
    }

    return {
      ok:
        issues.length ===
        0,
      version:VERSION,
      issues
    };
  }

  function repairCriticalState() {
    const data =
      deps.gameState
        .getData();

    const state =
      getStore();

    const repairs = [];

    if (
      !data.player ||
      typeof data.player !==
        'object'
    ) {
      data.player = {
        cash:0
      };

      repairs.push(
        'player'
      );
    }

    if (
      !Number.isFinite(
        Number(
          data.player.cash
        )
      )
    ) {
      data.player.cash =
        0;

      repairs.push(
        'player.cash'
      );
    }

    if (
      Number(
        data.player.cash
      ) <
      0
    ) {
      data.player.cash =
        0;

      repairs.push(
        'player.cash'
      );
    }

    data.business =
      data.business &&
      typeof data.business ===
        'object'
        ? data.business
        : {
            shops:[]
          };

    data.business.shops =
      Array.isArray(
        data.business.shops
      )
        ? data.business.shops
        : [];

    if (
      data.business.currentShopId &&
      !data.business.shops.some(
        item =>
          item &&
          item.id ===
          data.business
            .currentShopId
      )
    ) {
      data.business.currentShopId =
        data.business.shops[0]
          ? data.business
              .shops[0]
              .id
          : null;

      repairs.push(
        'business.currentShopId'
      );
    }

    if (
      repairs.length
    ) {
      state.metrics.repairs =
        (
          Number(
            state.metrics
              .repairs
          ) ||
          0
        ) +
        repairs.length;

      state.repairs.push({
        id:
          'repair_' +
          ++state.sequence,
        repairs:
          repairs.slice()
      });

      state.repairs =
        state.repairs
          .slice(-120);
    }

    return {
      changed:
        repairs.length >
        0,
      repairs,
      validation:
        validateCriticalState()
    };
  }

  function recordFailure(
    actionId,
    code,
    message,
    meta
  ) {
    const state =
      getStore();

    const row = {
      id:
        'failure_' +
        ++state.sequence,
      version:VERSION,
      actionId:
        String(
          actionId ||
          'unknown'
        ),
      code:
        String(
          code ||
          'ACTION_FAILED'
        ),
      message:
        String(
          message ||
          ''
        ),
      meta:
        meta &&
        typeof meta ===
          'object'
          ? clone(meta)
          : {}
    };

    state.failures.unshift(
      row
    );

    state.failures =
      state.failures
        .slice(0,120);

    return clone(row);
  }

  function run(
    actionId,
    fn,
    optionsValue
  ) {
    const options =
      optionsValue ||
      {};

    const state =
      getStore();

    state.metrics.actions =
      (
        Number(
          state.metrics.actions
        ) ||
        0
      ) +
      1;

    let snapshot =
      null;

    if (
      options.transactional &&
      typeof deps.gameState
        .exportSave ===
        'function'
    ) {
      snapshot =
        deps.gameState
          .exportSave();
    }

    try {
      const value =
        fn();

      if (
        value &&
        value.ok ===
          false &&
        options.rollbackOnFailure &&
        snapshot &&
        typeof deps.gameState
          .importSave ===
          'function'
      ) {
        deps.gameState
          .importSave(
            snapshot
          );

        const restoredState =
          getStore();

        restoredState.metrics.rollbacks =
          (
            Number(
              restoredState.metrics
                .rollbacks
            ) ||
            0
          ) +
          1;
      }

      return {
        ok:
          !(
            value &&
            value.ok ===
              false
          ),
        value,
        failed:
          !!(
            value &&
            value.ok ===
              false
          )
      };
    } catch (error) {
      if (
        snapshot &&
        typeof deps.gameState
          .importSave ===
          'function'
      ) {
        deps.gameState
          .importSave(
            snapshot
          );
      }

      const restoredState =
        getStore();

      if (snapshot) {
        restoredState.metrics.rollbacks =
          (
            Number(
              restoredState.metrics
                .rollbacks
            ) ||
            0
          ) +
          1;
      }

      restoredState.metrics.exceptions =
        (
          Number(
            restoredState.metrics
              .exceptions
          ) ||
          0
        ) +
        1;

      const failure =
        recordFailure(
          actionId,
          'ACTION_EXCEPTION',
          error &&
          error.message,
          {
            stack:
              error &&
              error.stack
                ? String(
                    error.stack
                  ).slice(
                    0,
                    1200
                  )
                : null
          }
        );

      return {
        ok:false,
        failed:true,
        exception:true,
        error:
          failure
      };
    }
  }

  function diagnose() {
    const state =
      getStore();

    return {
      version:VERSION,
      validation:
        validateCriticalState(),
      recentFailures:
        state.failures
          .slice(
            0,
            20
          )
          .map(clone),
      recentRepairs:
        state.repairs
          .slice(
            -20
          )
          .map(clone),
      metrics:
        clone(
          state.metrics
        )
    };
  }

  return {
    VERSION,
    getStore,
    validateCriticalState,
    repairCriticalState,
    recordFailure,
    run,
    diagnose
  };
}

const safety =
  createSafety();

safety.createSafety =
  createSafety;

module.exports =
  safety;
