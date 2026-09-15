'use strict';

module.exports = {
  pack:
    require('./supplierPackV10.js'),
  rules:
    require('./supplierRulesV10.js'),
  database:
    require('./supplierProcurementDatabaseV0820.js'),
  engine:
    require('./supplierEngineV10.js'),
  procurement:
    require('./procurementEngineV10.js')
};
