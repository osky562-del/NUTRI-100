const CACHE_NAME = 'nutri100-v4';
const ASSETS = [
    '/',
    '/index.html',
    '/style.css?v=4',
    '/app.js?v=4',
    '/manifest.json'
];

self.addEventListener('install', e => {
    e.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => cache.addAll(ASSETS))
            .then(() => self.skipWaiting())
    );
});

self.addEventListener('activate', e => {
    e.waitUntil(
        caches.keys()
            .then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))))
            .then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', e => {
    if (e.request.url.includes('/api/')) return;

    e.respondWith(
        caches.match(e.request)
            .then(cached => {
                const fetchPromise = fetch(e.request).then(res => {
                    if (res.ok) {
                        const clone = res.clone();
                        caches.open(CACHE_NAME).then(cache => cache.put(e.request, clone));
                    }
                    return res;
                }).catch(() => cached);
                return cached || fetchPromise;
            })
    );
});
