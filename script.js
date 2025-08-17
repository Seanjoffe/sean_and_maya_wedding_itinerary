// ================= CONFIG =================
const COUPLE = {
  first: 'Sean',
  second: 'Maya',
  weddingDateISO: '2025-08-31',
  venueMap: 'https://maps.app.goo.gl/njqM2sQ83jtwhUE38'
};
const CSV_LOCAL_PATH = '/wedding_week_itinerary.csv'; // root-relative so it loads at /calendar too
const CSV_EXPLORE_PATH = '/wedding_week_explore.csv'; // NEW: Explore data
const EXPECTED_HEADERS = [
  'Day','Date','Start Time','End Time','Activity Name','Description','Location','Map Link','Category','Image URL'
];

// ================= UTILITIES =================
function fmtDate(iso){ try { return new Date(iso).toLocaleDateString(); } catch { return iso; } }
function daysUntil(dateISO){ const now=new Date(); const t=new Date(dateISO+'T00:00:00'); return Math.ceil((t-now)/(1000*60*60*24)); }
function isoToGcal(iso){ return new Date(iso).toISOString().replace(/[-:]/g,'').split('.')[0]+'Z'; }
function googleCal({title, details, location, startISO, endISO}){
  const p = new URLSearchParams({ action:'TEMPLATE', text:title, details:details||'', location:location||'', dates: isoToGcal(startISO) + '/' + isoToGcal(endISO) });
  return 'https://www.google.com/calendar/render?' + p.toString();
}
function icsFile({title, details, location, startISO, endISO}){
  const esc = s => (s||'').replace(/[\n,]/g,' ');
  const dt = s => isoToGcal(s);
  const body = [
    'BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Wedding Week//Sean and Maya//EN','BEGIN:VEVENT',
    'DTSTART:'+dt(startISO),'DTEND:'+dt(endISO),'SUMMARY:'+esc(title),'DESCRIPTION:'+esc(details),'LOCATION:'+esc(location),
    'END:VEVENT','END:VCALENDAR'
  ].join('\n');
  return new Blob([body],{type:'text/calendar;charset=utf-8'});
}

// ================= CSV PARSING (LOCAL) =================
function parseCSV(text){
  if (text.charCodeAt(0) === 0xFEFF) text = text.slice(1);             // strip BOM
  const lines = text.split(/\r?\n/);
  while(lines.length && !lines[lines.length-1].trim()) lines.pop();     // trim trailing blanks
  if (!lines.length) return [];

  const headerCells = splitCSVLine(lines[0]).map(h => h.trim());
  const headerSet = new Set(headerCells);
  if (!headerSet.has('Day') || !headerSet.has('Date')) {
    console.warn('Header row missing expected fields. Found:', headerCells);
  }

  const rows = lines.slice(1).map(line => {
    const cells = splitCSVLine(line).map(s => s.replace(/^"|"$/g,'').trim());
    const obj = {}; headerCells.forEach((h,i)=> obj[h] = (cells[i] ?? ''));
    return obj;
  });
  return normalizeRows(rows);
}
function splitCSVLine(line){
  const out = []; let cur = ''; let q=false;
  for(let i=0;i<line.length;i++){
    const c=line[i];
    if(c==='"'){ if(q && line[i+1]==='"'){ cur+='"'; i++; } else { q=!q; } }
    else if(c===',' && !q){ out.push(cur); cur=''; }
    else { cur+=c; }
  }
  out.push(cur); return out;
}

