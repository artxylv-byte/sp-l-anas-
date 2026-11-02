// Bundles the game into ONE self-contained HTML file (dist/index.html) that runs
// offline: double-click it on Windows, or host the dist folder (e.g. GitHub Pages)
// and install it as an app on Android / Windows from the browser.
import * as esbuild from 'esbuild';
import fs from 'node:fs';

const watch = process.argv.includes('--watch');
fs.mkdirSync('dist', { recursive: true });

async function build() {
  const res = await esbuild.build({
    entryPoints: ['src/main.js'], bundle: true, format: 'iife', minify: true, write: false,
    target: ['es2020'], legalComments: 'none',
  });
  const js = res.outputFiles[0].text.replace(/<\/script/gi, '<\\/script');
  let html = fs.readFileSync('src/index.html', 'utf8');
  html = html.replace('<!--PWA-->', '<link rel="manifest" href="manifest.webmanifest"><link rel="icon" href="icon.svg"><link rel="apple-touch-icon" href="icon-192.png">');
  html = html.replace('<!--SCRIPT-->', () => `<script>${js}</script>`);
  fs.writeFileSync('dist/index.html', html);
  for (const f of fs.readdirSync('public')) fs.copyFileSync(`public/${f}`, `dist/${f}`);
  console.log(`built dist/index.html (${(html.length / 1024).toFixed(0)} KB)`);
}
await build();
if (watch) {
  fs.watch('src', { recursive: true }, () => build().catch((e) => console.error(e.message)));
  console.log('watching src/ …');
}
