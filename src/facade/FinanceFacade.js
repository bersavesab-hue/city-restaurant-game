class FinanceFacade {
  constructor(system) {
    this.system = system;
  }

  settleDay(data) {
    return this.system?.settleDay?.(data);
  }

  getState() {
    return this.system?.getState?.() || {};
  }
}

module.exports = FinanceFacade;
