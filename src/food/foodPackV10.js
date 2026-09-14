'use strict';

function item(id, name, category, unit, costIndex, shelfDays, usableYield, tags) {
  return { id, name, category, unit, costIndex, shelfDays, usableYield, tags: tags || [] };
}

const INGREDIENT_GROUPS = {
  rice_grain: ['大米','糯米','小米','黑米','玉米碴','燕麦米','高粱米','薏米','荞麦米','藜麦'],
  flour_noodle: ['中筋面粉','高筋面粉','低筋面粉','玉米面','荞麦面','米粉','河粉','红薯粉','土豆粉','碱水面','挂面','乌冬面'],
  pork: ['猪五花','猪里脊','猪前腿','猪后腿','猪排骨','猪蹄','猪肘','猪肚','猪肝','猪大肠','猪肉馅','猪脊骨'],
  beef: ['牛腩','牛里脊','牛腱','牛肋条','肥牛卷','牛肉馅','牛百叶','牛筋','牛骨','牛尾'],
  lamb: ['羊腿肉','羊排','羊肉卷','羊蝎子','羊杂','羊肉馅','羊骨'],
  poultry: ['鸡腿','鸡胸','鸡翅','整鸡','鸡爪','鸡胗','鸭腿','整鸭','鸭胸','鸭血','鹅肉'],
  seafood: ['草鱼','鲈鱼','黑鱼','鲫鱼','带鱼','黄花鱼','三文鱼','虾仁','基围虾','小龙虾','鱿鱼','扇贝','花蛤','生蚝','海带','紫菜'],
  egg_dairy: ['鸡蛋','鸭蛋','鹌鹑蛋','鲜牛奶','淡奶油','黄油','芝士片','马苏里拉','酸奶','炼乳'],
  tofu_soy: ['北豆腐','嫩豆腐','豆腐皮','腐竹','豆干','千张','黄豆','豆浆','豆豉','豆瓣酱'],
  leafy: ['大白菜','娃娃菜','油麦菜','生菜','菠菜','上海青','空心菜','韭菜','芹菜','香菜','小葱','茼蒿'],
  root: ['土豆','红薯','山药','莲藕','白萝卜','胡萝卜','芋头','莴笋','荸荠','竹笋'],
  fruit_veg: ['西红柿','黄瓜','茄子','青椒','红椒','尖椒','南瓜','冬瓜','西葫芦','苦瓜','丝瓜','玉米','四季豆','豇豆','秋葵'],
  mushroom: ['香菇','平菇','杏鲍菇','金针菇','口蘑','木耳','银耳','茶树菇','海鲜菇'],
  aromatics: ['大葱','姜','蒜','洋葱','香葱','香菜根','小米椒','干辣椒','花椒','青花椒','八角','桂皮','香叶','孜然','白胡椒','黑胡椒'],
  seasoning: ['食盐','白砂糖','冰糖','生抽','老抽','蚝油','陈醋','米醋','料酒','芝麻油','辣椒油','花椒油','甜面酱','黄豆酱','番茄酱','沙茶酱','咖喱块','味噌','鱼露','蜂蜜'],
  oil_fat: ['大豆油','菜籽油','花生油','玉米油','猪油','牛油','芝麻酱','花生酱'],
  fruit: ['苹果','梨','香蕉','橙子','柠檬','青柠','葡萄','草莓','芒果','西瓜','哈密瓜','菠萝','桃','蓝莓','百香果'],
  beverage: ['红茶叶','绿茶叶','乌龙茶','茉莉花茶','普洱茶','咖啡豆','可可粉','椰浆','苏打水','矿泉水','蜂蜜柚子酱','珍珠粉圆','红豆','椰果','仙草冻'],
  bakery: ['酵母','泡打粉','吉士粉','糖粉','可可脂','巧克力','椰蓉','葡萄干','肉松','火腿片','培根','面包糠'],
  frozen_processed: ['鱼丸','牛肉丸','蟹棒','午餐肉','火腿肠','培根片','薯条','鸡米花','鸡块','春卷','汤圆','水饺皮','馄饨皮']
};

const CATEGORY_DEFAULTS = {
  rice_grain: ['kg',0.75,180,0.98], flour_noodle:['kg',0.72,120,0.98], pork:['kg',1.25,3,0.82], beef:['kg',2.35,3,0.80], lamb:['kg',2.15,3,0.80],
  poultry:['kg',1.20,3,0.78], seafood:['kg',2.10,2,0.72], egg_dairy:['kg',1.25,7,0.95], tofu_soy:['kg',0.88,4,0.95], leafy:['kg',0.62,2,0.82],
  root:['kg',0.68,14,0.90], fruit_veg:['kg',0.78,5,0.88], mushroom:['kg',1.05,4,0.86], aromatics:['kg',1.10,20,0.90], seasoning:['kg',0.95,240,0.98],
  oil_fat:['L',1.15,240,0.99], fruit:['kg',1.05,5,0.86], beverage:['kg',1.35,180,0.99], bakery:['kg',1.20,120,0.98], frozen_processed:['kg',1.15,90,0.98]
};

