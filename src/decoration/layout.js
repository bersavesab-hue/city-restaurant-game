// Mobile decoration layout controller
// Handles screen regions for decoration mode.

export const decorationLayout = {
  topBar: {
    showMoney: true,
    showRating: true,
    showLevel: true
  },
  canvas: {
    zoomEnabled: true,
    dragEnabled: true,
    gridEnabled: true
  },
  bottomBar: {
    categories: [
      'floor',
      'wall',
      'table',
      'chair',
      'equipment',
      'decoration',
      'theme'
    ]
  },
  actions: [
    'undo',
    'redo',
    'save',
    'exit'
  ]
};
