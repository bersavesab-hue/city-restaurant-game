const screens = {};

function register(name, screen){
  screens[name] = screen;
}

function get(name){
  return screens[name];
}

module.exports = {
  register,
  get,
  screens
};
