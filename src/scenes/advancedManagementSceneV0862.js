'use strict';

const runtime = globalThis.GameRuntime;
if (!runtime) throw new Error('AdvancedManagementScene：GameRuntime 未初始化');

const gameState = require('../core/gameState.js');
const saveSystem = require('../core/saveSystem.js');
const operations = require('../operations/operationsStoreV080.js');
const marketingState = require('../operations/marketingPlatformMembershipV0826.js');
const progressSystem = require('../progress/operatingProgressV0862.js');
const ui = require('../ui/premiumUi.js');
const opUi = require('../ui/operationsUiV080.js');

const TABS = [
  ['marketing','营销'],
  ['members','会员'],
  ['procurement','采购'],
  ['growth','成长']
];

function num(v) { return Number(v) || 0; }
function shortId(v) { const s=String(v||''); return s.length>12 ? s.slice(-10) : s; }

class AdvancedManagementScene {
  constructor() {
    this.id = 'advancedManagement';
    this.buttons = [];
    this.tab = 'marketing';
    this.marketingMode = 'campaigns';
    this.procurementMode = 'market';
    this.campaignPage = 0;
    this.campaignBudget = 1000;
    this.qtyKg = 20;
    this.selectedIngredientId = null;
    this.selectedSupplierId = null;
    this.lastQuote = null;
    this.quotes = [];
  }

  enter(payload) {
    if (payload && TABS.some(row => row[0] === payload.tab)) this.tab = payload.tab;
    this.buttons = [];
  }

  exit() { this.buttons = []; }
  update() {}

  addButton(id,x,y,w,h) { this.buttons.push({id,x,y,w,h}); }
  hit(x,y) {
    for (let i=this.buttons.length-1;i>=0;i--) {
      const b=this.buttons[i];
      if (x>=b.x && x<=b.x+b.w && y>=b.y && y<=b.y+b.h) return b;
    }
    return null;
  }

  currentShop() { return operations.getCurrentShop(); }
  currentDay(shop) {
    const rt = shop ? operations.getRuntime(shop.id) : null;
    return rt ? Math.max(1,num(rt.day)) : 1;
  }

  render(ctx) {
    const h = opUi.viewHeight();
    this.buttons = [];
    ctx.save();
    opUi.background(ctx,h);
    opUi.header(ctx,'经营中心','营销获客 · 会员沉淀 · 主动采购 · 品牌成长');

    const shop=this.currentShop();
    if (!shop) {
      ui.card(ctx,18,112,354,150,{radius:16,fill:'#FFFDF8',stroke:'#DDD4C7'});
      ui.text(ctx,'还没有可经营门店',195,162,14,'#173D54','800','center');
      ui.text(ctx,'签约首店并进入试营业后开放经营中心',195,198,7.4,'#748791','600','center');
      ctx.restore();
      return;
    }

    const tabW=86;
    TABS.forEach((row,index)=>{
      const x=14+index*90;
      opUi.pill(ctx,row[1],x,94,tabW,this.tab===row[0]);
      this.addButton('tab:'+row[0],x,90,tabW,39);
    });

    if (this.tab==='marketing') this.renderMarketing(ctx,shop,h);
    else if (this.tab==='members') this.renderMembers(ctx,shop,h);
    else if (this.tab==='procurement') this.renderProcurement(ctx,shop,h);
    else this.renderGrowth(ctx,shop,h);

    ctx.restore();
  }

  summaryCard(ctx,title,value,note,y) {
    ui.card(ctx,14,y,362,60,{radius:13,fill:'#FFFDF8',stroke:'#DDD4C7',shadow:false});
    ui.text(ctx,title,28,y+19,7.2,'#758894','700');
    ui.text(ctx,value,28,y+43,12,'#173D54','800');
    if (note) ui.text(ctx,note,352,y+36,6.4,'#6F838E','700','right');
  }

