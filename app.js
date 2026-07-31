/* ── Version ─────────────────────────────────────────────── */
const APP_VERSION = '2026.07.31.05';
const VERSION_KEY = 'bp-media-installed-version';

const SOURCE_URL = 'https://raw.githubusercontent.com/fmhy/edit/main/docs/video.md';
const CACHE_KEY = 'bp-media-sites-v5';
const CACHE_TTL = 1000 * 60 * 30; // 30 minutes

const ALLOWED_SECTIONS = [
  'Stream Aggregators',
  'Live Sports',
  'Live TV'
];

// Always include these (even if not starred), inserted first in their section
const FORCED_SITES = [
  {
    name: 'Sportsurge',
    url: 'https://v2.sportsurge.net/home5/',
    desc: 'Stream Aggregator',
    section: 'Live Sports'
  }
];

const BLOCKED_NAMES = [
  'p-stream forks',
  'pstream forks',
  'p stream forks'
];

function isBlockedName(name) {
  const n = name.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  return BLOCKED_NAMES.some(b => n === b || n.includes(b));
}

/* ── DOM refs ────────────────────────────────────────────── */
const statusEl     = document.getElementById('status');
const listEl       = document.getElementById('list');
const versionBar   = document.getElementById('versionBar');
const aboutVersion = document.getElementById('aboutVersion');
const menuBtn      = document.getElementById('menuBtn');
const menuDropdown = document.getElementById('menuDropdown');
const aboutModal   = document.getElementById('aboutModal');
const themesModal  = document.getElementById('themesModal');
const themeGrid    = document.getElementById('themeGrid');
const updateBanner = document.getElementById('updateBanner');
const updateBtn    = document.getElementById('updateBtn');

/* ── Themes ──────────────────────────────────────────────── */
const THEMES = [
  { id: 'midnight',      name: 'Midnight',      accent: '#f5c518', bg: '#0f0f13' },
  { id: 'crimson-pulse', name: 'Crimson Pulse', accent: '#e8354a', bg: '#140a0c' },
  { id: 'gold-rush',     name: 'Gold Rush',     accent: '#f0b429', bg: '#12100a' },
  { id: 'ocean-depth',   name: 'Ocean Depth',   accent: '#2eb8e6', bg: '#0a1016' },
  { id: 'forest-night',  name: 'Forest Night',  accent: '#3dcc6e', bg: '#0a120e' },
  { id: 'violet-haze',   name: 'Violet Haze',   accent: '#a855f7', bg: '#100e16' },
  { id: 'ember-glow',    name: 'Ember Glow',    accent: '#f97316', bg: '#140e0a' },
  { id: 'arctic-frost',  name: 'Arctic Frost',  accent: '#67e8f9', bg: '#0a1014' },
  { id: 'rose-quartz',   name: 'Rose Quartz',   accent: '#f472b6', bg: '#140a12' },
  { id: 'slate-steel',   name: 'Slate Steel',   accent: '#94a3b8', bg: '#0e1014' }
];
const THEME_KEY = 'bp-media-theme';

function applyTheme(id) {
  document.documentElement.setAttribute('data-theme', id);
  localStorage.setItem(THEME_KEY, id);
  const theme = THEMES.find(t => t.id === id);
  if (theme) {
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.content = theme.bg;
  }
  document.querySelectorAll('.theme-option').forEach(el => {
    el.classList.toggle('active', el.dataset.theme === id);
  });
}

function buildThemeGrid() {
  const current = localStorage.getItem(THEME_KEY) || 'midnight';
  themeGrid.innerHTML = THEMES.map(t => `
    <button class="theme-option${t.id === current ? ' active' : ''}" data-theme="${t.id}">
      <span class="theme-swatch" style="background:${t.accent}"></span>
      ${t.name}
    </button>
  `).join('');
}

themeGrid.addEventListener('click', (e) => {
  const btn = e.target.closest('[data-theme]');
  if (!btn) return;
  applyTheme(btn.dataset.theme);
});

themesModal.addEventListener('click', (e) => {
  if (e.target.hasAttribute('data-close-themes') || e.target.closest('[data-close-themes]')) {
    themesModal.hidden = true;
  }
});

