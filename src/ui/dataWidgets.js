'use strict';

const COLORS = {
  bg: '#F4EFE7',
  panel: '#FFFDF8',
  line: '#DDD1C1',
  navy: '#0F344D',
  navy2: '#092638',
  text: '#25343B',
  muted: '#758087',
  gold: '#E5A832',
  green: '#2E9A65',
  red: '#D65A4A',
  orange: '#D98935',
  blue: '#3B8FB8',
  white: '#FFFFFF',
  paleGreen: '#E9F4ED',
  paleRed: '#FAECE8',
  paleGold: '#FBF2DE',
  paleBlue: '#EAF3F7'
};

function roundRectPath(ctx, x, y, w, h, r) {
  const rr = Math.max(0, Math.min(r || 0, w / 2, h / 2));
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

function rect(ctx, x, y, w, h, options) {
  const o = options || {};
  roundRectPath(ctx, x, y, w, h, o.radius == null ? 12 : o.radius);
  if (o.fill !== false) {
    ctx.fillStyle = o.fill || COLORS.panel;
    ctx.fill();
  }
  if (o.stroke) {
    ctx.lineWidth = o.lineWidth || 1;
    ctx.strokeStyle = o.stroke;
    ctx.stroke();
  }
}

function text(ctx, value, x, y, size, color, weight, align) {
  ctx.fillStyle = color || COLORS.text;
  ctx.font = (weight || '500') + ' ' + (size || 10) + 'px sans-serif';
  ctx.textAlign = align || 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(String(value == null ? '' : value), x, y);
}

function money(value) {
  const n = Number(value) || 0;
  const sign = n < 0 ? '-' : '';
  return sign + '¥' + Math.abs(Math.round(n)).toLocaleString('zh-CN');
}

function number(value, digits) {
  const n = Number(value) || 0;
  if (digits == null) return Math.round(n).toLocaleString('zh-CN');
  return n.toFixed(digits);
}

function percent(value, digits) {
  const n = Number(value) || 0;
  return (n * 100).toFixed(digits == null ? 1 : digits) + '%';
}

function signedPercent(value, digits) {
  if (value == null || !Number.isFinite(Number(value))) return '—';
  const n = Number(value) * 100;
  return (n > 0 ? '+' : '') + n.toFixed(digits == null ? 1 : digits) + '%';
}

function trendColor(delta, invert) {
  if (delta == null || Math.abs(delta) < 0.0001) return COLORS.muted;
  const positive = delta > 0;
  if (invert) return positive ? COLORS.red : COLORS.green;
  return positive ? COLORS.green : COLORS.red;
}

function header(ctx, title, subtitle, width, cashText) {
  ctx.fillStyle = COLORS.navy2;
  ctx.fillRect(0, 0, width || 390, 66);
  text(ctx, title, 15, 22, 17, COLORS.white, '700');
  text(ctx, subtitle || '', 15, 45, 8, 'rgba(255,255,255,0.70)', '500');
  if (cashText) text(ctx, cashText, (width || 390) - 13, 23, 11, '#FFE6AA', '700', 'right');
}

function tabBar(ctx, items, activeIndex, y, addButton, width) {
  const W = width || 390;
  const gap = 4;
  const x0 = 8;
  const usable = W - 16 - gap * (items.length - 1);
  const w = usable / items.length;
  for (let i = 0; i < items.length; i++) {
    const active = i === activeIndex;
    const x = x0 + i * (w + gap);
    rect(ctx, x, y, w, 32, {
      radius: 9,
      fill: active ? COLORS.navy : '#EFE8DE',
      stroke: active ? '#254D63' : '#D9CDBE'
    });
    text(ctx, items[i].label || items[i].name || String(items[i]), x + w / 2, y + 16, 7.5, active ? COLORS.white : COLORS.text, '700', 'center');
    if (addButton) addButton('tab:' + i, x, y, w, 32);
  }
}

function metricCard(ctx, x, y, w, h, label, value, sub, options) {
  const o = options || {};
  rect(ctx, x, y, w, h, {
    radius: 12,
    fill: o.fill || COLORS.panel,
    stroke: o.stroke || COLORS.line
  });
  text(ctx, label, x + 12, y + 15, 7, COLORS.muted, '600');
  text(ctx, value, x + 12, y + 38, o.valueSize || 15, o.valueColor || COLORS.text, '700');
  if (sub) text(ctx, sub, x + 12, y + h - 13, 6.5, o.subColor || COLORS.muted, '500');
}

function metricCompareCard(ctx, x, y, w, h, label, value, delta, foot, options) {
  const o = options || {};
  metricCard(ctx, x, y, w, h, label, value, '', o);
  const deltaText = signedPercent(delta, 1);
  text(ctx, deltaText, x + w - 10, y + 17, 7, trendColor(delta, !!o.invertTrend), '700', 'right');
  if (foot) text(ctx, foot, x + 12, y + h - 13, 6.3, COLORS.muted, '500');
}

function sectionTitle(ctx, title, y, extra, width) {
  text(ctx, title, 13, y, 10.5, COLORS.text, '700');
  if (extra) text(ctx, extra, (width || 390) - 13, y, 6.8, COLORS.muted, '600', 'right');
}

function row(ctx, x, y, w, label, value, valueColor, hint) {
  text(ctx, label, x, y, 7.5, COLORS.muted, '600');
  text(ctx, value, x + w, y, 8, valueColor || COLORS.text, '700', 'right');
  if (hint) text(ctx, hint, x, y + 13, 6.2, COLORS.muted, '500');
}

function divider(ctx, x, y, w) {
  ctx.strokeStyle = '#E6DED2';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + w, y);
  ctx.stroke();
}

