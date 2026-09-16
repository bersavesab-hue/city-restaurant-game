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
        'assets/images/generated/atlas_regions.json'
      ),
      'utf8'
    )
  );

assert.ok(
  manifest.atlases.ui_components_v1,
  '缺少UI图集定义'
);

assert.ok(
  manifest.atlases.renovation_assets_v1,
  '缺少装修图集定义'
);

assert.ok(
  Object.keys(
    manifest
      .atlases
      .ui_components_v1
      .regions
  ).length >= 30,
  'UI图集区域应至少30个'
);

assert.ok(
  Object.keys(
    manifest
      .atlases
      .renovation_assets_v1
      .regions
  ).length >= 46,
  '装修图集区域应至少46个'
);

console.log(
  'atlas split manifest tests passed'
);
