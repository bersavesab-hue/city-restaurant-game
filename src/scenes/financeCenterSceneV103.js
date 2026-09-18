'use strict';

const runtime = globalThis.GameRuntime || {};
const api = runtime.api || {};
const DataSceneBase = require('./dataSceneBase.js');
const sceneManager = require('../ui/managers/sceneManager.js');
const gameState = require('../core/gameState.js');
const financeSystem = require('../finance/financialSystemV103.js');
const ui = require('../ui/dataWidgets.js');

class FinanceCenterScene extends DataSceneBase {
  constructor() {
    super('financeCenter');
  }

  enter(payload) {
    super.enter(payload);
    this.shopId = payload && payload.shopId || null;
    financeSystem.update();
  }

  currentSnapshot() {
    return financeSystem.snapshot(this.shopId);
  }

  drawOverview(ctx, d) {
    ui.metricCard(ctx, 10, 116, 116, 76, '可用现金', ui.money(d.cash), '当前可动用资金');
    ui.metricCard(ctx, 137, 116, 116, 76, '贷款余额', ui.money(d.debt.totalDebt), d.debt.activeCount + '笔在还', { valueColor: d.debt.overdue > 0 ? ui.COLORS.red : ui.COLORS.text });
    ui.metricCard(ctx, 264, 116, 116, 76, '信用评分', d.score + ' · ' + d.grade, '影响额度和利率', { valueColor: d.score >= 650 ? ui.COLORS.green : d.score < 550 ? ui.COLORS.red : ui.COLORS.orange });

    ui.sectionTitle(ctx, '资金安全', 216, '先看能不能扛住每月固定还款', 390);
    ui.rect(ctx, 10, 230, 370, 144, { fill: ui.COLORS.panel, stroke: ui.COLORS.line });
    ui.row(ctx, 24, 255, 334, '预计月营业额', ui.money(d.metrics.projectedMonthlyRevenue));
    ui.divider(ctx, 24, 270, 334);
    ui.row(ctx, 24, 290, 334, '预计月利润', ui.money(d.metrics.projectedMonthlyProfit), d.metrics.projectedMonthlyProfit >= 0 ? ui.COLORS.green : ui.COLORS.red);
    ui.divider(ctx, 24, 305, 334);
    ui.row(ctx, 24, 325, 334, '每月债务支出', ui.money(d.debt.monthlyDebtService));
    ui.divider(ctx, 24, 340, 334);
    ui.row(ctx, 24, 360, 334, '债务支出 / 营业额', ui.percent(d.debtServiceRatio), d.debtServiceRatio >= 0.28 ? ui.COLORS.red : d.debtServiceRatio >= 0.16 ? ui.COLORS.orange : ui.COLORS.green);

    ui.sectionTitle(ctx, '融资能力', 402, '', 390);
    ui.metricCard(ctx, 10, 416, 116, 72, '最高可用授信', ui.money(d.availableCredit), '动态变化');
    ui.metricCard(ctx, 137, 416, 116, 72, '逾期金额', ui.money(d.debt.overdue), d.debt.missedPayments + '次逾期记录', { valueColor: d.debt.overdue > 0 ? ui.COLORS.red : ui.COLORS.green });
    ui.metricCard(ctx, 264, 416, 116, 72, '债务状态', d.risk, d.debt.activeCount ? '控制扩张节奏' : '当前无还款压力', { valueSize: 10.5, valueColor: d.debt.overdue > 0 ? ui.COLORS.red : ui.COLORS.text });

    const y = 514;
    ui.rect(ctx, 10, y, 370, 102, { fill: d.debt.overdue > 0 ? ui.COLORS.paleRed : ui.COLORS.paleBlue, stroke: d.debt.overdue > 0 ? '#D7AAA2' : '#BCD3DE' });
    ui.text(ctx, d.debt.overdue > 0 ? '当前首要金融问题' : '金融系统规则', 24, y + 20, 8.5, ui.COLORS.text, '700');
    ui.text(ctx, d.debt.overdue > 0 ? '存在逾期：先补还款，再考虑新增融资。' : '盈利稳定 + 按时还款 = 额度提升、利率下降。', 24, y + 48, 7, ui.COLORS.text, '600');
    ui.text(ctx, '贷款本金不计入经营利润；利息才计入金融成本。', 24, y + 76, 6.6, ui.COLORS.muted, '500');
  }

