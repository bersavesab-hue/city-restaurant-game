'use strict';

const food=require('../food/foodPackV10.js');
const rules=require('./inventoryRulesV10.js');
const database=require('./ingredientInventoryDatabaseV0819.js');

function clone(v){return JSON.parse(JSON.stringify(v));}
function createInventory(options={}){
  return {
    version:'1.0.0',
    day:Number(options.day)||1,
    lots:[],
    sequence:0,
    capacityKg:{ambient:Number(options.ambientKg)||600,chilled:Number(options.chilledKg)||320,frozen:Number(options.frozenKg)||220},
    waste:{expiredGrams:0,shrinkGrams:0,value:0},
    history:[]
  };
}
function usedKg(state,storage){
  return state.lots.filter(x=>x.storage===storage&&x.grams>0).reduce((s,x)=>s+x.grams,0)/1000;
}
function receive(state,line){
  const ingredient=database.getIngredient(line.ingredientId);
  if(!ingredient)return {ok:false,reason:'食材不存在'};
  const grams=Math.max(0,Number(line.grams)||0);
  const storage=line.storage||rules.storageFor(ingredient);
  const capacity=Number(state.capacityKg[storage]||0);
  if(usedKg(state,storage)+grams/1000>capacity)return {ok:false,reason:`${storage}仓容量不足`};
  const day=Number(line.day??state.day);
  const lotId=
    `lot_${++state.sequence}`;

  const lot={
    id:lotId,
    batchNo:
      line.batchNo||
      lotId,
    databaseVersion:
      database.VERSION,
    ingredientId:ingredient.id,
    ingredientName:ingredient.name,
    grams,
    originalGrams:grams,
    storage,
    receivedDay:day,
    expiryDay:
      day+
      Math.max(
        1,
        Number(
          line.shelfDays??
          ingredient.shelfDays
        )
      ),
    unitCostPerKg:
      Number(
        line.unitCostPerKg
      )||0,
    supplierId:
      line.supplierId||null,
    quality:
      Number(
        line.quality??75
      )
  };
  state.lots.push(lot);state.history.push({type:'receive',day,lotId:lot.id,ingredientId:lot.ingredientId,grams});
  return {ok:true,lot};
}
function availableGrams(state,ingredientId){
  return state.lots.filter(x=>x.ingredientId===ingredientId&&x.grams>0&&x.expiryDay>=state.day).reduce((s,x)=>s+x.grams,0);
}
function consume(state,ingredientId,grams,options={}){
  let need=Math.max(0,Number(grams)||0);
  const have=availableGrams(state,ingredientId);
  if(have+1e-6<need)return {ok:false,reason:'库存不足',needGrams:need,haveGrams:have,cost:0};
  const lots=state.lots.filter(x=>x.ingredientId===ingredientId&&x.grams>0&&x.expiryDay>=state.day)
    .sort((a,b)=>a.expiryDay-b.expiryDay||a.receivedDay-b.receivedDay);
  let cost=0,used=0,qualityWeighted=0;
  for(const lot of lots){
    if(need<=0)break;
    const take=Math.min(need,lot.grams);
    lot.grams-=take;need-=take;used+=take;
    cost+=take/1000*lot.unitCostPerKg;
    qualityWeighted+=take*lot.quality;
  }
  state.history.push({type:'consume',day:state.day,ingredientId,grams:used,reason:options.reason||'production'});
  return {ok:true,grams:used,cost:Math.round(cost*100)/100,avgQuality:used?Math.round(qualityWeighted/used*10)/10:0};
}
function consumeRequirements(state,requirements,options={}){
  for(const line of requirements||[]){
    if(!line.optional&&availableGrams(state,line.ingredientId)<line.grams){
      return {ok:false,missing:{ingredientId:line.ingredientId,name:line.name,need:line.grams,have:availableGrams(state,line.ingredientId)}};
    }
  }
  let cost=0,quality=0,weight=0,consumed=[];
  for(const line of requirements||[]){
    const have=availableGrams(state,line.ingredientId);
    if(line.optional&&have<line.grams)continue;
    const r=consume(state,line.ingredientId,line.grams,options);
    if(r.ok){cost+=r.cost;quality+=r.avgQuality*r.grams;weight+=r.grams;consumed.push(r);}
  }
  return {ok:true,cost:Math.round(cost*100)/100,avgQuality:weight?Math.round(quality/weight*10)/10:0,consumed};
}
function advanceDay(state,toDay,options={}){
  const day=Math.max(state.day,Number(toDay)||state.day+1);state.day=day;
  let expiredGrams=0,expiredValue=0;
  for(const lot of state.lots){
    if(lot.grams<=0)continue;
    if(lot.expiryDay<day){
      expiredGrams+=lot.grams;expiredValue+=rules.lotValue(lot);lot.grams=0;
    }else if(options.shrinkRate){
      const shrink=Math.min(lot.grams,lot.grams*Math.max(0,Number(options.shrinkRate)));
      lot.grams-=shrink;state.waste.shrinkGrams+=shrink;
    }
  }
  state.waste.expiredGrams+=expiredGrams;state.waste.value+=expiredValue;
  state.history.push({type:'day',day,expiredGrams});
  return {day,expiredGrams,expiredValue:Math.round(expiredValue*100)/100};
}
function lotRows(
  state
) {
  return (
    database
      .lotRows(
        state
      )
  );
}

function capacitySummary(
  state
) {
  return (
    database
      .capacitySummary(
        state
      )
  );
}

