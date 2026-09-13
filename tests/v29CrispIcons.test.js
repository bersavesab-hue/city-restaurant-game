"use strict";
const assert=require("assert"),fs=require("fs"),path=require("path");const ROOT=path.resolve(__dirname,"..");const main=fs.readFileSync(path.join(ROOT,"src/main.js"),"utf8");
assert.ok(main.includes('V29_CRISP_ICON_PASS'),'V29图标层必须写入');assert.ok(main.includes('V26_HARD_REBUILD_HOME'),'不能破坏V26主页');assert.ok(!main.includes('V27_TARGET_REFERENCE_SKIN'),'不能恢复V27整页覆盖');
for(const f of ['hud_money.png','hud_crown.png','hud_weather.png','nav_city.png','nav_city_active.png','nav_traffic.png','metric_population.png','metric_demand.png']) assert.ok(fs.existsSync(path.join(ROOT,'assets/images/v29',f)),'缺少V29资源 '+f);
for(const f of ['university.png','hightech.png','cbd.png','oldtown.png','village.png','industry.png','market.png']) assert.ok(fs.existsSync(path.join(ROOT,'assets/images/target_home/markers',f)),'缺少高清针标 '+f);
console.log('V29 crisp icon regression tests passed');