const ALLERGEN_MAP = {
  '鲜牛奶':['dairy'],'淡奶油':['dairy'],'黄油':['dairy'],'芝士片':['dairy'],'马苏里拉':['dairy'],'酸奶':['dairy'],'炼乳':['dairy'],
  '鸡蛋':['egg'],'鸭蛋':['egg'],'鹌鹑蛋':['egg'], '黄豆':['soy'],'豆浆':['soy'],'北豆腐':['soy'],'嫩豆腐':['soy'],'豆腐皮':['soy'],'腐竹':['soy'],'豆干':['soy'],'千张':['soy'],
  '虾仁':['shellfish'],'基围虾':['shellfish'],'小龙虾':['shellfish'],'扇贝':['shellfish'],'花蛤':['shellfish'],'生蚝':['shellfish'],'蟹棒':['shellfish'],
  '花生油':['peanut'],'花生酱':['peanut'], '芝麻油':['sesame'],'芝麻酱':['sesame'],
  '中筋面粉':['gluten'],'高筋面粉':['gluten'],'低筋面粉':['gluten'],'碱水面':['gluten'],'挂面':['gluten'],'乌冬面':['gluten'],'面包糠':['gluten'],'水饺皮':['gluten'],'馄饨皮':['gluten']
};

const INGREDIENTS = [];
let seq = 1;
for (const [category, names] of Object.entries(INGREDIENT_GROUPS)) {
  const [unit, baseCost, shelfDays, usableYield] = CATEGORY_DEFAULTS[category];
  names.forEach((name, i) => {
    const costVariance = 0.82 + ((i * 17 + category.length) % 37) / 100;
    INGREDIENTS.push(item(
      'ing_' + String(seq++).padStart(3,'0'), name, category, unit,
      Number((baseCost * costVariance).toFixed(2)),
      Math.max(1, shelfDays - (i % Math.max(1, Math.floor(shelfDays * 0.12 + 1)))),
      Number(Math.max(0.55, usableYield - (i % 4) * 0.015).toFixed(2)),
      ALLERGEN_MAP[name] || []
    ));
  });
}

const INGREDIENT_BY_NAME = Object.fromEntries(INGREDIENTS.map(x => [x.name, x]));

const COOKING_METHODS = [
  ['stir_fry','炒',6,0.94,1.00],['quick_fry','爆',5,0.92,1.05],['deep_fry','炸',8,0.88,1.12],['pan_fry','煎',7,0.93,1.05],['grill','烤',12,0.86,1.12],['roast','烧烤',14,0.84,1.15],
  ['steam','蒸',14,0.97,0.95],['boil','煮',12,0.98,0.92],['blanch','汆',7,0.98,0.91],['braise','红烧',35,0.90,1.08],['stew','炖',55,0.88,1.04],['slow_stew','煨',90,0.86,1.10],
  ['simmer','焖',40,0.91,1.04],['claypot','煲',50,0.89,1.08],['poach','白灼',8,0.98,0.96],['cold_mix','凉拌',6,0.99,0.88],['pickle','腌',120,0.96,0.92],['smoke','熏',80,0.86,1.15],
  ['bake','烘焙',28,0.90,1.12],['toast','烘烤',10,0.92,1.05],['knead','和面',18,0.98,0.96],['ferment','发酵',90,0.98,0.95],['steam_bread','蒸制面点',20,0.96,0.98],['boil_noodle','煮面',7,0.98,0.92],
  ['wok_noodle','炒面',8,0.93,1.02],['rice_cook','焖饭',35,0.99,0.90],['soup','熬汤',80,0.90,1.04],['stock','吊汤',150,0.82,1.10],['hotpot','火锅',10,0.96,1.02],['skewer','串烤',9,0.86,1.12],
  ['shake','摇饮',3,0.99,0.92],['brew_tea','泡茶',4,0.99,0.90],['coffee','萃取咖啡',4,0.99,1.02],['blend','搅打',4,0.99,0.95],['freeze','冷冻',180,0.99,1.00],['assemble','组合装盘',4,0.99,0.88]
].map(([id,name,timeMinutes,yieldFactor,skillFactor])=>({id,name,timeMinutes,yieldFactor,skillFactor}));

const FLAVOR_PROFILES = [
  '咸鲜','鲜香','麻辣','香辣','酸辣','酸甜','糖醋','鱼香','酱香','蒜香','葱香','椒麻','孜然','咖喱','番茄','菌香',
  '清鲜','清淡','浓香','烟熏','焦香','奶香','芝士','甜香','果香','茶香','咖啡','可可','冰爽','醇厚','复合酱香','原味'
].map((name,i)=>({id:'flavor_'+String(i+1).padStart(2,'0'),name}));

