'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const source = fs.readFileSync(
  path.join(ROOT, 'src/scenes/storeScene.js'),
  'utf8'
);

assert.ok(
  source.includes('V39_LIBRARY_ASSET_INTEGRATION'),
  'V39资料库素材接入标记必须存在'
);

assert.ok(
  source.includes('LIBRARY_STORE_RESOURCE_LIST') &&
  source.includes("'lib_listing_1'") &&
  source.includes("'lib_listing_5'") &&
  source.includes("'lib_store_hero'"),
  '门店页必须加载资料库拆分素材'
);

assert.ok(
  source.includes("'library-store-split'"),
  '资料库素材必须作为独立资源组加载'
);

assert.ok(
  source.includes('getStoreImage(index)'),
  '多门店列表必须使用真实店铺外观资源池'
);

assert.ok(
  !source.includes(
    "const imageKeys = [\n      'premium_store_hero',\n      'visual_storefront_hero',\n      'premium_explore_banner'"
  ),
  '推荐房源不能再用老资源硬凑'
);

const manifestPath = path.join(
  ROOT,
  'assets/images/library_store/manifest.json'
);

assert.ok(
  fs.existsSync(manifestPath),
  '资料库拆分素材清单必须存在'
);

const manifest = JSON.parse(
  fs.readFileSync(manifestPath, 'utf8')
);

assert.ok(
  manifest.generated === false,
  '这些资源必须标记为资料库裁切，不是新生成图片'
);

assert.ok(
  manifest.asset_count >= 55,
  'V39至少应拆出55个可复用资料库素材'
);

for (const item of manifest.assets) {
  const filePath = path.join(
    ROOT,
    item.path
  );

  assert.ok(
    fs.existsSync(filePath),
    '缺少拆分素材: ' + item.path
  );

  assert.ok(
    fs.statSync(filePath).size > 500,
    '拆分素材异常过小: ' + item.path
  );
}

for (const token of [
  'premium_store_hero',
  'premium_room_1',
  'premium_advice_renovation',
  'premium_advice_permit',
  'premium_advice_staff'
]) {
  assert.ok(
    source.includes(token),
    '历史兼容标记不能丢: ' + token
  );
}

console.log('V39 Library asset integration tests passed');
