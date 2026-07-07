#!/usr/bin/env node
// Chequeos automáticos para las apps estáticas de Control & Confianza.
// No requiere build ni dependencias: usa solo Node y regex/parsing simple.
const fs = require('fs');
const path = require('path');
const os = require('os');
const { execSync } = require('child_process');

const ROOT = path.join(__dirname, '..', '..');
const HTML_FILES = ['index.html', 'seguridad-chile.html', 'matriz-riesgo.html', 'plan-hogar.html', 'georef-predio.html', 'directiva.html', 'recuperar-clave.html', 'terminos.html', 'alerta-vecino.html'];

const errores = [];

function leer(archivo) {
  return fs.readFileSync(path.join(ROOT, archivo), 'utf-8');
}

function extraerScriptsInline(html) {
  const scripts = [];
  const re = /<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g;
  let m;
  while ((m = re.exec(html))) scripts.push(m[1]);
  return scripts.join('\n;\n');
}

function verificarSintaxisJS(archivo, html) {
  const js = extraerScriptsInline(html);
  if (!js.trim()) return;
  const tmp = path.join(os.tmpdir(), `verify-${process.pid}-${Date.now()}-${Math.random().toString(36).slice(2)}.js`);
  fs.writeFileSync(tmp, js);
  try {
    execSync(`node --check "${tmp}"`, { stdio: 'pipe' });
  } catch (e) {
    errores.push(`${archivo}: error de sintaxis JS -> ${e.stderr.toString().trim().split('\n')[0]}`);
  } finally {
    fs.unlinkSync(tmp);
  }
}

function verificarLlavesCSS(archivo, html) {
  const bloques = html.match(/<style>[\s\S]*?<\/style>/g) || [];
  bloques.forEach((bloque) => {
    const abren = (bloque.match(/{/g) || []).length;
    const cierran = (bloque.match(/}/g) || []).length;
    if (abren !== cierran) {
      errores.push(`${archivo}: llaves CSS desbalanceadas (${abren} abren, ${cierran} cierran)`);
    }
  });
}

function verificarLinksInternos(archivo, html) {
  const re = /href="([a-zA-Z0-9_-]+\.html)"/g;
  let m;
  while ((m = re.exec(html))) {
    if (!fs.existsSync(path.join(ROOT, m[1]))) {
      errores.push(`${archivo}: enlace roto a "${m[1]}" (el archivo no existe en el repo)`);
    }
  }
}

function verificarInputsHiddenEnOpts(archivo, html) {
  // Regresión de accesibilidad: las opciones de matriz-riesgo.html deben ser
  // radio/checkbox reales, focoseables por teclado, no type="hidden".
  const re = /<label class="opt[^"]*"[^>]*>[\s\S]*?<input type="hidden"/g;
  if (re.test(html)) {
    errores.push(`${archivo}: hay opciones .opt con <input type="hidden"> — no serían accesibles por teclado`);
  }
}

function extraerObjetoJS(html, declaracion) {
  const inicioDecl = html.indexOf(declaracion);
  if (inicioDecl === -1) return null;
  const inicioLlave = html.indexOf('{', inicioDecl);
  let profundidad = 0;
  let i = inicioLlave;
  for (; i < html.length; i++) {
    if (html[i] === '{') profundidad++;
    else if (html[i] === '}') {
      profundidad--;
      if (profundidad === 0) break;
    }
  }
  const texto = html.slice(inicioLlave, i + 1);
  try {
    // eslint-disable-next-line no-new-func
    return new Function('return ' + texto)();
  } catch (e) {
    errores.push(`No se pudo parsear "${declaracion}...": ${e.message}`);
    return null;
  }
}

// Sectores que legítimamente comparten nombre con otra comuna (verificado con datos reales).
const SECTORES_OK = new Set(['iquique:alto hospicio']);

function verificarComunasDB(html) {
  const db = extraerObjetoJS(html, 'var DB=');
  if (!db) return;
  const nombreAComuna = {};
  Object.keys(db).forEach((k) => { if (db[k].n) nombreAComuna[db[k].n.toLowerCase()] = k; });
  Object.keys(db).forEach((key) => {
    const c = db[key];
    if (typeof c.lat !== 'number' || typeof c.lng !== 'number') {
      errores.push(`seguridad-chile.html: comuna "${key}" (${c.n || '?'}) no tiene lat/lng numéricos completos — el mapa fallará si alguien la selecciona`);
    }
    (c.sects || []).forEach((s) => {
      const sn = (s.n || '').toLowerCase();
      if (nombreAComuna[sn] && nombreAComuna[sn] !== key && !SECTORES_OK.has(key + ':' + sn)) {
        errores.push(`seguridad-chile.html: comuna "${c.n}" tiene un sector llamado "${s.n}", que es el nombre de otra comuna (${nombreAComuna[sn]}) — probable error de datos copiados. Si es correcto, agrégalo a SECTORES_OK.`);
      }
    });
  });
}

for (const archivo of HTML_FILES) {
  const html = leer(archivo);
  verificarSintaxisJS(archivo, html);
  verificarLlavesCSS(archivo, html);
  verificarLinksInternos(archivo, html);
}
verificarInputsHiddenEnOpts('matriz-riesgo.html', leer('matriz-riesgo.html'));
verificarComunasDB(leer('seguridad-chile.html'));

if (errores.length) {
  console.error(`Se encontraron ${errores.length} problema(s):\n`);
  errores.forEach((e) => console.error('  ✗ ' + e));
  process.exit(1);
}
console.log(`OK — sintaxis JS, llaves CSS, enlaces internos y datos de comunas verificados en ${HTML_FILES.length} archivos.`);
