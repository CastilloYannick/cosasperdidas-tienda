/*
 * Respaldo sin internet de la tienda.
 * Copia el sitio (docs/), baja los datos públicos actuales de Supabase
 * (productos, ajustes y reseñas aprobadas), las fotos subidas desde el
 * panel y las fuentes, y deja todo listo para abrir index.html con doble clic.
 *
 * Uso:  node tools/respaldo.js            (crea Escritorio/Cosas Perdidas - Respaldo/AAAA-MM-DD)
 */
const fs = require('fs');
const path = require('path');
const os = require('os');

const RAIZ = path.resolve(__dirname, '..');
const SITIO = path.join(RAIZ, 'docs');
const cfg = fs.readFileSync(path.join(SITIO, 'js/config.js'), 'utf8');
const URL_SB = cfg.match(/SUPABASE_URL:\s*'([^']*)'/)[1];
const LLAVE = cfg.match(/SUPABASE_ANON_KEY:\s*'([^']*)'/)[1];
const hoy = new Date().toISOString().slice(0, 10);
const DESTINO = path.join(os.homedir(), 'Desktop', 'Cosas Perdidas - Respaldo', hoy);
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';

async function api(ruta) {
  const r = await fetch(`${URL_SB}/rest/v1/${ruta}`, { headers: { apikey: LLAVE } });
  if (!r.ok) throw new Error(`${ruta}: ${r.status}`);
  return r.json();
}

async function bajar(url, archivo) {
  const r = await fetch(url, { headers: { 'User-Agent': UA } });
  if (!r.ok) throw new Error(`${url}: ${r.status}`);
  fs.mkdirSync(path.dirname(archivo), { recursive: true });
  fs.writeFileSync(archivo, Buffer.from(await r.arrayBuffer()));
}

(async () => {
  fs.rmSync(DESTINO, { recursive: true, force: true });
  fs.cpSync(SITIO, DESTINO, { recursive: true, filter: s => !/[\\/]CNAME$/.test(s) });

  // 1. Datos actuales
  const productos = await api('productos?select=*&order=orden.asc');
  const filasAjustes = await api('ajustes?select=clave,valor');
  const ajustes = Object.fromEntries(filasAjustes.map(f => [f.clave, f.valor]));
  const resenas = await api('resenas?select=id,nombre,producto_id,estrellas,texto,creada&order=creada.desc');

  // 2. Fotos subidas desde el panel (las que viven en Supabase) -> img/respaldo/
  const local = new Map();
  const localizar = async url => {
    if (!/^https?:/.test(url)) return url;
    if (local.has(url)) return local.get(url);
    const nombre = 'img/respaldo/' + path.basename(new URL(url).pathname);
    await bajar(url, path.join(DESTINO, nombre));
    try { await bajar(url.replace(/\.webp$/, '-m.webp'), path.join(DESTINO, nombre.replace(/\.webp$/, '-m.webp'))); } catch (e) {}
    local.set(url, nombre);
    return nombre;
  };
  for (const p of productos) p.fotos = await Promise.all((p.fotos || []).map(localizar));
  if (ajustes.portada) ajustes.portada.fotos = await Promise.all((ajustes.portada.fotos || []).map(localizar));

  fs.writeFileSync(path.join(DESTINO, 'data/offline.js'),
    '// Datos guardados el ' + hoy + ' para ver la tienda sin internet\nwindow.CP_OFFLINE = ' +
    JSON.stringify({ guardado: hoy, productos, ajustes, resenas }, null, 1) + ';\n');
  fs.writeFileSync(path.join(DESTINO, 'data/productos.json'), JSON.stringify(productos, null, 2));
  fs.writeFileSync(path.join(DESTINO, 'data/ajustes.json'), JSON.stringify(ajustes, null, 2));
  fs.writeFileSync(path.join(DESTINO, 'data/resenas.json'), JSON.stringify(resenas, null, 2));

  // 3. Fuentes de Google en local
  const enlaceFuentes = 'https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght,SOFT,WONK@9..144,600..900,100,1&family=Quicksand:wght@400;500;600;700&display=swap';
  let css = await (await fetch(enlaceFuentes, { headers: { 'User-Agent': UA } })).text();
  const urls = [...new Set(css.match(/https:\/\/fonts\.gstatic\.com\/[^)]+/g) || [])];
  for (let i = 0; i < urls.length; i++) {
    const n = `fonts/f${i}.woff2`;
    await bajar(urls[i], path.join(DESTINO, n));
    css = css.split(urls[i]).join('../' + n);
  }
  fs.writeFileSync(path.join(DESTINO, 'css/fuentes.css'), css);

  // 4. Páginas apuntando a lo local
  for (const pag of ['index.html', 'admin.html']) {
    const f = path.join(DESTINO, pag);
    let h = fs.readFileSync(f, 'utf8');
    h = h.replace(/\s*<link rel="preconnect"[^>]*>/g, '')
      .replace(/<link href="https:\/\/fonts\.googleapis\.com[^>]*>/, '<link rel="stylesheet" href="css/fuentes.css">')
      .replace(/\s*<script src="https:\/\/cdn\.jsdelivr\.net[^>]*><\/script>/, '')
      .replace('<script src="js/config.js"></script>', '<script src="js/config.js"></script>\n  <script src="data/offline.js"></script>');
    fs.writeFileSync(f, h);
  }

  // 5. Copia de la base (estructura) y guía
  fs.cpSync(path.join(RAIZ, 'supabase'), path.join(DESTINO, '_base-de-datos'), { recursive: true });
  fs.writeFileSync(path.join(DESTINO, 'LEEME.txt'), `RESPALDO DE COSAS PERDIDAS · ${hoy}
=========================================

Ver la tienda sin internet
  Abre index.html con doble clic. Ves el catálogo, fotos, reseñas y políticas
  tal como estaban el ${hoy}. El carrito funciona; pedir por Instagram y
  "Sigue tu pedido" necesitan internet.

Qué incluye
  - Todo el sitio (páginas, estilos, código, fotos y fuentes).
  - data/productos.json, data/ajustes.json y data/resenas.json: tus datos de ese día.
  - img/respaldo/: fotos que subiste desde el panel.
  - _base-de-datos/: cómo se creó la base en Supabase, por si algún día hay que rehacerla.

Qué NO incluye
  - Los envíos (tienen datos privados de clientes). Si los necesitas, en Supabase:
    Table Editor > envios > Export to CSV.

Hacer un respaldo nuevo
  En la carpeta Escritorio\\cosas-perdidas-tienda ejecuta:
      node tools/respaldo.js
  Se crea otra carpeta con la fecha del día; las anteriores no se borran.
`);
  console.log('Respaldo listo en', DESTINO, `(${productos.length} productos, ${resenas.length} reseñas, ${local.size} fotos subidas, ${urls.length} fuentes)`);
})().catch(e => { console.error('Error:', e.message); process.exit(1); });