const DISH_CATEGORIES = [
  '招牌菜','热菜','凉菜','汤羹','米饭','盖饭','炒饭','面条','粉面','饺馄饨','包点','烧烤','火锅','小吃','早餐','套餐','甜点','烘焙','茶饮','咖啡','果饮','夜宵','儿童餐','轻食'
].map((name,i)=>({id:'dishcat_'+String(i+1).padStart(2,'0'),name}));

const PORTION_SPECS = [
  {id:'mini',name:'小份',portionFactor:0.72,priceFactor:0.78},{id:'single',name:'单人份',portionFactor:1,priceFactor:1},{id:'large',name:'大份',portionFactor:1.35,priceFactor:1.28},
  {id:'share',name:'双人分享',portionFactor:1.85,priceFactor:1.68},{id:'family',name:'家庭份',portionFactor:2.65,priceFactor:2.25},{id:'banquet',name:'宴席份',portionFactor:3.5,priceFactor:2.92}
];

const MENU_STRATEGIES = [
  '极简爆品','少而精','社区家常','学生性价比','白领快餐','商务品质','家庭聚餐','夜宵专营','早餐效率','外卖优先','堂食体验','高毛利小吃',
  '招牌菜引流','低价引流高价加购','套餐驱动','季节限定','区域特色','健康轻食','高端精致','多品类综合','新品轮换','稳定不折腾','网红单品','会员复购'
].map((name,i)=>({id:'menu_strategy_'+String(i+1).padStart(2,'0'),name}));

const DIETARY_TAGS = ['vegetarian','vegan','halal_style','low_salt','low_oil','high_protein','light','spicy','non_spicy','gluten_free_possible','dairy_free_possible','egg_free_possible','kid_friendly','senior_friendly','late_night','quick_meal'];
const ALLERGEN_TAGS = ['gluten','egg','dairy','soy','peanut','sesame','shellfish','fish','tree_nut'];

function ing(name, grams, optional) {
  const found = INGREDIENT_BY_NAME[name];
  if (!found) throw new Error('未知食材: ' + name);
  return { ingredientId: found.id, name, grams, optional: !!optional };
}

function recipe(id,name,category,method,flavor,basePriceIndex,ingredients,tags,prepMinutes,cookMinutes,skill) {
  return { id,name,category,method,flavor,basePriceIndex,ingredients,tags:tags||[],prepMinutes,cookMinutes,skill:skill||35 };
}

