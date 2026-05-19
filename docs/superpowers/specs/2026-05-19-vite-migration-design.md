# Witcher 3 Interactive Map — 迁移到 Vite 构建设计

## 背景

项目当前为零构建工具的纯静态网站（HTML + jQuery + Leaflet），所有 JS 通过 `<script>` 标签加载，代码使用全局变量组织。迁移目标是现代化构建流程，提高可扩展性。

## 总体方案

引入 Vite 作为构建工具，保持 jQuery + Leaflet 技术栈不变，将 JS 代码从全局变量模式重构为 ES Modules。

---

## 1. 项目结构

```
witcher3map/
├── index.html                  # Vite 入口：主页
├── w.html                      # 各地图页面（从子目录平铺到根）
├── v.html
├── g.html
├── s.html
├── k.html
├── i.html
├── t.html
├── f.html
├── src/
│   ├── main.js                 # 主页入口
│   ├── map.js                  # 地图页面共用入口
│   ├── modules/
│   │   ├── icons.js            # 图标定义（从 shared.js 拆出）
│   │   ├── markers.js          # 标记创建/管理
│   │   ├── mapdata-loader.js   # 动态加载 mapdata（替代 $.cachedScript）
│   │   ├── i18n.js             # i18n 初始化
│   │   └── utils.js            # 工具函数
│   └── styles/
│       ├── main.css            # 主样式
│       ├── home.css            # 主页样式
│       └── markers.css         # 标记样式
├── public/
│   └── files/                  # 静态资源（images, fonts, maps, locales, vendor.bundle.js）
├── vite.config.js
└── package.json
```

## 2. Vite MPA 配置

```js
// vite.config.js
import { resolve } from 'path';

export default {
  root: '.',
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        w: resolve(__dirname, 'w.html'),
        v: resolve(__dirname, 'v.html'),
        g: resolve(__dirname, 'g.html'),
        s: resolve(__dirname, 's.html'),
        k: resolve(__dirname, 'k.html'),
        i: resolve(__dirname, 'i.html'),
        t: resolve(__dirname, 't.html'),
        f: resolve(__dirname, 'f.html'),
      },
    },
    outDir: 'dist',
  },
};
```

## 3. JS 模块化

### 模块拆分

| 模块 | 导出 | 替代原来的 |
|------|------|-----------|
| `icons.js` | 50+ 个 L.icon() 对象 | `window.icons` |
| `markers.js` | `createMarker()`, `processData()`, `toggleOpacity()`, `resetInvisibleMarkers()` | `window.createMarker` 等 |
| `mapdata-loader.js` | `loadMapData(region)` — 使用 `import()` 动态加载 | `getMapdata()` / `$.cachedScript()` |
| `i18n.js` | `initI18n()` | `$.i18n.init()` 逻辑 |

### 依赖关系

```
main.js (入口)
  ├── i18n.js
  └── (纯 UI 逻辑)

map.js (入口，每个地图页面引用)
  ├── i18n.js
  ├── icons.js
  ├── markers.js ── 引用 icons.js
  └── mapdata-loader.js ── 动态 import() mapdata 文件
```

### 全局状态收拢

原来 `window.markers`、`window.invisibleMarkers`、`window.notes` 等全局变量改为模块级变量，通过导出函数访问。

### 动态加载改造

```js
// mapdata-loader.js
export async function loadMapData(region) {
  const data = await import(`../public/files/scripts/mapdata-${region}.js`);
  return data.default;
}
```

mapdata 文件改为 `export default {...}` 导出。

## 4. 第三方库处理

| 库 | 来源 | 处理方式 |
|----|------|---------|
| jQuery | npm | `import $ from 'jquery'` |
| Leaflet | npm | `import L from 'leaflet'`（CSS 由 Vite 处理） |
| Fuse.js | npm | `import Fuse from 'fuse.js'` |
| Font Awesome | npm | `import '@fortawesome/fontawesome-free'` |
| jquery.ddslick | npm | `import 'jquery.ddslick'` |
| jquery.nicescroll | npm | `import 'jquery.nicescroll'` |
| jquery.i18n | vendor.bundle.js | 保留在 `public/files/scripts/`，通过 `<script>` 标签加载 |

构建时第三方库自动合并到 vendor chunk 并进行 tree-shaking。

## 5. 静态资源与 i18n

- `public/files/` 下的所有内容（images, fonts, maps, locales）构建时原样复制到 `dist/`
- locales JSON 加载逻辑不变，路径不变
- `vendor.bundle.js` 保留在 `public/files/scripts/`，通过 `<script>` 标签加载

## 6. 离线支持

构建后 `dist/` 为纯静态文件。离线使用方式：推荐用户通过本地服务器打开（如 `npx serve dist`、`python -m http.server`、或任意静态文件服务器），在 README 中说明即可。本地服务器仍然是完全离线的使用方式。

不使用 `@vitejs/plugin-legacy`，保持构建简洁。

## 7. 构建产物

```
dist/
├── index.html, w.html, v.html, ...   # HTML 页面
├── assets/
│   ├── main-[hash].js                # 主页入口
│   ├── map-[hash].js                 # 地图共用逻辑
│   ├── vendor-[hash].js              # npm 库（jQuery, Leaflet, Fuse）
│   ├── main-[hash].css               # 编译后的样式
│   └── mapdata-*-[hash].js           # 各地图数据（自动代码分割）
└── files/                            # public/ 原样复制
```

文件名哈希自动处理缓存破坏，无需手动维护版本号。

## 8. 迁移前后对比

| 维度 | 迁移前 | 迁移后 |
|------|--------|--------|
| 依赖管理 | 手动下载 .min.js | npm + import |
| 模块化 | window.xxx 全局变量 | ESM import/export |
| 开发体验 | 改代码 → 手动刷新 | HMR 热更新 |
| 构建优化 | 手动压缩 | 自动压缩 + tree-shaking + 哈希 |
| 缓存管理 | 手动改版本号 | 文件名哈希自动处理 |
| 离线使用 | file:// 直接打开 | 本地服务器（README 说明） |
| 扩展性 | 全局变量冲突风险 | 模块隔离 |
