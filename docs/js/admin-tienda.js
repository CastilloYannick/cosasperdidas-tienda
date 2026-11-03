/*
 * ============================================================
 *  PANEL: PESTAÑA "TIENDA"
 *  Fotos que flotan en la portada (de productos o subidas) y
 *  textos de políticas de compra, envío y devoluciones.
 * ============================================================
 */
(function () {
  'use strict';

  const $ = s => document.querySelector(s);
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  let fotos = [], slot = 0, cargado = false;

  function pintarSlots() {
    $('#portadaSlots').innerHTML = [0, 1, 2].map(i => `<button class="slot" type="button" data-slot="${i}" aria-label="Cambiar foto ${i + 1}">
      ${fotos[i] ? `<img src="${esc(Datos.miniatura(fotos[i]))}" alt="">` : ''}<span>Foto ${i + 1}</span></button>`).join('');
  }

  async function abrirGaleria(i) {
    slot = i;
    const productos = await Datos.listar();
    const todas = productos.flatMap(p => (p.fotos || []).map(f => ({ f, n: p.nombre })));
    $('#galeriaFotos').innerHTML = todas.map(({ f, n }) =>
      `<button type="button" data-foto="${esc(f)}" title="${esc(n)}"><img src="${esc(Datos.miniatura(f))}" alt="${esc(n)}" loading="lazy"></button>`).join('');
    $('#dlgElegirFoto').showModal();
  }

  function elegir(url) {
    fotos[slot] = url;
    pintarSlots();
    $('#dlgElegirFoto').close();
  }

  $('#portadaSlots').addEventListener('click', e => { const b = e.target.closest('[data-slot]'); if (b) abrirGaleria(+b.dataset.slot); });
  $('#galeriaFotos').addEventListener('click', e => { const b = e.target.closest('[data-foto]'); if (b) elegir(b.dataset.foto); });
  $('#dlgElegirFoto').addEventListener('click', e => { if (e.target.closest('[data-cerrar]')) $('#dlgElegirFoto').close(); });
  $('#subirPortada').addEventListener('change', async e => {
    const f = e.target.files[0];
    e.target.value = '';
    if (!f) return;
    try {
      Efectos.toast('Subiendo foto…');
      elegir(await Datos.subirFoto(f, 'portada'));
    } catch (err) {
      Efectos.toast('No se pudo subir la foto', { error: true });
    }
  });

  $('#guardarPortada').addEventListener('click', async () => {
    try {
      await Datos.guardarAjuste('portada', { fotos: fotos.filter(Boolean).slice(0, 3) });
      Efectos.toast('¡Portada actualizada! 🌸');
    } catch (err) {
      Efectos.toast('No se pudo guardar. Revisa tu conexión.', { error: true });
    }
  });

  $('#formPoliticas').addEventListener('submit', async e => {
    e.preventDefault();
    const f = e.target;
    try {
      await Datos.guardarAjuste('politicas', { compra: f.compra.value.trim(), envio: f.envio.value.trim(), devoluciones: f.devoluciones.value.trim() });
      Efectos.toast('Políticas guardadas');
    } catch (err) {
      Efectos.toast('No se pudo guardar. Revisa tu conexión.', { error: true });
    }
  });

  async function arrancar() {
    if (cargado) return;
    cargado = true;
    const a = await Datos.ajustes();
    fotos = ((a.portada && a.portada.fotos) || []).slice(0, 3);
    pintarSlots();
    const p = a.politicas || {}, f = $('#formPoliticas');
    f.compra.value = p.compra || '';
    f.envio.value = p.envio || '';
    f.devoluciones.value = p.devoluciones || '';
  }
  document.addEventListener('cp:panel', arrancar);
  if (!$('#vistaPanel').hidden) arrancar();
})();
