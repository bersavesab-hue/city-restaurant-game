'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const dir = path.join(root, 'assets/images/v21');

const required = [
  'district_university.png',
  'district_hightech.png',
  'district_cbd.png',
  'district_oldtown.png',
  'district_village.png',
  'district_market.png',
  'district_industry.png',
  'metric_population.png',
  'metric_demand.png',
  'metric_spend.png',
  'metric_restaurants.png',
  'metric_saturation.png',
  'metric_rent.png',
  'nav_city.png',
  'nav_store.png',
  'nav_traffic.png',
  'nav_menu.png',
  'nav_supply.png',
  'nav_data.png',
  'nav_system.png',
  'hud_weather.png',
  'hud_money.png',
  'hud_crown.png'
];

for (const file of required) {
  const full = path.join(dir, file);
  assert.ok(fs.existsSync(full), '缺少V21图标资源: ' + file);
  assert.ok(fs.statSync(full).size > 500, 'V21图标资源异常: ' + file);
}

console.log('V21 icon asset tests passed');
