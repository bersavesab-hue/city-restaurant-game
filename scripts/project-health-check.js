'use strict';

const fs = require('fs');
const path = require('path');
const childProcess = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const REPORT_DIR = path.join(ROOT, 'reports', 'project-health');
const args = new Set(process.argv.slice(2));

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

function exists(rel) {
  return fs.existsSync(path.join(ROOT, rel));
}

function countRegex(text, regex) {
  const matches = text.match(regex);
  return matches ? matches.length : 0;
}

function listJsFiles(dir) {
  const absolute = path.join(ROOT, dir);
  if (!fs.existsSync(absolute)) return [];

  const result = [];
  const stack = [absolute];

  while (stack.length) {
    const current = stack.pop();
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) stack.push(full);
      else if (entry.isFile() && entry.name.endsWith('.js')) result.push(full);
    }
  }

  return result;
}

function gitTrackedFiles() {
  const result = childProcess.spawnSync(
    'git',
    ['ls-files', '-z'],
    { cwd: ROOT, encoding: 'utf8' }
  );

  if (result.status !== 0) return [];
  return String(result.stdout || '').split('\0').filter(Boolean);
}

function isGeneratedTracked(file) {
  const normalized = file.replace(/\\/g, '/');
  return (
    normalized.startsWith('node_modules/') ||
    normalized.startsWith('android/.gradle/') ||
    normalized.startsWith('android/build/') ||
    normalized.startsWith('android/app/build/') ||
    normalized.startsWith('android/app/src/main/assets/assets/') ||
    normalized.startsWith('reports/player-lab/latest/') ||
    normalized.startsWith('reports/project-health/') ||
    normalized.startsWith('player-lab-output/') ||
    normalized === 'android/app/src/main/assets/game.bundle.js' ||
    normalized === 'android/local.properties' ||
    normalized === 'local.properties' ||
    normalized === 'update .zip' ||
    /\.(?:apk|aab|dex|log|tmp|temp)$/i.test(normalized)
  );
}

function addIssue(issues, priority, id, title, detail, remediation) {
  issues.push({ priority, id, title, detail, remediation });
}

function buildMarkdown(report) {
  const lines = [];
  lines.push('# 项目自动体检报告');
  lines.push('');
  lines.push('- 健康分：' + report.score + '/100');
  lines.push('- P0：' + report.counts.P0 + '；P1：' + report.counts.P1 + '；P2：' + report.counts.P2 + '；P3：' + report.counts.P3);
  lines.push('- src/main.js：' + report.metrics.mainLines + ' 行；drawBottomNav 实现 ' + report.metrics.bottomNavDefinitions + ' 套；loadResources 实现 ' + report.metrics.loadResourceDefinitions + ' 套');
  lines.push('- 测试文件：' + report.metrics.testFiles + '；npm test 已纳入：' + report.metrics.testsInScript + '；未纳入：' + report.metrics.testsOutsideScript.length);
  lines.push('- 被 Git 跟踪的生成垃圾：' + report.metrics.trackedGeneratedCount + ' 个');
  lines.push('');

  if (!report.issues.length) {
    lines.push('未发现结构性问题。');
  } else {
    lines.push('## 问题');
    lines.push('');
    for (const issue of report.issues) {
      lines.push('### [' + issue.priority + '] ' + issue.title);
      lines.push('');
      lines.push(issue.detail);
      lines.push('');
      lines.push('处理：' + issue.remediation);
      lines.push('');
    }
  }

  lines.push('## 大文件/大模块');
  lines.push('');
  for (const file of report.metrics.largeSourceFiles.slice(0, 12)) {
    lines.push('- ' + file.path + '：' + file.lines + ' 行');
  }

  if (report.metrics.testsOutsideScript.length) {
    lines.push('');
    lines.push('## 未纳入 npm test 的测试');
    lines.push('');
    for (const file of report.metrics.testsOutsideScript) lines.push('- ' + file);
  }

  return lines.join('\n') + '\n';
}

