// Builds the Day 3 Reel (1080x1920 MP4) from the supplied scene images plus branded overlays.
// Needs: @resvg/resvg-js and ffmpeg-static resolvable (NODE_PATH), and the five source images.
//   REEL_SRC = folder holding 4.webp ... 8.webp     REEL_TMP = scratch folder (optional)
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { Resvg } = require('@resvg/resvg-js');
const ffmpeg = require('ffmpeg-static');

const SRC = process.env.REEL_SRC;
if (!SRC) throw new Error('Set REEL_SRC to the folder containing 4.webp-8.webp');
const TMP = process.env.REEL_TMP || __dirname;
const OUT = path.join(__dirname, 'reel-day3.mp4');

const G = '#0B6E4F', GD = '#084C37', GOLD = '#F5B800';
const FONT = "Arial, 'Segoe UI', Helvetica, sans-serif";
const W = 1080, H = 1920, FPS = 30, T = 0.4; // T = crossfade seconds

const png = (name, svg) => {
  const p = path.join(TMP, name);
  fs.writeFileSync(p, new Resvg(svg, { font: { loadSystemFonts: true, defaultFontFamily: 'Arial' } }).render().asPng());
  return p;
};
const svg = (inner, bg) => `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${bg ? `<rect width="${W}" height="${H}" fill="${G}"/><circle cx="1000" cy="300" r="360" fill="${GD}" opacity="0.5"/><circle cx="60" cy="1650" r="330" fill="${GD}" opacity="0.45"/>` : ''}${inner}</svg>`;

// ---- in-app "debt screen" stand-ins (demo data) ----
const card = (body) => `
  <text x="540" y="400" font-family="${FONT}" font-weight="700" font-size="56" fill="#FFF" text-anchor="middle">BizLedger</text>
  <g transform="translate(90 560)">
    <rect width="900" height="700" rx="44" fill="#FFF"/>
    <circle cx="110" cy="110" r="64" fill="${G}"/>
    <text x="110" y="135" font-family="${FONT}" font-weight="700" font-size="60" fill="#FFF" text-anchor="middle">CO</text>
    <text x="210" y="100" font-family="${FONT}" font-weight="700" font-size="52" fill="#1B2B25">Chinedu Okafor</text>
    <text x="210" y="152" font-family="${FONT}" font-size="36" fill="#6B7C75">Customer · Credit sale</text>
    <rect x="48" y="214" width="804" height="4" fill="#E6E9E7"/>
    ${body}
  </g>
  <text x="540" y="1480" font-family="${FONT}" font-size="34" fill="#FFF" opacity="0.7" text-anchor="middle">Demo data</text>`;

const app1 = png('app-owing.png', svg(card(`
    <text x="64" y="300" font-family="${FONT}" font-size="40" fill="#6B7C75">Amount owing</text>
    <text x="64" y="408" font-family="${FONT}" font-weight="700" font-size="116" fill="#D64545">₦15,000</text>
    <rect x="64" y="500" width="772" height="120" rx="60" fill="${GOLD}"/>
    <text x="450" y="577" font-family="${FONT}" font-weight="700" font-size="48" fill="${GD}" text-anchor="middle">Record repayment</text>`), true));

const app2 = png('app-paid.png', svg(card(`
    <rect x="64" y="256" width="772" height="84" rx="42" fill="#E4F4EC"/>
    <text x="450" y="312" font-family="${FONT}" font-weight="700" font-size="40" fill="${G}" text-anchor="middle">✓ Repayment recorded: ₦5,000</text>
    <text x="64" y="420" font-family="${FONT}" font-size="40" fill="#6B7C75">Balance owing</text>
    <text x="64" y="528" font-family="${FONT}" font-weight="700" font-size="116" fill="#D64545">₦10,000</text>
    <text x="64" y="610" font-family="${FONT}" font-size="36" fill="#6B7C75">₦15,000 − ₦5,000 paid</text>`), true));

// ---- text overlays that sit on the blurred letterbox area ----
const bigBar = (text, y, size = 58) => `
  <rect x="50" y="${y - 92}" width="980" height="140" rx="28" fill="#000" opacity="0.6"/>
  <text x="540" y="${y + 4}" font-family="${FONT}" font-weight="700" font-size="${size}" fill="#FFF" text-anchor="middle">${text}</text>`;
const ovHook = png('ov-hook.png', svg(`
  <rect x="50" y="268" width="980" height="120" rx="28" fill="#000" opacity="0.6"/>
  <text x="540" y="345" font-family="${FONT}" font-weight="700" font-size="46" fill="${GOLD}" text-anchor="middle" letter-spacing="4">EVERY SHOP OWNER KNOWS THIS</text>
  ${bigBar('Customer: “I’ll pay tomorrow.”', 1620)}`));
const ovMan = png('ov-man.png', svg(bigBar('Man: “How much was it again?”', 1620)));
const ovHow = png('ov-howmuch.png', svg(bigBar('How much was it? 😩', 1700, 72)));

