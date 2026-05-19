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
