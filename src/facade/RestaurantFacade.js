class RestaurantFacade {
  constructor(system) {
    this.system = system;
  }

  openRestaurant() {
    return this.system?.openRestaurant?.();
  }

  calculateIncome() {
    return this.system?.calculateIncome?.();
  }

  getState() {
    return this.system?.getState?.() || {};
  }
}

module.exports = RestaurantFacade;
