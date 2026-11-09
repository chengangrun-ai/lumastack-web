/* 生成离线数据包：把两端开源最新版 + 已装版的静态数据打成一个可直接引入的 JS。 */
const fs = require('fs');
const path = require('path');
const root = __dirname;
const dataDir = path.join(root, 'public', 'data');
const read = name => JSON.parse(fs.readFileSync(path.join(dataDir, name), 'utf8'));

const catalog = read('native-catalog.json');
const groups = catalog.groups.map(g => ({
  id: g.id,
  purpose: g.purpose,
  start: g.start,
  end: g.end,
  fieldCount: (g.fields || []).length,
  mediaCount: (g.media || []).length,
}));
const showcaseRaw = read('showcase-metadata.json');
const showcase = showcaseRaw.map(s => ({
  id: s.id,
  kind: s.kind,
  name: s.name,
  englishName: s.englishName,
  category: s.category,
  description: s.description,
  duration: s.duration,
  poster: s.poster,
  defaults: s.defaults,
  controls: s.controls,
}));

const data = {
  version: '1.0.0',
  product: '叠光 LumaStack',
  source: {
    overlayStudio: 'e35e1aff9dae3b3addc21f68f3bcd51f95bdc1a8 2026-10-17',
    motion385712: '9dfbe7d7c6a6d4aa03f6f8e2f2285e631099faae 2026-10-19',
    motionTemplate: '0.2.7-open-beta MIT',
    officialSite: 'motiongit.com 更新于 2026-10-30 共 25 个版本',
    reaEvidence: 'ev_60d2a81da7ccf6c75966427dd7bd529210939a8a6f20944488e2053d94080493',
  },
  cardCount: 26,
  showcaseCount: showcase.length,
  nativeGroupCount: groups.length,
  nativeGroups: groups,
  nativeMeta: {
    nativeSourceUnits: catalog.nativeSourceUnits,
    newBasicGroups: catalog.newBasicGroups,
    coverageComplete: catalog.coverageComplete,
    mediaPorts: catalog.mediaPorts,
  },
  showcase,
  demoOverlay: read('demo-overlay.json'),
  defaultProject: read('default-project.json'),
  resourceNames: read('resource-names.json'),
};

const out = '/* LumaStack offline data bundle. Sources in window.LumaData.source. */\nwindow.LumaData = ' + JSON.stringify(data) + ';\n';
fs.writeFileSync(path.join(root, 'assets', 'bundle.js'), out, 'utf8');
console.log('bundle.js bytes', Buffer.byteLength(out));
console.log('nativeGroups', groups.length, 'showcase', showcase.length, 'nameEntries', Object.keys(data.resourceNames.entries || {}).length);
