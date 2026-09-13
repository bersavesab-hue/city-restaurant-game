'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const file = path.join(ROOT, 'src/scenes/shopScene.js');

let source = fs.readFileSync(file, 'utf8');

if (!source.includes('V43_1_PROPERTY_CONSTANTS_HOTFIX')) {
  const constants = `

// V43_1_PROPERTY_CONSTANTS_HOTFIX
const V43_PROPERTY_ICONS = {
  area: 'restaurant',
  frontage: 'view',
  exhaust: 'renovation',
  gas: 'warning',
  power: 'upgrade',
  competitor: 'people',
  event: 'bulletin',
  filter: 'search',
  sort: 'route',
  lease: 'location',
  floor: 'shop',
  layout: 'restaurant',
  warning: 'warning',
  broker: 'people',
  landlord: 'people'
};

const V43_STOREFRONTS = [
  'assets/images/library_store/listings/storefront_1.png',
  'assets/images/library_store/listings/storefront_2.png',
  'assets/images/library_store/listings/storefront_3.png',
  'assets/images/library_store/listings/storefront_4.png',
  'assets/images/library_store/listings/storefront_5.png'
];
`;

  const designRegex = /const\s+DESIGN_W\s*=\s*390\s*;/;

  if (!designRegex.test(source)) {
    throw new Error(
      'V43.1：找不到 DESIGN_W 定义，停止补丁以避免误改'
    );
  }

  source = source.replace(
    designRegex,
    match => match + constants
  );

  fs.writeFileSync(
    file,
    source,
    'utf8'
  );
}

console.log(
  'V43.1 房源市场 Script error 根因已修复'
);
