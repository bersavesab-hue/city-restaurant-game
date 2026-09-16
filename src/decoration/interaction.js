// Decoration interaction layer
function beginDrag(item) {
  return { action: 'drag_start', item };
}

function moveItem(item, position) {
  return { action: 'move', item, position };
}

function rotateItem(item, angle) {
  return { action: 'rotate', item, angle };
}

function finishDrag(item) {
  return { action: 'drag_end', item };
}

module.exports = { beginDrag, moveItem, rotateItem, finishDrag };
