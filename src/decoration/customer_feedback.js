// Decoration customer feedback bridge
// Converts decoration changes into customer experience signals.

export function calculateCustomerImpact(decoration) {
  const comfort = decoration?.comfort || 0;
  const atmosphere = decoration?.atmosphere || 0;

  return {
    satisfaction: Math.round((comfort + atmosphere) * 0.5),
    repeatRateBonus: Math.round(atmosphere * 0.1)
  };
}
