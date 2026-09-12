'use strict';

const SimpleScene =
  require('./simpleScene.js');

class SupplyScene extends SimpleScene {
  constructor() {
    super({
      id: 'supply',

      title: '供应链',

      subtitle:
        '管理食材采购、供应商和库存',

      emptyText:
        '暂时还没有供应商'
    });
  }

  enter(payload) {
    super.enter(payload);
  }

  handleTap(x, y) {
    return false;
  }
}

const supplyScene =
  new SupplyScene();

module.exports =
  supplyScene;
