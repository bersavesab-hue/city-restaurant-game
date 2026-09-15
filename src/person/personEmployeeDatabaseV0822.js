'use strict';

const pack =
  require('./personPackV10.js');

const rules =
  require('./personRulesV10.js');

const { SeededRng } =
  require('../foundation/rng.js');

const VERSION =
  '0.8.22';

const RESTAURANT_ROLE_MAP =
  Object.freeze({
    manager:'manager',
    chef:'chef',
    server:'waiter',
    waiter:'waiter',
    cashier:'cashier',
    warehouse_keeper:'warehouse_keeper',
    procurement:'procurement'
  });

const ROLE_SKILLS =
  Object.freeze({
    manager:[
      'management',
      'operations',
      'leadership'
    ],
    chef:[
      'cooking',
      'prep',
      'foodSafety'
    ],
    server:[
      'service',
      'sales'
    ],
    waiter:[
      'service',
      'sales'
    ],
    cashier:[
      'cashier',
      'service',
      'digital'
    ],
    warehouse_keeper:[
      'operations',
      'procurement'
    ],
    procurement:[
      'procurement',
      'negotiation',
      'finance'
    ]
  });

function clone(value) {
  if (value === undefined) {
    return undefined;
  }

  return JSON.parse(
    JSON.stringify(value)
  );
}

function clamp(
  value,
  min=0,
  max=100
) {
  return Math.max(
    min,
    Math.min(
      max,
      Number(value) || 0
    )
  );
}

function roleSkills(roleId) {
  return (
    ROLE_SKILLS[
      roleId
    ] ||
    [
      'operations'
    ]
  ).slice();
}

function roleDefinition(roleId) {
  const npcRoleId =
    RESTAURANT_ROLE_MAP[
      roleId
    ] ||
    roleId ||
    'waiter';

  return (
    pack.NPC_ROLES
      .find(
        item =>
          item.id ===
          npcRoleId
      ) ||
    null
  );
}

function averageSkill(
  profile,
  roleId
) {
  const skills =
    profile &&
    profile.skills ||
    {};

  const keys =
    roleSkills(
      roleId
    );

  if (!keys.length) {
    return 50;
  }

  return Math.round(
    keys.reduce(
      (
        sum,
        key
      ) =>
        sum +
        (
          Number(
            skills[key]
          ) ||
          0
        ),
      0
    ) /
    keys.length
  );
}

function normalizePersonProfile(
  input
) {
  if (
    !input ||
    typeof input !==
      'object'
  ) {
    return null;
  }

  const profile =
    clone(
      input
    );

  profile.personDatabaseVersion =
    VERSION;

  profile.id =
    String(
      profile.id ||
      profile.name ||
      'person'
    );

  profile.name =
    String(
      profile.name ||
      '未命名员工'
    );

  profile.age =
    Math.max(
      16,
      Math.min(
        80,
        Number(
          profile.age
        ) ||
        25
      )
    );

  profile.skills =
    profile.skills &&
    typeof profile.skills ===
      'object'
      ? profile.skills
      : clone(
          pack.DEFAULT_SKILLS
        );

  profile.personality =
    profile.personality &&
    typeof profile.personality ===
      'object'
      ? profile.personality
      : {};

  profile.state =
    profile.state &&
    typeof profile.state ===
      'object'
      ? profile.state
      : {};

  const defaults = {
    mood:70,
    energy:78,
    stress:18,
    health:82,
    satisfaction:65,
    loyalty:55
  };

  for (
    const [
      key,
      value
    ]
    of Object.entries(
      defaults
    )
  ) {
    profile.state[key] =
      clamp(
        profile.state[key] ==
          null
          ? value
          : profile.state[key]
      );
  }

  profile.relationships =
    profile.relationships &&
    typeof profile.relationships ===
      'object'
      ? profile.relationships
      : {};

  profile.relationshipIds =
    Array.isArray(
      profile.relationshipIds
    )
      ? profile.relationshipIds
      : [];

  profile.memory =
    Array.isArray(
      profile.memory
    )
      ? profile.memory
      : [];

  return profile;
}

