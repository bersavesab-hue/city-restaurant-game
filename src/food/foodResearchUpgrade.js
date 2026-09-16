'use strict';

const qualitySystem=require('./foodQuality.js');

function clamp(value,min,max){return Math.max(min,Math.min(max,Number(value)||0));}
function round(value,digits=1){const p=Math.pow(10,digits);return Math.round((Number(value)||0)*p)/p;}

function improveFood(food,feedback){
  const source=food||{};
  const info=typeof feedback==='number'?{points:feedback}:feedback||{};
  const chefSkill=clamp(info.chefSkill==null?50:info.chefSkill,0,100);
  const focus=info.focus||'taste';
  const baseGain=Number(info.points==null?2.5:info.points)||0;
  const diminishing=Math.max(0.35,1-(Number(source.score)||60)/135);
  const gain=clamp(baseGain*diminishing+chefSkill/90,0.4,4.5);
  const next={...source};

  next.score=clamp(round((Number(source.score)||0)+gain,1),0,100);
  next.improvements=Math.max(0,Number(source.improvements)||0)+1;
  next.version=Math.max(1,Number(source.version)||1)+1;

  if(focus==='innovation'){
    next.innovation=clamp(round((Number(source.innovation)||60)+gain*1.15,1),0,100);
  }else if(focus==='speed'){
    next.speedFactor=clamp(round((Number(source.speedFactor)||1)*(1-gain/180),3),0.65,1.6);
  }else if(focus==='cost'){
    next.costFactor=clamp(round((Number(source.costFactor)||1)*(1-gain/220),3),0.65,1.7);
  }else{
    next.acceptance=clamp(round((Number(source.acceptance)||65)+gain*.75,1),0,100);
    next.repeatRate=clamp(round((Number(source.repeatRate)||.5)+gain/250,3),0,0.98);
  }

  const quality=qualitySystem.getQuality(next.score);
  next.qualityId=quality.id;
  next.qualityName=quality.name;
  next.history=Array.isArray(source.history)?source.history.slice(-11):[];
  next.history.push({focus,gain:round(gain,2),score:next.score,minute:Number(info.minute)||0});
  return next;
}

module.exports={improveFood};
