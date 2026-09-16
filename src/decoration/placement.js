// Decoration placement system
// Handles furniture positioning, grid snapping and validation.

export class DecorationPlacement {
  constructor(gridSize = 1) {
    this.gridSize = gridSize;
    this.items = [];
  }

  snap(position) {
    return {
      x: Math.round(position.x / this.gridSize) * this.gridSize,
      y: Math.round(position.y / this.gridSize) * this.gridSize
    };
  }

  add(item, position) {
    const pos = this.snap(position);
    this.items.push({ ...item, position: pos });
    return pos;
  }

  remove(id) {
    this.items = this.items.filter(item => item.id !== id);
  }

  getAll() {
    return this.items;
  }
}
