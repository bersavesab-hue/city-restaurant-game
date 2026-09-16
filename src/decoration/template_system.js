// Decoration template system
// Supports saving and applying restaurant decoration layouts.

export const DecorationTemplateSystem = {
  templates: [],

  save(name, layout) {
    this.templates.push({
      name,
      layout,
      createdAt: Date.now()
    });
  },

  apply(template) {
    return template?.layout || [];
  }
};