  drawOffers(ctx, d) {
    ui.sectionTitle(ctx, '可申请融资', 116, '额度、利率和期限随经营状态动态变化', 390);
    const rows = d.offers || [];
    rows.forEach((offer, i) => {
      const y = 134 + i * 148;
      ui.rect(ctx, 10, y, 370, 132, { fill: offer.available ? ui.COLORS.panel : '#F1EEE8', stroke: offer.available ? ui.COLORS.line : '#D8D2C9' });
      ui.text(ctx, offer.name, 24, y + 22, 10, ui.COLORS.text, '700');
      ui.text(ctx, offer.purpose, 24, y + 45, 6.4, ui.COLORS.muted, '500');

      if (!offer.available) {
        ui.text(ctx, offer.reason || '当前不可申请', 24, y + 84, 8, ui.COLORS.red, '700');
        ui.text(ctx, '信用门槛 ' + offer.minScore + '分', 356, y + 84, 6.5, ui.COLORS.muted, '600', 'right');
        return;
      }

      ui.text(ctx, '额度 ' + ui.money(offer.approvedLimit), 24, y + 72, 7.2, ui.COLORS.text, '700');
      ui.text(ctx, '年利率 ' + ui.percent(offer.annualRate), 150, y + 72, 7.2, ui.COLORS.text, '700');
      ui.text(ctx, offer.termMonths + '个月', 260, y + 72, 7.2, ui.COLORS.text, '700');

      ui.rect(ctx, 222, y + 88, 65, 31, { radius: 9, fill: '#E7EDF0', stroke: '#C7D4DA' });
      ui.text(ctx, '借50%', 254.5, y + 103.5, 7, ui.COLORS.navy, '700', 'center');
      this.addButton('borrow:' + offer.id + ':50', 222, y + 88, 65, 31);

      ui.rect(ctx, 295, y + 88, 71, 31, { radius: 9, fill: ui.COLORS.gold, stroke: '#D19A2F' });
      ui.text(ctx, '借满额度', 330.5, y + 103.5, 7, '#26343B', '700', 'center');
      this.addButton('borrow:' + offer.id + ':100', 295, y + 88, 71, 31);

      ui.text(ctx, '推荐月供约 ' + ui.money(offer.estimatedMonthlyPayment), 24, y + 103, 6.5, ui.COLORS.muted, '600');
    });
  }

  drawCredit(ctx, d) {
    ui.sectionTitle(ctx, '企业信用', 116, '不是固定等级，会被你的经营行为改变', 390);
    ui.rect(ctx, 10, 132, 370, 106, { fill: ui.COLORS.paleGold, stroke: '#E4C98D' });
    ui.text(ctx, d.score, 32, 178, 28, ui.COLORS.text, '700');
    ui.text(ctx, d.grade + '级', 118, 176, 14, d.score >= 650 ? ui.COLORS.green : ui.COLORS.orange, '700');
    ui.text(ctx, '最高可用授信 ' + ui.money(d.availableCredit), 350, 164, 8, ui.COLORS.text, '700', 'right');
    ui.text(ctx, '信用越高，融资成本越低', 350, 190, 6.5, ui.COLORS.muted, '600', 'right');

    ui.sectionTitle(ctx, '评分因素', 270, '', 390);
    const factors = d.creditFactors || [];
    factors.forEach((row, i) => {
      const y = 288 + i * 55;
      ui.rect(ctx, 10, y, 370, 44, { radius: 9, fill: ui.COLORS.panel, stroke: ui.COLORS.line });
      ui.text(ctx, row.label, 24, y + 22, 7.5, ui.COLORS.muted, '600');
      ui.text(ctx, row.value, 356, y + 22, 8, row.good ? ui.COLORS.green : ui.COLORS.red, '700', 'right');
    });

    ui.rect(ctx, 10, 526, 370, 88, { fill: ui.COLORS.paleBlue, stroke: '#BCD3DE' });
    ui.text(ctx, '怎样提高信用', 24, 548, 8, ui.COLORS.text, '700');
    ui.text(ctx, '连续盈利、保留现金储备、降低月供压力、避免逾期。', 24, 575, 7, ui.COLORS.text, '600');
    ui.text(ctx, '盲目把额度借满，会反过来压低下一次可用授信。', 24, 598, 6.5, ui.COLORS.muted, '500');
  }

