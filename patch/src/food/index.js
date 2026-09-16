'use strict';

// V1.1 Food Module Bridge
// 在保留原有系统的基础上增加统一入口

module.exports = {
  pack: require('./foodPackV10.js'),
  rules: require('./foodRulesV10.js'),
  recipes: require('./recipeEngineV10.js'),
  menu: require('./menuEngineV10.js'),
  database: require('./foodResearchDatabaseV0818.js'),
  research: require('./foodResearchSystemV0818.js'),

  // V1.1扩展接口
  quality: require('./foodQuality.js'),
  researchUpgrade: require('./foodResearchUpgrade.js'),
  generator: require('./foodGenerator.js')
};
