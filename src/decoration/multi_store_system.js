// Multi store decoration support
export function createStoreDecorationProfile(storeId) {
  return {
    storeId,
    decoration: [],
    theme: null,
    rating: 0
  };
}

export function copyDecorationTemplate(template, storeId) {
  return {
    storeId,
    decoration: [...(template || [])]
  };
}