applyTheme(localStorage.getItem(THEME_KEY) || 'midnight');
buildThemeGrid();

/* ── Version display ─────────────────────────────────────── */
versionBar.textContent = APP_VERSION;
aboutVersion.textContent = APP_VERSION;

/* ── Version check & update prompt ───────────────────────── */
function checkVersion() {
  const installed = localStorage.getItem(VERSION_KEY);
  if (installed && installed !== APP_VERSION) {
    updateBanner.hidden = false;
  } else {
    localStorage.setItem(VERSION_KEY, APP_VERSION);
  }
}

async function doFullRefresh() {
  localStorage.removeItem(CACHE_KEY);
  localStorage.setItem(VERSION_KEY, APP_VERSION);
  if ('caches' in window) {
    const keys = await caches.keys();
    await Promise.all(keys.map(k => caches.delete(k)));
  }
  if ('serviceWorker' in navigator) {
    const regs = await navigator.serviceWorker.getRegistrations();
    await Promise.all(regs.map(r => r.unregister()));
  }
  location.reload(true);
}

updateBtn.addEventListener('click', doFullRefresh);

/* ── Menu ────────────────────────────────────────────────── */
function closeMenu() {
  menuDropdown.hidden = true;
  menuBtn.setAttribute('aria-expanded', 'false');
}

function toggleMenu() {
  const open = menuDropdown.hidden;
  menuDropdown.hidden = !open;
  menuBtn.setAttribute('aria-expanded', String(open));
}

menuBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  toggleMenu();
});

document.addEventListener('click', (e) => {
  if (!menuDropdown.hidden && !menuDropdown.contains(e.target) && e.target !== menuBtn) {
    closeMenu();
  }
});

menuDropdown.addEventListener('click', (e) => {
  const item = e.target.closest('[data-action]');
  if (!item) return;
  const action = item.dataset.action;
  closeMenu();

  if (action === 'refresh') {
    doFullRefresh();
  } else if (action === 'share') {
    shareApp();
  } else if (action === 'themes') {
    buildThemeGrid();
    themesModal.hidden = false;
  } else if (action === 'about') {
    aboutModal.hidden = false;
  }
});

/* ── Share ───────────────────────────────────────────────── */
async function shareApp() {
  const shareData = {
    title: 'BP-Media',
    text: 'Starred streaming sites from FMHY — Stream Aggregators, Live Sports & Live TV',
    url: location.href
  };
  if (navigator.share) {
    try {
      await navigator.share(shareData);
    } catch (_) { /* user cancelled */ }
  } else if (navigator.clipboard) {
    try {
      await navigator.clipboard.writeText(location.href);
      setStatus('Link copied to clipboard');
      setTimeout(() => setStatus(''), 2000);
    } catch (_) {
      setStatus('Sharing not supported on this device', true);
    }
  } else {
    setStatus('Sharing not supported on this device', true);
  }
}

/* ── About modal ─────────────────────────────────────────── */
aboutModal.addEventListener('click', (e) => {
  if (e.target.hasAttribute('data-close') || e.target.closest('[data-close]')) {
    aboutModal.hidden = true;
  }
});

/* ── Status helper ───────────────────────────────────────── */
function setStatus(msg, isError = false) {
  statusEl.textContent = msg;
  statusEl.className = 'status' + (isError ? ' error' : '');
  statusEl.style.display = msg ? 'block' : 'none';
}