function createCandidate(
  seed,
  options
) {
  const opts =
    options ||
    {};

  const roleId =
    opts.roleId ||
    'server';

  const day =
    Number(
      opts.day
    ) ||
    1;

  const index =
    Number(
      opts.index
    ) ||
    0;

  const rng =
    new SeededRng(
      [
        'employee',
        VERSION,
        seed ||
          'default',
        roleId,
        day,
        index
      ].join(':')
    );

  const age =
    opts.age ||
    rng.int(
      20,
      49
    );

  let profile =
    rules
      .createPersonProfile(
        rng,
        {
          age
        }
      );

  profile.id =
    opts.personId ||
    [
      'person',
      roleId,
      day,
      index,
      String(
        rng.int(
          1000,
          9999
        )
      )
    ].join('_');

  const roleDef =
    roleDefinition(
      roleId
    );

  if (roleDef) {
    rules.assignRole(
      profile,
      roleDef.id,
      {
        allowLowFit:true,
        employerId:
          opts.employerId ||
          null
      }
    );
  }

  profile =
    normalizePersonProfile(
      profile
    );

  const fit =
    roleDef
      ? rules.roleFit(
          profile,
          roleDef
        )
      : {
          score:
            averageSkill(
              profile,
              roleId
            )
        };

  const skill =
    averageSkill(
      profile,
      roleId
    );

  const stability =
    Math.round(
      (
        Number(
          profile
            .personality
            .stability
        ) ||
        50
      ) *
        0.62 +
      (
        Number(
          profile
            .personality
            .conscientiousness
        ) ||
        50
      ) *
        0.38
    );

  const experience =
    Math.max(
      0,
      Math.min(
        18,
        Math.round(
          (
            profile.age -
            18
          ) *
          (
            0.18 +
            rng.next() *
              0.34
          )
        )
      )
    );

  const baseWage =
    Math.max(
      2500,
      Number(
        opts.baseWage
      ) ||
      4200
    );

  const wage =
    Math.round(
      baseWage *
      (
        0.82 +
        skill /
          260 +
        experience /
          120 +
        (
          Number(
            fit &&
            fit.score
          ) ||
          50
        ) /
          500
      ) /
      100
    ) *
    100;

  return {
    id:
      opts.id ||
      [
        'candidate',
        roleId,
        day,
        index
      ].join('_'),
    databaseVersion:
      VERSION,
    roleId,
    roleName:
      opts.roleName ||
      roleId,
    name:
      profile.name,
    age:
      profile.age,
    skill,
    stability,
    experience,
    wage,
    score:
      Math.round(
        (
          Number(
            fit &&
            fit.score
          ) ||
          skill
        ) *
          0.45 +
        skill *
          0.30 +
        stability *
          0.15 +
        Math.min(
          100,
          experience *
            8
        ) *
          0.10
      ),
    personalityLabels:
      (
        profile.personalityLabels ||
        []
      ).slice(
        0,
        3
      ),
    personProfile:
      profile
  };
}

function createCandidatePool(
  seed,
  options
) {
  const opts =
    options ||
    {};

  const count =
    Math.max(
      1,
      Math.min(
        100,
        Number(
          opts.count
        ) ||
        8
      )
    );

  const out = [];

  for (
    let i = 0;
    i < count;
    i++
  ) {
    out.push(
      createCandidate(
        seed,
        {
          ...opts,
          index:i
        }
      )
    );
  }

  return out;
}

