'use strict';

class ModuleRegistry {
  constructor(){
    this.modules = {};
  }
  register(name, module){
    this.modules[name] = module;
  }
  get(name){
    return this.modules[name];
  }
}

module.exports = ModuleRegistry;
