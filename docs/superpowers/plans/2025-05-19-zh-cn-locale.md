# 添加简体中文 (zh-CN) 语言支持 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将项目从 2 位语言码升级为完整 locale 码，重命名 zh→zh-tw，新增 zh-cn 简体中文

**Architecture:** 保持现有 i18n 架构不变，仅将语言标识从 2 位码改为完整 locale 码（zh-cn, zh-tw）。语言检测对中文保留完整 locale，其他语言维持 2 位截断。Crowdin 专业翻译数据优先使用，缺失内容从繁体转换。

**Tech Stack:** Node.js, opencc-js (繁→简转换), 纯 JSON 数据

---

### Task 1: 重命名 zh 目录为 zh-tw

**Files:**
- Rename: `public/files/locales/zh/` → `public/files/locales/zh-tw/`

- [ ] **Step 1: 执行目录重命名**

```powershell
Rename-Item -Path "C:\Users\elvis\Documents\dev\web\witcher3map\public\files\locales\zh" -NewName "zh-tw"
```

- [ ] **Step 2: 验证重命名结果**

```powershell
Get-ChildItem "C:\Users\elvis\Documents\dev\web\witcher3map\public\files\locales\zh-tw" | Select-Object Name
```

Expected: 列出 9 个 JSON 文件（f.json, g.json, general.json, i.json, k.json, s.json, t.json, v.json, w.json）

- [ ] **Step 3: 提交**

```bash
git add public/files/locales/zh-tw/
git add public/files/locales/zh/
git commit -m "refactor: rename zh locale directory to zh-tw"
```

---

### Task 2: 复制 Crowdin 数据到 zh-cn 目录

**Files:**
- Create: `public/files/locales/zh-cn/general.json`
- Create: `public/files/locales/zh-cn/k.json`
- Create: `public/files/locales/zh-cn/s.json`
- Create: `public/files/locales/zh-cn/t.json`
- Create: `public/files/locales/zh-cn/v.json`
- Create: `public/files/locales/zh-cn/w.json`

- [ ] **Step 1: 创建 zh-cn 目录并复制 Crowdin 文件**

```powershell
New-Item -ItemType Directory -Path "C:\Users\elvis\Documents\dev\web\witcher3map\public\files\locales\zh-cn" -Force
Copy-Item "C:\Users\elvis\Documents\dev\web\translate\zh-cn\*" -Destination "C:\Users\elvis\Documents\dev\web\witcher3map\public\files\locales\zh-cn\"
```

- [ ] **Step 2: 验证文件已复制**

```powershell
Get-ChildItem "C:\Users\elvis\Documents\dev\web\witcher3map\public\files\locales\zh-cn" | Select-Object Name
```

Expected: 列出 6 个文件（general.json, k.json, s.json, t.json, v.json, w.json）

- [ ] **Step 3: 提交**

```bash
git add public/files/locales/zh-cn/
git commit -m "feat: add zh-cn locale files from Crowdin"
```

---

### Task 3: 编写并使用繁→简转换脚本生成缺失文件

**Files:**
- Create: `scripts/convert-zh.js` (一次性脚本，用完即删)
- Create: `public/files/locales/zh-cn/f.json`
- Create: `public/files/locales/zh-cn/g.json`
- Create: `public/files/locales/zh-cn/i.json`
- Modify: `public/files/locales/zh-cn/general.json` (填充缺失 key)

- [ ] **Step 1: 安装 opencc-js 依赖**

```powershell
cd "C:\Users\elvis\Documents\dev\web\witcher3map"
npm install --save-dev opencc-js
```

- [ ] **Step 2: 编写转换脚本**

