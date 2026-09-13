'use strict';

const assert =
  require('assert');

const fs =
  require('fs');

const path =
  require('path');

const store =
  fs.readFileSync(
    path.resolve(
      __dirname,
      '../src/scenes/storeScene.js'
    ),
    'utf8'
  );

assert.ok(
  store.includes(
    "renovation:"
  ) &&
  store.includes(
    "'renovation'"
  ) &&
  store.includes(
    "'room:manage'"
  ),
  '门店体系必须保留装修场景路由和包厢装修入口'
);

assert.ok(
  !store.includes(
    "'module:renovation'"
  ),
  '当前门店页通过动态 module:id 生成入口，测试不得错误要求硬编码 module:renovation'
);

console.log(
  'V20.1 store renovation routing regression tests passed'
);
