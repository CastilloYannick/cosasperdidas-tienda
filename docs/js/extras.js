/*
 * ============================================================
 *  RESEÑAS Y "SIGUE TU PEDIDO"
 *  Las reseñas entran como pendientes y solo se muestran cuando
 *  se aprueban en el panel. El seguimiento busca un envío por su
 *  código (CP-XXXXXX) sin mostrar datos del cliente.
 * ============================================================
 */
(function () {
  'use strict';

  const $ = s => document.querySelector(s);
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const estrellasHtml = n => '<span class="estrellas" aria-label="' + n + ' de 5 estrellas">' +
    [1, 2, 3, 4, 5].map(i => `<i class="${i <= n ? 'llena' : ''}"></i>`).join('') + '</span>';
  const fecha = iso => new Date(iso).toLocaleDateString('es-GT', { day: 'numeric', month: 'short', year: 'numeric' });

  let productos = [];
  let resenas = [];

  function cerrar(d) {
    if (!d.open) return;
    if (Efectos.reducido()) { d.close(); return; }
    d.classList.add('cerrando');
    setTimeout(() => { d.classList.remove('cerrando'); d.close(); }, 170);
  }
  function conectarDialogo(d) {
    d.addEventListener('click', e => { if (e.target === d || e.target.closest('[data-cerrar]')) cerrar(d); });
    d.addEventListener('cancel', e => { e.preventDefault(); cerrar(d); });
  }

  /* ---------- Reseñas ---------- */
  function pintarResenas() {
    const cont = $('#listaResenas');
    if (!resenas.length) {
      $('#resumenResenas').innerHTML = '';
      cont.innerHTML = '<p class="res-vacio">Todavía no hay reseñas. ¿Ya tienes algo de cosas perdidas? Sé la primera persona en contarme qué te pareció 💌</p>';
      return;
    }
    const prom = resenas.reduce((s, r) => s + r.estrellas, 0) / resenas.length;
    $('#resumenResenas').innerHTML = `${estrellasHtml(Math.round(prom))}<b>${prom.toFixed(1)}</b><span>· ${resenas.length} ${resenas.length === 1 ? 'reseña' : 'reseñas'}</span>`;
    const nombreProd = id => (productos.find(p => p.id === id) || {}).nombre;
    cont.innerHTML = resenas.map((r, i) => `<article class="res-tarjeta" style="--i:${i}">
      ${estrellasHtml(r.estrellas)}
      <p class="res-texto">“${esc(r.texto)}”</p>
      <p class="res-pie"><b>${esc(r.nombre)}</b>${nombreProd(r.producto_id) ? ` · compró ${esc(nombreProd(r.producto_id))}` : ''}<span>${fecha(r.creada)}</span></p>
    </article>`).join('');
  }

  async function cargarResenas() {
    resenas = await Datos.resenasAprobadas();
    pintarResenas();
  }

  function abrirFormResena() {
    const f = $('#formResena');
    f.reset();
    ponerEstrellas(0);
    $('#resProducto').innerHTML = '<option value="">Prefiero no decir</option>' +
      productos.map(p => `<option value="${esc(p.id)}">${esc(p.nombre)}</option>`).join('');
    $('#resCuenta').textContent = '0/500';
    $('#dlgResena').showModal();
  }

  function ponerEstrellas(n) {
    $('#formResena').dataset.estrellas = n;
    document.querySelectorAll('#elegirEstrellas button').forEach(b => {
      const k = +b.dataset.e;
      b.classList.toggle('llena', k <= n);
      b.setAttribute('aria-checked', String(k === n));
    });
  }

  async function enviarResena(e) {
    e.preventDefault();
    const f = e.target;
    if (f.sitio.value) { cerrar($('#dlgResena')); return; } // trampa para bots
    const estrellas = +f.dataset.estrellas;
    if (!estrellas) { Efectos.sacudir($('#elegirEstrellas')); Efectos.toast('Elige de 1 a 5 estrellas', { error: true }); return; }
    const b = f.querySelector('[type=submit]');
    b.disabled = true; b.textContent = 'Enviando…';
    try {
      await Datos.enviarResena({
        nombre: f.nombre.value.trim().slice(0, 40),
        producto_id: f.producto.value || null,
        estrellas,
        texto: f.texto.value.trim().slice(0, 500)
      });
      cerrar($('#dlgResena'));
      Efectos.toast('¡Gracias! La reviso y la publico muy pronto 💌', { duracion: 6000 });
    } catch (err) {
      console.error(err);
      Efectos.toast('No pude recibir tu reseña. Intenta de nuevo en un rato.', { error: true });
    } finally {
      b.disabled = false; b.textContent = 'Enviar reseña';
    }
  }

  /* ---------- Sigue tu pedido ---------- */
  function abrirSeguimiento(codigo) {
    const d = $('#dlgSeguir');
    $('#seguirCodigo').value = codigo || '';
    $('#seguirResultado').innerHTML = '';
    if (!d.open) d.showModal();
    if (codigo) buscarEnvio(codigo);
    else setTimeout(() => $('#seguirCodigo').focus(), 60);
  }

  async function buscarEnvio(codigo) {
    const res = $('#seguirResultado');
    codigo = String(codigo || '').trim().toUpperCase().replace(/^CP-?/, 'CP-');
    $('#seguirCodigo').value = codigo;
    if (!/^CP-[A-Z0-9]{6}$/.test(codigo)) {
      res.innerHTML = '<p class="seg-aviso">El código tiene esta forma: <b>CP-</b> y 6 letras o números. Lo encuentras en el mensaje que te envié.</p>';
      return;
    }
    res.innerHTML = '<p class="seg-aviso">Buscando tu pedido…</p>';
    let e;
    try { e = await Datos.verEnvio(codigo); } catch (err) {
      res.innerHTML = '<p class="seg-aviso">No pude consultar ahora. Revisa tu conexión e intenta otra vez.</p>';
      return;
    }
    if (!e) {
      res.innerHTML = `<p class="seg-aviso">No encuentro el pedido <b>${esc(codigo)}</b>. Revisa que el código esté bien escrito o escríbeme por Instagram.</p>`;
      return;
    }
    const fechas = e.fechas || {};
    const despachado = !!e.guia;
    const pasos = [
      { nombre: 'Pedido confirmado', fecha: fechas.confirmado },
      { nombre: e.courier ? `Ya va con ${e.courier}` : 'Entregado a la paquetería', fecha: fechas.enviado },
      { nombre: 'En camino a ti', fecha: null }
    ];
    const idx = despachado ? 2 : 0;
    res.innerHTML = `<div class="seg-cabeza"><span>Pedido</span><b>${esc(e.codigo)}</b></div>
      ${e.productos ? `<p class="seg-prod">${esc(e.productos)}</p>` : ''}
      ${despachado ? '' : '<p class="seg-prep">Estoy preparando tu pedido con mucho cariño. En cuanto lo entregue a la paquetería, aquí aparece tu número de guía 💌</p>'}
      <ol class="linea">${pasos.map((s, i) => `<li class="${i < idx ? 'hecho' : i === idx ? 'actual' : ''}" style="--i:${i}">
        <span class="punto"></span><b>${esc(s.nombre)}</b>${s.fecha && i <= idx ? `<small>${fecha(s.fecha)}</small>` : ''}</li>`).join('')}</ol>
      ${e.guia ? `<div class="seg-guia">
        <div><span>Número de guía${e.courier ? ' · ' + esc(e.courier) : ''}</span><b id="numGuia">${esc(e.guia)}</b></div>
        <button class="btn-texto" type="button" id="copiarGuia">Copiar</button>
      </div>` : ''}
      ${e.guia && e.courier_url ? `<a class="btn btn-prim seg-rastrear" href="${esc(e.courier_url)}" target="_blank" rel="noopener">Rastrear en ${esc(e.courier || 'la paquetería')}</a>
        <p class="seg-nota">Pega tu número de guía en la página de ${esc(e.courier || 'la paquetería')}.</p>` : ''}`;
    history.replaceState(null, '', '#pedido/' + e.codigo);
  }

  async function copiarTexto(txt) {
    try { await navigator.clipboard.writeText(txt); return true; } catch (e) { return false; }
  }

  /* ---------- Ajustes: portada y políticas ---------- */
  async function aplicarAjustes() {
    const a = await Datos.ajustes();
    const fotos = (a.portada && a.portada.fotos) || [];
    document.querySelectorAll('.collage img').forEach((img, i) => {
      if (fotos[i]) img.src = Datos.miniatura(fotos[i]);
    });
    const p = a.politicas || {};
    $('#polCompra').textContent = p.compra || '';
    $('#polEnvio').textContent = p.envio || '';
    $('#polDevoluciones').textContent = p.devoluciones || '';
  }

  /* ---------- Eventos ---------- */
  function conectar() {
    conectarDialogo($('#dlgResena'));
    conectarDialogo($('#dlgSeguir'));
    conectarDialogo($('#dlgPoliticas'));
    $('#dlgSeguir').addEventListener('close', () => { if (location.hash.startsWith('#pedido')) history.replaceState(null, '', location.pathname); });
    $('#btnResena').addEventListener('click', abrirFormResena);
    $('#elegirEstrellas').addEventListener('click', e => { const b = e.target.closest('[data-e]'); if (b) ponerEstrellas(+b.dataset.e); });
    $('#formResena').addEventListener('submit', enviarResena);
    $('#formResena').texto.addEventListener('input', e => { $('#resCuenta').textContent = `${e.target.value.length}/500`; });
    document.addEventListener('click', e => {
      if (e.target.closest('[data-seguir]')) { e.preventDefault(); abrirSeguimiento(); }
      if (e.target.closest('[data-politicas]')) { e.preventDefault(); $('#dlgPoliticas').showModal(); }
    });
    $('#formSeguir').addEventListener('submit', e => { e.preventDefault(); buscarEnvio($('#seguirCodigo').value); });
    $('#seguirResultado').addEventListener('click', async e => {
      if (e.target.closest('#copiarGuia')) {
        const ok = await copiarTexto($('#numGuia').textContent);
        Efectos.toast(ok ? 'Número de guía copiado' : 'No pude copiarlo, selecciónalo y cópialo', { error: !ok });
      }
    });
    const porHash = () => { const m = location.hash.match(/^#pedido\/(.+)$/); if (m) abrirSeguimiento(decodeURIComponent(m[1])); };
    window.addEventListener('hashchange', porHash);
    porHash();
  }

  document.addEventListener('cp:productos', e => { productos = e.detail || []; pintarResenas(); });
  conectar();
  cargarResenas();
  aplicarAjustes();
})();
