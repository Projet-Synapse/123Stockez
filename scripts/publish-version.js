#!/usr/bin/env node
// Powered by OnSpace.AI — announce a release to the in-app update tracker
//
// Writes one row per platform into `app_versions`, which every client polls.
// Uses the service role key, so run it from CI or a trusted shell only.
//
//   node scripts/publish-version.js \
//     --platforms linux,macos,windows \
//     --notes "Correctifs de synchronisation" \
//     [--version 1.2.0] [--channel stable] [--mandatory]
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');

function loadEnvFile(file) {
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (match && !process.env[match[1]]) {
      process.env[match[1]] = match[2].replace(/^["']|["']$/g, '');
    }
  }
}
loadEnvFile(path.join(ROOT, '.env'));
loadEnvFile(path.join(ROOT, '.env.local'));

function arg(name, fallback) {
  const index = process.argv.indexOf(`--${name}`);
  return index !== -1 && process.argv[index + 1] ? process.argv[index + 1] : fallback;
}

const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
const version = arg('version', pkg.version);
const channel = arg('channel', 'stable');
const notes = arg('notes', null);
const mandatory = process.argv.includes('--mandatory');
const platforms = arg('platforms', 'linux,macos,windows,ios,android,web')
  .split(',')
  .map((p) => p.trim())
  .filter(Boolean);

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  console.error('EXPO_PUBLIC_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY sont requis.');
  process.exit(1);
}

const DESKTOP_PLATFORMS = new Set(['linux', 'macos', 'windows']);
const releasesUrl = `https://github.com/${pkg.repository || 'catelyn2332-design/123Stockez'}/releases/tag/v${version}`;

const rows = platforms.map((platform) => ({
  version,
  platform,
  channel,
  mandatory,
  release_notes: notes,
  download_url: DESKTOP_PLATFORMS.has(platform) ? releasesUrl : null,
  published_at: new Date().toISOString(),
}));

(async () => {
  const response = await fetch(`${url}/rest/v1/app_versions?on_conflict=version,platform,channel`, {
    method: 'POST',
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      'Content-Type': 'application/json',
      Prefer: 'resolution=merge-duplicates,return=representation',
    },
    body: JSON.stringify(rows),
  });

  if (!response.ok) {
    console.error(`Publication échouée (HTTP ${response.status}):`, await response.text());
    process.exit(1);
  }

  console.log(`✓ v${version} (${channel}) publiée pour : ${platforms.join(', ')}`);
})();
