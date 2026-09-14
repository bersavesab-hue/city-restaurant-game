'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = process.env.RESOURCE_LIFECYCLE_ROOT
  ? path.resolve(process.env.RESOURCE_LIFECYCLE_ROOT)
  : path.resolve(__dirname, '..');

const IMAGE_EXTS = new Set([
  '.png', '.jpg', '.jpeg', '.webp', '.gif', '.svg'
]);

const TEXT_EXTS = new Set([
  '.js', '.json', '.md', '.txt', '.html', '.css', '.xml', '.yml', '.yaml'
]);

const SKIP_DIRS = new Set([
  '.git', 'node_modules', '.gradle', 'build'
]);

function normalize(rel) {
  return String(rel || '').replace(/\\/g, '/').replace(/^\.\//, '');
}

function listFiles(root, relDir) {
  const base = path.join(root, relDir);

  if (!fs.existsSync(base)) return [];

  const out = [];
  const stack = [base];

  while (stack.length) {
    const current = stack.pop();

    for (const ent of fs.readdirSync(current, { withFileTypes: true })) {
      if (ent.isDirectory() && SKIP_DIRS.has(ent.name)) continue;

      const abs = path.join(current, ent.name);

      if (ent.isDirectory()) {
        stack.push(abs);
      } else if (ent.isFile()) {
        out.push(normalize(path.relative(root, abs)));
      }
    }
  }

  return out.sort();
}

function readJson(root, rel) {
  return JSON.parse(fs.readFileSync(path.join(root, rel), 'utf8'));
}

function getConfig(root) {
  const rel = 'assets/resource-lifecycle.json';

  if (!fs.existsSync(path.join(root, rel))) {
    throw new Error('缺少 ' + rel);
  }

  const config = readJson(root, rel);

  if (config.schemaVersion !== 1) {
    throw new Error('不支持的资源生命周期版本');
  }

  return config;
}

function isImage(rel) {
  return IMAGE_EXTS.has(path.extname(rel).toLowerCase());
}

function policyFor(rel, config) {
  const normalized = normalize(rel);

  const matches = (config.policies || [])
    .filter(item => normalized.startsWith(normalize(item.prefix)))
    .sort((a, b) => normalize(b.prefix).length - normalize(a.prefix).length);

  if (matches.length) {
    return {
      status: matches[0].status,
      reason: matches[0].reason || '',
      managed: true,
      prefix: normalize(matches[0].prefix)
    };
  }

  return {
    status: config.defaultStatus || 'protected',
    reason: '未登记资源默认保护',
    managed: false,
    prefix: null
  };
}

function poolsFor(rel, config) {
  const normalized = normalize(rel);
  const ids = [];

  for (const pool of config.dynamicPools || []) {
    if (
      (pool.prefixes || []).some(prefix =>
        normalized.startsWith(normalize(prefix))
      )
    ) {
      ids.push(pool.id);
    }
  }

  return ids;
}

function versionParts(value) {
  return String(value || '0')
    .split('.')
    .map(part => {
      const match = String(part).match(/\d+/);
      return match ? Number(match[0]) : 0;
    });
}

function versionGte(a, b) {
  const aa = versionParts(a);
  const bb = versionParts(b);
  const len = Math.max(aa.length, bb.length);

  for (let i = 0; i < len; i++) {
    const av = aa[i] || 0;
    const bv = bb[i] || 0;
    if (av > bv) return true;
    if (av < bv) return false;
  }

  return true;
}

function collectTextFiles(root) {
  return listFiles(root, '.').filter(rel => {
    if (rel.startsWith('reports/')) return false;
    if (rel === 'assets/resource-lifecycle.json') return false;
    if (rel === 'src/data/resourcePools.generated.js') return false;
    return TEXT_EXTS.has(path.extname(rel).toLowerCase());
  });
}

function scanReferences(root, assets) {
  const refs = Object.fromEntries(assets.map(asset => [asset, []]));

  for (const rel of collectTextFiles(root)) {
    let text = '';

    try {
      text = fs.readFileSync(path.join(root, rel), 'utf8');
    } catch (error) {
      continue;
    }

    for (const asset of assets) {
      if (text.includes(asset)) {
        refs[asset].push(rel);
      }
    }
  }

  return refs;
}

function buildAudit(root = ROOT) {
  const config = getConfig(root);
  const images = listFiles(root, 'assets/images').filter(isImage);
  const refs = scanReferences(root, images);
  const retired = new Set((config.retired || []).map(x => normalize(x.path)));

  const records = images.map(rel => {
    const policy = policyFor(rel, config);

    return {
      path: rel,
      status: policy.status,
      reason: policy.reason,
      managed: policy.managed,
      policyPrefix: policy.prefix,
      pools: poolsFor(rel, config),
      referencedBy: refs[rel] || [],
      retired: retired.has(rel)
    };
  });

  const count = status => records.filter(x => x.status === status).length;

  return {
    schemaVersion: 1,
    config,
    records,
    summary: {
      total: records.length,
      active: count('active'),
      reserve: count('reserve'),
      shared: count('shared'),
      archive: count('archive'),
      protected: count('protected'),
      dynamic: records.filter(x => x.pools.length).length,
      referenced: records.filter(x => x.referencedBy.length).length,
      unreferenced: records.filter(x => !x.referencedBy.length).length,
      unmanagedProtected: records.filter(x => !x.managed).length,
      explicitlyRetired: records.filter(x => x.retired).length
    }
  };
}

function packageVersion(root) {
  try {
    return readJson(root, 'package.json').version || '0';
  } catch (error) {
    return '0';
  }
}

function evaluateRetired(root, audit) {
  const currentVersion = packageVersion(root);
  const recordByPath = new Map(audit.records.map(x => [x.path, x]));
  const results = [];

  for (const raw of audit.config.retired || []) {
    const entry = {
      ...raw,
      path: normalize(raw.path),
      replacement: normalize(raw.replacement)
    };

    const record = recordByPath.get(entry.path);
    const reasons = [];

    if (!record) reasons.push('源文件不存在');

    if (
      audit.config.rules &&
      audit.config.rules.requireReplacementBeforeDelete !== false
    ) {
      if (!entry.replacement) {
        reasons.push('未登记替代资源');
      } else if (!fs.existsSync(path.join(root, entry.replacement))) {
        reasons.push('替代资源不存在');
      }
    }

    if (
      audit.config.rules &&
      audit.config.rules.requireSaveSafeBeforeDelete !== false &&
      entry.saveSafe !== true
    ) {
      reasons.push('未确认旧存档安全');
    }

    if (record && record.referencedBy.length) {
      reasons.push('仍被代码/数据引用');
    }

    if (
      record &&
      record.pools.length &&
      entry.allowDynamicRetire !== true
    ) {
      reasons.push('仍属于动态资源池');
    }

    if (
      entry.retireAfter &&
      !versionGte(currentVersion, entry.retireAfter)
    ) {
      reasons.push('尚未到退休版本');
    }

    if (entry.keep === true) {
      reasons.push('已标记永久保留');
    }

    results.push({
      ...entry,
      eligible: reasons.length === 0,
      reasons
    });
  }

  return results;
}

function ensureReportDir(root) {
  const dir = path.join(root, 'reports', 'resource-lifecycle');
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function writeReport(root, audit, retired) {
  const report = {
    schemaVersion: 1,
    appVersion: packageVersion(root),
    summary: audit.summary,
    deletion: {
      eligible: retired.filter(x => x.eligible),
      blocked: retired.filter(x => !x.eligible)
    },
    unmanagedProtected: audit.records
      .filter(x => !x.managed)
      .map(x => x.path),
    reserveUnreferenced: audit.records
      .filter(x => x.status === 'reserve' && !x.referencedBy.length)
      .map(x => ({ path: x.path, pools: x.pools }))
  };

  fs.writeFileSync(
    path.join(ensureReportDir(root), 'latest.json'),
    JSON.stringify(report, null, 2) + '\n',
    'utf8'
  );

  return report;
}

function syncPools(root = ROOT) {
  const config = getConfig(root);
  const images = listFiles(root, 'assets/images').filter(isImage);
  const pools = {};

  for (const pool of config.dynamicPools || []) {
    pools[pool.id] = images
      .filter(rel =>
        (pool.prefixes || []).some(prefix =>
          rel.startsWith(normalize(prefix))
        )
      )
      .map(rel => ({
        id: path.basename(rel, path.extname(rel)),
        path: rel
      }));
  }

  const output =
    `'use strict';\n\n` +
    `// AUTO_GENERATED_RESOURCE_POOLS_V1\n` +
    `module.exports = ${JSON.stringify({ schemaVersion: 1, pools }, null, 2)};\n`;

  const abs = path.join(root, 'src/data/resourcePools.generated.js');
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.writeFileSync(abs, output, 'utf8');

  return pools;
}

function garbageCollect(root = ROOT, apply = false) {
  const audit = buildAudit(root);
  const retired = evaluateRetired(root, audit);
  const eligible = retired.filter(x => x.eligible);

  if (apply) {
    for (const item of eligible) {
      fs.rmSync(path.join(root, item.path), { force: true });
      console.log('[resource-gc] 删除', item.path, '->', item.replacement);
    }
  }

  writeReport(root, audit, retired);

  return {
    audit,
    retired,
    eligible,
    applied: apply ? eligible.map(x => x.path) : []
  };
}

function printSummary(audit) {
  const s = audit.summary;

  console.log(
    [
      '[resource-lifecycle]',
      '总资源=' + s.total,
      '活动=' + s.active,
      '备用=' + s.reserve,
      '共享=' + s.shared,
      '归档=' + s.archive,
      '动态池=' + s.dynamic,
      '未引用=' + s.unreferenced,
      '未登记但保护=' + s.unmanagedProtected,
      '明确退休=' + s.explicitlyRetired
    ].join(' ')
  );
}

function runCli() {
  const command = process.argv[2] || 'audit';

  if (command === 'sync-pools') {
    const pools = syncPools(ROOT);
    console.log('[resource-lifecycle] 动态资源池索引已生成');

    for (const [id, items] of Object.entries(pools)) {
      console.log(' ', id, items.length);
    }

    return;
  }

  if (command === 'audit') {
    const audit = buildAudit(ROOT);
    const retired = evaluateRetired(ROOT, audit);
    writeReport(ROOT, audit, retired);
    printSummary(audit);
    console.log(
      '[resource-lifecycle] 可安全删除',
      retired.filter(x => x.eligible).length
    );
    return;
  }

  if (command === 'gc') {
    const apply = process.argv.includes('--apply');
    const result = garbageCollect(ROOT, apply);
    printSummary(result.audit);
    console.log(
      '[resource-gc]',
      apply ? '已删除' : '可删除',
      result.eligible.length
    );
    return;
  }

  throw new Error('未知命令：' + command);
}

if (require.main === module) {
  runCli();
}

module.exports = {
  normalize,
  policyFor,
  poolsFor,
  versionGte,
  buildAudit,
  evaluateRetired,
  syncPools,
  garbageCollect
};
