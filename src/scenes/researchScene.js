'use strict';

const saveSystem=require('../core/saveSystem.js');
const operations=require('../operations/operationsStoreV080.js');
const ui=require('../ui/premiumUi.js');
const opUi=require('../ui/operationsUiV080.js');
const ratingSystem=require('../rating/ratingSystemV104.js');
const ratingUi=require('../ui/ratingWidgetsV104.js');

class ResearchScene{
  constructor(){
    this.id='research';
    this.buttons=[];
    this.mode='menu';
    this.page=0;
    this.selectedId=null;
    this.candidateId=null;
    this.libraryId=null;
    this.message='';
  }

  enter(){
    const shop=operations.getCurrentShop();
    if(!shop)return;
    const runtime=operations.getRuntime(shop.id);
    if(runtime&&runtime.menu&&runtime.menu.length&&!this.selectedId)this.selectedId=runtime.menu[0].id;
  }

  exit(){this.buttons=[];}
  update(){}
  addButton(id,x,y,w,h){this.buttons.push({id,x,y,w,h});}
  hit(x,y){
    for(let i=this.buttons.length-1;i>=0;i--){
      const b=this.buttons[i];
      if(x>=b.x&&x<=b.x+b.w&&y>=b.y&&y<=b.y+b.h)return b;
    }
    return null;
  }

  renderTabs(ctx){
    const tabs=[['menu','当前菜单'],['lab','菜品研发'],['library','配方库'],['signature','招牌菜']];
    const x0=14,y=92,w=84,gap=7;
    tabs.forEach((tab,i)=>{
      opUi.button(ctx,tab[1],x0+i*(w+gap),y,w,30,this.mode===tab[0]?'gold':null);
      this.addButton('tab:'+tab[0],x0+i*(w+gap),y,w,30);
    });
  }

  renderEmpty(ctx){
    ui.card(ctx,18,142,354,150,{radius:16,fill:'#FFFDF8',stroke:'#DDD4C7'});
    ui.text(ctx,'还没有门店',195,190,16,'#153A51','800','center');
    ui.text(ctx,'签约门店后即可配置菜单与研发菜品',195,228,8,'#748791','600','center');
  }

  renderMessage(ctx,h){
    if(!this.message)return;
    ui.card(ctx,30,Math.min(h-77,646),330,34,{radius:11,fill:'#173D54',stroke:false,shadow:false});
    ui.text(ctx,this.message,195,Math.min(h-60,663),7.2,'#FFFFFF','700','center');
  }

  renderMenu(ctx,shop,runtime,h){
    const menu=runtime.menu||[];
    const activeCount=menu.filter(item=>item.active!==false).length;
    const customCount=menu.filter(item=>item.customDish).length;
    ui.card(ctx,14,132,362,58,{radius:14,fill:'#FFFDF8',stroke:'#DDD4C7',shadow:false});
    ui.text(ctx,shop.name||'当前门店',28,151,10,'#163D55','800');
    ui.text(ctx,`菜单 ${menu.length} 道｜上架 ${activeCount} 道｜自研 ${customCount} 道`,28,175,7.4,'#728792','600');

    const pageSize=4;
    const pageCount=Math.max(1,Math.ceil(menu.length/pageSize));
    this.page=Math.max(0,Math.min(this.page,pageCount-1));
    const rows=menu.slice(this.page*pageSize,this.page*pageSize+pageSize);
    let y=200;
    for(const item of rows){
      const selected=item.id===this.selectedId;
      const cost=operations.estimateMenuItemCost(shop.id,item);
      const margin=item.listPrice>0?Math.round((item.listPrice-cost)/item.listPrice*100):0;
      const craftable=operations.menuItemAvailability(shop.id,item);
      const dishRating=ratingSystem.evaluateDish(item,{cost,craftable,shop,runtime});
      ui.card(ctx,14,y,362,70,{radius:13,fill:selected?'#FFF7D7':'#FFFDF8',stroke:selected?'#E4B838':'#DDD4C7',shadow:false});
      ui.text(ctx,item.name,28,y+18,9,'#173D54','800');
      if(item.featured)ui.text(ctx,'招牌',151,y+18,7.2,'#D99C15','800');
      if(item.customDish)ui.text(ctx,item.customDish.qualityName||'自研',190,y+18,7.2,'#8C5EAF','800');
      ratingUi.badge(ctx,236,y+7,52,22,dishRating.grade,dishRating.score);
      ui.text(ctx,opUi.money(item.listPrice),352,y+18,9.4,'#D29A18','800','right');
      ui.text(ctx,`成本 ${opUi.money(cost)}｜毛利 ${margin}%`,28,y+44,7.2,'#718590','600');
      ui.text(ctx,item.active===false?'停售':craftable>0?`可售 ${craftable}份`:'缺货',352,y+45,7.2,item.active===false?'#A36C61':craftable>0?'#258B64':'#D0604B','800','right');
      this.addButton('select:'+item.id,14,y,362,70);
      y+=78;
    }

    const controlsY=Math.min(h-132,520);
    const selected=menu.find(item=>item.id===this.selectedId)||menu[0];
    if(selected){
      opUi.button(ctx,selected.active===false?'重新上架':'暂停销售',14,controlsY,82,36);
      opUi.button(ctx,selected.featured?'已是招牌':'设为招牌',103,controlsY,82,36,selected.featured?'gold':null);
      opUi.button(ctx,'降1元',192,controlsY,82,36);
      opUi.button(ctx,'涨1元',281,controlsY,95,36);
      this.addButton('toggle',14,controlsY,82,36);
      this.addButton('feature',103,controlsY,82,36);
      this.addButton('price:-1',192,controlsY,82,36);
      this.addButton('price:1',281,controlsY,95,36);
    }
    const pagingY=controlsY+45;
    opUi.button(ctx,'上一页',94,pagingY,82,32);
    ui.text(ctx,`${this.page+1}/${pageCount}`,195,pagingY+16,7.5,'#657C89','700','center');
    opUi.button(ctx,'下一页',214,pagingY,82,32);
    this.addButton('prev',94,pagingY,82,32);
    this.addButton('next',214,pagingY,82,32);
  }

