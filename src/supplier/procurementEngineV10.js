'use strict';

const supplierEngine=require('./supplierEngineV10.js');
const supplierRules=require('./supplierRulesV10.js');
const inventoryEngine=require('../inventory/inventoryEngineV10.js');
const food=require('../food/foodPackV10.js');

function createProcurementState(){return {sequence:0,purchaseOrders:[],spend:0,receivedValue:0,returns:0};}
function bestQuote(network,ingredientId,qtyKg,ctx={}){
  const requestedKg=Math.max(.1,Number(qtyKg)||0);
  const quotes=[];
  for(const supplier of network||[]){
    if(!supplierEngine.supports(supplier,ingredientId))continue;
    const orderKg=Math.max(requestedKg,supplierRules.minOrderKg(supplier));
    const q=supplierEngine.quote(supplier,ingredientId,orderKg,ctx);
    if(q&&q.ok){
      q.requestedKg=requestedKg;
      q.moqAdjusted=orderKg>requestedKg+.0001;
      quotes.push(q);
    }
  }
  quotes.sort((a,b)=>{
    const scoreA=a.total*(1+(100-a.reliability)*.003+(100-a.quality)*.0018);
    const scoreB=b.total*(1+(100-b.reliability)*.003+(100-b.quality)*.0018);
    return scoreA-scoreB;
  });
  return quotes[0]||null;
}
function createPurchaseOrder(state,quote,ctx={}){
  if(!quote||!quote.ok)return {ok:false,reason:'报价无效'};
  const po={id:`po_${++state.sequence}`,supplierId:quote.supplierId,ingredientId:quote.ingredientId,ingredientName:quote.ingredientName,
    qtyKg:quote.qtyKg,unitPrice:quote.unitPrice,total:quote.total,freight:quote.freight,status:'ordered',
    orderedDay:Number(ctx.day)||1,expectedDay:(Number(ctx.day)||1)+Number(quote.leadDays||0),paymentTermId:quote.paymentTermId,
    deliveryModeId:quote.deliveryModeId,quality:quote.quality,reliability:quote.reliability};
  state.purchaseOrders.push(po);state.spend+=po.total;return {ok:true,po};
}
function receivePurchaseOrder(state,poId,inventory,ctx={}){
  const po=state.purchaseOrders.find(x=>x.id===poId);
  if(!po)return {ok:false,reason:'采购单不存在'};
  if(po.status==='received')return {ok:false,reason:'采购单已收货'};
  const day=Number(ctx.day??po.expectedDay);
  const ingredient=food.INGREDIENTS.find(x=>x.id===po.ingredientId);
  const result=inventoryEngine.receive(inventory,{ingredientId:po.ingredientId,grams:po.qtyKg*1000,unitCostPerKg:po.unitPrice,
    shelfDays:ingredient?.shelfDays,day,supplierId:po.supplierId,quality:po.quality});
  if(!result.ok)return result;
  po.status='received';po.receivedDay=day;state.receivedValue+=po.total;return {ok:true,po,lot:result.lot};
}
function autoProcure(state,network,inventory,targets,ctx={}){
  const suggestions=inventoryEngine.reorderSuggestions(inventory,targets);
  const created=[];
  for(const s of suggestions){
    const kg=Math.max(2,Math.ceil(s.reorderGrams/1000));
    const q=bestQuote(network,s.ingredientId,kg,ctx);
    if(!q)continue;
    const r=createPurchaseOrder(state,q,ctx);if(r.ok)created.push(r.po);
  }
  return created;
}
module.exports={createProcurementState,bestQuote,createPurchaseOrder,receivePurchaseOrder,autoProcure};
