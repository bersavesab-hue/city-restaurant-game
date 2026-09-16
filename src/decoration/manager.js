// Decoration manager
// Central controller for furniture, rating and save integration.

export class DecorationManager {
  constructor() {
    this.items = [];
  }

  place(item) {
    this.items.push(item);
  }

  remove(id) {
    this.items = this.items.filter(item => item.id !== id);
  }

  calculateScore() {
    return this.items.reduce((score, item) => {
      return score + (item.decorationScore || 0);
    }, 0);
  }

  exportSave() {
    return JSON.stringify(this.items);
  }
}
