'use strict';

const assert =
  require('assert');

const fs =
  require('fs');

const path =
  require('path');

const ROOT =
  path.resolve(
    __dirname,
    '..'
  );

const manifest =
  JSON.parse(
    fs.readFileSync(
      path.join(
        ROOT,
        'assets/runtime-manifest.json'
      ),
      'utf8'
    )
  );

function sizeOf(relativePath) {
  const full =
    path.join(
      ROOT,
      relativePath
    );

  assert.ok(
    fs.existsSync(full),
    '资源不存在：' +
      relativePath
  );

  return fs.statSync(
    full
  ).size;
}

let coreBytes = 0;

for (
  const file of
  manifest.core
) {
  assert.ok(
    !manifest
      .devOnly
      .includes(
        file
      ),
    '运行时资源不能同时标记为开发参考：' +
      file
  );

  coreBytes +=
    sizeOf(file);
}

assert.ok(
  coreBytes <=
    manifest
      .budgets
      .mainAssetsBytes,
  '主包资源预算超限'
);

for (
  const [
    name,
    files
  ] of
  Object.entries(
    manifest.modules
  )
) {
  let bytes = 0;

  for (
    const file of
    files
  ) {
    bytes +=
      sizeOf(file);
  }

  assert.ok(
    bytes <=
      manifest
        .budgets
        .subpackageBytes,
    '分包 ' +
      name +
      ' 预算超限'
  );
}

assert.strictEqual(
  manifest.policy,
  'full-quality-ui-v14',
  'V14必须使用高清运行资源策略'
);

assert.ok(
  manifest.core.some(
    file =>
      file.endsWith(
        'city_base_01.png'
      )
  ),
  'V14主包必须使用原始PNG城市地图'
);

assert.ok(
  !manifest.core.some(
    file =>
      file.endsWith(
        'city_base_01.webp'
      )
  ),
  'V14运行主包不能继续依赖压缩WebP地图'
);

assert.ok(
  manifest.modules.renovation.some(
    file =>
      file.includes(
        '/split/renovation/'
      ) &&
      file.endsWith(
        '.png'
      )
  ),
  '装修模块必须使用拆分后的PNG组件'
);

console.log(
  'V14 asset pipeline tests passed; core runtime assets = ' +
  (
    coreBytes /
    1024 /
    1024
  ).toFixed(2) +
  'MB'
);
