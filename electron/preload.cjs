// electron/preload.cjs — 预加载脚本
// 通过 contextBridge 暴露白名单 IPC API，渲染进程无法直接访问 Node / electron 模块
// 配合主进程 nodeIntegration:false + contextIsolation:true + sandbox:true

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // 主窗口使用：监听悬浮窗触发的“打开编辑任务”请求
  onOpenEditTask: (cb) => {
    ipcRenderer.on('open-edit-task', (_event, taskId) => cb(taskId));
  },
  // 悬浮窗使用：隐藏 / 恢复主窗口 / 打开任务编辑
  floatClose: () => ipcRenderer.send('float-close'),
  floatRestore: () => ipcRenderer.send('float-restore'),
  floatEditTask: (taskId) => ipcRenderer.send('float-edit-task', taskId),
});