const RECIPES = [
  recipe('dish_001','番茄炒蛋','热菜','stir_fry','番茄',0.72,[ing('西红柿',260),ing('鸡蛋',150),ing('小葱',8),ing('食盐',3),ing('白砂糖',4),ing('大豆油',18)],['vegetarian','kid_friendly'],6,6,18),
  recipe('dish_002','青椒肉丝','热菜','stir_fry','咸鲜',0.88,[ing('猪里脊',140),ing('青椒',170),ing('生抽',10),ing('姜',6),ing('蒜',6),ing('大豆油',18)],[],10,6,28),
  recipe('dish_003','鱼香肉丝','热菜','stir_fry','鱼香',0.98,[ing('猪里脊',150),ing('木耳',40),ing('胡萝卜',60),ing('豆瓣酱',18),ing('陈醋',12),ing('白砂糖',12),ing('蒜',8)],['spicy'],14,7,38),
  recipe('dish_004','宫保鸡丁','热菜','stir_fry','香辣',1.02,[ing('鸡腿',190),ing('花生酱',8),ing('干辣椒',8),ing('花椒',3),ing('生抽',12),ing('陈醋',8),ing('白砂糖',9)],['spicy'],14,7,42),
  recipe('dish_005','麻婆豆腐','热菜','stir_fry','麻辣',0.82,[ing('嫩豆腐',320),ing('猪肉馅',70),ing('豆瓣酱',20),ing('花椒',4),ing('干辣椒',5),ing('小葱',8)],['spicy'],8,8,35),
  recipe('dish_006','回锅肉','热菜','stir_fry','酱香',1.08,[ing('猪五花',210),ing('青椒',90),ing('豆瓣酱',20),ing('豆豉',9),ing('大葱',25),ing('姜',6)],['spicy'],14,8,45),
  recipe('dish_007','红烧肉','招牌菜','braise','浓香',1.35,[ing('猪五花',260),ing('冰糖',18),ing('生抽',18),ing('老抽',8),ing('料酒',18),ing('八角',2),ing('姜',10)],[],12,42,52),
  recipe('dish_008','糖醋里脊','热菜','deep_fry','糖醋',1.18,[ing('猪里脊',220),ing('番茄酱',35),ing('白砂糖',25),ing('陈醋',20),ing('中筋面粉',35),ing('大豆油',55)],['kid_friendly'],16,12,48),
  recipe('dish_009','锅包肉','招牌菜','deep_fry','酸甜',1.22,[ing('猪里脊',220),ing('土豆粉',45),ing('白砂糖',26),ing('米醋',25),ing('胡萝卜',25),ing('香菜',8),ing('大豆油',60)],[],18,13,55),
  recipe('dish_010','蒜泥白肉','凉菜','cold_mix','蒜香',1.05,[ing('猪五花',180),ing('蒜',20),ing('辣椒油',12),ing('生抽',12),ing('陈醋',6),ing('黄瓜',80)],['spicy'],12,12,35),
  recipe('dish_011','小炒黄牛肉','招牌菜','quick_fry','香辣',1.48,[ing('牛里脊',190),ing('尖椒',90),ing('小米椒',14),ing('香菜',22),ing('蒜',10),ing('生抽',12)],['spicy','high_protein'],12,6,58),
  recipe('dish_012','黑椒牛柳','热菜','stir_fry','黑胡椒',1.45,[ing('牛里脊',200),ing('洋葱',80),ing('青椒',60),ing('黑胡椒',5),ing('生抽',12),ing('黄油',10)],['high_protein'],14,7,52),
  recipe('dish_013','土豆炖牛腩','热菜','stew','浓香',1.42,[ing('牛腩',240),ing('土豆',180),ing('胡萝卜',80),ing('生抽',16),ing('八角',2),ing('姜',10)],[],12,60,48),
  recipe('dish_014','番茄牛腩','热菜','stew','番茄',1.46,[ing('牛腩',230),ing('西红柿',260),ing('洋葱',70),ing('番茄酱',20),ing('姜',8)],[],12,58,46),
  recipe('dish_015','孜然羊肉','热菜','quick_fry','孜然',1.50,[ing('羊腿肉',210),ing('洋葱',70),ing('孜然',7),ing('干辣椒',6),ing('香菜',15),ing('大豆油',18)],['spicy','high_protein'],12,8,50),
  recipe('dish_016','葱爆羊肉','热菜','quick_fry','葱香',1.48,[ing('羊腿肉',210),ing('大葱',120),ing('生抽',14),ing('料酒',10),ing('白胡椒',2)],['high_protein'],10,7,46),
  recipe('dish_017','辣子鸡','招牌菜','deep_fry','香辣',1.28,[ing('鸡腿',300),ing('干辣椒',30),ing('花椒',8),ing('蒜',12),ing('大豆油',70)],['spicy'],18,15,56),
  recipe('dish_018','黄焖鸡','热菜','simmer','酱香',1.05,[ing('鸡腿',260),ing('香菇',70),ing('青椒',60),ing('生抽',16),ing('姜',8)],[],10,32,38),
  recipe('dish_019','可乐鸡翅','热菜','braise','甜香',1.12,[ing('鸡翅',260),ing('生抽',14),ing('冰糖',10),ing('姜',8),ing('大葱',20)],['kid_friendly'],8,28,32),
  recipe('dish_020','白切鸡','招牌菜','poach','清鲜',1.34,[ing('整鸡',420),ing('姜',14),ing('小葱',18),ing('芝麻油',8),ing('生抽',10)],['high_protein'],15,30,62),
  recipe('dish_021','啤酒鸭风味煲','热菜','claypot','浓香',1.28,[ing('鸭腿',300),ing('土豆',120),ing('青椒',50),ing('生抽',16),ing('八角',2),ing('姜',10)],[],12,48,48),
  recipe('dish_022','酸菜鱼','招牌菜','boil','酸辣',1.55,[ing('黑鱼',420),ing('大白菜',120),ing('干辣椒',8),ing('花椒',4),ing('姜',10),ing('蒜',10)],['spicy'],22,18,68),
  recipe('dish_023','水煮鱼','招牌菜','boil','麻辣',1.58,[ing('草鱼',450),ing('大白菜',140),ing('豆瓣酱',25),ing('干辣椒',18),ing('花椒',7),ing('蒜',12)],['spicy'],24,18,70),
  recipe('dish_024','清蒸鲈鱼','招牌菜','steam','清鲜',1.62,[ing('鲈鱼',500),ing('姜',12),ing('小葱',20),ing('生抽',15),ing('芝麻油',5)],['high_protein','light'],12,14,64),
  recipe('dish_025','红烧带鱼','热菜','braise','酱香',1.30,[ing('带鱼',360),ing('生抽',16),ing('老抽',6),ing('陈醋',8),ing('姜',10),ing('蒜',8)],[],16,28,48),
  recipe('dish_026','蒜蓉粉丝虾','招牌菜','steam','蒜香',1.62,[ing('基围虾',320),ing('红薯粉',70),ing('蒜',28),ing('生抽',14),ing('小葱',10)],['high_protein'],16,12,58),
  recipe('dish_027','油焖大虾','招牌菜','simmer','浓香',1.66,[ing('基围虾',360),ing('番茄酱',20),ing('白砂糖',10),ing('生抽',14),ing('姜',8)],[],16,15,60),
  recipe('dish_028','辣炒花蛤','热菜','quick_fry','香辣',1.20,[ing('花蛤',450),ing('小米椒',12),ing('蒜',14),ing('生抽',12),ing('香菜',12)],['spicy'],14,8,42),
  recipe('dish_029','蒜蓉生蚝','烧烤','grill','蒜香',1.45,[ing('生蚝',420),ing('蒜',30),ing('小米椒',8),ing('生抽',10),ing('小葱',8)],[],14,12,46),
  recipe('dish_030','烤鱿鱼','烧烤','skewer','孜然',1.18,[ing('鱿鱼',280),ing('孜然',7),ing('辣椒油',10),ing('生抽',10)],['spicy'],12,10,40),
  recipe('dish_031','干锅花菜','热菜','stir_fry','香辣',0.88,[ing('大白菜',20),ing('青椒',70),ing('猪五花',80),ing('豆瓣酱',15),ing('蒜',10)],['spicy'],10,8,32),
  recipe('dish_032','地三鲜','热菜','stir_fry','咸鲜',0.86,[ing('茄子',180),ing('土豆',150),ing('青椒',80),ing('蒜',10),ing('生抽',12)],['vegetarian'],12,10,34),
  recipe('dish_033','手撕包菜','热菜','quick_fry','香辣',0.68,[ing('大白菜',280),ing('干辣椒',5),ing('蒜',10),ing('陈醋',8),ing('生抽',8)],['vegetarian','spicy'],6,5,22),
  recipe('dish_034','干煸四季豆','热菜','stir_fry','香辣',0.86,[ing('四季豆',280),ing('猪肉馅',55),ing('干辣椒',5),ing('蒜',8),ing('生抽',10)],['spicy'],10,10,36),
  recipe('dish_035','蒜蓉油麦菜','热菜','stir_fry','蒜香',0.65,[ing('油麦菜',300),ing('蒜',18),ing('食盐',3),ing('大豆油',14)],['vegetarian','light'],5,4,16),
  recipe('dish_036','凉拌黄瓜','凉菜','cold_mix','蒜香',0.56,[ing('黄瓜',280),ing('蒜',15),ing('陈醋',12),ing('生抽',8),ing('芝麻油',5)],['vegetarian','light'],6,0,12),
  recipe('dish_037','拍蒜茄子','凉菜','cold_mix','蒜香',0.62,[ing('茄子',280),ing('蒜',18),ing('生抽',10),ing('陈醋',8),ing('芝麻油',5)],['vegetarian'],8,12,18),
  recipe('dish_038','凉拌木耳','凉菜','cold_mix','酸辣',0.66,[ing('木耳',130),ing('洋葱',60),ing('香菜',12),ing('陈醋',14),ing('小米椒',6)],['vegetarian','spicy','light'],8,3,18),
  recipe('dish_039','酸辣土豆丝','热菜','quick_fry','酸辣',0.68,[ing('土豆',300),ing('尖椒',45),ing('干辣椒',5),ing('米醋',14),ing('蒜',8)],['vegetarian','spicy'],9,5,28),
  recipe('dish_040','西红柿鸡蛋汤','汤羹','soup','清鲜',0.58,[ing('西红柿',180),ing('鸡蛋',80),ing('小葱',8),ing('食盐',3)],['vegetarian','kid_friendly','light'],5,10,16),
  recipe('dish_041','紫菜蛋花汤','汤羹','soup','鲜香',0.52,[ing('紫菜',12),ing('鸡蛋',85),ing('小葱',8),ing('芝麻油',3),ing('食盐',3)],['vegetarian','light'],4,8,14),
  recipe('dish_042','玉米排骨汤','汤羹','stew','清鲜',1.18,[ing('猪排骨',240),ing('玉米',160),ing('胡萝卜',80),ing('姜',8)],[],10,70,36),
  recipe('dish_043','菌菇鸡汤','汤羹','stew','菌香',1.25,[ing('鸡腿',220),ing('香菇',60),ing('茶树菇',45),ing('姜',8)],['light'],10,65,38),
  recipe('dish_044','冬瓜丸子汤','汤羹','boil','清鲜',0.92,[ing('冬瓜',250),ing('猪肉馅',120),ing('小葱',8),ing('姜',6),ing('白胡椒',2)],['light'],12,18,30),
  recipe('dish_045','扬州炒饭','炒饭','wok_noodle','咸鲜',0.88,[ing('大米',160),ing('鸡蛋',70),ing('虾仁',45),ing('胡萝卜',35),ing('小葱',10),ing('火腿片',35)],[],10,8,34),
  recipe('dish_046','蛋炒饭','炒饭','wok_noodle','咸鲜',0.62,[ing('大米',170),ing('鸡蛋',85),ing('小葱',10),ing('生抽',5)],['vegetarian','quick_meal'],5,6,18),
  recipe('dish_047','酱油炒饭','炒饭','wok_noodle','酱香',0.58,[ing('大米',180),ing('鸡蛋',55),ing('老抽',7),ing('生抽',8),ing('小葱',10)],['quick_meal'],5,6,18),
  recipe('dish_048','咖喱鸡肉饭','盖饭','rice_cook','咖喱',0.92,[ing('大米',160),ing('鸡腿',160),ing('土豆',100),ing('胡萝卜',55),ing('咖喱块',28)],['quick_meal'],10,25,30),
  recipe('dish_049','红烧牛肉盖饭','盖饭','assemble','浓香',1.18,[ing('大米',160),ing('牛腩',160),ing('胡萝卜',50),ing('生抽',12),ing('八角',1)],['quick_meal'],8,8,34),
  recipe('dish_050','黄焖鸡米饭','盖饭','assemble','酱香',0.98,[ing('大米',170),ing('鸡腿',190),ing('香菇',45),ing('青椒',45),ing('生抽',12)],['quick_meal'],8,8,30),
  recipe('dish_051','鱼香肉丝盖饭','盖饭','assemble','鱼香',0.94,[ing('大米',170),ing('猪里脊',120),ing('木耳',30),ing('胡萝卜',40),ing('豆瓣酱',12)],['spicy','quick_meal'],8,7,32),
  recipe('dish_052','卤肉饭','盖饭','simmer','酱香',0.96,[ing('大米',170),ing('猪五花',150),ing('鸡蛋',55),ing('生抽',14),ing('冰糖',7)],['quick_meal'],12,40,38),
  recipe('dish_053','炸酱面','面条','boil_noodle','酱香',0.78,[ing('碱水面',190),ing('猪肉馅',90),ing('甜面酱',28),ing('黄瓜',60),ing('胡萝卜',30)],[],12,8,28),
  recipe('dish_054','牛肉面','面条','boil_noodle','醇厚',1.05,[ing('碱水面',190),ing('牛腱',120),ing('白萝卜',70),ing('大葱',15),ing('香菜',10)],[],10,8,36),
  recipe('dish_055','红烧牛肉面','面条','boil_noodle','浓香',1.12,[ing('碱水面',190),ing('牛腩',125),ing('生抽',12),ing('八角',1),ing('小葱',10)],[],10,8,38),
  recipe('dish_056','酸辣粉','粉面','boil_noodle','酸辣',0.72,[ing('红薯粉',180),ing('花生酱',8),ing('陈醋',18),ing('辣椒油',14),ing('香菜',10)],['spicy'],7,6,22),
  recipe('dish_057','桂林米粉风味','粉面','boil_noodle','鲜香',0.78,[ing('米粉',190),ing('猪前腿',80),ing('黄豆',20),ing('小葱',10),ing('辣椒油',8)],['quick_meal'],8,7,26),
  recipe('dish_058','炒河粉','粉面','wok_noodle','咸鲜',0.86,[ing('河粉',210),ing('牛里脊',85),ing('生菜',60),ing('生抽',12),ing('洋葱',40)],[],10,7,36),
  recipe('dish_059','葱油拌面','面条','assemble','葱香',0.60,[ing('挂面',190),ing('香葱',30),ing('生抽',12),ing('白砂糖',5),ing('大豆油',14)],['vegetarian','quick_meal'],6,6,20),
  recipe('dish_060','番茄鸡蛋面','面条','boil_noodle','番茄',0.68,[ing('挂面',180),ing('西红柿',170),ing('鸡蛋',70),ing('小葱',8)],['vegetarian','kid_friendly'],6,7,20),
  recipe('dish_061','鲜肉水饺','饺馄饨','boil','鲜香',0.78,[ing('水饺皮',180),ing('猪肉馅',130),ing('大白菜',100),ing('小葱',12),ing('姜',5)],[],18,10,32),
  recipe('dish_062','韭菜鸡蛋水饺','饺馄饨','boil','鲜香',0.72,[ing('水饺皮',180),ing('韭菜',130),ing('鸡蛋',100),ing('芝麻油',6)],['vegetarian'],18,10,30),
  recipe('dish_063','鲜肉馄饨','饺馄饨','boil','清鲜',0.70,[ing('馄饨皮',150),ing('猪肉馅',110),ing('紫菜',8),ing('小葱',10),ing('芝麻油',4)],[],16,8,28),
  recipe('dish_064','生煎包','小吃','pan_fry','鲜香',0.82,[ing('中筋面粉',150),ing('猪肉馅',100),ing('酵母',3),ing('小葱',12),ing('芝麻油',5)],[],35,12,45),
  recipe('dish_065','鲜肉包','包点','steam_bread','鲜香',0.68,[ing('中筋面粉',160),ing('猪肉馅',95),ing('酵母',3),ing('小葱',10)],[],38,16,36),
  recipe('dish_066','奶黄包','包点','steam_bread','奶香',0.72,[ing('中筋面粉',150),ing('鲜牛奶',80),ing('鸡蛋',55),ing('黄油',12),ing('白砂糖',16),ing('酵母',3)],['vegetarian','kid_friendly'],40,15,38),
  recipe('dish_067','小笼包','小吃','steam_bread','鲜香',0.88,[ing('中筋面粉',145),ing('猪肉馅',110),ing('姜',5),ing('小葱',10),ing('芝麻油',4)],[],42,14,50),
  recipe('dish_068','葱油饼','小吃','pan_fry','葱香',0.55,[ing('中筋面粉',150),ing('香葱',25),ing('大豆油',16),ing('食盐',3)],['vegetarian'],20,8,28),
  recipe('dish_069','鸡蛋灌饼','早餐','pan_fry','咸鲜',0.58,[ing('中筋面粉',135),ing('鸡蛋',70),ing('生菜',45),ing('甜面酱',12)],['vegetarian','quick_meal'],15,7,25),
  recipe('dish_070','煎饼果子','早餐','pan_fry','酱香',0.62,[ing('中筋面粉',120),ing('玉米面',35),ing('鸡蛋',65),ing('生菜',40),ing('甜面酱',14)],['quick_meal'],12,7,28),
  recipe('dish_071','豆浆油条套餐','套餐','assemble','原味',0.60,[ing('豆浆',300),ing('中筋面粉',120),ing('大豆油',30),ing('白砂糖',6)],['vegetarian','breakfast'],18,10,30),
  recipe('dish_072','皮蛋瘦肉粥风味','早餐','boil','咸鲜',0.66,[ing('大米',90),ing('猪里脊',55),ing('鸭蛋',45),ing('姜',4),ing('小葱',7)],['breakfast','light'],8,35,24),
  recipe('dish_073','烤羊肉串','烧烤','skewer','孜然',1.18,[ing('羊腿肉',220),ing('孜然',8),ing('辣椒油',8),ing('洋葱',40)],['spicy','late_night'],14,10,44),
  recipe('dish_074','烤五花肉','烧烤','skewer','焦香',1.05,[ing('猪五花',230),ing('孜然',6),ing('辣椒油',7),ing('生抽',10)],['late_night'],12,10,40),
  recipe('dish_075','烤鸡翅','烧烤','grill','焦香',1.02,[ing('鸡翅',260),ing('蜂蜜',10),ing('生抽',12),ing('黑胡椒',3)],['late_night'],12,16,36),
  recipe('dish_076','烤茄子','烧烤','grill','蒜香',0.72,[ing('茄子',280),ing('蒜',24),ing('小米椒',6),ing('生抽',10)],['vegetarian','late_night'],10,15,30),
  recipe('dish_077','烤金针菇','烧烤','grill','蒜香',0.68,[ing('金针菇',220),ing('蒜',18),ing('辣椒油',7),ing('生抽',8)],['vegetarian','late_night'],8,10,24),
  recipe('dish_078','麻辣牛油锅底','火锅','hotpot','麻辣',1.12,[ing('牛油',90),ing('干辣椒',28),ing('花椒',12),ing('豆瓣酱',35),ing('姜',12),ing('蒜',16)],['spicy'],18,20,52),
  recipe('dish_079','番茄火锅锅底','火锅','hotpot','番茄',0.92,[ing('西红柿',360),ing('番茄酱',40),ing('洋葱',70),ing('白砂糖',8)],['vegetarian','non_spicy'],12,22,34),
  recipe('dish_080','菌汤火锅锅底','火锅','hotpot','菌香',1.00,[ing('香菇',80),ing('茶树菇',60),ing('杏鲍菇',80),ing('姜',8)],['vegetarian','non_spicy'],12,40,38),
  recipe('dish_081','薯条','小吃','deep_fry','咸鲜',0.55,[ing('薯条',180),ing('大豆油',35),ing('食盐',2),ing('番茄酱',18)],['vegetarian','kid_friendly'],3,6,14),
  recipe('dish_082','炸鸡块','小吃','deep_fry','焦香',0.76,[ing('鸡块',190),ing('大豆油',40),ing('番茄酱',18)],['kid_friendly'],3,7,16),
  recipe('dish_083','香酥鸡米花','小吃','deep_fry','香辣',0.72,[ing('鸡米花',180),ing('大豆油',38),ing('辣椒油',5)],['spicy'],3,6,16),
  recipe('dish_084','芝士焗薯角','小吃','bake','芝士',0.82,[ing('土豆',220),ing('马苏里拉',55),ing('黄油',8),ing('黑胡椒',2)],['vegetarian'],10,18,30),
  recipe('dish_085','鸡胸轻食碗','轻食','assemble','清鲜',1.05,[ing('鸡胸',150),ing('生菜',100),ing('玉米',60),ing('黄瓜',60),ing('鸡蛋',55),ing('酸奶',30)],['high_protein','light'],12,8,28),
  recipe('dish_086','牛肉能量碗','轻食','assemble','黑胡椒',1.28,[ing('牛里脊',140),ing('生菜',90),ing('玉米',55),ing('西红柿',70),ing('黑胡椒',3)],['high_protein','light'],12,8,34),
  recipe('dish_087','水果酸奶杯','甜点','assemble','果香',0.72,[ing('酸奶',180),ing('草莓',60),ing('蓝莓',35),ing('香蕉',60),ing('蜂蜜',8)],['vegetarian'],6,0,12),
  recipe('dish_088','芒果椰奶西米风味杯','甜点','assemble','果香',0.78,[ing('芒果',110),ing('椰浆',100),ing('鲜牛奶',80),ing('白砂糖',12)],['vegetarian'],8,2,18),
  recipe('dish_089','经典蛋挞','烘焙','bake','奶香',0.68,[ing('低筋面粉',70),ing('鲜牛奶',80),ing('淡奶油',50),ing('鸡蛋',55),ing('白砂糖',18),ing('黄油',18)],['vegetarian'],25,22,42),
  recipe('dish_090','巧克力布朗尼','烘焙','bake','可可',0.82,[ing('低筋面粉',75),ing('巧克力',60),ing('黄油',45),ing('鸡蛋',55),ing('白砂糖',28)],['vegetarian'],20,26,44),
  recipe('dish_091','珍珠奶茶','茶饮','shake','茶香',0.62,[ing('红茶叶',8),ing('鲜牛奶',180),ing('珍珠粉圆',65),ing('白砂糖',18)],['vegetarian'],6,5,20),
  recipe('dish_092','茉莉奶绿','茶饮','shake','茶香',0.60,[ing('茉莉花茶',8),ing('鲜牛奶',180),ing('白砂糖',16)],['vegetarian'],5,4,18),
  recipe('dish_093','柠檬绿茶','茶饮','shake','果香',0.58,[ing('绿茶叶',7),ing('柠檬',55),ing('蜂蜜',14),ing('矿泉水',260)],['vegetarian','light'],5,4,16),
  recipe('dish_094','美式咖啡','咖啡','coffee','咖啡',0.62,[ing('咖啡豆',18),ing('矿泉水',260)],['vegetarian','light'],3,3,28),
  recipe('dish_095','拿铁咖啡','咖啡','coffee','奶香',0.78,[ing('咖啡豆',18),ing('鲜牛奶',220)],['vegetarian'],4,4,32),
  recipe('dish_096','芒果冰沙','果饮','blend','冰爽',0.72,[ing('芒果',130),ing('鲜牛奶',60),ing('矿泉水',100),ing('白砂糖',12)],['vegetarian'],5,1,16)
];

