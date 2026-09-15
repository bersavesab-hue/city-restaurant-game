'use strict';

const assert=require('assert');
const fs=require('fs');
const path=require('path');
const ROOT=path.resolve(__dirname,'..');

function read(rel){return fs.readFileSync(path.join(ROOT,rel),'utf8');}
function versionAtLeast(current,minimum){
  const a=String(current||'0').split('.').map(Number);
  const b=String(minimum||'0').split('.').map(Number);
  const n=Math.max(a.length,b.length);
  for(let i=0;i<n;i++){const av=a[i]||0,bv=b[i]||0;if(av>bv)return true;if(av<bv)return false;}
  return true;
}

const pkg=JSON.parse(read('package.json'));
assert.ok(versionAtLeast(pkg.version,'0.8.43'));

for(const rel of [
  'src/operations/dailyOperatingCycleV0840.js',
  'src/operations/decisionFeedbackV0841.js',
  'src/diagnostics/playtestHealthV0842.js',
  'src/balance/operatingBalanceTunerV0843.js'
]){
  assert.ok(fs.existsSync(path.join(ROOT,rel)),rel+' 必须存在');
}

const operations=read('src/operations/operationsStoreV080.js');
for(const marker of [
  'dailyOperatingCycleV0840.js',
  'decisionFeedbackV0841.js',
  'playtestHealthV0842.js',
  'operatingBalanceTunerV0843.js',
  'decisionContextSnapshot(',
  'recordTrackedDecision(',
  'startOperatingDay(',
  'operatingDaySnapshot(',
  'operatingDayHistory(',
  'closeOperatingDaySafe(',
  'recordPlayerDecision(',
  'decisionFeedbackSnapshot(',
  'playtestHealthSnapshot(',
  'operatingBalanceSnapshot(',
  'runOperatingBalanceCalibration(',
  "recordTrackedDecision(\n      shopId,\n      'menu_price'",
  "recordTrackedDecision(\n      shopId,\n      'staff_hire'",
  "recordTrackedDecision(\n      shopId,\n      'marketing'"
]){
  assert.ok(operations.includes(marker),'operationsStore缺少 '+marker);
}

const index=read('src/operations/index.js');
for(const marker of [
  'dailyOperatingCycleV0840.js',
  'decisionFeedbackV0841.js',
  'playtestHealthV0842.js',
  'operatingBalanceTunerV0843.js'
]){
  assert.ok(index.includes(marker),'operations index缺少 '+marker);
}

const main=read('src/main.js');
assert.ok(/newGameFlow\s*\.\s*getStartupRoute\s*\(/.test(main),'V0.8.14启动路线兼容契约不能丢');

const runner=read('scripts/run-ci-tests-v060.js');
for(const test of [
  'tests/dailyOperatingCycleV0840.test.js',
  'tests/decisionFeedbackV0841.test.js',
  'tests/playtestHealthV0842.test.js',
  'tests/operatingBalanceTunerV0843.test.js',
  'tests/operatingDayIntegrationV0843.test.js',
  'tests/updateInfrastructureV0843.test.js',
  'tests/updateInfrastructureV0839.test.js',
  'tests/fullIntegrationSimulationV0835.test.js'
]){
  assert.ok(runner.includes(test),'永久CI缺少 '+test);
}

assert.ok(!fs.existsSync(path.join(ROOT,'scripts/apply-update-patch.js')));
assert.ok(!fs.existsSync(path.join(ROOT,'apply-update.yml')));

console.log('V0.8.43 operating-day infrastructure tests passed');