function inventoryAlerts(
  state
) {
  const rows =
    lotRows(
      state
    );

  const alerts = [];

  for (
    const row
    of rows
  ) {
    if (
      row.status.expired
    ) {
      alerts.push({
        type:'expired',
        severity:'critical',
        lotId:row.id,
        batchNo:row.batchNo,
        ingredientId:row.ingredientId,
        ingredientName:row.ingredientName,
        grams:row.grams,
        daysRemaining:
          row.status.daysRemaining
      });

      continue;
    }

    if (
      row.status.status ===
        'expires_today'
    ) {
      alerts.push({
        type:'expires_today',
        severity:'critical',
        lotId:row.id,
        batchNo:row.batchNo,
        ingredientId:row.ingredientId,
        ingredientName:row.ingredientName,
        grams:row.grams,
        daysRemaining:0
      });

      continue;
    }

    if (
      row.status.nearExpiry
    ) {
      alerts.push({
        type:'near_expiry',
        severity:'warning',
        lotId:row.id,
        batchNo:row.batchNo,
        ingredientId:row.ingredientId,
        ingredientName:row.ingredientName,
        grams:row.grams,
        daysRemaining:
          row.status.daysRemaining
      });
    }

    if (
      Number(
        row.quality
      ) <
      60
    ) {
      alerts.push({
        type:'low_quality',
        severity:'warning',
        lotId:row.id,
        batchNo:row.batchNo,
        ingredientId:row.ingredientId,
        ingredientName:row.ingredientName,
        quality:
          Number(
            row.quality
          )||0
      });
    }
  }

  const capacity =
    capacitySummary(
      state
    );

  for (
    const zone
    of capacity.rows
  ) {
    if (
      zone.status !==
      'ok'
    ) {
      alerts.push({
        type:'capacity',
        severity:
          zone.status ===
            'critical'
            ? 'critical'
            : 'warning',
        storage:
          zone.id,
        storageName:
          zone.name,
        usageRatio:
          zone.usageRatio,
        usedKg:
          zone.usedKg,
        capacityKg:
          zone.capacityKg
      });
    }
  }

  return alerts;
}

function stockSummary(
  state
) {
  const byIngredient={};
  const byStorage={
    ambient:0,
    chilled:0,
    frozen:0
  };

  const rows=
    lotRows(
      state
    );

  for(
    const lot
    of rows
  ){
    if(
      lot.status.expired
    ){
      continue;
    }

    byIngredient[
      lot.ingredientId
    ]=
      (
        byIngredient[
          lot.ingredientId
        ]||0
      )+
      lot.grams;

    if(
      byStorage[
        lot.storage
      ]==
      null
    ){
      byStorage[
        lot.storage
      ]=0;
    }

    byStorage[
      lot.storage
    ]+=
      lot.grams/
      1000;
  }

  return {
    databaseVersion:
      database.VERSION,
    day:state.day,
    byIngredient,
    byStorage,
    totalKg:
      Object
        .values(
          byIngredient
        )
        .reduce(
          (s,x)=>s+x,
          0
        )/
      1000,
    lotCount:
      rows.length,
    nearExpiryLotCount:
      rows.filter(
        row=>
          row.status.nearExpiry
      ).length,
    expiredLotCount:
      rows.filter(
        row=>
          row.status.expired
      ).length,
    capacity:
      capacitySummary(
        state
      ),
    alerts:
      inventoryAlerts(
        state
      ),
    waste:
      clone(
        state.waste
      )
  };
}

function inventoryHealth(
  state
) {
  const rows =
    lotRows(
      state
    );

  const summary =
    stockSummary(
      state
    );

  return {
    databaseVersion:
      database.VERSION,
    day:
      state.day,
    totalLots:
      rows.length,
    sellableLots:
      rows.filter(
        row=>
          !row.status.expired
      ).length,
    nearExpiryLots:
      rows.filter(
        row=>
          row.status.nearExpiry
      ).length,
    expiredLots:
      rows.filter(
        row=>
          row.status.expired
      ).length,
    lowQualityLots:
      rows.filter(
        row=>
          Number(
            row.quality
          )<
          60
      ).length,
    totalKg:
      summary.totalKg,
    capacity:
      summary.capacity,
    alerts:
      summary.alerts,
    waste:
      clone(
        state.waste
      )
  };
}

function reorderSuggestions(
  state,
  targets={}
){
  const out=[];

  for(
    const [
      ingredientId,
      targetGrams
    ]
    of Object.entries(
      targets
    )
  ){
    const have=
      availableGrams(
        state,
        ingredientId
      );

    if(
      have<
      targetGrams*.45
    ){
      const ingredient=
        database
          .getIngredient(
            ingredientId
          );

      out.push({
        ingredientId,
        ingredientName:
          ingredient
            ? ingredient.name
            : ingredientId,
        storage:
          ingredient
            ? ingredient
                .storageZoneId
            : 'ambient',
        shelfDays:
          ingredient
            ? ingredient
                .shelfDays
            : null,
        perishability:
          ingredient
            ? ingredient
                .perishability
            : null,
        haveGrams:have,
        targetGrams,
        reorderGrams:
          Math.max(
            0,
            targetGrams-have
          ),
        priority:
          have<
          targetGrams*.15
            ? 'critical'
            : 'normal'
      });
    }
  }

  return out.sort(
    (
      a,
      b
    )=>
      (
        a.priority===
          'critical'
          ? -1
          : 1
      )-
      (
        b.priority===
          'critical'
          ? -1
          : 1
      )
  );
}

module.exports={
  createInventory,
  receive,
  availableGrams,
  consume,
  consumeRequirements,
  advanceDay,
  lotRows,
  capacitySummary,
  inventoryAlerts,
  stockSummary,
  inventoryHealth,
  reorderSuggestions,
  usedKg
};
