// Decoration effect calculator
// Converts decoration into gameplay modifiers

function calculateDecorationScore(items = []) {
  return items.reduce((score, item) => {
    return score + (item.score || 0);
  }, 0);
}

function calculateCustomerEffect(items = []) {
  return items.reduce((effect, item) => {
    effect.comfort += item.comfort || 0;
    effect.atmosphere += item.atmosphere || 0;
    effect.service += item.service || 0;
    return effect;
  }, { comfort: 0, atmosphere: 0, service: 0 });
}

module.exports = {
  calculateDecorationScore,
  calculateCustomerEffect
};