// ---- clips in plan order. iw/ih = source size; fw = foreground width (cards are enlarged and
// centre-cropped so their text is readable on a phone). full = already 1080x1920.
const clips = [
  // pan = tighter crop that slides across a scaled-up photo (hs = scaled height; y0/y1 = vertical band kept,
  // which also trims the tiny baked-in captions; x0/x1 = pan start/end as a fraction of the sideways range)
  { img: path.join(SRC, '4.webp'), iw: 1344, ih: 768, dur: 3.2, ov: ovHook, pan: { hs: 1150, y0: 0.09, y1: 0.93, x0: 0.28, x1: 0.62 } },
  { img: path.join(SRC, '7.webp'), iw: 1376, ih: 768, dur: 2.0, fw: 2100, zoom: 0.04 },
  { img: path.join(SRC, '5.webp'), iw: 1344, ih: 768, dur: 3.4, ov: ovMan, pan: { hs: 1150, y0: 0.02, y1: 0.89, x0: 0.85, x1: 0.35 } },
  { img: path.join(SRC, '6.webp'), iw: 1344, ih: 768, dur: 2.6, ov: ovHow, pan: { hs: 1150, y0: 0.0, y1: 1.0, x0: 0.55, x1: 0.85 } },
  { img: path.join(SRC, '8.webp'), iw: 1344, ih: 768, dur: 2.4, fw: 2100, zoom: 0.04 },
  { img: app1, full: true, dur: 2.2, zoom: 0.03 },
  { img: app2, full: true, dur: 2.2, zoom: 0.03 },
  { img: path.join(__dirname, 'reel-day3-card-4.png'), full: true, dur: 2.6, zoom: 0 },
];
const even = (n) => Math.round(n / 2) * 2;

const args = ['-y'];
clips.forEach((c) => args.push('-i', c.img));
const ovIndex = {};
clips.forEach((c) => {
  if (c.ov && ovIndex[c.ov] === undefined) {
    ovIndex[c.ov] = Object.keys(ovIndex).length + clips.length;
    args.push('-i', c.ov);
  }
});

const f = [];
clips.forEach((c, i) => {
  const d = Math.round(c.dur * FPS);
  const fw = c.full ? W : c.fw;
  const fh = c.full ? H : even((fw * c.ih) / c.iw);
  const zp = `zoompan=z='1+${c.zoom}*on/${d}':x='iw/2-iw/zoom/2':y='ih/2-ih/zoom/2':d=${d}:s=${fw}x${fh}:fps=${FPS}`;
  f.push(`[${i}:v]split=2[a${i}][b${i}]`);
  f.push(`[a${i}]scale=${W}:${H}:force_original_aspect_ratio=increase,crop=${W}:${H},gblur=sigma=28,eq=brightness=-0.06,loop=loop=${d}:size=1,setpts=N/${FPS}/TB,trim=end_frame=${d},setsar=1[bg${i}]`);
  if (c.pan) {
    const p = c.pan;
    const hs = p.hs;
    const ws = even((hs * c.iw) / c.ih);
    const vis = even(hs * (p.y1 - p.y0));
    const yPx = Math.round(hs * p.y0);
    // stretch the single frame into a stream, then slide a 1080-wide window across it
    f.push(`[b${i}]scale=${ws}:${hs}:flags=lanczos,loop=loop=${d}:size=1,setpts=N/${FPS}/TB,trim=end_frame=${d},` +
      `crop=${W}:${vis}:x='(iw-ow)*(${p.x0}+(${p.x1}-${p.x0})*n/${d})':y=${yPx},setsar=1[fg${i}]`);
  } else {
    f.push(`[b${i}]scale=${fw * 2}:${fh * 2}:flags=lanczos,${zp},setsar=1[fg${i}]`);
  }
  if (c.ov) {
    f.push(`[bg${i}][fg${i}]overlay=(W-w)/2:(H-h)/2:shortest=1[m${i}]`);
    f.push(`[m${i}][${ovIndex[c.ov]}:v]overlay=0:0,format=yuv420p[v${i}]`);
  } else {
    f.push(`[bg${i}][fg${i}]overlay=(W-w)/2:(H-h)/2:shortest=1,format=yuv420p[v${i}]`);
  }
});

// crossfade chain
let acc = clips[0].dur;
let prev = '[v0]';
for (let i = 1; i < clips.length; i++) {
  const off = (acc - T).toFixed(3);
  const out = i === clips.length - 1 ? '[vout]' : `[x${i}]`;
  f.push(`${prev}[v${i}]xfade=transition=fade:duration=${T}:offset=${off}${out}`);
  prev = out;
  acc += clips[i].dur - T;
}

const script = path.join(TMP, 'reel-filter.txt');
fs.writeFileSync(script, f.join(';\n'));
args.push('-filter_complex_script', script, '-map', '[vout]', '-r', String(FPS), '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', '-an', OUT);

console.log(`Total length ~${acc.toFixed(1)}s`);
const r = spawnSync(ffmpeg, args, { stdio: ['ignore', 'inherit', 'inherit'] });
process.exit(r.status ?? 1);
