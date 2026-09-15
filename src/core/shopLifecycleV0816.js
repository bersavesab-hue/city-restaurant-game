'use strict';

const gameState =
  require('./gameState.js');

const globalStateBus =
  require('./globalStateBusV0811.js');

const VERSION = '0.8.16';
const HISTORY_LIMIT = 48;

const STAGES = Object.freeze([
  'awaiting_renovation',
  'renovating',
  'awaiting_equipment',
  'equipment_installing',
  'awaiting_permits',
  'permits_reviewing',
  'awaiting_staff',
  'ready_for_trial',
  'trial_opening',
  'trial_complete',
  'formal_open',
  'paused',
  'closed'
]);

const TERMINAL_LEASE_STATUSES =
  Object.freeze([
    'terminated',
    'defaulted',
    'expired'
  ]);

function clone(value) {
  if (value === undefined) {
    return undefined;
  }

  return JSON.parse(
    JSON.stringify(value)
  );
}

function createLifecycle(options) {
  const opts =
    options ||
    {};

  const state =
    opts.gameState ||
    gameState;

  const bus =
    opts.bus ||
    globalStateBus;

  function now() {
    return typeof opts.now ===
      'function'
      ? Number(
          opts.now()
        ) ||
        0
      : Date.now();
  }

  function currentDay() {
    if (
      typeof opts.currentDay ===
      'function'
    ) {
      return Number(
        opts.currentDay()
      ) || 0;
    }

    if (
      !state ||
      typeof state.getTime !==
        'function'
    ) {
      return 0;
    }

    const time =
      state.getTime();

    if (!time) {
      return 0;
    }

    const year =
      Math.max(
        1,
        Number(
          time.year
        ) || 1
      );

    let total =
      0;

    for (
      let y = 1;
      y < year;
      y++
    ) {
      total +=
        (
          y % 400 === 0 ||
          (
            y % 4 === 0 &&
            y % 100 !== 0
          )
        )
          ? 366
          : 365;
    }

    const month =
      Math.max(
        1,
        Number(
          time.month
        ) || 1
      );

    const days = [
      31,
      (
        year % 400 === 0 ||
        (
          year % 4 === 0 &&
          year % 100 !== 0
        )
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
      let m = 1;
      m < month;
      m++
    ) {
      total +=
        days[
          Math.min(
            11,
            m - 1
          )
        ];
    }

    total +=
      Math.max(
        1,
        Number(
          time.day
        ) || 1
      );

    return total;
  }

  function getBusiness() {
    return state &&
      typeof state.getBusiness ===
        'function'
      ? state.getBusiness()
      : null;
  }

  function getShop(
    shopOrId
  ) {
    if (
      shopOrId &&
      typeof shopOrId ===
        'object'
    ) {
      return shopOrId;
    }

    const business =
      getBusiness();

    const shops =
      business &&
      Array.isArray(
        business.shops
      )
        ? business.shops
        : [];

    return (
      shops.find(
        item =>
          item.id ===
          shopOrId
      ) ||
      null
    );
  }

  function ensureStore() {
    const business =
      getBusiness();

    if (!business) {
      return null;
    }

    business.lifecycle =
      business.lifecycle &&
      typeof business.lifecycle ===
        'object' &&
      !Array.isArray(
        business.lifecycle
      )
        ? business.lifecycle
        : {};

    business.lifecycle.shops =
      business.lifecycle.shops &&
      typeof business.lifecycle.shops ===
        'object' &&
      !Array.isArray(
        business.lifecycle.shops
      )
        ? business.lifecycle.shops
        : {};

    return business.lifecycle;
  }

  function ensureRecord(
    shopOrId
  ) {
    const shop =
      getShop(
        shopOrId
      );

    if (!shop) {
      return null;
    }

    const store =
      ensureStore();

    if (!store) {
      return null;
    }

    store.shops[
      shop.id
    ] =
      store.shops[
        shop.id
      ] &&
      typeof store.shops[
        shop.id
      ] ===
        'object'
        ? store.shops[
            shop.id
          ]
        : {};

    const record =
      store.shops[
        shop.id
      ];

    record.schemaVersion = 2;
    record.stage =
      typeof record.stage ===
        'string'
        ? record.stage
        : null;
    record.previousStage =
      typeof record.previousStage ===
        'string'
        ? record.previousStage
        : null;
    record.updatedDay =
      record.updatedDay == null
        ? null
        : Number(
            record.updatedDay
          );
    record.transitionCount =
      Math.max(
        0,
        Number(
          record.transitionCount
        ) || 0
      );
    record.history =
      Array.isArray(
        record.history
      )
        ? record.history
        : [];

    if (
      record.history.length >
      HISTORY_LIMIT
    ) {
      record.history =
        record.history.slice(
          -HISTORY_LIMIT
        );
    }

    return record;
  }

  function getLeaseStatus(
    shop
  ) {
    const process =
      state &&
      typeof state.getPropertyProcess ===
        'function'
        ? state.getPropertyProcess()
        : null;

    const leases =
      process &&
      process.leases &&
      typeof process.leases ===
        'object'
        ? process.leases
        : {};

    for (
      const key
      of Object.keys(
        leases
      )
    ) {
      const lease =
        leases[
          key
        ];

      if (
        lease &&
        lease.shopId ===
          shop.id
      ) {
        return lease.lifecycle &&
          lease.lifecycle.status
          ? String(
              lease.lifecycle.status
            )
          : 'active';
      }
    }

    return null;
  }

  function inspectFromState(
    shop
  ) {
    const business =
      getBusiness() ||
      {};

    const renovations =
      business.renovations ||
      {};

    const prep =
      business.openingPrep ||
      {};

    const renovation =
      renovations[
        shop.id
      ] ||
      null;

    const equipment =
      prep.equipment &&
      prep.equipment[
        shop.id
      ] ||
      null;

    const permitRecord =
      prep.permits &&
      prep.permits[
        shop.id
      ] ||
      null;

    const permitItems =
      permitRecord &&
      permitRecord.items &&
      typeof permitRecord.items ===
        'object'
        ? Object.values(
            permitRecord.items
          )
        : [];

    const permitTotal =
      permitItems.length;

    const permitsApproved =
      permitItems.filter(
        item => {
          const status =
            String(
              item &&
              item.status ||
              ''
            );

          return (
            status ===
              'approved' ||
            status.indexOf(
              'approved_'
            ) ===
              0
          );
        }
      ).length;

    const permitsApplying =
      permitItems.some(
        item =>
          String(
            item &&
            item.status ||
            ''
          ) ===
          'applying'
      );

    const staffing =
      prep.staffing &&
      prep.staffing[
        shop.id
      ] ||
      null;

    let staffCoverage =
      0;

    if (
      staffing &&
      Number.isFinite(
        Number(
          staffing.coverage
        )
      )
    ) {
      staffCoverage =
        Number(
          staffing.coverage
        );
    } else if (
      staffing &&
      Array.isArray(
        staffing.hired
      ) &&
      staffing.required &&
      typeof staffing.required ===
        'object'
    ) {
      const required =
        Object.values(
          staffing.required
        )
          .reduce(
            (
              sum,
              value
            ) =>
              sum +
              Math.max(
                0,
                Number(
                  value
                ) ||
                0
              ),
            0
          );

      staffCoverage =
        required > 0
          ? staffing.hired.length /
            required
          : (
              staffing.hired.length >
              0
                ? 1
                : 0
            );
    }

    return {
      renovationStatus:
        renovation &&
        renovation.status ||
        null,
      equipmentStatus:
        equipment &&
        equipment.status ||
        null,
      permitTotal,
      permitsApproved,
      permitsApplying,
      staffCoverage,
      leaseStatus:
        getLeaseStatus(
          shop
        )
    };
  }

  function inspect(
    shop
  ) {
    if (
      typeof opts.inspect ===
        'function'
    ) {
      const custom =
        opts.inspect(
          shop
        ) ||
        {};

      return {
        ...inspectFromState(
          shop
        ),
        ...custom
      };
    }

    return inspectFromState(
      shop
    );
  }

  function isTerminalLease(
    leaseStatus
  ) {
    return (
      TERMINAL_LEASE_STATUSES
        .indexOf(
          String(
            leaseStatus ||
            ''
          )
        ) >=
      0
    );
  }

  function deriveStage(
    shopOrId,
    evidenceValue
  ) {
    const shop =
      getShop(
        shopOrId
      );

    if (!shop) {
      return 'missing';
    }

    const evidence = {
      ...inspect(
        shop
      ),
      ...(
        evidenceValue ||
        {}
      )
    };

    if (
      shop.status ===
        'closed' ||
      isTerminalLease(
        evidence.leaseStatus
      )
    ) {
      return 'closed';
    }

    if (
      shop.status ===
      'paused'
    ) {
      return 'paused';
    }

    if (
      shop.status ===
      'open'
    ) {
      return 'formal_open';
    }

    if (
      shop.status ===
      'trial_opening'
    ) {
      return 'trial_opening';
    }

    if (
      shop.status ===
      'trial_complete'
    ) {
      return 'trial_complete';
    }

    if (
      evidence
        .renovationStatus !==
        'completed'
    ) {
      return evidence
        .renovationStatus ===
          'constructing'
        ? 'renovating'
        : 'awaiting_renovation';
    }

    if (
      evidence
        .equipmentStatus !==
        'installed'
    ) {
      return evidence
        .equipmentStatus ===
          'ordered'
        ? 'equipment_installing'
        : 'awaiting_equipment';
    }

    const permitTotal =
      Math.max(
        0,
        Number(
          evidence.permitTotal
        ) ||
        0
      );

    const approved =
      Math.max(
        0,
        Number(
          evidence
            .permitsApproved
        ) ||
        0
      );

    if (
      permitTotal <=
        0 ||
      approved <
        permitTotal
    ) {
      return evidence
        .permitsApplying
        ? 'permits_reviewing'
        : 'awaiting_permits';
    }

    if (
      Number(
        evidence
          .staffCoverage
      ) <
      0.9
    ) {
      return 'awaiting_staff';
    }

    return 'ready_for_trial';
  }

  function emit(
    type,
    payload
  ) {
    if (
      bus &&
      typeof bus.emit ===
        'function'
    ) {
      bus.emit(
        type,
        payload,
        {
          source:
            'shopLifecycleV0816'
        }
      );
    }
  }

  function syncShop(
    shopOrId,
    evidenceValue,
    metaValue
  ) {
    const shop =
      getShop(
        shopOrId
      );

    if (!shop) {
      return {
        ok:false,
        stage:'missing',
        changed:false
      };
    }

    const meta =
      metaValue ||
      {};

    const evidence = {
      ...inspect(
        shop
      ),
      ...(
        evidenceValue ||
        {}
      )
    };

    if (
      isTerminalLease(
        evidence.leaseStatus
      ) &&
      shop.status !==
        'closed'
    ) {
      shop.status =
        'closed';

      shop.closedReason =
        shop.closedReason ||
        (
          'lease_' +
          evidence
            .leaseStatus
        );

      shop.closedDay =
        shop.closedDay ||
        Number(
          meta.day
        ) ||
        currentDay();
    }

    const stage =
      deriveStage(
        shop,
        evidence
      );

    const record =
      ensureRecord(
        shop
      );

    if (!record) {
      return {
        ok:false,
        stage,
        changed:false
      };
    }

    const previous =
      record.stage;

    const changed =
      previous !==
      stage;

    record.updatedDay =
      Number(
        meta.day
      ) ||
      currentDay();

    if (changed) {
      record.previousStage =
        previous;

      record.stage =
        stage;

      record.transitionCount +=
        1;

      record.history.push({
        from:
          previous,
        to:
          stage,
        day:
          record.updatedDay,
        reason:
          String(
            meta.reason ||
            'sync'
          ),
        at:
          now()
      });

      if (
        record.history.length >
        HISTORY_LIMIT
      ) {
        record.history =
          record.history.slice(
            -HISTORY_LIMIT
          );
      }

      emit(
        'shop.lifecycle.changed',
        {
          shopId:
            shop.id,
          from:
            previous,
          to:
            stage,
          day:
            record.updatedDay,
          reason:
            String(
              meta.reason ||
              'sync'
            )
        }
      );
    }

    shop.lifecycleStage =
      stage;

    return {
      ok:true,
      stage,
      previousStage:
        previous,
      changed,
      evidence:
        clone(
          evidence
        )
    };
  }

  function syncAll(
    reason
  ) {
    const business =
      getBusiness();

    const shops =
      business &&
      Array.isArray(
        business.shops
      )
        ? business.shops
        : [];

    let changed =
      0;

    const rows = [];

    for (
      const shop
      of shops
    ) {
      const result =
        syncShop(
          shop,
          null,
          {
            reason:
              reason ||
              'sync-all'
          }
        );

      rows.push(
        result
      );

      if (
        result.changed
      ) {
        changed++;
      }
    }

    return {
      changed:
        changed >
        0,
      changedCount:
        changed,
      rows
    };
  }

  function canAction(
    shopOrId,
    action,
    evidenceValue
  ) {
    const stage =
      deriveStage(
        shopOrId,
        evidenceValue
      );

    const allowed = {
      start_renovation:[
        'awaiting_renovation'
      ],
      start_trial:[
        'ready_for_trial'
      ],
      formal_open:[
        'trial_complete'
      ],
      pause:[
        'formal_open'
      ],
      resume:[
        'paused'
      ],
      terminate:[
        'awaiting_renovation',
        'renovating',
        'awaiting_equipment',
        'equipment_installing',
        'awaiting_permits',
        'permits_reviewing',
        'awaiting_staff',
        'ready_for_trial',
        'trial_opening',
        'trial_complete',
        'formal_open',
        'paused'
      ]
    };

    return !!(
      allowed[
        action
      ] &&
      allowed[
        action
      ].indexOf(
        stage
      ) >=
      0
    );
  }

  function pauseShop(
    shopOrId,
    reason
  ) {
    const shop =
      getShop(
        shopOrId
      );

    if (
      !shop ||
      !canAction(
        shop,
        'pause'
      )
    ) {
      return {
        ok:false,
        message:
          '当前门店状态不能暂停营业'
      };
    }

    shop.pausedFromStatus =
      shop.status;

    shop.status =
      'paused';

    shop.pausedDay =
      currentDay();

    shop.pauseReason =
      String(
        reason ||
        'manual'
      );

    const synced =
      syncShop(
        shop,
        null,
        {
          reason:
            'pause'
        }
      );

    return {
      ok:true,
      stage:
        synced.stage
    };
  }

  function resumeShop(
    shopOrId
  ) {
    const shop =
      getShop(
        shopOrId
      );

    if (!shop) {
      return {
        ok:false,
        message:
          '门店不存在'
      };
    }

    const evidence =
      inspect(
        shop
      );

    if (
      isTerminalLease(
        evidence.leaseStatus
      )
    ) {
      syncShop(
        shop,
        evidence,
        {
          reason:
            'resume-blocked-terminal-lease'
        }
      );

      return {
        ok:false,
        message:
          '租约已结束，不能恢复营业'
      };
    }

    if (
      !canAction(
        shop,
        'resume',
        evidence
      )
    ) {
      return {
        ok:false,
        message:
          '当前门店状态不能恢复营业'
      };
    }

    shop.status =
      'open';

    shop.resumedDay =
      currentDay();

    const synced =
      syncShop(
        shop,
        evidence,
        {
          reason:
            'resume'
        }
      );

    return {
      ok:true,
      stage:
        synced.stage
    };
  }

  function markClosed(
    shopOrId,
    reason,
    day
  ) {
    const shop =
      getShop(
        shopOrId
      );

    if (!shop) {
      return {
        ok:false,
        stage:'missing'
      };
    }

    shop.status =
      'closed';

    shop.closedReason =
      reason ||
      shop.closedReason ||
      'closed';

    shop.closedDay =
      Number(
        day
      ) ||
      shop.closedDay ||
      currentDay();

    return syncShop(
      shop,
      null,
      {
        day:
          shop.closedDay,
        reason:
          reason ||
          'closed'
      }
    );
  }

  function getHistory(
    shopOrId
  ) {
    const record =
      ensureRecord(
        shopOrId
      );

    return record
      ? clone(
          record.history
        )
      : [];
  }

  function getOverview(
    shopOrId,
    evidenceValue
  ) {
    const shop =
      getShop(
        shopOrId
      );

    if (!shop) {
      return null;
    }

    const evidence = {
      ...inspect(
        shop
      ),
      ...(
        evidenceValue ||
        {}
      )
    };

    const synced =
      syncShop(
        shop,
        evidence,
        {
          reason:
            'overview'
        }
      );

    const record =
      ensureRecord(
        shop
      );

    return {
      version:VERSION,
      shopId:
        shop.id,
      rawStatus:
        shop.status,
      stage:
        synced.stage,
      previousStage:
        record.previousStage,
      transitionCount:
        record.transitionCount,
      updatedDay:
        record.updatedDay,
      evidence:
        clone(
          evidence
        )
    };
  }

  function auditShop(
    shopOrId,
    evidenceValue
  ) {
    const shop =
      getShop(
        shopOrId
      );

    if (!shop) {
      return {
        ok:false,
        issues:[
          '门店不存在'
        ]
      };
    }

    const evidence = {
      ...inspect(
        shop
      ),
      ...(
        evidenceValue ||
        {}
      )
    };

    const stage =
      deriveStage(
        shop,
        evidence
      );

    const issues = [];

    const rawExpectations = {
      closed:'closed',
      paused:'paused',
      open:'formal_open',
      trial_opening:
        'trial_opening',
      trial_complete:
        'trial_complete'
    };

    if (
      rawExpectations[
        shop.status
      ] &&
      rawExpectations[
        shop.status
      ] !==
        stage
    ) {
      issues.push(
        '原始状态与生命周期阶段冲突: ' +
        shop.status +
        ' / ' +
        stage
      );
    }

    if (
      isTerminalLease(
        evidence.leaseStatus
      ) &&
      stage !==
        'closed'
    ) {
      issues.push(
        '终止租约门店仍处于非关闭阶段'
      );
    }

    if (
      stage ===
        'formal_open' &&
      shop.status !==
        'open'
    ) {
      issues.push(
        '正式营业阶段缺少open原始状态'
      );
    }

    return {
      ok:
        issues.length ===
        0,
      stage,
      rawStatus:
        shop.status,
      issues,
      evidence:
        clone(
          evidence
        )
    };
  }

  function auditAll() {
    const business =
      getBusiness();

    const shops =
      business &&
      Array.isArray(
        business.shops
      )
        ? business.shops
        : [];

    const rows =
      shops.map(
        shop =>
          ({
            shopId:
              shop.id,
            ...auditShop(
              shop
            )
          })
      );

    return {
      ok:
        rows.every(
          row =>
            row.ok
        ),
      shopCount:
        rows.length,
      rows
    };
  }

  function diagnose() {
    const store =
      ensureStore();

    return {
      version:VERSION,
      historyLimit:
        HISTORY_LIMIT,
      stages:
        STAGES.slice(),
      trackedShops:
        store &&
        store.shops
          ? Object.keys(
              store.shops
            ).length
          : 0,
      audit:
        auditAll()
    };
  }

  return {
    VERSION,
    HISTORY_LIMIT,
    STAGES,
    TERMINAL_LEASE_STATUSES,
    inspect,
    deriveStage,
    syncShop,
    syncAll,
    canAction,
    pauseShop,
    resumeShop,
    markClosed,
    getHistory,
    getOverview,
    auditShop,
    auditAll,
    diagnose
  };
}

const lifecycle =
  createLifecycle();

lifecycle.createLifecycle =
  createLifecycle;

module.exports =
  lifecycle;
