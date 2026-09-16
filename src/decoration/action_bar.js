// Decoration action bar
// Centralizes user actions for mobile decoration mode.

export const decorationActions = {
  undo(history) {
    return history?.undo?.() || null;
  },
  redo(history) {
    return history?.redo?.() || null;
  },
  save(manager) {
    return manager?.save?.() || null;
  },
  exit(router) {
    return router?.exitDecoration?.() || null;
  }
};