function progress(ctx, x, y, w, value, options) {
  const o = options || {};
  const v = Math.max(0, Math.min(1, Number(value) || 0));
  rect(ctx, x, y, w, o.height || 7, { radius: 4, fill: o.track || '#ECE5DB' });
  if (v > 0) rect(ctx, x, y, Math.max(4, w * v), o.height || 7, { radius: 4, fill: o.fill || COLORS.blue });
}

function alertBox(ctx, x, y, w, alert) {
  const level = alert && alert.level;
  const fill = level === 'danger' ? COLORS.paleRed : level === 'warn' ? COLORS.paleGold : COLORS.paleBlue;
  const edge = level === 'danger' ? COLORS.red : level === 'warn' ? COLORS.orange : COLORS.blue;
  rect(ctx, x, y, w, 54, { radius: 11, fill, stroke: edge });
  text(ctx, alert && alert.title || '经营提示', x + 12, y + 17, 8.3, COLORS.text, '700');
  text(ctx, alert && alert.detail || '', x + 12, y + 37, 6.4, COLORS.muted, '500');
}

function miniBarChart(ctx, x, y, w, h, rows, key, options) {
  const list = Array.isArray(rows) ? rows : [];
  const values = list.map(r => Math.max(0, Number(r && r[key]) || 0));
  const max = Math.max(1, ...values);
  const gap = 3;
  const count = Math.max(1, list.length);
  const barW = Math.max(3, (w - gap * (count - 1)) / count);
  for (let i = 0; i < list.length; i++) {
    const bh = Math.max(2, h * (values[i] / max));
    rect(ctx, x + i * (barW + gap), y + h - bh, barW, bh, {
      radius: Math.min(3, barW / 2),
      fill: options && options.fill || COLORS.blue
    });
  }
}

function sparkline(ctx, x, y, w, h, rows, key, color) {
  const list = Array.isArray(rows) ? rows : [];
  if (list.length < 2) return;
  const values = list.map(r => Number(r && r[key]) || 0);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = Math.max(1, max - min);
  ctx.strokeStyle = color || COLORS.blue;
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  for (let i = 0; i < values.length; i++) {
    const px = x + (i / (values.length - 1)) * w;
    const py = y + h - ((values[i] - min) / range) * h;
    if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
  }
  ctx.stroke();
}

function tableHeader(ctx, y, columns) {
  rect(ctx, 10, y, 370, 28, { radius: 8, fill: '#EEE7DC' });
  columns.forEach(c => text(ctx, c.label, c.x, y + 14, 6.5, COLORS.muted, '700', c.align || 'left'));
}

function valueColor(value, goodHigh) {
  if (value == null) return COLORS.muted;
  if (goodHigh === false) return value > 0 ? COLORS.red : COLORS.green;
  return value >= 0 ? COLORS.green : COLORS.red;
}

module.exports = {
  COLORS,
  rect,
  text,
  money,
  number,
  percent,
  signedPercent,
  trendColor,
  valueColor,
  header,
  tabBar,
  metricCard,
  metricCompareCard,
  sectionTitle,
  row,
  divider,
  progress,
  alertBox,
  miniBarChart,
  sparkline,
  tableHeader
};
