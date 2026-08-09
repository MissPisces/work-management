// main.js — 应用入口
// 负责初始化路由挂载外壳、按路由渲染对应页面

import { createShell } from './components/Shell.js';
import { createTasksPage } from './pages/TasksPage.js';
import { createWorkLogPage } from './pages/WorkLogPage.js';
import { createStatsPage } from './pages/StatsPage.js';
import { initRouter, subscribe } from './router.js';
import { openEditModal } from './pages/TaskModal.js';

const app = document.getElementById('app');

// 当前页面实例（用于销毁清理）
let currentPage = null;

function renderPage(path, contentEl) {
  // 清理上一页
  if (currentPage && currentPage._destroy) {
    currentPage._destroy();
  }
  contentEl.innerHTML = '';

  if (path === '/tasks') {
    currentPage = createTasksPage();
  } else if (path === '/log') {
    currentPage = createWorkLogPage();
  } else if (path === '/stats') {
    currentPage = createStatsPage();
  } else {
    currentPage = createTasksPage();
  }
  contentEl.appendChild(currentPage);
}

// 初始化路由
const initialPath = initRouter();

// 创建外壳
const shell = createShell((path) => {
  renderPage(path, shell._content);
});

app.appendChild(shell);

// 渲染初始页面
renderPage(initialPath, shell._content);

// 监听悬浮窗发来的编辑任务请求
if (window.electronAPI) {
  window.electronAPI.onOpenEditTask((taskId) => {
    const openModal = () => {
      openEditModal(taskId, () => {
        // 刷新当前页面
        if (currentPage && currentPage._destroy) {
          currentPage._destroy();
        }
        shell._content.innerHTML = '';
        currentPage = createTasksPage();
        shell._content.appendChild(currentPage);
      });
    };
    if (window.location.hash !== '#/tasks') {
      // 监听路由切换完成后再打开弹窗，避免硬编码延时导致的竞态
      const off = subscribe((path) => {
        if (path === '/tasks') {
          off();
          requestAnimationFrame(openModal);
        }
      });
      window.location.hash = '#/tasks';
    } else {
      openModal();
    }
  });
}

