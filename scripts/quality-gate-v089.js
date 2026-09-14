'use strict';

const cp =
  require('child_process');

const path =
  require('path');

const ROOT =
  path.resolve(
    __dirname,
    '..'
  );

const MANDATORY_TESTS = [
  'tests/qualityGateV089.test.js',
  'tests/playerLab.test.js',
  'tests/playerLabIsolation.test.js',
  'tests/playerLabReport.test.js',
  'tests/androidEditableModal.test.js',
  'tests/districtInsight.test.js',
  'tests/visualAssets.test.js',
  'tests/visualFidelity.test.js'
];

function runNode(
  relative,
  args=[]
) {
  const file =
    path.join(
      ROOT,
      relative
    );

  console.log(
    '\n[QUALITY GATE]',
    relative
  );

  const result =
    cp.spawnSync(
      process.execPath,
      [
        file,
        ...args
      ],
      {
        cwd:
          ROOT,
        stdio:
          'inherit'
      }
    );

  if (
    result.status !==
    0
  ) {
    process.exit(
      result.status ||
      1
    );
  }
}

for (
  const test
  of MANDATORY_TESTS
) {
  runNode(
    test
  );
}

runNode(
  'simulator/run100.js',
  [
    '--ci',
    '--report',
    '--output',
    path.join(
      ROOT,
      'reports/player-lab/latest'
    )
  ]
);

console.log(
  '\nQUALITY GATE V0.8.9 PASS'
);
