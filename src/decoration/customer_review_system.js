// Decoration customer review system
// Links decoration score with customer review generation.
export function createDecorationReview(decorationData) {
  return {
    score: decorationData.score || 0,
    tags: [],
    suggestions: []
  };
}
