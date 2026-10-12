#!/usr/bin/env node
// Extracts design tokens (colors, fonts, sizes, spacing, radii, shadows, CSS vars)
// from a public URL. Zero dependencies (Node 18+). If Playwright is installed,
// pass --computed to also sample computed styles of key elements after JS renders.
//
// Usage: node extract-styles.mjs <url> <outDir> [--computed]
// Output: <outDir>/tokens.json, <outDir>/raw.css, <outDir>/page.html

import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const [, , url, outDir, ...flags] = process.argv;
if (!url || !outDir) {
  console.error('Usage: node extract-styles.mjs <url> <outDir> [--computed]');
  process.exit(1);
}
const wantComputed = flags.includes('--computed');
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130 Safari/537.36';
const MAX_CSS_BYTES = 3_000_000;

async function get(u) {
  const res = await fetch(u, { headers: { 'User-Agent': UA }, redirect: 'follow' });
  if (!res.ok) throw new Error(`${res.status} ${u}`);
  return res.text();
}

function count(map, key, n = 1) {
  if (!key) return;
  map.set(key, (map.get(key) || 0) + n);
}

function top(map, limit = 30) {
  return [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, limit)
    .map(([value, uses]) => ({ value, uses }));
}

function normColor(c) {
  c = c.trim().toLowerCase();
  const m = c.match(/^#([0-9a-f]{3,4})$/);
  if (m) c = '#' + [...m[1]].map((x) => x + x).join('');
  return c.replace(/\s+/g, ' ');
}

async function collectCss(html, baseUrl) {
  const chunks = [];
  const linkRe = /<link\b[^>]*>/gi;
  const hrefs = [];
  for (const tag of html.match(linkRe) || []) {
    if (!/rel=["']?[^"'>]*stylesheet/i.test(tag)) continue;
    const href = tag.match(/href=["']?([^"'\s>]+)/i)?.[1];
    if (href) hrefs.push(new URL(href.replace(/&amp;/g, '&'), baseUrl).href);
  }
  for (const m of html.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/gi)) chunks.push(m[1]);
  // inline style="" attributes
  for (const m of html.matchAll(/\sstyle=["']([^"']+)["']/gi)) chunks.push(`x{${m[1]}}`);

  const seen = new Set();
  let total = chunks.join('').length;
  const queue = [...hrefs];
  while (queue.length && total < MAX_CSS_BYTES) {
    const href = queue.shift();
    if (seen.has(href)) continue;
    seen.add(href);
    try {
      const css = await get(href);
      total += css.length;
      chunks.push(`/* ${href} */\n${css}`);
      for (const m of css.matchAll(/@import\s+(?:url\()?["']?([^"')\s;]+)/gi)) {
        queue.push(new URL(m[1], href).href);
      }
    } catch (e) {
      console.warn('skip', href, e.message);
    }
  }
  return { css: chunks.join('\n'), stylesheets: [...seen] };
}

function analyze(css) {
  const colors = new Map(), fonts = new Map(), sizes = new Map(), weights = new Map(),
    spacing = new Map(), radii = new Map(), shadows = new Map(), lineHeights = new Map(),
    breakpoints = new Map();
  const vars = {};
  const fontFaces = [];

  const colorRe = /#[0-9a-f]{3,8}\b|(?:rgba?|hsla?|oklch)\((?:[^()]|\([^()]*\))*\)/gi;
  const declRe = /([-\w]+)\s*:\s*([^;{}]+)/g;

  for (const m of css.matchAll(/@font-face\s*{([^}]*)}/gi)) {
    const fam = m[1].match(/font-family\s*:\s*([^;]+)/i)?.[1]?.trim();
    const src = m[1].match(/url\(([^)]+)\)/i)?.[1];
    if (fam) fontFaces.push({ family: fam.replace(/["']/g, ''), src });
  }
  for (const m of css.matchAll(/@media[^{]*\((?:min|max)-width\s*:\s*([\d.]+(?:px|em|rem))/gi)) count(breakpoints, m[1]);

  for (const [, propRaw, valRaw] of css.matchAll(declRe)) {
    const prop = propRaw.toLowerCase();
    const val = valRaw.replace(/!important/i, '').trim();
    if (prop.startsWith('--')) {
      if (Object.keys(vars).length < 400) vars[prop] = val;
    }
    for (const c of val.match(colorRe) || []) count(colors, normColor(c));
    if (prop === 'font-family') count(fonts, val.replace(/\s+/g, ' '));
    else if (prop === 'font-size') count(sizes, val);
    else if (prop === 'font-weight') count(weights, val);
    else if (prop === 'line-height') count(lineHeights, val);
    else if (prop === 'border-radius') count(radii, val);
    else if (prop === 'box-shadow' && val !== 'none') count(shadows, val);
    else if (/^(margin|padding|gap|row-gap|column-gap)(-|$)/.test(prop)) {
      for (const t of val.split(/\s+/)) if (/^-?[\d.]+(px|rem|em)$/.test(t)) count(spacing, t);
    } else if (prop === 'font') {
      const s = val.match(/([\d.]+(?:px|rem|em))/)?.[1];
      count(sizes, s);
    }
  }

  return {
    cssVariables: vars,
    colors: top(colors, 40),
    fontFamilies: top(fonts, 10),
    fontFaces: fontFaces.slice(0, 20),
    fontSizes: top(sizes, 20),
    fontWeights: top(weights, 10),
    lineHeights: top(lineHeights, 10),
    spacing: top(spacing, 25),
    radii: top(radii, 12),
    shadows: top(shadows, 10),
    breakpoints: top(breakpoints, 10),
  };
}

async function computed(u) {
  let pw;
  try { pw = await import('playwright'); } catch {
    console.warn('Playwright not installed; skipping --computed (npm i -D playwright && npx playwright install chromium)');
    return null;
  }
  const browser = await pw.chromium.launch();
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await page.goto(u, { waitUntil: 'networkidle', timeout: 45000 });
    return await page.evaluate(() => {
      const props = ['color', 'backgroundColor', 'fontFamily', 'fontSize', 'fontWeight', 'lineHeight',
        'letterSpacing', 'padding', 'margin', 'borderRadius', 'border', 'boxShadow', 'textTransform'];
      const sels = { body: 'body', header: 'header, [role=banner]', nav: 'nav', h1: 'h1', h2: 'h2', h3: 'h3',
        p: 'p', a: 'a', button: 'button, .btn, [class*=button]', input: 'input[type=text], input:not([type]), textarea',
        card: '[class*=card]', footer: 'footer', table: 'table', th: 'th', td: 'td' };
      const out = {};
      for (const [k, s] of Object.entries(sels)) {
        const el = document.querySelector(s);
        if (!el) continue;
        const cs = getComputedStyle(el);
        out[k] = Object.fromEntries(props.map((p) => [p, cs[p]]));
      }
      const rootVars = {};
      const rs = getComputedStyle(document.documentElement);
      for (const sheet of document.styleSheets) {
        let rules; try { rules = sheet.cssRules; } catch { continue; }
        for (const r of rules) {
          if (r.selectorText === ':root' || r.selectorText === 'html') {
            for (const name of r.style) if (name.startsWith('--')) rootVars[name] = rs.getPropertyValue(name).trim();
          }
        }
      }
      return { elements: out, rootVariables: rootVars };
    });
  } finally {
    await browser.close();
  }
}

const html = await get(url);
const { css, stylesheets } = await collectCss(html, url);
const tokens = { url, fetchedAt: new Date().toISOString(), stylesheets, ...analyze(css) };
if (wantComputed) tokens.computed = await computed(url);

await mkdir(outDir, { recursive: true });
await writeFile(join(outDir, 'page.html'), html);
await writeFile(join(outDir, 'raw.css'), css);
await writeFile(join(outDir, 'tokens.json'), JSON.stringify(tokens, null, 2));
console.log(`Wrote ${join(outDir, 'tokens.json')} (${stylesheets.length} stylesheets, ${css.length} bytes CSS)`);
