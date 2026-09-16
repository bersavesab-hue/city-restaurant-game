'use strict';

const eventBus = require('./eventBus');

class TimeManager {
  constructor(){
    this.day = 1;
    this.running = false;
  }

  tick(){
    if(!this.running) return;
    this.day += 1;
    eventBus.emit('dayChanged', {day:this.day});
  }

  start(){
    this.running = true;
  }

  pause(){
    this.running = false;
  }

  getDay(){
    return this.day;
  }
}

module.exports = new TimeManager();
