import { describe, test, expect, beforeEach } from 'vitest';
import { store } from './store.js';

// 辅助：构造测试任务
function makeTask(status, createdAt = '2026-08-10', deadline = '') {
  return {
    id: Math.random().toString(36).slice(2),
    name: '测试任务',
    status,
    priority: 'mid',
    createdAt,
    deadline,
    subtasks: [],
    logs: [{ id: '1', time: '09:00', text: '创建任务', type: 'auto', date: createdAt }],
  };
}

describe('Store - getStats 完成率计算', () => {
  beforeEach(() => {
    store._state = { tasks: [], workLogs: {}, meta: { schemaVersion: 1 } };
  });

  test('空任务列表：完成率应为0%', () => {
    const stats = store.getStats('all');
    expect(stats.total).toBe(0);
    expect(stats.done).toBe(0);
    expect(stats.completionRate).toBe(0);
  });

  test('仅有进行中任务时完成率应为0%（BUG 回归测试）', () => {
    store._state.tasks = [makeTask('progress')];
    const stats = store.getStats('all');
    expect(stats.total).toBe(1);
    expect(stats.done).toBe(0);
    expect(stats.progress).toBe(1);
    expect(stats.completionRate).toBe(0);
  });

  test('仅有已完成任务时完成率应为100%', () => {
    store._state.tasks = [makeTask('done')];
    const stats = store.getStats('all');
    expect(stats.done).toBe(1);
    expect(stats.completionRate).toBe(100);
  });

  test('1完成+1进行中：完成率应为50%', () => {
    store._state.tasks = [makeTask('done'), makeTask('progress')];
    const stats = store.getStats('all');
    expect(stats.total).toBe(2);
    expect(stats.done).toBe(1);
    expect(stats.progress).toBe(1);
    expect(stats.completionRate).toBe(50);
  });

  test('有终止任务时：完成率 = done / (total - terminated)', () => {
    store._state.tasks = [
      makeTask('done'),
      makeTask('progress'),
      makeTask('terminated'),
    ];
    const stats = store.getStats('all');
    expect(stats.total).toBe(3);
    expect(stats.done).toBe(1);
    expect(stats.terminated).toBe(1);
    // activeTotal = 3 - 1 = 2, completionRate = 1/2 = 50%
    expect(stats.completionRate).toBe(50);
  });

  test('全部终止时：完成率应为0%（activeTotal=0）', () => {
    store._state.tasks = [makeTask('terminated'), makeTask('terminated')];
    const stats = store.getStats('all');
    expect(stats.total).toBe(2);
    expect(stats.terminated).toBe(2);
    expect(stats.completionRate).toBe(0);
  });

  test('逾期任务计数：未完成且截止日期已过', () => {
    const task = makeTask('progress', '2026-08-01', '2020-01-01');
    store._state.tasks = [task];
    const stats = store.getStats('all');
    expect(stats.overdue).toBe(1);
  });

  test('已完成任务不计入逾期', () => {
    const task = makeTask('done', '2026-08-01', '2020-01-01');
    store._state.tasks = [task];
    const stats = store.getStats('all');
    expect(stats.overdue).toBe(0);
  });

  test('已终止任务不计入逾期', () => {
    const task = makeTask('terminated', '2026-08-01', '2020-01-01');
    store._state.tasks = [task];
    const stats = store.getStats('all');
    expect(stats.overdue).toBe(0);
  });

  test('优先级分布统计', () => {
    store._state.tasks = [
      makeTask('progress'),
      { ...makeTask('progress'), priority: 'high' },
      { ...makeTask('progress'), priority: 'low' },
      { ...makeTask('progress'), priority: 'high' },
    ];
    const stats = store.getStats('all');
    expect(stats.priorityCount.high).toBe(2);
    expect(stats.priorityCount.mid).toBe(1);
    expect(stats.priorityCount.low).toBe(1);
  });
});
