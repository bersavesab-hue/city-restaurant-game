'use strict';

/**
 * 已生成视觉资源登记表。
 *
 * mockups：只作为设计参考，不进入正式主包。
 * atlases：保留在仓库，按功能分包/按需加载，不在启动时预加载。
 */
module.exports = {
  mockups: {
    runtime:
      false,

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
    runtime:
      'subpackage',

    uiComponents:
      'assets/images/generated/atlases/ui_components_v1.png',

    renovationAssets:
      'assets/images/generated/atlases/renovation_assets_v1.png'
  }
};