// ================= NORMALIZE / MAP (ITINERARY) =================
function normalizeRows(rows){
  const grouped = {};
  for(const r of rows){
    const obj = {
      'Day':           r['Day'] || '',
      'Date':          r['Date'] || '',
      'Start Time':    r['Start Time'] || '',
      'End Time':      r['End Time'] || '',
      'Activity Name': r['Activity Name'] || '',
      'Description':   r['Description'] || '',
      'Location':      r['Location'] || '',
      'Map Link':      r['Map Link'] || '',
      'Category':      r['Category'] || '',
      'Image URL':     r['Image URL'] || ''
    };
    const key = `${obj['Day']}__${obj['Date']}`;
    if(!grouped[key]) grouped[key] = { day: obj['Day'], date: obj['Date'], items: [] };
    grouped[key].items.push({
      startTime: (obj['Start Time']||'').padStart(5,'0'),
      endTime:   (obj['End Time']||'').trim(),
      title:     obj['Activity Name']||'',
      description: obj['Description']||'',
      location:  obj['Location']||'',
      map:       obj['Map Link']||'',
      category:  obj['Category']||'',
      imageUrl:  obj['Image URL']||''
    });
  }
  const days = Object.values(grouped).sort((a,b)=> new Date(a.date) - new Date(b.date));
  for(const d of days){ d.items.sort((a,b)=> (a.startTime||'').localeCompare(b.startTime||'')); }
  return days;
}
function badgeClass(cat){
  const c = (cat||'').toLowerCase();
  if(c.includes('wedding')) return 'badge wedding';
  if(c.includes('meal')||c.includes('dinner')||c.includes('lunch')||c.includes('breakfast')) return 'badge meal';
  if(c.includes('tour')||c.includes('activity')||c.includes('sight')) return 'badge tour';
  if(c.includes('free')) return 'badge free';
  return 'badge free';
}
function icon(cat){
  const c = (cat||'').toLowerCase();
  if(c.includes('wedding')) return '💍';
  if(c.includes('meal')||c.includes('dinner')||c.includes('lunch')||c.includes('breakfast')) return '🍽️';
  if(c.includes('tour')||c.includes('activity')||c.includes('sight')) return '🏛️';
  if(c.includes('free')) return '🏖️';
  return '🗓️';
}
function categoryVariant(cat){
  const c = (cat||'').toLowerCase();
  if(c.includes('wedding')) return 'wedding';
  if(c.includes('meal')||c.includes('dinner')||c.includes('lunch')||c.includes('breakfast')) return 'meal';
  if(c.includes('tour')||c.includes('activity')||c.includes('sight')) return 'tour';
  if(c.includes('free')) return 'free';
  return 'other';
}

// ================= RENDER: one activity card =================
function activityCard(item, dateISO){
  const card = document.createElement('div');
  card.className = 'card';

  // Add a category class so CSS can theme per type later if desired
  const variant = categoryVariant(item.category);
  card.classList.add('card--' + variant);
  card.dataset.category = variant;

  const row = document.createElement('div');
  row.className = 'row';

  const time = document.createElement('div');
  time.className = 'time';
  const start = (item.startTime||'').padStart(5,'0');
  const end = (item.endTime||'').padStart(5,'0');
  const range = end && end !== start ? `${start} – ${end}` : (start || '');
  time.textContent = range;

  const body = document.createElement('div');
  body.style.flex = '1';

  const head = document.createElement('div');
  head.style.display = 'flex'; head.style.alignItems = 'center';
  head.style.justifyContent = 'space-between'; head.style.gap = '8px';

  const title = document.createElement('div');
  title.className = 'title';
  title.textContent = item.title || '';

  const badge = document.createElement('span');
  badge.className = badgeClass(item.category);
  badge.innerHTML = `<span>${icon(item.category)}</span><span>${item.category||''}</span>`;

  head.appendChild(title); head.appendChild(badge);

  const desc = document.createElement('div');
  desc.className = 'muted';
  desc.style.marginTop = '4px';
  desc.textContent = item.description || '';

  const btns = document.createElement('div');
  btns.className = 'btns';

  if(item.location){
    const a = document.createElement('a');
    a.className = 'btn map'; a.target = '_blank'; a.rel = 'noreferrer';
    a.href = item.map || ('https://maps.google.com/?q=' + encodeURIComponent(item.location));
    a.textContent = '📍 Open Map';
    a.setAttribute('aria-label', `Open map for ${item.title || 'event'} at ${item.location}`);
    a.title = item.location;
    btns.appendChild(a);
  }

  const startISO = `${dateISO}T${(start || '09:00')}:00`;
  const endISO = end
    ? `${dateISO}T${end}:00`
    : (()=>{ const d=new Date(startISO); d.setHours(d.getHours()+1); return d.toISOString().slice(0,19); })();

  const g = document.createElement('a');
  g.className = 'btn google'; g.target = '_blank'; g.rel = 'noreferrer';
  g.href = googleCal({ title: item.title, details: item.description, location: item.location, startISO, endISO });
  g.textContent = '🗓️ Add to Google';
  g.setAttribute('aria-label', `Add ${item.title || 'event'} to Google Calendar`);
  btns.appendChild(g);

  const ics = document.createElement('button');
  ics.className = 'btn ics'; ics.type = 'button'; ics.textContent = '⬇️ Download .ics';
  ics.setAttribute('aria-label', `Download calendar file for ${item.title || 'event'}`);
  ics.addEventListener('click', ()=>{
    const blob = icsFile({ title: item.title, details: item.description, location: item.location, startISO, endISO });
    const url = URL.createObjectURL(blob);
    const a=document.createElement('a'); a.href=url; a.download=(item.title||'event').replace(/\s+/g,'_')+'.ics';
    document.body.appendChild(a); a.click(); setTimeout(()=>{document.body.removeChild(a); URL.revokeObjectURL(url);},200);
  });
  btns.appendChild(ics);

  body.appendChild(head);
  if(item.description) body.appendChild(desc);
  body.appendChild(btns);

  row.appendChild(time); row.appendChild(body); card.appendChild(row);

  if(item.imageUrl){
    const img = document.createElement('img');
    img.src = item.imageUrl; img.alt = item.title||'';
    img.style.marginTop = '10px'; img.style.width='100%'; img.style.borderRadius='12px';
    img.loading = 'lazy';
    card.appendChild(img);
  }
  return card;
}

