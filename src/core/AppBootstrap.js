// Application bootstrap layer

class AppBootstrap {
  constructor(facade) {
    this.facade = facade;
  }

  start() {
    return this.facade.getState();
  }
}

module.exports = AppBootstrap;
