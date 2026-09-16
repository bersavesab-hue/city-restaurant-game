// Decoration page routing layer
export const decorationRouter = {
  currentMode: 'normal',
  enter() {
    this.currentMode = 'decoration';
    return this.currentMode;
  },
  exit() {
    this.currentMode = 'normal';
    return this.currentMode;
  }
};
