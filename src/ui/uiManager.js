class UIManager {
  constructor(){
    this.screens = {};
    this.current = null;
  }

  register(name, screen){
    this.screens[name] = screen;
  }

  show(name, data = {}){
    if(this.screens[name]){
      this.current = name;
      return this.screens[name].render(data);
    }
    return null;
  }
}

module.exports = UIManager;