const RECIPE_BY_ID = Object.fromEntries(RECIPES.map(x => [x.id, x]));

const MENU_ENGINEERING_LABELS = [
  {id:'star',name:'明星菜',meaning:'高销量高贡献毛利'},
  {id:'plowhorse',name:'耕牛菜',meaning:'高销量低贡献毛利'},
  {id:'puzzle',name:'谜题菜',meaning:'低销量高贡献毛利'},
  {id:'dog',name:'瘦狗菜',meaning:'低销量低贡献毛利'}
];

const SEASONAL_FACTORS = {
  spring:{hotpot:0.92,bbq:1.00,cold:0.88,soup:1.00,drink:0.95},
  summer:{hotpot:0.82,bbq:1.18,cold:1.28,soup:0.82,drink:1.35},
  autumn:{hotpot:1.02,bbq:1.10,cold:0.95,soup:1.06,drink:1.00},
  winter:{hotpot:1.32,bbq:0.88,cold:0.72,soup:1.30,drink:0.82}
};

function buildVariantCatalog() {
  const variants = [];
  for (const r of RECIPES) {
    for (const p of ['mini','single','large']) {
      variants.push({ id:r.id+'_'+p, recipeId:r.id, portionId:p });
    }
  }
  return variants;
}

module.exports = {
  VERSION:'1.0.0',
  INGREDIENTS,
  INGREDIENT_BY_NAME,
  COOKING_METHODS,
  FLAVOR_PROFILES,
  DISH_CATEGORIES,
  PORTION_SPECS,
  MENU_STRATEGIES,
  DIETARY_TAGS,
  ALLERGEN_TAGS,
  RECIPES,
  RECIPE_BY_ID,
  MENU_ENGINEERING_LABELS,
  SEASONAL_FACTORS,
  buildVariantCatalog
};
