// Shared section-card assets (logo icons + representative photo + markup + CSS)
// used by both regen.js (home grid) and gen_specialties.js (specialty page),
// so the two stay in sync. No external assets — everything is self-contained.
const fs = require('fs');
const path = require('path');
const SITE = path.resolve(__dirname, '..');
const esc = s => (s || '').replace(/&/g, '&amp;');

// A representative product photo per section (falls back to the section's first
// item whose image exists on disk).
const REP = {
  SL: 'SL-6010', SS: 'SS-741-1', FR: 'FR-200-1', AF: 'AF-0301', CS: 'SF-1-100',
  RT: 'RT-02-652', SU: 'SU-06-100', DR: 'DR-07-100', PB: 'PR-03-135', DG: 'DI-04-100',
  TS: 'TR-05-152', BS: 'OR-07-200', CV: 'CV-09-100', NS: 'NS-10-112', OG: 'OP-11-300',
  TR: 'TM-12-100', DM: 'DM-13-100', GA: 'SI-14-100', LG: 'UR-15-196', GY: 'GY-16-124',
  OB: 'OB-17-100', OT: 'OT-18-100', RH: 'RH-19-100', OM: 'OM-20-105', TN: 'TL-21-131',
  PD: 'PD-22-100', DN: '786-101', OR: '11-01-0381',
};
function repImage(SECTIONS, code) {
  const cand = REP[code];
  if (cand && fs.existsSync(SITE + '/assets/img/products/' + cand + '.jpg'))
    return 'assets/img/products/' + cand + '.jpg';
  const sec = SECTIONS[code];
  if (sec) for (const it of sec.items) {
    if (fs.existsSync(SITE + '/assets/img/products/' + it[0] + '.jpg'))
      return 'assets/img/products/' + it[0] + '.jpg';
  }
  return '';
}

