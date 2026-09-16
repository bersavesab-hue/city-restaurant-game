// Decoration finance binding layer
// Connects decoration purchases with restaurant economy data.

export function calculatePurchaseCost(items = []) {
  return items.reduce((total, item) => total + (item.price || 0), 0);
}

export function canAfford(balance, items = []) {
  return balance >= calculatePurchaseCost(items);
}

export function applyDecorationPurchase(state, items = []) {
  const cost = calculatePurchaseCost(items);
  return {
    ...state,
    money: Math.max(0, (state.money || 0) - cost),
    decorationHistory: [
      ...(state.decorationHistory || []),
      ...items
    ]
  };
}
