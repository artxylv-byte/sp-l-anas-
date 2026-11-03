// Bundles the game into ONE self-contained HTML file (dist/index.html) that runs
// offline: double-click it on Windows, or host the dist folder (e.g. GitHub Pages)
// and install it as an app on Android / Windows from the browser.
import * as esbuild from 'esbuild';
import fs from 'node:fs';

const watch = process.argv.includes('--watch');
fs.mkdirSync('dist', { recursive: true });

// Realistic character assets (CC0 MakeHuman data, see tools/build_mh_assets.py) embedded as base64
// so the game stays a single offline file.
function packScript() {
  const dir = 'assets/mh/';
  if (!fs.existsSync(dir + 'manifest.json')) return 'window.__MH_PACK__=null;';
  const m = JSON.parse(fs.readFileSync(dir + 'manifest.json', 'utf8'));
  const tex = {};
  for (const f of fs.readdirSync(dir + 'tex')) tex['tex/' + f] = 'data:image/webp;base64,' + fs.readFileSync(dir + 'tex/' + f).toString('base64');
  const bin = fs.readFileSync(dir + 'pack.bin').toString('base64');
  return 'window.__MH_PACK__=' + JSON.stringify({ m, bin, tex }) + ';';
}

async function build() {
  const res = await esbuild.build({
    entryPoints: ['src/main.js'], bundle: true, format: 'iife', minify: true, write: false,
    target: ['es2020'], legalComments: 'none',
  });
  const js = res.outputFiles[0].text.replace(/<\/script/gi, '<\\/script');
  let html = fs.readFileSync('src/index.html', 'utf8');
  html = html.replace('<!--PWA-->', '<link rel="manifest" href="manifest.webmanifest"><link rel="icon" href="icon.svg"><link rel="apple-touch-icon" href="icon-192.png">');
  html = html.replace('<!--SCRIPT-->', () => `<script>${packScript()}</script>\n<script>${js}</script>`);
  fs.writeFileSync('dist/index.html', html);
  for (const f of fs.readdirSync('public')) fs.copyFileSync(`public/${f}`, `dist/${f}`);
  console.log(`built dist/index.html (${(html.length / 1024).toFixed(0)} KB)`);
}
await build();
if (watch) {
  fs.watch('src', { recursive: true }, () => build().catch((e) => console.error(e.message)));
  console.log('watching src/ …');
}
