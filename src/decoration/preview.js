// Decoration preview layer
export const decorationPreview = {
  previewItems: [],
  set(items) {
    this.previewItems = Array.isArray(items) ? items : [];
  },
  clear() {
    this.previewItems = [];
  },
  get() {
    return this.previewItems;
  }
};
