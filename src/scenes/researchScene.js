'use strict';

const SimpleScene =
  require('./simpleScene.js');

class ResearchScene extends SimpleScene {
  constructor() {
    super({
      id: 'research',

      title: '研发',

      subtitle:
        '研发菜品、测试配方和打造招牌菜',

      emptyText:
        '暂时还没有研发中的菜品'
    });
  }

  enter(payload) {
    super.enter(payload);
  }

  handleTap(x, y) {
    return false;
  }
}

const researchScene =
  new ResearchScene();

module.exports =
  researchScene;
