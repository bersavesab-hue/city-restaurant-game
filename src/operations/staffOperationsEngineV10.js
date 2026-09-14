'use strict';

function clamp(v,min=0,max=100){return Math.max(min,Math.min(max,Number(v)||0));}
const ROLE_LOAD={
  chef:{capacity:1.0,fatigue:1.08},prep_cook:{capacity:.95,fatigue:1.0},waiter:{capacity:1.0,fatigue:1.02},cashier:{capacity:1.05,fatigue:.92},
  manager:{capacity:1.12,fatigue:.9},warehouse_keeper:{capacity:1.0,fatigue:.95},procurement:{capacity:1.0,fatigue:.88}
};
function createStaffState(){return {employees:[],shifts:[],absences:[],training:[],payroll:0};}
function hire(state,person,roleId,wage){const e={personId:person.id||person.name,name:person.name,roleId,wage:Number(wage)||3500,skill:Number(person.skills?.cooking||person.skills?.service||person.skills?.operations||50),
  energy:100,stress:20,satisfaction:65,attendance:1,tenureDays:0,active:true};state.employees.push(e);return e;}
function planShift(state,day,assignments){const shift={day,assignments:(assignments||[]).map(x=>({...x})),status:'planned'};state.shifts.push(shift);return shift;}
function operateShift(state,day,ctx={}){
  const shift=state.shifts.find(x=>x.day===day)||{assignments:state.employees.filter(x=>x.active).map(e=>({personId:e.personId,hours:8}))};
  let capacity=0,coverage=0,active=0,absent=0;
  for(const a of shift.assignments){const e=state.employees.find(x=>x.personId===a.personId&&x.active);if(!e)continue;active++;
    const sick=Math.max(0,Number(ctx.absenceRate??.02));if(Math.random()<sick){absent++;continue;}
    const spec=ROLE_LOAD[e.roleId]||{capacity:1,fatigue:1};const hours=Math.max(1,Number(a.hours)||8);
    capacity+=(e.skill/60)*spec.capacity*(hours/8);coverage++;e.energy=clamp(e.energy-hours*4.5*spec.fatigue);
    e.stress=clamp(e.stress+Math.max(0,Number(ctx.pressure||0))*12+hours*.7-4);e.satisfaction=clamp(e.satisfaction+(e.energy>45?1:-2)-(e.stress>75?2:0));e.tenureDays++;
  }
  shift.status='done';return {active,absent,coverageRate:active?coverage/active:0,capacity:Math.round(capacity*100)/100};
}
function turnoverRisk(e){return clamp((100-e.satisfaction)*.45+e.stress*.35+(100-e.energy)*.2)/100;}
function payrollDaily(state){return state.employees.filter(x=>x.active).reduce((s,e)=>s+e.wage/30,0);}
module.exports={ROLE_LOAD,createStaffState,hire,planShift,operateShift,turnoverRisk,payrollDaily};
