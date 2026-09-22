// Progressive Web App Service Worker for Academic Hub
const CACHE_NAME = 'academic-hub-cache-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  // Pass through fetch events to network
  if (event.request.method !== 'GET') return;
  // Ignore API requests and analytics from service worker interception
  const url = new URL(event.request.url);
  if (url.pathname.startsWith('/api/')) return;
});
