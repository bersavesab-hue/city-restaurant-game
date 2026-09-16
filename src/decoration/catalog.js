// Decoration catalog categories

const categories = {
  floor: [],
  wall: [],
  table: [],
  chair: [],
  kitchen: [],
  decoration: [],
  theme: []
};

function getCategory(name) {
  return categories[name] || [];
}

module.exports = { categories, getCategory };
