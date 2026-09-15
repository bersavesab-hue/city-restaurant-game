# V0.8.20 供应商 / 采购 / 物流数据库统一

本轮以现有供应商包为唯一底座，不重复生成第二套供应商系统。

正式规模：
- 18 类供应商
- 7 档供应商规模
- 126 种供应商原型
- 22 种合作方式
- 18 种账期
- 20 种配送方式
- 30 种报价策略
- 24 种议价风格
- 36 种供应风险
- 30 种关系事件
- 16 种合同类型

新增完整采购链：
供应商档案 -> 比价 -> 议价 -> 创建采购单 -> 运输状态 -> 到货 -> 付款 -> 入库存批次 -> 供应商履约记录

采购物流状态：
- ordered
- in_transit
- due
- overdue
- received
- cancelled

供应商履约累计：
- orders
- onTime
- late
- qualityIncidents
- totalSpend
- relationship

新增门店经营接口：
- supplierCatalog
- compareSupplierQuotes
- negotiateSupplierQuote
- createManualPurchaseOrder
- receiveManualPurchaseOrder
- cancelManualPurchaseOrder
- procurementOverview

兼容原则：
- 原 autoRestock 保持可用，继续作为即时兼容补货路径。
- 原 supplier_instance_001 等供应商实例ID保持。
- 原 purchaseOrders 存档结构继续可读，新增字段按需自动补充。
- 手动采购严格遵守预计到货日；未到货默认不能收货。
- 收货库存 batchNo 直接使用采购单ID，形成可追溯链。
- 账期本轮先进入采购单元数据，真实应付账款结算统一留到 16/26 财务系统。

修正版 r2：安装器会清理仓库根目录误留的 `apply-update.yml`；正式 `.github/workflows/apply-update.yml` 不受影响。
