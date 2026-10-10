// Day 2 Story frames (1080x1920). Instagram's top ~250px and bottom ~340px are covered by its UI,
// so all key content sits in the middle. Poll/quiz/link stickers are added in the app on top of the panels.
const fs = require('fs');
const path = require('path');
const { Resvg } = require('@resvg/resvg-js');

const G = '#0B6E4F', GD = '#084C37', GOLD = '#F5B800', CREAM = '#F4F1E8';
const FONT = "Arial, 'Segoe UI', Helvetica, sans-serif";
const W = 1080, H = 1920;

const mark = (x, y, s) => `
  <g transform="translate(${x} ${y}) scale(${s})">
    <rect width="1024" height="1024" rx="230" fill="${G}"/>
    <rect x="232" y="170" width="560" height="684" rx="48" fill="#FFF"/>
    <rect x="232" y="170" width="64" height="684" rx="32" fill="${CREAM}"/><rect x="262" y="170" width="34" height="684" fill="${CREAM}"/>
    <text x="548" y="590" font-family="${FONT}" font-weight="700" font-size="470" fill="${G}" text-anchor="middle">B</text>
    <rect x="352" y="662" width="344" height="16" rx="8" fill="${G}" opacity="0.35"/><rect x="352" y="710" width="344" height="16" rx="8" fill="${G}" opacity="0.35"/><rect x="352" y="758" width="220" height="16" rx="8" fill="${G}" opacity="0.35"/>
    <circle cx="772" cy="772" r="132" fill="${GOLD}" stroke="${G}" stroke-width="28"/>
    <path d="M708 776 L756 824 L842 722" fill="none" stroke="${GD}" stroke-width="40" stroke-linecap="round" stroke-linejoin="round"/>
  </g>`;

const lines = (arr, x, y, size, anchor = 'middle') =>
  `<text font-family="${FONT}" font-weight="700" font-size="${size}" text-anchor="${anchor}">` +
  arr.map((l, i) => `<tspan x="${x}" y="${y + i * (size + 18)}" fill="${l.gold ? GOLD : '#FFF'}">${l.t}</tspan>`).join('') + `</text>`;

const base = (inner) => `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <rect width="${W}" height="${H}" fill="${G}"/>
  <circle cx="1000" cy="260" r="360" fill="${GD}" opacity="0.5"/>
  <circle cx="60" cy="1700" r="330" fill="${GD}" opacity="0.45"/>
  ${mark(72, 290, 0.1)}
  <text x="190" y="352" font-family="${FONT}" font-weight="700" font-size="42" fill="#FFF">BizLedger</text>
  ${inner}
</svg>`;

const panel = (y, h) => `<rect x="90" y="${y}" width="900" height="${h}" rx="48" fill="#FFFFFF" opacity="0.12"/>`;

const frames = {
  'story-day2-1': base(`
    <text x="540" y="560" font-family="${FONT}" font-weight="700" font-size="40" fill="${GOLD}" text-anchor="middle" letter-spacing="4">QUICK QUESTION</text>
    ${lines([{ t: 'Do you track' }, { t: 'your sales' }, { t: 'every day?', gold: true }], 540, 700, 112)}
    ${panel(1090, 400)}`),
  'story-day2-2': base(`
    <text x="540" y="560" font-family="${FONT}" font-weight="700" font-size="40" fill="${GOLD}" text-anchor="middle" letter-spacing="4">TRUE OR FALSE?</text>
    ${lines([{ t: 'Revenue and' }, { t: 'profit are' }, { t: 'the same thing.', gold: true }], 540, 700, 104)}
    ${panel(1090, 400)}`),
  'story-day2-3': base(`
    <text x="540" y="560" font-family="${FONT}" font-weight="700" font-size="40" fill="${GOLD}" text-anchor="middle" letter-spacing="4">THE ANSWER: FALSE</text>
    <g transform="translate(90 640)">
      <rect width="900" height="420" rx="44" fill="#FFF"/>
      <text x="60" y="110" font-family="${FONT}" font-weight="700" font-size="56" fill="${G}">Revenue</text>
      <text x="60" y="176" font-family="${FONT}" font-size="46" fill="#1B2B25">is all the money that comes in.</text>
      <rect x="60" y="212" width="780" height="4" fill="#E6E9E7"/>
      <text x="60" y="296" font-family="${FONT}" font-weight="700" font-size="56" fill="${G}">Profit</text>
      <text x="60" y="362" font-family="${FONT}" font-size="46" fill="#1B2B25">is what is left after costs.</text>
    </g>
    ${lines([{ t: 'Know your real' }, { t: 'profit.', gold: true }], 540, 1220, 100)}
    <text x="540" y="1470" font-family="${FONT}" font-size="44" fill="#FFF" opacity="0.9" text-anchor="middle">Join the BizLedger waitlist</text>
    ${panel(1510, 150)}`),
};

for (const [name, svg] of Object.entries(frames)) {
  fs.writeFileSync(path.join(__dirname, `${name}.svg`), svg);
  fs.writeFileSync(path.join(__dirname, `${name}.png`), new Resvg(svg, { font: { loadSystemFonts: true, defaultFontFamily: 'Arial' } }).render().asPng());
  console.log('wrote', name);
}
