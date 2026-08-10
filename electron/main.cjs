// electron/main.cjs — Electron 主进程
// 负责创建主窗口和悬浮窗，监听主窗口最小化时显示悬浮窗
// 关闭按钮（×）拦截：弹出"退出程序 / 最小化到托盘"对话框
// 系统托盘：图标 + 右键菜单（含退出）+ 单击恢复窗口
// 安全策略：渲染进程关闭 nodeIntegration，启用 contextIsolation + sandbox + webSecurity，
//           通过 preload + contextBridge 暴露白名单 IPC API，杜绝 XSS → RCE 链路

const { app, BrowserWindow, screen, ipcMain, Menu, Tray, dialog, nativeImage } = require('electron');
const path = require('path');

let mainWindow = null;
let floatWindow = null;
let tray = null;
// 是否真正退出应用：用于区分"关闭按钮→最小化到托盘"与"真正退出"
// 拦截 close 事件时若为 false，则阻止默认关闭并弹对话框
let isQuitting = false;

// 开发模式判断：
//   ELECTRON_DEV_SERVER=1 → 走 vite dev server（需先启动 vite，热更新开发用）
//   其他情况（含 electron:dev / electron:build）→ 加载本地 dist 构建产物
const isDevServer = process.env.ELECTRON_DEV_SERVER === '1';

