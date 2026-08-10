import { describe, test, expect } from 'vitest';
import {
  toDate,
  formatLongDate,
  formatShortDate,
  toISODate,
  fromISODate,
  isSameDay,
  daysBetween,
  formatDuration,
  getCalendarDays,
  WEEKDAYS,
} from './date.js';

describe('date.js - 日期工具函数', () => {
  describe('toDate', () => {
    test('date-only ISO 字符串解析为本地时间（非UTC）', () => {
      const d = toDate('2026-08-10');
      expect(d).toBeInstanceOf(Date);
      expect(d.getFullYear()).toBe(2026);
      expect(d.getMonth()).toBe(7); // 8月 = 索引7
      expect(d.getDate()).toBe(10);
      expect(d.getHours()).toBe(0); // 本地午夜
    });

    test('Date 实例原样返回', () => {
      const original = new Date(2026, 7, 10);
      expect(toDate(original)).toBe(original);
    });

    test('null 和空字符串返回 null', () => {
      expect(toDate(null)).toBeNull();
      expect(toDate('')).toBeNull();
      expect(toDate(undefined)).toBeNull();
    });

    test('无效字符串返回 null', () => {
      expect(toDate('invalid-date')).toBeNull();
    });

    test('完整 ISO datetime 字符串正常解析', () => {
      const d = toDate('2026-08-10T14:30');
      expect(d.getFullYear()).toBe(2026);
      expect(d.getMonth()).toBe(7);
      expect(d.getDate()).toBe(10);
      expect(d.getHours()).toBe(14);
      expect(d.getMinutes()).toBe(30);
    });
  });

  describe('formatLongDate', () => {
    test('格式化为"2026年8月10日 星期一"', () => {
      expect(formatLongDate('2026-08-10')).toBe('2026年8月10日 星期一');
    });

    test('无效输入返回"—"', () => {
      expect(formatLongDate(null)).toBe('—');
      expect(formatLongDate('')).toBe('—');
    });
  });

  describe('formatShortDate', () => {
    test('格式化为"8月10日"', () => {
      expect(formatShortDate('2026-08-10')).toBe('8月10日');
    });

    test('无效输入返回"—"', () => {
      expect(formatShortDate(null)).toBe('—');
    });
  });

  describe('toISODate', () => {
    test('Date 对象转 ISO 字符串', () => {
      expect(toISODate(new Date(2026, 7, 10))).toBe('2026-08-10');
    });

    test('月份和日期补零', () => {
      expect(toISODate(new Date(2026, 0, 5))).toBe('2026-01-05');
    });
  });

  describe('fromISODate', () => {
    test('ISO 字符串转 Date（本地时间）', () => {
      const d = fromISODate('2026-08-10');
      expect(d.getFullYear()).toBe(2026);
      expect(d.getMonth()).toBe(7);
      expect(d.getDate()).toBe(10);
    });

    test('空输入返回 null', () => {
      expect(fromISODate('')).toBeNull();
      expect(fromISODate(null)).toBeNull();
    });
  });

  describe('isSameDay', () => {
    test('同一天返回 true', () => {
      expect(isSameDay(new Date(2026, 7, 10), new Date(2026, 7, 10))).toBe(true);
    });

    test('不同天返回 false', () => {
      expect(isSameDay(new Date(2026, 7, 10), new Date(2026, 7, 11))).toBe(false);
    });
  });

  describe('daysBetween', () => {
    test('b 在 a 之后返回正数', () => {
      expect(daysBetween(new Date(2026, 7, 1), new Date(2026, 7, 10))).toBe(9);
    });

    test('b 在 a 之前返回负数', () => {
      expect(daysBetween(new Date(2026, 7, 10), new Date(2026, 7, 1))).toBe(-9);
    });

    test('同一天返回 0', () => {
      expect(daysBetween(new Date(2026, 7, 10), new Date(2026, 7, 10))).toBe(0);
    });
  });

  describe('formatDuration', () => {
    test('0天返回"今天"', () => {
      expect(formatDuration(0)).toBe('今天');
    });

    test('负数返回"今天"', () => {
      expect(formatDuration(-1)).toBe('今天');
    });

    test('正数返回"X天"', () => {
      expect(formatDuration(1)).toBe('1天');
      expect(formatDuration(30)).toBe('30天');
    });
  });

  describe('getCalendarDays', () => {
    test('返回42个日期格子（6周）', () => {
      const days = getCalendarDays(2026, 7); // 2026年8月
      expect(days).toHaveLength(42);
    });

    test('当月日期标记为 isCurrentMonth=true', () => {
      const days = getCalendarDays(2026, 7);
      const currentMonthDays = days.filter((d) => d.isCurrentMonth);
      expect(currentMonthDays).toHaveLength(31); // 8月有31天
    });

    test('第一个格子是周日开始的周', () => {
      const days = getCalendarDays(2026, 7); // 2026年8月1日是周六
      // 8月1日是周六（getDay=6），所以日历从7月26日（周日）开始
      expect(days[0].date.getDate()).toBe(26);
      expect(days[0].date.getMonth()).toBe(6); // 7月
    });
  });

  describe('WEEKDAYS', () => {
    test('包含7个星期名称', () => {
      expect(WEEKDAYS).toHaveLength(7);
      expect(WEEKDAYS[0]).toBe('日');
      expect(WEEKDAYS[6]).toBe('六');
    });
  });
});
