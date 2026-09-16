// Decoration purchase system
// Handles furniture purchase validation and inventory updates.

export function canPurchase(item, money) {
  return money >= item.price;
}

export function purchase(item, inventory) {
  if (!inventory) inventory = [];
  inventory.push(item.id);
  return inventory;
}
