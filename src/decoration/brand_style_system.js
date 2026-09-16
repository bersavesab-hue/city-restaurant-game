// Multi-store brand decoration style system
export function calculateBrandStyle(stores) {
  return {
    consistency: stores.length ? 1 : 0,
    level: 0
  };
}
