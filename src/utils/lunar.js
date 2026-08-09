// lunar.js — 农历转换与节日数据
// 底层使用成熟的 lunar-javascript 库（6tail 出品，无第三方依赖），
// 覆盖公历↔农历互转、二十四节气、天干地支、生肖、传统节日等，准确可靠。

import { Solar } from 'lunar-javascript';

// ─── 工具函数 ─────────────────────────────────────────────

// 闰年判断
function isLeapYear(year) {
  return (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
}

// 获取公历某月天数
function getSolarDays(year, month) {
  const days = [31, isLeapYear(year) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  return days[month - 1];
}

// 缓存 Solar 对象（同一天多次调用时避免重复构造）
const solarCache = new Map();
function getSolar(year, month, day) {
  const key = `${year}-${month}-${day}`;
  let s = solarCache.get(key);
  if (!s) {
    s = Solar.fromYmd(year, month, day);
    solarCache.set(key, s);
    // 控制缓存上限，避免长期运行内存膨胀
    if (solarCache.size > 400) {
      const firstKey = solarCache.keys().next().value;
      solarCache.delete(firstKey);
    }
  }
  return s;
}

// 公历转农历
// 返回: { year, month, day, isLeap, monthName, dayName, yearName, zodiac }
export function solarToLunar(year, month, day) {
  try {
    const solar = getSolar(year, month, day);
    const lunar = solar.getLunar();
    const rawMonth = lunar.getMonth(); // 闰月为负数，如 -11 表示闰冬月
    const isLeap = rawMonth < 0;
    const lunarMonth = Math.abs(rawMonth);

    return {
      year: lunar.getYear(),
      month: lunarMonth,
      day: lunar.getDay(),
      isLeap,
      monthName: lunar.getMonthInChinese() + '月', // 如"正月"、"腊月"、"闰腊月"
      dayName: lunar.getDayInChinese(),             // 如"初一"
      yearName: lunar.getYearInGanZhi() + '年',     // 如"丙午年"
      zodiac: lunar.getYearShengXiao(),             // 如"马"
    };
  } catch (e) {
    return null;
  }
}

// 获取某天的节日（返回字符串或 null）
// 综合：公历节日 + 农历节日 + 节气（清明既是节气又是节日）
export function getFestival(year, month, day) {
  try {
    const solar = getSolar(year, month, day);
    const lunar = solar.getLunar();

    // 公历节日
    const solarFestivals = solar.getFestivals();
    if (solarFestivals.length > 0) return solarFestivals[0];

    // 农历节日
    const lunarFestivals = lunar.getFestivals();
    if (lunarFestivals.length > 0) return lunarFestivals[0];

    // 节气（清明等）
    const jieqi = lunar.getJieQi();
    if (jieqi) return jieqi;

    return null;
  } catch (e) {
    return null;
  }
}

// 获取农历简称（用于月历单元格，如"初一"、"春节"、"清明"、"正月"）
export function getLunarShort(year, month, day) {
  try {
    const solar = getSolar(year, month, day);
    const lunar = solar.getLunar();

    // 优先显示节日
    const solarFestivals = solar.getFestivals();
    if (solarFestivals.length > 0) return solarFestivals[0];

    const lunarFestivals = lunar.getFestivals();
    if (lunarFestivals.length > 0) return lunarFestivals[0];

    // 节气（如清明、立春）
    const jieqi = lunar.getJieQi();
    if (jieqi) return jieqi;

    // 初一显示月名
    if (lunar.getDay() === 1) {
      return lunar.getMonthInChinese() + '月';
    }
    return lunar.getDayInChinese();
  } catch (e) {
    return '';
  }
}

// 获取月历数据
// 返回: [{ date, day, lunarShort, isToday, isCurrentMonth, festival }]
export function getMonthCalendar(year, month) {
  const firstDay = new Date(year, month - 1, 1);
  const firstDayWeek = firstDay.getDay();
  const startOffset = firstDayWeek === 0 ? 6 : firstDayWeek - 1;

  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  const cells = [];
  // 上月填充
  const prevMonth = month - 1;
  const prevYear = prevMonth === 0 ? year - 1 : year;
  const prevMonthAdjusted = prevMonth === 0 ? 12 : prevMonth;
  const prevMonthDays = getSolarDays(prevYear, prevMonthAdjusted);

  for (let i = startOffset - 1; i >= 0; i--) {
    const d = prevMonthDays - i;
    const dateStr = `${prevYear}-${String(prevMonthAdjusted).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    cells.push({
      date: dateStr,
      day: d,
      lunarShort: getLunarShort(prevYear, prevMonthAdjusted, d),
      isToday: dateStr === todayStr,
      isCurrentMonth: false,
      festival: getFestival(prevYear, prevMonthAdjusted, d),
    });
  }

  // 当月
  const monthDays = getSolarDays(year, month);
  for (let d = 1; d <= monthDays; d++) {
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    cells.push({
      date: dateStr,
      day: d,
      lunarShort: getLunarShort(year, month, d),
      isToday: dateStr === todayStr,
      isCurrentMonth: true,
      festival: getFestival(year, month, d),
    });
  }

  // 下月填充（补满42格=6周）
  const nextMonth = month + 1;
  const nextYear = nextMonth === 13 ? year + 1 : year;
  const nextMonthAdjusted = nextMonth === 13 ? 1 : nextMonth;
  let nextDay = 1;
  while (cells.length < 42) {
    const dateStr = `${nextYear}-${String(nextMonthAdjusted).padStart(2, '0')}-${String(nextDay).padStart(2, '0')}`;
    cells.push({
      date: dateStr,
      day: nextDay,
      lunarShort: getLunarShort(nextYear, nextMonthAdjusted, nextDay),
      isToday: dateStr === todayStr,
      isCurrentMonth: false,
      festival: getFestival(nextYear, nextMonthAdjusted, nextDay),
    });
    nextDay++;
  }

  return cells;
}

// 获取月份的中文表示
export function getMonthLabel(year, month) {
  return `${year}年${month}月`;
}

// 获取农历年名（如"丙午年（马年）"）
export function getLunarYearLabel(year, month, day) {
  const lunar = solarToLunar(year, month, day);
  if (!lunar) return '';
  return `${lunar.yearName}（${lunar.zodiac}年）`;
}
