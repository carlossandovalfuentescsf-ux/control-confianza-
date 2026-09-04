// Fuente única de precios y contacto — usada por las 4 apps. Cambiar el precio o el WhatsApp acá, no en cada archivo.
var CYC_CONFIG = {
  whatsapp: '56984600273',
  precioPersonal: '4.990',
  precioEmpresa: '49.990',
  precioControlMas: '2.500',   // Control+ Premium, por 30 días, renovación manual
  // Canal condominios (APP-4, brief §5.ter 28-07-2026) — setup one-time "desde" + continuidad mensual, netos de IVA
  precioCondominioSetup: '249.990',
  precioCondominioMensual: '14.990',
  // Versión de los datos delictuales — al actualizar la base, cambiar SOLO acá.
  datosPeriodo: 'Q1 2026',
  datosPeriodoLargo: 'Enero–Marzo 2026 (Q1 2026)',
  datosTendencias: 'Q1 2026 vs Q1 2025',
  datosActualizacion: 'junio 2026'
};

// Mostrar/ocultar contraseña — el botón (ojo) debe ir justo después del <input> de contraseña.
function cycToggleOjo(btn){
  var i = btn.previousElementSibling;
  if(!i || i.tagName !== 'INPUT') return;
  if(i.type === 'password'){ i.type = 'text'; btn.textContent = '🙈'; btn.setAttribute('aria-label','Ocultar contraseña'); }
  else { i.type = 'password'; btn.textContent = '👁'; btn.setAttribute('aria-label','Mostrar contraseña'); }
}

/* ── Modo tienda (04-09-2026) ─────────────────────────────────────────────────
   Google Play prohíbe que, DENTRO de la app instalada desde Play, se muestre otro
   medio de pago o un enlace que lleve a uno (política de pagos, answer/10281818).
   Fuera de la app (navegador, WhatsApp, web) se puede vender con Flow sin problema,
   y la app puede dejar entrar a quien ya pagó afuera («consumption-only»).
   Cómo se detecta: cuando Android abre la app (TWA), la primera página llega con
   referrer «android-app://<paquete>». Se guarda en sessionStorage —que es propio de
   esa ventana— para que dure toda la sesión de la app y NO contamine el navegador
   normal del mismo teléfono (localStorage sí lo compartiría). También sirve
   ?canal=play (para probar) y ?canal=web (para salir del modo en una prueba).
   Uso en las páginas: class="solo-web" en todo lo que venda o lleve a precios;
   class="solo-tienda" en el texto alternativo («si ya tienes plan, inicia sesión»).
   En JS: window.CYC_MODO_TIENDA. */
var CYC_CANAL = (function(){
  try{
    var q = new URLSearchParams(location.search).get('canal');
    var ref = document.referrer || '';
    if(q === 'play' || ref.indexOf('android-app://') === 0){ sessionStorage.setItem('cyc_canal','play'); }
    else if(q === 'web'){ sessionStorage.removeItem('cyc_canal'); }
    return sessionStorage.getItem('cyc_canal') || 'web';
  }catch(e){ return 'web'; }
})();
var CYC_MODO_TIENDA = (CYC_CANAL === 'play');
(function(){
  var st = document.createElement('style');
  st.textContent = '.solo-tienda{display:none !important}'
    + '.modo-tienda .solo-web{display:none !important}'
    + '.modo-tienda .solo-tienda{display:block !important}';
  document.head.appendChild(st);
  if(CYC_MODO_TIENDA){ document.documentElement.classList.add('modo-tienda'); }
})();
/* Bloque de «solo iniciar sesión» para las herramientas de pago en modo tienda:
   sin precio, sin botón de pago, sin enlace a planes. `prefijo` evita ids repetidos
   cuando hay varias tarjetas bloqueadas en la misma página. */
function cycOverlayTienda(planNombre, prefijo){
  prefijo = prefijo || 'tienda';
  return '<div style="font-size:12px;color:#ccc;font-weight:800">Incluido en el '+planNombre+'</div>'+
    '<div style="font-size:11px;color:#888;max-width:240px;line-height:1.5">Si ya lo tienes, inicia sesión con tu correo y se desbloquea aquí mismo.</div>'+
    '<input id="'+prefijo+'Email" type="email" placeholder="Email" autocapitalize="none" autocorrect="off" style="width:100%;max-width:220px;box-sizing:border-box;margin-top:6px;padding:7px;border-radius:6px;border:1px solid #333;background:#111;color:#fff;font-size:12px">'+
    '<div style="position:relative;max-width:220px;margin:5px auto 0"><input id="'+prefijo+'Pass" type="password" placeholder="Contraseña" style="width:100%;box-sizing:border-box;padding:7px;padding-right:32px;border-radius:6px;border:1px solid #333;background:#111;color:#fff;font-size:12px"><button type="button" tabindex="-1" aria-label="Mostrar contraseña" onclick="cycToggleOjo(this)" style="position:absolute;right:4px;top:50%;transform:translateY(-50%);background:none;border:none;color:#aaa;cursor:pointer;font-size:14px">👁</button></div>'+
    '<button onclick="cycLoginTienda(\''+prefijo+'\')" style="background:#d4a017;color:#111;border:none;padding:9px 18px;border-radius:8px;font-size:12px;font-weight:800;cursor:pointer;margin-top:8px">Iniciar sesión</button>'+
    '<a href="recuperar-clave.html" style="font-size:10px;color:#d4a017;margin-top:5px;text-decoration:underline">¿Olvidaste tu contraseña?</a>'+
    '<div id="'+prefijo+'Msg" style="font-size:10px;color:#e74c3c;margin-top:4px;min-height:1em"></div>';
}
async function cycLoginTienda(prefijo){
  var email=(document.getElementById(prefijo+'Email').value||'').trim().toLowerCase();
  var pass=document.getElementById(prefijo+'Pass').value;
  var msg=document.getElementById(prefijo+'Msg');
  if(!email||!pass){ if(msg) msg.textContent='Completa email y contraseña.'; return; }
  try{
    var res=await fetch((window.API_URL||'https://cyc-asistente.carlos-sandovalfuentes-csf.workers.dev')+'/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:email,password:pass})});
    var data=await res.json();
    if(!res.ok){ if(msg) msg.textContent=data.error||'No se pudo iniciar sesión.'; return; }
    localStorage.setItem('cyc_token',data.token);
    location.reload();
  }catch(e){ if(msg) msg.textContent='Error de conexión.'; }
}