  renderMarketing(ctx,shop,h) {
    const view=operations.marketingMembershipSnapshot(shop.id)||{};
    this.summaryCard(ctx,'营销状态','需求倍率 ×'+num(view.demandMultiplier||1).toFixed(2),'累计投入 '+opUi.money(view.metrics&&view.metrics.marketingSpend),136);

    opUi.pill(ctx,'活动',18,207,76,this.marketingMode==='campaigns');
    opUi.pill(ctx,'渠道',100,207,76,this.marketingMode==='platforms');
    this.addButton('marketing:mode:campaigns',18,202,76,40);
    this.addButton('marketing:mode:platforms',100,202,76,40);

    if (this.marketingMode==='platforms') {
      const defs=operations.marketingPlatformCatalog();
      const state=view.platforms||{};
      let y=252;
      defs.slice(0,8).forEach(def=>{
        const enabled=!!(state[def.id]&&state[def.id].enabled);
        ui.card(ctx,14,y,362,45,{radius:10,fill:'#FFFDF8',stroke:'#E2DBD1',shadow:false});
        ui.text(ctx,def.name,28,y+16,7.7,'#173D54','800');
        ui.text(ctx,'费率 '+Math.round(num(def.feeRate)*100)+'% · 获客 '+num(def.acquisition).toFixed(2),28,y+33,6.2,'#748791','600');
        opUi.button(ctx,enabled?'已开启':'开启',294,y+7,68,30,enabled?null:'gold');
        this.addButton('platform:'+def.id,294,y+5,72,34);
        y+=51;
      });
      return;
    }

    ui.text(ctx,'预算',194,223,6.6,'#748791','700');
    opUi.button(ctx,'-',224,207,34,30,null);
    opUi.button(ctx,opUi.money(this.campaignBudget),262,207,72,30,null);
    opUi.button(ctx,'+',338,207,34,30,null);
    this.addButton('budget:-',224,203,34,38);
    this.addButton('budget:+',338,203,34,38);

    const catalog=operations.marketingCatalog();
    const pageSize=5;
    const pages=Math.max(1,Math.ceil(catalog.length/pageSize));
    this.campaignPage=Math.max(0,Math.min(pages-1,this.campaignPage));
    const rows=catalog.slice(this.campaignPage*pageSize,this.campaignPage*pageSize+pageSize);
    let y=252;
    rows.forEach(row=>{
      ui.card(ctx,14,y,362,53,{radius:11,fill:'#FFFDF8',stroke:'#DDD4C7',shadow:false});
      ui.text(ctx,row.name,28,y+18,8,'#173D54','800');
      ui.text(ctx,'需求提升 +'+Math.round(num(row.demandLift)*100)+'% · 7天',28,y+38,6.4,'#718590','600');
      opUi.button(ctx,'启动',303,y+10,59,31,'gold');
      this.addButton('campaign:'+row.id,300,y+7,66,37);
      y+=60;
    });
    opUi.button(ctx,'上一页',18,Math.min(h-105,565),76,34,null);
    opUi.button(ctx,(this.campaignPage+1)+' / '+pages,102,Math.min(h-105,565),88,34,null);
    opUi.button(ctx,'下一页',198,Math.min(h-105,565),76,34,null);
    this.addButton('campaign:prev',18,Math.min(h-109,561),76,42);
    this.addButton('campaign:next',198,Math.min(h-109,561),76,42);
  }

