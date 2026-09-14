'use strict';

const CAMPAIGN_TYPES=[
  ['coupon','优惠券',.08,.10],['full_reduction','满减',.12,.14],['groupbuy','团购套餐',.15,.18],['member_day','会员日',.08,.11],
  ['new_store','新店活动',.20,.22],['dish_launch','新品推广',.09,.12],['short_video','短视频推广',.13,.17],['local_influencer','本地达人',.18,.20],
  ['livestream','直播活动',.22,.24],['community','社区地推',.07,.09],['office','写字楼合作',.10,.11],['campus','校园活动',.11,.13],
  ['festival','节日活动',.16,.20],['birthday','生日权益',.05,.06],['referral','老带新',.10,.12],['points','积分兑换',.06,.08],
  ['delivery_boost','外卖加权',.12,.15],['search_ads','搜索广告',.14,.16],['brand_ads','品牌广告',.18,.13],['cross_brand','异业联名',.13,.15],
  ['late_night','夜宵专项',.09,.12],['breakfast','早餐专项',.08,.10],['family','家庭套餐',.10,.12],['corporate','企业团餐开发',.12,.14]
].map(([id,name,costFactor,demandLift])=>({id,name,costFactor,demandLift}));
function createCampaign(typeId,budget,days=7){const t=CAMPAIGN_TYPES.find(x=>x.id===typeId);if(!t)throw new Error('未知营销活动');return {id:`campaign_${Date.now()}_${typeId}`,typeId,
  name:t.name,budget:Number(budget)||0,days,remainingDays:days,demandLift:t.demandLift,status:'active',spent:0};}
function tickCampaign(c){if(c.status!=='active')return c;const daily=c.budget/Math.max(1,c.days);c.spent+=daily;c.remainingDays--;if(c.remainingDays<=0)c.status='ended';return c;}
function demandMultiplier(campaigns){return 1+(campaigns||[]).filter(x=>x.status==='active').reduce((s,x)=>s+x.demandLift*(1-x.spent/Math.max(1,x.budget)*.15),0);}
module.exports={CAMPAIGN_TYPES,createCampaign,tickCampaign,demandMultiplier};
