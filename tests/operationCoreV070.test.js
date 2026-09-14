'use strict';

const assert=require('assert');
const pack=require('../src/supplier/supplierPackV10.js');
const supplier=require('../src/supplier/supplierEngineV10.js');
const procurement=require('../src/supplier/procurementEngineV10.js');
const inventory=require('../src/inventory/inventoryEngineV10.js');
const food=require('../src/food/foodPackV10.js');
const menu=require('../src/food/menuEngineV10.js');
const order=require('../src/order/orderEngineV10.js');
const kitchen=require('../src/kitchen/kitchenEngineV10.js');
const service=require('../src/service/serviceEngineV10.js');
const settlement=require('../src/operations/settlementEngineV10.js');
const retention=require('../src/operations/retentionEngineV10.js');
const staff=require('../src/operations/staffOperationsEngineV10.js');
const delivery=require('../src/operations/deliveryEngineV10.js');
const marketing=require('../src/operations/marketingEngineV10.js');
const brand=require('../src/operations/brandGrowthEngineV10.js');
const events=require('../src/operations/restaurantEventEngineV10.js');
const runtimeEngine=require('../src/operations/restaurantRuntimeV10.js');

assert.equal(pack.SUPPLIER_CATEGORIES.length,18,'供应商一级类型必须18类');
assert.ok(pack.SUPPLIER_ARCHETYPES.length>=120,'供应商原型必须120+');
assert.equal(pack.SUPPLIER_ARCHETYPES.length,126,'18类×7规模应生成126个供应商原型');
assert.equal(pack.COOPERATION_MODES.length,22);
assert.equal(pack.PAYMENT_TERMS.length,18);
assert.equal(pack.DELIVERY_MODES.length,20);
assert.equal(pack.QUOTE_STRATEGIES.length,30);
assert.equal(pack.NEGOTIATION_STYLES.length,24);
assert.equal(pack.SUPPLY_RISKS.length,36);
assert.equal(pack.RELATIONSHIP_EVENTS.length,30);
assert.equal(pack.CONTRACT_TYPES.length,16);

const network=supplier.createSupplierNetwork('test-suppliers');
assert.equal(network.length,126);
const ingredient=food.INGREDIENTS[0];
const quotes=supplier.compareQuotes(network,ingredient.id,25,{day:1});
assert.ok(quotes.length>0,'现有食材必须能获得真实供应商报价');

// 自动补货允许需求低于供应商MOQ：采购层自动抬到MOQ，而不是把整条补货链判死。
const tinyQuote=procurement.bestQuote(network,ingredient.id,2,{day:1});
assert.ok(tinyQuote,'低于MOQ的补货需求也必须找到可执行报价');
assert.ok(tinyQuote.qtyKg>=tinyQuote.requestedKg,'执行采购量不能低于真实补货需求');
assert.equal(tinyQuote.moqAdjusted,true,'低于MOQ时必须标记为MOQ调整');

const inv=inventory.createInventory({day:1});
const ps=procurement.createProcurementState();
const po=procurement.createPurchaseOrder(ps,quotes[0],{day:1});
assert.ok(po.ok);
const received=procurement.receivePurchaseOrder(ps,po.po.id,inv,{day:1});
assert.ok(received.ok);
assert.ok(inventory.availableGrams(inv,ingredient.id)>0);

const m=menu.createMenuItem('dish_001',{listPrice:28});
const o=order.createOrder({shopId:'shop1',customerId:'c1',partySize:1});
assert.ok(order.addItem(o,m,1).ok);
assert.ok(order.transition(o,'submitted').ok);

const room=service.createDiningRoom();
service.enqueue(room,{id:'party1',partySize:2,queuedMinute:10});
assert.ok(service.seatNext(room,12).ok);

const ledger=settlement.createLedger();
assert.equal(ledger.orders,0);
const d=delivery.createDelivery(o,{distanceKm:2.5,platformId:'platform_a'});
assert.ok(d.etaMinutes>0);
assert.equal(marketing.CAMPAIGN_TYPES.length,24);
assert.equal(brand.LEVELS.length,20);
assert.equal(events.EVENT_TEMPLATES.length,60);

const staffState=staff.createStaffState();
staffState.employees.push({personId:'p1',name:'测试厨师',roleId:'chef',wage:6000,skill:70,energy:100,stress:20,satisfaction:70,active:true});
staff.planShift(staffState,1,[{personId:'p1',hours:8}]);
const shift=staff.operateShift(staffState,1,{absenceRate:0});
assert.equal(shift.active,1);

const runtime=runtimeEngine.createRuntime({seed:'end-to-end',recipeIds:['dish_001','dish_002','dish_046'],day:1});
const boot=runtimeEngine.bootstrapInventory(runtime,3);
assert.ok(boot.orders.length>0,'运行时必须能自动采购并入库');
const profile=runtimeEngine.customerProfile(runtime,{districtId:'university',segmentId:'student_budget'});
const visit=runtimeEngine.simulateVisit(runtime,profile,{hour:12,staffCoverage:1});
assert.ok(visit.ok,'顾客→菜单→订单→厨房→库存→结算→评价必须完整跑通');
assert.ok(visit.settlement.revenue>0);
assert.ok(runtime.ledger.orders===1);
const close=runtimeEngine.closeDay(runtime);
assert.ok(close.financial.revenue>0);

console.log('V0.7.0 restaurant operation core pack tests passed');
