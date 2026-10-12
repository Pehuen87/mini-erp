#!/usr/bin/env node
// Generates an original SVG favicon (rounded square + initial) from the extracted palette.
// Does not use any asset from the source site.
//
// Usage: node generate-favicon.mjs <outFile.svg> --bg "#087ea4" --text "Mini ERP" [--fg "#ffffff"] [--font "Inter, sans-serif"]

import { writeFile } from 'node:fs/promises';

const args = process.argv.slice(2);
const out = args[0];
const opt = (name, def) => {
  const i = args.indexOf(`--${name}`);
  return i > -1 && args[i + 1] ? args[i + 1] : def;
};
if (!out || out.startsWith('--')) {
  console.error('Usage: node generate-favicon.mjs <outFile.svg> --bg "#hex" --text "App name" [--fg "#hex"] [--font "family"]');
  process.exit(1);
}

const bg = opt('bg', '#2563eb');
const text = opt('text', 'App');
const font = opt('font', 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif');

// Pick black or white text for best contrast against bg unless --fg is given.
function luminance(hex) {
  const m = hex.replace('#', '').match(/^([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (!m) return 0;
  const h = m[1].length === 3 ? [...m[1]].map((c) => c + c).join('') : m[1];
  const [r, g, b] = [0, 2, 4].map((i) => {
    const c = parseInt(h.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
const fg = opt('fg', luminance(bg) > 0.4 ? '#111111' : '#ffffff');

// Up to 2 initials: "Mini ERP" -> "ME", "Ventas" -> "V".
const words = text.trim().split(/\s+/).filter(Boolean);
const initials = (words.length > 1 ? words[0][0] + words[1][0] : (words[0] || 'A')[0]).toUpperCase();
const size = initials.length > 1 ? 30 : 40;
const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <rect width="64" height="64" rx="14" fill="${esc(bg)}"/>
  <text x="32" y="33" text-anchor="middle" dominant-baseline="central" font-family="${esc(font)}" font-size="${size}" font-weight="700" fill="${esc(fg)}">${esc(initials)}</text>
</svg>
`;
await writeFile(out, svg);
console.log(`Wrote ${out} (${initials} on ${bg}, text ${fg})`);