```javascript
// scripts/convert-zh.js
const fs = require('fs');
const path = require('path');
const OpenCC = require('opencc-js');

const LOCALES_DIR = path.join(__dirname, '..', 'public', 'files', 'locales');
const CROWDIN_DIR = 'C:/Users/elvis/Documents/dev/web/translate/zh-cn';

async function main() {
  const converter = OpenCC.Converter({ from: 'tw', to: 'cn' });

  // Deep convert all string values in an object
  function convertStrings(obj) {
    if (typeof obj === 'string') {
      return converter(obj);
    }
    if (Array.isArray(obj)) {
      return obj.map(item => convertStrings(item));
    }
    if (obj !== null && typeof obj === 'object') {
      const result = {};
      for (const [key, value] of Object.entries(obj)) {
        result[key] = convertStrings(value);
      }
      return result;
    }
    return obj;
  }

  // 1. Convert f.json, g.json, i.json from zh-tw
  for (const file of ['f.json', 'g.json', 'i.json']) {
    const twData = JSON.parse(fs.readFileSync(path.join(LOCALES_DIR, 'zh-tw', file), 'utf8'));
    const cnData = convertStrings(twData);
    fs.writeFileSync(
      path.join(LOCALES_DIR, 'zh-cn', file),
      JSON.stringify(cnData, null, '\t'),
      'utf8'
    );
    console.log(`Converted: ${file}`);
  }

  // 2. For general.json: merge Crowdin data + converted missing keys from zh-tw
  const twGeneral = JSON.parse(fs.readFileSync(path.join(LOCALES_DIR, 'zh-tw', 'general.json'), 'utf8'));
  const cnGeneral = JSON.parse(fs.readFileSync(path.join(LOCALES_DIR, 'zh-cn', 'general.json'), 'utf8'));

  // Find keys in zh-tw that don't exist in zh-cn Crowdin data
  const missingKeys = Object.keys(twGeneral).filter(k => !(k in cnGeneral));
  console.log(`Missing keys in general.json: ${missingKeys.join(', ')}`);

  for (const key of missingKeys) {
    cnGeneral[key] = convertStrings(twGeneral[key]);
    console.log(`Merged key: ${key}`);
  }

  fs.writeFileSync(
    path.join(LOCALES_DIR, 'zh-cn', 'general.json'),
    JSON.stringify(cnGeneral, null, '\t'),
    'utf8'
  );
  console.log('general.json merge complete');
}

main().catch(err => { console.error(err); process.exit(1); });
```

- [ ] **Step 3: 运行转换脚本**

```powershell
cd "C:\Users\elvis\Documents\dev\web\witcher3map"
node scripts/convert-zh.js
```

Expected: 输出每个已转换/合并的文件，无报错

- [ ] **Step 4: 验证 zh-cn 目录现在有 9 个文件**

```powershell
Get-ChildItem "C:\Users\elvis\Documents\dev\web\witcher3map\public\files\locales\zh-cn" | Select-Object Name
```

Expected: general.json, f.json, g.json, i.json, k.json, s.json, t.json, v.json, w.json (共 9 个)

- [ ] **Step 5: 清理转换脚本和依赖**

```powershell
cd "C:\Users\elvis\Documents\dev\web\witcher3map"
Remove-Item "scripts/convert-zh.js"
npm uninstall opencc-js
```

- [ ] **Step 6: 提交**

```bash
git add public/files/locales/zh-cn/f.json public/files/locales/zh-cn/g.json public/files/locales/zh-cn/i.json public/files/locales/zh-cn/general.json
git commit -m "feat: add converted zh-cn files for f, g, i regions and fill missing general.json keys"
```

---

### Task 4: 更新 i18n 模块

**Files:**
- Modify: `src/modules/i18n.js`

- [ ] **Step 1: 修改语言检测逻辑（第 14-18 行）**

将：
```js
if (localStorage.lang == null) {
  var lang = window.navigator.userLanguage || window.navigator.language;
  lang = lang.substring(0, 2);
  localStorage.lang = lang;
}
```

改为：
```js
if (localStorage.lang == null) {
  var lang = window.navigator.userLanguage || window.navigator.language;
  if (lang.toLowerCase().startsWith('zh')) {
    lang = lang.toLowerCase().replace('_', '-');
  } else {
    lang = lang.substring(0, 2);
  }
  localStorage.lang = lang;
}
```

- [ ] **Step 2: 更新白名单（第 28 行）**

将：
```js
lngWhitelist: ["en", "cz", "pl", "ru", "tr", "zh"]
```

改为：
```js
lngWhitelist: ["en", "cz", "pl", "ru", "tr", "zh-tw", "zh-cn"]
```

- [ ] **Step 3: 更新语言下拉选项（第 36 行）**

