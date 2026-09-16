// Decoration business feedback bridge
// Applies decoration effects to restaurant operation data.

export function applyDecorationBusinessEffect(score) {
  return {
    trafficMultiplier: 1 + (score?.satisfaction || 0) / 1000,
    revenueMultiplier: 1 + (score?.atmosphere || 0) / 1000
  };
}
