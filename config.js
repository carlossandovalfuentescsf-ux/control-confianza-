// Fuente única de precios y contacto — usada por las 4 apps. Cambiar el precio o el WhatsApp acá, no en cada archivo.
var CYC_CONFIG = {
  whatsapp: '56984600273',
  precioPersonal: '4.990',
  precioEmpresa: '49.990',
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