/* ── Parse starred sites ─────────────────────────────────── */
function parseStarred(md) {
  const lines = md.split('\n');
  const sites = [];
  let currentSection = '';

  for (const line of lines) {
    const sectionMatch = line.match(/^## ▷ (.+)/);
    if (sectionMatch) {
      currentSection = sectionMatch[1].trim();
      continue;
    }

    if (!ALLOWED_SECTIONS.includes(currentSection)) continue;
    if (!line.includes('⭐')) continue;

    const linkMatch = line.match(/\*\*\[([^\]]+)\]\((https?:\/\/[^)]+)\)\*\*/);
    if (linkMatch) {
      const name = linkMatch[1].trim();
      if (isBlockedName(name)) continue;
      const url = linkMatch[2].trim();
      const descMatch = line.match(/\)\*\*[^*]*?\s*-\s*(.+?)(?:\s*\/\s*\[|$)/);
      let desc = descMatch ? descMatch[1].trim() : '';
      desc = desc.replace(/\s*\/\s*$/, '').trim();
      sites.push({ name, url, desc, section: currentSection });
      continue;
    }

    const boldMatch = line.match(/\*\*([^*]+)\*\*/);
    if (boldMatch) {
      const name = boldMatch[1].trim();
      if (isBlockedName(name)) continue;
      const urlMatch = line.match(/(https?:\/\/[^\s\)]+)/);
      if (urlMatch) {
        sites.push({
          name,
          url: urlMatch[1],
          desc: '',
          section: currentSection
        });
      }
    }
  }

  // Inject forced sites first in their section, then dedupe by URL
  const seen = new Set();
  const forced = FORCED_SITES.filter(s => {
    if (seen.has(s.url)) return false;
    seen.add(s.url);
    return true;
  });
  const rest = sites.filter(s => {
    if (seen.has(s.url)) return false;
    seen.add(s.url);
    return true;
  });
  return [...forced, ...rest];
}

/* ── Render ──────────────────────────────────────────────── */
function render(sites) {
  if (!sites.length) {
    listEl.innerHTML = '<div class="empty">No starred sites found.</div>';
    setStatus('');
    return;
  }

  const groups = {};
  for (const site of sites) {
    if (!groups[site.section]) groups[site.section] = [];
    groups[site.section].push(site);
  }

  let html = '';
  for (const section of ALLOWED_SECTIONS) {
    const items = groups[section];
    if (!items || !items.length) continue;
    html += `<div class="section-title">${escapeHtml(section)}</div>`;
    for (const site of items) {
      html += `
        <a class="site-card" href="${escapeAttr(site.url)}" target="_blank" rel="noopener noreferrer">
          <span class="site-star">⭐</span>
          <div class="site-info">
            <div class="site-name">${escapeHtml(site.name)}</div>
            ${site.desc ? `<div class="site-desc">${escapeHtml(site.desc)}</div>` : ''}
          </div>
          <span class="site-arrow">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M9 18l6-6-6-6"/>
            </svg>
          </span>
        </a>`;
    }
  }

  listEl.innerHTML = html;
  setStatus('');
}

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function escapeAttr(str) {
  return str.replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

/* ── Fetch & load ────────────────────────────────────────── */
async function loadSites(force = false) {
  setStatus('Fetching latest starred sites…');

  if (!force) {
    try {
      const cached = JSON.parse(localStorage.getItem(CACHE_KEY) || 'null');
      if (cached && Date.now() - cached.ts < CACHE_TTL && cached.sites?.length) {
        render(cached.sites);
        fetchAndUpdate(true);
        return;
      }
    } catch (_) {}
  }

  await fetchAndUpdate(false);
}

async function fetchAndUpdate(silent) {
  try {
    const res = await fetch(SOURCE_URL + '?t=' + Date.now(), { cache: 'no-store' });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const md = await res.text();
    const sites = parseStarred(md);

    if (sites.length) {
      localStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), sites }));
      render(sites);
    } else if (!silent) {
      setStatus('No starred sites found in the source.', true);
    }
  } catch (err) {
    try {
      const cached = JSON.parse(localStorage.getItem(CACHE_KEY) || 'null');
      if (cached?.sites?.length) {
        render(cached.sites);
        if (!silent) setStatus('Offline — showing cached list', true);
        return;
      }
    } catch (_) {}
    if (!silent) setStatus('Failed to load. Check your connection and try again.', true);
  }
}

/* ── Service worker registration ─────────────────────────── */
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('./sw.js').catch(() => {});

  navigator.serviceWorker.addEventListener('controllerchange', () => {
    checkVersion();
  });
}

/* ── Boot ────────────────────────────────────────────────── */
checkVersion();
loadSites();
