"use strict";
const CACHE = "pl-shell-v4";
const SHELL = ["./", "./index.html", "./app.js", "./style.css", "./manifest.json",
  "./icons/icon-192.png", "./icons/icon-512.png", "./vendor/chart.umd.min.js"];

self.addEventListener("install", event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(SHELL)));
});

self.addEventListener("activate", event => {
  event.waitUntil(caches.keys().then(names => Promise.all(
    names.filter(name => name !== CACHE).map(name => caches.delete(name))
  )).then(() => self.clients.claim()));
});

self.addEventListener("fetch", event => {
  if (event.request.method !== "GET" || new URL(event.request.url).origin !== self.location.origin) return;
  event.respondWith(caches.open(CACHE).then(async cache =>
    (await cache.match(event.request)) || fetch(event.request)
  ));
});
