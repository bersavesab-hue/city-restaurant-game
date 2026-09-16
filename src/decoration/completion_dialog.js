// Decoration completion feedback layer

export function buildDecorationSummary(state) {
  return {
    score: state.score || 0,
    cost: state.cost || 0,
    changes: state.changes || [],
    nextEffects: state.effects || {}
  };
}