// Original line-art section logos.
const ICONS = {
  scalpel: '<path d="M3 21 13 11"/><path d="M13 11 21 3 21 8 15 12Z" fill="#1B8FD6" stroke="none"/>',
  scissors: '<circle cx="6" cy="7" r="2.3"/><circle cx="6" cy="17" r="2.3"/><path d="M7.7 8.4 20 17"/><path d="M7.7 15.6 20 7"/>',
  tweezers: '<path d="M10.5 3C9 9 8 15 7.5 21"/><path d="M13.5 3C15 9 16 15 16.5 21"/>',
  clamp: '<circle cx="7" cy="18.5" r="2.1"/><circle cx="13" cy="18.5" r="2.1"/><path d="M8.4 17.1 15 5"/><path d="M11.6 17.1 5 5"/><path d="M8.2 8H11.8"/>',
  retractor: '<path d="M4 5H20"/><path d="M6.5 5V13"/><path d="M11 5V15"/><path d="M15.5 5V13"/><path d="M6.5 13q-1 2 0 3"/><path d="M15.5 13q1 2 0 3"/>',
  needle: '<path d="M4 20C10 20 18 14 20 5"/><path d="M4 20c-1.6 0-2-1.6-.4-2.3"/><circle cx="19.6" cy="5" r=".9"/>',
  probe: '<path d="M4 20 17.5 6.5"/><circle cx="19" cy="5" r="1.7"/>',
  stethoscope: '<path d="M6 3v5a5 5 0 0 0 10 0V3"/><circle cx="6" cy="2.7" r="1"/><circle cx="16" cy="2.7" r="1"/><path d="M11 13v2a4 4 0 0 0 8 0v-1"/><circle cx="19" cy="12.5" r="2"/>',
  bone: '<path d="M8.5 15.5 15.5 8.5"/><circle cx="6.6" cy="17.4" r="1.9"/><circle cx="9" cy="15" r="1.9"/><circle cx="17.4" cy="6.6" r="1.9"/><circle cx="15" cy="9" r="1.9"/>',
  foot: '<path d="M8 3c-2 0-3.5 2-3.5 5.5 0 4 1.5 6 1.5 9 0 2 5.5 2 5.5-.3 0-2 4-.7 5-2.7 1-2-1-4-3.2-5C10.5 8 11 3 8 3Z"/>',
  heart: '<path d="M12 20C3 13.5 5 6.5 9 6.5c1.8 0 3 1.8 3 1.8s1.2-1.8 3-1.8c4 0 6 7-3 13.5Z"/>',
  brain: '<path d="M15 5a3 3 0 0 0-6 0 3 3 0 0 0-2.4 4.6A3 3 0 0 0 8 15.2a3 3 0 0 0 4 1.8 3 3 0 0 0 4-1.8 3 3 0 0 0 1.4-5.6A3 3 0 0 0 15 5Z"/><path d="M12 5.5V17"/><path d="M9 9.2c1.4 0 1.4 1.8 0 1.8"/><path d="M15 9.2c-1.4 0-1.4 1.8 0 1.8"/>',
  eye: '<path d="M2 12C6 6 18 6 22 12 18 18 6 18 2 12Z"/><circle cx="12" cy="12" r="3"/>',
  tooth: '<path d="M7 3C4 3 4 8 5 12 6 16 6 21 8 21 9.6 21 9 16 12 16 15 16 14.4 21 16 21 18 21 18 16 19 12 20 8 20 3 17 3 14.5 3 14 5 12 5 10 5 9.5 3 7 3Z"/>',
  ear: '<path d="M8.5 20.5C7.5 17 6 15.5 6 11a6 6 0 0 1 12 0c0 3-3 3-3 5a3 3 0 0 1-5.4 1.8"/>',
  nose: '<path d="M12 4v7c0 3-3 3-4 5-.8 1.6 1 2.6 3 1.8M12 11c0 3 3 3 4 5 .8 1.6-1 2.6-3 1.8"/>',
  throat: '<path d="M5 6h14"/><path d="M12 6v3a2 2 0 0 1-4 0"/><path d="M12 9c0 4-1.5 7-3.5 9M12 9c0 4 1.5 7 3.5 9"/>',
  baby: '<circle cx="12" cy="7" r="3.2"/><path d="M12 10.4c-3.8 0-6 3.4-5.2 7.6h10.4C18 13.8 15.8 10.4 12 10.4Z"/>',
  speculum: '<path d="M8 4v9l-3 7M16 4v9l3 7M8 9h8"/>',
  airway: '<path d="M12 3v7"/><path d="M12 10c-3 0-5 2-5 6 0 3 2 4 3 2 1-2 1-6 2-8"/><path d="M12 10c3 0 5 2 5 6 0 3-2 4-3 2-1-2-1-6-2-8"/>',
  droplet: '<path d="M12 3s-7 8.5-7 12.5a7 7 0 0 0 14 0C19 11.5 12 3 12 3Z"/>',
  stomach: '<path d="M9 4v6.5c0 4 3.5 6.8 7 5.3 3-1.3 2.7-5.6 0-6.6-2-.7-3.4 1-3.4 2.6"/>',
  liver: '<path d="M3.5 9c4.5-3 13-3 17 0 1 4.2-2.2 8-8.5 8-4.2 0-7.3-3-8.5-5Z"/><path d="M9 14v2.5"/>',
  bandage: '<rect x="3.5" y="3.5" width="17" height="17" rx="8.5"/><rect x="8.5" y="8.5" width="7" height="7" rx="1.4"/>',
  syringe: '<path d="M14 4l6 6M17.5 6.5 8 16l-4 1 1-4 9.5-9.5M6.5 15.5 8.5 17.5"/>',
};
const ICON_FOR = {
  SL: 'scalpel', SS: 'scissors', FR: 'tweezers', AF: 'clamp', CS: 'tweezers',
  RT: 'retractor', SU: 'needle', DR: 'bandage', PB: 'probe', DG: 'stethoscope',
  TS: 'syringe', BS: 'bone', CV: 'heart', NS: 'brain', OG: 'eye', TR: 'airway',
  DM: 'droplet', GA: 'stomach', LG: 'liver', GY: 'speculum', OB: 'baby',
  OT: 'ear', RH: 'nose', OM: 'tooth', TN: 'throat', PD: 'foot', DN: 'tooth',
  OR: 'bone',
};
function iconSvg(code) {
  const inner = ICONS[ICON_FOR[code]] || ICONS.probe;
  return `<svg viewBox="0 0 24 24" fill="none" stroke="#1B8FD6" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${inner}</svg>`;
}

// Full <a class="seccard"> markup with logo badge + photo thumb.
function sectionCard(code, m, SECTIONS, indent = '    ') {
  const sec = SECTIONS[code];
  if (!m || !sec) return '';
  const n = sec.items.length;
  const img = repImage(SECTIONS, code);
  const logo = `<span class="slogo" title="${esc(m.title)}">${iconSvg(code)}</span>`;
  const thumb = img
    ? `<div class="scthumb">${logo}<img src="${img}" alt="${esc(m.title)} instruments" loading="lazy" onerror="this.remove()"></div>`
    : `<div class="scthumb scthumb--noimg">${logo}</div>`;
  return `${indent}<a class="seccard" href="catalog-${code.toLowerCase()}.html">${thumb}<span class="sc-code">${code}</span><h3>${esc(m.title)}</h3><p>${n} items — ${esc(m.desc)}</p></a>`;
}

module.exports = { REP, repImage, ICONS, ICON_FOR, iconSvg, sectionCard };
