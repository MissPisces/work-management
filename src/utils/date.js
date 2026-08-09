// date.js — Date utilities for the work management app

const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六'];

// 将任意日期输入规范化为本地时间的 Date 对象
// 关键修正：date-only ISO 字符串（如 "2026-08-07"）按 ECMAScript 规范会被 new Date()
// 解释为 UTC 午夜，在 UTC 之后的时区（如 America/Chicago UTC-5）用本地 getter 读取
// 会得到"前一天"。这里改用 new Date(y, m-1, d) 构造为本地时间，保证与 todayISO()
// 等用本地 getter 写入的字符串语义一致，跨时区显示正确。
// 支持输入：Date 实例 / "YYYY-MM-DD" / "YYYY-MM-DDTHH:mm" 等完整 ISO 串 / 时间戳
export function toDate(date) {
  if (date instanceof Date) return date;
  if (date == null || date === '') return null;
  const str = String(date);
  // date-only ISO：按本地时间构造，避免 UTC 解析陷阱
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    const [y, m, d] = str.split('-').map(Number);
    return new Date(y, m - 1, d);
  }
  // 完整 ISO / 其他格式：交给 Date 构造器（ES2015+ 无时区的 datetime 解析为本地）
  const parsed = new Date(str);
  return isNaN(parsed.getTime()) ? null : parsed;
}

// Format: "2026年7月9日 星期四"
export function formatLongDate(date) {
  const d = toDate(date);
  if (!d) return '—';
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日 星期${WEEKDAYS[d.getDay()]}`;
}

// Format: "7月8日"
export function formatShortDate(date) {
  const d = toDate(date);
  if (!d) return '—';
  return `${d.getMonth() + 1}月${d.getDate()}日`;
}

// Format: "2026-07-08" (ISO date, no time)
export function toISODate(date) {
  const d = date instanceof Date ? date : new Date(date);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// Parse "2026-07-08" -> Date
export function fromISODate(str) {
  if (!str) return null;
  const [y, m, d] = str.split('-').map(Number);
  return new Date(y, m - 1, d);
}

// "2026年7月" for calendar header
export function formatMonthYear(date) {
  const d = date instanceof Date ? date : new Date(date);
  return `${d.getFullYear()}年${d.getMonth() + 1}月`;
}

// Is same day
export function isSameDay(a, b) {
  return a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();
}

// Is today
export function isToday(date) {
  return isSameDay(date, new Date());
}

// Difference in days (positive if b is after a)
export function daysBetween(a, b) {
  const ms = 1000 * 60 * 60 * 24;
  const da = new Date(a.getFullYear(), a.getMonth(), a.getDate());
  const db = new Date(b.getFullYear(), b.getMonth(), b.getDate());
  return Math.round((db - da) / ms);
}

// Format relative time: "2小时前", "昨天 14:30", "7月3日 09:00"
export function formatRelativeTime(date) {
  const d = toDate(date);
  if (!d) return '—';
  const now = new Date();
  const diffMs = now - d;
  const diffHours = diffMs / (1000 * 60 * 60);
  const diffDays = daysBetween(d, now);

  if (diffHours < 1) {
    const mins = Math.max(1, Math.floor(diffMs / 60000));
    return `${mins}分钟前`;
  }
  if (diffHours < 24 && isSameDay(d, now)) {
    return `${Math.floor(diffHours)}小时前`;
  }
  if (diffDays === 1) {
    return `昨天 ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  }
  return `${formatShortDate(d)} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

// Format duration in days: "3天", "1天"
export function formatDuration(days) {
  if (days <= 0) return '今天';
  return `${days}天`;
}

// Get days ago count
export function daysAgo(date) {
  const d = date instanceof Date ? date : new Date(date);
  return Math.max(0, daysBetween(d, new Date()));
}

// 计算任务进行时长与超期信息（供主窗口任务表格与悬浮窗共用）
// 返回 { days, hasDeadline, isOverdue, overdueDays, remainingDays, level }
//   - days: 进行天数（已完成任务按"完成任务"日志日期，未完成按今天）
//   - hasDeadline: 是否设置截止日期
//   - isOverdue: 是否超期（未完成且非终止 && deadline 非空 && deadline < today）
//   - overdueDays: 超期天数（未超期为 0）
//   - remainingDays: 剩余天数（无截止日期或已超期为 null）
//   - level: 时钟颜色等级 'short' | 'mid' | 'long' | 'overdue'（超期优先）
export function getTaskDurationInfo(task) {
  const today = toISODate(new Date());
  const created = fromISODate(task.createdAt);
  let endDate;
  if (task.status === 'done') {
    const doneLog = [...task.logs].reverse().find((l) => l.text === '完成任务');
    endDate = doneLog ? fromISODate(doneLog.date) : new Date();
  } else {
    endDate = new Date();
  }
  const days = Math.max(1, daysBetween(created, endDate));

  const hasDeadline = !!task.deadline;
  const isOverdue = task.status !== 'done' && task.status !== 'terminated'
    && hasDeadline && task.deadline < today;
  const overdueDays = isOverdue
    ? daysBetween(fromISODate(task.deadline), new Date())
    : 0;
  const remainingDays = (hasDeadline && !isOverdue)
    ? daysBetween(new Date(), fromISODate(task.deadline))
    : null;

  let level;
  if (isOverdue) level = 'overdue';
  else if (days <= 30) level = 'short';
  else if (days <= 60) level = 'mid';
  else level = 'long';

  return { days, hasDeadline, isOverdue, overdueDays, remainingDays, level };
}

// Build calendar grid for a month (returns array of {date, isCurrentMonth} )
export function getCalendarDays(year, month) {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startWeekday = firstDay.getDay(); // 0=Sun
  const daysInMonth = lastDay.getDate();

  const days = [];
  // Prev month tail
  const prevLastDay = new Date(year, month, 0).getDate();
  for (let i = startWeekday - 1; i >= 0; i--) {
    days.push({ date: new Date(year, month - 1, prevLastDay - i), isCurrentMonth: false });
  }
  // Current month
  for (let i = 1; i <= daysInMonth; i++) {
    days.push({ date: new Date(year, month, i), isCurrentMonth: true });
  }
  // Next month head (fill to 42 cells = 6 weeks)
  const remaining = 42 - days.length;
  for (let i = 1; i <= remaining; i++) {
    days.push({ date: new Date(year, month + 1, i), isCurrentMonth: false });
  }
  return days;
}

export { WEEKDAYS };
