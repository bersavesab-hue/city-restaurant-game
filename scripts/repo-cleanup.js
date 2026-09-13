'use strict';

const childProcess = require('child_process');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const args = new Set(process.argv.slice(2));

function runGit(gitArgs, options) {
  return childProcess.spawnSync(
    'git',
    gitArgs,
    {
      cwd: ROOT,
      encoding: 'utf8',
      stdio: options && options.inherit ? 'inherit' : 'pipe'
    }
  );
}

function ensureRepository() {
  const result = runGit(['rev-parse', '--is-inside-work-tree']);
  return result.status === 0 && String(result.stdout || '').trim() === 'true';
}

function trackedFiles() {
  const result = runGit(['ls-files', '-z']);
  if (result.status !== 0) return [];
  return String(result.stdout || '')
    .split('\0')
    .filter(Boolean);
}

function isSafeGeneratedPath(file) {
  const normalized = file.replace(/\\/g, '/');

  const prefixes = [
    'node_modules/',
    'android/.gradle/',
    'android/build/',
    'android/app/build/',
    'android/app/src/main/assets/assets/',
    'reports/player-lab/latest/',
    'reports/project-health/',
    'player-lab-output/'
  ];

  if (prefixes.some(prefix => normalized.startsWith(prefix))) {
    return true;
  }

  const exact = new Set([
    'android/app/src/main/assets/game.bundle.js',
    'android/local.properties',
    'local.properties',
    'update .zip',
    '.DS_Store',
    'Thumbs.db'
  ]);

  if (exact.has(normalized)) return true;

  return /\.(?:apk|aab|dex|log|tmp|temp)$/i.test(normalized);
}

function untrackFiles(files) {
  const CHUNK = 150;
  let removed = 0;

  for (let i = 0; i < files.length; i += CHUNK) {
    const chunk = files.slice(i, i + CHUNK);
    const result = runGit([
      'rm',
      '-r',
      '--cached',
      '-f',
      '--ignore-unmatch',
      '--',
      ...chunk
    ]);

    if (result.status !== 0) {
      process.stderr.write(result.stderr || result.stdout || 'git rm --cached failed\n');
      process.exit(result.status || 1);
    }

    removed += chunk.length;
  }

  return removed;
}

function main() {
  if (args.has('--ci-auto') && process.env.GITHUB_ACTIONS !== 'true') {
    console.log('[repo-cleanup] 本地 npm test：跳过自动 Git 清理。需要手动清理时运行 npm run repo:cleanup。');
    return;
  }

  if (!ensureRepository()) {
    console.log('[repo-cleanup] 当前环境不是 Git 工作区，跳过。');
    return;
  }

  const tracked = trackedFiles();
  const garbage = tracked.filter(isSafeGeneratedPath);

  if (args.has('--dry-run')) {
    console.log('[repo-cleanup] dry-run：发现可安全取消跟踪文件 ' + garbage.length + ' 个。');
    for (const file of garbage.slice(0, 200)) {
      console.log('  - ' + file);
    }
    if (garbage.length > 200) {
      console.log('  ... 其余 ' + (garbage.length - 200) + ' 个省略');
    }
    return;
  }

  if (garbage.length === 0) {
    console.log('[repo-cleanup] 仓库已干净：没有被 Git 跟踪的安全生成垃圾。');
    return;
  }

  const removed = untrackFiles(garbage);

  console.log('[repo-cleanup] 已从 Git 索引取消跟踪 ' + removed + ' 个安全生成文件。');
  console.log('[repo-cleanup] 工作区文件不会被强制删除；.gitignore 会阻止它们再次进入仓库。');
  console.log('[repo-cleanup] 未触碰 src/、assets/ 原始资源、docs/ 以及任何历史源码覆盖层。');
}

main();
