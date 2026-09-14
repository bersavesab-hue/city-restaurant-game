'use strict';
const STORAGE_BY_CATEGORY={
  pork:'chilled',beef:'chilled',lamb:'chilled',poultry:'chilled',seafood:'chilled',egg_dairy:'chilled',
  leafy:'chilled',fruit_veg:'chilled',mushroom:'chilled',fruit:'chilled',tofu_soy:'chilled',
  frozen_processed:'frozen'
};
function storageFor(ingredient){return STORAGE_BY_CATEGORY[ingredient?.category]||'ambient';}
function freshness(lot,day){
  const total=Math.max(1,Number(lot.expiryDay)-Number(lot.receivedDay));
  const remain=Number(lot.expiryDay)-Number(day);
  return Math.max(0,Math.min(100,Math.round(remain/total*100)));
}
function lotValue(lot){return Math.round((Number(lot.grams)||0)/1000*Number(lot.unitCostPerKg||0)*100)/100;}
module.exports={STORAGE_BY_CATEGORY,storageFor,freshness,lotValue};
