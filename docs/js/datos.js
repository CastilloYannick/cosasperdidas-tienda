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
  const conSupabase = !!(C.SUPABASE_URL && C.SUPABASE_ANON_KEY && window.supabase);
  const sb = conSupabase ? window.supabase.createClient(C.SUPABASE_URL, C.SUPABASE_ANON_KEY) : null;

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

  return {
    conSupabase, listar, miniatura, precioFinal, descuento, dinero,
    sesion, entrar, salir, guardar, actualizar, borrar, subirFoto
  };
})();
