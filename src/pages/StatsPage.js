// StatsPage.js — 工作统计页面
// 包含：时间范围切换、KPI 卡片、周一到周日任务完成趋势柱状图

import { store } from '../store.js';
import { icons } from '../utils/icons.js';

const RANGES = [
  { key: 'today', label: '今日' },
  { key: 'week', label: '本周' },
  { key: 'month', label: '本月' },
  { key: 'quarter', label: '本季度' },
  { key: 'year', label: '本年' },
  { key: 'all', label: '全部' },
  { key: 'custom', label: '自定义' },
];

// 趋势图 SVG 内边距（渲染与 tooltip 定位共用）
const CHART_PAD_LEFT = 40;
const CHART_PAD_RIGHT = 12;

export function createStatsPage() {
  const state = {
    range: 'today',
    customStart: '',
    customEnd: '',
    hiddenSeries: {},
  };

  // 趋势图参考宽度：与卡片内容区实际宽度一致，由 ResizeObserver 校正
  let chartW = 1140;

  const el = document.createElement('div');
  el.className = 'stats-page-container';

  function getWeeklyData() {
    const now = new Date();
    const currentDay = now.getDay() || 7;
    const monday = new Date(now);
    monday.setDate(now.getDate() - currentDay + 1);
    monday.setHours(0, 0, 0, 0);

    const weekdayLabels = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
    const data = [];

    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      const dStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      data.push({
        date: dStr,
        day: i,
        label: weekdayLabels[i],
        dateLabel: `${d.getMonth() + 1}/${d.getDate()}`,
        newTask: 0,
        newSubtask: 0,
        doneTask: 0,
        doneSubtask: 0,
      });
    }

    const tasks = store.getTasks();
    const dateIdxMap = {};
    data.forEach((d, i) => { dateIdxMap[d.date] = i; });

    tasks.forEach((t) => {
      t.logs.forEach((l) => {
        if (!l.date || dateIdxMap[l.date] == null) return;
        const idx = dateIdxMap[l.date];
        if (l.text === '创建任务') {
          data[idx].newTask++;
        } else if (l.text.startsWith('添加子任务')) {
          data[idx].newSubtask++;
        } else if (l.text === '完成任务') {
          data[idx].doneTask++;
        } else if (l.text.startsWith('完成子任务')) {
          data[idx].doneSubtask++;
        }
      });
    });

    return data;
  }

  const SERIES_CONFIG = [
    { key: 'newTask', label: '新建主任务', color: 'var(--viz-series-brand)', type: 'bar' },
    { key: 'newSubtask', label: '新建子任务', color: 'var(--viz-series-sky)', type: 'bar' },
    { key: 'doneTask', label: '完成主任务', color: 'var(--viz-series-mint)', type: 'bar' },
    { key: 'doneSubtask', label: '完成子任务', color: 'var(--viz-series-amber)', type: 'bar' },
  ];

  function renderComboChart(weeklyData) {
    const visibleSeries = SERIES_CONFIG.filter((s) => !state.hiddenSeries[s.key]);
    const chartH = 240;
    const padLeft = CHART_PAD_LEFT;
    const padRight = CHART_PAD_RIGHT;
    const padTop = 20;
    const padBottom = 44;
    const plotW = chartW - padLeft - padRight;
    const plotH = chartH - padTop - padBottom;
    const numDays = 7;
    const groupW = plotW / numDays;
    const barGap = 3;
    // 宽卡片下限制柱宽，避免柱子过粗
    const barW = Math.min((groupW - barGap * (visibleSeries.length - 1)) / Math.max(visibleSeries.length, 1), 26);

    let maxVal = 0;
    weeklyData.forEach((d) => {
      visibleSeries.forEach((s) => {
        if (d[s.key] > maxVal) maxVal = d[s.key];
      });
    });
    maxVal = Math.max(6, maxVal);
    const yTicks = 6;
    const yStep = Math.ceil(maxVal / yTicks);
    const yMax = yStep * yTicks;
    const yScale = plotH / yMax;

    const yLines = [];
    const yLabels = [];
    for (let i = 0; i <= yTicks; i++) {
      const val = yMax - yStep * i;
      const y = padTop + i * (plotH / yTicks);
      yLines.push(`<line x1="${padLeft}" y1="${y}" x2="${chartW - padRight}" y2="${y}" stroke="#f2f4f7" stroke-width="1" />`);
      yLabels.push(`<text x="${padLeft - 6}" y="${y + 4}" text-anchor="end" font-size="13" fill="#667085">${val}</text>`);
    }

    const xLabels = [];
    weeklyData.forEach((d, i) => {
      const x = padLeft + i * groupW + groupW / 2;
      xLabels.push(`
        <text x="${x}" y="${chartH - padBottom + 15}" text-anchor="middle" font-size="14" font-weight="500" fill="#475467">${d.label}</text>
        <text x="${x}" y="${chartH - padBottom + 32}" text-anchor="middle" font-size="13" fill="#667085">${d.dateLabel}</text>
      `);
    });

    const bars = [];

    visibleSeries.forEach((s, sIdx) => {
      weeklyData.forEach((d, i) => {
        const groupX = padLeft + i * groupW;
        const barX = groupX + sIdx * (barW + barGap) + (groupW - visibleSeries.length * barW - (visibleSeries.length - 1) * barGap) / 2;
        const val = d[s.key];
        const barH = val * yScale;
        const barY = padTop + plotH - barH;

        if (barH > 0) {
          bars.push(
            `<rect class="cmb-bar cmb-bar--${s.key}" data-day="${i}" data-series="${s.key}" data-value="${val}" ` +
            `x="${barX.toFixed(1)}" y="${barY.toFixed(1)}" width="${barW.toFixed(1)}" height="${barH.toFixed(1)}" ` +
            `fill="${s.color}" rx="3" ry="3" />`
          );
        }
      });
    });

    const hoverTargets = [];
    for (let i = 0; i < numDays; i++) {
      const x = padLeft + i * groupW;
      hoverTargets.push(
        `<rect class="cmb-hover-target" data-day="${i}" ` +
        `x="${x}" y="${padTop}" width="${groupW}" height="${plotH}" fill="transparent" />`
      );
    }

    const legendItems = SERIES_CONFIG.map((s) => {
      const hidden = state.hiddenSeries[s.key];
      const total = weeklyData.reduce((sum, d) => sum + (d[s.key] || 0), 0);
      return (
        `<button type="button" class="cmb-legend-item ${hidden ? 'is-hidden' : ''}" data-series="${s.key}" aria-pressed="${!hidden}" title="点击切换显示">
          <span class="cmb-legend-icon" style="background:${s.color};"></span>
          <span class="cmb-legend-label">${s.label}</span>
          <span class="cmb-legend-value">${total}</span>
        </button>`
      );
    }).join('');

    return `
      <div class="combo-chart">
        <svg class="combo-chart__svg" viewBox="0 0 ${chartW} ${chartH}" preserveAspectRatio="xMidYMid meet">
          ${yLines.join('')}
          ${yLabels.join('')}
          <line x1="${padLeft}" y1="${padTop + plotH}" x2="${chartW - padRight}" y2="${padTop + plotH}" stroke="#d0d5dd" stroke-width="1" />
          ${bars.join('')}
          ${xLabels.join('')}
          ${hoverTargets.join('')}
        </svg>
        <div class="cmb-tooltip" id="cmb-tooltip"></div>
        <div class="cmb-legend">${legendItems}</div>
      </div>
    `;
  }

  function renderDonutSegments(stats) {
    // 环形图展示「全部主任务」的状态构成，完成率为全局口径：已完成 /（全部 − 已终止）
    const activeTotal = stats.overallTotal - stats.overallTerminated;
    const strokeRadius = 32;
    const circumference = 2 * Math.PI * strokeRadius;

    // 空状态：灰色底环
    if (activeTotal <= 0) {
      return `<circle cx="50" cy="50" r="${strokeRadius}" fill="none" stroke="#e5e7eb" stroke-width="15" />`;
    }

    const data = [
      { value: stats.overallDone, color: 'var(--viz-series-mint)' },
      { value: stats.overallProgress, color: 'var(--viz-series-brand)' },
    ].filter((item) => item.value > 0);

    // 只有一种状态：画完整圆环，中心显示完成率（done / activeTotal）
    if (data.length === 1) {
      const rateText = stats.completionRate != null ? stats.completionRate + '%' : '';
      return `<circle cx="50" cy="50" r="${strokeRadius}" fill="none" stroke="${data[0].color}" stroke-width="15" />
              <text x="50" y="46" text-anchor="middle" dominant-baseline="middle" font-size="16" font-weight="700" fill="#1d2939">${rateText}</text>
              <text x="50" y="59" text-anchor="middle" dominant-baseline="middle" font-size="10" fill="#667085">完成率</text>`;
    }

    // 多种状态：用 stroke-dasharray 分段
    let offset = 0;
    let result = '';
    data.forEach((item) => {
      const pct = item.value / activeTotal;
      const dashLen = pct * circumference;
      const gapLen = circumference - dashLen;
      result += `<circle cx="50" cy="50" r="${strokeRadius}" fill="none" stroke="${item.color}" stroke-width="15" stroke-dasharray="${dashLen.toFixed(3)} ${gapLen.toFixed(3)}" stroke-dashoffset="${(-offset).toFixed(3)}" transform="rotate(-90 50 50)" />`;
      offset += dashLen;
    });

    // 中心显示完成率（done / activeTotal，与分段占比一致）
    const rateText = stats.completionRate != null ? stats.completionRate + '%' : '';
    if (rateText) {
      result += `<text x="50" y="46" text-anchor="middle" dominant-baseline="middle" font-size="16" font-weight="700" fill="#1d2939">${rateText}</text>
                 <text x="50" y="59" text-anchor="middle" dominant-baseline="middle" font-size="10" fill="#667085">完成率</text>`;
    }
    return result;
  }

  function render() {
    const rangeParam = state.range === 'custom' && state.customStart && state.customEnd 
      ? { start: state.customStart, end: state.customEnd } 
      : state.range;
    const stats = store.getStats(rangeParam);
    const weeklyData = getWeeklyData();

    el.innerHTML = `
      <div class="stats-header">
        <button class="wf-menu-toggle-btn" id="stats-menu-toggle">${icons.menu}</button>
      </div>

      <div class="stats-hero-row">
        ${stats.overdue > 0 ? `
          <button type="button" class="stats-overdue-card is-danger" data-kpi-click="overdue" title="查看逾期任务">
            <span class="stats-overdue-card__header">
              <span class="stats-overdue-card__icon">${icons.warning}</span>
              <span class="stats-overdue-card__label">逾期任务数</span>
            </span>
            <span class="stats-overdue-card__num">${stats.overdue}</span>
            <span class="stats-overdue-card__hint">
              ${stats.overdueMaxDays > 0 ? `最久已逾期 ${stats.overdueMaxDays} 天，建议优先处理` : '建议优先处理'}
            </span>
          </button>
        ` : `
          <div class="stats-overdue-card is-success">
            <span class="stats-overdue-card__header">
              <span class="stats-overdue-card__icon">${icons.checkCircle}</span>
              <span class="stats-overdue-card__label">逾期任务数</span>
            </span>
            <span class="stats-overdue-card__num">${stats.overdue}</span>
            <span class="stats-overdue-card__hint">当前无逾期任务，一切按时推进</span>
          </div>
        `}
        <div class="stats-chart-card stats-hero-card">
          <div class="stats-chart-card__title">任务完成率</div>
          <div class="stats-chart-card__body">
            <div class="donut-chart donut-chart--compact">
              <svg viewBox="0 0 100 100" class="donut-chart__svg donut-chart__svg--compact">
                ${renderDonutSegments(stats)}
              </svg>
              <div class="donut-chart__legend donut-chart__legend--rows">
                <div class="donut-chart__legend-item">
                  <span class="donut-chart__legend-dot" style="background:var(--viz-series-mint)"></span>
                  <span class="donut-chart__legend-label">已完成</span>
                  <span class="donut-chart__legend-value">${stats.overallDone}</span>
                </div>
                <div class="donut-chart__legend-item">
                  <span class="donut-chart__legend-dot" style="background:var(--viz-series-brand)"></span>
                  <span class="donut-chart__legend-label">进行中</span>
                  <span class="donut-chart__legend-value">${stats.overallProgress}</span>
                </div>
                <div class="donut-chart__legend-item">
                  <span class="donut-chart__legend-dot" style="background:var(--viz-series-coral)"></span>
                  <span class="donut-chart__legend-label">已终止</span>
                  <span class="donut-chart__legend-value">${stats.overallTerminated}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="stats-section-divider"></div>

      <div class="stats-range-section">
        <div class="stats-range-bar">
          ${RANGES.map((r) => `
            <button class="stats-range-pill ${state.range === r.key ? 'stats-range-pill--active' : ''}" data-range="${r.key}">${r.label}</button>
          `).join('')}
        </div>
        ${state.range === 'custom' ? `
          <div class="stats-custom-date">
            <input type="date" id="stats-custom-start" value="${state.customStart}" class="stats-custom-date__input" />
            <span class="stats-custom-date__separator">至</span>
            <input type="date" id="stats-custom-end" value="${state.customEnd}" class="stats-custom-date__input" />
            <button class="wf-btn wf-btn--secondary" id="stats-custom-apply">应用</button>
          </div>
        ` : ''}
        <div class="stats-kpi-row">
          ${stats.total > 0 ? `
            <button type="button" class="stats-kpi-card stats-kpi-card--clickable" data-kpi-click="all" title="查看任务列表">
              <span class="stats-kpi__label">任务总数</span>
              <span class="stats-kpi__metric metric">${stats.total}</span>
            </button>
          ` : `
            <div class="stats-kpi-card">
              <span class="stats-kpi__label">任务总数</span>
              <span class="stats-kpi__metric metric">${stats.total}</span>
            </div>
          `}
          ${stats.done > 0 ? `
            <button type="button" class="stats-kpi-card stats-kpi-card--clickable" data-kpi-click="done" title="查看已完成任务">
              <span class="stats-kpi__label">任务完成数</span>
              <span class="stats-kpi__metric metric stats-kpi__metric--brand">${stats.done}</span>
            </button>
          ` : `
            <div class="stats-kpi-card">
              <span class="stats-kpi__label">任务完成数</span>
              <span class="stats-kpi__metric metric stats-kpi__metric--brand">${stats.done}</span>
            </div>
          `}
          ${stats.terminated > 0 ? `
            <button type="button" class="stats-kpi-card stats-kpi-card--clickable" data-kpi-click="terminated" title="查看已终止任务">
              <span class="stats-kpi__label">终止任务数</span>
              <span class="stats-kpi__metric metric stats-kpi__metric--warning">${stats.terminated}</span>
            </button>
          ` : `
            <div class="stats-kpi-card">
              <span class="stats-kpi__label">终止任务数</span>
              <span class="stats-kpi__metric metric stats-kpi__metric--warning">${stats.terminated}</span>
            </div>
          `}
        </div>
      </div>

      <div class="stats-section-divider"></div>

      <div class="stats-trend-section">
        <div class="stats-chart-card">
          <div class="stats-chart-card__title">本周任务趋势</div>
          <div class="stats-chart-card__body">
            ${renderComboChart(weeklyData)}
          </div>
        </div>
      </div>
    `;

    // 范围切换
    el.querySelectorAll('[data-range]').forEach((btn) => {
      btn.addEventListener('click', () => {
        state.range = btn.dataset.range;
        if (state.range !== 'custom') {
          state.customStart = '';
          state.customEnd = '';
        }
        render();
      });
    });

    // 自定义日期输入
    const startInput = el.querySelector('#stats-custom-start');
    const endInput = el.querySelector('#stats-custom-end');
    const applyBtn = el.querySelector('#stats-custom-apply');
    if (startInput) {
      startInput.addEventListener('change', (e) => {
        state.customStart = e.target.value;
      });
    }
    if (endInput) {
      endInput.addEventListener('change', (e) => {
        state.customEnd = e.target.value;
      });
    }
    if (applyBtn) {
      applyBtn.addEventListener('click', () => {
        if (state.customStart && state.customEnd) {
          render();
        }
      });
    }

    // KPI卡片点击跳转（数值为0时不响应）
    el.querySelectorAll('[data-kpi-click]').forEach((card) => {
      card.addEventListener('click', () => {
        const filterType = card.dataset.kpiClick;
        // 逾期为全局口径，下钻不携带范围参数
        const rangeSuffix = filterType === 'overdue' ? '' : `&range=${state.range}`;
        window.location.hash = `#/tasks?filter=${filterType}${rangeSuffix}`;
      });
    });

    // 移动端开侧栏
    el.querySelector('#stats-menu-toggle').addEventListener('click', () => {
      window.dispatchEvent(new CustomEvent('wf-open-sidebar'));
    });

    // 图例点击切换显示
    el.querySelectorAll('.cmb-legend-item').forEach((item) => {
      item.addEventListener('click', () => {
        const key = item.dataset.series;
        if (state.hiddenSeries[key]) {
          delete state.hiddenSeries[key];
        } else {
          // 至少保留一个可见
          const visibleCount = SERIES_CONFIG.filter((s) => !state.hiddenSeries[s.key]).length;
          if (visibleCount <= 1) return;
          state.hiddenSeries[key] = true;
        }
        render();
      });
    });

    // 悬停显示 tooltip
    const tooltip = el.querySelector('#cmb-tooltip');
    const svgEl = el.querySelector('.combo-chart__svg');
    if (tooltip && svgEl) {
      el.querySelectorAll('.cmb-hover-target').forEach((target) => {
        target.addEventListener('mouseenter', (_e) => {
          const dayIdx = parseInt(target.dataset.day, 10);
          const d = weeklyData[dayIdx];
          if (!d) return;
          const visibleSeries = SERIES_CONFIG.filter((s) => !state.hiddenSeries[s.key]);
          let html = `<div class="cmb-tooltip__title">${d.label}（${d.dateLabel}）</div>`;
          visibleSeries.forEach((s) => {
            html += `
              <div class="cmb-tooltip__row">
                <span class="cmb-tooltip__dot" style="background:${s.color};"></span>
                <span class="cmb-tooltip__label">${s.label}</span>
                <span class="cmb-tooltip__value">${d[s.key]}</span>
              </div>
            `;
          });
          tooltip.innerHTML = html;
          tooltip.style.display = 'block';

          const svgRect = svgEl.getBoundingClientRect();
          const groupW = (svgRect.width - CHART_PAD_LEFT - CHART_PAD_RIGHT) / 7;
          const left = CHART_PAD_LEFT + dayIdx * groupW + groupW / 2;
          const tooltipRect = tooltip.getBoundingClientRect();
          let tooltipLeft = left - tooltipRect.width / 2;
          if (tooltipLeft < 4) tooltipLeft = 4;
          if (tooltipLeft + tooltipRect.width > svgRect.width - 4) {
            tooltipLeft = svgRect.width - tooltipRect.width - 4;
          }
          tooltip.style.left = tooltipLeft + 'px';
          tooltip.style.top = '8px';
        });
        target.addEventListener('mouseleave', () => {
          tooltip.style.display = 'none';
        });
      });
    }
  }

  // 订阅 store 变化
  const unsub = store.subscribe(() => {
    if (el.parentNode) {
      render();
    }
  });

  // 容器尺寸变化时同步趋势图参考宽度（viewBox 随内容区宽度伸缩）
  const resizeObserver = new ResizeObserver(() => {
    if (!el.isConnected) return;
    // 页面左右 padding 24×2 + 卡片左右 padding 16×2
    const w = Math.max(320, el.clientWidth - 80);
    if (Math.abs(w - chartW) > 32) {
      chartW = w;
      render();
    }
  });
  resizeObserver.observe(el);

  el._destroy = () => {
    unsub();
    resizeObserver.disconnect();
  };

  render();
  return el;
}
