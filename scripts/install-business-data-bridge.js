'use strict';

const fs = require('fs');
const cp = require('child_process');

const target = 'src/operations/restaurantSimulationV081.js';
const marker = 'BUSINESS_DATA_RUNTIME_BRIDGE_V1';

if (!fs.existsSync(target)) {
  console.log('[经营数据中枢] 新版餐厅经营模块不存在，跳过运行时桥接。');
  process.exit(0);
}

let source = fs.readFileSync(target, 'utf8');
if (!source.includes(marker)) {
  source += `\n\n/* ${marker} */\ntry {\n  if (typeof globalThis !== 'undefined') {\n    globalThis.restaurantSimulation = module.exports;\n  }\n} catch (e) {}\n`;
  fs.writeFileSync(target, source, 'utf8');
}

const result = cp.spawnSync(process.execPath, ['--check', target], { encoding:'utf8' });
if (result.status !== 0) {
  process.stderr.write(result.stdout || '');
  process.stderr.write(result.stderr || '');
  throw new Error('经营数据运行时桥接后语法检查失败');
}
console.log('[经营数据中枢] restaurantSimulation 运行时桥接 PASS');
