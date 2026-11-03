/*
 * ============================================================
 *  CAPA DE DATOS
 *  Lee y guarda los productos en Supabase (tabla "productos" y
 *  bucket de fotos). Sin Supabase configurado, cae al catálogo
 *  local data/productos.json para que la tienda nunca quede vacía.
 * ============================================================
 */
const Datos = (function () {
  'use strict';

  const C = window.CP_CONFIG;
  const enPrueba = !!C.LOCAL_EN_PRUEBA && /^(localhost|127.0.0.1)$/.test(location.hostname);
  const conSupabase = !enPrueba && !!(C.SUPABASE_URL && C.SUPABASE_ANON_KEY && window.supabase);
  const configurado = !!(C.SUPABASE_URL && C.SUPABASE_ANON_KEY && window.supabase);
  // Reseñas y envíos siempre usan la base real (también al probar en local)
  const cliente = configurado ? window.supabase.createClient(C.SUPABASE_URL, C.SUPABASE_ANON_KEY) : null;
  const sb = conSupabase ? cliente : null;

  /* Menú de categorías: cada producto guarda la categoría final (la "hoja") */
  const CATEGORIAS = [
    { id: 'deportivos', nombre: 'Deportivos' },
    { id: 'casuales', nombre: 'Casuales' },
    { id: 'tacones', nombre: 'Tacones' },
    { id: 'ropa', nombre: 'Ropa', subs: [{ id: 'ropa-ninos', nombre: 'Niños' }, { id: 'ropa-ninas', nombre: 'Niñas' }] },
    { id: 'accesorios', nombre: 'Accesorios', subs: [{ id: 'charms', nombre: 'Charms' }, { id: 'carteras', nombre: 'Carteras' }] },
    { id: 'salud', nombre: 'Salud', subs: [{ id: 'salud', nombre: 'Vitaminas' }] }
  ];
  const HOJAS = CATEGORIAS.flatMap(c => (c.subs ? c.subs.map(s => ({ ...s, padre: c.id, nombreLargo: c.nombre + ' · ' + s.nombre })) : [{ ...c, padre: c.id, nombreLargo: c.nombre }]));
  const padreDe = id => (HOJAS.find(h => h.id === id) || {}).padre || id;
  const nombreCategoria = id => (HOJAS.find(h => h.id === id) || {}).nombreLargo || '';

  const ordenar = lista => lista.slice().sort((a, b) => (a.orden ?? 999) - (b.orden ?? 999));

  async function local() {
    const r = await fetch('data/productos.json', { cache: 'no-cache' });
    return ordenar(await r.json());
  }

  async function listar() {
    if (!sb) return local();
    const { data, error } = await sb.from('productos').select('*').order('orden', { ascending: true });
    if (error) {
      console.warn('Supabase no respondió, uso el catálogo local', error);
      return local();
    }
    return data;
  }

  /* Miniatura: cada foto se guarda junto a una versión "-m" más ligera */
  const miniatura = url => (url || '').replace(/\.webp(\?.*)?$/, '-m.webp$1');

  function precioFinal(p) {
    if (p.precio == null) return null;
    return p.precio_oferta != null && p.precio_oferta < p.precio ? p.precio_oferta : p.precio;
  }

  function descuento(p) {
    if (p.precio == null || p.precio_oferta == null || p.precio_oferta >= p.precio) return 0;
    return Math.round((1 - p.precio_oferta / p.precio) * 100);
  }

  const dinero = n => (n == null ? 'Pregunta el precio' : `${C.MONEDA}${Number(n).toLocaleString('es-GT')}`);

  /* ---------- Solo para el panel ---------- */
  function exigir() {
    if (!sb) throw new Error('Falta configurar Supabase en js/config.js');
    return sb;
  }

  async function sesion() {
    if (!sb) return null;
    const { data } = await sb.auth.getSession();
    return data.session;
  }

  const entrar = (email, password) => exigir().auth.signInWithPassword({ email, password });
  const salir = () => exigir().auth.signOut();

  async function guardar(p) {
    const { data, error } = await exigir().from('productos').upsert(p).select().single();
    if (error) throw error;
    return data;
  }

  async function actualizar(id, cambios) {
    const { error } = await exigir().from('productos').update(cambios).eq('id', id);
    if (error) throw error;
  }

  async function borrar(id) {
    const { error } = await exigir().from('productos').delete().eq('id', id);
    if (error) throw error;
  }

  /* Reduce la foto en el navegador antes de subirla (WebP grande + miniatura) */
  function aWebp(file, alto, ancho) {
    return new Promise((ok, mal) => {
      const img = new Image();
      img.onload = () => {
        let w = img.naturalWidth, h = img.naturalHeight, k = 1;
        if (alto && h > alto) k = alto / h;
        if (ancho) k = Math.min(1, ancho / w);
        const cv = document.createElement('canvas');
        cv.width = Math.round(w * k); cv.height = Math.round(h * k);
        cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height);
        cv.toBlob(b => (b ? ok(b) : mal(new Error('No se pudo procesar la foto'))), 'image/webp', 0.8);
        URL.revokeObjectURL(img.src);
      };
      img.onerror = () => mal(new Error('Ese archivo no parece una foto'));
      img.src = URL.createObjectURL(file);
    });
  }

  async function subirFoto(file, carpeta) {
    const cli = exigir();
    const base = `${carpeta}/${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const [grande, chica] = await Promise.all([aWebp(file, 1400), aWebp(file, 0, 520)]);
    const opc = { contentType: 'image/webp', upsert: false, cacheControl: '31536000' };
    let r = await cli.storage.from(C.BUCKET).upload(base + '.webp', grande, opc);
    if (r.error) throw r.error;
    r = await cli.storage.from(C.BUCKET).upload(base + '-m.webp', chica, opc);
    if (r.error) throw r.error;
    return cli.storage.from(C.BUCKET).getPublicUrl(base + '.webp').data.publicUrl;
  }

  /* ---------- Ajustes: fotos de portada y políticas ---------- */
  async function ajustes() {
    let base = {};
    try { base = await (await fetch('data/ajustes.json', { cache: 'no-cache' })).json(); } catch (e) {}
    if (!sb) return base;
    const { data, error } = await sb.from('ajustes').select('clave,valor');
    if (error || !data) return base;
    data.forEach(f => { base[f.clave] = f.valor; });
    return base;
  }
  async function guardarAjuste(clave, valor) {
    const { error } = await exigir().from('ajustes').upsert({ clave, valor });
    if (error) throw error;
  }

  /* ---------- Reseñas (públicas solo las aprobadas) ---------- */
  async function resenasAprobadas() {
    if (!cliente) return [];
    const { data, error } = await cliente.from('resenas').select('id,nombre,producto_id,estrellas,texto,creada')
      .eq('aprobada', true).order('creada', { ascending: false }).limit(40);
    if (error) { console.warn(error); return []; }
    return data;
  }
  async function enviarResena(r) {
    if (!cliente) throw new Error('Sin conexión');
    const { error } = await cliente.from('resenas').insert({ ...r, aprobada: false });
    if (error) throw error;
  }

  /* ---------- Envíos ---------- */
  const COURIERS = [
    { nombre: 'Guatex', url: 'https://guatex.com/' },
    { nombre: 'Forza Delivery', url: 'https://rastreo.forzadelivery.com/' },
    { nombre: 'Cargo Expreso', url: 'https://www.cargoexpreso.com/' },
    { nombre: 'Correos de Guatemala', url: '' },
    { nombre: 'Entrega personal', url: '' }
  ];
  async function verEnvio(codigo) {
    if (!cliente) throw new Error('Sin conexión');
    const { data, error } = await cliente.rpc('ver_envio', { p_codigo: codigo });
    if (error) throw error;
    return data && data[0];
  }

  /* ---------- Solo para el panel: reseñas y envíos ---------- */
  function exigirCliente() {
    if (!cliente) throw new Error('Falta configurar Supabase en js/config.js');
    return cliente;
  }
  async function todasResenas() {
    const { data, error } = await exigirCliente().from('resenas').select('*').order('creada', { ascending: false }).limit(300);
    if (error) throw error;
    return data;
  }
  async function cambiarResena(id, cambios) {
    const { error } = await exigirCliente().from('resenas').update(cambios).eq('id', id);
    if (error) throw error;
  }
  async function borrarResena(id) {
    const { error } = await exigirCliente().from('resenas').delete().eq('id', id);
    if (error) throw error;
  }
  async function listarEnvios() {
    const { data, error } = await exigirCliente().from('envios').select('*').order('creado', { ascending: false }).limit(300);
    if (error) throw error;
    return data;
  }
  async function guardarEnvio(e) {
    const { data, error } = await exigirCliente().from('envios').upsert(e).select().single();
    if (error) throw error;
    return data;
  }
  async function borrarEnvio(codigo) {
    const { error } = await exigirCliente().from('envios').delete().eq('codigo', codigo);
    if (error) throw error;
  }
  function nuevoCodigo() {
    const letras = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // sin 0/O ni 1/I para no confundirse
    const n = crypto.getRandomValues(new Uint8Array(6));
    return 'CP-' + [...n].map(x => letras[x % letras.length]).join('');
  }

  return {
    ajustes, guardarAjuste, resenasAprobadas, enviarResena, COURIERS, verEnvio,
    todasResenas, cambiarResena, borrarResena, listarEnvios, guardarEnvio, borrarEnvio, nuevoCodigo,
    conSupabase, enPrueba, CATEGORIAS, HOJAS, padreDe, nombreCategoria, listar, miniatura, precioFinal, descuento, dinero,
    sesion, entrar, salir, guardar, actualizar, borrar, subirFoto
  };
})();
