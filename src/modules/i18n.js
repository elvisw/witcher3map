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
 * @returns {Promise<string|null>} 地图区域名 (null = 主页)
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
