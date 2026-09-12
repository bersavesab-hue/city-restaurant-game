'use strict';

class SimpleScene {
  constructor(options) {
    this.id = options.id;

    this.title = options.title;

    this.subtitle =
      options.subtitle || '';

    this.emptyText =
      options.emptyText || '功能开发中';

    this.background =
      options.background || '#F3EBDD';

    this.panel =
      options.panel || '#FFF8EE';

    this.text =
      options.text || '#2F211C';

    this.muted =
      options.muted || '#846E63';

    this.accent =
      options.accent || '#D18342';
  }

  enter(payload) {
    this.payload =
      payload || {};
  }

  exit() {
  }

  update(deltaTime) {
  }

  render(ctx) {
    if (!ctx) {
      return;
    }

    ctx.save();

    ctx.fillStyle =
      this.background;

    ctx.fillRect(
      0,
      0,
      390,
      844
    );

    this.drawHeader(ctx);

    this.drawContent(ctx);

    ctx.restore();
  }

  drawHeader(ctx) {
    ctx.fillStyle =
      '#4B2D24';

    ctx.fillRect(
      0,
      0,
      390,
      88
    );

    this.drawText(
      ctx,
      this.title,
      22,
      30,
      22,
      '#FFFDF9',
      '700'
    );

    if (this.subtitle) {
      this.drawText(
        ctx,
        this.subtitle,
        22,
        61,
        12,
        '#EBD8CD',
        '500'
      );
    }
  }

  drawContent(ctx) {
    this.roundedRect(
      ctx,
      18,
      115,
      354,
      220,
      22,
      this.panel
    );

    this.drawText(
      ctx,
      this.title,
      195,
      175,
      25,
      this.text,
      '700',
      'center'
    );

    this.drawText(
      ctx,
      this.emptyText,
      195,
      220,
      14,
      this.muted,
      '500',
      'center'
    );

    this.roundedRect(
      ctx,
      80,
      265,
      230,
      42,
      14,
      this.accent
    );

    this.drawText(
      ctx,
      '系统已接入',
      195,
      286,
      14,
      '#FFFFFF',
      '700',
      'center'
    );
  }

  handleTap(x, y) {
    return false;
  }

  drawText(
    ctx,
    text,
    x,
    y,
    size,
    color,
    weight,
    align
  ) {
    ctx.fillStyle =
      color || this.text;

    ctx.font =
      (weight || '500') +
      ' ' +
      size +
      'px sans-serif';

    ctx.textAlign =
      align || 'left';

    ctx.textBaseline =
      'middle';

    ctx.fillText(
      text,
      x,
      y
    );
  }

  roundedRect(
    ctx,
    x,
    y,
    w,
    h,
    r,
    fill
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

    ctx.fillStyle =
      fill;

    ctx.fill();
  }
}

module.exports =
  SimpleScene;
