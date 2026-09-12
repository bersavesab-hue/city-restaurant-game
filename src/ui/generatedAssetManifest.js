'use strict';

/**
 * 大型生成图保留在仓库用于视觉参考/后续切图。
 * V10 的游戏运行时不直接加载这些整张大图。
 * 真正运行时资源位于 assets/images/runtime/，由 visualAssetSystem 按页面加载。
 */
module.exports = {
  runtime:
    false,

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