  renderLab(ctx,shop,h){
    const overview=operations.getCustomDishLabOverview(shop.id);
    const active=overview.activeProject;
    ui.card(ctx,14,132,362,64,{radius:14,fill:'#FFFDF8',stroke:'#DDD4C7',shadow:false});
    ui.text(ctx,'自主研发厨房',28,151,10,'#163D55','800');
    ui.text(ctx,`主厨研发力 ${Math.round(overview.chefSkill)}｜配方库 ${overview.library.length} 道｜累计投入 ${opUi.money(overview.metrics.spent)}`,28,177,7.2,'#728792','600');

    if(active){
      const c=active.candidate;
      const pct=Math.round(overview.progress*100);
      const hours=Math.ceil(overview.remainingMinutes/60);
      ui.card(ctx,14,208,362,174,{radius:15,fill:'#FFF7D7',stroke:'#E4B838',shadow:false});
      ui.text(ctx,'研发进行中',28,230,8,'#B27A12','800');
      ui.text(ctx,c.name,28,260,12,'#173D54','800');
      ui.text(ctx,`基础：${c.baseName}｜${c.methodName}｜${c.flavorName}`,28,289,7.3,'#657C89','600');
      ui.text(ctx,`潜力 ${c.potential.low}-${c.potential.high}｜创新 ${Math.round(c.innovation)}｜难度 ${Math.round(c.difficulty)}`,28,316,7.3,'#657C89','600');
      ui.text(ctx,`进度 ${pct}%｜预计剩余 ${hours} 小时`,28,344,8.1,'#258B64','800');
      const barX=28,barY=362,barW=330;
      ctx.fillStyle='#E9DFC9';ctx.fillRect(barX,barY,barW,8);
      ctx.fillStyle='#36A66C';ctx.fillRect(barX,barY,barW*overview.progress,8);
      ui.text(ctx,'时间推进后自动完成，完成品会进入配方库',28,410,7.2,'#728792','600');
      return;
    }

    const candidates=overview.candidates||[];
    if(!this.candidateId&&candidates[0])this.candidateId=candidates[0].id;
    let y=208;
    for(const c of candidates){
      const selected=c.id===this.candidateId;
      ui.card(ctx,14,y,362,88,{radius:13,fill:selected?'#FFF7D7':'#FFFDF8',stroke:selected?'#E4B838':'#DDD4C7',shadow:false});
      ui.text(ctx,c.name,28,y+18,9.1,'#173D54','800');
      ui.text(ctx,`潜力 ${c.potential.low}-${c.potential.high}｜创新 ${Math.round(c.innovation)}｜接受度 ${Math.round(c.acceptance)}`,28,y+43,7.1,'#657C89','600');
      ui.text(ctx,`${c.methodName} · ${c.flavorName}${c.substitution?' · 换料 '+c.substitution.toName:''}`,28,y+67,7.1,'#728792','600');
      ui.text(ctx,`${opUi.money(c.researchCost)} / ${c.researchDays}天`,352,y+18,7.4,'#D29A18','800','right');
      this.addButton('candidate:'+c.id,14,y,362,88);
      y+=96;
    }
    const actionY=Math.min(h-124,504);
    opUi.button(ctx,`换一批 ${opUi.money(overview.refreshCost)}`,14,actionY,170,38);
    opUi.button(ctx,'开始研发',192,actionY,184,38,'gold');
    this.addButton('lab:refresh',14,actionY,170,38);
    this.addButton('lab:start',192,actionY,184,38);
    ui.text(ctx,'候选方案每天自动刷新；换一批会消耗研发经费',195,actionY+55,7.1,'#728792','600','center');
  }

