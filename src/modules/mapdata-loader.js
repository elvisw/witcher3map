const $ = window.$;

/**
 * 动态加载指定区域的地图数据
 * @param {string} region - 区域名 (e.g. 'white_orchard', 'hos_velen')
 * @returns {Promise<object>} mapdata 模块
 */
export async function loadMapData(region) {
  const module = await import(`/files/scripts/mapdata-${region}.js`);
  return module;
}