将：
```js
{ text: "中國傳統的", value: "zh", selected: "zh" == localStorage.lang, description: " ", imageSrc: "/files/images/flags/zh.png" },
```

改为：
```js
{ text: "繁體中文", value: "zh-tw", selected: "zh-tw" == localStorage.lang, description: " ", imageSrc: "/files/images/flags/zh.png" },
{ text: "简体中文", value: "zh-cn", selected: "zh-cn" == localStorage.lang, description: " ", imageSrc: "/files/images/flags/cn.png" },
```

注意：`cn.png` 旗帜文件已存在于 `public/files/images/flags/cn.png`。

- [ ] **Step 4: 验证 i18n.js 最终内容**

确认 `src/modules/i18n.js` 中的关键部分为：

```js
if (localStorage.lang == null) {
  var lang = window.navigator.userLanguage || window.navigator.language;
  if (lang.toLowerCase().startsWith('zh')) {
    lang = lang.toLowerCase().replace('_', '-');
  } else {
    lang = lang.substring(0, 2);
  }
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
  lngWhitelist: ["en", "cz", "pl", "ru", "tr", "zh-tw", "zh-cn"]
};

var languageOptions = [
  { text: "English", value: "en", selected: "en" == localStorage.lang, description: " ", imageSrc: "/files/images/flags/en.png" },
  { text: "Čeština", value: "cz", selected: "cz" == localStorage.lang, description: " ", imageSrc: "/files/images/flags/cz.png" },
  { text: "Polski", value: "pl", selected: "pl" == localStorage.lang, description: " ", imageSrc: "/files/images/flags/pl.png" },
  { text: "Русский", value: "ru", selected: "ru" == localStorage.lang, description: " ", imageSrc: "/files/images/flags/ru.png" },
  { text: "Türkçe", value: "tr", selected: "tr" == localStorage.lang, description: " ", imageSrc: "/files/images/flags/tr.png" },
  { text: "繁體中文", value: "zh-tw", selected: "zh-tw" == localStorage.lang, description: " ", imageSrc: "/files/images/flags/zh.png" },
  { text: "简体中文", value: "zh-cn", selected: "zh-cn" == localStorage.lang, description: " ", imageSrc: "/files/images/flags/cn.png" },
];
```

- [ ] **Step 5: 提交**

```bash
git add src/modules/i18n.js
git commit -m "feat: add zh-cn language support with full locale code detection"
```

---

### Task 5: 构建并验证

**Files:**
- 无新建文件

- [ ] **Step 1: 构建项目**

```powershell
cd "C:\Users\elvis\Documents\dev\web\witcher3map"
npm run build
```

Expected: 构建成功，无报错

- [ ] **Step 2: 验证构建产物中包含 zh-cn 和 zh-tw 文件**

```powershell
Get-ChildItem "C:\Users\elvis\Documents\dev\web\witcher3map\dist\files\locales\zh-cn" | Select-Object Name
Get-ChildItem "C:\Users\elvis\Documents\dev\web\witcher3map\dist\files\locales\zh-tw" | Select-Object Name
```

Expected: 两个目录各有 9 个 JSON 文件

- [ ] **Step 3: 快速抽查简体中文文件内容**

```powershell
cd "C:\Users\elvis\Documents\dev\web\witcher3map"
node -e "
const fs = require('fs');
const data = JSON.parse(fs.readFileSync('./dist/files/locales/zh-cn/general.json','utf8'));
console.log('sidebar.abandoned:', data.sidebar.abandoned);
console.log('maps.white_orchard:', data.maps.white_orchard);
console.log('maps.velen:', data.maps.velen);
console.log('maps.skellige:', data.maps.skellige);
console.log('maps.kaer_morhen:', data.maps.kaer_morhen);
console.log('maps.toussaint:', data.maps.toussaint);
console.log('controls.show:', data.controls.show);
"
```

Expected: 输出简体中文内容，不是繁体中文（如"白果园"而非"白果園"，"史凯利杰群岛"而非"史凱利傑群島"）

- [ ] **Step 4: 验证 npm run build 无报错后提交**

如果一切正常，无需额外提交（构建产物通常在 .gitignore 中）。如果 dist 被跟踪，更新 dist：

```bash
git add dist/
git commit -m "chore: update dist with zh-cn and zh-tw locale files"
```
