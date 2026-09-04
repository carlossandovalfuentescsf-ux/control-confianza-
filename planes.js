const API_URL='https://cyc-asistente.carlos-sandovalfuentes-csf.workers.dev';
document.querySelectorAll('[data-price="personal"]').forEach(function(el){el.textContent=CYC_CONFIG.precioPersonal;});
document.querySelectorAll('[data-price="empresa"]').forEach(function(el){el.textContent=CYC_CONFIG.precioEmpresa;});
document.querySelectorAll('[data-price="controlmas"]').forEach(function(el){el.textContent=CYC_CONFIG.precioControlMas;});

var TOKEN=localStorage.getItem('cyc_token')||null, PLAN_ELEGIDO=null, VERIFICADO=null, PLANES=[];
// Quien llega desde una app vuelve a esa app, no a la portada (?f=app-cc / ?f=app-cplus).
(function(){
  try{
    var f=new URLSearchParams(location.search).get('f')||'', v=document.querySelector('.volver');
    if(!v) return;
    if(f==='app-cc'){ v.href='seguridad-chile.html'; v.textContent='← Volver a la App Control y Confianza'; }
    else if(f==='app-cplus'){ v.href='guardias.html'; v.textContent='← Volver a Control+'; }
  }catch(e){}
})();
var NOMBRE={personal:'Plan Personal',empresa:'Plan Empresa',controlmas:'Control+ Premium'};

function fechaCorta(iso){ try{ return new Date(/Z$|[+-]\d\d:\d\d$/.test(iso)?iso:String(iso).replace(' ','T')+'Z').toLocaleDateString('es-CL',{day:'numeric',month:'long'}); }catch(e){ return iso; } }

async function cargarSesion(){
  var anon=document.getElementById('cuentaAnon'), ok=document.getElementById('cuentaOk');
  if(!TOKEN){ anon.style.display=''; ok.style.display='none'; pintarBotones(); return; }
  try{
    var r=await fetch(API_URL+'/auth/me',{headers:{'Authorization':'Bearer '+TOKEN}});
    if(!r.ok){ salir(true); return; }
    var d=await r.json();
    VERIFICADO=!!d.verificado; PLANES=d.planes||[];
    document.getElementById('emailActual').textContent=d.email||'';
    document.getElementById('verifAviso').style.display=VERIFICADO?'none':'';
    var pa=document.getElementById('planesActivos');
    pa.innerHTML=PLANES.length
      ? PLANES.map(function(p){ return '<div class="activo">✅ '+(NOMBRE[p.plan]||p.plan)+' activo'+(p.vence?' hasta el '+fechaCorta(p.vence):' (permanente)')+'.</div>'; }).join('')
      : '<div class="nota">Esta cuenta no tiene planes de pago activos. Elige uno arriba y pulsa «Contratar».</div>';
    anon.style.display='none'; ok.style.display='';
    pintarBotones();
  }catch(e){}
}
function tiene(plan){ return PLANES.some(function(p){ return p.plan===plan || (plan==='controlmas' && p.plan==='empresa'); }); }
function pintarBotones(){
  document.querySelectorAll('.plan').forEach(function(card){
    var btn=card.querySelector('.btn'); if(!btn) return;
    var plan=(btn.getAttribute('onclick').match(/'(\w+)'/)||[])[1];
    var ya=card.querySelector('.activo'); if(ya) ya.remove();
    if(TOKEN && tiene(plan)){
      var p=PLANES.filter(function(x){return x.plan===plan;})[0];
      btn.insertAdjacentHTML('beforebegin','<div class="activo">✅ Ya lo tienes'+(p&&p.vence?' hasta el '+fechaCorta(p.vence):'')+'.</div>');
      if(plan==='personal'){ btn.style.display='none'; }
      else { btn.textContent='Renovar 30 días más'; btn.style.display=''; }
    } else {
      btn.style.display='';
      btn.textContent=plan==='controlmas'?'Activar Control+ Premium':'Contratar '+NOMBRE[plan];
    }
  });
}
async function contratar(plan){
  PLAN_ELEGIDO=plan;
  if(!TOKEN){
    document.getElementById('cuenta').scrollIntoView({behavior:'smooth',block:'start'});
    var m=document.getElementById('authMsg'); m.className='msg ok'; m.textContent='Elegiste '+NOMBRE[plan]+'. Crea tu cuenta o inicia sesión y te llevamos al pago.';
    return;
  }
  await pagar(plan);
}
async function pagar(plan){
  var m=document.getElementById('pagoMsg'); m.className='msg'; m.textContent='Abriendo el pago seguro en Flow…';
  document.getElementById('cuenta').scrollIntoView({behavior:'smooth',block:'start'});
  try{
    var r=await fetch(API_URL+'/pago/iniciar',{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+TOKEN},body:JSON.stringify({plan:plan})});
    var d=await r.json();
    if(r.ok&&d.url){ location.href=d.url; return; }
    m.className='msg err'; m.textContent=d.error||'No se pudo iniciar el pago.';
    if(r.status===403){ document.getElementById('verifAviso').style.display=''; }
  }catch(e){ m.className='msg err'; m.textContent='Error de conexión. Intenta de nuevo.'; }
}
async function auth(modo){
  var email=(document.getElementById('email').value||'').trim().toLowerCase();
  var pass=document.getElementById('pass').value;
  var m=document.getElementById('authMsg'); m.className='msg err'; m.textContent='';
  if(!email||!pass){ m.textContent='Completa email y contraseña.'; return; }
  try{
    var r=await fetch(API_URL+(modo==='login'?'/auth/login':'/auth/registro'),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:email,password:pass})});
    var d=await r.json();
    if(!r.ok){ m.textContent=d.error||'No se pudo continuar.'; return; }
    TOKEN=d.token; localStorage.setItem('cyc_token',TOKEN);
    await cargarSesion();
    if(PLAN_ELEGIDO){
      if(modo==='registro'){
        var pm=document.getElementById('pagoMsg'); pm.className='msg ok';
        pm.textContent='Cuenta creada. Te enviamos un correo para confirmarla: confírmalo y luego pulsa «'+(PLAN_ELEGIDO==='controlmas'?'Activar Control+ Premium':'Contratar '+NOMBRE[PLAN_ELEGIDO])+'» para pagar.';
      } else { await pagar(PLAN_ELEGIDO); }
    }
  }catch(e){ m.textContent='Error de conexión. Intenta de nuevo.'; }
}
async function reenviar(ev){
  ev.preventDefault();
  var m=document.getElementById('pagoMsg'); m.className='msg'; m.textContent='Enviando…';
  try{ var r=await fetch(API_URL+'/auth/reenviar-confirmacion',{method:'POST',headers:{'Authorization':'Bearer '+TOKEN}}); var d=await r.json(); m.className=r.ok?'msg ok':'msg err'; m.textContent=d.mensaje||d.error||(r.ok?'Correo reenviado. Revisa tu bandeja y spam.':'No se pudo reenviar.'); }
  catch(e){ m.className='msg err'; m.textContent='Error de conexión.'; }
}
function salir(silencioso){ localStorage.removeItem('cyc_token'); TOKEN=null; PLANES=[]; VERIFICADO=null; if(!silencioso){ document.getElementById('pagoMsg').textContent=''; } cargarSesion(); }
cargarSesion();
