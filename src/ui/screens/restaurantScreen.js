class RestaurantScreen {
  constructor(ui){
    this.ui = ui;
  }

  open(data){
    this.data = data;
  }

  render(){
    return this.data || {};
  }
}

module.exports = RestaurantScreen;
