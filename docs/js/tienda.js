/*
 * ============================================================
 *  TIENDA
 *  Catálogo con filtros, ficha con galería, visor a pantalla
 *  completa, carrito guardado en el navegador y pedido por
 *  Instagram (copia el mensaje y abre el chat).
 * ============================================================
 */
(function () {
  'use strict';

  const C = window.CP_CONFIG;
  const $ = s => document.querySelector(s);
  const CLAVE_CARRITO = 'cp-carrito';
  const CHAT_IG = `https://ig.me/m/${C.INSTAGRAM_USUARIO}`;

  let productos = [];
  let filtro = { cat: 'todo', marca: '', soloDisp: false, orden: 'destacados' };
  let vista = leer('cp-vista') || 'cuadricula';
  let carrito = leerCarrito();
  let actual = null, fotoIdx = 0;

  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const porId = id => productos.find(p => p.id === id);
  const vendible = p => p && p.estado === 'disponible';

  /* ---------- Carrito en localStorage (puede fallar en modo privado) ---------- */
  function leer(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }

  function leerCarrito() {
    try { return JSON.parse(localStorage.getItem(CLAVE_CARRITO)) || []; } catch (e) { return []; }
  }
  function guardarCarrito() {
    try { localStorage.setItem(CLAVE_CARRITO, JSON.stringify(carrito)); } catch (e) {}
  }

  /* ---------- Precio ---------- */
  function htmlPrecio(p, clase = 'precio') {
    const final = Datos.precioFinal(p);
    if (final == null) return `<span class="${clase} consulta">Pregunta el precio</span>`;
    const pct = Datos.descuento(p);
    if (!pct) return `<span class="${clase}">${Datos.dinero(p.precio)}</span>`;
    return `<span class="${clase}"><span class="rebajado">${Datos.dinero(final)}</span><s>${Datos.dinero(p.precio)}</s></span>`;
  }

  function etiquetas(p) {
    const e = [];
    if (p.estado === 'vendido') e.push('<span class="etq vendido">Vendido</span>');
    else if (p.estado === 'apartado') e.push('<span class="etq apartado">Apartado</span>');
    const pct = Datos.descuento(p);
    if (pct && p.estado !== 'vendido') e.push(`<span class="etq oferta">-${pct}%</span>`);
    if (p.nuevo && !e.length) e.push('<span class="etq">Nuevo</span>');
    return e.length ? `<div class="etiquetas">${e.join('')}</div>` : '';
  }

  /* ---------- Menú de categorías y filtros ---------- */
  const catDe = p => p.categoria || 'casuales';
  const enCat = (p, cat) => cat === 'todo' || catDe(p) === cat || Datos.padreDe(catDe(p)) === cat;
  const chip = (id, nombre, n, activo) =>
    `<button class="chip" type="button" data-cat="${esc(id)}" aria-pressed="${activo}">${esc(nombre)}${n != null ? `<small>${n}</small>` : ''}</button>`;

  function pintarMenu() {
    const cuenta = cat => productos.filter(p => enCat(p, cat)).length;
    const padre = filtro.cat === 'todo' ? 'todo' : Datos.padreDe(filtro.cat);
    $('#categorias').innerHTML = chip('todo', 'Todo', productos.length, padre === 'todo') +
      Datos.CATEGORIAS.map(c => chip(c.id, c.nombre, cuenta(c.id), padre === c.id)).join('');
    // Subventana: aparece al elegir Ropa o Accesorios
    const c = Datos.CATEGORIAS.find(x => x.id === padre);
    const sub = $('#subcategorias');
    if (c && c.subs && !(c.subs.length === 1 && c.subs[0].id === c.id)) {
      sub.innerHTML = chip(c.id, 'Todo ' + c.nombre.toLowerCase(), null, filtro.cat === c.id) +
        c.subs.map(s => chip(s.id, s.nombre, cuenta(s.id), filtro.cat === s.id)).join('');
      if (sub.hidden) { sub.hidden = false; sub.classList.remove('abre'); void sub.offsetWidth; sub.classList.add('abre'); }
    } else sub.hidden = true;
  }

  function pintarMarcas() {
    const marcas = [...new Set(productos.map(p => p.marca).filter(Boolean))].sort((a, b) => a.localeCompare(b));
    $('#marca').innerHTML = '<option value="">Todas las marcas</option>' + marcas.map(m => `<option>${esc(m)}</option>`).join('');
    $('#marca').hidden = marcas.length < 2;
  }

  function visibles() {
    let l = productos.filter(p => enCat(p, filtro.cat) && (!filtro.marca || p.marca === filtro.marca) && (!filtro.soloDisp || vendible(p)));
    const pf = p => Datos.precioFinal(p) ?? Infinity;
    if (filtro.orden === 'menor') l = l.slice().sort((a, b) => pf(a) - pf(b));
    else if (filtro.orden === 'mayor') l = l.slice().sort((a, b) => (Datos.precioFinal(b) ?? -1) - (Datos.precioFinal(a) ?? -1));
    // Lo vendido siempre al final, para que no estorbe
    return l.slice().sort((a, b) => (a.estado === 'vendido') - (b.estado === 'vendido'));
  }

  function ponerVista(v) {
    vista = v;
    $('#rejilla').classList.toggle('en-lista', v === 'lista');
    document.querySelectorAll('[data-vista]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.vista === v)));
    try { localStorage.setItem('cp-vista', v); } catch (e) {}
  }

  /* ---------- Rejilla ---------- */
  const icoMas = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>';
  const icoListo = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg>';

  function pintarRejilla() {
    const l = visibles();
    if (!l.length) {
      const salud = Datos.padreDe(filtro.cat) === 'salud' ? ' Pronto tendré vitaminas por aquí.' : '';
      $('#rejilla').innerHTML = `<p class="vacio"><b>Aún no encuentro nada para esta sección</b>Estoy buscando piezas nuevas para ti.${salud} Mientras tanto, mira las otras categorías.</p>`;
      return;
    }
    $('#rejilla').innerHTML = l.map((p, i) => {
      const f = p.fotos || [];
      const en = carrito.includes(p.id);
      return `<article class="tarjeta${p.estado === 'vendido' ? ' es-vendido' : ''}" style="--i:${i}" data-id="${esc(p.id)}">
        ${etiquetas(p)}
        <button class="t-foto" type="button" data-abrir aria-label="Ver ${esc(p.nombre)}">
          ${f[0] ? `<img src="${esc(Datos.miniatura(f[0]))}" alt="${esc(p.nombre)}" loading="lazy" decoding="async">` : ''}
          ${f[1] ? `<img class="alt" src="${esc(Datos.miniatura(f[1]))}" alt="" loading="lazy" decoding="async">` : ''}
        </button>
        <div class="t-cuerpo">
          <span class="t-marca">${esc([p.marca, Datos.nombreCategoria(catDe(p))].filter(Boolean).join(' · '))}</span>
          <span class="t-nombre">${esc(p.emoji ? p.emoji + ' ' : '')}${esc(p.nombre)}</span>
          ${p.talla ? `<span class="t-talla">${esc(p.talla)}</span>` : ''}
          <div class="t-pie">
            ${htmlPrecio(p)}
            <button class="t-agregar${en ? ' en' : ''}" type="button" data-agregar ${vendible(p) ? '' : 'disabled'}
              aria-label="${en ? 'Quitar del carrito' : 'Agregar al carrito'}">${en ? icoListo : icoMas}</button>
          </div>
        </div>
      </article>`;
    }).join('');
  }

  function pintarContador() {
    Efectos.contar($('#cuentaDisp'), productos.filter(vendible).length, 900);
  }

  /* ---------- Carrito ---------- */
  function pintarCarrito() {
    carrito = carrito.filter(id => vendible(porId(id)));
    guardarCarrito();
    const n = carrito.length, burbuja = $('#cuentaCarrito');
    burbuja.hidden = !n;
    if (burbuja.textContent !== String(n)) { burbuja.textContent = n; burbuja.style.animation = 'none'; void burbuja.offsetWidth; burbuja.style.animation = ''; }

    const items = carrito.map(porId);
    $('#carLista').innerHTML = items.length ? items.map(p => `<li class="car-item" data-id="${esc(p.id)}">
        <img src="${esc(Datos.miniatura((p.fotos || [])[0]))}" alt="">
        <div><b>${esc(p.nombre)}</b><small>${esc(Datos.dinero(Datos.precioFinal(p)))}</small></div>
        <button class="car-quitar" type="button" data-quitar aria-label="Quitar ${esc(p.nombre)}">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M4 7h16M9 7V5h6v2M6.5 7l1 12.5h9l1-12.5"/></svg>
        </button></li>`).join('')
      : '<li class="car-vacio"><span class="flor"></span><br>Tu carrito está vacío.<br>Agrega los pares que te enamoren.</li>';

    const conPrecio = items.filter(p => Datos.precioFinal(p) != null);
    const total = conPrecio.reduce((s, p) => s + Datos.precioFinal(p), 0);
    $('#carTotal').textContent = Datos.dinero(total) + (conPrecio.length < items.length ? ' +' : '');
    $('#btnPedir').disabled = !items.length;
  }

  function agregar(id, origenImg) {
    const p = porId(id);
    if (!vendible(p)) return;
    if (carrito.includes(id)) { quitar(id); return; }
    carrito.push(id);
    pintarCarrito();
    actualizarBotones(id);
    Efectos.volarAlCarrito(origenImg, $('#btnCarrito'));
    Efectos.toast(`Agregaste ${p.nombre}`, { accion: { texto: 'Ver carrito', fn: abrirCarrito } });
  }

  function quitar(id) {
    const p = porId(id), pos = carrito.indexOf(id);
    if (pos < 0) return;
    carrito.splice(pos, 1);
    pintarCarrito();
    actualizarBotones(id);
    Efectos.toast(`Quitaste ${p.nombre}`, {
      accion: { texto: 'Deshacer', fn: () => { carrito.splice(pos, 0, id); pintarCarrito(); actualizarBotones(id); } }
    });
  }

  function actualizarBotones(id) {
    const en = carrito.includes(id);
    document.querySelectorAll(`.tarjeta[data-id="${CSS.escape(id)}"] [data-agregar]`).forEach(b => {
      b.classList.toggle('en', en);
      b.innerHTML = en ? icoListo : icoMas;
      b.setAttribute('aria-label', en ? 'Quitar del carrito' : 'Agregar al carrito');
    });
    if (actual && actual.id === id) pintarBotonFicha();
  }

  function abrirCarrito() {
    const v = $('#velo'), c = $('#carrito');
    v.hidden = false;
    requestAnimationFrame(() => v.classList.add('visible'));
    c.classList.add('abierto');
    c.setAttribute('aria-hidden', 'false');
    setTimeout(() => $('#cerrarCarrito').focus(), 60);
  }
  function cerrarCarrito() {
    const v = $('#velo'), c = $('#carrito');
    v.classList.remove('visible');
    c.classList.remove('abierto');
    c.setAttribute('aria-hidden', 'true');
    setTimeout(() => { v.hidden = true; }, 240);
  }

  /* ---------- Pedido por Instagram ----------
     Instagram no permite precargar texto en un mensaje directo (los enlaces
     ig.me no aceptan texto), así que copio el pedido y una ventana guía
     a pegarlo en el chat antes de abrirlo. */
  function mensajePedido(items) {
    const lineas = items.map(p => `• ${p.nombre} (${Datos.dinero(Datos.precioFinal(p))})`);
    const conPrecio = items.filter(p => Datos.precioFinal(p) != null);
    const total = conPrecio.reduce((s, p) => s + Datos.precioFinal(p), 0);
    return `¡Hola! 🌸 Vi en cosasperdidas.shop y me interesa${items.length > 1 ? 'n' : ''}:\n${lineas.join('\n')}` +
      (items.length > 1 && conPrecio.length ? `\nTotal: ${Datos.dinero(total)}` : '') + '\n¿Siguen disponibles?';
  }

  async function copiar(txt) {
    try { await navigator.clipboard.writeText(txt); return true; } catch (e) {
      const t = document.createElement('textarea');
      t.value = txt; t.style.position = 'fixed'; t.style.opacity = '0';
      document.body.appendChild(t); t.select();
      let ok = false; try { ok = document.execCommand('copy'); } catch (e2) {}
      t.remove();
      return ok;
    }
  }

  async function pedir(items) {
    if (!items.length) return;
    const txt = mensajePedido(items);
    $('#pedidoTxt').textContent = txt;
    $('#pedidoAbrir').href = CHAT_IG;
    const ok = await copiar(txt);
    $('#pedidoTitulo').textContent = ok ? 'Tu pedido ya está copiado 💌' : 'Copia tu pedido 💌';
    if ($('#carrito').classList.contains('abierto')) cerrarCarrito();
    if ($('#ficha').open) $('#ficha').close();
    $('#pedido').showModal();
  }

  /* ---------- Ficha de producto ---------- */
  function abrirFicha(id, desdeHash) {
    const p = porId(id);
    if (!p) return;
    actual = p; fotoIdx = 0;
    $('#fichaMarca').textContent = p.marca || '';
    $('#fichaNombre').textContent = (p.emoji ? p.emoji + ' ' : '') + p.nombre;
    const pct = Datos.descuento(p);
    $('#fichaPrecio').innerHTML = htmlPrecio(p, 'p') + (pct ? `<span class="pct">-${pct}%</span>` : '');
    $('#fichaDesc').textContent = p.descripcion || '';
    const estados = { disponible: 'Disponible', apartado: 'Apartado', vendido: 'Vendido' };
    $('#fichaDatos').innerHTML = `<dt>Estado</dt><dd>${estados[p.estado] || p.estado}</dd>` +
      `<dt>Talla</dt><dd>${esc(p.talla || 'Pregúntame por Instagram')}</dd>` +
      `<dt>Categoría</dt><dd>${esc(Datos.nombreCategoria(catDe(p)) || '—')}</dd>`;
    $('#miniaturas').innerHTML = (p.fotos || []).map((f, i) =>
      `<button type="button" data-foto="${i}" aria-label="Foto ${i + 1}"><img src="${esc(Datos.miniatura(f))}" alt="" loading="lazy"></button>`).join('');
    mostrarFoto(0, true);
    pintarBotonFicha();
    const d = $('#ficha');
    if (!d.open) d.showModal();
    if (!desdeHash) history.replaceState(null, '', `#p/${encodeURIComponent(id)}`);
  }

  function pintarBotonFicha() {
    const b = $('#fichaAgregar'), en = carrito.includes(actual.id), ok = vendible(actual);
    b.disabled = !ok;
    b.textContent = !ok ? (actual.estado === 'vendido' ? 'Ya se vendió' : 'Apartado') : en ? 'Quitar del carrito' : 'Agregar al carrito';
    $('#fichaIg').disabled = actual.estado === 'vendido';
  }

  function mostrarFoto(i, sinAnim) {
    const fotos = actual.fotos || [];
    if (!fotos.length) return;
    fotoIdx = (i + fotos.length) % fotos.length;
    const img = $('#fotoGrande img');
    img.src = fotos[fotoIdx];
    img.alt = `${actual.nombre}, foto ${fotoIdx + 1} de ${fotos.length}`;
    if (!sinAnim) { img.classList.remove('entra'); void img.offsetWidth; img.classList.add('entra'); }
    document.querySelectorAll('#miniaturas button').forEach((b, k) => b.setAttribute('aria-current', String(k === fotoIdx)));
    // Precarga la siguiente para que el cambio sea instantáneo
    if (fotos.length > 1) new Image().src = fotos[(fotoIdx + 1) % fotos.length];
  }

  function cerrarDialogo(d) {
    if (!d.open) return;
    if (Efectos.reducido()) { d.close(); return; }
    d.classList.add('cerrando');
    setTimeout(() => { d.classList.remove('cerrando'); d.close(); }, 170);
  }

  /* ---------- Visor ---------- */
  function abrirVisor() {
    $('#visor').showModal();
    pintarVisor(true);
  }
  function pintarVisor(sinAnim) {
    const fotos = actual.fotos || [], img = $('#visorImg');
    img.src = fotos[fotoIdx];
    img.alt = `${actual.nombre}, foto ${fotoIdx + 1}`;
    if (!sinAnim) { img.classList.remove('entra'); void img.offsetWidth; img.classList.add('entra'); }
    $('#visorCuenta').textContent = `${fotoIdx + 1} / ${fotos.length}`;
  }
  function pasoVisor(k) { mostrarFoto(fotoIdx + k, true); pintarVisor(); }

  // Deslizar con el dedo en el visor y en la foto grande
  function deslizable(el, fn) {
    let x0 = null, y0 = 0;
    el.addEventListener('touchstart', e => { x0 = e.touches[0].clientX; y0 = e.touches[0].clientY; }, { passive: true });
    el.addEventListener('touchend', e => {
      if (x0 == null) return;
      const dx = e.changedTouches[0].clientX - x0, dy = e.changedTouches[0].clientY - y0;
      x0 = null;
      if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy) * 1.3) { el.dataset.deslizo = '1'; fn(dx < 0 ? 1 : -1); }
    });
  }

  /* ---------- Acceso escondido al panel: 5 toques a la flor del pie ---------- */
  function florSecreta() {
    const f = $('#florSecreta');
    let toques = 0, t = null;
    f.addEventListener('click', () => {
      toques++;
      f.classList.add('toque');
      setTimeout(() => f.classList.remove('toque'), 160);
      clearTimeout(t);
      t = setTimeout(() => { toques = 0; }, 1800);
      if (toques >= 5) location.href = 'admin.html';
    });
  }

  /* ---------- Eventos ---------- */
  function conectar() {
    $('.menu-cat').addEventListener('click', e => {
      const b = e.target.closest('[data-cat]');
      if (!b) return;
      filtro.cat = b.dataset.cat;
      pintarMenu();
      pintarRejilla();
    });
    $('#marca').addEventListener('change', e => { filtro.marca = e.target.value; pintarRejilla(); });
    $('.vista').addEventListener('click', e => {
      const b = e.target.closest('[data-vista]');
      if (b && b.dataset.vista !== vista) { ponerVista(b.dataset.vista); pintarRejilla(); }
    });

    const pedido = $('#pedido');
    pedido.addEventListener('click', e => { if (e.target === pedido || e.target.closest('[data-cerrar]')) cerrarDialogo(pedido); });
    pedido.addEventListener('cancel', e => { e.preventDefault(); cerrarDialogo(pedido); });
    $('#pedidoAbrir').addEventListener('click', () => setTimeout(() => cerrarDialogo(pedido), 400));
    $('#pedidoCopiar').addEventListener('click', async () => {
      const ok = await copiar($('#pedidoTxt').textContent);
      Efectos.toast(ok ? 'Listo, copiado otra vez' : 'No pude copiarlo. Selecciona el texto y cópialo', { error: !ok });
    });
    $('#soloDisp').addEventListener('change', e => { filtro.soloDisp = e.target.checked; pintarRejilla(); });
    $('#orden').addEventListener('change', e => { filtro.orden = e.target.value; pintarRejilla(); });

    $('#rejilla').addEventListener('click', e => {
      const t = e.target.closest('.tarjeta');
      if (!t) return;
      if (e.target.closest('[data-agregar]')) agregar(t.dataset.id, t.querySelector('.t-foto img'));
      else if (e.target.closest('[data-abrir]')) abrirFicha(t.dataset.id);
    });

    $('#btnCarrito').addEventListener('click', abrirCarrito);
    $('#cerrarCarrito').addEventListener('click', cerrarCarrito);
    $('#velo').addEventListener('click', cerrarCarrito);
    $('#carLista').addEventListener('click', e => {
      const li = e.target.closest('.car-item');
      if (li && e.target.closest('[data-quitar]')) quitar(li.dataset.id);
    });
    $('#btnPedir').addEventListener('click', () => pedir(carrito.map(porId)));

    const ficha = $('#ficha');
    ficha.addEventListener('click', e => {
      if (e.target === ficha || e.target.closest('[data-cerrar]')) cerrarDialogo(ficha);
      const m = e.target.closest('[data-foto]');
      if (m) mostrarFoto(+m.dataset.foto);
    });
    ficha.addEventListener('cancel', e => { e.preventDefault(); cerrarDialogo(ficha); });
    ficha.addEventListener('close', () => { if (location.hash.startsWith('#p/')) history.replaceState(null, '', location.pathname); });
    $('#fotoGrande').addEventListener('click', e => {
      const b = e.currentTarget;
      if (b.dataset.deslizo) { delete b.dataset.deslizo; return; }
      abrirVisor();
    });
    deslizable($('#fotoGrande'), k => mostrarFoto(fotoIdx + k));
    $('#fichaAgregar').addEventListener('click', () => agregar(actual.id, $('#fotoGrande img')));
    $('#fichaIg').addEventListener('click', () => pedir([actual]));

    const visor = $('#visor');
    visor.addEventListener('click', e => {
      const b = e.target.closest('[data-paso]');
      if (b) pasoVisor(+b.dataset.paso);
      else if (e.target.closest('[data-cerrar]') || e.target === visor) cerrarDialogo(visor);
    });
    deslizable($('#visorImg'), pasoVisor);
    document.addEventListener('keydown', e => {
      if (visor.open && (e.key === 'ArrowRight' || e.key === 'ArrowLeft')) pasoVisor(e.key === 'ArrowRight' ? 1 : -1);
      else if (ficha.open && !visor.open && (e.key === 'ArrowRight' || e.key === 'ArrowLeft')) mostrarFoto(fotoIdx + (e.key === 'ArrowRight' ? 1 : -1));
      else if (e.key === 'Escape' && $('#carrito').classList.contains('abierto')) cerrarCarrito();
    });

    $('#btnTema').addEventListener('click', e => {
      const raiz = document.documentElement;
      const oscuroAhora = raiz.dataset.theme ? raiz.dataset.theme === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches;
      const nuevo = oscuroAhora ? 'light' : 'dark';
      Efectos.cambiarTema(e.currentTarget, () => {
        raiz.dataset.theme = nuevo;
        try { localStorage.setItem('cp-tema', nuevo); } catch (err) {}
      });
    });

    window.addEventListener('hashchange', abrirDesdeHash);
    florSecreta();
  }

  function abrirDesdeHash() {
    const m = location.hash.match(/^#p\/(.+)$/);
    if (m) abrirFicha(decodeURIComponent(m[1]), true);
  }

  /* ---------- Arranque ---------- */
  async function iniciar() {
    $('#rejilla').innerHTML = Array.from({ length: 6 }, () => '<div class="esqueleto"></div>').join('');
    conectar();
    Efectos.revelar();
    try {
      productos = (await Datos.listar()).filter(p => p.visible !== false);
    } catch (e) {
      console.error(e);
      $('#rejilla').innerHTML = '<p class="vacio"><b>No pudimos cargar el catálogo</b>Revisa tu conexión y recarga la página.</p>';
      return;
    }
    pintarMenu();
    pintarMarcas();
    ponerVista(vista);
    pintarRejilla();
    pintarCarrito();
    pintarContador();
    abrirDesdeHash();
  }

  iniciar();
})();
