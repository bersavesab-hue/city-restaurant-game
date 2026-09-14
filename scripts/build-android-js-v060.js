'use strict';

// CLEAN_BASE_V060_ANDROID_BUNDLER
// Unlike the recovery-era builder, source errors are fatal.
// A stale game.bundle.js is never silently reused.

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const outFile = path.join(
  root,
  'android',
  'app',
  'src',
  'main',
  'assets',
  'game.bundle.js'
);

const entryCandidates = [
  path.join(root, 'android', 'entry.js'),
  path.join(root, 'android', 'entry.js.txt')
];

const entry =
  entryCandidates.find(
    p => fs.existsSync(p)
  );

function normalize(p) {
  return path
    .relative(root, p)
    .replace(/\\/g, '/');
}

if (!entry) {
  throw new Error(
    '缺少 android/entry.js 与 android/entry.js.txt'
  );
}

function resolveModule(fromFile, request) {
  if (!request.startsWith('.')) {
    throw new Error(
      `浏览器构建不支持非相对 require: ${request} in ${normalize(fromFile)}`
    );
  }

  const base =
    path.resolve(
      path.dirname(fromFile),
      request
    );

  const tries = [
    base,
    base + '.js',
    base + '.txt',
    path.join(base, 'index.js')
  ];

  for (const p of tries) {
    if (
      fs.existsSync(p) &&
      fs.statSync(p).isFile()
    ) {
      return p;
    }
  }

  throw new Error(
    `找不到模块 ${request} from ${normalize(fromFile)}`
  );
}

const modules = new Map();

function collect(file) {
  const abs =
    path.resolve(file);

  if (modules.has(abs)) return;

  let code =
    fs.readFileSync(abs, 'utf8');

  const deps = [];

  code = code.replace(
    /require\(\s*(['"])([^'"]+)\1\s*\)/g,
    (all, quote, req) => {
      const dep =
        resolveModule(abs, req);

      deps.push(dep);

      return `__require(${JSON.stringify(normalize(dep))})`;
    }
  );

  modules.set(
    abs,
    {
      id: normalize(abs),
      code
    }
  );

  deps.forEach(collect);
}

collect(entry);

const body = [
  '(function(){',
  'var __modules = {'
];

for (const { id, code } of modules.values()) {
  body.push(
    `${JSON.stringify(id)}: function(module, exports, __require){`
  );
  body.push(code);
  body.push('},');
}

body.push('};');
body.push('var __cache = {};');
body.push('function __require(id){');
body.push(' if (__cache[id]) return __cache[id].exports;');
body.push(
  ' var fn = __modules[id]; if (!fn) throw new Error("Module not found: " + id);'
);
body.push(
  ' var module = {exports:{}}; __cache[id] = module; fn(module,module.exports,__require); return module.exports;'
);
body.push('}');
body.push(
  `__require(${JSON.stringify(normalize(entry))});`
);
body.push('})();');

fs.mkdirSync(
  path.dirname(outFile),
  { recursive: true }
);

fs.writeFileSync(
  outFile,
  body.join('\n')
);

console.log(
  `[build-v060] bundled ${modules.size} modules -> ${normalize(outFile)}`
);
