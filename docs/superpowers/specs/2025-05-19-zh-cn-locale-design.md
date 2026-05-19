# 添加简体中文 (zh-CN) 语言支持

## 目标

为 witcher3map 项目添加简体中文语言支持，利用 Crowdin 已翻译的数据（位于 `C:\Users\elvis\Documents\dev\web\translate\zh-cn`）。

## 背景

- 项目目前有 6 种语言：en, cz, pl, ru, tr, zh（繁体中文）
- 现有 `zh` 目录实际存储的是繁体中文（标签为"中國傳統的"）
- 语言检测使用 `lang.substring(0, 2)`，将 `zh-CN` 和 `zh-TW` 都截断为 `zh`，无法区分简繁
- 区域文件共 9 个：general.json, f.json, g.json, i.json, k.json, s.json, t.json, v.json, w.json
- Crowdin zh-cn 数据只有 6 个文件，缺少 f.json, g.json, i.json

## 方案

使用完整 locale 码（zh-CN、zh-TW）替代 2 位码（zh），在目录结构和语言检测中统一使用。

### 核心改动

1. **语言检测** — 保留浏览器完整 locale（如 `zh-CN`、`zh-TW`），只对非中文语言保留 2 位截断逻辑，或设置默认值处理特殊语言
2. **目录重命名** — `public/files/locales/zh/` → `public/files/locales/zh-tw/`
3. **新建目录** — `public/files/locales/zh-cn/`，含全部 9 个文件
4. **白名单和下拉菜单更新** — 加入 zh-cn，繁体改为 zh-tw

### 文件来源

| 文件 | 来源 |
|------|------|
| general.json, k.json, s.json, t.json, v.json, w.json | 直接使用 Crowdin 下载数据 |
| f.json, g.json, i.json | 基于 zh-tw（原 zh）对应文件，通过 OpenCC 或其他方式转换为简体中文 |

### 不改变

- `resGetPath` 模板 `"/files/locales/__lng__/__ns__.json"` 无需改动
- HTML 页面结构无需改动
- Logo 图片路径（如 `logo_zh.png`）繁体中文仍然可用（无需改引用）

## 影响范围

| 文件 | 操作 |
|------|------|
| `src/modules/i18n.js` | 修改 — 语言检测、白名单、下拉选项 |
| `public/files/locales/zh/` (整个目录) | 重命名为 `zh-tw/` |
| `public/files/locales/zh-cn/general.json` | 新建 — 来自 Crowdin |
| `public/files/locales/zh-cn/k.json` | 新建 — 来自 Crowdin |
| `public/files/locales/zh-cn/s.json` | 新建 — 来自 Crowdin |
| `public/files/locales/zh-cn/t.json` | 新建 — 来自 Crowdin |
| `public/files/locales/zh-cn/v.json` | 新建 — 来自 Crowdin |
| `public/files/locales/zh-cn/w.json` | 新建 — 来自 Crowdin |
| `public/files/locales/zh-cn/f.json` | 新建 — 繁体转简体 |
| `public/files/locales/zh-cn/g.json` | 新建 — 繁体转简体 |
| `public/files/locales/zh-cn/i.json` | 新建 — 繁体转简体 |
