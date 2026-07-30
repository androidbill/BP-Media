/* BP-Media — a launcher for links you choose. */

const APP_VERSION = '2026.07.30.01';

const LINKS_KEY = 'bpmedia.links.v1';
const PREFS_KEY = 'bpmedia.prefs.v1';

const $ = (id) => document.getElementById(id);

let links = load(LINKS_KEY, []);
let prefs = load(PREFS_KEY, { siteIcons: true });
let editingId = null;
let filter = '';

/* ---------------- storage ---------------- */

function load(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function saveLinks() {
  localStorage.setItem(LINKS_KEY, JSON.stringify(links));
}

function savePrefs() {
  localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
}

/* ---------------- helpers ---------------- */

// Accepts "example.com", "example.com/path", or a full URL.
function normalizeUrl(input) {
  let s = String(input).trim();
  if (!s) return null;
  if (!/^https?:\/\//i.test(s)) s = 'https://' + s.replace(/^\/+/, '');
  try {
    const u = new URL(s);
    if (!u.hostname.includes('.')) return null;
    return u.toString();
  } catch {
    return null;
  }
}

function hostOf(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

// Site name guessed from the domain: "cbc.ca" -> "Cbc".
function nameFromUrl(url) {
  const host = hostOf(url);
  const base = host.split('.')[0] || host;
  return base.charAt(0).toUpperCase() + base.slice(1);
}

// Stable hue per host so a tile keeps its colour between launches.
function hueOf(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) % 360;
  return h;
}

function faviconUrl(url) {
  return 'https://icons.duckduckgo.com/ip3/' + hostOf(url) + '.ico';
}

function toast(msg) {
  const t = $('toast');
  t.textContent = msg;
  t.hidden = false;
  clearTimeout(toast._t);
  toast._t = setTimeout(() => { t.hidden = true; }, 2200);
}

/* ---------------- rendering ---------------- */

function render() {
  const grid = $('grid');
  grid.textContent = '';

  const q = filter.trim().toLowerCase();
  const shown = q
    ? links.filter((l) => (l.name + ' ' + l.url).toLowerCase().includes(q))
    : links;

  $('empty').hidden = links.length > 0;
  $('searchWrap').hidden = links.length < 9;

  for (const link of shown) {
    const tile = document.createElement('a');
    tile.className = 'tile';
    tile.href = link.url;
    tile.target = '_blank';
    tile.rel = 'noopener noreferrer';

    const icon = document.createElement('div');
    icon.className = 'tile-icon';
    const hue = hueOf(hostOf(link.url));
    icon.style.background = `linear-gradient(150deg, hsl(${hue} 62% 52%), hsl(${(hue + 42) % 360} 58% 38%))`;
    icon.textContent = (link.name[0] || '?').toUpperCase();

    if (prefs.siteIcons) {
      const img = document.createElement('img');
      img.loading = 'lazy';
      img.alt = '';
      // Only swap the letter out once the real favicon has loaded.
      img.onload = () => { icon.textContent = ''; icon.appendChild(img); };
      img.onerror = () => {};
      img.src = faviconUrl(link.url);
    }

    const name = document.createElement('div');
    name.className = 'tile-name';
    name.textContent = link.name;

    const host = document.createElement('div');
    host.className = 'tile-host';
    host.textContent = hostOf(link.url);

    const edit = document.createElement('button');
    edit.className = 'tile-edit';
    edit.type = 'button';
    edit.setAttribute('aria-label', 'Edit ' + link.name);
    edit.textContent = '✎';
    edit.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      openEditor(link.id);
    });

    tile.append(icon, name, host, edit);
    grid.appendChild(tile);
  }
}

/* ---------------- add / edit ---------------- */

function openEditor(id) {
  editingId = id || null;
  const link = id ? links.find((l) => l.id === id) : null;

  $('editTitle').textContent = link ? 'Edit link' : 'Add link';
  $('fUrl').value = link ? link.url : '';
  $('fName').value = link ? link.name : '';
  $('deleteBtn').hidden = !link;
  $('moveRow').hidden = !link || links.length < 2;

  $('editDlg').showModal();
  if (!link) setTimeout(() => $('fUrl').focus(), 60);
}

function submitEditor(e) {
  e.preventDefault();

  const url = normalizeUrl($('fUrl').value);
  if (!url) {
    toast('That web address does not look right');
    $('fUrl').focus();
    return;
  }

  const name = $('fName').value.trim() || nameFromUrl(url);

  if (editingId) {
    const link = links.find((l) => l.id === editingId);
    link.url = url;
    link.name = name;
  } else {
    links.push({
      id: (crypto.randomUUID ? crypto.randomUUID() : String(Date.now())),
      name,
      url,
      createdAt: Date.now()
    });
  }

  saveLinks();
  render();
  $('editDlg').close();
  toast(editingId ? 'Saved' : 'Added ' + name);
  editingId = null;
}

function deleteCurrent() {
  const link = links.find((l) => l.id === editingId);
  if (!link) return;
  if (!confirm('Remove ' + link.name + '?')) return;
  links = links.filter((l) => l.id !== editingId);
  saveLinks();
  render();
  $('editDlg').close();
  toast('Removed ' + link.name);
  editingId = null;
}

