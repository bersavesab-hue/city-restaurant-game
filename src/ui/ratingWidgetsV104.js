'use strict';

const dataUi = require('./dataWidgets.js');

const GRADE_COLORS = {
  S: '#B87820',
  A: '#2E9A65',
  B: '#3B8FB8',
  C: '#7D8790',
  D: '#D65A4A'
};

function colorForGrade(grade) {
  return GRADE_COLORS[String(grade || 'C')] || GRADE_COLORS.C;
}

function badge(ctx, x, y, w, h, grade, score, options) {
  const o = options || {};
  const fill = colorForGrade(grade);
  dataUi.rect(ctx, x, y, w, h, { radius: Math.min(8, h / 2), fill, stroke: fill });
  const text = o.compact === false
    ? String(grade || 'C') + ' · ' + Math.round(Number(score) || 0)
    : String(grade || 'C') + ' ' + Math.round(Number(score) || 0);
  dataUi.text(ctx, text, x + w / 2, y + h / 2, o.size || 7, '#FFFFFF', '800', 'center');
}

function trend(ctx, x, y, rating, align) {
  const delta = rating && rating.delta;
  let label = '—';
  let color = dataUi.COLORS.muted;
  if (delta != null && Number.isFinite(Number(delta))) {
    const n = Number(delta);
    label = (n > 0 ? '↑ +' : n < 0 ? '↓ ' : '→ ') + n.toFixed(1);
    color = n > 0 ? dataUi.COLORS.green : n < 0 ? dataUi.COLORS.red : dataUi.COLORS.muted;
  }
  dataUi.text(ctx, label, x, y, 6.8, color, '800', align || 'left');
}

function scoreBar(ctx, x, y, w, rating, options) {
  const o = options || {};
  const score = Math.max(0, Math.min(100, Number(rating && rating.score) || 0));
  const fill = o.fill || colorForGrade(rating && rating.grade);
  dataUi.progress(ctx, x, y, w, score / 100, { fill, height: o.height || 8 });
  if (o.label !== false) {
    dataUi.text(ctx, Math.round(score) + '/100', x + w, y - 7, 6.2, dataUi.COLORS.muted, '700', 'right');
  }
}

function dimensionRows(ctx, x, y, w, rating, options) {
  const o = options || {};
  const rows = Array.isArray(rating && rating.dimensions) ? rating.dimensions : [];
  const limit = Math.min(rows.length, o.limit || 6);
  const rowH = o.rowHeight || 28;
  for (let i = 0; i < limit; i++) {
    const row = rows[i];
    const yy = y + i * rowH;
    dataUi.text(ctx, row.label, x, yy, 6.6, dataUi.COLORS.muted, '700');
    dataUi.progress(ctx, x + 52, yy - 4, Math.max(40, w - 84), (Number(row.score) || 0) / 100, {
      fill: colorForGrade(rating && rating.grade),
      height: 7
    });
    dataUi.text(ctx, Math.round(Number(row.score) || 0), x + w, yy, 6.7, dataUi.COLORS.text, '800', 'right');
  }
}

function insightLine(rating) {
  const strong = rating && rating.strengths && rating.strengths[0];
  const weak = rating && rating.weaknesses && rating.weaknesses[0];
  const parts = [];
  if (strong) parts.push('优势：' + strong.label + ' ' + Math.round(strong.score));
  if (weak) parts.push('短板：' + weak.label + ' ' + Math.round(weak.score));
  return parts.join(' · ');
}

module.exports = {
  GRADE_COLORS,
  colorForGrade,
  badge,
  trend,
  scoreBar,
  dimensionRows,
  insightLine
};
