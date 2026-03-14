// Finance Funk — Service Worker
// Strategy:
//   - App shell + offline page: pre-cached on install
//   - API calls (/api/*): network-first, fallback to cache
//   - Static assets (JS, CSS, images, fonts): stale-while-revalidate
//   - Navigation fallback: offline.html when both network & cache miss

const CACHE_NAME = 'ff-cache-v1';
const OFFLINE_URL = '/offline.html';

// Pre-cache these on install
const PRECACHE_URLS = [
    OFFLINE_URL,
    '/icon-192x192.png',
    '/icon-512x512.png',
    '/FF.png',
];

// ─── Install ────────────────────────────────────────────────────────
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS))
    );
    // Activate new SW immediately without waiting for old tabs to close
    self.skipWaiting();
});

// ─── Activate ───────────────────────────────────────────────────────
self.addEventListener('activate', (event) => {
    // Clean up old caches
    event.waitUntil(
        caches.keys().then((keys) =>
            Promise.all(
                keys
                    .filter((key) => key !== CACHE_NAME)
                    .map((key) => caches.delete(key))
            )
        )
    );
    // Take control of all open tabs immediately
    self.clients.claim();
});

// ─── Fetch ──────────────────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);

    // Only handle same-origin requests
    if (url.origin !== location.origin) return;

    // Skip non-GET requests (POST, PUT, DELETE should always go to network)
    if (request.method !== 'GET') return;

    // ── API routes: network-first ──
    if (url.pathname.startsWith('/api/')) {
        event.respondWith(networkFirst(request));
        return;
    }

    // ── Navigation requests: network-first with offline fallback ──
    if (request.mode === 'navigate') {
        event.respondWith(navigationHandler(request));
        return;
    }

    // ── Static assets: stale-while-revalidate ──
    event.respondWith(staleWhileRevalidate(request));
});

// ─── Strategies ─────────────────────────────────────────────────────

async function networkFirst(request) {
    try {
        const response = await fetch(request);
        // Cache successful responses for offline use
        if (response.ok) {
            const cache = await caches.open(CACHE_NAME);
            cache.put(request, response.clone());
        }
        return response;
    } catch (err) {
        // Network failed — try cache
        const cached = await caches.match(request);
        if (cached) return cached;
        // Nothing in cache either
        return new Response(JSON.stringify({ error: 'offline' }), {
            status: 503,
            headers: { 'Content-Type': 'application/json' },
        });
    }
}

async function navigationHandler(request) {
    try {
        const response = await fetch(request);
        // Cache the page for offline
        if (response.ok) {
            const cache = await caches.open(CACHE_NAME);
            cache.put(request, response.clone());
        }
        return response;
    } catch (err) {
        // Try serving cached version of the page
        const cached = await caches.match(request);
        if (cached) return cached;
        // Last resort — show offline page
        return caches.match(OFFLINE_URL);
    }
}

async function staleWhileRevalidate(request) {
    const cache = await caches.open(CACHE_NAME);
    const cached = await cache.match(request);

    // Fire network request in background to update cache
    const networkPromise = fetch(request)
        .then((response) => {
            if (response.ok) {
                cache.put(request, response.clone());
            }
            return response;
        })
        .catch(() => cached); // If network fails, that's fine — we have cache

    // Return cached immediately if available, otherwise wait for network
    return cached || networkPromise;
}
