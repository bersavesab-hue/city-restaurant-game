// Customer decoration preference matching
export function calculateCustomerPreference(decoration, customerType) {
  const bonus = decoration?.styleBonus?.[customerType] || 0;
  return {
    customerType,
    preferenceBonus: bonus,
    satisfactionModifier: bonus * 0.1
  };
}