  renderMembers(ctx,shop,h) {
    const view=operations.marketingMembershipSnapshot(shop.id)||{};
    const state=marketingState.ensureShop(shop.id);
    const members=state.members||{};
    const customers=operations.customerRows(shop.id,{}).slice(0,6);
    this.summaryCard(ctx,'会员资产',String(num(view.memberCount))+' 人','会员营收 '+opUi.money(view.metrics&&view.metrics.memberRevenue),136);

    opUi.button(ctx,'生成顾客样本',250,207,126,34,'gold');
    this.addButton('member:generate',248,203,130,42);
    ui.text(ctx,'真实顾客档案',18,225,7.1,'#173D54','800');

    let y=252;
    if (!customers.length) {
      ui.text(ctx,'当前还没有顾客档案，可先生成样本或正常营业积累顾客。',195,320,7.2,'#748791','600','center');
      return;
    }

    customers.forEach(customer=>{
      const member=members[customer.id];
      const segment=customer.segment&&customer.segment.name||customer.name||'普通顾客';
      ui.card(ctx,14,y,362,55,{radius:11,fill:'#FFFDF8',stroke:'#DDD4C7',shadow:false});
      ui.text(ctx,segment+' · '+shortId(customer.id),28,y+18,7.7,'#173D54','800');
      const detail=member
        ? ('等级 '+member.tierId+' · 消费 '+opUi.money(member.spend)+' · 积分 '+Math.floor(num(member.points)))
        : ('到店 '+num(customer.metrics&&customer.metrics.visits)+' 次 · 满意 '+(customer.metrics&&customer.metrics.avgSatisfaction==null?'--':num(customer.metrics.avgSatisfaction).toFixed(0)));
      ui.text(ctx,detail,28,y+39,6.2,'#718590','600');
      if (!member) {
        opUi.button(ctx,'加入',304,y+11,58,31,'gold');
        this.addButton('member:join:'+customer.id,301,y+8,65,37);
      } else if (num(member.points)>=100) {
        opUi.button(ctx,'兑100',298,y+11,64,31,null);
        this.addButton('member:redeem:'+customer.id,295,y+8,71,37);
      } else {
        ui.text(ctx,'已入会',350,y+29,6.6,'#248B63','800','right');
      }
      y+=62;
    });
  }

  procurementContext(shop) {
    const inventory=operations.inventoryRows(shop.id);
    if (!this.selectedIngredientId && inventory.length) this.selectedIngredientId=inventory[0].ingredientId;
    const selected=inventory.find(row=>row.ingredientId===this.selectedIngredientId)||inventory[0]||null;
    if (selected && this.selectedIngredientId!==selected.ingredientId) this.selectedIngredientId=selected.ingredientId;
    return {inventory,selected};
  }

