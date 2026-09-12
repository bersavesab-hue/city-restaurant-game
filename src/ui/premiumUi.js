'use strict';

function roundedPath(
  ctx,
  x,
  y,
  w,
  h,
  r
) {
  const radius =
    Math.min(
      r,
      w / 2,
      h / 2
    );

  ctx.beginPath();
  ctx.moveTo(
    x + radius,
    y
  );
  ctx.arcTo(
    x + w,
    y,
    x + w,
    y + h,
    radius
  );
  ctx.arcTo(
    x + w,
    y + h,
    x,
    y + h,
    radius
  );
  ctx.arcTo(
    x,
    y + h,
    x,
    y,
    radius
  );
  ctx.arcTo(
    x,
    y,
    x + w,
    y,
    radius
  );
  ctx.closePath();
}

function card(
  ctx,
  x,
  y,
  w,
  h,
  options
) {
  const opts =
    options ||
    {};

  ctx.save();

  if (
    opts.shadow !==
    false
  ) {
    ctx.shadowColor =
      opts.shadowColor ||
      'rgba(38,49,57,0.12)';
    ctx.shadowBlur =
      opts.shadowBlur ||
      9;
    ctx.shadowOffsetY =
      opts.shadowOffsetY ||
      3;
  }

  roundedPath(
    ctx,
    x,
    y,
    w,
    h,
    opts.radius ||
      14
  );

  ctx.fillStyle =
    opts.fill ||
    'rgba(255,252,246,0.96)';
  ctx.fill();

  ctx.shadowColor =
    'transparent';

  if (
    opts.stroke !==
    false
  ) {
    ctx.strokeStyle =
      opts.stroke ||
      'rgba(204,188,166,0.72)';
    ctx.lineWidth =
      opts.lineWidth ||
      1;
    ctx.stroke();
  }

  ctx.restore();
}

function text(
  ctx,
  value,
  x,
  y,
  size,
  color,
  weight,
  align
) {
  ctx.fillStyle =
    color ||
    '#153044';

  const readableSize =
    Math.max(
      7.3,
      Number(
        size
      ) ||
      7.3
    );

  ctx.font =
    (
      weight ||
      '500'
    ) +
    ' ' +
    readableSize +
    'px sans-serif';

  ctx.textAlign =
    align ||
    'left';

  ctx.textBaseline =
    'middle';

  ctx.fillText(
    String(
      value
    ),
    x,
    y
  );
}

function coverImage(
  ctx,
  image,
  x,
  y,
  w,
  h,
  radius,
  overlay
) {
  if (!image) {
    return false;
  }

  const iw =
    image.naturalWidth ||
    image.width ||
    1;

  const ih =
    image.naturalHeight ||
    image.height ||
    1;

  const boxRatio =
    w /
    Math.max(
      1,
      h
    );

  const imageRatio =
    iw /
    Math.max(
      1,
      ih
    );

  let sx =
    0;
  let sy =
    0;
  let sw =
    iw;
  let sh =
    ih;

  if (
    imageRatio >
    boxRatio
  ) {
    sw =
      ih *
      boxRatio;
    sx =
      (
        iw -
        sw
      ) /
      2;
  } else {
    sh =
      iw /
      boxRatio;
    sy =
      (
        ih -
        sh
      ) /
      2;
  }

  ctx.save();

  if (radius) {
    roundedPath(
      ctx,
      x,
      y,
      w,
      h,
      radius
    );
    ctx.clip();
  }

  ctx.drawImage(
    image,
    sx,
    sy,
    sw,
    sh,
    x,
    y,
    w,
    h
  );

  if (overlay) {
    ctx.fillStyle =
      overlay;
    ctx.fillRect(
      x,
      y,
      w,
      h
    );
  }

  ctx.restore();

  return true;
}

function containImage(
  ctx,
  image,
  x,
  y,
  w,
  h,
  alpha
) {
  if (!image) {
    return false;
  }

  const iw =
    image.naturalWidth ||
    image.width ||
    1;

  const ih =
    image.naturalHeight ||
    image.height ||
    1;

  const scale =
    Math.min(
      w / iw,
      h / ih
    );

  const dw =
    iw *
    scale;

  const dh =
    ih *
    scale;

  ctx.save();
  ctx.globalAlpha =
    alpha == null
      ? 1
      : alpha;

  ctx.drawImage(
    image,
    x +
      (
        w -
        dw
      ) /
      2,
    y +
      (
        h -
        dh
      ) /
      2,
    dw,
    dh
  );

  ctx.restore();

  return true;
}

function pill(
  ctx,
  label,
  x,
  y,
  w,
  h,
  fill,
  color,
  stroke
) {
  card(
    ctx,
    x,
    y,
    w,
    h,
    {
      radius:
        h / 2,
      fill,
      stroke:
        stroke ||
        false,
      shadow:
        false
    }
  );

  text(
    ctx,
    label,
    x +
      w / 2,
    y +
      h / 2,
    7,
    color ||
      '#153044',
    '700',
    'center'
  );
}

module.exports = {
  roundedPath,
  card,
  text,
  coverImage,
  containImage,
  pill
};
