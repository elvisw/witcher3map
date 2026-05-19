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
    return import(`./data/mapdata-${name}.js`).then(function (mod) {
      return { name: name, module: mod };
    });
  });

  Promise.all(promises).then(function (results) {
    results.forEach(function (result) {
      // Find the region short code
      var regionKey = Object.keys(regionToMapdata).find(function (k) {
        return regionToMapdata[k] === result.name;
      });
      processDataForSearch(result.name, result.module.default, regionKey);
    });

    // Search UI setup - same as original home.js
    var searchInput = $("#search");
    searchInput.on("keyup", function () { doSearch(); });
    if (searchInput.val()) doSearch();

    $("#clear").on("click", function () {
      $("#search").val("");
      $("#results").empty();
      $("#clear").hide();
      $("#nav").show();
    });

    // Sticky search on scroll
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
