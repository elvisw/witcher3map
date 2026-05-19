# Witcher 3 Interactive Map — Vite 迁移实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 Witcher 3 Interactive Map 项目从零构建工具迁移到 Vite，JS 代码从全局变量模式重构为 ES Modules

**Architecture:** Vite 作为 MPA（多页面应用）构建工具。jQuery 及其插件通过 `<script>` 标签全局加载以保持兼容性；Leaflet、Fuse.js 通过 npm + ESM import 加载；项目自有代码拆分为 `src/modules/` 下的独立 ES 模块

**Tech Stack:** Vite, jQuery (全局), Leaflet (ESM), Fuse.js (ESM), jquery.i18n (全局 via vendor.bundle.js)

---

### 文件结构概览

```
witcher3map/
├── index.html                 # Vite 入口：主页
├── w.html, v.html, g.html,    # 各地图页面（从子目录平铺到根）
│   s.html, k.html, i.html,
│   t.html, f.html
├── src/
│   ├── main.js                # 主页入口
│   ├── map.js                 # 地图页面共用入口
│   ├── modules/
│   │   ├── icons.js           # Leaflet 图标定义（从 shared.js 拆出）
│   │   ├── markers.js         # 标记创建/管理/处理
│   │   ├── mapdata-loader.js  # 动态加载地图数据（替代 $.cachedScript）
│   │   └── i18n.js            # 国际化初始化和语言切换
│   └── styles/               # (保留目录，CSS 暂在 public/ 中作为静态资源)
├── public/
│   └── files/
│       ├── images/            # 图标、Logo、国旗（原样）
│       ├── fonts/             # Font Awesome 字体（原样）
│       ├── maps/              # 地图瓦片（原样）
│       ├── locales/           # i18n JSON 文件（原样）
│       └── scripts/
│           ├── vendor.bundle.js   # jquery.i18n 等（保留）
│           ├── jquery-3.6.0.min.js # jQuery 全局加载
│           ├── jquery.ddslick.min.js
│           ├── jquery.nicescroll.min.js
│           └── mapdata-*.js       # 地图数据（转为 ESM export）
├── vite.config.js
└── package.json
```

> **CSS 说明:** `home.min.css` 和 `main.min.css` 保持为 `public/files/styles/` 中的静态资源，暂不提取源文件，减少迁移风险。

---

### Task 1: 初始化 npm 项目并安装依赖

**Files:**
- Create: `package.json`

- [ ] **Step 1: 创建 package.json**

```bash
cd "C:\Users\elvis\Documents\dev\web\witcher3map"
npm init -y
```

- [ ] **Step 2: 安装 Vite 和 ESM 兼容的库**

```bash
npm install --save-dev vite
npm install leaflet fuse.js
```

预期结果: `package.json` 包含 vite 作为 devDependencies，leaflet 和 fuse.js 作为 dependencies。

- [ ] **Step 3: 添加 npm scripts**

编辑 `package.json`，替换 `scripts` 块：

```json
{
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  }
}
```

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: init npm project with Vite, Leaflet, Fuse.js"
```

---

### Task 2: 创建 vite.config.js

**Files:**
- Create: `vite.config.js`

- [ ] **Step 1: 创建 MPA 配置**

```js
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

