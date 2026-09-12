'use strict';

const SimpleScene =
  require('./simpleScene.js');

class BusinessScene extends SimpleScene {
  constructor() {
    super({
      id: 'business',

      title: '经营',

      subtitle:
        '查看收入、成本、客流和经营表现',

      emptyText:
        '当前还没有营业中的门店'
    });
  }

  enter(payload) {
    super.enter(payload);
  }

  handleTap(x, y) {
    return false;
  }
}

const businessScene =
  new BusinessScene();

module.exports =
  businessScene;
