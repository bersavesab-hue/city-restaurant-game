'use strict';

const assert =
  require('assert');

const fs =
  require('fs');

const os =
  require('os');

const path =
  require('path');

const {
  runLab
} =
  require('../simulator/run100.js');

const temp =
  fs.mkdtempSync(
    path.join(
      os.tmpdir(),
      'player-lab-report-'
    )
  );

const report =
  runLab(
    path.resolve(
      __dirname,
      '..'
    ),
    {
      writeReport:
        true,
      outputDir:
        temp
    }
  );

assert.strictEqual(
  report.meta
    .personaCount,
  100
);

for (
  const name of [
    'report.html',
    'report.md',
    'summary.json',
    'issues.json',
    'players.json',
    'issues.csv',
    'players.csv',
    'github-summary.md'
  ]
) {
  const file =
    path.join(
      temp,
      name
    );

  assert.ok(
    fs.existsSync(
      file
    ),
    '缺少报告文件：' +
      name
  );

  assert.ok(
    fs.statSync(
      file
    ).size >
      20,
    '报告文件为空：' +
      name
  );
}

const html =
  fs.readFileSync(
    path.join(
      temp,
      'report.html'
    ),
    'utf8'
  );

assert.ok(
  html.includes(
    '100名玩家实验室'
  )
);

assert.ok(
  html.includes(
    '100名玩家逐人反馈'
  )
);

const players =
  JSON.parse(
    fs.readFileSync(
      path.join(
        temp,
        'players.json'
      ),
      'utf8'
    )
  );

assert.strictEqual(
  players.length,
  100
);

fs.rmSync(
  temp,
  {
    recursive:
      true,
    force:
      true
  }
);

console.log(
  'player lab report tests passed'
);
