'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const ROOT =
  path.resolve(__dirname, '..');

const shop =
  fs.readFileSync(
    path.join(
      ROOT,
      'src/scenes/shopScene.js'
    ),
    'utf8'
  );

const store =
  fs.readFileSync(
    path.join(
      ROOT,
      'src/scenes/storeScene.js'
    ),
    'utf8'
  );

assert.ok(
  shop.includes(
    'V44_PROPERTY_VISUAL_REPAIR'
  )
);

assert.ok(
  store.includes(
    'V44_STORE_VISUAL_REPAIR'
  )
);

assert.ok(
  shop.includes(
    "'assets/images/v32_home/home_background.jpg'"
  ),
  '房源市场必须使用无文字的干净城市背景'
);

assert.ok(
  shop.includes(
    "aliases[name]"
  ) &&
  shop.includes(
    "propertyIconAtlas.icons"
  ),
  '房源硬件必须优先使用语义正确的propertyIconAtlas'
);

assert.ok(
  !shop.includes(
    "exhaust: 'renovation'"
  ),
  '禁止再把排烟映射成大扳手'
);

assert.ok(
  shop.includes(
    "exhaust: 'exhaust'"
  ) &&
  shop.includes(
    "gas: 'gas'"
  ) &&
  shop.includes(
    "power: 'power'"
  ),
  'V43历史映射也必须同步修正为语义正确图标'
);

assert.ok(
  shop.includes(
    "'排烟'"
  ) &&
  shop.includes(
    "'燃气'"
  ) &&
  shop.includes(
    "'三相'"
  ),
  '房源卡必须使用清晰的硬件条件标签'
);

assert.ok(
  shop.includes(
    "'万'"
  ) &&
  shop.includes(
    "'亿'"
  ),
  '房源市场金额必须统一为万/亿格式'
);

assert.ok(
  store.includes(
    "'v44_glossy_star'"
  ) &&
  store.includes(
    'this.drawScoreStars('
  ),
  '推荐房源星级必须改用柔和图片星星'
);

assert.ok(
  store.includes(
    "'v44_store_header'"
  ),
  '门店顶部必须使用干净背景'
);

assert.ok(
  store.includes(
    'V44_GLOSSY_ICONS'
  ) &&
  store.includes(
    'V44_PROPERTY_ALIASES'
  ),
  '门店页必须区分高级图标和语义属性图标'
);

const manifest =
  JSON.parse(
    fs.readFileSync(
      path.join(
        ROOT,
        'assets/images/v44_glossy/manifest.json'
      ),
      'utf8'
    )
  );

assert.strictEqual(
  manifest.generated,
  false
);

for (
  const [
    name,
    item
  ]
  of Object.entries(
    manifest.icons
  )
) {
  assert.ok(
    item.fully_inside_canvas,
    'V44图标主体被裁到画布边缘：' +
      name
  );

  const file =
    path.join(
      ROOT,
      item.path
    );

  assert.ok(
    fs.existsSync(file),
    'V44图标缺失：' +
      item.path
  );
}

console.log(
  'V44 visual repair tests passed'
);