// 单实例锁：防止多开导致 localStorage 竞争写覆盖
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    // 用户再次启动时，恢复并聚焦已有主窗口（若隐藏到托盘则一并显示）
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      if (!mainWindow.isVisible()) mainWindow.show();
      mainWindow.focus();
    }
  });

  function createMainWindow() {
    mainWindow = new BrowserWindow({
      width: 1280,
      height: 800,
      minWidth: 900,
      minHeight: 600,
      title: '工作管理 · 提升效率，管理日常',
      icon: path.join(__dirname, 'icon.png'),
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        sandbox: true,
        webSecurity: true,
        preload: path.join(__dirname, 'preload.cjs'),
      },
    });

    if (isDevServer) {
      // 联调模式：加载 Vite dev server，支持热更新
      mainWindow.loadURL('http://localhost:5180/');
    } else {
      // 默认模式：加载本地构建产物
      mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
    }

    // 主窗口最小化时显示悬浮窗
    mainWindow.on('minimize', () => {
      createFloatWindow();
    });

    // 拦截关闭按钮（×）：弹出对话框让用户选择"退出程序"或"最小化到托盘"
    // 仅当 isQuitting=true（来自托盘"退出"或系统关机）时才放行真正的关闭
    mainWindow.on('close', (event) => {
      if (!isQuitting) {
        event.preventDefault();
        showCloseDialog();
      }
    });

    // 主窗口真正关闭后销毁悬浮窗
    mainWindow.on('closed', () => {
      if (floatWindow && !floatWindow.isDestroyed()) {
        floatWindow.destroy();
      }
      mainWindow = null;
    });
  }

  function createFloatWindow() {
    if (floatWindow && !floatWindow.isDestroyed()) {
      floatWindow.show();
      floatWindow.focus();
      return;
    }

    const { width: screenWidth } = screen.getPrimaryDisplay().workAreaSize;

    floatWindow = new BrowserWindow({
      width: 320,
      height: 480,
      minWidth: 320,           // 默认最小宽度
      minHeight: 480,          // 默认最小高度
      x: screenWidth - 340,   // 右上角
      y: 80,
      frame: false,            // 无边框
      backgroundColor: '#ffffff', // 不透明背景：避免 Windows 透明窗口失焦后停止重绘的 bug
      alwaysOnTop: false,      // 默认不置顶，聚焦时动态置顶（见下方 focus/blur 处理）
      skipTaskbar: true,       // 不显示在任务栏
      resizable: true,         // 可调整大小
      maximizable: false,
      minimizable: false,
      fullscreenable: false,
      show: false,             // 延迟到内容就绪后再显示
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        sandbox: true,
        webSecurity: true,
        preload: path.join(__dirname, 'preload.cjs'),
      },
    });

    // 内容加载完成后再显示，避免首次出现空白闪烁
    floatWindow.once('ready-to-show', () => {
      floatWindow.show();
      floatWindow.focus();
    });

    // 悬浮窗聚焦时置顶，失焦时恢复系统默认 Z 序，避免遮挡其他程序窗口
    floatWindow.on('focus', () => floatWindow.setAlwaysOnTop(true));
    floatWindow.on('blur', () => floatWindow.setAlwaysOnTop(false));

    if (isDevServer) {
      floatWindow.loadURL('http://localhost:5180/float.html');
    } else {
      floatWindow.loadFile(path.join(__dirname, '..', 'dist', 'float.html'));
    }

    floatWindow.on('closed', () => {
      floatWindow = null;
    });
  }

  // ─── 托盘与关闭对话框 ─────────────────────────────────────────
  // 弹出模态对话框：让用户选择"退出程序"或"最小化到托盘"
  async function showCloseDialog() {
    if (!mainWindow || mainWindow.isDestroyed()) return;
    try {
      const result = await dialog.showMessageBox(mainWindow, {
        type: 'question',
        title: '关闭窗口',
        message: '您想要退出程序还是最小化到托盘？',
        detail: '选择"最小化到托盘"可让程序在后台继续运行，点击托盘图标可恢复窗口。',
        buttons: ['退出程序', '最小化到托盘'],
        defaultId: 1,    // 默认聚焦"最小化到托盘"（更安全的非破坏性选项）
        cancelId: 1,     // 按 ESC 等同于选择"最小化到托盘"
        noLink: true,    // 使用传统按钮样式，跨平台一致
      });
      if (result.response === 0) {
        // 退出程序
        isQuitting = true;
        app.quit();
      } else {
        // 最小化到托盘
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.hide();
        }
      }
    } catch (err) {
      console.error('[main] Close dialog error:', err);
      // 异常时安全降级：隐藏窗口而非强制退出，避免数据丢失
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.hide();
      }
    }
  }

  // 显示/恢复主窗口：从托盘单击或 second-instance 触发
  function showMainWindow() {
    if (mainWindow && !mainWindow.isDestroyed()) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      if (!mainWindow.isVisible()) mainWindow.show();
      mainWindow.focus();
    } else {
      // 主窗口已被销毁（极端情况），重新创建
      createMainWindow();
    }
  }

  // 创建系统托盘：图标 + 上下文菜单 + 单击恢复窗口
  function createTray() {
    const iconPath = path.join(__dirname, 'icon.png');
    let trayImage;
    try {
      trayImage = nativeImage.createFromPath(iconPath);
      if (trayImage.isEmpty()) {
        console.warn('[main] Tray icon not found or empty at:', iconPath);
      }
      // macOS: 标记为模板图像，自动适配深色/浅色主题
      if (process.platform === 'darwin' && !trayImage.isEmpty()) {
        trayImage.setTemplateImage(true);
      }
    } catch (err) {
      console.error('[main] Failed to load tray icon:', err);
      return;
    }

    tray = new Tray(trayImage);
    tray.setToolTip('工作管理');

    const contextMenu = Menu.buildFromTemplate([
      { label: '显示主窗口', click: () => showMainWindow() },
      { type: 'separator' },
      {
        label: '退出',
        click: () => {
          isQuitting = true;
          app.quit();
        },
      },
    ]);
    tray.setContextMenu(contextMenu);

    // Windows/Linux：左键单击托盘图标 → 显示主窗口
    // macOS：左键单击也会触发 click，统一行为
    tray.on('click', () => {
      showMainWindow();
    });
  }

  // ─── IPC 监听（一次性注册，避免随窗口创建重复绑定）─────────
  // 双击悬浮窗标题栏恢复主窗口
  ipcMain.on('float-restore', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.restore();
      mainWindow.focus();
    }
    if (floatWindow && !floatWindow.isDestroyed()) {
      floatWindow.hide();
    }
  });

  // 关闭悬浮窗
  ipcMain.on('float-close', () => {
    if (floatWindow && !floatWindow.isDestroyed()) {
      floatWindow.hide();
    }
  });

  // 单击悬浮窗任务名 → 恢复主窗口并打开编辑弹窗
  ipcMain.on('float-edit-task', (_e, taskId) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.restore();
      mainWindow.focus();
      mainWindow.webContents.send('open-edit-task', taskId);
    }
    if (floatWindow && !floatWindow.isDestroyed()) {
      floatWindow.hide();
    }
  });

  // 应用就绪后创建托盘与主窗口
  app.whenReady().then(() => {
    // 隐藏默认菜单栏
    Menu.setApplicationMenu(null);
    createTray();
    createMainWindow();

    app.on('activate', () => {
      // macOS: 从 Dock 重新激活时，若无窗口则重建主窗口
      if (BrowserWindow.getAllWindows().length === 0) {
        createMainWindow();
      }
    });
  });

  // 所有窗口关闭时退出应用（macOS 除外）
  // 注意：隐藏到托盘（hide）不会触发 window-all-closed，仅真正关闭才会
  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      app.quit();
    }
  });

  // 系统关机 / 强制退出 / Ctrl+C：放行 close 事件，避免卡在对话框
  app.on('before-quit', () => {
    isQuitting = true;
  });

  // 应用退出时清理托盘，避免残留进程/图标
  app.on('quit', () => {
    if (tray && !tray.isDestroyed()) {
      tray.destroy();
      tray = null;
    }
  });
}
