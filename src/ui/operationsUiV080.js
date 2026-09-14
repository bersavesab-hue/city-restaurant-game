'use strict';

const ui =
  require('./premiumUi.js');

const runtime =
  globalThis.GameRuntime;

const api =
  runtime &&
  runtime.api ||
  {};

const DESIGN_W =
  390;

function viewHeight() {
  if (
    api &&
    typeof api.getSystemInfoSync ===
      'function'
  ) {
    const info =
      api.getSystemInfoSync();

    const w =
      Math.max(
        1,
        Number(
          info.windowWidth
        ) ||
        DESIGN_W
      );

    const h =
      Math.max(
        1,
        Number(
          info.windowHeight
        ) ||
        780
      );

    return (
      h /
      (
        w /
        DESIGN_W
      )
    );
  }

  return 780;
}

function money(value) {
  const n =
    Number(value) ||
    0;

  const sign =
    n <
    0
      ? '-'
      : '';

  const abs =
    Math.abs(n);

  function trim(
    v,
    d
  ) {
    return Number(v)
      .toFixed(d)
      .replace(
        /\.0+$/,
        ''
      )
      .replace(
        /(\.\d*?[1-9])0+$/,
        '$1'
      );
  }

  if (
    abs >=
    100000000
  ) {
    return (
      sign +
      '¥' +
      trim(
        abs /
          100000000,
        1
      ) +
      '亿'
    );
  }

  if (
    abs >=
    10000
  ) {
    return (
      sign +
      '¥' +
      trim(
        abs /
          10000,
        abs >=
          100000
          ? 1
          : 2
      ) +
      '万'
    );
  }

  return (
    sign +
    '¥' +
    Math.round(
      abs
    )
  );
}

function kg(grams) {
  const value =
    Number(
      grams
    ) /
    1000;

  return (
    value >=
      10
      ? value.toFixed(1)
      : value.toFixed(2)
  ).replace(
    /\.0+$/,
    ''
  ) +
  'kg';
}

function header(
  ctx,
  title,
  subtitle
) {
  const gradient =
    ctx.createLinearGradient(
      0,
      0,
      0,
      84
    );

  gradient.addColorStop(
    0,
    '#075889'
  );

  gradient.addColorStop(
    1,
    '#073D61'
  );

  ctx.fillStyle =
    gradient;

  ctx.fillRect(
    0,
    0,
    DESIGN_W,
    84
  );

  ui.text(
    ctx,
    title,
    18,
    28,
    17,
    '#FFFFFF',
    '800'
  );

  ui.text(
    ctx,
    subtitle,
    18,
    57,
    7.6,
    '#DCEEF5',
    '600'
  );
}

function background(
  ctx,
  h
) {
  ctx.fillStyle =
    '#F3EBDD';

  ctx.fillRect(
    0,
    0,
    DESIGN_W,
    h
  );
}

function pill(
  ctx,
  label,
  x,
  y,
  w,
  active
) {
  ui.card(
    ctx,
    x,
    y,
    w,
    30,
    {
      radius: 15,
      fill:
        active
          ? '#FFD34B'
          : '#FFFDF8',
      stroke:
        active
          ? '#E5AC1B'
          : '#DDD4C7',
      shadow: false
    }
  );

  ui.text(
    ctx,
    label,
    x +
      w /
      2,
    y +
      15,
    7.5,
    active
      ? '#173B50'
      : '#607986',
    '800',
    'center'
  );
}

function button(
  ctx,
  label,
  x,
  y,
  w,
  h,
  tone
) {
  const fill =
    tone ===
      'gold'
      ? '#FFD34B'
      : tone ===
          'danger'
        ? '#FFF0EC'
        : '#FFFDF8';

  const stroke =
    tone ===
      'gold'
      ? '#E3AC1E'
      : tone ===
          'danger'
        ? '#E5AAA0'
        : '#D9D2C7';

  ui.card(
    ctx,
    x,
    y,
    w,
    h,
    {
      radius: 11,
      fill,
      stroke,
      shadow: false
    }
  );

  ui.text(
    ctx,
    label,
    x +
      w /
      2,
    y +
      h /
      2,
    7.4,
    tone ===
      'danger'
      ? '#B44D3F'
      : '#173B50',
    '800',
    'center'
  );
}

function toast(
  title
) {
  if (
    api &&
    typeof api.showToast ===
      'function'
  ) {
    api.showToast({
      title,
      icon: 'none'
    });
  }
}

module.exports = {
  DESIGN_W,
  viewHeight,
  money,
  kg,
  header,
  background,
  pill,
  button,
  toast
};