export default {
  root: '.',
  publicDir: 'public',
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

- [ ] **Step 2: Commit**

```bash
git add vite.config.js
git commit -m "chore: add Vite MPA configuration for 9 pages"
```

---

### Task 3: 设置 public/ 目录结构

**Files:**
- Create: `public/` 目录（通过移动现有 assets）

- [ ] **Step 1: 将 files/ 目录移入 public/**

```bash
cd "C:\Users\elvis\Documents\dev\web\witcher3map"
mv files public/
```

- [ ] **Step 2: 确认 public/files/ 结构完整**

```bash
ls public/files/
ls public/files/images/
ls public/files/scripts/
ls public/files/styles/
ls public/files/locales/
ls public/files/maps/
ls public/files/fonts/
```

- [ ] **Step 3: Commit**

```bash
git add public/
git commit -m "chore: move static assets into public/ directory"
```

---

### Task 4: 创建根级地图页面 HTML 文件

**Files:**
- Create: `w.html`, `v.html`, `g.html`, `s.html`, `k.html`, `i.html`, `t.html`, `f.html`

> 每个 HTML 文件结构与原来子目录下的 `index.html` 基本相同，但：
> 1. 路径前缀从 `../` 改为 `./`（因为现在在根目录）
> 2. `<script>` 标签引用改为 `public/` 路径
> 3. 添加 Vite 入口 `<script type="module" src="/src/map.js">`

- [ ] **Step 1: 创建 w.html（白果园）**

```html
<!DOCTYPE html>
<html lang="en">
	<head>
		<title>Witcher 3 Interactive Map - White Orchard</title>
		<link rel="icon" type="image/ico" href="/files/images/icons/witcher3.ico?"/>
		<meta http-equiv="X-UA-Compatible" content="IE=edge" />
		<meta charset="utf-8" />
		<meta name="viewport" content="width=device-width,initial-scale=1.0" />
		<meta property="og:title" content="Witcher 3 Interactive Map - White Orchard" />
		<meta property="og:type" content="website" />
		<meta property="og:url" content="http://witcher3map.com/w/" />
		<meta property="og:image" content="/files/images/icons/witcher3.ico" />
		<meta property="og:description" content="Witcher 3 interactive map of White Orchard. All locations including shopkeepers, gwent players, merchants, places of power" />
		<meta name="description" content="Witcher 3 interactive map of White Orchard. All locations including shopkeepers, gwent players, merchants, places of power" />
		<meta name="keywords" content="Witcher 3, Witcher 3 map, Witcher 3 interactive map, White Orchard Map, gwent player map, gwent map, shopkeeper map, merchant map" />
		<link type="text/css" rel="stylesheet" href="/files/styles/leaflet.min.css" />
		<link type="text/css" rel="stylesheet" href="/files/styles/main.min.css" />
		<link type="text/css" rel="stylesheet" href="/files/styles/font-awesome.min.css" />
		<script src="/files/scripts/jquery-3.6.0.min.js"></script>
		<script src="/files/scripts/vendor.bundle.js"></script>
		<script src="/files/scripts/jquery.ddslick.min.js"></script>
		<script src="/files/scripts/jquery.nicescroll.min.js"></script>
		<script type="module" src="/src/map.js"></script>
	</head>
	<body>
		<div id="sidebar">
			<div id="sidebar-wrap">
				<a href="index.html" data-i18n="[title]sidebar.returnToMapSelection" title="Return to Map Selection"><center data-i18n="[html]misc.logo_min"><img src='/files/images/logo/logo_en_min.png' class='center'></center></a>
				<ul class="key">
					<li><i class="abandoned"></i><div data-i18n="sidebar.abandoned">Abandoned Site</div></li>
					<li><i class="armourer"></i><div data-i18n="sidebar.armourer">Armorer</div></li>
					<li><i class="armourerstable"></i><div data-i18n="sidebar.armourerstable">Armorer's Table</div></li>
					<li><i class="banditcamp"></i><div data-i18n="sidebar.banditcamp">Bandit Camp</div></li>
					<li><i class="blacksmith"></i><div data-i18n="sidebar.blacksmith">Blacksmith</div></li>
					<li><i class="contracts"></i><div data-i18n="sidebar.contracts">Contracts</div></li>
					<li><i class="entrance"></i><div data-i18n="sidebar.entrance">Entrance</div></li>
					<li><i class="event"></i><div data-i18n="sidebar.event">Event</div></li>
					<li><i class="grindstone"></i><div data-i18n="sidebar.grindstone">Grindstone</div></li>
					<li><i class="guarded"></i><div data-i18n="sidebar.guarded">Guarded Treasure</div></li>
					<li><i class="gwent"></i><div data-i18n="sidebar.gwent">Gwent Player</div></li>
					<li><i class="herbalist"></i><div data-i18n="sidebar.herbalist">Herbalist</div></li>
					<li><i class="hidden"></i><div data-i18n="sidebar.hidden">Hidden Treasure</div></li>
					<li><i class="hollow"></i><div data-i18n="sidebar.hollow">Hollow Treasure</div></li>
					<li><i class="honeycomb"></i><div data-i18n="sidebar.honeycomb">Honeycomb</div></li>
					<li><i class="innkeep"></i><div data-i18n="sidebar.innkeep">Innkeep</div></li>
					<li><i class="monsternest"></i><div data-i18n="sidebar.monsternest">Monster Nest</div></li>
					<li><i class="notice"></i><div data-i18n="sidebar.notice">Notice Board</div></li>
					<li><i class="pop"></i><div data-i18n="sidebar.pop">Place of Power</div></li>
					<li><i class="poi"></i><div data-i18n="sidebar.poi">Point of Interest</div></li>
					<li><i class="scavenger"></i><div data-i18n="sidebar.scavenger">Scavenger</div></li>
					<li><i class="shopkeeper"></i><div data-i18n="sidebar.shopkeeper">Shopkeeper</div></li>
					<li><i class="sidequests"></i><div data-i18n="sidebar.sidequests">Sidequests</div></li>
					<li><i class="signpost"></i><div data-i18n="sidebar.signpost">Sign Post</div></li>
					<li><i class="smugglers"></i><div data-i18n="sidebar.smugglers">Smugglers' Cache</div></li>
					<li><i class="spoils"></i><div data-i18n="sidebar.spoils">Spoils of War</div></li>
					<li><i class="treasure"></i><div data-i18n="sidebar.treasure">Treasure</div></li>
					<li class="none"></li>
				</ul>
				<ul class="key controls">
					<li id="show-all"><i class="fa fa-eye"></i><div data-i18n="controls.show">Show All</div></li>
					<li id="hide-all"><i class="fa fa-eye-slash"></i><div data-i18n="controls.hide">Hide All</div></li>
					<li id="show-counts"><i class="fa fa-check-square"></i><div data-i18n="controls.showCounts">Show Counts</div></li>
					<li id="hide-counts"><i class="fa fa-square"></i><div data-i18n="controls.hideCounts">Hide Counts</div></li>
					<li id="reset-tracking"><i class="fa fa-eraser"></i><div data-i18n="controls.resetInvisible">Reset Invisible</div></li>
					<li><a href="https://github.com/witcher3map/witcher3map/wiki" target="_blank"><i class="fa fa-info-circle"></i><div data-i18n="controls.helpFeatures">Features &amp; Help</div></a></li>
					<li id="Credits" class="credits"><i class="fa fa-copyright"></i><span data-i18n="controls.credits">Credits</span></li>
					<li class="donation"><a href="https://www.paypal.com/paypalme/BaHTsIzBEdEvi1" target="_blank"><i class="donation"></i><div data-i18n="controls.donation">Donate A Cofee...</div></a></li>
				</ul>
				<div id="lang-switcher"></div>
			</div>
			<div id="copyright">
				<div id="note">
					<span id="note-msg">
						<span data-i18n="[html]misc.contribute" data-i18n-options='{"link1":"<a style=color:#000000;text-decoration:underline href=https://github.com/root-BB/witcher3map>Github</a>","link2":"<a style=color:#000000;text-decoration:underline href=https://www.nexusmods.com/witcher3/mods/6061>Nexus</a>"}'> </span> <br />
						<a style="color:#000000;text-decoration:underline" href="https://crowdin.com/project/witcher-3-interactive-map" data-i18n="misc.helpTranslate"> </a>
					</span>
				</div>
				<span data-i18n="[html]credits.botCreated" data-i18n-options='{"untamed0":"<a href=https://github.com/untamed0>untamed0</a>","BaHTsIzBEdEvi":"<a href=https://github.com/root-BB>BaHTsIzBEdEvi</a>","license":"<a href=http://creativecommons.org/licenses/by-nc-sa/4.0>CC BY-NC-SA</a>"}'> </span>
				<span data-i18n="[html]credits.botAssets" data-i18n-options='{"cdpr":"<a href=https://en.cdprojektred.com>CD PROJEKT RED</a>"}'> </span>
			</div>
		</div>
		<div id="sidebar-border"></div>
		<div id="hide-sidebar"></div>
		<div id="warn" data-i18n="misc.portraitWarn"></div>
		<div id="info-wrap"><div id="info-fade-intro"></div><div id="info"></div><div id="info-fade-outro"></div></div>
		<div id="map"></div>
	</body>
</html>
```

- [ ] **Step 2-8: 创建其余 7 个地图页面**

对每个页面 (`v.html`, `g.html`, `s.html`, `k.html`, `i.html`, `t.html`, `f.html`)：
- 复制 `w.html` 内容
- 修改 `<title>`、`og:title`、`og:url`、`og:description`、`description`、`keywords` 中的区域名称
- 侧边栏内容使用原始 `*/index.html` 中的对应内容（每个区域启用的标记类型略有不同）

示例 — `v.html` 的标题修改：
```html
<title>Witcher 3 Interactive Map - Velen &amp; Novigrad</title>
<meta property="og:title" content="Witcher 3 Interactive Map - Velen &amp; Novigrad" />
<meta property="og:url" content="http://witcher3map.com/v/" />
<meta property="og:description" content="Witcher 3 interactive map of Velen &amp; Novigrad. All locations including shopkeepers, gwent players, merchants, places of power" />
<meta name="description" content="Witcher 3 interactive map of Velen &amp; Novigrad. All locations including shopkeepers, gwent players, merchants, places of power" />
<meta name="keywords" content="Witcher 3, Witcher 3 map, Witcher 3 interactive map, Velen Map, Novigrad Map, gwent player map, gwent map, shopkeeper map, merchant map" />
```

其余页面依此类推，从原 `*/index.html` 中复制每个区域的侧边栏内容。

- [ ] **Step 9: Commit**

```bash
git add w.html v.html g.html s.html k.html i.html t.html f.html
git commit -m "feat: add root-level HTML files for all 8 map regions with Vite entry"
```

---

### Task 5: 更新主页 index.html

**Files:**
- Modify: `index.html`

- [ ] **Step 1: 修改 index.html — 更新路径为绝对路径，添加 Vite 入口，移除多余的 script 标签**

将原 `index.html` 中的相对路径改为 `/files/...`，`<script>` 标签精简为：

```html
<!DOCTYPE html>
<html lang="en">
	<head>
		<title>Witcher 3 Interactive Maps</title>
		<link rel="icon" type="image/ico" href="/files/images/icons/witcher3.ico?"/>
		<meta http-equiv="X-UA-Compatible" content="IE=edge" />
		<meta charset="utf-8" />
		<meta name="viewport" content="width=device-width,initial-scale=1.0" />
		<meta property="og:title" content="Witcher 3 Interactive Maps" />
		<meta property="og:type" content="website" />
		<meta property="og:url" content="http://witcher3map.com/" />
		<meta property="og:image" content="/files/images/icons/witcher3.ico" />
		<meta property="og:description" content="Witcher 3 interactive maps. All locations including shopkeepers, gwent players, merchants, places of power" />
		<meta name="description" content="Witcher 3 interactive maps. All locations including shopkeepers, gwent players, merchants, places of power" />
		<meta name="keywords" content="Witcher 3, Witcher 3 map, Witcher 3 interactive map, gwent player map, gwent map, shopkeeper map, merchant map" />
		<link type="text/css" rel="stylesheet" href="/files/styles/home.min.css" />
		<link type="text/css" rel="stylesheet" href="/files/styles/font-awesome.min.css" />
		<link type="text/css" rel="stylesheet" href="/files/styles/leaflet.min.css" />
		<script src="/files/scripts/jquery-3.6.0.min.js"></script>
		<script src="/files/scripts/vendor.bundle.js"></script>
		<script src="/files/scripts/jquery.ddslick.min.js"></script>
		<script src="/files/scripts/jquery.nicescroll.min.js"></script>
		<script type="module" src="/src/main.js"></script>
	</head>
	<body>
		<div id="online">
			<li class="enabled"><a href="https://www.nexusmods.com/witcher3/mods/6061/?tab=description" data-i18n="home.offline">Offline Map</a></li>
		</div>
		<div id="wrap">
			<div id="wrap2">
				<div id="content">
					<div id="logo" ><center data-i18n="[html]misc.logo"><img src='/files/images/logo/logo_en.png' class='center'></center></div>
					<div id="text" data-i18n="[html]home.tagline">Unofficial The Witcher 3 Interactive Maps</div>
					<div id="search-wrapper">
						<div id="search-input-container"><div id="search-input-wrapper"><i class="fa fa-search"></i><input id="search" type="text" data-i18n="[placeholder]home.searchPlaceholder" placeholder="Enter search terms..." autocomplete="off" /><i id="clear" class="fa fa-times close-search"></i></div></div>
						<div id="search-results-wrapper"><ul id="results"></ul></div>
					</div>
					<ul id="nav">
						<li class="enabled"><a href="w.html" data-i18n="maps.white_orchard">White Orchard</a></li>
						<li class="enabled"><a href="v.html" data-i18n="[html]maps.velen_main">Velen &amp; Novigrad</a></li>
						<li class="enabled"><a href="g.html" data-i18n="[html]maps.gaunter_main">Gaunter's World</a></li>
						<li class="enabled"><a href="s.html" data-i18n="maps.skellige">Skellige Isles</a></li>
						<li class="enabled"><a href="k.html" data-i18n="maps.kaer_morhen">Kaer Morhen</a></li>
						<li class="enabled"><a href="i.html" data-i18n="maps.isle_mists">Isle of Mists</a></li>
						<li class="enabled"><a href="t.html" data-i18n="[html]maps.toussaint_main">Toussaint</a></li>
						<li class="enabled"><a href="f.html" data-i18n="[html]maps.fables_main">Thousand Fables</a></li>
					</ul>
				</div>
				<div id="lang-switcher"></div>
			</div>
		</div>
		<div id="footer">
			<span id="Credits"data-i18n="[html]credits.botCreated" data-i18n-options='{"untamed0":"<a href=https://github.com/untamed0>untamed0</a>","BaHTsIzBEdEvi":"<a href=https://github.com/root-BB>BaHTsIzBEdEvi</a>","license":"<a href=http://creativecommons.org/licenses/by-nc-sa/4.0>CC BY-NC-SA</a>"}'> </span>
			<span data-i18n="[html]credits.botHelp" data-i18n-options='{"mcarver":"<a href=https://github.com/mcarver>mcarver</a>","Gerignak":"<a href=https://www.nexusmods.com/witcher3/users/44200822>Gerignak</a>","contributors":"<a href=https://github.com/untamed0/witcher3map/graphs/contributors>contributors</a>","designGears":"<a href=https://twitter.com/DesignGears>@DesignGears</a>","hhrhhr":"<a href=https://github.com/hhrhhr>hhrhhr</a>"}'> </span>
			<span data-i18n="[html]credits.botAssets" data-i18n-options='{"cdpr":"<a href=https://en.cdprojektred.com>CD PROJEKT RED</a>"}'> </span>
		</div>
		<div id="footer2">
			<span id="DonationBlock"><a id="Donation" href="https://www.paypal.com/paypalme/BaHTsIzBEdEvi1" target="_blank"><i class="donation"></i><span data-i18n="controls.donation">Donate A Cofee...</span></a></span>
			<span id="Version">
				<a id="Title" data-i18n="credits.version">Version </a>
				<a id="No">4.06</a>
			</span>
		</div>
	</body>
</html>
```

**关键变化：**
- `<a href="w/index.html">` → `<a href="w.html">`（所有 8 个链接）
- `files/images/...` → `/files/images/...`（绝对路径）
- 移除 `fuse.js`、`lang-global.js`、`home.js` 的 `<script>` 标签（改为 Vite 入口）
- 添加 `<script type="module" src="/src/main.js">`

- [ ] **Step 2: Commit**

```bash
git add index.html
git commit -m "refactor: update index.html for Vite with absolute paths and module entry"
```

---

### Task 6: 创建 src/modules/icons.js

**Files:**
- Create: `src/modules/icons.js`

> 从 `shared.js` 中提取所有 `icons.xxx = L.icon(...)` 定义。

- [ ] **Step 1: 创建 src/modules/icons.js**

```js
const L = window.L;

const icons = {};

icons.abandoned = L.icon({ iconUrl: "/files/images/icons/abandoned.png", iconSize: [30, 30] });
icons.alchemy = L.icon({ iconUrl: "/files/images/icons/alchemy.png", iconSize: [20, 28] });
icons.armourer = L.icon({ iconUrl: "/files/images/icons/armourer.png", iconSize: [24, 34] });
icons.armourerstable = L.icon({ iconUrl: "/files/images/icons/armourerstable.png", iconSize: [30, 27] });
icons.banditcamp = L.icon({ iconUrl: "/files/images/icons/banditcamp.png", iconSize: [29, 30] });
icons.barber = L.icon({ iconUrl: "/files/images/icons/barber.png", iconSize: [30, 30] });
icons.blacksmith = L.icon({ iconUrl: "/files/images/icons/blacksmith.png", iconSize: [27, 30] });
icons.boat = L.icon({ iconUrl: "/files/images/icons/boat.png", iconSize: [30, 28] });
icons.brothel = L.icon({ iconUrl: "/files/images/icons/brothel.png", iconSize: [28, 26] });
icons.contracts = L.icon({ iconUrl: "/files/images/icons/contract.png", iconSize: [20, 31] });
icons.entrance = L.icon({ iconUrl: "/files/images/icons/entrance.png", iconSize: [28, 27] });
icons.event = L.icon({ iconUrl: "/files/images/icons/event.png", iconSize: [23, 34] });
icons.grindstone = L.icon({ iconUrl: "/files/images/icons/grindstone.png", iconSize: [30, 26] });
icons.guarded = L.icon({ iconUrl: "/files/images/icons/guarded.png", iconSize: [23, 34] });
icons.gwent = L.icon({ iconUrl: "/files/images/icons/gwent.png", iconSize: [24, 30] });
icons.gwentquest = L.icon({ iconUrl: "/files/images/icons/gwentquest.png", iconSize: [24, 30] });
icons.hansebase = L.icon({ iconUrl: "/files/images/icons/hansebase.png", iconSize: [29, 30] });
icons.harbor = L.icon({ iconUrl: "/files/images/icons/harbor.png", iconSize: [27, 30] });
icons.herbalist = L.icon({ iconUrl: "/files/images/icons/herbalist.png", iconSize: [25, 28] });
icons.hidden = L.icon({ iconUrl: "/files/images/icons/hidden.png", iconSize: [23, 34] });
icons.hollow = L.icon({ iconUrl: "/files/images/icons/hollow.png", iconSize: [28, 27] });
icons.honeycomb = L.icon({ iconUrl: "/files/images/icons/honeycomb.png", iconSize: [29, 29] });
icons.innkeep = L.icon({ iconUrl: "/files/images/icons/innkeep.png", iconSize: [26, 30] });
icons.kid = L.icon({ iconUrl: "/files/images/icons/kid.png", iconSize: [28, 30] });
icons.monsterden = L.icon({ iconUrl: "/files/images/icons/monsterden.png", iconSize: [30, 27] });
icons.monsternest = L.icon({ iconUrl: "/files/images/icons/monsternest.png", iconSize: [23, 30] });
icons.note_marker = L.icon({ iconUrl: "/files/images/icons/note_marker.png", iconSize: [23, 23] });
icons.notice = L.icon({ iconUrl: "/files/images/icons/notice.png", iconSize: [23, 28] });
icons.pid = L.icon({ iconUrl: "/files/images/icons/pid.png", iconSize: [24, 34] });
icons.poi = L.icon({ iconUrl: "/files/images/icons/poi.png", iconSize: [28, 28] });
icons.pop = L.icon({ iconUrl: "/files/images/icons/pop.png", iconSize: [27, 30] });
icons.scavenger = L.icon({ iconUrl: "/files/images/icons/scavenger.png", iconSize: [30, 30] });
icons.shopkeeper = L.icon({ iconUrl: "/files/images/icons/shopkeeper.png", iconSize: [21, 30] });
icons.sidequests = L.icon({ iconUrl: "/files/images/icons/sidequests.png", iconSize: [10, 30] });
icons.signalfire = L.icon({ iconUrl: "/files/images/icons/signalfire.png", iconSize: [17, 34] });
icons.signpost = L.icon({ iconUrl: "/files/images/icons/signpost.png", iconSize: [27, 34] });
icons.smugglers = L.icon({ iconUrl: "/files/images/icons/smugglers.png", iconSize: [28, 30] });
icons.spoils = L.icon({ iconUrl: "/files/images/icons/spoils.png", iconSize: [25, 28] });
icons.treasure = L.icon({ iconUrl: "/files/images/icons/treasure.png", iconSize: [23, 34] });
icons.treasure_uw = L.icon({ iconUrl: "/files/images/icons/treasure_uw.png", iconSize: [23, 34] });
icons.vineyardinfestation = L.icon({ iconUrl: "/files/images/icons/vineyardinfestation.png", iconSize: [28, 32] });

// Underground variants
icons.abandoned_ug = L.icon({ iconUrl: "/files/images/icons/underground/abandoned.png", iconSize: [30, 40] });
icons.alchemy_ug = L.icon({ iconUrl: "/files/images/icons/underground/alchemy.png", iconSize: [21, 37] });
icons.armourer_ug = L.icon({ iconUrl: "/files/images/icons/underground/armourer.png", iconSize: [24, 43] });
icons.armourerstable_ug = L.icon({ iconUrl: "/files/images/icons/underground/armourerstable.png", iconSize: [30, 36] });
icons.banditcamp_ug = L.icon({ iconUrl: "/files/images/icons/underground/banditcamp.png", iconSize: [29, 39] });
icons.barber_ug = L.icon({ iconUrl: "/files/images/icons/underground/barber.png", iconSize: [30, 39] });
icons.blacksmith_ug = L.icon({ iconUrl: "/files/images/icons/underground/blacksmith.png", iconSize: [27, 39] });
icons.boat_ug = L.icon({ iconUrl: "/files/images/icons/underground/boat.png", iconSize: [30, 37] });
icons.brothel_ug = L.icon({ iconUrl: "/files/images/icons/underground/brothel.png", iconSize: [28, 33] });
icons.contracts_ug = L.icon({ iconUrl: "/files/images/icons/underground/contract.png", iconSize: [23, 43] });
icons.event_ug = L.icon({ iconUrl: "/files/images/icons/underground/event.png", iconSize: [23, 37] });
icons.grindstone_ug = L.icon({ iconUrl: "/files/images/icons/underground/grindstone.png", iconSize: [30, 35] });
icons.guarded_ug = L.icon({ iconUrl: "/files/images/icons/underground/guarded.png", iconSize: [23, 43] });
icons.gwent_ug = L.icon({ iconUrl: "/files/images/icons/underground/gwent.png", iconSize: [24, 39] });
icons.gwentquest_ug = L.icon({ iconUrl: "/files/images/icons/underground/gwentquest.png", iconSize: [24, 39] });
icons.hansebase_ug = L.icon({ iconUrl: "/files/images/icons/underground/hansebase.png", iconSize: [29, 39] });
icons.harbor_ug = L.icon({ iconUrl: "/files/images/icons/underground/harbor.png", iconSize: [27, 39] });
icons.herbalist_ug = L.icon({ iconUrl: "/files/images/icons/underground/herbalist.png", iconSize: [25, 37] });
icons.hidden_ug = L.icon({ iconUrl: "/files/images/icons/underground/hidden.png", iconSize: [23, 43] });
icons.hollow_ug = L.icon({ iconUrl: "/files/images/icons/underground/hollow.png", iconSize: [28, 36] });
icons.honeycomb_ug = L.icon({ iconUrl: "/files/images/icons/underground/honeycomb.png", iconSize: [29, 37] });
icons.innkeep_ug = L.icon({ iconUrl: "/files/images/icons/underground/innkeep.png", iconSize: [26, 39] });
icons.kid_ug = L.icon({ iconUrl: "/files/images/icons/underground/kid.png", iconSize: [28, 39] });
icons.monsternest_ug = L.icon({ iconUrl: "/files/images/icons/underground/monsternest.png", iconSize: [23, 39] });
icons.notice_ug = L.icon({ iconUrl: "/files/images/icons/underground/notice.png", iconSize: [23, 30] });
icons.pid_ug = L.icon({ iconUrl: "/files/images/icons/underground/pid.png", iconSize: [24, 43] });
icons.poi_ug = L.icon({ iconUrl: "/files/images/icons/underground/poi.png", iconSize: [28, 37] });
icons.pop_ug = L.icon({ iconUrl: "/files/images/icons/underground/pop.png", iconSize: [27, 39] });
icons.scavenger_ug = L.icon({ iconUrl: "/files/images/icons/underground/scavenger.png", iconSize: [30, 39] });
icons.shopkeeper_ug = L.icon({ iconUrl: "/files/images/icons/underground/shopkeeper.png", iconSize: [21, 39] });
icons.sidequests_ug = L.icon({ iconUrl: "/files/images/icons/underground/sidequests.png", iconSize: [10, 39] });
icons.signalfire_ug = L.icon({ iconUrl: "/files/images/icons/underground/signalfire.png", iconSize: [17, 34] });
icons.signpost_ug = L.icon({ iconUrl: "/files/images/icons/underground/signpost.png", iconSize: [27, 43] });
icons.smugglers_ug = L.icon({ iconUrl: "/files/images/icons/underground/smugglers.png", iconSize: [28, 39] });
icons.spoils_ug = L.icon({ iconUrl: "/files/images/icons/underground/spoils.png", iconSize: [25, 37] });
icons.treasure_ug = L.icon({ iconUrl: "/files/images/icons/underground/treasure.png", iconSize: [32, 38] });
icons.treasure_uw_ug = L.icon({ iconUrl: "/files/images/icons/underground/treasure_uw.png", iconSize: [32, 38] });
icons.vineyardinfestation_ug = L.icon({ iconUrl: "/files/images/icons/underground/vineyardinfestation.png", iconSize: [28, 41] });

export default icons;
```

- [ ] **Step 2: Commit**

```bash
git add src/modules/icons.js
git commit -m "feat: extract Leaflet icon definitions into icons module"
```

---

### Task 7: 创建 src/modules/mapdata-loader.js

**Files:**
- Create: `src/modules/mapdata-loader.js`

- [ ] **Step 1: 创建模块**

```js
const $ = window.$;

/**
 * 动态加载指定区域的地图数据
 * @param {string} region - 区域名 (e.g. 'white_orchard', 'hos_velen')
 * @returns {Promise<object>} mapdata 对象
 */
export async function loadMapData(region) {
  const module = await import(`/files/scripts/mapdata-${region}.js`);
  return module;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/modules/mapdata-loader.js
git commit -m "feat: add mapdata-loader module replacing $.cachedScript"
```

---

### Task 8: 创建 src/modules/markers.js

**Files:**
- Create: `src/modules/markers.js`

> 从 `shared.js` 提取 `createMarker`、`setMarker`、`processData`、`toggleOpacity`、`resetInvisibleMarkers`、`updatePills` 等函数。

- [ ] **Step 1: 创建 src/modules/markers.js**

```js
import icons from './icons.js';

const $ = window.$;
const L = window.L;

const invisibleMarkerOpacity = 0.25;
const markers = {};
const invisibleMarkers = {};
const markerCount = {};
const notes = {};

export function getMarkers() { return markers; }
export function getInvisibleMarkers() { return invisibleMarkers; }
export function getMarkerCount() { return markerCount; }
export function getNotes() { return notes; }

export function setMarker(name, icon) {
  return { icon: icon, riseOnHover: true };
}

export function getLatLngKey(lat, lng) {
  return lat + ";" + lng;
}

export function isMarkerInvisible(cacheKey, lat, lng) {
  return invisibleMarkers[cacheKey].indexOf(getLatLngKey(lat, lng)) > -1;
}

export function createMarker(coords, icon, label, popup, dataKey) {
  var cacheKey = "markers-" + mapPath + "-hidden";
  var marker = L.marker(coords, setMarker(dataKey, icon))
    .bindLabel(label, { direction: "auto" })
    .bindPopup(popup);

  marker.on("contextmenu", function (e) {
    toggleOpacity(e, cacheKey);
    updatePills(e, dataKey);
  });

  if (isMarkerInvisible(cacheKey, marker.getLatLng().lat, marker.getLatLng().lng)) {
    marker.setOpacity(invisibleMarkerOpacity);
    if (!markerCount[dataKey]) markerCount[dataKey] = 0;
  } else {
    markerCount[dataKey] = markerCount[dataKey] + 1 || 1;
  }

  return marker;
}

export function toggleOpacity(e, cacheKey) {
  var key = getLatLngKey(e.latlng.lat, e.latlng.lng);
  if (e.target && e.target.options.opacity === 1) {
    e.target.setOpacity(invisibleMarkerOpacity);
    invisibleMarkers[cacheKey].push(key);
  } else {
    e.target.setOpacity(1);
    invisibleMarkers[cacheKey].splice(invisibleMarkers[cacheKey].indexOf(key), 1);
  }
  localStorage[cacheKey] = JSON.stringify(invisibleMarkers[cacheKey]);
}

export function updatePills(e, dataKey) {
  if (!e.target) return;
  if (typeof markerCount[dataKey] !== "number" || isNaN(markerCount[dataKey])) {
    markerCount[dataKey] = 0;
  }
  if (e.target.options.opacity === 1) {
    markerCount[dataKey] = Math.max(0, markerCount[dataKey] + 1);
  } else {
    markerCount[dataKey] -= 1;
  }
  $("ul.key:not(.controls) > li:not(.none) > i." + dataKey + " ~ :last").text(markerCount[dataKey]);
}

export function resetInvisibleMarkers() {
  var cacheKey = "markers-" + mapPath + "-hidden";
  invisibleMarkers[cacheKey] = [];
  localStorage[cacheKey] = JSON.stringify(invisibleMarkers[cacheKey]);
  location.reload();
}

export function processData(data) {
  var mapKey = "markers-" + mapPath + "-hidden";
  if (!localStorage[mapKey]) {
    localStorage[mapKey] = JSON.stringify([]);
  }
  invisibleMarkers[mapKey] = JSON.parse(localStorage[mapKey]);

  var notesKey = "notes" + mapPath;
  if (!localStorage[notesKey]) {
    localStorage[notesKey] = JSON.stringify([]);
  }
  notes[mapPath] = JSON.parse(localStorage[notesKey]);

  Object.keys(data).forEach(function (dataKey) {
    var items = data[dataKey];
    var groupItems = [];

    items.forEach(function (item) {
      if (item.popupTitle == null) item.popupTitle = item.label;
      item.coords.forEach(function (coord) {
        var ugIcon = "icons." + dataKey + "_ug";
        if (item.label.includes($.t("misc.underground"))) {
          if (item.label.includes($.t("treasure.watertreasure"))) {
            groupItems.push(createMarker(coord, icons.treasure_uw_ug, item.label, "<h1>" + item.popupTitle + "</h1>" + item.popup, dataKey));
          } else {
            groupItems.push(createMarker(coord, eval(ugIcon), item.label, "<h1>" + item.popupTitle + "</h1>" + item.popup, dataKey));
          }
        } else if (item.label.includes($.t("treasure.watertreasure"))) {
          groupItems.push(createMarker(coord, icons.treasure_uw, item.label, "<h1>" + item.popupTitle + "</h1>" + item.popup, dataKey));
        } else {
          groupItems.push(createMarker(coord, icons[dataKey], item.label, "<h1>" + item.popupTitle + "</h1>" + item.popup, dataKey));
        }
      });
    });

    markers[dataKey] = L.layerGroup(groupItems);
  });
}

// mapPath 由 map.js 在初始化时设置
export let mapPath = '';

export function setMapPath(path) {
  mapPath = path;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/modules/markers.js
git commit -m "feat: extract marker management logic into markers module"
```

---

### Task 9: 创建 src/modules/i18n.js

**Files:**
- Create: `src/modules/i18n.js`

> 合并 `lang-global.js` 和 `shared.js` 中的 i18n 初始化逻辑。`$.cachedScript` 保留在全局定义中（通过 lang-global.js 或 vendor.bundle.js），只需保留这个定义即可。

- [ ] **Step 1: 创建 src/modules/i18n.js**

```js
const $ = window.$;

// $.cachedScript 定义（原 lang-global.js）
jQuery.cachedScript = function (url, options) {
  options = $.extend(options || {}, {
    dataType: "script",
    cache: true,
    url: url
  });
  return jQuery.ajax(options);
};

// i18n 选项（原 lang-global.js）
if (localStorage.lang == null) {
  var lang = window.navigator.userLanguage || window.navigator.language;
  lang = lang.substring(0, 2);
  localStorage.lang = lang;
}

window.i18noptions = {
  debug: false,
  getAsync: true,
  ns: "general",
  lng: localStorage.lang,
  fallbackLng: "en",
  resGetPath: "/files/locales/__lng__/__ns__.json",
  useDataAttrOptions: true,
  lngWhitelist: ["en", "cz", "pl", "ru", "tr", "zh"]
};

// 语言切换选项
var languageOptions = [
  { text: "English", value: "en", selected: "en" == localStorage.lang, description: " ", imageSrc: "/files/images/flags/en.png" },
  { text: "Čeština", value: "cz", selected: "cz" == localStorage.lang, description: " ", imageSrc: "/files/images/flags/cz.png" },
  { text: "Polski", value: "pl", selected: "pl" == localStorage.lang, description: " ", imageSrc: "/files/images/flags/pl.png" },
  { text: "Русский", value: "ru", selected: "ru" == localStorage.lang, description: " ", imageSrc: "/files/images/flags/ru.png" },
  { text: "Türkçe", value: "tr", selected: "tr" == localStorage.lang, description: " ", imageSrc: "/files/images/flags/tr.png" },
  { text: "中國傳統的", value: "zh", selected: "zh" == localStorage.lang, description: " ", imageSrc: "/files/images/flags/zh.png" },
];

window.changeLang = function (lang) {
  if (localStorage.lang !== lang) {
    localStorage.lang = lang;
    window.location.reload();
  }
};

// 初始化语言切换下拉
export function initLangSwitcher() {
  $("#lang-switcher").ddslick({
    data: languageOptions,
    width: 150,
    onSelected: function (data) {
      window.changeLang(data.selectedData.value);
    }
  });
}

/**
 * 初始化 i18n 并返回当前页面区域名
 * @returns {Promise<string>} 地图区域名
 */
export function initI18n() {
  return new Promise(function (resolve) {
    $.i18n.init(window.i18noptions, function () {
      var match = location.pathname.match(/\/(\w{1,2})(?:\.html)?$/);
      var region = match ? match[1] : null;

      if (!region) {
        // 主页
        $(document).i18n();
        initLangSwitcher();
        resolve(null);
        return;
      }

      $.i18n.loadNamespace(region, function () {
        initLangSwitcher();
        resolve(region);
      });
    });
  });
}

// 区域短名到 mapdata 文件名的映射
export const regionToMapdata = {
  w: "white_orchard",
  v: "hos_velen",
  g: "gaunter",
  s: "skellige",
  k: "kaer_morhen",
  t: "toussaint",
  f: "fables",
  i: "isle_mists",
};
```

- [ ] **Step 2: Commit**

```bash
git add src/modules/i18n.js
git commit -m "feat: extract i18n initialization into i18n module"
```

---

### Task 10: 创建 src/map.js（地图页面入口）

**Files:**
- Create: `src/map.js`

> 合并 `shared.js` 的初始化逻辑和 `custom.js` 的地图初始化代码。

- [ ] **Step 1: 创建 src/map.js**

```js
import Fuse from 'fuse.js';
import icons from './modules/icons.js';
import { loadMapData } from './modules/mapdata-loader.js';
import {
  getMarkers,
  getMarkerCount,
  getNotes,
  setMapPath,
  processData,
  createMarker,
  setMarker,
  resetInvisibleMarkers,
} from './modules/markers.js';
import { initI18n, regionToMapdata } from './modules/i18n.js';

const $ = window.$;
const L = window.L;

// 设置 Leaflet 默认图标路径
L.Icon.Default.imagePath = "/files/images/leaflet";

// 全局变量（向后兼容某些外部引用）
window.icons = icons;
window.markers = getMarkers();
window.createMarker = createMarker;
window.setMarker = setMarker;
window.resetInvisibleMarkers = resetInvisibleMarkers;

$(function () {
  initI18n().then(function (region) {
    if (!region) return;

    var mapdataName = regionToMapdata[region];
    if (!mapdataName) {
      console.error("Unknown map region: " + region);
      return;
    }

    loadMapData(mapdataName).then(function (mapModule) {
      var map_path = mapModule.map_path;
      setMapPath(map_path);

      // 共享全局（地图数据中的 $.t() 调用需要）
      window.map_path = map_path;
      window.map_sWest = mapModule.map_sWest;
      window.map_nEast = mapModule.map_nEast;
      window.map_center = mapModule.map_center;
      window.map_minZoom = mapModule.map_minZoom;
      window.map_mZoom = mapModule.map_mZoom;
      window.map_Zoom = mapModule.map_Zoom;

      // 处理地图数据
      processData(mapModule.default);

      initMap(mapModule);
    });
  });
});

function initMap(mapModule) {
  var mapPath = mapModule.map_path;

  // 构建 allLayers
  var allLayers = [
    getMarkers().abandoned, getMarkers().alchemy, getMarkers().armourer,
    getMarkers().armourerstable, getMarkers().banditcamp, getMarkers().barber,
    getMarkers().blacksmith, getMarkers().boat, getMarkers().brothel,
    getMarkers().contracts, getMarkers().entrance, getMarkers().event,
    getMarkers().grindstone, getMarkers().guarded, getMarkers().gwent,
    getMarkers().gwentquest, getMarkers().hansebase, getMarkers().harbor,
    getMarkers().herbalist, getMarkers().hidden, getMarkers().hollow,
    getMarkers().honeycomb, getMarkers().innkeep, getMarkers().kid,
    getMarkers().monsterden, getMarkers().monsternest, getMarkers().notice,
    getMarkers().pid, getMarkers().pop, getMarkers().poi, getMarkers().scavenger,
    getMarkers().shopkeeper, getMarkers().sidequests, getMarkers().signalfire,
    getMarkers().signpost, getMarkers().smugglers, getMarkers().spoils,
    getMarkers().treasure, getMarkers().vineyardinfestation,
  ];

  allLayers = allLayers.filter(function (layer) { return layer !== undefined; });

  window.allLayers = allLayers;

  // 侧边栏滚动
  var isSmall = 300 > $("#sidebar").width();
  var waypoint = null;
  var circleMarker = null;

  if (localStorage.hideWarn) $("#warn").remove();
  if (localStorage["hide-all-" + mapPath]) { $("#hide-all").hide(); $("#show-all").show(); }
  if (localStorage["hide-monsters"]) { $("#info").addClass("hideMonsters"); $("#hide-monsters").hide(); $("#show-monsters").show(); }

  // 底部版权位置调整
  var adjustCopyright = function () {
    if ($(window).height() > $("#sidebar-wrap").outerHeight() + $("div#copyright").outerHeight() + 45) {
      $("div#copyright").addClass("absolute");
    } else {
      $("div#copyright").removeClass("absolute");
    }
  };

  adjustCopyright();
  $(window).on("resize", function () { adjustCopyright(); });

  $("#sidebar").niceScroll({ cursorcolor: "#5E4F32", cursorborder: "none" });
  $("#info").niceScroll({ cursorcolor: "#5E4F32", cursorborder: "none" });

  // 地图配置
  var mapOptions = {
    minZoom: mapModule.map_minZoom,
    maxZoom: mapModule.map_mZoom,
    center: mapModule.map_center,
    zoom: mapModule.map_Zoom,
    attributionControl: false,
    zoomControl: false,
    layers: allLayers
  };

  var labelOptions = { direction: "auto" };

  // CRS 配置
  if (["velen", "hos_velen", "gaunter", "toussaint", "kaer_morhen"].indexOf(mapPath) !== -1) {
    mapOptions.crs = L.CRS.Simple;
  }

  var map = L.map("map", mapOptions);

  window.go = function (view) {
    map.setView(view);
    map.setZoom(mapModule.map_minZoom);
    map.setZoom(mapModule.map_mZoom);
    map.setZoom(mapModule.map_Zoom);
    new L.marker(view, {
      icon: L.icon({ iconUrl: "/files/images/searchhover.png", iconSize: [22, 22] })
    }).addTo(map);
  };

  // 缩放和全屏控件
  new L.Control.Zoom({
    position: "topright",
    zoomInTitle: $.t("controls.zoomInButton"),
    zoomOutTitle: $.t("controls.zoomOutButton")
  }).addTo(map);

  new L.Control.Fullscreen({
    position: "topright",
    title: { false: $.t("controls.viewFullscreenButton"), true: $.t("controls.exitFullscreenButton") }
  }).addTo(map);

  var hash = new L.Hash(map);
  var bounds = new L.LatLngBounds(mapModule.map_sWest, mapModule.map_nEast);
  map.setMaxBounds(bounds);

  // 搜索控件
  if (!isSmall) {
    var searchData = [];
    $.each(allLayers, function (i, layer) {
      $.each(layer._layers, function (j, marker) {
        searchData.push({
          loc: [marker._latlng.lat, marker._latlng.lng],
          title: marker._popup._content.replace(/<h1>/, "").replace(/<\/h1>/, " - ").replace(/\\'/g, "")
        });
      });
    });

    map.addControl(new L.Control.Search({
      autoResize: false,
      autoType: false,
      minLength: 2,
      position: "topright",
      autoCollapse: false,
      zoom: 5,
      text: $.t("controls.searchButton"),
      filterJSON: function (raw) { return raw; },
      callData: function (query, callback) {
        callback(new Fuse(searchData, {
          caseSensitive: false,
          includeScore: false,
          shouldSort: true,
          tokenize: false,
          threshold: 0.2,
          location: 0,
          distance: 10000,
          maxPatternLength: 32,
          keys: ["title"]
        }).search(query));
        setTimeout(function () {
          $(".search-tooltip").getNiceScroll().resize();
        }, 200);
        return { abort: function () { console.log("aborted request: " + query); } };
      }
    }));

    $(".search-tooltip").niceScroll({
      cursorcolor: "#5E4F32",
      cursorborder: "none",
      horizrailenabled: false
    });
  }

  // 瓦片图层
  var tileOptions = { tms: true, bounds: bounds, noWrap: true };

  if (["hos_velen", "gaunter", "isle_mists", "skellige", "white_orchard", "toussaint", "kaer_morhen", "fables"].indexOf(mapPath) !== -1) {
    tileOptions.continuousWorld = true;
    tileOptions.crs = L.CRS.Simple;
  }

  L.tileLayer("/files/maps/" + mapPath + "/{z}/{x}/{y}.png", tileOptions).addTo(map);
  L.tileLayer("/files/maps/" + mapPath + "/{z}/{x}/{y}.jpg", tileOptions).addTo(map);

  // 拖拽边界限制
  map.dragging._draggable.on("predrag", function () {
    var delta = map._initialTopLeftPoint.subtract(this._newPos);
    this._newPos = this._newPos.subtract(map._getBoundsOffset(new L.Bounds(delta, delta.add(map.getSize())), map.options.maxBounds));
  });

  // 右键路点
  map.on("contextmenu", function (e) {
    if (!bounds.contains(e.latlng)) return false;
    if (waypoint) map.removeLayer(waypoint);
    waypoint = new L.marker(e.latlng, {
      icon: L.icon({ iconUrl: "/files/images/icons/waypoint.png", iconSize: [26, 32] })
    }).on("click", function () { map.removeLayer(waypoint); hash.removeParam("w"); })
      .on("contextmenu", function () { map.removeLayer(waypoint); hash.removeParam("w"); })
      .addTo(map);
    hash.addParam("w", e.latlng.lat.toFixed(3) + "," + e.latlng.lng.toFixed(3));
  });

  $(".leaflet-marker-icon").on("contextmenu", function (e) { return false; });

  // 弹出窗口处理
  var closePopup = function () {
    $("#info-wrap").fadeOut("fast", function () {
      $("#info").html("");
      clearCircleMarker();
      map.closePopup();
    });
  };

  var showCircleMarker = function (lat, lng) {
    var key = getNoteKey(lat, lng);
    var notes = getNotes();
    if (!notes[mapPath][getNoteIndex(key)]) {
      hash.addParam("m", lat + "," + lng);
      $("#centerButton").show();
    }
    circleMarker = L.circleMarker(L.latLng(lat, lng), {
      color: "red", fillColor: "#f03", fillOpacity: 0.5, radius: 20
    }).addTo(map);
  };

  var clearCircleMarker = function () {
    if (circleMarker !== null) {
      map.removeLayer(circleMarker);
      hash.removeParam("m");
      $("#centerButton").hide();
    }
  };

  map.on("popupopen", function (e) {
    clearCircleMarker();
    showCircleMarker(e.popup._latlng.lat, e.popup._latlng.lng);
    $("#info-wrap").stop();
    $("#info").html(e.popup._source._popup._content);
    $("#info").getNiceScroll(0).doScrollTop(0, 0);
    $("#info-wrap").fadeIn("fast");
  });

  map.on("popupclose", function () {
    closePopup();
  });

  // 加载保存的标记可见性
  if (localStorage["markers-" + mapPath]) {
    $.each($.parseJSON(localStorage["markers-" + mapPath]), function (key, visible) {
      if (visible === false) {
        $("i." + key).parent().addClass("layer-disabled");
        map.removeLayer(getMarkers()[key]);
      }
    });
  }

  // 侧边栏标记计数
  $("ul.key:not(.controls) li:not(.none) i").each(function (idx, el) {
    var className = $(this).attr("class");
    var pill = $("<div class='pill'>" + getMarkerCount()[className] + "</div>");
    $(this).next().after(pill);
    if (localStorage["hide-counts"]) pill.hide();
  }).promise().done(function () {
    if (localStorage["hide-counts"]) {
      $("#hide-counts").hide();
      $("#show-counts").show();
    }
  });

  // 侧边栏交互: 显示/隐藏全部
  $("#hide-all").on("click", function () {
    var saved = localStorage["markers-" + mapPath] ? $.parseJSON(localStorage["markers-" + mapPath]) : {};
    $.each(allLayers, function (i, layer) { map.removeLayer(layer); });
    $.each($("ul.key:not(.controls) li:not(.none) i"), function (i, el) {
      saved[$(this).attr("class")] = false;
    });
    $("ul.key:first li").each(function (i, el) { $(el).addClass("layer-disabled"); });
    $(this).hide();
    $("#show-all").show();
    localStorage["markers-" + mapPath] = JSON.stringify(saved);
    localStorage["hide-all-" + mapPath] = true;
  });

  $("#show-all").on("click", function () {
    var saved = localStorage["markers-" + mapPath] ? $.parseJSON(localStorage["markers-" + mapPath]) : {};
    $.each(allLayers, function (i, layer) { map.addLayer(layer); });
    $.each($("ul.key:not(.controls) li:not(.none) i"), function (i, el) {
      saved[$(this).attr("class")] = true;
    });
    $("ul.key:first li").each(function (i, el) { $(el).removeClass("layer-disabled"); });
    $(this).hide();
    $("#hide-all").show();
    localStorage["markers-" + mapPath] = JSON.stringify(saved);
    localStorage.removeItem("hide-all-" + mapPath);
  });

  // 显示/隐藏计数
  $("#hide-counts").on("click", function () {
    $("ul.key:not(.controls) > li:not(.none) i").each(function () {
      $(this).siblings(":last").hide();
    });
    $(this).hide();
    $("#show-counts").show();
    localStorage["hide-counts"] = true;
  });

  $("#show-counts").on("click", function () {
    $("ul.key:not(.controls) > li:not(.none) i").each(function () {
      $(this).siblings(":last").show();
    });
    $(this).hide();
    $("#hide-counts").show();
    localStorage.removeItem("hide-counts");
  });

  // 重置不可见标记
  $("#reset-tracking").on("click", function (e) {
    e.preventDefault();
    if (confirm($.t("controls.resetInvisConfirm"))) {
      resetInvisibleMarkers();
    }
  });

  // 侧边栏切换标记层
  $("ul.key:not(.controls)").on("click", "li:not(.none)", function () {
    var className = $(this).find("i").attr("class");
    var saved = localStorage["markers-" + mapPath] ? $.parseJSON(localStorage["markers-" + mapPath]) : {};
    if ($(this).hasClass("layer-disabled")) {
      map.addLayer(getMarkers()[className]);
      $(this).removeClass("layer-disabled");
      saved[className] = true;
    } else {
      map.removeLayer(getMarkers()[className]);
      $(this).addClass("layer-disabled");
      saved[className] = false;
    }
    localStorage["markers-" + mapPath] = JSON.stringify(saved);
  });

  // 侧边栏隐藏
  var sidebarLeft, borderLeft, hideLeft, infoCSS, infoInnerCSS;

  var hideSidebarFn = function () {
    sidebarLeft = $("#sidebar").css("left");
    borderLeft = $("#sidebar-border").css("left");
    hideLeft = $("#hide-sidebar").css("left");
    infoCSS = $("#info-wrap").css(["left", "width"]);
    infoInnerCSS = $("#info").css(["width", "margin-right"]);
    $("#info-wrap").css({ left: "0px", width: "100%" });
    $("#info").css({ width: "auto", "margin-right": "80px" });
    $("#map").css("left", "0px");
    map.invalidateSize();
    var width = $("#sidebar").outerWidth();
    $("#sidebar").animate({ left: "-" + width + "px" }, 200);
    $("#sidebar-border").animate({ left: "-" + (width + 15) + "px" }, 200);
    $("#hide-sidebar").animate({ left: "0px" }, 200, function () {
      $("#hide-sidebar").addClass("show-sidebar");
    });
  };

  $(document).on("click", "div#hide-sidebar:not(.show-sidebar)", function () {
    hideSidebarFn();
    localStorage["hide-sidebar"] = true;
  });

  $(document).on("click", "div#hide-sidebar.show-sidebar", function () {
    showSidebarFn($(this));
    localStorage.removeItem("hide-sidebar");
  });

  var showSidebarFn = function (el) {
    $("#sidebar").animate({ left: sidebarLeft }, 200);
    $(el).animate({ left: hideLeft }, 200);
    $("#sidebar-border").animate({ left: borderLeft }, 200, function () {
      $(".show-sidebar").removeClass("show-sidebar");
    });
  };

  if (localStorage["hide-sidebar"]) {
    setTimeout(function () { hideSidebarFn(); }, 500);
  }

  $(window).on("resize", function () {
    if ($(".show-sidebar").length && $(this).width() > 768) {
      $(".show-sidebar").removeClass("show-sidebar");
    }
  });

  // 备份/恢复控件
  window.backupData = function () {
    var d = new Date();
    var filename = "witcher3map_backup_" + d.getFullYear() + "-" + (d.getMonth() + 1 < 10 ? "0" : "") + (d.getMonth() + 1) + "-" + (d.getDate() < 10 ? "0" : "") + d.getDate() + ".json";
    if (confirm($.t("controls.backupSave", { fileName: filename }))) {
      var blob = new Blob([JSON.stringify(localStorage)], { type: "text/plain;charset=utf-8" });
      saveAs(blob, filename);
    }
  };

  var restoreData = function () {
    if (!window.File && !window.FileReader && !window.FileList && !window.Blob) {
      alert($.t("controls.backupHtmlFail"));
      return;
    }
    if (!$("#restoreDiv").length) {
      var rect = $("#restoreButton")[0].getBoundingClientRect();
      var html = '<div id="restoreDiv" style="top:' + rect.top + "px;right:" + (14 + rect.right - rect.left) + 'px;"><div style="float:right;"><button class="fa fa-times-circle" onclick="$(\'#restoreDiv\').remove()" style="cursor:pointer" /></div><strong>' + $.t("controls.backupLoad") + '</strong><br/><input type="file" id="files" name="file[]" /></div>';
      $("body").append($(html));
      document.getElementById("files").addEventListener("change", function (evt) {
        var file = evt.target.files[0];
        var reader = new FileReader();
        reader.onload = function (e) {
          var text = e.target.result;
          try {
            var data = $.parseJSON(text);
            for (var key in data) {
              localStorage[key] = data[key];
            }
            alert($.t("controls.backupLoadSuccess"));
            location.reload();
          } catch (err) {
            alert($.t("controls.backupLoadFail"));
          } finally {
            $("#restoreDiv").remove();
          }
        };
        reader.readAsText(file);
      });
    }
  };

  var backupBtn = L.easyButton("fa-download", function () { window.backupData(); }, $.t("controls.backupDataButton"));
  var restoreBtn = L.easyButton("fa-upload", function () { restoreData(); }, $.t("controls.restoreDataButton"), "restoreButton");
  L.easyBar([backupBtn, restoreBtn]).addTo(map);

  // 笔记系统
  window.noteMarkers = {};
  var noteActive = false;
  var prevCursor = null;

  L.easyButton("fa-pencil", function () {
    if (noteActive) { stopNote(); } else { startNote(); }
  }, $.t("controls.addNoteButton"), "noteButton").addTo(map);

  L.easyButton("fa-crosshairs", function (btn, mapRef) {
    var params = hash.getHashParams();
    if (params && params.m) {
      var coords = params.m.split(",");
      mapRef.setView([coords[0], coords[1]]);
    } else {
      mapRef.setView(mapModule.map_center);
    }
  }, $.t("controls.centerMarkerButton"), "centerButton").addTo(map);

  window.getNoteKey = function (lat, lng) { return lat.toFixed(3) + "_" + lng.toFixed(3); };

  window.getNoteIndex = function (key) {
    var notes = getNotes();
    for (var i = 0; i < notes[mapPath].length; i++) {
      if (notes[mapPath][i].key === key) return i;
    }
    return -1;
  };

  var saveNotes = function () {
    localStorage["notes" + mapPath] = JSON.stringify(getNotes()[mapPath]);
  };

  window.saveNote = function (key) {
    var notes = getNotes();
    var note = notes[mapPath][getNoteIndex(key)];
    note.label = $("#note-label").val();
    note.title = $("#note-title").val();
    note.text = $("#note-text").val();
    var marker = window.noteMarkers[note.key];
    marker.bindLabel(note.label, labelOptions);
    marker.bindPopup(buildNotePopup(note));
    window.noteMarkers[note.key] = marker;
    saveNotes();
    $("#note-save").attr("disabled", true);
  };

  window.deleteNote = function (key) {
    var notes = getNotes();
    map.removeLayer(window.noteMarkers[key]);
    notes[mapPath].splice(getNoteIndex(key), 1);
    delete window.noteMarkers[key];
    saveNotes();
    closePopup();
  };

  var buildNotePopup = function (note) {
    var html = '<div id="note-popup"><div class="note-row"><label for="note-label" class="label" data-i18n="notes.label"></label><input type="text" id="note-label" data-i18n="[placeholder]notes.enterLabel" value="' + note.label + '" /></div>';
    html += '<div class="note-row"><label for="note-title" class="label" data-i18n="notes.title"></label><input type="text" id="note-title" data-i18n="[placeholder]notes.enterTitle" value="' + note.title + '" /></div>';
    html += '<div class="note-row"><label for="note-text" class="label top" data-i18n="notes.note"></label><textarea id="note-text" data-i18n="[placeholder]notes.enterText">' + note.text + "</textarea></div>";
    html += '<div><button id="note-save" onclick="saveNote(\'' + note.key + '\')" disabled><i class="fa fa-floppy-o"></i>&nbsp;<span data-i18n="notes.saveNote"></span></button>';
    html += "<button onclick=\"deleteNote('" + note.key + '\')"><i class="fa fa-trash-o"></i>&nbsp;<span data-i18n="notes.deleteNote"></span></button></div></div>';
    return html;
  };

  var renderNote = function (note) {
    var marker;
    if (note.label && note.label !== "") {
      marker = L.marker(L.latLng(note.lat, note.lng), setMarker("note_marker", icons.note_marker))
        .bindLabel(note.label, labelOptions)
        .bindPopup(buildNotePopup(note))
        .openPopup();
    } else {
      marker = L.marker(L.latLng(note.lat, note.lng), setMarker("note_marker", icons.note_marker))
        .bindPopup(buildNotePopup(note))
        .openPopup();
    }
    marker.addTo(map);
    window.noteMarkers[note.key] = marker;
  };

  var startNote = function () {
    noteActive = true;
    prevCursor = $(".leaflet-container").css("cursor");
    $(".leaflet-container").css("cursor", "crosshair");
    map.addEventListener("click", onMapClickForNote);
  };

  var stopNote = function () {
    noteActive = false;
    $(".leaflet-container").css("cursor", prevCursor);
    map.removeEventListener("click");
  };

  var onMapClickForNote = function (e) {
    var note = {
      key: getNoteKey(e.latlng.lat, e.latlng.lng),
      lat: e.latlng.lat,
      lng: e.latlng.lng,
      label: "",
      title: "",
      text: ""
    };
    renderNote(note);
    getNotes()[mapPath].push(note);
    saveNotes();
    stopNote();
    return false;
  };

  // 恢复保存的笔记
  var notesArr = getNotes();
  if (notesArr[mapPath]) {
    for (var i = 0; i < notesArr[mapPath].length; i++) {
      renderNote(notesArr[mapPath][i]);
    }
  }

  // Hash 参数恢复
  var params = hash.getHashParams();
  if (params) {
    if (params.w) {
      var wp = params.w.split(",");
      waypoint = new L.marker(L.latLng(wp[0], wp[1]), {
        icon: L.icon({ iconUrl: "/files/images/icons/waypoint.png", iconSize: [26, 32] })
      }).on("click", function () { map.removeLayer(waypoint); hash.removeParam("w"); })
        .on("contextmenu", function () { map.removeLayer(waypoint); hash.removeParam("w"); })
        .addTo(map);
    }
    if (params.m) {
      var mc = params.m.split(",");
      $.each(allLayers, function (i, layer) {
        $.each(layer.getLayers(), function (j, marker) {
          if (mc[0] == marker._latlng.lat && mc[1] == marker._latlng.lng) {
            marker.openPopup();
          }
        });
      });
    } else {
      $("#centerButton").hide();
    }
  } else {
    $("#centerButton").hide();
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/map.js
git commit -m "feat: add map page entry point with full Leaflet map initialization"
```

---

### Task 11: 创建 src/main.js（主页入口）

**Files:**
- Create: `src/main.js`

> 从 `home.js` 提取搜索功能，使用 `import()` 动态加载所有地图数据和 Fuse.js。

- [ ] **Step 1: 创建 src/main.js**

```js
import { initI18n, initLangSwitcher, regionToMapdata } from './modules/i18n.js';
import Fuse from 'fuse.js';

const $ = window.$;

// 主页不需要完整 Leaflet，创建最小 L 存根
window.L = window.L || {};
window.L.latLng = window.L.latLng || function () {};

window.markers = {};

// 初始化 i18n
initI18n().then(function () {
  initLangSwitcher();
  loadAllMapData();
});

// 加载所有地图数据并构建搜索索引
var count = 0;
var mapdata = [];

function loadAllMapData() {
  var regions = Object.values(regionToMapdata);
  var promises = regions.map(function (name) {
    return import("/files/scripts/mapdata-" + name + ".js").then(function (mod) {
      return { name: name, module: mod };
    });
  });

  Promise.all(promises).then(function (results) {
    results.forEach(function (result) {
      var regionKey = Object.keys(regionToMapdata).find(function (k) { return regionToMapdata[k] === result.name; });
      // regionKey is the short map code like 'w', 'v', etc.
      // 我们需要从完整的 map 名称中推断
      var mapLabel = result.name;
      processDataForSearch(mapLabel, result.module.default, regionKey);
    });

    // 搜索 UI
    var searchInput = $("#search");
    searchInput.on("keyup", function () { doSearch(); });
    if (searchInput.val()) doSearch();

    $("#clear").on("click", function () {
      $("#search").val("");
      $("#results").empty();
      $("#clear").hide();
      $("#nav").show();
    });

    // 滚动固定搜索栏
    $(function () {
      var searchWrapper = $("#search-input-wrapper");
      var wrapperPos = searchWrapper.position();
      $(window).scroll(function () {
        if ($(window).scrollTop() >= wrapperPos.top) {
          if ($("#search").val()) searchWrapper.addClass("sticky");
        } else {
          searchWrapper.removeClass("sticky");
        }
      });
    });
  });
}

function processDataForSearch(mapName, data, regionCode) {
  var baseUrl = regionCode ? regionCode + ".html" : "";
  $.each(data, function (category, items) {
    $.each(items, function (i, item) {
      if (item && item.popup) {
        var link = window.location.href.replace(window.location.hash, "").toString().replace(/index\.html$/, "") + baseUrl + "#3/" + item.coords[0][0] + "/" + item.coords[0][1] + "/m=" + item.coords[0][0] + "," + item.coords[0][1];
        var plainPopup = item.popup.replace(/<\/?[^>]+(>|$)/g, "");
        var title = item.popupTitle ? item.popupTitle : "";
        var label;
        if (title === "") {
          label = item.label;
        } else if (title.indexOf(item.label) > -1) {
          label = title;
        } else {
          label = item.label + " (" + title + ")";
        }
        mapdata.push({
          id: count,
          map: $.t("maps." + mapName),
          label: label,
          popup: plainPopup,
          link: link
        });
        count++;
      }
    });
  });
}

function doSearch() {
  var input = $("#search");
  var results = $("#results");
  var query = input.val();

  if (query.length === 0) {
    results.empty();
    $("#clear").hide();
    $("#nav").show();
    return;
  }

  $("#clear").show();
  $("#nav").hide();

  var fuse = new Fuse(mapdata, {
    caseSensitive: false,
    includeScore: false,
    shouldSort: true,
    threshold: 0.2,
    location: 0,
    distance: 10000,
    keys: ["map", "label", "popup"]
  });

  var searchResults = fuse.search(query);
  results.empty();

  var header = "<li>" + searchResults.length + " " + $.t("home.resultsFound") + "</li>";
  results.append($(header));

  for (var i = 0; i < searchResults.length; i++) {
    var item = searchResults[i];
    var html = '<li><div><a href="' + item.link + '">' + item.label + " - " + item.map + '</a></div><div class="searchDescription"><div class="truncated" onclick="toggleTruncate(event, this)">' + item.popup + "</div></div></li>";
    results.append($(html));
  }
}

window.toggleTruncate = function (event, el) {
  event.preventDefault();
  event.stopPropagation();
  $(el).toggleClass("truncated");
};
```

- [ ] **Step 2: Commit**

```bash
git add src/main.js
git commit -m "feat: add home page entry with Fuse.js search and async mapdata loading"
```

---

### Task 12: 转换 mapdata 文件为 ESM

**Files:**
- Modify: `public/files/scripts/mapdata-white_orchard.js`
- Modify: `public/files/scripts/mapdata-hos_velen.js`
- Modify: `public/files/scripts/mapdata-gaunter.js`
- Modify: `public/files/scripts/mapdata-skellige.js`
- Modify: `public/files/scripts/mapdata-kaer_morhen.js`
- Modify: `public/files/scripts/mapdata-toussaint.js`
- Modify: `public/files/scripts/mapdata-fables.js`
- Modify: `public/files/scripts/mapdata-isle_mists.js`

- [ ] **Step 1: 转换 mapdata-white_orchard.js**

将：
```js
window.map_path  = 'white_orchard';
window.map_sWest = L.latLng(-85,-180);
window.map_nEast = L.latLng(0,45);
window.map_center = [-65.000,-65.000];
window.map_minZoom = 2;
window.map_mZoom = 5;
window.map_Zoom = 3;
window.mapdata_white_orchard = {
    abandoned: [...],
    ...
};
```

改为：
```js
const $ = window.$;
const L = window.L;

export const map_path = 'white_orchard';
export const map_sWest = L.latLng(-85, -180);
export const map_nEast = L.latLng(0, 45);
export const map_center = [-65.000, -65.000];
export const map_minZoom = 2;
export const map_mZoom = 5;
export const map_Zoom = 3;

export default {
    abandoned: [...],
    ...
};
```

具体修改模式：
1. 将所有 `window.xxx = value`（地图元数据）改为 `export const xxx = value`
2. 将 `window.mapdata_xxx = {...}` 改为 `export default {...}`
3. 在文件顶部添加 `const $ = window.$;` 和 `const L = window.L;`（因为文件内使用了 `$.t()` 和 `L.latLng()`）
4. 文件内部数据（对象字面量）**保持完全不变**

- [ ] **Step 2-8: 对剩余 7 个 mapdata 文件执行相同转换**

每个文件按照相同模式转换，仅区域名称和 meta 值不同。

- [ ] **Step 9: Commit**

```bash
git add public/files/scripts/mapdata-*.js
git commit -m "refactor: convert all mapdata files to ESM export default"
```

---

### Task 13: 运行构建并验证

**Files:**
- Modify: 构建过程中发现的任何需要修复的文件

- [ ] **Step 1: 运行开发服务器**

```bash
npx vite
```

打开浏览器访问 `http://localhost:5173`，验证：
- 主页加载正常，搜索功能可用
- 各地图页面加载正常，Leaflet 地图渲染正确
- 标记、弹出窗口、侧边栏交互正常
- 语言切换正常
- 笔记功能可用

- [ ] **Step 2: 运行生产构建**

```bash
npx vite build
```

检查 `dist/` 目录结构和输出：
- 所有 9 个 HTML 页面生成
- `dist/assets/` 包含哈希化的 JS/CSS 文件
- `dist/files/` 包含所有静态资源

- [ ] **Step 3: 预览生产构建**

```bash
npx vite preview
```

访问 `http://localhost:4173`，再次验证所有功能。

- [ ] **Step 4: 修复构建过程中发现的任何问题**

根据实际情况处理。常见问题：
- 路径不匹配 → 检查 import 路径和 HTML 引用
- `$` 或 `L` 未定义 → 确保全局脚本在模块之前加载
- 动态 import 路径错误 → 确保路径以 `/` 开头（绝对路径）
- `Fuse` 未定义 → 确保 `import Fuse from 'fuse.js'` 正常工作

- [ ] **Step 5: 添加 .gitignore**

```
node_modules/
dist/
```

```bash
git add .gitignore
git commit -m "chore: add .gitignore for node_modules and dist"
```

- [ ] **Step 6: 最终 commit**

```bash
git add -A
git commit -m "chore: build verification fixes"
```

---

### Task 14: 更新 README

**Files:**
- Modify: `README.md`

- [ ] **Step 1: 在 README 中添加开发/构建/离线使用说明**

在 README 末尾追加：

```markdown
## Development

```bash
# Install dependencies
npm install

# Start dev server with HMR
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## Offline Usage

After building the project, serve the `dist/` directory with any static file server:

```bash
# Using npx (no install required)
npx serve dist

# Using Python
python -m http.server -d dist 8000

# Or simply open dist/ with any local web server
```

All features work fully offline — no internet connection required once the map tiles are cached.
```

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "docs: add development, build, and offline usage instructions"
```

---

## Plan Summary

| Task | 内容 | 文件 |
|------|------|------|
| 1 | npm 初始化 | `package.json` |
| 2 | Vite MPA 配置 | `vite.config.js` |
| 3 | 静态资源迁移 | `public/` |
| 4 | 地图页面 HTML | `w.html` ~ `f.html` (8 files) |
| 5 | 主页 HTML 更新 | `index.html` |
| 6 | 图标模块 | `src/modules/icons.js` |
| 7 | 数据加载模块 | `src/modules/mapdata-loader.js` |
| 8 | 标记管理模块 | `src/modules/markers.js` |
| 9 | i18n 模块 | `src/modules/i18n.js` |
| 10 | 地图入口 | `src/map.js` |
| 11 | 主页入口 | `src/main.js` |
| 12 | mapdata ESM 转换 | `public/files/scripts/mapdata-*.js` (8 files) |
| 13 | 构建验证 | 构建、预览、修复 |
| 14 | 文档更新 | `README.md` |
