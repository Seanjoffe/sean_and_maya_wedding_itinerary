// ================= CONFIG =================
const COUPLE = { first: 'Sean', second: 'Maya', weddingDateISO: '2025-08-31' };
const CSV_LOCAL_PATH = 'wedding_week_itinerary.csv';
const EXPECTED_HEADERS = [
  'Day','Date','Start Time','End Time','Activity Name','Description','Location','Map Link','Category','Image URL'
];

// ================= UTILITIES =================
function fmtDate(iso){ try { return new Date(iso).toLocaleDateString(); } catch { return iso; } }
function daysUntil(dateISO){ const t=new Date(); const d=new Date(dateISO+'T00:00:00'); return Math.ceil((d-t)/(1000*60*60*24)); }
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

// ================= NORMALIZE / MAP =================
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
      endTime:   obj['End Time']||'',
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

// ================= RENDER =================
function render(days){
  document.getElementById('wdate').textContent = fmtDate(COUPLE.weddingDateISO);
  const dleft = daysUntil(COUPLE.weddingDateISO);
  document.getElementById('countdown').textContent =
    dleft>0 ? `${dleft} day${dleft===1?'':'s'} to go!` : (dleft===0?"It's today!":"Happily ever after 💜");

  const tabs = document.getElementById('tabs');
  const cards = document.getElementById('cards');
  const dayTitle = document.getElementById('dayTitle');
  tabs.innerHTML = '';

  days.forEach((d, i) => {
    const b = document.createElement('button');
    b.className = 'tab';
    b.type = 'button';
    b.setAttribute('aria-pressed', i===0 ? 'true' : 'false');
    b.textContent = d.day || new Date(d.date).toLocaleDateString(undefined,{ weekday:'long' });
    b.addEventListener('click', () => selectDay(i));
    tabs.appendChild(b);
  });

  function selectDay(i){
    const d = days[i];
    Array.from(tabs.children).forEach((el, idx)=> el.setAttribute('aria-pressed', idx===i?'true':'false'));
    dayTitle.textContent = `${d.day || new Date(d.date).toLocaleDateString(undefined,{weekday:'long'})} · ${fmtDate(d.date)}`;
    cards.innerHTML = '';
    if(!d.items.length){
      const empty = document.createElement('div');
      empty.className = 'card';
      empty.textContent = 'No activities yet for this day.';
      cards.appendChild(empty);
      return;
    }
    d.items.forEach(item => cards.appendChild(activityCard(item, d.date)));
  }

  if (days.length === 0) {
    dayTitle.textContent = "";
    cards.innerHTML = '';
    const empty = document.createElement('div');
    empty.className = 'card';
    empty.textContent = 'No itinerary data found. Please check CSV.';
    cards.appendChild(empty);
  } else {
    selectDay(0);
  }
  document.querySelector('section[aria-live]')?.setAttribute('aria-busy','false');
}

function activityCard(item, dateISO){
  const card = document.createElement('div');
  card.className = 'card';

  const row = document.createElement('div');
  row.className = 'row';

  const time = document.createElement('div');
  time.className = 'time';
  const range = item.endTime && item.endTime !== item.startTime ? `${item.startTime} – ${item.endTime}` : (item.startTime || '');
  time.textContent = range;

  const body = document.createElement('div');
  body.style.flex = '1';

  const head = document.createElement('div');
  head.style.display = 'flex'; head.style.alignItems = 'center'; head.style.justifyContent = 'space-between'; head.style.gap = '8px';

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
    a.textContent = '📍 Map';
    btns.appendChild(a);
  }

  const startISO = `${dateISO}T${(item.startTime||'09:00').padStart(5,'0')}:00`;
  const endISO = item.endTime ? `${dateISO}T${item.endTime.padStart(5,'0')}:00` : ( ()=>{ const d=new Date(startISO); d.setHours(d.getHours()+1); return d.toISOString().slice(0,19); } )();

  const g = document.createElement('a');
  g.className = 'btn google'; g.target = '_blank'; g.rel = 'noreferrer';
  g.href = googleCal({ title: item.title, details: item.description, location: item.location, startISO, endISO });
  g.textContent = '📆 Add to Google';
  btns.appendChild(g);

  const ics = document.createElement('button');
  ics.className = 'btn ics'; ics.type = 'button'; ics.textContent = '⬇️ Download .ics';
  ics.addEventListener('click', ()=>{
    const blob = icsFile({ title: item.title, details: item.description, location: item.location, startISO, endISO });
    const url = URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download = (item.title||'event').replace(/\s+/g,'_')+'.ics';
    document.body.appendChild(a); a.click(); setTimeout(()=>{document.body.removeChild(a);URL.revokeObjectURL(url);},200);
  });
  btns.appendChild(ics);

  body.appendChild(head);
  if(item.description) body.appendChild(desc);
  body.appendChild(btns);

  row.appendChild(time); row.appendChild(body); card.appendChild(row);

  if(item.imageUrl){
    const img = document.createElement('img');
    img.src = item.imageUrl; img.alt = item.title||''; img.style.marginTop = '10px'; img.style.width='100%'; img.style.borderRadius='12px';
    img.loading = 'lazy';
    card.appendChild(img);
  }
  return card;
}

// ================= BOOTSTRAP =================
async function load(){
  document.getElementById('wdate').textContent = new Date(COUPLE.weddingDateISO).toLocaleDateString();
  try {
    const url = encodeURI(CSV_LOCAL_PATH) + '?cb=' + Date.now();
    const res = await fetch(url);
    if (!res.ok) throw new Error('CSV HTTP ' + res.status + ' for ' + url);
    const text = await res.text();

    // Header diagnostics
    const firstLine = (text.charCodeAt(0) === 0xFEFF ? text.slice(1) : text).split(/\r?\n/)[0] || '';
    const headerCells = splitCSVLine(firstLine).map(h => h.trim());
    const missing = EXPECTED_HEADERS.filter(h => !headerCells.includes(h));
    if (missing.length) {
      const el = document.getElementById('error');
      el.style.display = 'block';
      el.innerHTML = 'Header mismatch.<br/><strong>Missing fields:</strong> <code>'+missing.join(', ')+'</code><br/><strong>Found:</strong> <code>'+headerCells.join(', ')+'</code>';
      document.querySelector('section[aria-live]')?.setAttribute('aria-busy','false');
    }

    const days = parseCSV(text);
    if(!days.length){
      const el = document.getElementById('error');
      el.style.display = 'block';
      el.innerHTML = 'No rows found after parsing the CSV.<br/>Check for blank lines or formatting issues.';
      document.querySelector('section[aria-live]')?.setAttribute('aria-busy','false');
    }
    render(days);
  } catch (e) {
    console.error('CSV load failed:', e);
    const el = document.getElementById('error');
    el.style.display = 'block';
    el.innerHTML = 'Could not load <code>'+CSV_LOCAL_PATH+'</code>.<br/>Open it directly in your browser to verify the path: <code>'+CSV_LOCAL_PATH+'</code>.';
    document.querySelector('section[aria-live]')?.setAttribute('aria-busy','false');
  }
}
load();
