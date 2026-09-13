'use strict';

const assert =
  require('assert');

const fs =
  require('fs');

const path =
  require('path');

const main =
  fs.readFileSync(
    path.resolve(
      __dirname,
      '../src/main.js'
    ),
    'utf8'
  );

const legacy =
  fs.readFileSync(
    path.resolve(
      __dirname,
      'uiV19.test.js'
    ),
    'utf8'
  );

assert.ok(
  main.includes(
    'const preferLeft'
  ) &&
  main.includes(
    'boxW'
  ),
  'V20商圈气泡必须保留左右翻转和屏幕边界约束'
);

assert.ok(
  legacy.includes(
    "'boxW'"
  ),
  '旧V19兼容测试必须接受V20中的 boxW 命名'
);

console.log(
  'V20.2 district label compatibility regression tests passed'
);
