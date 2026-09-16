// Decoration UI data model
// Provides data binding for mobile decoration interface.

export const decorationTabs = [
  'furniture',
  'floor',
  'wall',
  'equipment',
  'theme'
];

export function createDecorationState() {
  return {
    selectedItem: null,
    mode: 'browse',
    zoom: 1,
    layout: []
  };
}