function main() {
  const mainJs = exists('src/main.js') ? read('src/main.js') : '';
  const packageJson = exists('package.json') ? JSON.parse(read('package.json')) : { scripts: {} };
  const testScript = String((packageJson.scripts && packageJson.scripts.test) || '');

  const testDir = path.join(ROOT, 'tests');
  const testFiles = fs.existsSync(testDir)
    ? fs.readdirSync(testDir).filter(name => name.endsWith('.test.js')).sort()
    : [];

  const testsInScript = Array.from(
    testScript.matchAll(/tests\/([^\s&]+\.test\.js)/g),
    match => match[1]
  );
  const testsOutsideScript = testFiles.filter(name => !testsInScript.includes(name));

  const sourceFiles = listJsFiles('src').map(full => {
    const text = fs.readFileSync(full, 'utf8');
    return {
      path: path.relative(ROOT, full).replace(/\\/g, '/'),
      lines: text.split(/\r?\n/).length,
      bytes: Buffer.byteLength(text)
    };
  }).sort((a, b) => b.lines - a.lines);

  const tracked = gitTrackedFiles();
  const trackedGenerated = tracked.filter(isGeneratedTracked);

  const bottomNavDefinitions = countRegex(mainJs, /drawBottomNav\s*=\s*function|function\s+drawBottomNav\s*\(/g);
  const loadResourceDefinitions = countRegex(mainJs, /loadResources\s*=\s*function|function\s+loadResources\s*\(/g);
  const versionMarkers = Array.from(new Set(mainJs.match(/V(?:1\d|2\d|3\d)_[A-Z0-9_]+/g) || []));
  const registeredScenes = Array.from(mainJs.matchAll(/sceneManager\s*\.register\s*\(\s*['"]([^'"]+)['"]/g), m => m[1]);

  const placeholderScenes = ['researchScene.js', 'supplyScene.js', 'businessScene.js'].filter(name => {
    const rel = 'src/scenes/' + name;
    if (!exists(rel)) return false;
    const text = read(rel);
    return text.includes("require('./simpleScene.js')") && /handleTap\s*\([^)]*\)\s*\{\s*return false;\s*\}/s.test(text);
  });

  const saveWired = /require\(['"]\.\/core\/saveSystem\.js['"]\)/.test(mainJs);
  const systemRegistered = registeredScenes.includes('system');

  const issues = [];

  if (trackedGenerated.length) {
    addIssue(
      issues,
      'P0',
      'TRACKED_GENERATED_FILES',
      '生成文件仍被 Git 跟踪',
      '检测到 ' + trackedGenerated.length + ' 个构建缓存、依赖、Android镜像资源或自动报告仍在 Git 索引中。',
      '运行 scripts/repo-cleanup.js --untrack；V34 自动清理流程会执行这一操作。'
    );
  }

  if (bottomNavDefinitions > 1 || loadResourceDefinitions > 1) {
    addIssue(
      issues,
      'P1',
      'VERSION_OVERRIDE_DEBT',
      'main.js 仍存在多代覆盖层',
      'drawBottomNav=' + bottomNavDefinitions + ' 套，loadResources=' + loadResourceDefinitions + ' 套，版本标记=' + versionMarkers.length + ' 个。',
      '后续做一次受测试保护的正式组件化重构；自动清理器只报警，不自动删源码。'
    );
  }

  if (!saveWired) {
    addIssue(
      issues,
      'P1',
      'SAVE_NOT_WIRED',
      '存档系统尚未接入主入口',
      'src/core/saveSystem.js 存在，但 src/main.js 未引入。',
      '在正式系统页面接入读档、存档、新游戏与自动保存。'
    );
  }

  if (!systemRegistered) {
    addIssue(
      issues,
      'P1',
      'SYSTEM_SCENE_MISSING',
      '系统一级入口没有真实场景',
      '底栏存在 system，但 sceneManager 未注册 system 场景。',
      '新增系统页面，并承载存档、声音、字体与新游戏设置。'
    );
  }

  if (placeholderScenes.length) {
    addIssue(
      issues,
      'P1',
      'TOP_LEVEL_PLACEHOLDERS',
      '一级经营页面仍是占位页',
      '占位页：' + placeholderScenes.join('、') + '。',
      '菜单、供应链、数据分别形成独立经营循环。'
    );
  }

  if (testsOutsideScript.length) {
    addIssue(
      issues,
      'P2',
      'TESTS_OUTSIDE_NPM_TEST',
      '存在未纳入 npm test 的测试文件',
      testsOutsideScript.join('、'),
      '逐个判定是过期回归测试还是仍应执行；不要机械加入导致新版本被旧版断言卡住。'
    );
  }

  const largeSourceFiles = sourceFiles.filter(file => file.lines >= 2500);
  if (largeSourceFiles.length) {
    addIssue(
      issues,
      'P2',
      'OVERSIZED_SOURCE_MODULES',
      '存在超大源码模块',
      largeSourceFiles.slice(0, 6).map(file => file.path + ' ' + file.lines + '行').join('；'),
      '后续按 UI组件、场景控制器、业务系统拆分，避免继续单文件膨胀。'
    );
  }

  const weights = { P0: 25, P1: 12, P2: 5, P3: 2 };
  const counts = { P0: 0, P1: 0, P2: 0, P3: 0 };
  for (const issue of issues) counts[issue.priority] += 1;
  const penalty = issues.reduce((sum, issue) => sum + weights[issue.priority], 0);
  const score = Math.max(0, 100 - penalty);

  const report = {
    score,
    counts,
    metrics: {
      mainLines: mainJs ? mainJs.split(/\r?\n/).length : 0,
      bottomNavDefinitions,
      loadResourceDefinitions,
      versionMarkerCount: versionMarkers.length,
      registeredScenes,
      saveWired,
      systemRegistered,
      placeholderScenes,
      testFiles: testFiles.length,
      testsInScript: testsInScript.length,
      testsOutsideScript,
      trackedGeneratedCount: trackedGenerated.length,
      trackedGeneratedSample: trackedGenerated.slice(0, 80),
      largeSourceFiles
    },
    issues
  };

  fs.mkdirSync(REPORT_DIR, { recursive: true });
  fs.writeFileSync(path.join(REPORT_DIR, 'latest.json'), JSON.stringify(report, null, 2) + '\n');
  fs.writeFileSync(path.join(REPORT_DIR, 'latest.md'), buildMarkdown(report));

  console.log('=== Project Health ===');
  console.log('score:', score + '/100');
  console.log('P0/P1/P2/P3:', counts.P0 + '/' + counts.P1 + '/' + counts.P2 + '/' + counts.P3);
  console.log('tracked generated:', trackedGenerated.length);
  console.log('main.js lines:', report.metrics.mainLines);
  console.log('drawBottomNav/loadResources:', bottomNavDefinitions + '/' + loadResourceDefinitions);
  console.log('report:', path.relative(ROOT, REPORT_DIR).replace(/\\/g, '/') + '/latest.md');

  if (args.has('--strict') && counts.P0 > 0) {
    process.exitCode = 2;
  }
}

main();
