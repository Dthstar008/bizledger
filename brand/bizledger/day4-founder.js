// Day 4 founder post (1080x1350). Drop a photo named founder.jpg or founder.png next to this file
// to get the version with your picture; otherwise the text-only card is produced.
const fs = require('fs');
const path = require('path');
const { Resvg } = require('@resvg/resvg-js');

const G = '#0B6E4F', GD = '#084C37', GOLD = '#F5B800', CREAM = '#F4F1E8';
const FONT = "Arial, 'Segoe UI', Helvetica, sans-serif";
const W = 1080, H = 1350;

const photoFile = ['founder.jpg', 'founder.jpeg', 'founder.png'].map((f) => path.join(__dirname, f)).find((f) => fs.existsSync(f));
const photoUri = photoFile
  ? `data:image/${photoFile.endsWith('png') ? 'png' : 'jpeg'};base64,${fs.readFileSync(photoFile).toString('base64')}`
  : null;

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

const t = (x, y, size, fill, s, weight = 700, extra = '') =>
  `<text x="${x}" y="${y}" font-family="${FONT}" font-weight="${weight}" font-size="${size}" fill="${fill}" ${extra}>${s}</text>`;

const photoBlock = photoUri
  ? `<defs><clipPath id="c"><circle cx="900" cy="250" r="120"/></clipPath></defs>
     <circle cx="900" cy="250" r="130" fill="${GOLD}"/>
     <image href="${photoUri}" x="780" y="130" width="240" height="240" preserveAspectRatio="xMidYMid slice" clip-path="url(#c)"/>`
  : '';

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <rect width="${W}" height="${H}" fill="${G}"/>
  <circle cx="1010" cy="120" r="300" fill="${GD}" opacity="0.55"/>
  <circle cx="40" cy="1230" r="260" fill="${GD}" opacity="0.45"/>
  ${photoBlock}
  ${t(72, 150, 40, GOLD, 'WHY I’M BUILDING BIZLEDGER', 700, 'letter-spacing="3"')}
  <text font-family="${FONT}" font-weight="700" font-size="76">
    <tspan x="72" y="330" fill="#FFF">Many shops run</tspan>
    <tspan x="72" y="425" fill="#FFF">on notebooks and</tspan>
    <tspan x="72" y="520" fill="${GOLD}">memory.</tspan>
  </text>
  ${t(72, 650, 46, '#FFFFFF', 'I’m a mechatronics engineer in Owo.', 400, 'opacity="0.95"')}
  ${t(72, 715, 46, '#FFFFFF', 'I’m trained to think in systems.', 400, 'opacity="0.95"')}
  ${t(72, 780, 46, '#FFFFFF', 'So I’m building one for traders.', 400, 'opacity="0.95"')}
  <rect x="72" y="850" width="936" height="6" rx="3" fill="${GOLD}" opacity="0.8"/>
  ${t(72, 950, 52, '#FFFFFF', 'Sales. Stock. Expenses. Debts.')}
  ${t(72, 1020, 44, GOLD, 'One simple app. Built in Nigeria.')}
  ${mark(72, 1128, 0.1)}
  ${t(190, 1182, 40, '#FFFFFF', 'Adedolapo Adesida · Founder')}
  ${t(190, 1226, 32, '#FFFFFF', '@bizledger.ng', 400, 'opacity="0.8"')}
</svg>`;

const base = photoUri ? 'day4-founder-photo' : 'day4-founder';
fs.writeFileSync(path.join(__dirname, `${base}.svg`), svg);
fs.writeFileSync(path.join(__dirname, `${base}.png`), new Resvg(svg, { font: { loadSystemFonts: true, defaultFontFamily: 'Arial' } }).render().asPng());
console.log('wrote', base);
