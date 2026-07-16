const CACHE = 'cyc-v20260716h';
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
  './guardias.html',
  './guardias-manifest.json',
  './icon-cplus-192.png',
  './terminos.html',
  './directiva.html',
  './directiva-eventos.html',
  './traslado-vip.html',
  './alerta-vecino.html',
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

// Notificación push del servidor (alertas de comunas guardadas — llegan con la app cerrada)
self.addEventListener('push', e => {
  var d = {};
  try { d = e.data ? e.data.json() : {}; } catch (err) {}
  e.waitUntil(
    self.registration.showNotification(d.titulo || 'Control y Confianza', {
      body: d.cuerpo || '',
      icon: 'icon-192.png',
      badge: 'icon-192.png',
      tag: d.tag || 'push-cyc',
      vibrate: [200, 100, 200],
      data: { url: d.url || 'https://app.controlyconfianza.cl/seguridad-chile.html' }
    })
  );
});

// Si el usuario retira la suscripción o el navegador la rota, avisar al Worker para no acumular endpoints muertos
self.addEventListener('pushsubscriptionchange', e => {
  var vieja = e.oldSubscription && e.oldSubscription.endpoint;
  if (vieja) {
    e.waitUntil(fetch('https://cyc-asistente.carlos-sandovalfuentes-csf.workers.dev/push/baja', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ endpoint: vieja })
    }).catch(function(){}));
  }
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
  // HTML siempre revalidado contra el servidor (esquiva el max-age=600 de Pages):
  // los cambios se ven al próximo abrir, sin esperar 10 minutos. Si no hay cambios,
  // el servidor responde 304 y cuesta un par de KB.
  const esHTML = e.request.mode === 'navigate' || url.pathname.endsWith('.html') || url.pathname.endsWith('/');
  const peticion = esHTML ? new Request(e.request, { cache: 'no-cache' }) : e.request;
  e.respondWith(
    fetch(peticion)
      .then(response => {
        const copy = response.clone();
        caches.open(CACHE).then(c => c.put(e.request, copy));
        return response;
      })
      .catch(() => caches.match(e.request))
  );
});
