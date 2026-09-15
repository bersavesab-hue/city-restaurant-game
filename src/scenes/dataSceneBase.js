'use strict';

const runtime = globalThis.GameRuntime || {};
const api = runtime.api || {};
const ui = require('../ui/dataWidgets.js');

const DESIGN_W = 390;

class DataSceneBase {
  constructor(id) {
    this.id = id;
    this.viewH = 780;
    this.navH = 64;
    this.contentBottom = 716;
    this.localButtons = [];
    this.tab = 0;
  }

  getLayout() {
    let height = 780;
    if (api && typeof api.getSystemInfoSync === 'function') {
      try {
        const info = api.getSystemInfoSync();
        const sw = Math.max(1, Number(info.windowWidth) || DESIGN_W);
        const sh = Math.max(1, Number(info.windowHeight) || 780);
        const scale = sw / DESIGN_W;
        height = sh / scale;
      } catch (e) {}
    }
    this.viewH = height;
    this.navH = height < 740 ? 60 : 64;
    this.contentBottom = height - this.navH;
    return { width: DESIGN_W, height, navH: this.navH, contentBottom: this.contentBottom };
  }

  addButton(id, x, y, w, h) {
    this.localButtons.push({ id, x, y, w, h });
  }

  clearButtons() {
    this.localButtons.length = 0;
  }

  hitButton(x, y) {
    for (let i = this.localButtons.length - 1; i >= 0; i--) {
      const b = this.localButtons[i];
      if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) return b;
    }
    return null;
  }

  showToast(message) {
    if (api && typeof api.showToast === 'function') {
      api.showToast({ title: String(message), icon: 'none' });
    }
  }

  enter(payload) {
    this.payload = payload || {};
    this.tab = 0;
  }

  exit() {}
  update() {}

  begin(ctx) {
    this.getLayout();
    this.clearButtons();
    ctx.save();
    ctx.fillStyle = ui.COLORS.bg;
    ctx.fillRect(0, 0, DESIGN_W, this.viewH);
  }

  end(ctx) {
    ctx.restore();
  }

  handleBaseTap(x, y) {
    const hit = this.hitButton(x, y);
    if (!hit) return null;
    if (hit.id.indexOf('tab:') === 0) {
      this.tab = Number(hit.id.split(':')[1]) || 0;
      return true;
    }
    return hit;
  }
}

module.exports = DataSceneBase;