  drawRepayment(ctx, d) {
    ui.sectionTitle(ctx, '当前贷款', 116, d.debt.activeCount ? '按月自动扣款，现金不足会形成逾期' : '当前无未结清贷款', 390);
    const loans = (d.loans || []).slice(0, 3);
    if (!loans.length) {
      ui.rect(ctx, 10, 136, 370, 110, { fill: ui.COLORS.paleGreen, stroke: '#B8D7C2' });
      ui.text(ctx, '当前没有还款压力', 195, 176, 11, ui.COLORS.green, '700', 'center');
      ui.text(ctx, '需要资金时再去“融资贷款”查看动态授信。', 195, 209, 7, ui.COLORS.muted, '600', 'center');
    }

    loans.forEach((loan, i) => {
      const y = 134 + i * 140;
      const overdue = (Number(loan.overduePrincipal) || 0) + (Number(loan.overdueInterest) || 0);
      ui.rect(ctx, 10, y, 370, 124, { fill: overdue > 0 ? ui.COLORS.paleRed : ui.COLORS.panel, stroke: overdue > 0 ? '#D7AAA2' : ui.COLORS.line });
      ui.text(ctx, loan.productName || '经营贷款', 24, y + 21, 9, ui.COLORS.text, '700');
      ui.text(ctx, overdue > 0 ? '逾期' : '正常', 356, y + 21, 7.5, overdue > 0 ? ui.COLORS.red : ui.COLORS.green, '700', 'right');
      ui.text(ctx, '剩余本金 ' + ui.money(loan.principalOutstanding), 24, y + 48, 7.2, ui.COLORS.text, '700');
      ui.text(ctx, '月供约 ' + ui.money(loan.monthlyPayment), 200, y + 48, 7, ui.COLORS.muted, '600');
      ui.text(ctx, '下期 ' + financeSystem.monthLabel(loan.nextDueMonthIndex), 356, y + 48, 6.4, ui.COLORS.muted, '600', 'right');
      if (overdue > 0) ui.text(ctx, '逾期应还 ' + ui.money(overdue), 24, y + 72, 7.2, ui.COLORS.red, '700');

      ui.rect(ctx, 208, y + 80, 72, 30, { radius: 9, fill: '#E7EDF0', stroke: '#C7D4DA' });
      ui.text(ctx, overdue > 0 ? '补还逾期' : '还本期', 244, y + 95, 6.8, ui.COLORS.navy, '700', 'center');
      this.addButton('repay:' + loan.id, 208, y + 80, 72, 30);

      ui.rect(ctx, 288, y + 80, 78, 30, { radius: 9, fill: ui.COLORS.gold, stroke: '#D19A2F' });
      ui.text(ctx, '提前结清', 327, y + 95, 6.8, '#26343B', '700', 'center');
      this.addButton('settle:' + loan.id, 288, y + 80, 78, 30);
    });

    if (loans.length <= 2) {
      const historyY = loans.length ? 134 + loans.length * 140 + 4 : 276;
      ui.sectionTitle(ctx, '最近金融流水', historyY, '', 390);
      const rows = (d.history || []).slice(0, 4);
      rows.forEach((row, i) => {
        const y = historyY + 22 + i * 30;
        const funding = row.type === 'funding';
        ui.text(ctx, row.monthLabel || '', 24, y, 6.5, ui.COLORS.muted, '600');
        ui.text(ctx, funding ? '贷款到账' : row.status === 'overdue' ? '未按期偿还' : '贷款还款', 135, y, 6.8, ui.COLORS.text, '600');
        ui.text(ctx, (funding ? '+' : '-') + ui.money(row.amount), 356, y, 7, funding ? ui.COLORS.green : row.status === 'overdue' ? ui.COLORS.red : ui.COLORS.text, '700', 'right');
      });
    }
  }

