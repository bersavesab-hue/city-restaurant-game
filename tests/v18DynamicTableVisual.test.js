'use strict';

const assert =
  require('assert');

const fs =
  require('fs');

const path =
  require('path');

const source =
  fs.readFileSync(
    path.resolve(
      __dirname,
      '../src/scenes/renovationScene.js'
    ),
    'utf8'
  );

assert.ok(
  source.includes(
    "'visual_table_'"
  ),
  '装修桌型资源必须允许按人数动态拼接资源键'
);

assert.ok(
  !fs.readFileSync(
    path.resolve(
      __dirname,
      'visualFidelity.test.js'
    ),
    'utf8'
  ).includes(
    "renovation.includes(\n    'visual_table_4'"
  ),
  '高保真测试不能再次错误要求硬编码 visual_table_4'
);

console.log(
  'V18 dynamic table visual regression tests passed'
);
