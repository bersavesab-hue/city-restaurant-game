// Decoration rating binding layer
// Converts decoration state into restaurant rating effects.

export function calculateDecorationScore(items = []) {
  return items.reduce((score, item) => {
    return score + (item.rating || 0);
  }, 0);
}

export function getDecorationMetrics(items = []) {
  return {
    totalScore: calculateDecorationScore(items),
    comfort: items.reduce((v, i) => v + (i.comfort || 0), 0),
    atmosphere: items.reduce((v, i) => v + (i.atmosphere || 0), 0)
  };
}
