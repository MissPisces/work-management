import js from '@eslint/js';
import globals from 'globals';

export default [
  {
    ignores: [
      'dist/**', 'release/**', 'node_modules/**',
      '.electron-cache/**', '.electron-builder-cache/**',
      'dev-retrospective/**', 'dev-retrospective-report/**',
      '.trae-html-share-packages/**',
      '_pw_browsers/**', '_venv/**', 'test-results/**',
    ],
  },
  js.configs.recommended,
  // 项目源码（浏览器环境）
  {
    files: ['src/**/*.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: { ...globals.browser },
    },
    rules: {
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    },
  },
  // Electron 主进程（CommonJS）
  {
    files: ['electron/**/*.cjs'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'commonjs',
      globals: { ...globals.node },
    },
    rules: {
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    },
  },
  // 根目录配置文件（ES Modules + Node 环境）
  {
    files: ['*.config.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: { ...globals.node, __dirname: 'readonly' },
    },
  },
  // 测试文件
  {
    files: ['**/*.test.js', 'src/test/**/*.js', 'e2e/**/*.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        ...globals.node,
        describe: 'readonly', test: 'readonly', expect: 'readonly',
        beforeEach: 'readonly', afterEach: 'readonly',
      },
    },
  },
];
