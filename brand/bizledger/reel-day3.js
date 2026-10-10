// Day 3 Reel assets (1080x1920): cover + on-screen text cards for CapCut / Instagram editor.
const fs = require('fs');
const path = require('path');
const { Resvg } = require('@resvg/resvg-js');

const G = '#0B6E4F', GD = '#084C37', GOLD = '#F5B800', CREAM = '#F4F1E8';
const FONT = "Arial, 'Segoe UI', Helvetica, sans-serif";
const W = 1080, H = 1920;

const stack = (arr, y, size) =>
  `<text font-family="${FONT}" font-weight="700" font-size="${size}" text-anchor="middle">` +
  arr.map((l, i) => `<tspan x="540" y="${y + i * (size + 20)}" fill="${l.gold ? GOLD : '#FFF'}">${l.t}</tspan>`).join('') + `</text>`;

const bg = (inner, color = G) => `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <rect width="${W}" height="${H}" fill="${color}"/>
  <circle cx="1000" cy="300" r="360" fill="${GD}" opacity="0.5"/>
  <circle cx="60" cy="1650" r="330" fill="${GD}" opacity="0.45"/>
  ${inner}
</svg>`;

const wm = `<text x="540" y="1640" font-family="${FONT}" font-weight="700" font-size="44" fill="#FFF" opacity="0.9" text-anchor="middle">@bizledger.ng</text>`;

const cards = {
  // Keep key content inside the centre 3:4 area (y 240-1680) so the profile grid crop shows it all.
  'reel-day3-cover': bg(`
    <text x="540" y="560" font-family="${FONT}" font-weight="700" font-size="44" fill="${GOLD}" text-anchor="middle" letter-spacing="5">EVERY SHOP OWNER KNOWS THIS</text>
    ${stack([{ t: '“I’ll pay' }, { t: 'tomorrow.”', gold: true }], 800, 150)}
    <text x="540" y="1180" font-family="${FONT}" font-size="56" fill="#FFF" opacity="0.95" text-anchor="middle">...but how much was it? 😩</text>
    ${wm}`),
  'reel-day3-card-1': bg(`
    ${stack([{ t: 'Customer:' }, { t: '“I’ll pay', gold: true }, { t: 'tomorrow.”', gold: true }], 760, 120)}`),
  'reel-day3-card-2': bg(`
    ${stack([{ t: '3 days later...' }], 900, 128)}`, GD),
  'reel-day3-card-3': bg(`
    ${stack([{ t: 'Memory is' }, { t: 'not a ledger.', gold: true }], 800, 130)}
    <text x="540" y="1130" font-family="${FONT}" font-size="52" fill="#FFF" opacity="0.95" text-anchor="middle">Write it down. Every time.</text>`),
  'reel-day3-card-4': bg(`
    ${stack([{ t: 'Track every debt' }, { t: 'on your phone.', gold: true }], 760, 112)}
    <text x="540" y="1100" font-family="${FONT}" font-weight="700" font-size="60" fill="#FFF" text-anchor="middle">BizLedger</text>
    <rect x="190" y="1180" width="700" height="130" rx="65" fill="${GOLD}"/>
    <text x="540" y="1264" font-family="${FONT}" font-weight="700" font-size="54" fill="${GD}" text-anchor="middle">Join the waitlist</text>
    <text x="540" y="1420" font-family="${FONT}" font-weight="700" font-size="46" fill="#FFF" text-anchor="middle">Link in bio ↑</text>`),
};

for (const [name, svg] of Object.entries(cards)) {
  fs.writeFileSync(path.join(__dirname, `${name}.svg`), svg);
  fs.writeFileSync(path.join(__dirname, `${name}.png`), new Resvg(svg, { font: { loadSystemFonts: true, defaultFontFamily: 'Arial' } }).render().asPng());
  console.log('wrote', name);
}