  renderProcurement(ctx,shop,h) {
    const rt=operations.getRuntime(shop.id);
    const ctxData=this.procurementContext(shop);
    const selected=ctxData.selected;
    this.summaryCard(ctx,'采购工作台',selected?selected.name:'暂无菜单食材',selected?('库存 '+opUi.kg(selected.haveGrams)+' / 目标 '+opUi.kg(selected.targetGrams)):'请先配置菜单',136);

    opUi.pill(ctx,'市场',18,207,76,this.procurementMode==='market');
    opUi.pill(ctx,'采购单',100,207,90,this.procurementMode==='orders');
    this.addButton('proc:mode:market',18,202,76,40);
    this.addButton('proc:mode:orders',100,202,90,40);

    if (this.procurementMode==='orders') {
      const orders=((rt&&rt.procurement&&rt.procurement.purchaseOrders)||[]).slice().reverse().slice(0,7);
      let y=252;
      if (!orders.length) {
        ui.text(ctx,'暂无采购单',195,320,10,'#748791','700','center');
        return;
      }
      orders.forEach(po=>{
        ui.card(ctx,14,y,362,55,{radius:11,fill:'#FFFDF8',stroke:'#DDD4C7',shadow:false});
        ui.text(ctx,po.ingredientName||po.ingredientId,28,y+18,7.8,'#173D54','800');
        ui.text(ctx,num(po.qtyKg).toFixed(1)+'kg · '+opUi.money(po.total)+' · 到货日 '+num(po.expectedDay),28,y+39,6.2,'#718590','600');
        if (!['received','cancelled'].includes(po.status)) {
          opUi.button(ctx,'收货',304,y+11,58,31,'gold');
          this.addButton('po:receive:'+po.id,301,y+8,65,37);
        } else {
          ui.text(ctx,po.status==='received'?'已收货':'已取消',350,y+29,6.5,po.status==='received'?'#248B63':'#B44D3F','800','right');
        }
        y+=62;
      });
      return;
    }

    if (!selected) {
      ui.text(ctx,'当前菜单没有形成食材需求。',195,310,8,'#748791','700','center');
      return;
    }

    const items=ctxData.inventory.slice(0,4);
    let chipX=18;
    items.forEach(row=>{
      const active=row.ingredientId===selected.ingredientId;
      opUi.pill(ctx,row.name.slice(0,5),chipX,248,82,active);
      this.addButton('ingredient:'+row.ingredientId,chipX,244,82,38);
      chipX+=88;
    });

    ui.text(ctx,'采购量 '+this.qtyKg.toFixed(0)+'kg',20,303,7,'#173D54','800');
    opUi.button(ctx,'-5',110,286,48,32,null);
    opUi.button(ctx,'+5',164,286,48,32,null);
    opUi.button(ctx,'比价',224,286,68,32,'gold');
    this.addButton('qty:-',108,282,52,40);
    this.addButton('qty:+',162,282,52,40);
    this.addButton('proc:compare',222,282,72,40);

    const supplierRows=this.quotes.length
      ? this.quotes.slice(0,4)
      : operations.supplierCatalog(shop.id,{ingredientId:selected.ingredientId}).slice(0,4);
    let y=332;
    supplierRows.forEach(row=>{
      const supplierId=row.supplierId||row.id;
      const active=supplierId===this.selectedSupplierId;
      ui.card(ctx,14,y,362,54,{radius:11,fill:active?'#FFF6D8':'#FFFDF8',stroke:active?'#E2B843':'#DDD4C7',shadow:false});
      ui.text(ctx,row.supplierName||row.name||supplierId,28,y+17,7.5,'#173D54','800');
      const detail=row.total!=null
        ? (opUi.money(row.total)+' · ¥'+num(row.unitPrice).toFixed(2)+'/kg · 品质 '+Math.round(num(row.quality)))
        : ('品质 '+Math.round(num(row.quality))+' · 准时 '+Math.round(num(row.reliability))+' · 关系 '+Math.round(num(row.relationship)));
      ui.text(ctx,detail,28,y+38,6.1,'#718590','600');
      opUi.button(ctx,active?'已选':'选择',306,y+11,56,30,active?'gold':null);
      this.addButton('supplier:'+supplierId,303,y+8,63,36);
      y+=61;
    });

    if (this.lastQuote) {
      ui.text(ctx,'最近议价：'+opUi.money(this.lastQuote.total)+' · 单价 ¥'+num(this.lastQuote.unitPrice).toFixed(2),20,Math.min(h-136,592),6.4,'#248B63','800');
    }
    opUi.button(ctx,'议价',208,Math.min(h-112,615),76,36,null);
    opUi.button(ctx,'下采购单',292,Math.min(h-112,615),84,36,'gold');
    this.addButton('proc:negotiate',206,Math.min(h-116,611),80,44);
    this.addButton('proc:order',290,Math.min(h-116,611),88,44);
  }

  progressContext(shop) {
    const rt=operations.getRuntime(shop.id);
    const growth=operations.growthSnapshot(shop.id)||{};
    const member=operations.marketingMembershipSnapshot(shop.id)||{};
    const portfolio=operations.brandPortfolioSnapshot()||{};
    return {
      day:rt?num(rt.day):1,
      history:operations.operatingDayHistory(shop.id,120),
      memberCount:num(member.memberCount),
      brandLevel:num(growth.brand&&growth.brand.level)||1,
      storeCount:num(portfolio.storeCount)||1
    };
  }

