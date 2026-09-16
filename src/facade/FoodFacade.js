// Food unified entry
class FoodFacade {
  constructor(foodSystem) {
    this.system = foodSystem;
  }

  createRecipe(data) {
    return this.system?.createRecipe?.(data);
  }

  researchFood(data) {
    return this.system?.researchFood?.(data);
  }

  getState() {
    return this.system?.getState?.() || {};
  }
}

module.exports = FoodFacade;
