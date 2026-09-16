// Decoration inventory module
// Stores owned furniture before placement.

export function addItem(inventory, itemId) {
  return [...inventory, itemId];
}

export function removeItem(inventory, itemId) {
  return inventory.filter(id => id !== itemId);
}
