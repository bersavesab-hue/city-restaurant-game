// Decoration mobile UI controller
// Provides data bindings for the future touch interface.

class DecorationUI {
  constructor(manager) {
    this.manager = manager;
    this.mode = 'browse';
    this.selectedCategory = 'table';
    this.selectedItem = null;
  }

  open() {
    this.mode = 'edit';
    return this.getState();
  }

  selectCategory(category) {
    this.selectedCategory = category;
    return this.getState();
  }

  selectItem(item) {
    this.selectedItem = item;
    return this.selectedItem;
  }

  getState() {
    return {
      mode: this.mode,
      category: this.selectedCategory,
      selectedItem: this.selectedItem
    };
  }
}

module.exports = DecorationUI;
