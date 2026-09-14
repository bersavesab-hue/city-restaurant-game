'use strict';

const pack=require('./supplierPackV10.js');
const rules=require('./supplierRulesV10.js');
const food=require('../food/foodPackV10.js');
const {SeededRng}=require('../foundation/rng.js');

function byId(list,id){return list.find(x=>x.id===id)||null;}
function ingredientIdsForArchetype(a){
  const ids=[];
  for(const category of a.ingredientCategories||[]){
    ids.push(...(pack.INGREDIENTS_BY_CATEGORY[category]||[]));
  }
  return [...new Set(ids)];
}
function createSupplier(archetype, index, rng){
  const quote=pack.QUOTE_STRATEGIES[index%pack.QUOTE_STRATEGIES.length];
  const negotiation=pack.NEGOTIATION_STYLES[(index*5)%pack.NEGOTIATION_STYLES.length];
  const payment=pack.PAYMENT_TERMS[(index*7)%pack.PAYMENT_TERMS.length];
  const delivery=pack.DELIVERY_MODES[(index*11)%pack.DELIVERY_MODES.length];
  return {
    id:`supplier_instance_${String(index+1).padStart(3,'0')}`,
    name:`${archetype.name.split('·')[0]}${index+1}号`,
    archetypeId:archetype.id,
    categoryId:archetype.categoryId,
    tierId:archetype.tierId,
    ingredientIds:ingredientIdsForArchetype(archetype),
    reliability:rules.clamp(archetype.baseReliability+rng.int(-7,7)),
    quality:rules.clamp(archetype.baseQuality+rng.int(-6,8)),
    service:rules.clamp(68+rng.int(-12,16)),
    relationship:50,
    negotiationPatience:rules.clamp(52+rng.int(-16,18)),
    capacityIndex:Number((archetype.capacityIndex*rng.float(.88,1.13)).toFixed(2)),
    priceIndex:Number((archetype.priceIndex*rng.float(.94,1.07)).toFixed(3)),
    minimumOrderIndex:archetype.minimumOrderIndex,
    quoteStrategyId:quote.id,
    negotiationStyleId:negotiation.id,
    paymentTermId:payment.id,
    deliveryModeId:delivery.id,
    active:true,
    history:{orders:0,onTime:0,late:0,qualityIncidents:0,totalSpend:0}
  };
}
function createSupplierNetwork(seed='supplier-network-v1'){
  const rng=new SeededRng(seed);
  return pack.SUPPLIER_ARCHETYPES.map((a,i)=>createSupplier(a,i,rng));
}
function supports(supplier, ingredientId){return !!supplier&&supplier.active!==false&&(supplier.ingredientIds||[]).includes(ingredientId);}
function quote(supplier, ingredientId, qtyKg, ctx={}){
  const ingredient=food.INGREDIENTS.find(x=>x.id===ingredientId);
  if(!ingredient||!supports(supplier,ingredientId))return {ok:false,reason:'该供应商不供应此食材'};
  const minKg=rules.minOrderKg(supplier);
  const qty=Math.max(.1,Number(qtyKg)||0);
  if(qty<minKg)return {ok:false,reason:`未达到起订量 ${minKg}kg`,minimumKg:minKg};
  const unitPrice=rules.pricePerKg(ingredient,supplier,ctx);
  const freight=qty>=Math.max(30,minKg*2)?0:Math.round((8+qty*.45)*100)/100;
  return {
    ok:true,supplierId:supplier.id,ingredientId,ingredientName:ingredient.name,qtyKg:qty,
    unitPrice,total:Number((qty*unitPrice+freight).toFixed(2)),freight,
    quality:supplier.quality,reliability:supplier.reliability,paymentTermId:supplier.paymentTermId,
    deliveryModeId:supplier.deliveryModeId,leadDays:Math.max(0,Math.round(3-supplier.reliability/40+(ctx.emergency?0:-.5)))
  };
}
function compareQuotes(network,ingredientId,qtyKg,ctx={}){
  return (network||[]).map(s=>quote(s,ingredientId,qtyKg,ctx)).filter(x=>x.ok).sort((a,b)=>{
    const sa=a.total*(1+(100-a.reliability)*.003+(100-a.quality)*.0018);
    const sb=b.total*(1+(100-b.reliability)*.003+(100-b.quality)*.0018);
    return sa-sb;
  });
}
function updateRelationship(supplier,delta){supplier.relationship=rules.clamp((supplier.relationship||50)+Number(delta||0));return supplier.relationship;}
module.exports={createSupplierNetwork,createSupplier,supports,quote,compareQuotes,updateRelationship};
