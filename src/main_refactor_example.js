// V1.1 MAIN ENTRY REFACTOR
// 目标：减少main入口直接管理业务模块

const GameFacade = require('./facade/GameFacade');

function createGame(modules) {
  const game = new GameFacade(modules);
  return game;
}

module.exports = {
  createGame
};
