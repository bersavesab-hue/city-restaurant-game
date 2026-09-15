# V0.8.22–V0.8.25 四合一功能包

一次更新连续完成 13–16/26。

## 13/26 V0.8.22 人物 / 员工数据库
- 继续使用现有 Person/NPC V1.0 数据包，不建立第二套人物库。
- 统一员工候选人、人物档案、餐饮岗位、技能、状态、工资和实时状态。
- 支持稳定 seed 生成候选人池。
- 旧员工只有 name/role/wage/skill 时可自动补齐 personProfile。
- 保留人物关系、记忆、性格轴、教育、家庭、职业背景等原系统。

## 14/26 V0.8.23 员工管理整合
- 统一招聘、解雇、培训、加薪、晋升、请假、沟通入口。
- 继续调用原 openingPrep / staffCareer / staffWorkload / operationsSchedule。
- 不删除旧系统。
- openingPrep 的正式员工同步到 restaurant runtime.staff，避免同一个员工在不同系统中变成两个人。
- 新增统一团队快照：人数、岗位、月薪、覆盖率、疲劳、压力、加班等。

## 15/26 V0.8.24 实时门店经营整合
- 新增统一实时经营快照。
- 汇总菜单、厨房队列、堂食队列、库存、采购、顾客、员工、当日订单和经营财务。
- 新增统一顾客到店模拟入口。
- 新增统一关店/日结入口。
- 原 restaurantSimulation、restaurantRuntime 和各功能引擎继续保留。

## 16/26 V0.8.25 完整财务系统
- 在原 openingLoans 和 settlement ledger 基础上增加统一财务账。
- 支持收入、采购、工资、租金、水电、平台、包装、营销、合规、损耗、退款、招聘、培训、维护、税费、利息等分类。
- 交易支持 referenceId 幂等，避免重复记账/重复扣钱。
- 订单收入与平台费/包装费/退款形成真实现金流。
- 食材成本作为会计成本记录，但采购已付款时不重复扣现金。
- 采购单自动进入统一财务账。
- 招聘与培训成本自动进入统一财务账。
- 支持门店损益、净现金流、30日日结、交易流水和开店贷款状态。

## 新增 operationsStore 功能入口
- staffCandidateRows
- hireStaffCandidate
- dismissStaffMember
- staffManagementSnapshot
- trainStaffMember
- raiseStaffMember
- promoteStaffMember
- approveStaffLeave
- coachStaffMember
- liveOperationsSnapshot
- simulateCustomerVisit
- closeOperatingDay
- financeSnapshot
- financeTransactions
- recordFinanceExpense
- openingCreditStatus

## 兼容
- 基线必须为正式 V0.8.21。
- 最终版本一次跳到 V0.8.25。
- 所有 V0.8.22 / .23 / .24 / .25 测试仍分开保留。
- 不修改 `.github/workflows/*`。
- 不在 ZIP 中携带 package.json / package-lock.json。
- 安装器仍会清理根目录误留的 apply-update.yml。
