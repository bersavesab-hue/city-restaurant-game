'use strict';

/**
 * 已生成视觉资源登记表。
 *
 * 这些图不在启动时全部预加载，避免上下文与内存膨胀。
 * 具体页面需要时再按路径加载。
 */
module.exports = {
  mockups: {
    storeManagement:
      'assets/images/generated/mockups/store_management_v1.png',

    districtDashboard:
      'assets/images/generated/mockups/district_dashboard_v1.png',

    renovationScreen:
      'assets/images/generated/mockups/renovation_screen_v1.png',

    storePreparation:
      'assets/images/generated/mockups/store_preparation_v1.png',

    districtDashboardAlt:
      'assets/images/generated/mockups/district_dashboard_alt_v1.png'
  },

  atlases: {
    uiComponents:
      'assets/images/generated/atlases/ui_components_v1.png',

    renovationAssets:
      'assets/images/generated/atlases/renovation_assets_v1.png'
  }
};
