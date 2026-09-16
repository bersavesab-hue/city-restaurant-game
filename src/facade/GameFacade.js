// V2 Restaurant Systems Integration
class GameFacade {
  constructor(modules = {}) {
    this.restaurant = modules.restaurant;
    this.food = modules.food;
    this.finance = modules.finance;
    this.rating = modules.rating;
    this.staff = modules.staff;
    this.ranking = modules.ranking;
  }

  getState() {
    return {
      restaurant: this.restaurant?.getState?.() || {},
      food: this.food?.getState?.() || {},
      finance: this.finance?.getState?.() || {},
      rating: this.rating?.getState?.() || {},
      staff: this.staff?.getState?.() || {},
      ranking: this.ranking?.getState?.() || {}
    };
  }
}

module.exports = GameFacade;
