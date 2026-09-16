// Second hand furniture market
// Provides future buyback and resale extension points.

export const SecondHandMarket = {
  items: [],

  list(item) {
    this.items.push(item);
  },

  remove(id) {
    this.items = this.items.filter(item => item.id !== id);
  },

  calculatePrice(item) {
    return Math.floor((item.price || 0) * 0.5);
  }
};
