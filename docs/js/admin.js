/*
 * ============================================================
 *  PANEL DE ADMINISTRACIÓN
 *  Entrar con correo y contraseña (Supabase Auth), cambiar el
 *  estado de cada producto, poner descuentos, reordenar, crear
 *  productos nuevos y subir sus fotos.
 * ============================================================
 */
(function () {
  'use strict';

  const $ = s => document.querySelector(s);
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const ESTADOS = { disponible: 'Disponible', apartado: 'Apartado', vendido: 'Vendido' };

  let productos = [];
  let ver = 'todos', texto = '', verCat = '';
  let editando = null, fotosEd = [], subiendo = 0;

  const numero = v => (v === '' || v == null ? null : Math.max(0, Math.round(Number(v))));
  const slug = s => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 48);

  /* ---------- Sesión ---------- */
  async function iniciar() {
    // Opciones de categoría (agrupadas como en el menú de la tienda)
    const opciones = Datos.CATEGORIAS.map(c => c.subs
      ? `<optgroup label="${esc(c.nombre)}">${c.subs.map(s => `<option value="${s.id}">${esc(Datos.nombreCategoria(s.id))}</option>`).join('')}</optgroup>`
      : `<option value="${c.id}">${esc(c.nombre)}</option>`).join('');
    $('#edCategoria').innerHTML = opciones;
    $('#verCategoria').insertAdjacentHTML('beforeend', opciones);
    if (Datos.enPrueba) {
      $('#avisoPrueba').hidden = false;
      entrarAlPanel();
      return;
    }
    if (!Datos.conSupabase) {
      $('#avisoConfig').hidden = false;
      $('#vistaEntrada').hidden = false;
      $('#formEntrada button').disabled = true;
      return;
    }
    const s = await Datos.sesion();
    if (s) entrarAlPanel(); else $('#vistaEntrada').hidden = false;
  }

  $('#formEntrada').addEventListener('submit', async e => {
    e.preventDefault();
    const f = e.target, b = f.querySelector('button');
    b.disabled = true; b.textContent = 'Entrando…';
    const { error } = await Datos.entrar(f.email.value.trim(), f.password.value);
    b.disabled = false; b.textContent = 'Entrar';
    if (error) { Efectos.sacudir(f); Efectos.toast('Correo o contraseña incorrectos', { error: true }); return; }
    f.reset();
    entrarAlPanel();
  });

  $('#btnSalir').addEventListener('click', async () => {
    await Datos.salir();
    location.reload();
  });

  async function entrarAlPanel() {
    $('#vistaEntrada').hidden = true;
    $('#vistaPanel').hidden = false;
    $('#btnSalir').hidden = false;
    await recargar();
  }

  async function recargar() {
    productos = await Datos.listar();
    pintar();
  }

  /* ---------- Lista ---------- */
  function pintarResumen() {
    const n = e => productos.filter(p => p.estado === e).length;
    Efectos.contar($('#nDisp'), n('disponible'), 500);
    Efectos.contar($('#nApart'), n('apartado'), 500);
    Efectos.contar($('#nVend'), n('vendido'), 500);
  }

  function pintar() {
    pintarResumen();
    const q = texto.toLowerCase();
    const l = productos.filter(p => (ver === 'todos' || p.estado === ver) && (!verCat || (p.categoria || 'casuales') === verCat) &&
      (!q || `${p.nombre} ${p.marca}`.toLowerCase().includes(q)));
    if (!l.length) {
      $('#lista').innerHTML = `<li class="lista-vacia">${productos.length ? 'Nada coincide con ese filtro.' : 'Aún no hay productos. Crea el primero con “Nuevo producto”.'}</li>`;
      return;
    }
    const ordenables = ver === 'todos' && !q && !verCat;
    $('#lista').innerHTML = l.map((p, i) => {
      const pct = Datos.descuento(p);
      const final = Datos.precioFinal(p);
      return `<li class="fila${p.visible === false ? ' oculto' : ''}" style="--i:${i}" data-id="${esc(p.id)}">
        ${p.fotos && p.fotos[0] ? `<img src="${esc(Datos.miniatura(p.fotos[0]))}" alt="" loading="lazy">` : '<span class="sin-foto"></span>'}
        <div class="f-info">
          <b>${esc(p.emoji ? p.emoji + ' ' : '')}${esc(p.nombre)}</b>
          <span class="precio">${final == null ? 'Sin precio' : pct ? `<span class="rebajado">${Datos.dinero(final)}</span><s>${Datos.dinero(p.precio)}</s>` : Datos.dinero(final)}</span>
          <span class="f-chips">${esc([p.marca, Datos.nombreCategoria(p.categoria || 'casuales')].filter(Boolean).join(' · '))}${pct ? ` <span class="etq oferta">-${pct}%</span>` : ''}${p.visible === false ? ' <span class="etq oculta">Oculto</span>' : ''}</span>
        </div>
        <div class="f-acc">
          <select class="f-estado ${esc(p.estado)}" data-estado aria-label="Estado de ${esc(p.nombre)}">
            ${Object.entries(ESTADOS).map(([k, v]) => `<option value="${k}"${k === p.estado ? ' selected' : ''}>${v}</option>`).join('')}
          </select>
          <button class="btn-icono suave" type="button" data-editar aria-label="Editar ${esc(p.nombre)}" title="Editar">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16v4Z"/><path d="m13.5 6.5 4 4"/></svg>
          </button>
          ${ordenables ? `<div class="mover">
            <button type="button" data-mover="-1" aria-label="Subir" ${i === 0 ? 'disabled' : ''}><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="m6 15 6-6 6 6"/></svg></button>
            <button type="button" data-mover="1" aria-label="Bajar" ${i === l.length - 1 ? 'disabled' : ''}><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg></button>
          </div>` : ''}
        </div>
      </li>`;
    }).join('');
  }

  async function cambiarEstado(p, estado) {
    const antes = p.estado;
    p.estado = estado;
    pintar();
    try {
      await Datos.actualizar(p.id, { estado });
      Efectos.toast(`${p.nombre}: ${ESTADOS[estado].toLowerCase()}`, {
        accion: { texto: 'Deshacer', fn: () => cambiarEstado(p, antes) }
      });
    } catch (e) {
      p.estado = antes; pintar();
      Efectos.toast('No se pudo guardar. Revisa tu conexión.', { error: true });
    }
  }

  async function mover(p, k) {
    const i = productos.indexOf(p), j = i + k;
    if (j < 0 || j >= productos.length) return;
    [productos[i], productos[j]] = [productos[j], productos[i]];
    productos.forEach((x, n) => { x.orden = n + 1; });
    pintar();
    try {
      await Promise.all([productos[i], productos[j]].map(x => Datos.actualizar(x.id, { orden: x.orden })));
    } catch (e) {
      Efectos.toast('No se pudo guardar el orden', { error: true });
      recargar();
    }
  }

  $('#lista').addEventListener('change', e => {
    const s = e.target.closest('[data-estado]');
    if (!s) return;
    const p = productos.find(x => x.id === s.closest('.fila').dataset.id);
    cambiarEstado(p, s.value);
  });
  $('#lista').addEventListener('click', e => {
    const fila = e.target.closest('.fila');
    if (!fila) return;
    const p = productos.find(x => x.id === fila.dataset.id);
    if (e.target.closest('[data-editar]') || e.target.closest('img')) abrirEditor(p);
    const m = e.target.closest('[data-mover]');
    if (m) mover(p, +m.dataset.mover);
  });
  $('#buscar').addEventListener('input', e => { texto = e.target.value.trim(); pintar(); });
  $('#verCategoria').addEventListener('change', e => { verCat = e.target.value; pintar(); });
  $('#verEstado').addEventListener('click', e => {
    const b = e.target.closest('[data-v]');
    if (!b) return;
    ver = b.dataset.v;
    document.querySelectorAll('#verEstado button').forEach(x => x.setAttribute('aria-pressed', String(x === b)));
    pintar();
  });
  $('#btnNuevo').addEventListener('click', () => abrirEditor(null));

  /* ---------- Editor ---------- */
  const form = $('#formEd'), dlg = $('#editor');

  function abrirEditor(p) {
    editando = p;
    form.reset();
    $('#edTitulo').textContent = p ? 'Editar producto' : 'Nuevo producto';
    $('#edBorrar').hidden = !p;
    form.nombre.value = p?.nombre || '';
    form.marca.value = p?.marca || '';
    form.categoria.value = p?.categoria || (verCat || 'casuales');
    form.emoji.value = p?.emoji || '';
    form.descripcion.value = p?.descripcion || '';
    form.precio.value = p?.precio ?? '';
    form.precio_oferta.value = p?.precio_oferta ?? '';
    form.talla.value = p?.talla || '';
    form.visible.checked = p ? p.visible !== false : true;
    ponerEstado(p?.estado || 'disponible');
    fotosEd = (p?.fotos || []).map(url => ({ url }));
    pintarFotos();
    marcarPct();
    dlg.showModal();
    if (!p) setTimeout(() => form.nombre.focus(), 50);
  }

  function cerrarEditor() {
    if (Efectos.reducido()) { dlg.close(); return; }
    dlg.classList.add('cerrando');
    setTimeout(() => { dlg.classList.remove('cerrando'); dlg.close(); }, 170);
  }

  function ponerEstado(e) {
    form.dataset.estado = e;
    document.querySelectorAll('#edEstado button').forEach(b => b.setAttribute('aria-checked', String(b.dataset.e === e)));
  }
  $('#edEstado').addEventListener('click', e => { const b = e.target.closest('[data-e]'); if (b) ponerEstado(b.dataset.e); });

  // Botones rápidos de descuento: calculan el precio rebajado
  function marcarPct() {
    const pr = numero(form.precio.value), of = numero(form.precio_oferta.value);
    const pct = pr && of != null && of < pr ? Math.round((1 - of / pr) * 100) : 0;
    document.querySelectorAll('#edPct button').forEach(b => b.setAttribute('aria-pressed', String(+b.dataset.pct === pct)));
  }
  $('#edPct').addEventListener('click', e => {
    const b = e.target.closest('[data-pct]');
    if (!b) return;
    const pr = numero(form.precio.value), pct = +b.dataset.pct;
    if (!pct) form.precio_oferta.value = '';
    else if (!pr) { Efectos.toast('Primero escribe el precio', { error: true }); form.precio.focus(); return; }
    else form.precio_oferta.value = Math.round(pr * (1 - pct / 100));
    marcarPct();
  });
  form.precio.addEventListener('input', marcarPct);
  form.precio_oferta.addEventListener('input', marcarPct);

  /* Fotos: subir, reordenar (la primera es la portada) y quitar */
  function pintarFotos() {
    $('#edFotos').innerHTML = fotosEd.map((f, i) => `<li class="foto${f.subiendo ? ' subiendo' : ''}">
      <img src="${esc(f.vista || Datos.miniatura(f.url))}" alt="Foto ${i + 1}">
      ${f.subiendo ? '' : `<div class="acc">
        <button type="button" data-izq="${i}" aria-label="Mover a la izquierda" ${i === 0 ? 'style="visibility:hidden"' : ''}>‹</button>
        <button type="button" data-quitar="${i}" aria-label="Quitar foto">✕</button>
      </div>`}</li>`).join('');
  }
  $('#edFotos').addEventListener('click', e => {
    const q = e.target.closest('[data-quitar]'), iz = e.target.closest('[data-izq]');
    if (q) { fotosEd.splice(+q.dataset.quitar, 1); pintarFotos(); }
    if (iz) { const i = +iz.dataset.izq; [fotosEd[i - 1], fotosEd[i]] = [fotosEd[i], fotosEd[i - 1]]; pintarFotos(); }
  });

  async function subir(archivos) {
    const carpeta = slug(form.nombre.value) || 'producto';
    for (const file of archivos) {
      if (!file.type.startsWith('image/')) continue;
      const f = { vista: URL.createObjectURL(file), subiendo: true };
      fotosEd.push(f);
      pintarFotos();
      subiendo++;
      try {
        f.url = await Datos.subirFoto(file, carpeta);
        f.subiendo = false;
      } catch (err) {
        console.error(err);
        fotosEd.splice(fotosEd.indexOf(f), 1);
        Efectos.toast(`No se pudo subir ${file.name}`, { error: true });
      }
      subiendo--;
      pintarFotos();
    }
  }
  $('#edArchivos').addEventListener('change', e => { subir([...e.target.files]); e.target.value = ''; });
  const zona = $('#soltar');
  ['dragenter', 'dragover'].forEach(t => zona.addEventListener(t, e => { e.preventDefault(); zona.classList.add('encima'); }));
  ['dragleave', 'drop'].forEach(t => zona.addEventListener(t, () => zona.classList.remove('encima')));
  zona.addEventListener('drop', e => { e.preventDefault(); subir([...e.dataTransfer.files]); });

  dlg.addEventListener('click', e => { if (e.target.closest('[data-cerrar]')) cerrarEditor(); });
  dlg.addEventListener('cancel', e => { e.preventDefault(); cerrarEditor(); });

  form.addEventListener('submit', async e => {
    e.preventDefault();
    if (subiendo) { Efectos.toast('Espera a que terminen de subir las fotos'); return; }
    const precio = numero(form.precio.value);
    let oferta = numero(form.precio_oferta.value);
    if (oferta != null && precio != null && oferta >= precio) oferta = null;
    const datos = {
      nombre: form.nombre.value.trim(),
      marca: form.marca.value.trim() || 'Otros',
      categoria: form.categoria.value,
      emoji: form.emoji.value.trim(),
      descripcion: form.descripcion.value.trim(),
      precio, precio_oferta: oferta,
      talla: form.talla.value.trim(),
      estado: form.dataset.estado || 'disponible',
      visible: form.visible.checked,
      fotos: fotosEd.filter(f => f.url).map(f => f.url)
    };
    if (!datos.nombre) { form.nombre.focus(); return; }
    if (editando) datos.id = editando.id;
    else {
      datos.id = `${slug(datos.nombre) || 'producto'}-${Math.random().toString(36).slice(2, 6)}`;
      datos.orden = 0; // los nuevos aparecen primero
    }
    const b = $('#edGuardar');
    b.disabled = true; b.textContent = 'Guardando…';
    try {
      await Datos.guardar(datos);
      cerrarEditor();
      Efectos.toast(editando ? 'Cambios guardados' : `¡${datos.nombre} ya está en la tienda!`);
      await recargar();
    } catch (err) {
      console.error(err);
      Efectos.toast('No se pudo guardar. Revisa tu conexión.', { error: true });
    } finally {
      b.disabled = false; b.textContent = 'Guardar';
    }
  });

  $('#edBorrar').addEventListener('click', async () => {
    if (!editando) return;
    if (!confirm(`¿Eliminar “${editando.nombre}” para siempre? Si solo se vendió, mejor márcalo como Vendido.`)) return;
    try {
      await Datos.borrar(editando.id);
      cerrarEditor();
      Efectos.toast('Producto eliminado');
      await recargar();
    } catch (err) {
      Efectos.toast('No se pudo eliminar', { error: true });
    }
  });

  iniciar();
})();
