'use strict';

const openingPrepSystem =
  require('../opening/openingPrepSystem.js');

const staffCareer =
  require('./staffCareerV088.js');

const staffWorkload =
  require('./staffWorkloadV089.js');

const operationsSchedule =
  require('./operationsScheduleV087.js');

const personDatabase =
  require('../person/personEmployeeDatabaseV0822.js');

const VERSION =
  '0.8.23';

function clone(value) {
  if (value === undefined) {
    return undefined;
  }

  return JSON.parse(
    JSON.stringify(value)
  );
}

function normalizeTeam(
  shopId
) {
  const state =
    openingPrepSystem
      .getStaffState(
        shopId
      );

  state.hired =
    Array.isArray(
      state.hired
    )
      ? state.hired
      : [];

  state.hired =
    state.hired
      .map(
        staff =>
          personDatabase
            .normalizeEmployee(
              staff
            )
      )
      .filter(Boolean);

  return state.hired;
}

function candidatePool(
  shopId
) {
  openingPrepSystem
    .refreshCandidates(
      shopId
    );

  const state =
    openingPrepSystem
      .getStaffState(
        shopId
      );

  return clone(
    state.candidates ||
    []
  );
}

function hireCandidate(
  shopId,
  candidateId
) {
  const result =
    openingPrepSystem
      .hireCandidate(
        shopId,
        candidateId
      );

  if (
    !result ||
    !result.ok
  ) {
    return result;
  }

  const state =
    openingPrepSystem
      .getStaffState(
        shopId
      );

  const index =
    state.hired
      .findIndex(
        item =>
          String(
            item.id
          ) ===
          String(
            result.staff &&
            result.staff.id
          )
      );

  if (
    index >=
    0
  ) {
    state.hired[index] =
      personDatabase
        .normalizeEmployee(
          state.hired[index]
        );

    result.staff =
      clone(
        state.hired[index]
      );
  }

  staffCareer
    .ensureTeam(
      shopId
    );

  operationsSchedule
    .ensureShop(
      shopId
    );

  return result;
}

function dismissStaff(
  shopId,
  staffId
) {
  return (
    openingPrepSystem
      .dismissStaff(
        shopId,
        staffId
      )
  );
}

function monthlyPayroll(
  shopId
) {
  return normalizeTeam(
    shopId
  )
    .filter(
      item =>
        item.active !==
        false
    )
    .reduce(
      (
        total,
        item
      ) =>
        total +
        (
          Number(
            item.wage
          ) ||
          0
        ),
      0
    );
}

function roleCounts(
  shopId
) {
  const out = {};

  for (
    const employee
    of normalizeTeam(
      shopId
    )
  ) {
    if (
      employee.active ===
      false
    ) {
      continue;
    }

    out[
      employee.roleId
    ] =
      (
        out[
          employee.roleId
        ] ||
        0
      ) +
      1;
  }

  return out;
}

function syncRuntimeStaff(
  runtime,
  shopId
) {
  if (!runtime) {
    return null;
  }

  runtime.staff =
    runtime.staff &&
    typeof runtime.staff ===
      'object'
      ? runtime.staff
      : {
          employees:[],
          shifts:[],
          absences:[],
          training:[],
          payroll:0
        };

  runtime.staff.employees =
    Array.isArray(
      runtime.staff.employees
    )
      ? runtime.staff.employees
      : [];

  const currentById =
    new Map(
      runtime
        .staff
        .employees
        .map(
          item => [
            String(
              item.personId ||
              item.id
            ),
            item
          ]
        )
    );

  const merged = [];

  for (
    const staff
    of normalizeTeam(
      shopId
    )
  ) {
    const key =
      String(
        staff.personId ||
        staff.id
      );

    const old =
      currentById.get(
        key
      ) ||
      {};

    merged.push({
      ...old,
      personId:key,
      staffId:
        String(
          staff.id
        ),
      name:
        staff.name,
      roleId:
        staff.roleId,
      wage:
        Number(
          staff.wage
        ) ||
        3500,
      skill:
        Number(
          staff.skill
        ) ||
        50,
      energy:
        Number(
          staff.live &&
          staff.live.energy
        ) ||
        Number(
          staff
            .personProfile &&
          staff
            .personProfile
            .state &&
          staff
            .personProfile
            .state
            .energy
        ) ||
        70,
      stress:
        Number(
          staff.live &&
          staff.live.stress
        ) ||
        Number(
          staff
            .personProfile &&
          staff
            .personProfile
            .state &&
          staff
            .personProfile
            .state
            .stress
        ) ||
        25,
      satisfaction:
        Number(
          staff.live &&
          staff.live.satisfaction
        ) ||
        Number(
          staff
            .personProfile &&
          staff
            .personProfile
            .state &&
          staff
            .personProfile
            .state
            .satisfaction
        ) ||
        65,
      attendance:
        old.attendance ==
          null
          ? 1
          : old.attendance,
      tenureDays:
        Math.max(
          Number(
            old.tenureDays
          ) ||
          0,
          Number(
            staff.career &&
            staff.career.tenureDays
          ) ||
          0
        ),
      active:
        staff.active !==
        false
    });
  }

  runtime.staff.employees =
    merged;

  runtime.staff.payroll =
    monthlyPayroll(
      shopId
    );

  return runtime.staff;
}

function teamSnapshot(
  shopId,
  time
) {
  const team =
    staffCareer
      .ensureTeam(
        shopId
      )
      .map(
        item =>
          personDatabase
            .employeeSnapshot(
              item
            )
      )
      .filter(Boolean);

  const overview =
    openingPrepSystem
      .getStaffOverview(
        shopId
      );

  let workload = null;

  try {
    workload =
      staffWorkload
        .getSnapshot(
          shopId,
          time
        );
  } catch (error) {
    workload = {
      error:
        error.message
    };
  }

  let coverage = null;

  try {
    coverage =
      operationsSchedule
        .getCoverage(
          shopId,
          time
        );
  } catch (error) {
    coverage = null;
  }

  return {
    version:VERSION,
    shopId,
    headcount:
      team.length,
    monthlyPayroll:
      monthlyPayroll(
        shopId
      ),
    roleCounts:
      roleCounts(
        shopId
      ),
    coverage:
      coverage ||
      {
        factor:
          Number(
            overview.coverage
          ) ||
          0
      },
    workload,
    peopleSummary:
      clone(
        overview
          .peopleSummary ||
        {}
      ),
    employees:
      team
  };
}

function trainingQuote(
  shopId,
  staffId
) {
  return staffCareer
    .trainingQuote(
      shopId,
      staffId
    );
}

function startTraining(
  shopId,
  staffId
) {
  return staffCareer
    .startTraining(
      shopId,
      staffId
    );
}

function giveRaise(
  shopId,
  staffId
) {
  return staffCareer
    .giveRaise(
      shopId,
      staffId
    );
}

function promote(
  shopId,
  staffId
) {
  return staffCareer
    .promote(
      shopId,
      staffId
    );
}

function approveLeave(
  shopId,
  staffId,
  days
) {
  return staffCareer
    .approveLeave(
      shopId,
      staffId,
      days
    );
}

function coach(
  shopId,
  staffId
) {
  return staffCareer
    .coach(
      shopId,
      staffId
    );
}

module.exports = {
  VERSION,
  normalizeTeam,
  candidatePool,
  hireCandidate,
  dismissStaff,
  monthlyPayroll,
  roleCounts,
  syncRuntimeStaff,
  teamSnapshot,
  trainingQuote,
  startTraining,
  giveRaise,
  promote,
  approveLeave,
  coach
};
