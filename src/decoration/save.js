// Decoration save system
// Handles serialization and restoration of restaurant layouts.

export function saveDecoration(layout) {
  return JSON.stringify({
    version: 1,
    updatedAt: Date.now(),
    items: layout || []
  });
}

export function loadDecoration(data) {
  if (!data) return [];
  try {
    const parsed = JSON.parse(data);
    return parsed.items || [];
  } catch (e) {
    return [];
  }
}
