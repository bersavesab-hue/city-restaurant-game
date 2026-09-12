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

assert.ok(
  manifest.core.some(
    file =>
      file.endsWith(
        'city_base_01.webp'
      )
  ),
  '主包必须使用压缩后的城市地图'
);

assert.ok(
  !manifest.core.some(
    file =>
      file.endsWith(
        'city_base_01.png'
      )
  ),
  '原始大地图不能进入运行主包'
);

console.log(
  'asset pipeline tests passed; core runtime assets = ' +
  (
    coreBytes /
    1024 /
    1024
  ).toFixed(2) +
  'MB'
);