function move(dir) {
  const i = links.findIndex((l) => l.id === editingId);
  const j = dir === 'up' ? i - 1 : i + 1;
  if (i < 0 || j < 0 || j >= links.length) return;
  [links[i], links[j]] = [links[j], links[i]];
  saveLinks();
  render();
  toast(dir === 'up' ? 'Moved up' : 'Moved down');
}

/* ---------------- backup ---------------- */

function exportLinks() {
  if (!links.length) return toast('Nothing to export yet');
  const blob = new Blob([JSON.stringify({ app: 'BP-Media', version: APP_VERSION, links }, null, 2)],
    { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'bp-media-links.json';
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  toast('Exported ' + links.length + ' links');
}

function importLinks(file) {
  const reader = new FileReader();
  reader.onload = () => {
    let incoming;
    try {
      const data = JSON.parse(reader.result);
      incoming = Array.isArray(data) ? data : data.links;
    } catch {
      return toast('That file could not be read');
    }
    if (!Array.isArray(incoming)) return toast('No links found in that file');

    const have = new Set(links.map((l) => l.url));
    let added = 0;
    for (const item of incoming) {
      const url = normalizeUrl(item && item.url);
      if (!url || have.has(url)) continue;
      have.add(url);
      links.push({
        id: (crypto.randomUUID ? crypto.randomUUID() : String(Date.now() + added)),
        name: (item.name || '').trim() || nameFromUrl(url),
        url,
        createdAt: Date.now()
      });
      added++;
    }
    saveLinks();
    render();
    toast(added ? 'Added ' + added + ' links' : 'Already had them all');
  };
  reader.readAsText(file);
}

/* ---------------- menu ---------------- */

function setMenuOpen(open) {
  $('menu').hidden = !open;
  $('menuBtn').setAttribute('aria-expanded', String(open));
  if (open) {
    $('menu').querySelector('[data-act="icons"]').textContent =
      'Site icons: ' + (prefs.siteIcons ? 'on' : 'off');
  }
}

async function shareApp() {
  const data = { title: 'BP-Media', text: 'My link launcher', url: location.href };
  try {
    if (navigator.share) {
      await navigator.share(data);
    } else {
      await navigator.clipboard.writeText(location.href);
      toast('Link copied');
    }
  } catch {
    /* user dismissed the share sheet */
  }
}

function onMenuAction(act) {
  setMenuOpen(false);
  if (act === 'refresh') location.reload();
  else if (act === 'share') shareApp();
  else if (act === 'about') $('aboutDlg').showModal();
  else if (act === 'export') exportLinks();
  else if (act === 'import') $('importFile').click();
  else if (act === 'icons') {
    prefs.siteIcons = !prefs.siteIcons;
    savePrefs();
    render();
    toast('Site icons ' + (prefs.siteIcons ? 'on' : 'off'));
  }
}

/* ---------------- wiring ---------------- */

$('ver').textContent = APP_VERSION;
$('aboutVer').textContent = APP_VERSION;

$('addBtn').addEventListener('click', () => openEditor(null));
$('editForm').addEventListener('submit', submitEditor);
$('cancelBtn').addEventListener('click', () => { $('editDlg').close(); editingId = null; });
$('deleteBtn').addEventListener('click', deleteCurrent);

for (const btn of document.querySelectorAll('[data-move]')) {
  btn.addEventListener('click', () => move(btn.dataset.move));
}

$('menuBtn').addEventListener('click', (e) => {
  e.stopPropagation();
  setMenuOpen($('menu').hidden);
});
document.addEventListener('click', () => setMenuOpen(false));
$('menu').addEventListener('click', (e) => {
  const btn = e.target.closest('[data-act]');
  if (btn) onMenuAction(btn.dataset.act);
});

$('importFile').addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (file) importLinks(file);
  e.target.value = '';
});

$('search').addEventListener('input', (e) => {
  filter = e.target.value;
  render();
});

// Handle links shared into the app from the browser's share sheet.
const shared = new URLSearchParams(location.search).get('url');
if (shared) {
  history.replaceState({}, '', location.pathname);
  const url = normalizeUrl(shared);
  if (url) {
    openEditor(null);
    $('fUrl').value = url;
    $('fName').focus();
  }
}

render();

/* ---------------- service worker + update prompt ---------------- */

if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    try {
      const reg = await navigator.serviceWorker.register('sw.js');

      // A waiting worker means a newer version is already downloaded.
      if (reg.waiting) showUpdate(reg);

      reg.addEventListener('updatefound', () => {
        const sw = reg.installing;
        if (!sw) return;
        sw.addEventListener('statechange', () => {
          if (sw.state === 'installed' && navigator.serviceWorker.controller) showUpdate(reg);
        });
      });

      // Re-check whenever the app comes back to the foreground.
      document.addEventListener('visibilitychange', () => {
        if (!document.hidden) reg.update().catch(() => {});
      });
    } catch {
      /* offline or unsupported — the app still works */
    }
  });

  let reloading = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (reloading) return;
    reloading = true;
    location.reload();
  });
}

function showUpdate(reg) {
  $('updateBar').hidden = false;
  $('updateBtn').onclick = () => {
    $('updateBar').hidden = true;
    if (reg.waiting) reg.waiting.postMessage({ type: 'SKIP_WAITING' });
    else location.reload();
  };
}
