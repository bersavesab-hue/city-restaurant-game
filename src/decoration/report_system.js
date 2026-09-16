// Decoration report system
// Calculates detailed decoration effects for UI and analytics.

export function buildDecorationReport(decoration) {
  return {
    totalScore: decoration?.score || 0,
    comfort: decoration?.comfort || 0,
    atmosphere: decoration?.atmosphere || 0,
    themeMatch: decoration?.themeMatch || 0,
    customerImpact: decoration?.customerImpact || 0
  };
}