// ================= RENDER: all days stacked =================
function renderCalendarAll(days){
  const wrap = document.getElementById('calendarDays');
  wrap.innerHTML = '';
  days.forEach(d => {
    const group = document.createElement('section');
    group.className = 'day-group';

    const h = document.createElement('h3');
    h.className = 'day-heading';
    h.textContent = d.day || new Date(d.date).toLocaleDateString(undefined, { weekday:'long' });

    const sub = document.createElement('p');
    sub.className = 'day-sub';
    sub.textContent = new Date(d.date).toLocaleDateString();

    const grid = document.createElement('div');
    grid.className = 'grid';

    d.items.forEach(item => grid.appendChild(activityCard(item, d.date)));

    group.appendChild(h);
    group.appendChild(sub);
    group.appendChild(grid);
    wrap.appendChild(group);
  });
  document.querySelector('#calendar')?.setAttribute('aria-busy','false');
}

// ================= EXPLORE: parsing & state =================
function parseCSVExplore(text){
  if (text.charCodeAt(0) === 0xFEFF) text = text.slice(1);
  const lines = text.split(/\r?\n/).filter(l => l.trim().length);
  if (!lines.length) return [];
  const headers = splitCSVLine(lines[0]).map(h => h.trim());
  const idx = (name) => headers.findIndex(h => h.toLowerCase() === name.toLowerCase());
  const iName = idx('Name'), iCat = idx('Category'), iSub = idx('Subcategory'), iAddr = idx('Address'), iMap = idx('Map Link');
  return lines.slice(1).map(line => {
    const cells = splitCSVLine(line).map(s => s.replace(/^"|"$/g,'').trim());
    return {
      name: cells[iName] || '',
      category: cells[iCat] || '',
      subcategory: cells[iSub] || '',
      address: cells[iAddr] || '',
      map: cells[iMap] || ''
    };
  });
}

const EXPLORE = {
  loaded: false,
  all: [],
  search: '',
  sortAZ: false,
  selectedCats: new Set(),
  selectedSubs: new Set()
};

function uniqueSorted(arr){ return Array.from(new Set(arr.filter(Boolean))).sort((a,b)=> a.localeCompare(b)); }

function buildChips(values, containerId, selectedSet, onChange){
  const wrap = document.getElementById(containerId);
  wrap.innerHTML = '';
  values.forEach(v => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'chip';          // styled later via CSS; works without it
    b.textContent = v;
    b.setAttribute('aria-pressed', selectedSet.has(v) ? 'true' : 'false');
    b.dataset.value = v;
    b.addEventListener('click', ()=>{
      if(selectedSet.has(v)) selectedSet.delete(v); else selectedSet.add(v);
      b.setAttribute('aria-pressed', selectedSet.has(v) ? 'true' : 'false');
      onChange();
    });
    wrap.appendChild(b);
  });
}

