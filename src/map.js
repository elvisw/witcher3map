import Fuse from 'fuse.js';
import icons from './modules/icons.js';
import { loadMapData } from './modules/mapdata-loader.js';
import {
  getMarkers, getMarkerCount, getNotes, setMapPath,
  processData, createMarker, setMarker, resetInvisibleMarkers,
  mapPath
} from './modules/markers.js';
import { initI18n, regionToMapdata } from './modules/i18n.js';

// Set Leaflet default icon path
L.Icon.Default.imagePath = '/files/images/leaflet';

// Backward compat: functions called from HTML onclick handlers or inline scripts
window.createMarker = createMarker;
window.resetInvisibleMarkers = resetInvisibleMarkers;

window.toggleTruncate = function (event, el) {
  event.preventDefault();
  event.stopPropagation();
  $(el).toggleClass('truncated');
};

$(function () {
  (async function () {
    // =========================================================================
    // 1. Init i18n and determine current map region
    // =========================================================================
    var regionShort = await initI18n();
    if (!regionShort) return; // not a map page (should not happen)

    var mapdataName = regionToMapdata[regionShort];

    // =========================================================================
    // 2. Set map path, load map data, build markers
    // =========================================================================
    setMapPath(mapdataName);
    var mapModule = await loadMapData(mapdataName);

    // Set window globals expected by map initialization code
    window.map_path      = mapModule.map_path;
    window.map_sWest     = mapModule.map_sWest;
    window.map_nEast     = mapModule.map_nEast;
    window.map_center    = mapModule.map_center;
    window.map_minZoom   = mapModule.map_minZoom;
    window.map_mZoom     = mapModule.map_mZoom;
    window.map_Zoom      = mapModule.map_Zoom;

    // Process map data into Leaflet markers
    processData(mapModule.default);

    // =========================================================================
    // 3. Build allLayers array
    // =========================================================================
    var ms = getMarkers();
    window.allLayers = [
      ms.abandoned, ms.alchemy, ms.armourer, ms.armourerstable,
      ms.banditcamp, ms.barber, ms.blacksmith, ms.boat,
      ms.brothel, ms.contracts, ms.entrance, ms.event,
      ms.grindstone, ms.guarded, ms.gwent, ms.gwentquest,
      ms.hansebase, ms.harbor, ms.herbalist, ms.hidden,
      ms.hollow, ms.honeycomb, ms.innkeep, ms.kid,
      ms.monsterden, ms.monsternest, ms.notice, ms.pid,
      ms.pop, ms.poi, ms.scavenger, ms.shopkeeper,
      ms.sidequests, ms.signalfire, ms.signpost, ms.smugglers,
      ms.spoils, ms.treasure, ms.vineyardinfestation,
    ];
    // Remove undefined entries (marker types not present on this map)
    window.allLayers = window.allLayers.filter(function (layer) { return layer !== undefined; });

    // =========================================================================
    // 4. Variable declarations used throughout the map code
    // =========================================================================
    var sidebarOrigLeft,
        sidebarBorderOrigLeft,
        hideSidebarOrigLeft,
        infoWrapOrigCSS,
        infoOrigCSS;

    var isMobile = $('#sidebar').width() < 300;
    var waypointMarker = null;
    var centerCircle = null;

    // =========================================================================
    // 5. Restore saved UI state from localStorage
    // =========================================================================
    if (localStorage.hideWarn) $('#warn').remove();

    if (localStorage['hide-all-' + window.map_path]) {
      $('#hide-all').hide();
      $('#show-all').show();
    }

    if (localStorage['hide-monsters']) {
      $('#info').addClass('hideMonsters');
      $('#hide-monsters').hide();
      $('#show-monsters').show();
    }

    // =========================================================================
    // 6. Copyright bar positioning
    // =========================================================================
    var positionCopyright = function () {
      if ($(window).height() > $('#sidebar-wrap').outerHeight() + $('div#copyright').outerHeight() + 45) {
        $('div#copyright').addClass('absolute');
      } else {
        $('div#copyright').removeClass('absolute');
      }
    };
    positionCopyright();
    $(window).on('resize', positionCopyright);

    // =========================================================================
    // 7. NiceScroll
    // =========================================================================
    $('div#sidebar').niceScroll({ cursorcolor: '#5E4F32', cursorborder: 'none' });
    $('div#info').niceScroll({ cursorcolor: '#5E4F32', cursorborder: 'none' });

    // =========================================================================
    // 8. Create the Leaflet map
    // =========================================================================
    var labelOptions = { direction: 'auto' };

    var mapOptions = {
      minZoom: window.map_minZoom,
      maxZoom: window.map_mZoom,
      center: window.map_center,
      zoom: window.map_Zoom,
      attributionControl: false,
      zoomControl: false,
      layers: window.allLayers,
    };

    // Some maps use L.CRS.Simple (pixel coordinates)
    if (mapdataName === 'hos_velen' || mapdataName === 'gaunter' ||
        mapdataName === 'toussaint' || mapdataName === 'kaer_morhen') {
      mapOptions.crs = L.CRS.Simple;
    }

    var map = L.map('map', mapOptions);

    // =========================================================================
    // 9. window.go - called by search results
    // =========================================================================
    window.go = function (latlng) {
      map.setView(latlng);
      map.setZoom(window.map_minZoom);
      map.setZoom(window.map_mZoom);
      map.setZoom(window.map_Zoom);
      L.marker(latlng, {
        icon: L.icon({ iconUrl: '/files/images/searchhover.png', iconSize: [22, 22] }),
      }).addTo(map);
    };

    // =========================================================================
    // 10. Zoom control
    // =========================================================================
    new L.Control.Zoom({
      position: 'topright',
      zoomInTitle: $.t('controls.zoomInButton'),
      zoomOutTitle: $.t('controls.zoomOutButton'),
    }).addTo(map);

    // =========================================================================
    // 11. Fullscreen control
    // =========================================================================
    new L.Control.Fullscreen({
      position: 'topright',
      title: {
        false: $.t('controls.viewFullscreenButton'),
        true: $.t('controls.exitFullscreenButton'),
      },
    }).addTo(map);

    // =========================================================================
    // 12. URL hash (deep-linking via L.Hash)
    // =========================================================================
    var hash = new L.Hash(map);

    // =========================================================================
    // 13. Max bounds
    // =========================================================================
    var bounds = L.latLngBounds(window.map_sWest, window.map_nEast);
    map.setMaxBounds(bounds);

    // =========================================================================
    // 14. Search control (desktop only)
    // =========================================================================
    if (!isMobile) {
      var searchData = [];

      $.each(window.allLayers, function (idx, layer) {
        if (!layer._layers) return;
        $.each(layer._layers, function (idx2, marker) {
          if (!marker._latlng || !marker._popup) return;
          searchData.push({
            loc: [marker._latlng.lat, marker._latlng.lng],
            title: marker._popup._content
              .replace(/<h1>/g, '')
              .replace(/<\/h1>/g, ' - ')
              .replace(/\\'/g, ''),
          });
        });
      });

      map.addControl(new L.Control.Search({
        autoResize: false,
        autoType: false,
        minLength: 2,
        position: 'topright',
        autoCollapse: false,
        zoom: 5,
        text: $.t('controls.searchButton'),
        filterJSON: function (data) { return data; },
        callData: function (query, callback) {
          var fuse = new Fuse(searchData, {
            caseSensitive: false,
            includeScore: false,
            shouldSort: true,
            tokenize: false,
            threshold: 0.2,
            location: 0,
            distance: 10000,
            maxPatternLength: 32,
            keys: ['title'],
          });
          callback(fuse.search(query));
          setTimeout(function () {
            $('.search-tooltip').getNiceScroll().resize();
          }, 200);
          return {
            abort: function () {
              console.log('aborted request: ' + query);
            },
          };
        },
      }));

      $('.search-tooltip').niceScroll({
        cursorcolor: '#5E4F32',
        cursorborder: 'none',
        horizrailenabled: false,
      });
    }

    // =========================================================================
    // 15. Tile layers
    // =========================================================================
    var tileOptions = {
      tms: true,
      bounds: bounds,
      noWrap: true,
    };

    if (mapdataName === 'hos_velen' || mapdataName === 'gaunter' || mapdataName === 'isle_mists' ||
        mapdataName === 'skellige' || mapdataName === 'white_orchard' || mapdataName === 'toussaint' ||
        mapdataName === 'kaer_morhen' || mapdataName === 'fables') {
      tileOptions.continuousWorld = true;
      tileOptions.crs = L.CRS.Simple;
    }

    L.tileLayer('/files/maps/' + window.map_path + '/{z}/{x}/{y}.png', tileOptions).addTo(map);
    L.tileLayer('/files/maps/' + window.map_path + '/{z}/{x}/{y}.jpg', tileOptions).addTo(map);

    // =========================================================================
    // 16. Drag bounds constraint
    // =========================================================================
    map.dragging._draggable.on('predrag', function () {
      var offset = map._initialTopLeftPoint.subtract(this._newPos);
      this._newPos = this._newPos.subtract(
        map._getBoundsOffset(new L.Bounds(offset, offset.add(map.getSize())), map.options.maxBounds)
      );
    });

    // =========================================================================
    // 17. Context menu - waypoint placement
    // =========================================================================
    map.on('contextmenu', function (e) {
      if (!bounds.contains(e.latlng)) return false;
      if (waypointMarker) map.removeLayer(waypointMarker);
      waypointMarker = L.marker(e.latlng, {
        icon: L.icon({ iconUrl: '/files/images/icons/waypoint.png', iconSize: [26, 32] }),
      })
        .on('click', function () {
          map.removeLayer(waypointMarker);
          waypointMarker = null;
          hash.removeParam('w');
        })
        .on('contextmenu', function () {
          map.removeLayer(waypointMarker);
          waypointMarker = null;
          hash.removeParam('w');
        })
        .addTo(map);
      hash.addParam('w', e.latlng.lat.toFixed(3) + ',' + e.latlng.lng.toFixed(3));
    });

    $('.leaflet-marker-icon').on('contextmenu', function () {
      return false;
    });

    // =========================================================================
    // 18. Popup open handling
    // =========================================================================
    map.on('popupopen', function (e) {
      showCenterCircle(e.popup._latlng.lat, e.popup._latlng.lng);
      $('#info-wrap').stop();
      $('#info').html(e.popup._source._popup._content);
      $('#info').getNiceScroll(0).doScrollTop(0, 0);
      $('#info-wrap').fadeIn('fast');
      if ($('#info').html().indexOf('class="note-row"') > -1) {
        initNoteChangeHandlers();
      }
      console.log('Popup at:');
      console.log('[' + e.popup._latlng.lat.toFixed(3) + ', ' + e.popup._latlng.lng.toFixed(3) + ']');
    });

    // Show a red circle to highlight the popup location
    var showCenterCircle = function (lat, lng) {
      var noteKey = window.getNoteKey(lat, lng);
      var notesArray = getNotes()[mapPath] || [];
      if (notesArray[window.getNoteIndex(noteKey)]) {
        return; // This is an existing note - don't show center button
      }
      hash.addParam('m', lat + ',' + lng);
      $('#centerButton').show();
      centerCircle = L.circleMarker(L.latLng(lat, lng), {
        color: 'red',
        fillColor: '#f03',
        fillOpacity: 0.5,
        radius: 20,
      }).addTo(map);
    };

    var hideCenterCircle = function () {
      if (centerCircle !== null) {
        map.removeLayer(centerCircle);
        centerCircle = null;
        hash.removeParam('m');
        $('#centerButton').hide();
      }
    };

    var closeInfoPanel = function () {
      $('#info-wrap').fadeOut('fast', function () {
        $('#info').html('');
        hideCenterCircle();
        map.closePopup();
      });
    };

    map.on('popupclose', function () {
      closeInfoPanel();
      if (notePopupActive) {
        removeNoteChangeHandlers();
      }
    });

    // =========================================================================
    // 19. Restore marker visibility from localStorage
    // =========================================================================
    if (localStorage['markers-' + window.map_path]) {
      var markerVisibility = $.parseJSON(localStorage['markers-' + window.map_path]);
      $.each(markerVisibility, function (key, value) {
        if (value === false) {
          $('i.' + key).parent().addClass('layer-disabled');
          map.removeLayer(getMarkers()[key]);
        }
      });
    }

    // =========================================================================
    // 20. Marker count pills
    // =========================================================================
    $('ul.key:not(.controls) li:not(.none) i').each(function () {
      var className = $(this).attr('class');
      var pill = $("<div class='pill'>" + (getMarkerCount()[className] || 0) + '</div>');
      $(this).next().after(pill);
      if (localStorage['hide-counts']) pill.hide();
    }).promise().done(function () {
      if (localStorage['hide-counts']) {
        $('#hide-counts').hide();
        $('#show-counts').show();
      }
    });

    // =========================================================================
    // 21. Hide all / Show all layers
    // =========================================================================
    $('#hide-all').on('click', function () {
      var stored = localStorage['markers-' + window.map_path]
        ? $.parseJSON(localStorage['markers-' + window.map_path])
        : {};
      $.each(window.allLayers, function (idx, layer) {
        map.removeLayer(layer);
      });
      $.each($('ul.key:not(.controls) li:not(.none) i'), function (idx, el) {
        stored[$(el).attr('class')] = false;
      });
      $('ul.key:first li').each(function (idx, el) {
        $(el).addClass('layer-disabled');
      });
      $(this).hide();
      $('#show-all').show();
      localStorage['markers-' + window.map_path] = JSON.stringify(stored);
      localStorage['hide-all-' + window.map_path] = true;
    });

    $('#show-all').on('click', function () {
      var stored = localStorage['markers-' + window.map_path]
        ? $.parseJSON(localStorage['markers-' + window.map_path])
        : {};
      $.each(window.allLayers, function (idx, layer) {
        map.addLayer(layer);
      });
      $.each($('ul.key:not(.controls) li:not(.none) i'), function (idx, el) {
        stored[$(el).attr('class')] = true;
      });
      $('ul.key:first li').each(function (idx, el) {
        $(el).removeClass('layer-disabled');
      });
      $(this).hide();
      $('#hide-all').show();
      localStorage['markers-' + window.map_path] = JSON.stringify(stored);
      localStorage.removeItem('hide-all-' + window.map_path);
    });

    // =========================================================================
    // 22. Hide counts / Show counts
    // =========================================================================
    $('#hide-counts').on('click', function () {
      $('ul.key:not(.controls) > li:not(.none) i').each(function () {
        $(this).siblings(':last').hide();
      });
      $(this).hide();
      $('#show-counts').show();
      localStorage['hide-counts'] = true;
    });

    $('#show-counts').on('click', function () {
      $('ul.key:not(.controls) > li:not(.none) i').each(function () {
        $(this).siblings(':last').show();
      });
      $(this).hide();
      $('#hide-counts').show();
      localStorage.removeItem('hide-counts');
    });

    // =========================================================================
    // 23. Reset invisible markers tracking
    // =========================================================================
    $('#reset-tracking').on('click', function (e) {
      e.preventDefault();
      if (confirm($.t('controls.resetInvisConfirm'))) {
        resetInvisibleMarkers();
      }
    });

    // =========================================================================
    // 24. Hide / Show monsters
    // =========================================================================
    $(document).on('click', 'li#hide-monsters', function () {
      localStorage['hide-monsters'] = true;
      $('#info').addClass('hideMonsters');
      $('#hide-monsters').hide();
      $('#show-monsters').show();
    });

    $(document).on('click', 'li#show-monsters', function () {
      localStorage.removeItem('hide-monsters');
      $('#info').removeClass('hideMonsters');
      $('#hide-monsters').show();
      $('#show-monsters').hide();
    });

    // =========================================================================
    // 25. Individual layer toggle (sidebar click)
    // =========================================================================
    $('ul.key:not(.controls)').on('click', 'li:not(.none)', function () {
      var className = $(this).find('i').attr('class');
      var stored = localStorage['markers-' + window.map_path]
        ? $.parseJSON(localStorage['markers-' + window.map_path])
        : {};
      if ($(this).hasClass('layer-disabled')) {
        map.addLayer(getMarkers()[className]);
        $(this).removeClass('layer-disabled');
        stored[className] = true;
      } else {
        map.removeLayer(getMarkers()[className]);
        $(this).addClass('layer-disabled');
        stored[className] = false;
      }
      localStorage['markers-' + window.map_path] = JSON.stringify(stored);
    });

    // =========================================================================
    // 26. Sidebar hide/show animation
    // =========================================================================
    var animateHideSidebar = function () {
      sidebarOrigLeft = $('#sidebar').css('left');
      sidebarBorderOrigLeft = $('#sidebar-border').css('left');
      hideSidebarOrigLeft = $('#hide-sidebar').css('left');
      infoWrapOrigCSS = $('#info-wrap').css(['left', 'width']);
      infoOrigCSS = $('#info').css(['width', 'margin-right']);

      $('#info-wrap').css({ left: '0px', width: '100%' });
      $('#info').css({ width: 'auto', 'margin-right': '80px' });
      $('#map').css('left', '0px');
      map.invalidateSize();

      var sidebarWidth = $('#sidebar').outerWidth();
      $('#sidebar').animate({ left: '-' + sidebarWidth + 'px' }, 200);
      $('#sidebar-border').animate({ left: '-' + (sidebarWidth + 15) + 'px' }, 200);
      $('#hide-sidebar').animate({ left: '0px' }, 200, function () {
        $('#hide-sidebar').addClass('show-sidebar');
      });
    };

    var animateShowSidebar = function (el) {
      $('#sidebar').animate({ left: sidebarOrigLeft }, 200);
      $(el).animate({ left: hideSidebarOrigLeft }, 200);
      $('#sidebar-border').animate({ left: sidebarBorderOrigLeft }, 200, function () {
        $('.show-sidebar').removeClass('show-sidebar');
      });
    };

    $(document).on('click', 'div#hide-sidebar:not(.show-sidebar)', function () {
      animateHideSidebar();
      localStorage['hide-sidebar'] = true;
    });

    $(document).on('click', 'div#hide-sidebar.show-sidebar', function () {
      animateShowSidebar(this);
      localStorage.removeItem('hide-sidebar');
    });

    if (localStorage['hide-sidebar']) {
      setTimeout(function () { animateHideSidebar(); }, 500);
    }

    $(window).on('resize', function () {
      if ($('.show-sidebar').length && $(this).width() > 768) {
        $('.show-sidebar').removeClass('show-sidebar');
      }
    });

    // =========================================================================
    // 27. Portrait warning dismiss
    // =========================================================================
    $(document).on('click', 'div#warn', function () {
      localStorage.hideWarn = true;
      $(this).remove();
    });

    // =========================================================================
    // 28. General popup system (credits, etc.)
    // =========================================================================
    var popupClickOutside = function (e) {
      if ($(e.target).is('#popup-content') ||
          $(e.target).closest('#popup-content').length ||
          $(e.target).closest('#popup-wrap').length) {
        return;
      }
      window.popupClose();
    };

    window.popupClose = function () {
      $('#popup-wrap').remove();
      $(document).off('click', '*', popupClickOutside);
    };

    var showPopup = function (title, content) {
      $('body').prepend(
        '<div id="popup-wrap">' +
          '<div id="popup-border">' +
            '<img id="popup-close" src="/files/images/exit.png" alt="Close" onclick="popupClose();">' +
            '<div id="popup-content">' +
              '<h1>' + title + '</h1><hr>' + content +
            '</div>' +
          '</div>' +
        '</div>'
      );
      $('div#popup-content').niceScroll({
        rtlmode: 'auto',
        cursorcolor: '#5E4F32',
        cursorborder: 'none',
        autohidemode: true,
      });
      $(document).on('click', '*', popupClickOutside);
    };

    // Credits popup
    $(document).on('click', '.credits', function (e) {
      e.preventDefault();
      showPopup(
        document.getElementById('Credits').innerHTML,
        '<script type="text/javascript" src="/files/scripts/lang-global.js"></script>\n' +
        '<script type="text/javascript" src="/files/scripts/shared.js"></script>\n' +
        '<span data-i18n="[html]credits.popupCreated" data-i18n-options=\'{"untamed0":"<a href=https://github.com/untamed0>untamed0</a>","BaHTsIzBEdEvi":"<a href=https://github.com/root-BB>BaHTsIzBEdEvi</a>"}\'> </span>\n' +
        '<ul>\n' +
        '<li><span data-i18n="[html]credits.popupbotHelp1" data-i18n-options=\'{"mcarver":"<a href=https://github.com/mcarver>mcarver</a>"}\'></span></li>\n' +
        '<li><span data-i18n="[html]credits.popupbotHelp2" data-i18n-options=\'{"ankri":"<a href=https://github.com/ankri>ankri</a>"}\'></span></li>\n' +
        '<li><span data-i18n="[html]credits.popupbotHelp3" data-i18n-options=\'{"ITroxxCH":"<a href=https://github.com/ITroxxCH>ITroxxCH</a>"}\'></span></li>\n' +
        '<li><span data-i18n="[html]credits.popupbotHelp4" data-i18n-options=\'{"msmorgan":"<a href=https://github.com/msmorgan>msmorgan</a>"}\'></span></li>\n' +
        '<li><span data-i18n="[html]credits.popupbotHelp5" data-i18n-options=\'{"DesignGears":"<a href=https://twitter.com/DesignGears>@DesignGears</a>","hhrhhr":"<a href=https://github.com/hhrhhr>hhrhhr</a>"}\'></span></li>\n' +
        '</ul>\n' +
        '<span data-i18n="credits.popupbotHelp6"></span>\n' +
        '<ul>\n' +
        '<li><span data-i18n="[html]credits.popupbotHelp7" data-i18n-options=\'{"lordfiSh":"<a href=https://wiiare.in>lordfiSh</a>"}\'></span></li></p>\n' +
        '</ul>\n' +
        '<h3><span data-i18n="credits.popuptranslations"></span></h3>\n' +
        '<ul>\n' +
        '<li><span data-i18n="[html]credits.popuptranslations1" data-i18n-options=\'{"Arkwulf":"<a href=https://www.nexusmods.com/users/62669641>Arkwulf</a>"}\'></span></li>\n' +
        '<li><span data-i18n="[html]credits.popuptranslations2" data-i18n-options=\'{"BaHTsIzBEdEvi":"<a href=https://github.com/root-BB>BaHTsIzBEdEvi</a>"}\'></span></li>\n' +
        '<li><span data-i18n="[html]credits.popuptranslations3" data-i18n-options=\'{"MikeCZ":"<a href=https://www.nexusmods.com/users/33112273>MikeCZ</a>","Lord Mazour":"<a href=https://www.nexusmods.com/users/3168799>Lord Mazour</a>"}\'></span></li>\n' +
        '<li><span data-i18n="[html]credits.popuptranslations4" data-i18n-options=\'{"YheonYeung":"<a href=https://crowdin.com/profile/YheonYeung>YheonYeung</a>"}\'></span></li>\n' +
        '<li><span data-i18n="[html]credits.popuptranslations5" data-i18n-options=\'{"toffi3":"<a href=https://crowdin.com/profile/toffi3>toffi3</a>","Umber91310486":"<a href=https://crowdin.com/profile/Umber91310486>Umber91310486</a>","Mochal":"<a href=https://crowdin.com/profile/regulargvy13>Mochal</a>"}\'></span></li>\n' +
        '</ul>\n' +
        '<p><span data-i18n="[html]credits.popupcrowdin" data-i18n-options=\'{"crowdin":"<a href=https://crowdin.com>crowdin</a>"}\'></span></p>\n' +
        '<h3><span data-i18n="credits.popupAssets"></span></h3>\n' +
        '<p><span data-i18n="[html]credits.popupRED" data-i18n-options=\'{"RED":"<a href=http://en.cdprojektred.com/>CD PROJEKT RED</a>","Agreement":"<a href=http://bar.cdprojektred.com/regulations/>User Agreement</a>"}\'> </span></p>\n' +
        '<h3><span data-i18n="credits.popupJava"></span></h3>\n' +
        '<ul>\n' +
        '<li><a href="http://jquery.com" target="_blank">jQuery</a> (MIT)</li>\n' +
        '<li><a href="http://git.io/vkLly" target="_blank">jQuery.NiceScroll</a> (MIT)</li>\n' +
        '<li><a href="https://github.com/prashantchaudhary/ddslick" target="_blank">jQuery.ddslick</a></li>\n' +
        '<li><a href="http://leafletjs.com" target="_blank">Leaflet</a> (BSD2)</li>\n' +
        '<li><a href="https://github.com/krisk/Fuse" target="_blank">Fuse</a> (Apache)</li>\n' +
        '<li><a href="http://git.io/vIAs2" target="_blank">Font Awesome</a> (MIT)</li>\n' +
        '</ul>'
      );
    });

    // =========================================================================
    // 29. Tooltips for truncated sidebar items
    // =========================================================================
    setTimeout(function () {
      $('ul.key:not(.controls) li:not(.none) i').each(function () {
        var label = $.t('sidebar.' + $(this).attr('class'));
        var tooltip = $("<span class='tooltip'>" + label + '</span>');
        var textEl = $(this).next();
        if (textEl.outerWidth() < textEl[0].scrollWidth) {
          $(this).parent().mousemove(function (e) {
            var y = e.clientY - $('#logo').offset().top;
            tooltip.css('top', y + 15 + 'px');
            tooltip.css('left', e.clientX + 15 + 'px');
            tooltip.css('display', 'block');
          }).mouseleave(function () {
            tooltip.css('display', 'none');
          });
        }
        $('#sidebar-wrap').append(tooltip);
      });

      $('ul.controls li:not(.none) i').each(function () {
        var text = $(this).next().text();
        var tooltip = $("<span class='tooltip'>" + text + '</span>');
        var textEl = $(this).next();
        if (textEl.outerWidth() < textEl[0].scrollWidth) {
          $(this).parent().mousemove(function (e) {
            var y = e.clientY - $('#logo').offset().top;
            tooltip.css('top', y + 15 + 'px');
            tooltip.css('left', e.clientX + 15 + 'px');
            tooltip.css('display', 'block');
          }).mouseleave(function () {
            tooltip.css('display', 'none');
          });
        }
        $('#sidebar-wrap').append(tooltip);
      });
    }, 100);

    // =========================================================================
    // 30. Backup / Restore (localStorage)
    // =========================================================================
    var backupData = function () {
      var now = new Date();
      var fileName =
        'witcher3map_backup_' +
        now.getFullYear() + '-' +
        ((now.getMonth() + 1 < 10 ? '0' : '') + (now.getMonth() + 1)) + '-' +
        ((now.getDate() < 10 ? '0' : '') + now.getDate()) +
        '.json';

      if (confirm($.t('controls.backupSave', { fileName: fileName }))) {
        var blob = new Blob([JSON.stringify(localStorage)], { type: 'text/plain;charset=utf-8' });
        saveAs(blob, fileName);
      }
    };

    var restoreData = function () {
      if (!window.File && !window.FileReader && !window.FileList && !window.Blob) {
        alert($.t('controls.backupHtmlFail'));
        return;
      }

      if ($('#restoreDiv').length) return;

      var restoreBtnRect = $('#restoreButton')[0].getBoundingClientRect();
      var restoreDivHtml =
        '<div id="restoreDiv" style="top:' + restoreBtnRect.top +
        'px;right:' + (14 + restoreBtnRect.right - restoreBtnRect.left) +
        'px;">' +
        '<div style="float:right;">' +
        '<button class="fa fa-times-circle" onclick="$(\'#restoreDiv\').remove()" style="cursor:pointer" />' +
        '</div>' +
        '<strong>' + $.t('controls.backupLoad') + '</strong><br/>' +
        '<input type="file" id="files" name="file[]" />' +
        '</div>';

      $('body').append($(restoreDivHtml));

      document.getElementById('files').addEventListener('change', function (evt) {
        var file = evt.target.files[0];
        var reader = new FileReader();

        reader.onload = function (loadEvt) {
          try {
            var restored = $.parseJSON(loadEvt.target.result);
            for (var key in restored) {
              console.log('restoring property:' + key + ' using value:' + restored[key]);
              localStorage[key] = restored[key];
            }
            console.log('restore complete!');
            alert($.t('controls.backupLoadSuccess'));
            location.reload();
          } catch (err) {
            alert($.t('controls.backupLoadFail'));
            console.log(err.message);
          } finally {
            $('#restoreDiv').remove();
          }
        };

        reader.readAsText(file);
      });
    };

    // EasyButton: Backup
    var backupBtn = L.easyButton('fa-download', function () {
      backupData();
    }, $.t('controls.backupDataButton'));

    // EasyButton: Restore
    var restoreBtn = L.easyButton('fa-upload', function () {
      restoreData();
    }, $.t('controls.restoreDataButton'), 'restoreButton');

    L.easyBar([backupBtn, restoreBtn]).addTo(map);

    // =========================================================================
    // 31. Note system
    // =========================================================================
    window.noteMarkers = {};
    var noteMode = false;
    var previousCursor = null;
    var notePopupActive = false;

    // Note add/cancel button
    L.easyButton('fa-pencil', function () {
      if (noteMode) {
        stopNoteMode();
      } else {
        startNoteMode();
      }
    }, $.t('controls.addNoteButton'), 'noteButton').addTo(map);

    // Center marker button (crosshairs)
    L.easyButton('fa-crosshairs', function (btn, theMap) {
      var params = hash.getHashParams();
      if (params && params.m) {
        var coords = params.m.split(',');
        theMap.setView([parseFloat(coords[0]), parseFloat(coords[1])]);
      } else {
        theMap.setView(window.map_center);
      }
    }, $.t('controls.centerMarkerButton'), 'centerButton').addTo(map);

    // --- Note key / index helpers (on window for HTML onclick handlers) ---
    window.getNoteKey = function (lat, lng) {
      return Number(lat).toFixed(3) + '_' + Number(lng).toFixed(3);
    };

    window.getNoteIndex = function (key) {
      var notesArray = getNotes()[mapPath];
      if (!notesArray) return -1;
      for (var i = 0; i < notesArray.length; i++) {
        if (notesArray[i].key == key) return i;
      }
      return -1;
    };

    // --- Start note placement mode ---
    var startNoteMode = function () {
      console.log('starting note');
      $('#noteButton').attr('title', $.t('controls.cancelNoteButton')).addClass('activeEasyButton');
      $(document).on('keyup.addnote', function (e) {
        if (e.keyCode === 27) stopNoteMode();
      });
      noteMode = true;
      previousCursor = $('.leaflet-container').css('cursor');
      $('.leaflet-container').css('cursor', 'crosshair');
      map.addEventListener('click', handleMapClickForNote);
    };

    // --- Persist notes to localStorage ---
    var saveNotesToStorage = function () {
      localStorage['notes' + window.map_path] = JSON.stringify(getNotes()[mapPath]);
    };

    // --- Save note (window for onclick handler in note popup) ---
    window.saveNote = function (key) {
      var notesArray = getNotes()[mapPath];
      if (!notesArray) return;
      var idx = window.getNoteIndex(key);
      if (idx === -1) return;
      var note = notesArray[idx];
      note.label = $('#note-label').val();
      note.title = $('#note-title').val();
      note.text = $('#note-text').val();
      var marker = window.noteMarkers[note.key];
      if (marker) {
        marker.bindLabel(note.label, { direction: 'auto' });
        marker.bindPopup(buildNotePopupHtml(note));
        window.noteMarkers[note.key] = marker;
      }
      saveNotesToStorage();
      $('#note-save').attr('disabled', true);
    };

    // --- Delete note (window for onclick handler in note popup) ---
    window.deleteNote = function (key) {
      var notesArray = getNotes()[mapPath];
      if (!notesArray) return;
      if (window.noteMarkers[key]) {
        map.removeLayer(window.noteMarkers[key]);
      }
      var idx = window.getNoteIndex(key);
      if (idx !== -1) notesArray.splice(idx, 1);
      delete window.noteMarkers[key];
      saveNotesToStorage();
      closeInfoPanel();
    };

    // --- Build the note popup HTML ---
    var buildNotePopupHtml = function (note) {
      var html = '<div id="note-popup">' +
        '<div class="note-row">' +
        '<label for="note-label" class="label" data-i18n="notes.label"></label>' +
        '<input type="text" id="note-label" data-i18n="[placeholder]notes.enterLabel" value="' +
        escapeHtml(note.label) + '" />' +
        '</div>';
      html += '<div class="note-row">' +
        '<label for="note-title" class="label" data-i18n="notes.title"></label>' +
        '<input type="text" id="note-title" data-i18n="[placeholder]notes.enterTitle" value="' +
        escapeHtml(note.title) + '" />' +
        '</div>';
      html += '<div class="note-row">' +
        '<label for="note-text" class="label top" data-i18n="notes.note"></label>' +
        '<textarea id="note-text" data-i18n="[placeholder]notes.enterText">' +
        escapeHtml(note.text) + '</textarea>' +
        '</div>';
      html += '<div>' +
        '<button id="note-save" onclick="saveNote(\'' + note.key + '\')" disabled>' +
        '<i class="fa fa-floppy-o"></i>&nbsp;<span data-i18n="notes.saveNote"></span></button>';
      html += '<button onclick="deleteNote(\'' + note.key + '\')">' +
        '<i class="fa fa-trash-o"></i>&nbsp;<span data-i18n="notes.deleteNote"></span></button>' +
        '</div></div>';
      return html;
    };

    // --- Simple HTML escape to prevent XSS in note values ---
    var escapeHtml = function (str) {
      if (typeof str !== 'string') return '';
      return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
    };

    // --- Add a note marker to the map ---
    var addNoteMarker = function (note) {
      var markerOpts = { icon: icons.note_marker, riseOnHover: true };
      var marker;
      if (note.label && note.label !== '') {
        marker = L.marker(L.latLng(note.lat, note.lng), markerOpts)
          .bindLabel(note.label, { direction: 'auto' })
          .bindPopup(buildNotePopupHtml(note))
          .openPopup();
      } else {
        marker = L.marker(L.latLng(note.lat, note.lng), markerOpts)
          .bindPopup(buildNotePopupHtml(note))
          .openPopup();
      }
      marker.addTo(map);
      window.noteMarkers[note.key] = marker;
    };

    // --- Handle map click in note mode ---
    var handleMapClickForNote = function (e) {
      var note = {
        key: window.getNoteKey(e.latlng.lat, e.latlng.lng),
        lat: e.latlng.lat,
        lng: e.latlng.lng,
        label: '',
        title: '',
        text: '',
      };
      addNoteMarker(note);
      getNotes()[mapPath].push(note);
      saveNotesToStorage();
      stopNoteMode();
      return false;
    };

    // --- Stop note placement mode ---
    var stopNoteMode = function () {
      $('#noteButton').attr('title', $.t('controls.addNoteButton')).removeClass('activeEasyButton');
      $(document).off('keyup.addnote');
      noteMode = false;
      $('.leaflet-container').css('cursor', previousCursor);
      map.removeEventListener('click');
      console.log('stopping note');
    };

    // --- Activate note change handlers when note popup opens ---
    var initNoteChangeHandlers = function () {
      notePopupActive = true;
      $('#info').i18n();
      $('#note-label, #note-title, #note-text').on('keyup.notechange', function () {
        $('#note-save').attr('disabled', false);
      });
      console.log('note popup started!');
    };

    // --- Remove note change handlers when note popup closes ---
    var removeNoteChangeHandlers = function () {
      $('#note-label, #note-title, #note-text').off('keyup.notechange');
      notePopupActive = false;
      console.log('note popup ended!');
    };

    // --- Load existing notes onto the map ---
    var existingNotes = getNotes()[mapPath];
    if (existingNotes) {
      for (var i = 0; i < existingNotes.length; i++) {
        addNoteMarker(existingNotes[i]);
      }
    }

    // =========================================================================
    // 32. Process hash params for deep-linking (waypoints, marker focus)
    // =========================================================================
    var hashParams = hash.getHashParams();
    if (hashParams) {
      // Restore waypoint from URL
      if (hashParams.w) {
        var wCoords = hashParams.w.split(',');
        waypointMarker = L.marker(L.latLng(parseFloat(wCoords[0]), parseFloat(wCoords[1])), {
          icon: L.icon({ iconUrl: '/files/images/icons/waypoint.png', iconSize: [26, 32] }),
        })
          .on('click', function () {
            map.removeLayer(waypointMarker);
            waypointMarker = null;
            hash.removeParam('w');
          })
          .on('contextmenu', function () {
            map.removeLayer(waypointMarker);
            waypointMarker = null;
            hash.removeParam('w');
          })
          .addTo(map);
      }

      // Restore marker highlight from URL
      if (hashParams.m) {
        var mCoords = hashParams.m.split(',');
        var found = false;
        $.each(window.allLayers, function (idx, layer) {
          if (!layer.getLayers) return;
          $.each(layer.getLayers(), function (idx2, marker) {
            if (parseFloat(mCoords[0]) === marker._latlng.lat &&
                parseFloat(mCoords[1]) === marker._latlng.lng) {
              marker.openPopup();
              found = true;
            }
          });
        });
        if (!found) $('#centerButton').hide();
      } else {
        // No marker param, hide center button
        $('#centerButton').hide();
      }
    } else {
      $('#centerButton').hide();
    }
  })(); // end async IIFE
}); // end DOM ready
