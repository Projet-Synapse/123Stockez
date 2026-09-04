#!/usr/bin/env node
// Powered by OnSpace.AI — desktop build pipeline
//
//   1. export the Expo web bundle          →  dist/
//   2. copy it into the Electron app root  →  desktop/renderer/
//   3. sync the version so the app, the installer and the update feed agree
//   4. hand off to electron-builder
//
// Usage:  node scripts/build-desktop.js [--publish] [--linux|--mac|--win]
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const DIST = path.join(ROOT, 'dist');
const RENDERER = path.join(ROOT, 'desktop', 'renderer');

const args = process.argv.slice(2);
const shouldPublish = args.includes('--publish');
const targets = args.filter((a) => ['--linux', '--mac', '--win'].includes(a));

function run(command, commandArgs, options = {}) {
  console.log(`\n▸ ${command} ${commandArgs.join(' ')}`);
  execFileSync(command, commandArgs, {
    stdio: 'inherit',
    cwd: ROOT,
    // Windows ships `npx.cmd`, not `npx`; execFileSync cannot spawn a .cmd
    // without going through the shell.
    shell: process.platform === 'win32',
    ...options,
  });
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function writeJson(file, value) {
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);
}

// ── 3 (first, so the exported bundle already knows its own version) ──────────
const rootPkg = readJson(path.join(ROOT, 'package.json'));
const appJsonPath = path.join(ROOT, 'app.json');
const appJson = readJson(appJsonPath);
const desktopPkgPath = path.join(ROOT, 'desktop', 'package.json');
const desktopPkg = readJson(desktopPkgPath);

const version = rootPkg.version;
if (!/^\d+\.\d+\.\d+/.test(version)) {
  throw new Error(`package.json version "${version}" is not semver`);
}

if (appJson.expo.version !== version) {
  appJson.expo.version = version;
  writeJson(appJsonPath, appJson);
  console.log(`• app.json version → ${version}`);
}
if (desktopPkg.version !== version) {
  desktopPkg.version = version;
  writeJson(desktopPkgPath, desktopPkg);
  console.log(`• desktop/package.json version → ${version}`);
}

// ── 1 ───────────────────────────────────────────────────────────────────────
fs.rmSync(DIST, { recursive: true, force: true });
run('npx', ['expo', 'export', '--platform', 'web', '--output-dir', 'dist'], {
  env: { ...process.env, EXPO_PUBLIC_APP_VERSION: version },
});

// ── 2 ───────────────────────────────────────────────────────────────────────
fs.rmSync(RENDERER, { recursive: true, force: true });
fs.cpSync(DIST, RENDERER, { recursive: true });
console.log(`• renderer copied to ${path.relative(ROOT, RENDERER)}`);

// ── 4 ───────────────────────────────────────────────────────────────────────
const builderArgs = [
  'electron-builder',
  '--config',
  'electron-builder.yml',
  ...(targets.length ? targets : []),
  shouldPublish ? '--publish=always' : '--publish=never',
];
run('npx', builderArgs);

console.log('\n✓ Installateurs disponibles dans release/');
