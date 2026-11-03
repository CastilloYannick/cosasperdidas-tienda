/*
 * ============================================================
 *  PANEL: ENVÍOS Y RESEÑAS
 *  Pestañas del panel, alta y seguimiento de envíos con número
 *  de guía, y aprobación de reseñas antes de publicarlas.
 * ============================================================
 */
(function () {
  'use strict';

  const $ = s => document.querySelector(s);
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const fecha = iso => new Date(iso).toLocaleDateString('es-GT', { day: 'numeric', month: 'short' });
  const SITIO = 'https://www.cosasperdidas.shop/';
  const OTRA = '__otra';

  let envios = [], resenas = [], editando = null, cargado = false;

  /* ---------- Pestañas ---------- */
  function mostrar(p) {
    document.querySelectorAll('#pestanas [data-pestana]').forEach(b => b.setAttribute('aria-selected', String(b.dataset.pestana === p)));
    document.querySelectorAll('[data-seccion]').forEach(s => { s.hidden = s.dataset.seccion !== p; });
    try { sessionStorage.setItem('cp-pestana', p); } catch (e) {}
  }
  $('#pestanas').addEventListener('click', e => { const b = e.target.closest('[data-pestana]'); if (b) mostrar(b.dataset.pestana); });

  function cerrar(d) {
    if (Efectos.reducido()) { d.close(); return; }
    d.classList.add('cerrando');
    setTimeout(() => { d.classList.remove('cerrando'); d.close(); }, 170);
  }

  async function copiar(txt) {
    try { await navigator.clipboard.writeText(txt); return true; } catch (e) { return false; }
  }

  /* ---------- Envíos ---------- */
  // El estado se deduce solo: sin número de guía = preparando; con guía = ya va con la paquetería
  const conGuia = e => !!(e.guia || '').trim();

  function mensajeCliente(e) {
    return `¡Hola! 💌 Tu pedido de cosas perdidas ya tiene seguimiento.\nSíguelo aquí: ${SITIO}#pedido/${e.codigo}` +
      (e.guia ? `\nNúmero de guía: ${e.guia}${e.courier ? ' (' + e.courier + ')' : ''}` : '');
  }

  function pintarEnvios() {
    if (!envios.length) {
      $('#listaEnvios').innerHTML = '<li class="lista-vacia">Aún no hay envíos. Crea uno cuando despaches un pedido.</li>';
      return;
    }
    $('#listaEnvios').innerHTML = envios.map((e, i) => `<li class="fila fila-envio" style="--i:${i}" data-codigo="${esc(e.codigo)}">
      <div class="env-sello estado-${esc(e.estado)}"><b>${esc(e.codigo.slice(3))}</b><small>${fecha(e.creado)}</small></div>
      <div class="f-info">
        <b>${esc(e.cliente || 'Sin cliente')}</b>
        <span class="f-chips">${esc(e.productos || '—')}</span>
        <span class="f-chips">${e.guia ? `${esc(e.courier || 'Guía')} · ${esc(e.guia)}` : '<span class="etq oculta">Falta número de guía</span>'}</span>
      </div>
      <div class="f-acc">
        <span class="etq ${conGuia(e) ? 'apartado' : ''}">${conGuia(e) ? 'Con ' + esc(e.courier || 'la paquetería') : 'Preparando'}</span>
        <button class="btn-icono suave" type="button" data-copiar aria-label="Copiar mensaje para el cliente" title="Copiar mensaje">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="8" y="8" width="12" height="12" rx="2.5"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/></svg>
        </button>
        <button class="btn-icono suave" type="button" data-editar-envio aria-label="Editar envío" title="Editar">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16v4Z"/><path d="m13.5 6.5 4 4"/></svg>
        </button>
      </div>
    </li>`).join('');
  }

  async function copiarMensaje(e) {
    const ok = await copiar(mensajeCliente(e));
    Efectos.toast(ok ? 'Mensaje copiado. Pégalo en el chat de Instagram del cliente 💌' : 'No pude copiarlo', { error: !ok });
  }

  $('#listaEnvios').addEventListener('click', ev => {
    const fila = ev.target.closest('.fila');
    if (!fila) return;
    const e = envios.find(x => x.codigo === fila.dataset.codigo);
    if (ev.target.closest('[data-copiar]')) copiarMensaje(e);
    if (ev.target.closest('[data-editar-envio]')) abrirEnvio(e);
  });

  /* Editor de envío */
  const fE = $('#formEnvio'), dE = $('#dlgEnvio');
  $('#envCourier').innerHTML = Datos.COURIERS.map(c => `<option value="${esc(c.nombre)}">${esc(c.nombre)}</option>`).join('') +
    `<option value="${OTRA}">Otra…</option>`;

  fE.courier.addEventListener('change', () => {
    if (fE.courier.value === OTRA) {
      const n = prompt('¿Cómo se llama la paquetería?');
      if (n && n.trim()) {
        const o = new Option(n.trim(), n.trim(), true, true);
        fE.courier.add(o, fE.courier.options.length - 1);
      } else fE.courier.selectedIndex = 0;
    }
    const c = Datos.COURIERS.find(x => x.nombre === fE.courier.value);
    fE.courier_url.value = c ? c.url : '';
  });

  function abrirEnvio(e) {
    editando = e;
    fE.reset();
    const codigo = e ? e.codigo : Datos.nuevoCodigo();
    fE.dataset.codigo = codigo;
    $('#envCodigo').textContent = codigo;
    $('#envTitulo').textContent = e ? 'Editar envío' : 'Nuevo envío';
    $('#envBorrar').hidden = !e;
    if (e && e.courier && ![...fE.courier.options].some(o => o.value === e.courier)) {
      fE.courier.add(new Option(e.courier, e.courier), fE.courier.options.length - 1);
    }
    fE.cliente.value = e?.cliente || '';
    fE.productos.value = e?.productos || '';
    fE.courier.value = e?.courier || Datos.COURIERS[0].nombre;
    fE.guia.value = e?.guia || '';
    fE.courier_url.value = e ? (e.courier_url || '') : Datos.COURIERS[0].url;
    fE.notas.value = e?.notas || '';
    dE.showModal();
  }
  $('#btnNuevoEnvio').addEventListener('click', () => abrirEnvio(null));
  dE.addEventListener('click', ev => { if (ev.target.closest('[data-cerrar]')) cerrar(dE); });
  dE.addEventListener('cancel', ev => { ev.preventDefault(); cerrar(dE); });

  fE.addEventListener('submit', async ev => {
    ev.preventDefault();
    const guia = fE.guia.value.trim();
    const estado = guia ? 'enviado' : 'confirmado';
    const fechas = { ...(editando?.fechas || {}) };
    if (!fechas.confirmado) fechas.confirmado = new Date().toISOString();
    if (guia && !fechas.enviado) fechas.enviado = new Date().toISOString();
    const datos = {
      codigo: fE.dataset.codigo,
      cliente: fE.cliente.value.trim(),
      productos: fE.productos.value.trim(),
      courier: fE.courier.value === OTRA ? '' : fE.courier.value,
      courier_url: fE.courier_url.value.trim(),
      guia,
      estado, fechas,
      notas: fE.notas.value.trim()
    };
    const b = $('#envGuardar');
    b.disabled = true; b.textContent = 'Guardando…';
    try {
      const guardado = await Datos.guardarEnvio(datos);
      cerrar(dE);
      await cargarEnvios();
      Efectos.toast(editando ? 'Envío actualizado' : `Envío ${datos.codigo} creado`, { accion: { texto: 'Copiar mensaje', fn: () => copiarMensaje(guardado) } });
    } catch (err) {
      console.error(err);
      Efectos.toast('No se pudo guardar el envío', { error: true });
    } finally {
      b.disabled = false; b.textContent = 'Guardar';
    }
  });

  $('#envBorrar').addEventListener('click', async () => {
    if (!editando || !confirm(`¿Eliminar el envío ${editando.codigo}? El enlace del cliente dejará de funcionar.`)) return;
    try {
      await Datos.borrarEnvio(editando.codigo);
      cerrar(dE);
      await cargarEnvios();
      Efectos.toast('Envío eliminado');
    } catch (err) { Efectos.toast('No se pudo eliminar', { error: true }); }
  });

  async function cargarEnvios() {
    try { envios = await Datos.listarEnvios(); } catch (e) { envios = []; }
    pintarEnvios();
  }

  /* ---------- Reseñas ---------- */
  const estrellas = n => '★'.repeat(n) + '☆'.repeat(5 - n);

  function pintarResenas() {
    const pend = resenas.filter(r => !r.aprobada).length;
    const ins = $('#nPendientes');
    ins.hidden = !pend; ins.textContent = pend;
    if (!resenas.length) {
      $('#listaResenas').innerHTML = '<li class="lista-vacia">Todavía no hay reseñas. Cuando alguien deje una, aparece aquí para que la apruebes.</li>';
      return;
    }
    const orden = resenas.slice().sort((a, b) => a.aprobada - b.aprobada);
    $('#listaResenas').innerHTML = orden.map((r, i) => `<li class="fila fila-resena${r.aprobada ? '' : ' pendiente'}" style="--i:${i}" data-id="${esc(r.id)}">
      <div class="f-info">
        <span class="res-estrellas" aria-label="${r.estrellas} de 5">${estrellas(r.estrellas)}</span>
        <p class="res-txt">“${esc(r.texto)}”</p>
        <span class="f-chips"><b>${esc(r.nombre)}</b> · ${fecha(r.creada)} ${r.aprobada ? '<span class="etq apartado">Publicada</span>' : '<span class="etq oferta">Pendiente</span>'}</span>
      </div>
      <div class="f-acc">
        ${r.aprobada
          ? '<button class="btn btn-sec chico" type="button" data-ocultar>Ocultar</button>'
          : '<button class="btn btn-prim chico" type="button" data-aprobar>✓ Aprobar</button>'}
        <button class="btn-icono suave" type="button" data-borrar-resena aria-label="Borrar reseña" title="Borrar">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M4 7h16M9 7V5h6v2M6.5 7l1 12.5h9l1-12.5"/></svg>
        </button>
      </div>
    </li>`).join('');
  }

  $('#listaResenas').addEventListener('click', async ev => {
    const fila = ev.target.closest('.fila');
    if (!fila) return;
    const r = resenas.find(x => x.id === fila.dataset.id);
    try {
      if (ev.target.closest('[data-aprobar]') || ev.target.closest('[data-ocultar]')) {
        const aprobada = !!ev.target.closest('[data-aprobar]');
        await Datos.cambiarResena(r.id, { aprobada });
        r.aprobada = aprobada;
        pintarResenas();
        Efectos.toast(aprobada ? 'Reseña publicada en la tienda' : 'Reseña ocultada');
      } else if (ev.target.closest('[data-borrar-resena]')) {
        if (!confirm('¿Borrar esta reseña para siempre?')) return;
        await Datos.borrarResena(r.id);
        resenas = resenas.filter(x => x !== r);
        pintarResenas();
        Efectos.toast('Reseña borrada');
      }
    } catch (err) {
      Efectos.toast('No se pudo guardar. Revisa tu conexión.', { error: true });
    }
  });

  async function cargarResenas() {
    try { resenas = await Datos.todasResenas(); } catch (e) { resenas = []; }
    pintarResenas();
  }

  /* ---------- Arranque al entrar al panel ---------- */
  function arrancar() {
    if (cargado) return;
    cargado = true;
    let p = 'productos';
    try { p = sessionStorage.getItem('cp-pestana') || p; } catch (e) {}
    mostrar(p);
    cargarEnvios();
    cargarResenas();
  }
  document.addEventListener('cp:panel', arrancar);
  // El panel pudo abrirse antes de que cargara este archivo
  if (!$('#vistaPanel').hidden) arrancar();
})();