  renderGrowth(ctx,shop,h) {
    const growth=operations.growthSnapshot(shop.id)||{};
    const portfolio=operations.brandPortfolioSnapshot()||{};
    const pctx=this.progressContext(shop);
    const progress=progressSystem.overview(shop.id,pctx);
    this.summaryCard(ctx,'品牌成长','Lv.'+num(growth.brand&&growth.brand.level)+' · '+(growth.brand&&growth.brand.name||'起步品牌'),'管理点 '+progress.managementPoints+' · 成就点 '+num(growth.achievementPoints),136);

    ui.text(ctx,'本周目标',18,223,7.4,'#173D54','800');
    let y=244;
    progress.weekly.forEach(row=>{
      ui.card(ctx,14,y,362,48,{radius:10,fill:'#FFFDF8',stroke:'#DDD4C7',shadow:false});
      ui.text(ctx,row.name,28,y+17,7.4,'#173D54','800');
      ui.text(ctx,Math.min(row.actual,row.target).toFixed(row.metric==='weeklyRevenue'?0:0)+' / '+row.target+' · +'+row.points+'管理点',28,y+36,6.1,row.completed?'#248B63':'#718590','700');
      if (row.completed && !row.claimed) {
        opUi.button(ctx,'领取',306,y+9,56,30,'gold');
        this.addButton('weekly:claim:'+row.id,303,y+6,63,36);
      } else {
        ui.text(ctx,row.claimed?'已领取':(row.completed?'完成':'进行中'),350,y+26,6.2,row.claimed?'#248B63':'#718590','800','right');
      }
      y+=54;
    });

    ui.text(ctx,'长期里程碑',18,y+16,7.4,'#173D54','800');
    y+=30;
    progress.milestones.filter(row=>!row.claimed).sort((a,b)=>(b.completed?1:0)-(a.completed?1:0)||((a.actual/a.target)-(b.actual/b.target))*-1).slice(0,5).forEach(row=>{
      ui.card(ctx,14,y,362,46,{radius:10,fill:'#FFFDF8',stroke:'#DDD4C7',shadow:false});
      ui.text(ctx,row.name,28,y+16,7.2,'#173D54','800');
      ui.text(ctx,Math.min(row.actual,row.target)+' / '+row.target+' · +'+row.points+'管理点',28,y+34,6.0,row.completed?'#248B63':'#718590','700');
      if (row.completed) {
        opUi.button(ctx,'领取',306,y+8,56,29,'gold');
        this.addButton('milestone:claim:'+row.id,303,y+5,63,36);
      }
      y+=52;
    });

    ui.text(ctx,'门店 '+num(portfolio.storeCount)+' / '+num(portfolio.eligibility&&portfolio.eligibility.storeCap)+' · 已解锁 '+((growth.unlockedFeatures||[]).length)+' 项功能',18,Math.min(h-90,y+8),6.2,'#748791','700');
  }

