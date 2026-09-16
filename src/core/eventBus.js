'use strict';

class EventBus {
  constructor(){
    this.listeners = {};
  }

  on(name, handler){
    if(!this.listeners[name]) this.listeners[name]=[];
    this.listeners[name].push(handler);
  }

  emit(name, payload){
    const list=this.listeners[name]||[];
    list.forEach(handler=>handler(payload));
  }

  off(name, handler){
    if(!this.listeners[name]) return;
    this.listeners[name]=this.listeners[name].filter(item=>item!==handler);
  }
}

module.exports = new EventBus();
