import { createCanvas, GlobalFonts } from '@napi-rs/canvas';
import { writeFileSync } from 'fs';

GlobalFonts.registerFromPath('/tmp/inter-reg.woff', 'Inter');
GlobalFonts.registerFromPath('/tmp/inter-bold.woff', 'Inter');

const W = 1200;
const H = 630;
const canvas = createCanvas(W, H);
const ctx = canvas.getContext('2d');

// Background gradient
const bgGrad = ctx.createLinearGradient(0, 0, W, H);
bgGrad.addColorStop(0, '#0f172a');
bgGrad.addColorStop(1, '#1e293b');
ctx.fillStyle = bgGrad;
ctx.fillRect(0, 0, W, H);

// Grid lines
ctx.strokeStyle = 'rgba(30,58,95,0.45)';
ctx.lineWidth = 1;
for (const x of [300, 600, 900]) {
  ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
}
for (const y of [210, 420]) {
  ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
}

// Decorative circles top-right
ctx.strokeStyle = 'rgba(56,189,248,0.13)';
ctx.lineWidth = 1;
ctx.beginPath(); ctx.arc(1120, 90, 170, 0, Math.PI * 2); ctx.stroke();
ctx.strokeStyle = 'rgba(129,140,248,0.10)';
ctx.beginPath(); ctx.arc(1120, 90, 110, 0, Math.PI * 2); ctx.stroke();

// Accent underline bar
const barGrad = ctx.createLinearGradient(100, 0, 320, 0);
barGrad.addColorStop(0, '#38bdf8');
barGrad.addColorStop(1, '#818cf8');
ctx.fillStyle = barGrad;
roundRect(ctx, 100, 178, 220, 6, 3);

// EpiCalc title — "Epi" white, "Calc" sky-blue gradient
ctx.font = 'bold 104px Inter';
ctx.fillStyle = '#ffffff';
ctx.fillText('Epi', 97, 165);
const epiW = ctx.measureText('Epi').width;

const titleGrad = ctx.createLinearGradient(97 + epiW, 0, 97 + epiW + 320, 0);
titleGrad.addColorStop(0, '#38bdf8');
titleGrad.addColorStop(1, '#818cf8');
ctx.fillStyle = titleGrad;
ctx.fillText('Calc', 97 + epiW, 165);

// Subtitle
ctx.font = '36px Inter';
ctx.fillStyle = '#94a3b8';
ctx.fillText('Free Public Health Calculator', 100, 248);

// Feature pills
pill(ctx, 100, 310, 240, 58, 'Epi Metrics',       '#38bdf8');
pill(ctx, 358, 310, 290, 58, 'SIR/SEIR Simulator', '#818cf8');
pill(ctx, 664, 310, 240, 58, 'Biostatistics',       '#34d399');

// Divider
ctx.strokeStyle = '#334155';
ctx.lineWidth = 1;
ctx.beginPath(); ctx.moveTo(100, 435); ctx.lineTo(W - 100, 435); ctx.stroke();

// URL
ctx.font = '28px Inter';
ctx.fillStyle = '#64748b';
ctx.textAlign = 'left';
ctx.textBaseline = 'alphabetic';
ctx.fillText('epi.chem-health-calc.com', 100, 498);

// No-login badge
ctx.fillStyle = '#0d2b1f';
roundRect(ctx, 820, 460, 284, 50, 25);
ctx.font = 'bold 20px Inter';
ctx.fillStyle = '#34d399';
ctx.textAlign = 'center';
ctx.textBaseline = 'middle';
ctx.fillText('No login required', 820 + 142, 460 + 25);

// Write file
const buffer = canvas.toBuffer('image/png');
writeFileSync('public/og-image.png', buffer);
console.log(`Generated public/og-image.png  (${(buffer.length / 1024).toFixed(1)} KB)`);

// ── helpers ──────────────────────────────────────────────
function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
  ctx.fill();
}

function pill(ctx, x, y, w, h, text, color) {
  ctx.fillStyle = 'rgba(30,58,95,0.85)';
  roundRect(ctx, x, y, w, h, h / 2);
  ctx.font = 'bold 22px Inter';
  ctx.fillStyle = color;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, x + w / 2, y + h / 2);
}
