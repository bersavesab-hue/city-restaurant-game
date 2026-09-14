'use strict';

const BASE_EVENTS=[
  ['supplier_delay','供应延迟','supply'],['supplier_price','供应涨价','supply'],['quality_issue','食材品质波动','supply'],
  ['equipment_fault','设备故障','kitchen'],['power_issue','临时电力异常','kitchen'],['gas_issue','燃气异常','kitchen'],
  ['staff_absence','员工临时缺勤','staff'],['staff_conflict','员工冲突','staff'],['chef_leave','核心厨师离职倾向','staff'],
  ['queue_surge','突发客流高峰','customer'],['complaint','顾客投诉','customer'],['viral_review','评价突然爆火','customer'],
  ['food_safety_check','食品安全检查','regulatory'],['fire_check','消防检查','regulatory'],['hygiene_check','卫生检查','regulatory'],
  ['weather_rain','连续降雨','city'],['weather_hot','高温天气','city'],['festival_peak','节庆客流','city'],
  ['competitor_open','附近竞品开业','competition'],['competitor_discount','竞品大促','competition']
];
const SEVERITIES=[['minor','轻微',.92],['normal','一般',1],['major','严重',1.22]];
const EVENT_TEMPLATES=[];
for(const base of BASE_EVENTS){for(const s of SEVERITIES){EVENT_TEMPLATES.push({id:`event_${base[0]}_${s[0]}`,name:`${s[1]}·${base[1]}`,domain:base[2],severity:s[0],factor:s[2]});}}
function drawEvent(rng,ctx={}){
  const candidates=EVENT_TEMPLATES.filter(x=>!ctx.domain||x.domain===ctx.domain);if(!candidates.length)return null;
  const idx=rng&&typeof rng.int==='function'?rng.int(0,candidates.length-1):Math.floor(Math.random()*candidates.length);return {...candidates[idx],day:ctx.day||1,durationDays:ctx.durationDays||1};
}
function impact(event){
  const sign=event.id.includes('viral_review')||event.id.includes('festival_peak')?-1:1;
  const magnitude=event.severity==='major'?.18:event.severity==='normal'?.10:.05;
  return {demandMultiplier:sign<0?1+magnitude:1-(event.domain==='customer'||event.domain==='city'?magnitude*.35:0),
    costMultiplier:event.domain==='supply'?1+magnitude:1,capacityMultiplier:['kitchen','staff'].includes(event.domain)?1-magnitude:1,reputationDelta:event.id.includes('complaint')?-magnitude*12:event.id.includes('viral_review')?magnitude*10:0};
}
module.exports={BASE_EVENTS,SEVERITIES,EVENT_TEMPLATES,drawEvent,impact};
