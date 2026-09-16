// Furniture card presentation layer
// Provides data required by mobile decoration shop UI.

export function createFurnitureCard(item) {
  return {
    id: item.id,
    name: item.name,
    category: item.category,
    price: item.price,
    effects: item.effects || {},
    preview: item.preview || null
  };
}
