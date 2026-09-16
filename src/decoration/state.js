// Decoration runtime state
const decorationState = {
  mode: 'view',
  selectedItem: null,
  history: [],
  future: [],
  preview: false
};

function setMode(mode) {
  decorationState.mode = mode;
}

function selectItem(itemId) {
  decorationState.selectedItem = itemId;
}

function snapshot(layout) {
  decorationState.history.push(JSON.stringify(layout));
  decorationState.future = [];
}

module.exports = { decorationState, setMode, selectItem, snapshot };
