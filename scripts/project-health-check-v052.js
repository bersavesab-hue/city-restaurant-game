'use strict';
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const must = ['src/main.js', 'src/scenes/shopScene.js', 'src/property/propertyMarketSystem.js'];
const missing = must.filter(rel => !fs.existsSync(path.join(root, rel)));
console.log('=== Recovery Health v0.5.2 ===');
console.log('required runtime files:', must.length - missing.length + '/' + must.length);
if (missing.length) {
  console.error('missing:', missing.join(', '));
  process.exit(1);
}
for (const rel of ['src/person','src/competitor','src/customer','src/easteregg']) {
  console.log(rel + ':', fs.existsSync(path.join(root, rel)) ? 'OK' : 'MISSING');
}
console.log('health: PASS');