  renderLibrary(ctx,shop,h){
    const overview=operations.getCustomDishLabOverview(shop.id);
    const library=(overview.library||[]).slice().reverse();
    ui.card(ctx,14,132,362,54,{radius:14,fill:'#FFFDF8',stroke:'#DDD4C7',shadow:false});
    ui.text(ctx,`配方库 ${library.length} 道`,28,151,10,'#163D55','800');
    ui.text(ctx,'自研菜可以继续优化，也可以加入当前门店菜单',28,174,7.2,'#728792','600');
    if(!library.length){
      ui.card(ctx,14,202,362,130,{radius:14,fill:'#FFFDF8',stroke:'#DDD4C7',shadow:false});
      ui.text(ctx,'还没有完成的自研菜品',195,246,11,'#173D54','800','center');
      ui.text(ctx,'先到“菜品研发”选择方案开始研发',195,282,7.4,'#728792','600','center');
      return;
    }
    if(!this.libraryId)this.libraryId=library[0].id;
    const pageSize=4;
    const pageCount=Math.max(1,Math.ceil(library.length/pageSize));
    this.page=Math.max(0,Math.min(this.page,pageCount-1));
    const rows=library.slice(this.page*pageSize,this.page*pageSize+pageSize);
    let y=198;
    for(const dish of rows){
      const selected=dish.id===this.libraryId;
      ui.card(ctx,14,y,362,70,{radius:13,fill:selected?'#F6F0FF':'#FFFDF8',stroke:selected?'#A98AC5':'#DDD4C7',shadow:false});
      ui.text(ctx,dish.name,28,y+18,8.9,'#173D54','800');
      ui.text(ctx,`${dish.qualityName} ${Math.round(dish.score)}分｜创新 ${Math.round(dish.innovation)}｜复购 ${Math.round((dish.repeatRate||0)*100)}%`,28,y+44,7.1,'#657C89','600');
      ui.text(ctx,opUi.money(dish.recommendedPrice),352,y+18,8,'#D29A18','800','right');
      this.addButton('library:'+dish.id,14,y,362,70);
      y+=78;
    }
    const actionY=Math.min(h-132,518);
    opUi.button(ctx,'加入菜单',14,actionY,170,36,'gold');
    opUi.button(ctx,'优化口味',192,actionY,184,36);
    this.addButton('library:add',14,actionY,170,36);
    this.addButton('library:improve',192,actionY,184,36);
    const pagingY=actionY+43;
    opUi.button(ctx,'上一页',94,pagingY,82,30);
    ui.text(ctx,`${this.page+1}/${pageCount}`,195,pagingY+15,7.3,'#657C89','700','center');
    opUi.button(ctx,'下一页',214,pagingY,82,30);
    this.addButton('prev',94,pagingY,82,30);
    this.addButton('next',214,pagingY,82,30);
  }

