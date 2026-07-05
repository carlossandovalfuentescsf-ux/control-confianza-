const CACHE = 'cyc-v20260705b';
// Rutas relativas: funcionan tanto en app.controlyconfianza.cl (raíz)
// como en la URL antigua de github.io (subcarpeta /control-confianza-/).
const URLS = [
  './',
  './index.html',
  './seguridad-chile.html',
  './matriz-riesgo.html',
  './plan-hogar.html',
  './georef-predio.html',
  './recuperar-clave.html',
  './terminos.html',
  './directiva.html',
  './config.js',
  './cuadrante.js',
  './icon-192.png'
];

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

// Red primero: si hay internet carga la versión nueva, si no usa caché.
// Solo se cachean peticiones GET del propio sitio — nunca llamadas a APIs externas
// (Nominatim, tiles, Worker de IA), que pueden llevar coordenadas GPS u otros datos sensibles en la URL.
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  const cacheable = e.request.method === 'GET' && url.origin === self.location.origin;
  if (!cacheable) {
    e.respondWith(fetch(e.request));
    return;
  }
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
