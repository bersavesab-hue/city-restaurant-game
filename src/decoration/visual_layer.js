// Decoration visual layer
// Handles rendering data for mobile decoration scenes.

export class DecorationVisualLayer {
  constructor() {
    this.mode = 'edit';
    this.selectedItem = null;
  }

  select(item) {
    this.selectedItem = item;
  }

  clearSelection() {
    this.selectedItem = null;
  }

  getSceneData(state) {
    return {
      mode: this.mode,
      furniture: state?.furniture || [],
      selected: this.selectedItem
    };
  }
}