function normalizeEmployee(
  input,
  options
) {
  if (
    !input ||
    typeof input !==
      'object'
  ) {
    return null;
  }

  const opts =
    options ||
    {};

  const employee =
    clone(
      input
    );

  employee.databaseVersion =
    VERSION;

  employee.id =
    String(
      employee.id ||
      employee.personId ||
      employee.name ||
      'staff'
    );

  employee.personId =
    String(
      employee.personId ||
      employee
        .personProfile &&
      employee
        .personProfile
        .id ||
      employee.id
    );

  employee.roleId =
    employee.roleId ||
    opts.roleId ||
    'server';

  employee.wage =
    Math.max(
      0,
      Number(
        employee.wage
      ) ||
      Number(
        opts.wage
      ) ||
      3500
    );

  employee.personProfile =
    normalizePersonProfile(
      employee.personProfile ||
      opts.personProfile ||
      {
        id:
          employee.personId,
        name:
          employee.name ||
          employee.personId,
        age:
          employee.age ||
          25,
        skills:{
          ...pack.DEFAULT_SKILLS,
          operations:
            Number(
              employee.skill
            ) ||
            50
        }
      }
    );

  employee.name =
    employee.name ||
    employee.personProfile.name;

  employee.skill =
    clamp(
      employee.skill ==
        null
        ? averageSkill(
            employee
              .personProfile,
            employee.roleId
          )
        : employee.skill
    );

  employee.active =
    employee.active !==
      false;

  employee.hiredDay =
    employee.hiredDay ==
      null
      ? (
          opts.hiredDay ==
            null
            ? null
            : Number(
                opts.hiredDay
              )
        )
      : Number(
          employee.hiredDay
        );

  employee.live =
    employee.live &&
    typeof employee.live ===
      'object'
      ? employee.live
      : {};

  employee.live.mood =
    clamp(
      employee.live.mood ==
        null
        ? employee
            .personProfile
            .state
            .mood
        : employee.live.mood
    );

  employee.live.energy =
    clamp(
      employee.live.energy ==
        null
        ? employee
            .personProfile
            .state
            .energy
        : employee.live.energy
    );

  employee.live.stress =
    clamp(
      employee.live.stress ==
        null
        ? employee
            .personProfile
            .state
            .stress
        : employee.live.stress
    );

  employee.live.satisfaction =
    clamp(
      employee.live.satisfaction ==
        null
        ? employee
            .personProfile
            .state
            .satisfaction
        : employee.live.satisfaction
    );

  employee.live.loyalty =
    clamp(
      employee.live.loyalty ==
        null
        ? employee
            .personProfile
            .state
            .loyalty
        : employee.live.loyalty
    );

  return employee;
}

function employeeSnapshot(
  employee
) {
  const e =
    normalizeEmployee(
      employee
    );

  if (!e) {
    return null;
  }

  return {
    id:e.id,
    personId:e.personId,
    name:e.name,
    roleId:e.roleId,
    wage:e.wage,
    skill:e.skill,
    active:e.active,
    hiredDay:e.hiredDay,
    age:
      e.personProfile.age,
    educationId:
      e.personProfile
        .educationId ||
      null,
    personalityLabels:
      (
        e.personProfile
          .personalityLabels ||
        []
      ).slice(
        0,
        4
      ),
    mood:e.live.mood,
    energy:e.live.energy,
    stress:e.live.stress,
    satisfaction:
      e.live.satisfaction,
    loyalty:e.live.loyalty,
    career:
      e.career
        ? clone(
            e.career
          )
        : null
  };
}