  renderSignature(ctx,shop,runtime){
    const rows=(runtime.menu||[]).filter(item=>item.featured);
    ui.card(ctx,14,132,362,54,{radius:14,fill:'#FFFDF8',stroke:'#DDD4C7',shadow:false});
    ui.text(ctx,`招牌菜 ${rows.length} 道`,28,151,10,'#163D55','800');
    ui.text(ctx,'招牌菜会在顾客选菜时获得额外吸引力',28,174,7.2,'#728792','600');
    if(!rows.length){
      ui.card(ctx,14,202,362,124,{radius:14,fill:'#FFFDF8',stroke:'#DDD4C7',shadow:false});
      ui.text(ctx,'暂未设置招牌菜',195,244,11,'#173D54','800','center');
      ui.text(ctx,'在“当前菜单”选择菜品后点击“设为招牌”',195,280,7.3,'#728792','600','center');
      return;
    }
    let y=200;
    for(const item of rows.slice(0,5)){
      const cost=operations.estimateMenuItemCost(shop.id,item);
      const craftable=operations.menuItemAvailability(shop.id,item);
      const rating=ratingSystem.evaluateDish(item,{cost,craftable,shop,runtime});
      ui.card(ctx,14,y,362,72,{radius:13,fill:'#FFF7D7',stroke:'#E6C566',shadow:false});
      ui.text(ctx,item.name,28,y+19,9.2,'#173D54','800');
      ui.text(ctx,`${item.customDish?item.customDish.qualityName+' · ':''}累计销量 ${Math.round(item.stats&&item.stats.orders||0)}｜评分 ${rating.score}`,28,y+47,7.1,'#657C89','600');
      ratingUi.badge(ctx,299,y+8,52,22,rating.grade,rating.score);
      y+=80;
    }
  }

  render(ctx){
    const h=opUi.viewHeight();
    this.buttons=[];
    ctx.save();
    opUi.background(ctx,h);
    opUi.header(ctx,'菜单','当前菜单 · 自主研发 · 配方库 · 招牌菜');
    this.renderTabs(ctx);
    const shop=operations.getCurrentShop();
    if(!shop){this.renderEmpty(ctx);ctx.restore();return;}
    const runtime=operations.getRuntime(shop.id);
    if(this.mode==='lab')this.renderLab(ctx,shop,h);
    else if(this.mode==='library')this.renderLibrary(ctx,shop,h);
    else if(this.mode==='signature')this.renderSignature(ctx,shop,runtime,h);
    else this.renderMenu(ctx,shop,runtime,h);
    this.renderMessage(ctx,h);
    ctx.restore();
  }

  handleTap(x,y){
    const target=this.hit(x,y);
    if(!target)return false;
    if(target.id.indexOf('tab:')===0){
      this.mode=target.id.slice(4);this.page=0;this.message='';return true;
    }
    if(target.id.indexOf('select:')===0){this.selectedId=target.id.slice(7);return true;}
    if(target.id.indexOf('candidate:')===0){this.candidateId=target.id.slice(10);return true;}
    if(target.id.indexOf('library:')===0&&target.id!=='library:add'&&target.id!=='library:improve'){
      this.libraryId=target.id.slice(8);return true;
    }
    const shop=operations.getCurrentShop();
    if(!shop)return false;
    const runtime=operations.getRuntime(shop.id);
    const selected=runtime.menu.find(item=>item.id===this.selectedId)||runtime.menu[0];

    if(target.id==='toggle'&&selected){operations.setMenuActive(shop.id,selected.id,selected.active===false);saveSystem.save();return true;}
    if(target.id==='feature'&&selected){operations.setMenuFeatured(shop.id,selected.id);saveSystem.save();return true;}
    if(target.id.indexOf('price:')===0&&selected){
      const delta=Number(target.id.split(':')[1])||0;
      operations.adjustMenuPrice(shop.id,selected.id,delta);saveSystem.save();return true;
    }
    if(target.id==='prev'){this.page=Math.max(0,this.page-1);return true;}
    if(target.id==='next'){this.page+=1;return true;}
    if(target.id==='lab:refresh'){
      const result=operations.refreshCustomDishCandidates(shop.id);
      this.candidateId=result.ok&&result.candidates[0]?result.candidates[0].id:this.candidateId;
      this.message=result.ok?'已刷新一批研发方案':result.reason||'刷新失败';
      saveSystem.save();return true;
    }
    if(target.id==='lab:start'){
      const result=operations.startCustomDishResearch(shop.id,this.candidateId);
      this.message=result.ok?'研发已经开始，推进时间即可完成':result.reason||'无法开始研发';
      saveSystem.save();return true;
    }
    if(target.id==='library:add'){
      const result=operations.addCustomDishToMenu(shop.id,this.libraryId,{});
      if(result.ok)this.selectedId=result.item.id;
      this.message=result.ok?'自研菜已经加入当前菜单':result.reason||'加入菜单失败';
      saveSystem.save();return true;
    }
    if(target.id==='library:improve'){
      const result=operations.improveCustomDish(shop.id,this.libraryId,'taste');
      this.message=result.ok?`优化完成，当前 ${result.dish.qualityName} ${Math.round(result.dish.score)}分`:result.reason||'优化失败';
      saveSystem.save();return true;
    }
    return false;
  }
}

module.exports=new ResearchScene();
