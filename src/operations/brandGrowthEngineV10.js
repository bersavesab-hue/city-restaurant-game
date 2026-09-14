'use strict';

const LEVELS=Array.from({length:20},(_,i)=>({level:i+1,name:[
  '街坊新店','社区小有名气','区域口碑店','商圈热门店','城市新锐品牌','城市知名品牌','区域连锁起步','区域连锁品牌','城市头部品牌','跨区扩张品牌',
  '区域强势品牌','省域新锐品牌','省域知名品牌','省域头部品牌','跨省连锁起步','全国新锐品牌','全国知名品牌','全国头部品牌','国民餐饮品牌','行业标杆品牌'
][i],xpRequired:Math.round(i*i*520+i*900),storeCap:Math.max(1,1+Math.floor(i/2))}));
function createBrand(name='未命名品牌'){return {name,level:1,xp:0,reputation:0,awareness:0,loyalty:0,storeCount:1,awards:[],history:[]};}
function addExperience(brand,amount,reason){brand.xp=Math.max(0,brand.xp+Number(amount||0));let level=1;for(const row of LEVELS)if(brand.xp>=row.xpRequired)level=row.level;
  const old=brand.level;brand.level=level;if(level>old)brand.history.push({type:'level_up',level,reason:reason||''});return brand;}
function applyDailyResult(brand,result){const profit=Number(result.profit||0),rating=Number(result.rating||4);addExperience(brand,Math.max(0,profit/20)+Math.max(0,rating-3)*18,'daily');
  brand.reputation=Math.max(0,Math.min(100,brand.reputation+(rating-3.5)*.4));brand.awareness=Math.max(0,Math.min(100,brand.awareness+Math.log10(Math.max(10,Number(result.customers||10)))*.15));return brand;}
function canOpenStore(brand){const level=LEVELS[brand.level-1]||LEVELS[0];return brand.storeCount<level.storeCap;}
module.exports={LEVELS,createBrand,addExperience,applyDailyResult,canOpenStore};
