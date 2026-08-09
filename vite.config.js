import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  // 相对路径，确保 Electron file:// 协议能正确加载资源
  base: './',
  // 多入口构建：主应用 index.html + 悬浮窗 float.html
  build: {
    outDir: 'dist',
    chunkSizeWarningLimit: 800,
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        float: resolve(__dirname, 'float.html'),
      },
    },
  },
  server: {
    port: 5180,
    open: true,
  },
});
