class RatingFacade {
  constructor(system) {
    this.system = system;
  }

  calculate(data) {
    return this.system?.calculate?.(data);
  }

  getState() {
    return this.system?.getState?.() || {};
  }
}

module.exports = RatingFacade;
