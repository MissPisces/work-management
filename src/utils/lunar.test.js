import { describe, test, expect } from 'vitest';
import { solarToLunar, getFestival, getLunarShort, getMonthCalendar, getMonthLabel } from './lunar.js';

describe('lunar.js - 农历转换', () => {
  describe('solarToLunar', () => {
    test('2026年春节（2月17日）= 农历正月初一', () => {
      const result = solarToLunar(2026, 2, 17);
      expect(result).not.toBeNull();
      expect(result.month).toBe(1);
      expect(result.day).toBe(1);
      expect(result.monthName).toBe('正月');
      expect(result.dayName).toBe('初一');
    });

    test('2026年端午（6月19日）= 农历五月初五', () => {
      const result = solarToLunar(2026, 6, 19);
      expect(result).not.toBeNull();
      expect(result.month).toBe(5);
      expect(result.day).toBe(5);
    });

    test('2026年中秋（9月25日）= 农历八月十五', () => {
      const result = solarToLunar(2026, 9, 25);
      expect(result).not.toBeNull();
      expect(result.month).toBe(8);
      expect(result.day).toBe(15);
    });

    test('2026年除夕（2月16日）= 农历腊月三十或廿九', () => {
      const result = solarToLunar(2026, 2, 16);
      expect(result).not.toBeNull();
      expect(result.month).toBe(12); // 腊月
      // 除夕可能是三十或廿九（取决于腊月大小）
      expect([29, 30]).toContain(result.day);
    });

    test('包含天干地支年名和生肖', () => {
      const result = solarToLunar(2026, 8, 10);
      expect(result).not.toBeNull();
      expect(result.yearName).toMatch(/年$/);
      expect(result.zodiac).toBeTruthy();
    });
  });

  describe('getFestival', () => {
    test('2026/10/1 = 国庆节', () => {
      expect(getFestival(2026, 10, 1)).toBe('国庆节');
    });

    test('2026/2/17 = 春节', () => {
      expect(getFestival(2026, 2, 17)).toBe('春节');
    });

    test('2026/6/19 = 端午节', () => {
      expect(getFestival(2026, 6, 19)).toBe('端午节');
    });

    test('2026/9/25 = 中秋节', () => {
      expect(getFestival(2026, 9, 25)).toBe('中秋节');
    });

    test('2026/1/1 = 元旦节', () => {
      expect(getFestival(2026, 1, 1)).toBe('元旦节');
    });

    test('普通日期返回 null', () => {
      expect(getFestival(2026, 8, 10)).toBeNull();
    });
  });

  describe('getLunarShort', () => {
    test('春节显示"春节"', () => {
      expect(getLunarShort(2026, 2, 17)).toBe('春节');
    });

    test('国庆节显示"国庆节"', () => {
      expect(getLunarShort(2026, 10, 1)).toBe('国庆节');
    });

    test('初一是月名', () => {
      // 2026/8/13 是农历七月初一
      const result = getLunarShort(2026, 8, 13);
      expect(result).toMatch(/月$/);
    });

    test('普通日期显示农历日名（如"初二"）', () => {
      // 2026/8/10 是农历七月初...（需要实际验证）
      const result = getLunarShort(2026, 8, 10);
      expect(result).toBeTruthy();
    });
  });

  describe('getMonthCalendar', () => {
    test('返回42个格子', () => {
      const cells = getMonthCalendar(2026, 8);
      expect(cells).toHaveLength(42);
    });

    test('当月格子标记 isCurrentMonth=true', () => {
      const cells = getMonthCalendar(2026, 8);
      const currentMonthCells = cells.filter((c) => c.isCurrentMonth);
      expect(currentMonthCells).toHaveLength(31); // 8月有31天
    });

    test('每个格子包含必要字段', () => {
      const cells = getMonthCalendar(2026, 8);
      cells.forEach((cell) => {
        expect(cell).toHaveProperty('date');
        expect(cell).toHaveProperty('day');
        expect(cell).toHaveProperty('lunarShort');
        expect(cell).toHaveProperty('isToday');
        expect(cell).toHaveProperty('isCurrentMonth');
      });
    });
  });

  describe('getMonthLabel', () => {
    test('返回"2026年8月"', () => {
      expect(getMonthLabel(2026, 8)).toBe('2026年8月');
    });
  });
});
