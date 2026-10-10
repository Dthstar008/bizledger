// Generates the BizLedger Instagram logo + 4-slide carousel as SVG and PNG.
// Run: node build.js   (needs @resvg/resvg-js resolvable from NODE_PATH)
const fs = require('fs');
const path = require('path');
const { Resvg } = require('@resvg/resvg-js');

const G = '#0B6E4F';
const GD = '#084C37';
const GOLD = '#F5B800';
const CREAM = '#F4F1E8';
const FONT = "Arial, 'Segoe UI', Helvetica, sans-serif";
const out = __dirname;

// Ledger-page "B" tile with gold tick. Drawn in a 1024 box, scaled by `s` at (x, y).
function logoMark(x, y, s) {
  return `
  <g transform="translate(${x} ${y}) scale(${s})">
    <rect width="1024" height="1024" rx="230" fill="${G}"/>
    <rect x="232" y="170" width="560" height="684" rx="48" fill="#FFFFFF"/>
    <rect x="232" y="170" width="64" height="684" rx="32" fill="${CREAM}"/>
    <rect x="262" y="170" width="34" height="684" fill="${CREAM}"/>
    <text x="548" y="590" font-family="${FONT}" font-weight="700" font-size="470" fill="${G}" text-anchor="middle">B</text>
    <rect x="352" y="662" width="344" height="16" rx="8" fill="${G}" opacity="0.35"/>
    <rect x="352" y="710" width="344" height="16" rx="8" fill="${G}" opacity="0.35"/>
    <rect x="352" y="758" width="220" height="16" rx="8" fill="${G}" opacity="0.35"/>
    <circle cx="772" cy="772" r="132" fill="${GOLD}" stroke="${G}" stroke-width="28"/>
    <path d="M708 776 L756 824 L842 722" fill="none" stroke="${GD}" stroke-width="40" stroke-linecap="round" stroke-linejoin="round"/>
  </g>`;
}

function logoSvg() {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">${logoMark(0, 0, 1)}</svg>`;
}