function getStats() {
  return {
    version:VERSION,
    personalityAxes:
      pack
        .PERSONALITY_AXES
        .length,
    traits:
      pack
        .PERSON_TRAITS
        .length,
    surnames:
      pack.SURNAMES.length,
    givenNames:
      pack.GIVEN_NAMES.length,
    educations:
      pack.EDUCATIONS.length,
    origins:
      pack.ORIGIN_TYPES.length,
    families:
      pack
        .FAMILY_BACKGROUNDS
        .length,
    careerBackgrounds:
      pack
        .CAREER_BACKGROUNDS
        .length,
    values:
      pack.VALUES.length,
    motivations:
      pack.MOTIVATIONS.length,
    habits:
      pack.HABITS.length,
    flaws:
      pack.FLAWS.length,
    workStyles:
      pack.WORK_STYLES.length,
    socialStyles:
      pack.SOCIAL_STYLES.length,
    moneyAttitudes:
      pack
        .MONEY_ATTITUDES
        .length,
    negotiationStyles:
      pack
        .NEGOTIATION_STYLES
        .length,
    stressResponses:
      pack
        .STRESS_RESPONSES
        .length,
    lifeGoals:
      pack.LIFE_GOALS.length,
    appearances:
      pack
        .APPEARANCE_FEATURES
        .length,
    npcRoles:
      pack.NPC_ROLES.length,
    relationshipTypes:
      pack
        .RELATIONSHIP_TYPES
        .length,
    memoryTypes:
      pack.MEMORY_TYPES.length
  };
}

function validate() {
  const issues = [];

  const dimensions = [
    ['PERSONALITY_AXES',pack.PERSONALITY_AXES],
    ['PERSON_TRAITS',pack.PERSON_TRAITS],
    ['SURNAMES',pack.SURNAMES],
    ['GIVEN_NAMES',pack.GIVEN_NAMES],
    ['EDUCATIONS',pack.EDUCATIONS],
    ['ORIGIN_TYPES',pack.ORIGIN_TYPES],
    ['FAMILY_BACKGROUNDS',pack.FAMILY_BACKGROUNDS],
    ['CAREER_BACKGROUNDS',pack.CAREER_BACKGROUNDS],
    ['VALUES',pack.VALUES],
    ['MOTIVATIONS',pack.MOTIVATIONS],
    ['HABITS',pack.HABITS],
    ['FLAWS',pack.FLAWS],
    ['WORK_STYLES',pack.WORK_STYLES],
    ['SOCIAL_STYLES',pack.SOCIAL_STYLES],
    ['MONEY_ATTITUDES',pack.MONEY_ATTITUDES],
    ['NEGOTIATION_STYLES',pack.NEGOTIATION_STYLES],
    ['STRESS_RESPONSES',pack.STRESS_RESPONSES],
    ['LIFE_GOALS',pack.LIFE_GOALS],
    ['APPEARANCE_FEATURES',pack.APPEARANCE_FEATURES],
    ['NPC_ROLES',pack.NPC_ROLES],
    ['RELATIONSHIP_TYPES',pack.RELATIONSHIP_TYPES],
    ['MEMORY_TYPES',pack.MEMORY_TYPES]
  ];

  for (
    const [
      name,
      rows
    ]
    of dimensions
  ) {
    if (
      !Array.isArray(
        rows
      ) ||
      !rows.length
    ) {
      issues.push(
        name +
        ' 为空'
      );
    }
  }

  const roleIds =
    pack.NPC_ROLES
      .map(
        item =>
          item.id
      );

  if (
    new Set(
      roleIds
    ).size !==
    roleIds.length
  ) {
    issues.push(
      'NPC角色ID重复'
    );
  }

  for (
    const roleId
    of [
      'manager',
      'chef',
      'waiter',
      'cashier'
    ]
  ) {
    if (
      !roleDefinition(
        roleId
      )
    ) {
      issues.push(
        '缺少餐饮核心岗位 ' +
        roleId
      );
    }
  }

  return {
    ok:
      issues.length ===
      0,
    issues,
    stats:
      getStats()
  };
}

module.exports = {
  VERSION,
  RESTAURANT_ROLE_MAP,
  ROLE_SKILLS,
  roleSkills,
  roleDefinition,
  averageSkill,
  normalizePersonProfile,
  createCandidate,
  createCandidatePool,
  normalizeEmployee,
  employeeSnapshot,
  getStats,
  validate
};
