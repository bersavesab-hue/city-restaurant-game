// Decoration grid system
// Handles room cells, occupancy checks and placement validation

class DecorationGrid {
  constructor(width = 20, height = 20) {
    this.width = width;
    this.height = height;
    this.cells = new Map();
  }

  key(x, y) {
    return `${x}_${y}`;
  }

  canPlace(item, x, y) {
    const w = item.width || 1;
    const h = item.height || 1;

    if (x < 0 || y < 0 || x + w > this.width || y + h > this.height) {
      return false;
    }

    for (let i = x; i < x + w; i++) {
      for (let j = y; j < y + h; j++) {
        if (this.cells.has(this.key(i, j))) return false;
      }
    }
    return true;
  }

  occupy(item, x, y) {
    if (!this.canPlace(item, x, y)) return false;

    for (let i = x; i < x + (item.width || 1); i++) {
      for (let j = y; j < y + (item.height || 1); j++) {
        this.cells.set(this.key(i, j), item.id);
      }
    }
    return true;
  }
}

module.exports = DecorationGrid;