// Instagram crops profile photos to a circle: full-bleed square version with the mark inset.
function profileSvg() {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
  <rect width="1024" height="1024" fill="${G}"/>
  ${logoMark(112, 112, 0.78).replace(/<rect width="1024" height="1024" rx="230" fill="[^"]*"\/>/, '')}
  </svg>`;
}

const W = 1080;
const H = 1350;

function frame(inner, n) {
  const dots = [1, 2, 3, 4]
    .map((i) => `<circle cx="${W / 2 - 54 + (i - 1) * 36}" cy="1262" r="8" fill="${i === n ? GOLD : '#FFFFFF'}" opacity="${i === n ? 1 : 0.35}"/>`)
    .join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <rect width="${W}" height="${H}" fill="${G}"/>
  <circle cx="1010" cy="120" r="300" fill="${GD}" opacity="0.55"/>
  <circle cx="40" cy="1230" r="260" fill="${GD}" opacity="0.45"/>
  ${inner}
  ${n < 4 ? `${logoMark(72, 1204, 0.085)}
  <text x="170" y="1264" font-family="${FONT}" font-weight="700" font-size="38" fill="#FFFFFF">BizLedger</text>
  <text x="${W - 72}" y="1264" font-family="${FONT}" font-weight="700" font-size="38" fill="${GOLD}" text-anchor="end">Swipe →</text>` : ''}
  ${n < 4 ? dots.replace(/cy="1262"/g, 'cy="1308"') : dots}
  </svg>`;
}

const head = (lines, y, size = 84) =>
  `<text font-family="${FONT}" font-weight="700" font-size="${size}">` +
  lines
    .map((l, i) => `<tspan x="72" y="${y + i * (size + 14)}" fill="${l.gold ? GOLD : '#FFFFFF'}">${l.t}</tspan>`)
    .join('') +
  `</text>`;

function slide1() {
  return frame(
    `${head([{ t: 'Do you know your' }, { t: 'real profit', gold: true }, { t: 'this week?' }], 210)}
    <g transform="translate(540 850) rotate(-5)">
      <rect x="-300" y="-290" width="600" height="580" rx="36" fill="#FFFFFF"/>
      <rect x="-300" y="-290" width="70" height="580" rx="35" fill="${CREAM}"/>
      <rect x="-262" y="-290" width="32" height="580" fill="${CREAM}"/>
      ${[-170, -110, -50, 10, 70, 130, 190].map((yy) => `<rect x="-170" y="${yy}" width="400" height="10" rx="5" fill="${G}" opacity="0.18"/>`).join('')}
      <circle cx="0" cy="-30" r="150" fill="${GOLD}"/>
      <text x="0" y="62" font-family="${FONT}" font-weight="700" font-size="260" fill="${GD}" text-anchor="middle">?</text>
    </g>`,
    1,
  );
}

function icon(kind, cx, cy) {
  const c = GD;
  const g = (inner) => `<g transform="translate(${cx} ${cy})">${inner}</g>`;
  if (kind === 'receipt')
    return g(`<path d="M-26 -34 H26 V34 L16 26 L6 34 L-4 26 L-14 34 L-26 26 Z" fill="${c}"/>
      <rect x="-14" y="-20" width="28" height="7" rx="3" fill="${GOLD}"/><rect x="-14" y="-4" width="28" height="7" rx="3" fill="${GOLD}"/>`);
  if (kind === 'box')
    return g(`<path d="M0 -36 L34 -18 V20 L0 38 L-34 20 V-18 Z" fill="${c}"/><path d="M-34 -18 L0 0 L34 -18 M0 0 V38" stroke="${GOLD}" stroke-width="7" fill="none" stroke-linejoin="round"/>`);
  if (kind === 'wallet')
    return g(`<rect x="-36" y="-26" width="72" height="54" rx="12" fill="${c}"/><rect x="6" y="-8" width="30" height="22" rx="8" fill="${GOLD}"/><circle cx="19" cy="3" r="5" fill="${c}"/>`);
  return g(`<rect x="-28" y="-36" width="56" height="72" rx="8" fill="${c}"/><rect x="-28" y="-36" width="12" height="72" rx="6" fill="${GOLD}"/><rect x="-6" y="-18" width="22" height="6" rx="3" fill="${GOLD}"/><rect x="-6" y="-4" width="22" height="6" rx="3" fill="${GOLD}"/>`);
}

function slide2() {
  const rows = [
    ['Sales.', 'receipt'],
    ['Stock.', 'box'],
    ['Expenses.', 'wallet'],
    ['Debts.', 'ledger'],
  ];
  const cards = rows
    .map(
      ([t, k], i) => `
    <g transform="translate(72 ${300 + i * 170})">
      <rect width="936" height="140" rx="30" fill="#FFFFFF" opacity="0.1"/>
      <circle cx="90" cy="70" r="52" fill="${GOLD}"/>
      ${icon(k, 90, 70)}
      <text x="180" y="92" font-family="${FONT}" font-weight="700" font-size="68" fill="#FFFFFF">${t}</text>
    </g>`,
    )
    .join('');
  return frame(
    `${head([{ t: 'Everything your' }, { t: 'shop needs' }], 150, 70)}${cards}
    <text x="72" y="1050" font-family="${FONT}" font-weight="700" font-size="86" fill="${GOLD}">All in one place.</text>`,
    2,
  );
}

function slide3() {
  return frame(
    `${head([{ t: 'Chinedu owes you' }, { t: '₦15,000.', gold: true }, { t: 'Do you remember?' }], 210, 82)}
    <g transform="translate(90 560)">
      <rect width="900" height="560" rx="44" fill="#FFFFFF"/>
      <circle cx="110" cy="110" r="64" fill="${G}"/>
      <text x="110" y="135" font-family="${FONT}" font-weight="700" font-size="60" fill="#FFFFFF" text-anchor="middle">CO</text>
      <text x="210" y="100" font-family="${FONT}" font-weight="700" font-size="52" fill="#1B2B25">Chinedu Okafor</text>
      <text x="210" y="152" font-family="${FONT}" font-size="36" fill="#6B7C75">Customer · Credit sale</text>
      <rect x="48" y="214" width="804" height="4" fill="#E6E9E7"/>
      <text x="64" y="300" font-family="${FONT}" font-size="40" fill="#6B7C75">Amount owing</text>
      <text x="64" y="388" font-family="${FONT}" font-weight="700" font-size="100" fill="#D64545">₦15,000</text>
      <rect x="64" y="432" width="772" height="96" rx="48" fill="${GOLD}"/>
      <text x="450" y="496" font-family="${FONT}" font-weight="700" font-size="44" fill="${GD}" text-anchor="middle">Record repayment</text>
    </g>`,
    3,
  );
}

function slide4() {
  return frame(
    `${logoMark(390, 120, 0.3)}
    <text font-family="${FONT}" font-weight="700" font-size="92" fill="#FFFFFF" text-anchor="middle">
      <tspan x="540" y="560">Your shop's</tspan>
      <tspan x="540" y="670" fill="${GOLD}">digital back</tspan>
      <tspan x="540" y="780" fill="${GOLD}">office.</tspan>
    </text>
    <text x="540" y="880" font-family="${FONT}" font-size="46" fill="#FFFFFF" opacity="0.85" text-anchor="middle">Sales, stock, expenses and debts.</text>
    <rect x="190" y="950" width="700" height="130" rx="65" fill="${GOLD}"/>
    <text x="500" y="1034" font-family="${FONT}" font-weight="700" font-size="56" fill="${GD}" text-anchor="middle">Join the waitlist</text>
    <path d="M800 1000 V1034 M784 1020 L800 1038 L816 1020" stroke="${GD}" stroke-width="9" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
    <text x="540" y="1180" font-family="${FONT}" font-weight="700" font-size="48" fill="#FFFFFF" text-anchor="middle">@bizledger.ng</text>`,
    4,
  );
}

const files = {
  'logo': logoSvg(),
  'profile-photo': profileSvg(),
  'carousel-1': slide1(),
  'carousel-2': slide2(),
  'carousel-3': slide3(),
  'carousel-4': slide4(),
};

for (const [name, svg] of Object.entries(files)) {
  fs.writeFileSync(path.join(out, `${name}.svg`), svg);
  const png = new Resvg(svg, { font: { loadSystemFonts: true, defaultFontFamily: 'Arial' } }).render().asPng();
  fs.writeFileSync(path.join(out, `${name}.png`), png);
  console.log('wrote', name);
}
