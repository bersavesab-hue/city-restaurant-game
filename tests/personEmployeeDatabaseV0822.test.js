'use strict';

const assert =
  require('assert');

const database =
  require('../src/person/personEmployeeDatabaseV0822.js');

const validation =
  database.validate();

assert.ok(
  validation.ok,
  validation.issues.join('; ')
);

assert.equal(
  validation.stats.personalityAxes,
  12
);

assert.ok(
  validation.stats.traits >=
  60
);

assert.ok(
  validation.stats.surnames >
  0
);

assert.ok(
  validation.stats.givenNames >
  0
);

assert.ok(
  validation.stats.npcRoles >=
  20
);

const a =
  database
    .createCandidate(
      'staff-v0822-seed',
      {
        roleId:'chef',
        day:12,
        index:3,
        baseWage:6800
      }
    );

const b =
  database
    .createCandidate(
      'staff-v0822-seed',
      {
        roleId:'chef',
        day:12,
        index:3,
        baseWage:6800
      }
    );

assert.deepEqual(
  a,
  b,
  '相同seed候选人必须稳定可重放'
);

assert.equal(
  a.databaseVersion,
  '0.8.22'
);

assert.ok(
  a.personProfile
);

assert.ok(
  a.personProfile.skills
);

assert.ok(
  a.skill >= 0 &&
  a.skill <= 100
);

const pool =
  database
    .createCandidatePool(
      'pool-v0822',
      {
        roleId:'server',
        day:5,
        count:20,
        baseWage:4200
      }
    );

assert.equal(
  pool.length,
  20
);

assert.equal(
  new Set(
    pool.map(
      item =>
        item.id
    )
  ).size,
  20
);

const legacy =
  database
    .normalizeEmployee({
      id:'staff_legacy',
      name:'测试员工',
      roleId:'server',
      wage:4600,
      skill:63
    });

assert.equal(
  legacy.databaseVersion,
  '0.8.22'
);

assert.equal(
  legacy.personId,
  'staff_legacy'
);

assert.ok(
  legacy.personProfile
);

assert.ok(
  legacy.live.energy >=
  0
);

const snap =
  database
    .employeeSnapshot(
      legacy
    );

assert.equal(
  snap.id,
  'staff_legacy'
);

assert.equal(
  snap.wage,
  4600
);

console.log(
  'V0.8.22 person/employee database tests passed'
);