  drawActions(ctx) {
    const y = this.contentBottom - 47;
    ui.rect(ctx, 10, y, 110, 37, { radius: 10, fill: '#EDE6DC', stroke: '#D1C5B7' });
    ui.text(ctx, '‹ 返回门店', 65, y + 18.5, 7.5, ui.COLORS.navy, '700', 'center');
    this.addButton('action:shop', 10, y, 110, 37);

    ui.rect(ctx, 128, y, 120, 37, { radius: 10, fill: ui.COLORS.navy, stroke: '#244A60' });
    ui.text(ctx, '经营报表', 188, y + 18.5, 7.5, ui.COLORS.white, '700', 'center');
    this.addButton('action:report', 128, y, 120, 37);

    ui.rect(ctx, 256, y, 124, 37, { radius: 10, fill: ui.COLORS.gold, stroke: '#D49434' });
    ui.text(ctx, '更多管理', 318, y + 18.5, 7.5, '#26343B', '700', 'center');
    this.addButton('action:more', 256, y, 124, 37);
  }

  render(ctx) {
    if (!ctx) return;
    this.begin(ctx);
    financeSystem.update();
    const d = this.currentSnapshot();
    const player = gameState.getPlayer ? gameState.getPlayer() : {};

    if (!d) {
      ui.header(ctx, '金融中心', '需要先拥有门店才能建立企业授信', 390, ui.money(player && player.cash));
      ui.rect(ctx, 14, 130, 362, 160, { fill: ui.COLORS.panel, stroke: ui.COLORS.line });
      ui.text(ctx, '签约首店后开放经营贷款、设备贷款和扩店融资。', 195, 195, 8.5, ui.COLORS.muted, '600', 'center');
      this.drawActions(ctx);
      this.end(ctx);
      return;
    }

    ui.header(ctx, '金融中心', (d.shop.name || '当前门店') + ' · 资金不是越多越好，关键是还得起', 390, ui.money(d.cash));
    ui.tabBar(ctx, [{label:'资金账户'}, {label:'融资贷款'}, {label:'信用授信'}, {label:'还款流水'}], this.tab, 75, this.addButton.bind(this), 390);

    if (this.tab === 0) this.drawOverview(ctx, d);
    else if (this.tab === 1) this.drawOffers(ctx, d);
    else if (this.tab === 2) this.drawCredit(ctx, d);
    else this.drawRepayment(ctx, d);

    this.drawActions(ctx);
    this.end(ctx);
  }

  confirm(title, content, onConfirm) {
    if (api && typeof api.showModal === 'function') {
      api.showModal({
        title,
        content,
        success(result) {
          if (result && result.confirm) onConfirm();
        }
      });
    } else {
      onConfirm();
    }
  }

  handleTap(x, y) {
    const hit = this.handleBaseTap(x, y);
    if (hit === true) return true;
    if (!hit || !hit.id) return false;

    if (hit.id === 'action:shop') return sceneManager.switchTo('shop', this.shopId ? { shopId: this.shopId } : {});
    if (hit.id === 'action:report') return sceneManager.switchTo('business', this.shopId ? { shopId: this.shopId } : {});
    if (hit.id === 'action:more') return sceneManager.switchTo('more', this.shopId ? { shopId: this.shopId } : {});

    if (hit.id.indexOf('borrow:') === 0) {
      const parts = hit.id.split(':');
      const productId = parts[1];
      const ratio = parts[2] === '100' ? 1 : 0.5;
      const offer = financeSystem.productOffer(this.shopId, productId);
      if (!offer || !offer.available) {
        this.showToast(offer && offer.reason || '当前不可申请');
        return true;
      }
      const amount = Math.floor((offer.approvedLimit * ratio) / 5000) * 5000;
      this.confirm('确认融资', `${offer.name}：申请约${ui.money(amount)}，年利率${ui.percent(offer.annualRate)}，期限${offer.termMonths}个月。`, () => {
        const result = financeSystem.borrow(this.shopId, productId, ratio);
        this.showToast(result.message || (result.ok ? '融资到账' : '申请失败'));
      });
      return true;
    }

    if (hit.id.indexOf('repay:') === 0) {
      const loanId = hit.id.slice('repay:'.length);
      const result = financeSystem.repayDue(loanId);
      this.showToast(result.ok ? '还款成功' : result.message || '还款失败');
      return true;
    }

    if (hit.id.indexOf('settle:') === 0) {
      const loanId = hit.id.slice('settle:'.length);
      this.confirm('提前结清', '提前结清后不再产生未来月份利息，确认使用当前现金结清？', () => {
        const result = financeSystem.settleLoan(loanId);
        this.showToast(result.ok ? '贷款已结清' : result.message || '结清失败');
      });
      return true;
    }

    return false;
  }
}

module.exports = new FinanceCenterScene();
