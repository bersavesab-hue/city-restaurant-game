class AudioManager {
  constructor(){
    this.enabled = true;
    this.volume = 1;
  }

  playBgm(name){}

  playEffect(name){}

  stopAll(){}

  setVolume(value){
    this.volume = value;
  }
}

module.exports = AudioManager;
