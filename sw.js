const CACHE = 'lista-v2';
const ASSETS = ['/index.html', '/manifest.json'];

// ── Supabase ping config ───────────────────────────────────────────
// Cambia estos dos valores por los tuyos (los mismos que en index.html)
const SB_URL = 'https://aeeggawawrucaczrildu.supabase.co';   // https://xxxx.supabase.co
const SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFlZWdnYXdhd3J1Y2FjenJpbGR1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODYwMjg5ODAsImV4cCI6MjEwMTYwNDk4MH0.eg0RUMc-drq_yHXy0lbkdfxDesaxyne42pNCtxDSwSo';      // eyJhbGci...
const PING_INTERVAL_MS = 5 * 24 * 60 * 60 * 1000; // 5 días en milisegundos
const PING_KEY = 'lc_last_ping';
// ──────────────────────────────────────────────────────────────────

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys =>
    Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
  ));
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  if (e.request.url.includes('supabase.co') || e.request.url.includes('jsdelivr')) return;
  e.respondWith(caches.match(e.request).then(c => c || fetch(e.request)));
});

// ── Ping cada vez que el SW arranca (al abrir el navegador) ───────
self.addEventListener('activate', e => {
  e.waitUntil(pingIfNeeded());
});

// ── Ping periódico en background (Chrome Android) ─────────────────
self.addEventListener('periodicsync', e => {
  if (e.tag === 'supabase-ping') {
    e.waitUntil(pingSupabase());
  }
});

// ── Registrar periodic sync desde la app ─────────────────────────
self.addEventListener('message', e => {
  if (e.data === 'register-ping') {
    registerPeriodicSync();
  }
});

async function registerPeriodicSync() {
  try {
    const reg = await self.registration;
    if ('periodicSync' in reg) {
      await reg.periodicSync.register('supabase-ping', { minInterval: PING_INTERVAL_MS });
    }
  } catch { /* no soportado en este navegador */ }
}

async function pingIfNeeded() {
  try {
    const db = await openDB();
    const lastPing = await dbGet(db, PING_KEY);
    const now = Date.now();
    if (!lastPing || (now - parseInt(lastPing)) > PING_INTERVAL_MS) {
      await pingSupabase();
      await dbSet(db, PING_KEY, String(now));
    }
  } catch { /* silencioso */ }
}

async function pingSupabase() {
  try {
    await fetch(`${SB_URL}/rest/v1/houses?select=id&limit=1`, {
      headers: {
        'apikey': SB_KEY,
        'Authorization': `Bearer ${SB_KEY}`
      }
    });
  } catch { /* sin conexión, no pasa nada */ }
}

// ── Mini IndexedDB helper para guardar timestamp ──────────────────
function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('lc-sw', 1);
    req.onupgradeneeded = e => e.target.result.createObjectStore('kv');
    req.onsuccess = e => resolve(e.target.result);
    req.onerror = reject;
  });
}

function dbGet(db, key) {
  return new Promise((resolve, reject) => {
    const req = db.transaction('kv').objectStore('kv').get(key);
    req.onsuccess = e => resolve(e.target.result);
    req.onerror = reject;
  });
}

function dbSet(db, key, value) {
  return new Promise((resolve, reject) => {
    const req = db.transaction('kv', 'readwrite').objectStore('kv').put(value, key);
    req.onsuccess = resolve;
    req.onerror = reject;
  });
}
