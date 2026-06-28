const CACHE = 'cyc-v20260628';
const URLS = ['/control-confianza-/seguridad-chile.html'];

// Al instalar, guardar en caché
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(URLS)));
  self.skipWaiting();
});

// Al activar, eliminar cachés viejos
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Abrir la app al hacer clic en una notificación
self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(
    clients.matchAll({type:'window'}).then(cs => {
      if(cs.length>0){cs[0].focus();}
      else{clients.openWindow(e.notification.data&&e.notification.data.url||'/');}
    })
  );
});

// Red primero: si hay internet carga la versión nueva, si no usa caché
self.addEventListener('fetch', e => {
  e.respondWith(
    fetch(e.request)
      .then(response => {
        const copy = response.clone();
        caches.open(CACHE).then(c => c.put(e.request, copy));
        return response;
      })
      .catch(() => caches.match(e.request))
  );
});
