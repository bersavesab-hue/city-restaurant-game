'use strict';

module.exports = {
  settlement:
    require('./settlementEngineV10.js'),
  retention:
    require('./retentionEngineV10.js'),
  staff:
    require('./staffOperationsEngineV10.js'),
  staffManagement:
    require('./staffManagementCoordinatorV0823.js'),
  live:
    require('./liveOperationsCoordinatorV0824.js'),
  delivery:
    require('./deliveryEngineV10.js'),
  marketing:
    require('./marketingEngineV10.js'),
  brand:
    require('./brandGrowthEngineV10.js'),
  events:
    require('./restaurantEventEngineV10.js'),
  runtime:
    require('./restaurantRuntimeV10.js'),
  finance:
    require('../finance/completeFinanceSystemV0825.js')
};
