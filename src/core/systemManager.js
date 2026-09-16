class SystemManager {
  constructor(){
    this.systems = {};
  }

  register(name, system){
    this.systems[name] = system;
  }

  get(name){
    return this.systems[name];
  }

  update(delta){
    Object.values(this.systems).forEach(system=>{
      if(system.update) system.update(delta);
    });
  }
}

module.exports = SystemManager;
