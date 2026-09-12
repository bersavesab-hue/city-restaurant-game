'use strict';

const SimpleScene =
  require('./simpleScene.js');

class ShopScene extends SimpleScene {
  constructor() {
    super({
      id: 'shop',

      title: '门店',

      subtitle:
        '管理你的餐厅、租约和经营状态',

      emptyText:
        '你目前还没有门店'
    });
  }

  enter(payload) {
    super.enter(payload);
  }

  handleTap(x, y) {
    return false;
  }
}

const shopScene =
  new ShopScene();

module.exports =
  shopScene;
