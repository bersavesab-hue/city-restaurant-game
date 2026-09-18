'use strict';

function createDiningRoom(options={}){
  const tables=[];const counts=options.tableCounts||{two:6,four:8,six:3,eight:1};
  const specs={two:2,four:4,six:6,eight:8};let n=0;
  for(const [key,count] of Object.entries(counts)){for(let i=0;i<count;i++)tables.push({id:`table_${++n}`,seats:specs[key]||4,status:'free',partyId:null});}
  return {tables,queue:[],servedParties:0,walkaways:0,avgWaitMinutes:0,totalWaitMinutes:0};
}
function enqueue(room,party){room.queue.push({...party,queuedMinute:Number(party.queuedMinute)||0});return room.queue.length;}
function findTable(room,partySize){return room.tables.filter(t=>t.status==='free'&&t.seats>=partySize).sort((a,b)=>a.seats-b.seats)[0]||null;}
function seatNext(room,minute){
  for(let i=0;i<room.queue.length;i++){const p=room.queue[i],table=findTable(room,p.partySize||1);if(!table)continue;
    room.queue.splice(i,1);table.status='occupied';table.partyId=p.id;const wait=Math.max(0,minute-p.queuedMinute);
    room.totalWaitMinutes+=wait;room.servedParties++;room.avgWaitMinutes=room.totalWaitMinutes/room.servedParties;
    return {ok:true,party:p,table,waitMinutes:wait};}
  return {ok:false,reason:'暂无合适餐桌'};
}
function releaseTable(room,tableId){const t=room.tables.find(x=>x.id===tableId);if(!t)return false;t.status='free';t.partyId=null;return true;}
function serviceScore(ctx={}){
  const coverage=Math.max(0,Math.min(1.2,Number(ctx.staffCoverage??1)));
  const wait=Math.max(0,Number(ctx.waitMinutes||0));const mistakes=Math.max(0,Number(ctx.mistakes||0));
  return Math.max(0,Math.min(100,Math.round(72+coverage*18-wait*1.2-mistakes*12)));
}
module.exports={createDiningRoom,enqueue,findTable,seatNext,releaseTable,serviceScore};