  handleTap(x,y) {
    const target=this.hit(x,y);
    if (!target) return false;
    const shop=this.currentShop();

    if (target.id.startsWith('tab:')) { this.tab=target.id.slice(4); return true; }
    if (!shop) return false;

    if (target.id.startsWith('marketing:mode:')) { this.marketingMode=target.id.split(':').pop(); return true; }
    if (target.id==='budget:-') { this.campaignBudget=Math.max(500,this.campaignBudget-500); return true; }
    if (target.id==='budget:+') { this.campaignBudget=Math.min(20000,this.campaignBudget+500); return true; }
    if (target.id==='campaign:prev') { this.campaignPage=Math.max(0,this.campaignPage-1); return true; }
    if (target.id==='campaign:next') { this.campaignPage+=1; return true; }
    if (target.id.startsWith('campaign:') && !['campaign:prev','campaign:next'].includes(target.id)) {
      const id=target.id.slice('campaign:'.length);
      const result=operations.startMarketingCampaign(shop.id,id,this.campaignBudget,7,{});
      saveSystem.save();
      opUi.toast(result&&result.ok?'营销活动已启动':(result&&result.reason||'启动失败'));
      return true;
    }
    if (target.id.startsWith('platform:')) {
      const id=target.id.slice('platform:'.length);
      const view=operations.marketingMembershipSnapshot(shop.id)||{};
      const enabled=!!(view.platforms&&view.platforms[id]&&view.platforms[id].enabled);
      const result=operations.configureMarketingPlatform(shop.id,id,{enabled:!enabled});
      saveSystem.save();
      opUi.toast(result&&result.ok?(!enabled?'渠道已开启':'渠道已关闭'):(result&&result.reason||'操作失败'));
      return true;
    }

    if (target.id==='member:generate') {
      const result=operations.generateCustomer(shop.id,{districtId:shop.districtId});
      saveSystem.save();
      opUi.toast(result&&result.ok?'已生成顾客档案':'生成失败');
      return true;
    }
    if (target.id.startsWith('member:join:')) {
      const id=target.id.slice('member:join:'.length);
      const result=operations.enrollMember(shop.id,id,{day:this.currentDay(shop)});
      saveSystem.save();
      opUi.toast(result&&result.ok?'顾客已加入会员':(result&&result.reason||'入会失败'));
      return true;
    }
    if (target.id.startsWith('member:redeem:')) {
      const id=target.id.slice('member:redeem:'.length);
      const result=operations.redeemMemberPoints(shop.id,id,100);
      saveSystem.save();
      opUi.toast(result&&result.ok?'已兑换100积分':(result&&result.reason||'兑换失败'));
      return true;
    }

    if (target.id.startsWith('proc:mode:')) { this.procurementMode=target.id.split(':').pop(); return true; }
    if (target.id.startsWith('ingredient:')) {
      this.selectedIngredientId=target.id.slice('ingredient:'.length);
      this.selectedSupplierId=null; this.lastQuote=null; this.quotes=[]; return true;
    }
    if (target.id==='qty:-') { this.qtyKg=Math.max(5,this.qtyKg-5); return true; }
    if (target.id==='qty:+') { this.qtyKg=Math.min(200,this.qtyKg+5); return true; }
    if (target.id==='proc:compare') {
      if (!this.selectedIngredientId) return true;
      this.quotes=operations.compareSupplierQuotes(shop.id,this.selectedIngredientId,this.qtyKg,{});
      this.selectedSupplierId=this.quotes[0]&&this.quotes[0].supplierId||null;
      this.lastQuote=this.quotes[0]||null;
      opUi.toast(this.quotes.length?'已完成比价，共'+this.quotes.length+'家有效报价':'当前数量未达到供应商起订量');
      return true;
    }
    if (target.id.startsWith('supplier:')) {
      this.selectedSupplierId=target.id.slice('supplier:'.length); return true;
    }
    if (target.id==='proc:negotiate') {
      if (!this.selectedIngredientId || !this.selectedSupplierId) { opUi.toast('请先选择供应商'); return true; }
      const result=operations.negotiateSupplierQuote(shop.id,this.selectedSupplierId,this.selectedIngredientId,this.qtyKg,{buyerPower:55,rounds:2});
      this.lastQuote=result&&result.ok?result:null;
      opUi.toast(result&&result.ok?'议价完成：'+opUi.money(result.total):(result&&result.reason||'议价失败'));
      return true;
    }
    if (target.id==='proc:order') {
      if (!this.selectedIngredientId || !this.selectedSupplierId) { opUi.toast('请先选择供应商'); return true; }
      const result=operations.createManualPurchaseOrder(shop.id,this.selectedSupplierId,this.selectedIngredientId,this.qtyKg,{negotiate:true,buyerPower:55,rounds:2});
      saveSystem.save();
      opUi.toast(result&&result.ok?'采购单已创建':(result&&result.reason||'下单失败'));
      if (result&&result.ok) this.procurementMode='orders';
      return true;
    }
    if (target.id.startsWith('po:receive:')) {
      const id=target.id.slice('po:receive:'.length);
      const result=operations.receiveManualPurchaseOrder(shop.id,id,{});
      saveSystem.save();
      opUi.toast(result&&result.ok?'收货完成':(result&&result.reason||'暂不能收货'));
      return true;
    }

    if (target.id.startsWith('weekly:claim:')) {
      const id=target.id.slice('weekly:claim:'.length);
      const result=progressSystem.claimWeekly(shop.id,id,this.progressContext(shop));
      saveSystem.save();
      opUi.toast(result.ok?'领取 '+result.points+' 管理点':result.reason);
      return true;
    }
    if (target.id.startsWith('milestone:claim:')) {
      const id=target.id.slice('milestone:claim:'.length);
      const result=progressSystem.claimMilestone(id,this.progressContext(shop));
      saveSystem.save();
      opUi.toast(result.ok?'领取 '+result.points+' 管理点':result.reason);
      return true;
    }

    return false;
  }
}

module.exports = new AdvancedManagementScene();