function exploreCard(place){
  const card = document.createElement('div');
  card.className = 'card';

  const row = document.createElement('div');
  row.className = 'row';

  const body = document.createElement('div');
  body.style.flex = '1';

  const head = document.createElement('div');
  head.style.display = 'flex'; head.style.alignItems = 'center';
  head.style.justifyContent = 'space-between'; head.style.gap = '8px';

  const title = document.createElement('div');
  title.className = 'title';
  title.textContent = place.name || '';

  const badges = document.createElement('div');
  badges.style.display = 'flex'; badges.style.gap = '6px'; badges.style.flexWrap = 'wrap';
  if (place.category) {
    const cat = document.createElement('span'); cat.className = 'badge'; cat.textContent = place.category;
    badges.appendChild(cat);
  }
  if (place.subcategory) {
    const sub = document.createElement('span'); sub.className = 'badge'; sub.textContent = place.subcategory;
    badges.appendChild(sub);
  }

  head.appendChild(title); head.appendChild(badges);

  const addr = document.createElement('div');
  addr.className = 'muted';
  addr.style.marginTop = '4px';
  addr.textContent = place.address || '';

  const btns = document.createElement('div');
  btns.className = 'btns';

  if (place.map || place.address){
    const a = document.createElement('a');
    a.className = 'btn map'; a.target = '_blank'; a.rel = 'noreferrer';
    a.href = place.map || ('https://maps.google.com/?q=' + encodeURIComponent(place.address || place.name));
    a.textContent = '📍 Open Map';
    a.setAttribute('aria-label', `Open map for ${place.name}`);
    btns.appendChild(a);
  }

  body.appendChild(head);
  if (place.address) body.appendChild(addr);
  body.appendChild(btns);

  row.appendChild(body);
  card.appendChild(row);
  return card;
}

function applyExploreFilters(){
  const q = EXPLORE.search.trim().toLowerCase();
  let list = EXPLORE.all.slice();

  if (q) {
    list = list.filter(p =>
      (p.name && p.name.toLowerCase().includes(q)) ||
      (p.address && p.address.toLowerCase().includes(q))
    );
  }
  if (EXPLORE.selectedCats.size){
    list = list.filter(p => EXPLORE.selectedCats.has((p.category||'').trim()));
  }
  if (EXPLORE.selectedSubs.size){
    list = list.filter(p => EXPLORE.selectedSubs.has((p.subcategory||'').trim()));
  }
  if (EXPLORE.sortAZ){
    list.sort((a,b)=> a.name.localeCompare(b.name));
  }
  return list;
}

function renderExplore(){
  const grid = document.getElementById('exploreGrid');
  const count = document.getElementById('exploreCount');
  const results = applyExploreFilters();

  grid.innerHTML = '';
  results.forEach(p => grid.appendChild(exploreCard(p)));
  count.textContent = `${results.length} place${results.length===1?'':'s'}`;
  document.querySelector('#explore')?.setAttribute('aria-busy','false');
}

async function ensureExploreLoaded(){
  if (EXPLORE.loaded) { renderExplore(); return; }
  try {
    const res = await fetch(CSV_EXPLORE_PATH + '?cb=' + Date.now());
    if (!res.ok) throw new Error('EXPLORE CSV HTTP ' + res.status);
    const text = await res.text();
    EXPLORE.all = parseCSVExplore(text);

    // Build chips
    const cats = uniqueSorted(EXPLORE.all.map(p => p.category && p.category.trim()));
    const subs = uniqueSorted(EXPLORE.all.map(p => p.subcategory && p.subcategory.trim()));
    buildChips(cats, 'chipCategories', EXPLORE.selectedCats, renderExplore);
    buildChips(subs, 'chipSubcategories', EXPLORE.selectedSubs, renderExplore);

    // Wire controls
    const search = document.getElementById('exploreSearch');
    const sortBtn = document.getElementById('exploreSortAZ');
    const clearBtn = document.getElementById('exploreClear');

    if (search) search.addEventListener('input', (e)=> { EXPLORE.search = e.target.value || ''; renderExplore(); });
    if (sortBtn) sortBtn.addEventListener('click', ()=>{
      EXPLORE.sortAZ = !EXPLORE.sortAZ;
      sortBtn.setAttribute('aria-pressed', EXPLORE.sortAZ ? 'true' : 'false');
      renderExplore();
    });
    if (clearBtn) clearBtn.addEventListener('click', ()=>{
      EXPLORE.search = '';
      EXPLORE.selectedCats.clear();
      EXPLORE.selectedSubs.clear();
      if (search) search.value = '';
      // reset chip states
      document.querySelectorAll('#chipCategories .chip, #chipSubcategories .chip').forEach(b => b.setAttribute('aria-pressed','false'));
      EXPLORE.sortAZ = false;
      if (sortBtn) sortBtn.setAttribute('aria-pressed','false');
      renderExplore();
    });

    EXPLORE.loaded = true;
    renderExplore();
  } catch (err) {
    console.error('Explore CSV load failed:', err);
    const el = document.getElementById('exploreError');
    if (el) { el.style.display = 'block'; el.textContent = 'Could not load Explore data.'; }
    document.querySelector('#explore')?.setAttribute('aria-busy','false');
  }
}

