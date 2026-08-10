// WorkLogPage.js — 工作日志页面
// 包含：单栏卡片布局、自动记录与手动记录展示、手动日志添加弹窗、搜索与导出功能

import { store } from '../store.js';
import { icons } from '../utils/icons.js';
import {
  formatLongDate, toISODate, fromISODate,
} from '../utils/date.js';
import { getMonthCalendar, getMonthLabel, getLunarYearLabel } from '../utils/lunar.js';

export function createWorkLogPage() {
  const today = new Date();
  const state = {
    currentDate: toISODate(today),
    search: '',
    calYear: today.getFullYear(),
    calMonth: today.getMonth() + 1,
  };

  const el = document.createElement('div');
  el.className = 'wl-page-container';

  function getAllDates() {
    // 收集所有有日志的日期：直接复用 store 的统一聚合方法
    const dates = new Set(store.getAllLogDates());
    dates.add(state.currentDate);
    return [...dates].sort();
  }

  function getAutoRecords(date) {
    const autoRecords = [];
    store.getTasks().forEach((t) => {
      t.logs.forEach((l) => {
        if (l.date !== date) return;
        if (l.text === '完成任务') {
          autoRecords.push({ ...l, taskName: t.name, taskStatus: t.status, type: 'task' });
        } else if (l.text.startsWith('完成子任务')) {
          // 解析子任务名称
          const match = l.text.match(/^完成子任务「(.+)」$/);
          const subtaskName = match ? match[1] : l.text;
          autoRecords.push({ ...l, taskName: t.name, taskStatus: t.status, subtaskName, type: 'subtask' });
        }
      });
    });
    autoRecords.sort((a, b) => (a.time || '').localeCompare(b.time || ''));
    return autoRecords;
  }

  function render() {
    const dateObj = fromISODate(state.currentDate);
    const log = store.getWorkLog(state.currentDate);

    // 自动记录与手动记录
    let autoRecords = getAutoRecords(state.currentDate);
    let manualEntries = log.manualEntries.slice();

    // 搜索过滤：搜索所有日期的日志
    if (state.search) {
      const q = state.search.toLowerCase();
      const allDates = getAllDates();
      autoRecords = [];
      manualEntries = [];
      allDates.forEach((date) => {
        const dateAuto = getAutoRecords(date);
        dateAuto.forEach((r) => {
          if (r.text.toLowerCase().includes(q) || (r.taskName && r.taskName.toLowerCase().includes(q))) {
            autoRecords.push({ ...r, _date: date });
          }
        });
        const dateLog = store.getWorkLog(date);
        dateLog.manualEntries.forEach((e) => {
          if (e.text.toLowerCase().includes(q)) {
            manualEntries.push({ ...e, _date: date });
          }
        });
      });
    }

    const todayObj = new Date();
    const todayStr = toISODate(todayObj);
    const todayYear = todayObj.getFullYear();
    const todayMonth = todayObj.getMonth() + 1;
    const isCurrentDay = state.currentDate === todayStr;
    const isMaxMonth = state.calYear > todayYear || (state.calYear === todayYear && state.calMonth >= todayMonth);

    el.innerHTML = `
      <div class="wl-page-header">
        <button class="wf-menu-toggle-btn" id="wl-menu-toggle">${icons.menu}</button>
        <button class="wl-btn wl-btn--primary" id="wl-add-log-btn">
          <span style="font-size:16px;line-height:1;margin-right:2px;">+</span> 添加日志
        </button>
        <div class="wl-search-wrapper">
          <span class="wl-search-icon">${icons.search}</span>
          <input type="text" class="wl-search-input" id="wl-log-search" placeholder="搜索日志..." />
        </div>
      </div>

      <div class="wl-date-nav">
        <div class="wl-date-nav__center">
          <span class="wl-date-nav__date">${formatLongDate(dateObj)}</span>
          ${isCurrentDay ? `
            <span class="wl-date-nav__badge">今天</span>
          ` : `
            <button class="wl-date-nav__badge wl-date-nav__badge--back" id="wl-back-today" title="点击一键返回今天">← 返回今天</button>
          `}
        </div>
        <button class="wl-export-btn" id="wl-export-btn" style="display:inline-flex;align-items:center;gap:4px;">
          <span style="display:inline-flex;width:14px;height:14px;color:var(--text-secondary);">${icons.download}</span> 导出日志
        </button>
      </div>

      <div class="wl-main-layout">
        <div class="wl-calendar-sidebar">
          <div class="wl-calendar">
            <div class="wl-calendar__header">
              <button class="wl-calendar__nav-btn" id="wl-cal-prev" title="上个月">${icons.chevronLeft || '<'}</button>
              <div class="wl-calendar__title">
                <span class="wl-calendar__month-label">${getMonthLabel(state.calYear, state.calMonth)}</span>
                <span class="wl-calendar__lunar-label">${getLunarYearLabel(state.calYear, state.calMonth, 1)}</span>
              </div>
              <button class="wl-calendar__nav-btn" id="wl-cal-next" title="下个月" ${isMaxMonth ? 'disabled' : ''}>${icons.chevronRight || '>'}</button>
            </div>
            <div class="wl-calendar__weekdays">
              <span class="wl-calendar__weekday">一</span>
              <span class="wl-calendar__weekday">二</span>
              <span class="wl-calendar__weekday">三</span>
              <span class="wl-calendar__weekday">四</span>
              <span class="wl-calendar__weekday">五</span>
              <span class="wl-calendar__weekday wl-calendar__weekday--weekend">六</span>
              <span class="wl-calendar__weekday wl-calendar__weekday--weekend">日</span>
            </div>
            <div class="wl-calendar__grid" id="wl-cal-grid">
              ${getMonthCalendar(state.calYear, state.calMonth).map((cell) => {
                const isFuture = cell.date > todayStr;
                return `
                  <div class="wl-calendar__cell ${cell.isToday ? 'is-today' : ''} ${cell.date === state.currentDate ? 'is-selected' : ''} ${cell.isCurrentMonth ? '' : 'is-out'} ${cell.festival ? 'is-festival' : ''} ${isFuture ? 'is-future' : ''}" data-date="${cell.date}">
                    <span class="wl-calendar__day">${cell.day}</span>
                    <span class="wl-calendar__lunar">${cell.lunarShort}</span>
                  </div>
                `;
              }).join('')}
            </div>
            <div class="wl-calendar__legend">
              <span class="wl-calendar__legend-item"><span class="wl-calendar__legend-dot wl-calendar__legend-dot--today"></span>今天</span>
              <span class="wl-calendar__legend-item"><span class="wl-calendar__legend-dot wl-calendar__legend-dot--festival"></span>节日</span>
            </div>
          </div>
        </div>

        <div class="wl-card">
        <!-- 自动记录 -->
        <div class="wl-section">
          <div class="wl-section-header">
            <span class="wl-section-title"><span style="display:inline-flex;width:14px;height:14px;margin-right:6px;vertical-align:middle;color:var(--text-secondary);">${icons.clock}</span> 自动记录 (已完成任务/子任务)</span>
            <span class="wl-section-count">${autoRecords.length} 项</span>
          </div>
          <div class="wl-list">
            ${autoRecords.length === 0 ? `
              <div class="wl-auto-empty">${state.search ? '未找到匹配的日志' : '今日暂无自动记录，任务完成后将自动呈现在这里'}</div>
            ` : autoRecords.map((r) => `
              <div class="wl-auto-item">
                <div class="wl-auto-item__check">${icons.check}</div>
                <div class="wl-auto-item__body">
                  <div class="wl-auto-item__text wl-auto-item__text--done">${r.type === 'subtask' ? escapeHtml(r.subtaskName) : escapeHtml(r.taskName)}</div>
                  ${r.type === 'subtask' ? `<span class="wl-auto-item__sub">子任务 · 所属：${escapeHtml(r.taskName)}</span>` : ''}
                  ${r._date ? `<span style="font-size:12px;color:var(--text-tertiary);white-space:nowrap;">${r._date}</span>` : ''}
                </div>
                <div class="wl-auto-item__indicator"></div>
              </div>
            `).join('')}
          </div>
        </div>

        <div class="wl-divider"></div>

        <!-- 手动记录 -->
        <div class="wl-section">
          <div class="wl-section-header">
            <span class="wl-section-title"><span style="display:inline-flex;width:14px;height:14px;margin-right:6px;vertical-align:middle;color:var(--text-secondary);">${icons.tasks}</span> 手动记录</span>
          </div>
          <div class="wl-list" style="margin-top:12px;">
            <div class="wl-manual-entries">
              ${manualEntries.length === 0 ? `
                <div class="wl-auto-empty">${state.search ? '未找到匹配的日志' : '今日暂无手动记录，点击左上方「添加日志」开始记录'}</div>
              ` : manualEntries.map((e) => `
                <div class="wl-manual-entry">
                  <span class="wl-manual-entry__time">${e.time}</span>
                  <span class="wl-manual-entry__text">${escapeHtml(e.text)}</span>
                  ${e._date ? `<span style="font-size:12px;color:var(--text-tertiary);white-space:nowrap;">${e._date}</span>` : ''}
                  <button class="wl-manual-entry__del" data-id="${e.id}" data-date="${e._date || state.currentDate}" title="删除">${icons.trash}</button>
                </div>
              `).join('')}
            </div>
          </div>
        </div>
        </div>
      </div>
    `;

    // 绑定值
    el.querySelector('#wl-log-search').value = state.search;

    // 返回今天
    const backTodayBtn = el.querySelector('#wl-back-today');
    if (backTodayBtn) {
      backTodayBtn.addEventListener('click', () => {
        state.currentDate = todayStr;
        state.calYear = todayYear;
        state.calMonth = todayMonth;
        render();
      });
    }

    // 导出日志
    el.querySelector('#wl-export-btn').addEventListener('click', () => {
      openExportModal();
    });

    // 月历导航
    el.querySelector('#wl-cal-prev').addEventListener('click', () => {
      state.calMonth--;
      if (state.calMonth < 1) {
        state.calMonth = 12;
        state.calYear--;
      }
      render();
    });
    el.querySelector('#wl-cal-next').addEventListener('click', () => {
      if (isMaxMonth) return;
      state.calMonth++;
      if (state.calMonth > 12) {
        state.calMonth = 1;
        state.calYear++;
      }
      render();
    });

    // 月历日期点击：切换查看该日期的日志（未来日期禁止点击）
    el.querySelectorAll('.wl-calendar__cell[data-date]').forEach((cell) => {
      cell.addEventListener('click', () => {
        if (cell.dataset.date > todayStr) return;
        state.currentDate = cell.dataset.date;
        render();
      });
    });

    // 添加日志弹窗
    el.querySelector('#wl-add-log-btn').addEventListener('click', () => {
      openAddLogModal();
    });

    // 搜索
    el.querySelector('#wl-log-search').addEventListener('input', (e) => {
      state.search = e.target.value.trim();
      renderContentOnly();
    });

    // 删除手动日志
    el.querySelectorAll('.wl-manual-entry__del').forEach((btn) => {
      btn.addEventListener('click', (ev) => {
        ev.stopPropagation();
        const entryId = btn.dataset.id;
        if (confirm('确认删除此条日志？')) {
          store.deleteManualEntry(state.currentDate, entryId);
        }
      });
    });

    // 移动端开菜单
    el.querySelector('#wl-menu-toggle').addEventListener('click', () => {
      window.dispatchEvent(new CustomEvent('wf-open-sidebar'));
    });
  }

  function renderContentOnly() {
    const log = store.getWorkLog(state.currentDate);
    let autoRecords = getAutoRecords(state.currentDate);
    let manualEntries = log.manualEntries.slice();

    if (state.search) {
      const q = state.search.toLowerCase();
      const allDates = getAllDates();
      autoRecords = [];
      manualEntries = [];
      allDates.forEach((date) => {
        const dateAuto = getAutoRecords(date);
        dateAuto.forEach((r) => {
          if (r.text.toLowerCase().includes(q) || (r.taskName && r.taskName.toLowerCase().includes(q))) {
            autoRecords.push({ ...r, _date: date });
          }
        });
        const dateLog = store.getWorkLog(date);
        dateLog.manualEntries.forEach((e) => {
          if (e.text.toLowerCase().includes(q)) {
            manualEntries.push({ ...e, _date: date });
          }
        });
      });
    }

    const cards = el.querySelector('.wl-card');
    cards.innerHTML = `
      <!-- 自动记录 -->
      <div class="wl-section">
        <div class="wl-section-header">
          <span class="wl-section-title"><span style="display:inline-flex;width:14px;height:14px;margin-right:6px;vertical-align:middle;color:var(--text-secondary);">${icons.clock}</span> 自动记录 (已完成任务/子任务)</span>
            <span class="wl-section-count">${autoRecords.length} 项</span>
          </div>
          <div class="wl-list">
            ${autoRecords.length === 0 ? `
              <div class="wl-auto-empty">${state.search ? '未找到匹配的日志' : '今日暂无自动记录，任务完成后将自动呈现在这里'}</div>
            ` : autoRecords.map((r) => `
              <div class="wl-auto-item">
                <div class="wl-auto-item__check">${icons.check}</div>
                <div class="wl-auto-item__body">
                  <div class="wl-auto-item__text wl-auto-item__text--done">${r.type === 'subtask' ? escapeHtml(r.subtaskName) : escapeHtml(r.taskName)}</div>
                  ${r.type === 'subtask' ? `<span class="wl-auto-item__sub">子任务 · 所属：${escapeHtml(r.taskName)}</span>` : ''}
                  ${r._date ? `<span style="font-size:12px;color:var(--text-tertiary);white-space:nowrap;">${r._date}</span>` : ''}
                </div>
                <div class="wl-auto-item__indicator"></div>
              </div>
            `).join('')}
          </div>
      </div>

      <div class="wl-divider"></div>

      <!-- 手动记录 -->
      <div class="wl-section">
        <div class="wl-section-header">
          <span class="wl-section-title"><span style="display:inline-flex;width:14px;height:14px;margin-right:6px;vertical-align:middle;color:var(--text-secondary);">${icons.tasks}</span> 手动记录</span>
        </div>
        <div class="wl-list" style="margin-top:12px;">
          <div class="wl-manual-entries">
            ${manualEntries.length === 0 ? `
              <div class="wl-auto-empty">${state.search ? '未找到匹配的日志' : '今日暂无手动记录，点击左上方「添加日志」开始记录'}</div>
            ` : manualEntries.map((e) => `
              <div class="wl-manual-entry">
                <span class="wl-manual-entry__time">${e.time}</span>
                <span class="wl-manual-entry__text">${escapeHtml(e.text)}</span>
                ${e._date ? `<span style="font-size:12px;color:var(--text-tertiary);white-space:nowrap;">${e._date}</span>` : ''}
                <button class="wl-manual-entry__del" data-id="${e.id}" data-date="${e._date || state.currentDate}" title="删除">${icons.trash}</button>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    `;

    // 重新绑定删除事件
    cards.querySelectorAll('.wl-manual-entry__del').forEach((btn) => {
      btn.addEventListener('click', (ev) => {
        ev.stopPropagation();
        const entryId = btn.dataset.id;
        const entryDate = btn.dataset.date || state.currentDate;
        if (confirm('确认删除此条日志？')) {
          store.deleteManualEntry(entryDate, entryId);
        }
      });
    });
  }

  function openAddLogModal() {
    const todayObj = new Date();
    const todayStr = toISODate(todayObj);
    const todayYear = todayObj.getFullYear();
    const todayMonth = todayObj.getMonth() + 1;
    const todayDay = todayObj.getDate();
    const isRetro = state.currentDate < todayStr;
    const retroTagText = `${todayYear}年${todayMonth}月${todayDay}日补录`;

    const backdrop = document.createElement('div');
    backdrop.className = 'modal-backdrop';

    const modal = document.createElement('div');
    modal.className = 'ct-modal';
    modal.style.maxWidth = '400px';

    const now = new Date();
    const defaultTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    modal.innerHTML = `
      <div class="ct-modal__header">
        <div class="ct-modal__title">添加工作日志</div>
        <button class="ct-modal__close" id="wl-close-modal">${icons.close}</button>
      </div>
      <div class="ct-modal__body">
        ${isRetro ? `
          <div style="font-size:12px;color:var(--text-brand,#4b3fe3);background:rgba(75,63,227,0.06);padding:8px 12px;border-radius:6px;margin-bottom:14px;line-height:1.5;">
            💡 当前正在为历史日期（${state.currentDate}）补录日志，提交后将自动加注“${retroTagText}”。
          </div>
        ` : ''}
        <div class="ct-field">
          <label class="ct-label">记录时间 <span style="color:var(--status-error-default)">*</span></label>
          <div class="ct-input">
            <input type="time" id="wl-log-time" value="${defaultTime}" />
          </div>
        </div>
        <div class="ct-field">
          <label class="ct-label">工作内容 <span style="color:var(--status-error-default)">*</span></label>
          <div class="ct-input">
            <input type="text" id="wl-log-content" placeholder="记录你完成的工作..." maxlength="100" />
          </div>
        </div>
      </div>
      <div class="ct-modal__footer" style="justify-content: flex-end; gap: 8px;">
        <button class="ct-btn ct-btn--cancel" id="wl-cancel-modal">取消</button>
        <button class="ct-btn ct-btn--primary" id="wl-submit-modal">添加</button>
      </div>
    `;

    backdrop.appendChild(modal);
    document.body.appendChild(backdrop);

    const close = () => {
      backdrop.remove();
    };

    modal.querySelector('#wl-close-modal').addEventListener('click', close);
    modal.querySelector('#wl-cancel-modal').addEventListener('click', close);
    backdrop.addEventListener('click', (e) => { if (e.target === backdrop) close(); });

    modal.querySelector('#wl-submit-modal').addEventListener('click', () => {
      const time = modal.querySelector('#wl-log-time').value;
      let text = modal.querySelector('#wl-log-content').value.trim();
      if (!text) {
        modal.querySelector('#wl-log-content').focus();
        return;
      }
      if (isRetro && !/（\d{4}年\d{1,2}月\d{1,2}日补录）$/.test(text)) {
        text += ` （${retroTagText}）`;
      }
      store.addManualEntry(state.currentDate, time, text);
      close();
    });

    setTimeout(() => modal.querySelector('#wl-log-content').focus(), 100);
  }

  function openExportModal() {
    const todayISO = toISODate(new Date());
    // 默认导出范围：最近 7 天
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);

    const backdrop = document.createElement('div');
    backdrop.className = 'modal-backdrop';

    const modal = document.createElement('div');
    modal.className = 'ct-modal';
    modal.style.maxWidth = '440px';

    modal.innerHTML = `
      <div class="ct-modal__header">
        <div class="ct-modal__title">导出工作日志</div>
        <button class="ct-modal__close" id="wl-export-close">${icons.close}</button>
      </div>
      <div class="ct-modal__body">
        <div class="wl-export-hint">选择要导出的时间范围，支持跨多天导出。</div>
        <div class="wl-export-range">
          <div class="ct-field">
            <label class="ct-label">开始日期 <span style="color:var(--status-error-default)">*</span></label>
            <div class="ct-input">
              <input type="date" id="wl-export-start" value="${toISODate(sevenDaysAgo)}" max="${todayISO}" />
            </div>
          </div>
          <div class="ct-export-arrow">→</div>
          <div class="ct-field">
            <label class="ct-label">结束日期 <span style="color:var(--status-error-default)">*</span></label>
            <div class="ct-input">
              <input type="date" id="wl-export-end" value="${todayISO}" max="${todayISO}" />
            </div>
          </div>
        </div>
        <div class="wl-export-presets">
          <button type="button" class="wl-export-preset" data-preset="today">今天</button>
          <button type="button" class="wl-export-preset" data-preset="week">最近7天</button>
          <button type="button" class="wl-export-preset" data-preset="month">最近30天</button>
          <button type="button" class="wl-export-preset" data-preset="all">全部</button>
        </div>
        <div class="wl-export-error" id="wl-export-error"></div>
        <div class="wl-export-status" id="wl-export-status"></div>
      </div>
      <div class="ct-modal__footer" style="justify-content: flex-end; gap: 8px;">
        <button class="ct-btn ct-btn--cancel" id="wl-export-cancel">取消</button>
        <button class="ct-btn ct-btn--primary" id="wl-export-confirm">
          <span id="wl-export-confirm-text">确认导出</span>
        </button>
      </div>
    `;

    backdrop.appendChild(modal);
    document.body.appendChild(backdrop);

    const close = () => backdrop.remove();
    const $start = modal.querySelector('#wl-export-start');
    const $end = modal.querySelector('#wl-export-end');
    const $err = modal.querySelector('#wl-export-error');
    const $status = modal.querySelector('#wl-export-status');
    const $confirm = modal.querySelector('#wl-export-confirm');
    const $confirmText = modal.querySelector('#wl-export-confirm-text');

    modal.querySelector('#wl-export-close').addEventListener('click', close);
    modal.querySelector('#wl-export-cancel').addEventListener('click', close);
    backdrop.addEventListener('click', (e) => { if (e.target === backdrop) close(); });

    // 预设按钮
    modal.querySelectorAll('.wl-export-preset').forEach((btn) => {
      btn.addEventListener('click', () => {
        const preset = btn.dataset.preset;
        const end = new Date();
        let start = new Date();
        if (preset === 'today') {
          // start = end
        } else if (preset === 'week') {
          start.setDate(end.getDate() - 6);
        } else if (preset === 'month') {
          start.setDate(end.getDate() - 29);
        } else if (preset === 'all') {
          // 全部：从最早有日志的日期开始
          const allDates = getAllDates();
          if (allDates.length > 0) {
            start = fromISODate(allDates[0]);
          }
        }
        $start.value = toISODate(start);
        $end.value = toISODate(end);
        $err.textContent = '';
      });
    });

    // 输入变化时清除错误
    [$start, $end].forEach(($i) => {
      $i.addEventListener('change', () => { $err.textContent = ''; });
    });

    modal.querySelector('#wl-export-confirm').addEventListener('click', () => {
      const startVal = $start.value;
      const endVal = $end.value;

      // 校验
      if (!startVal || !endVal) {
        $err.textContent = '请选择开始日期和结束日期';
        return;
      }
      if (startVal > endVal) {
        $err.textContent = '开始日期不能晚于结束日期';
        return;
      }

      // 禁用按钮，显示导出中
      $confirm.disabled = true;
      $confirmText.textContent = '导出中...';
      $err.textContent = '';
      $status.textContent = '正在生成日志文件...';

      // 用 setTimeout 让 UI 有机会刷新
      setTimeout(() => {
        try {
          const result = doExport(startVal, endVal);
          $status.textContent = `导出成功：共 ${result.days} 天，${result.count} 条记录`;
          setTimeout(() => {
            close();
          }, 800);
        } catch (e) {
          $status.textContent = '';
          $err.textContent = '导出失败：' + (e.message || '未知错误');
          $confirm.disabled = false;
          $confirmText.textContent = '确认导出';
        }
      }, 50);
    });

    function doExport(startISO, endISO) {
      // 收集范围内的所有日期（降序：最近的天在前）
      const allDates = getAllDates().filter((d) => d >= startISO && d <= endISO);
      // 降序排列：最近的日期在前
      allDates.sort((a, b) => (a < b ? 1 : a > b ? -1 : 0));

      let text = `工作日志导出\n`;
      text += `时间范围：${startISO} 至 ${endISO}\n`;
      text += `${'='.repeat(50)}\n\n`;

      let totalEntries = 0;
      let daysWithLogs = 0;

      if (allDates.length === 0) {
        text += '（所选范围内无日志记录）\n';
      } else {
        allDates.forEach((date) => {
          const dateObj = fromISODate(date);
          const log = store.getWorkLog(date);
          const autoRecords = getAutoRecords(date);
          // 天内按时间正序排（getAutoRecords 已排，manualEntries 在此排序）
          const manual = log.manualEntries.slice().sort((a, b) => (a.time || '').localeCompare(b.time || ''));
          const hasContent = autoRecords.length > 0 || manual.length > 0;

          text += `【${formatLongDate(dateObj)}】\n`;
          text += `-`.repeat(40) + '\n';

          if (!hasContent) {
            text += '（无记录）\n\n';
            return;
          }

          daysWithLogs++;
          if (autoRecords.length > 0) {
            text += `自动记录：\n`;
            autoRecords.forEach((r) => {
              const label = r.type === 'subtask' ? `${r.taskName} / ${r.subtaskName}` : r.taskName;
              text += `  ${r.time}  ${label}\n`;
              totalEntries++;
            });
          }
          if (manual.length > 0) {
            if (autoRecords.length > 0) text += '\n';
            text += `手动记录：\n`;
            manual.forEach((e) => {
              text += `  ${e.time}  ${e.text}\n`;
              totalEntries++;
            });
          }
          text += '\n';
        });
      }

      text += `${'='.repeat(50)}\n`;
      text += `共 ${daysWithLogs} 天有记录，合计 ${totalEntries} 条\n`;

      // 生成文件名：范围_开始_结束.txt
      const filename = `工作日志_${startISO}_至_${endISO}.txt`;
      const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);

      return { days: daysWithLogs, count: totalEntries };
    }
  }

  // 订阅 store 变化
  const unsub = store.subscribe(() => {
    if (el.parentNode) {
      renderContentOnly();
    }
  });

  // 监听其他窗口的 localStorage 变化（悬浮窗勾选子任务等）
  // loadFromStorage 会自动触发订阅者刷新 renderContentOnly，无需在此手动调用
  const onStorage = (e) => {
    if (e.key === 'wf-work-management-v1' && e.newValue) {
      store.loadFromStorage(e.newValue);
    }
  };
  window.addEventListener('storage', onStorage);

  el._destroy = () => {
    unsub();
    window.removeEventListener('storage', onStorage);
  };

  render();
  return el;
}

function escapeHtml(s) {
  return String(s || '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}
