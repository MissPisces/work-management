// router.js — 基于 hash 的轻量路由
// 路由格式: #/tasks, #/log, #/stats

const routes = [
  { path: '/tasks', label: '我的任务' },
  { path: '/log', label: '工作日志' },
  { path: '/stats', label: '工作统计' },
];

const listeners = new Set();
let current = '/tasks';

function parse() {
  const hash = window.location.hash.replace(/^#/, '');
  const path = hash.split('?')[0]; // 去除 query 参数后再匹配路由
  const match = routes.find((r) => path === r.path || path.startsWith(r.path + '/'));
  current = match ? match.path : '/tasks';
  return current;
}

export function getRoutes() {
  return routes;
}

export function getCurrent() {
  return current;
}

export function navigate(path) {
  if (window.location.hash !== '#' + path) {
    window.location.hash = path;
  } else {
    // 同地址也触发一次（手动刷新页面内容）
    current = parse();
    listeners.forEach((fn) => fn(current));
  }
}

export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function initRouter() {
  if (!window.location.hash) {
    window.location.hash = '/tasks';
  }
  current = parse();
  window.addEventListener('hashchange', () => {
    current = parse();
    listeners.forEach((fn) => fn(current));
  });
  return current;
}