// ================= Simple router (Home / Calendar / Explore) =================
function setActiveTab(view) {
  document.querySelectorAll('.site-tab').forEach(a => {
    a.setAttribute('aria-selected', a.dataset.view === view ? 'true' : 'false');
  });
}
function showView(view) {
  document.querySelectorAll('.view').forEach(v => v.classList.add('hidden'));
  document.getElementById(view)?.classList.remove('hidden');
  setActiveTab(view);
}

// ================= BOOTSTRAP =================
async function load(){
  // Header countdown + wedding date on Home
  document.getElementById('wdate').textContent = new Date(COUPLE.weddingDateISO).toLocaleDateString();
  const dleft = daysUntil(COUPLE.weddingDateISO);
  document.getElementById('countdown').textContent =
    dleft>0 ? `${dleft} day${dleft===1?'':'s'} to go!` : (dleft===0?"It's today!":"Happily ever after 💜");

  try {
    const url = encodeURI(CSV_LOCAL_PATH) + '?cb=' + Date.now();
    const res = await fetch(url);
    if (!res.ok) throw new Error('CSV HTTP ' + res.status + ' for ' + url);
    const text = await res.text();

    // Parse CSV → days
    const days = parseCSV(text);
    if (!days.length) {
      const el = document.getElementById('error');
      el.style.display = 'block';
      el.innerHTML = 'No rows found after parsing the CSV.';
    }

    // ---------- Router (clean URLs: /home, /calendar, /explore) ----------
    function currentViewFromPath() {
      const seg = location.pathname.replace(/\/+$/, '').split('/').pop();
      return (seg === 'calendar' || seg === 'home' || seg === 'explore') ? seg : 'home';
    }

    function performRoute() {
      const view = currentViewFromPath();
      showView(view);
      if (view === 'calendar') renderCalendarAll(days);
      if (view === 'explore') ensureExploreLoaded();
      // reflect active tab
      document.querySelectorAll('.site-tab').forEach(a =>
        a.setAttribute('aria-selected', a.dataset.view === view ? 'true' : 'false')
      );
    }

    function navigate(view) {
      let path = '/home';
      if (view === 'calendar') path = '/calendar';
      else if (view === 'explore') path = '/explore';
      history.pushState({ view }, '', path);
      performRoute();
    }

    // Intercept tab clicks (prevent full page load)
    document.addEventListener('click', (e) => {
      const a = e.target.closest('.site-tab');
      if (!a) return;
      e.preventDefault();
      navigate(a.dataset.view);
    });

    // Back/forward buttons
    window.addEventListener('popstate', performRoute);

    // Initial route
    performRoute();

  } catch (e) {
    console.error('CSV load failed:', e);
    const el = document.getElementById('error');
    el.style.display = 'block';
    el.innerHTML = 'Could not load <code>'+CSV_LOCAL_PATH+'</code>.';
    document.querySelector('#calendar')?.setAttribute('aria-busy','false');

    // Router still needs to work for Explore even if itinerary fails
    function currentViewFromPath() {
      const seg = location.pathname.replace(/\/+$/, '').split('/').pop();
      return (seg === 'explore') ? 'explore' : 'home';
    }
    function performRoute() {
      const view = currentViewFromPath();
      showView(view);
      if (view === 'explore') ensureExploreLoaded();
      document.querySelectorAll('.site-tab').forEach(a =>
        a.setAttribute('aria-selected', a.dataset.view === view ? 'true' : 'false')
      );
    }
    function navigate(view) {
      const path = view === 'explore' ? '/explore' : '/home';
      history.pushState({ view }, '', path);
      performRoute();
    }
    document.addEventListener('click', (e) => {
      const a = e.target.closest('.site-tab');
      if (!a) return;
      e.preventDefault();
      navigate(a.dataset.view);
    });
    window.addEventListener('popstate', performRoute);
    performRoute();
  }
}
load();
