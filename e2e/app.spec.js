import { test, expect, _electron as electron } from '@playwright/test';

// Electron E2E 测试：验证关键用户流程
// 运行前需先构建前端：npm run e2e（已包含 vite build）

test.describe('工作管理应用 E2E 测试', () => {
  test('应用启动并显示主窗口', async () => {
    const app = await electron.launch({ args: ['electron/main.cjs'] });
    const window = await app.firstWindow();
    await window.waitForLoadState('domcontentloaded');
    // 验证标题存在
    const title = await window.title();
    expect(title).toBeTruthy();
    await app.close();
  });

  test('导航到统计页并显示完成率', async () => {
    const app = await electron.launch({ args: ['electron/main.cjs'] });
    const window = await app.firstWindow();
    await window.waitForLoadState('domcontentloaded');
    // 导航到统计页
    await window.evaluate(() => { window.location.hash = '#/stats'; });
    await window.waitForTimeout(500);
    // 验证统计页标题存在
    const statsTitle = await window.textContent('.stats-chart-card__title');
    expect(statsTitle).toContain('完成率');
    await app.close();
  });

  test('创建任务后完成率应为0%（BUG 回归验证）', async () => {
    const app = await electron.launch({ args: ['electron/main.cjs'] });
    const window = await app.firstWindow();
    await window.waitForLoadState('domcontentloaded');

    // 通过 localStorage 注入一个进行中任务，刷新让 store 加载
    await window.evaluate(() => {
      const testData = {
        tasks: [{
          id: 'e2e-1', name: 'E2E测试任务', status: 'progress', priority: 'mid',
          createdAt: '2026-08-10', deadline: '', subtasks: [],
          logs: [{ id: '1', time: '09:00', text: '创建任务', type: 'auto', date: '2026-08-10' }],
        }],
        workLogs: {}, meta: { schemaVersion: 1 },
      };
      localStorage.setItem('wf-work-management-v1', JSON.stringify(testData));
    });
    await window.reload();
    await window.waitForLoadState('domcontentloaded');

    // 导航到统计页
    await window.evaluate(() => { window.location.hash = '#/stats'; });
    await window.waitForTimeout(500);

    // 验证完成率不显示 100%（应为 0%）
    const rateText = await window.textContent('.donut-chart__svg text');
    expect(rateText).toBeTruthy();
    expect(rateText).not.toContain('100');
    await app.close();
  });

  test('添加子任务后单次保存即可关闭编辑弹窗', async () => {
    const app = await electron.launch({ args: ['electron/main.cjs'] });
    const window = await app.firstWindow();
    await window.waitForLoadState('domcontentloaded');

    // 点击首个任务名称打开编辑弹窗
    await window.waitForSelector('[data-task-name]', { timeout: 10000 });
    await window.click('[data-task-name]');
    await window.waitForSelector('#et-add-subtask', { timeout: 10000 });

    // 添加子任务并重命名（替换默认“新子任务”）
    await window.click('#et-add-subtask');
    await window.locator('.et-subtask-input').last().fill('E2E验证子任务');

    // 单次保存应同时提交子任务数据并关闭弹窗（回归：修复前需点击两次）
    await window.click('#et-save');

    // 验证弹窗已关闭（modal-backdrop 被移除）
    await window.waitForSelector('.modal-backdrop', { state: 'detached', timeout: 5000 });
    await app.close();
  });
});
