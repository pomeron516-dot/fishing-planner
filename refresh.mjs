// Refreshes data/live.json (tides + marine forecast) and data/inbox.json (links to new weekly reports).
// Runs on GitHub Actions (Node 20+). Every lookup fails on its own, so one bad source never blanks the rest.
import { readFile, writeFile, mkdir } from 'node:fs/promises';

const OUT = new URL('./', import.meta.url);
const errors = [];

const STATIONS = {
  '8531680': 'Sandy Hook, NJ',
  '8510560': 'Montauk, NY',
  '8461490': 'New London, CT'
};
// Offshore points so the marine model returns wave heights.
const AREAS = {
  nj:      { lat: 40.15, lng: -73.85 },
  lisouth: { lat: 40.52, lng: -73.55 },
  ct:      { lat: 41.15, lng: -72.35 },
  montauk: { lat: 41.00, lng: -71.85 }
};
const REPORT_PAGES = {
  'Northern NJ': ['https://onthewater.com/regions/northern-new-jersey', 'northern-new-jersey'],
  'Southern NJ': ['https://onthewater.com/regions/southern-new-jersey', 'southern-new-jersey'],
  'Long Island and NYC': ['https://onthewater.com/regions/new-york', 'long-island'],
  'Connecticut': ['https://onthewater.com/regions/connecticut', 'connecticut']
};

const pad = n => String(n).padStart(2, '0');
const ymd = d => `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`;

async function get(url, as = 'json', tries = 3) {
  let last;
  for (let i = 0; i < tries; i++) {
    try {
      const ctl = new AbortController();
      const t = setTimeout(() => ctl.abort(), 25000);
      const r = await fetch(url, { signal: ctl.signal, headers: { 'User-Agent': 'personal-fishing-planner (github pages)' } });
      clearTimeout(t);
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return as === 'json' ? await r.json() : await r.text();
    } catch (e) {
      last = e;
      await new Promise(res => setTimeout(res, 1500 * (i + 1)));
    }
  }
  throw last;
}

async function readOld() {
  try { return JSON.parse(await readFile(new URL('live.json', OUT), 'utf8')); } catch { return null; }
}

async function tides() {
  const out = {};
  const start = new Date();
  const end = new Date(Date.now() + 13 * 86400000);
  for (const [id, name] of Object.entries(STATIONS)) {
    const url = 'https://api.tidesandcurrents.noaa.gov/api/prod/datagetter?product=predictions&application=personal_fishing_planner'
      + `&begin_date=${ymd(start)}&end_date=${ymd(end)}&datum=MLLW&station=${id}&time_zone=lst_ldt&units=english&interval=hilo&format=json`;
    try {
      const j = await get(url);
      if (!j.predictions || j.predictions.length < 8) throw new Error('too few predictions');
      out[id] = j.predictions.map(p => [p.t, +p.v]);
    } catch (e) {
      errors.push(`tides ${name}: ${e.message}`);
    }
  }
  return out;
}

// Daytime (5am to 7pm local) peak wind and wave height for each day.
async function weather() {
  const out = {};
  for (const [area, p] of Object.entries(AREAS)) {
    const days = {};
    try {
      const w = await get(`https://api.open-meteo.com/v1/forecast?latitude=${p.lat}&longitude=${p.lng}&hourly=wind_speed_10m,wind_gusts_10m&wind_speed_unit=mph&timezone=America%2FNew_York&forecast_days=14`);
      w.hourly.time.forEach((t, i) => {
        const [d, h] = t.split('T'), hr = +h.slice(0, 2);
        if (hr < 5 || hr > 19) return;
        const x = days[d] || (days[d] = { wind: 0, gust: 0, seas: null });
        x.wind = Math.max(x.wind, w.hourly.wind_speed_10m[i] ?? 0);
        x.gust = Math.max(x.gust, w.hourly.wind_gusts_10m[i] ?? 0);
      });
    } catch (e) { errors.push(`wind ${area}: ${e.message}`); }
    try {
      const m = await get(`https://marine-api.open-meteo.com/v1/marine?latitude=${p.lat}&longitude=${p.lng}&hourly=wave_height&length_unit=imperial&timezone=America%2FNew_York&forecast_days=14`);
      m.hourly.time.forEach((t, i) => {
        const [d, h] = t.split('T'), hr = +h.slice(0, 2), v = m.hourly.wave_height[i];
        if (hr < 5 || hr > 19 || v == null) return;
        const x = days[d] || (days[d] = { wind: 0, gust: 0, seas: null });
        x.seas = Math.max(x.seas ?? 0, v);
      });
    } catch (e) { errors.push(`waves ${area}: ${e.message}`); }
    for (const d of Object.values(days)) {
      d.wind = Math.round(d.wind);
      d.gust = Math.round(d.gust);
      if (d.seas != null) d.seas = Math.round(d.seas * 10) / 10;
    }
    if (Object.keys(days).length) out[area] = days;
  }
  return out;
}

// Links only. Titles come from the address, and nothing is rated automatically.
async function inbox() {
  const MONTHS = ['january','february','march','april','may','june','july','august','september','october','november','december'];
  const items = [];
  for (const [region, [page, key]] of Object.entries(REPORT_PAGES)) {
    try {
      const html = await get(page, 'text');
      const urls = [...new Set([...html.matchAll(/https:\/\/onthewater\.com\/fishing-reports\/\d{4}\/\d{2}\/[a-z0-9-]+/g)].map(m => m[0]))].filter(u => u.includes(key));
      const found = urls.map(url => {
        const slug = url.split('/').pop();
        const m = slug.match(new RegExp(`(${MONTHS.join('|')})-(\\d{1,2})-(\\d{4})$`));
        const date = m ? `${m[3]}-${pad(MONTHS.indexOf(m[1]) + 1)}-${pad(+m[2])}` : '';
        return { region, url, date, title: slug.split('-').map(w => w[0].toUpperCase() + w.slice(1)).join(' ') };
      }).filter(x => x.date).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 3);
      items.push(...found);
    } catch (e) { errors.push(`reports ${region}: ${e.message}`); }
  }
  return items;
}

await mkdir(OUT, { recursive: true });
const old = await readOld();
const [t, w, ib] = await Promise.all([tides(), weather(), inbox()]);

const live = {
  generatedAt: new Date().toISOString(),
  tides: Object.keys(t).length ? t : (old?.tides || {}),
  wx: Object.keys(w).length ? w : (old?.wx || {}),
  errors
};
await writeFile(new URL('live.json', OUT), JSON.stringify(live));
if (ib.length) await writeFile(new URL('inbox.json', OUT), JSON.stringify(ib, null, 1));
console.log(`tides: ${Object.keys(live.tides).length} stations, forecast: ${Object.keys(live.wx).length} areas, report links: ${ib.length}`);
if (errors.length) console.log('problems:\n - ' + errors.join('\n - '));
