/*
 * ============================================================
 *  EFECTOS Y UTILIDADES DE INTERFAZ
 *  Mismas reglas de movimiento del sitio original: avisos
 *  apilados con acción (Deshacer), contadores animados, vuelo
 *  de tarjetas (FLIP) y cambio de tema con revelado circular.
 *  Curvas propias, menos de 300 ms en la interfaz, solo
 *  transform/opacity y respeto a "reducir movimiento".
 * ============================================================
 */
const Efectos = (function () {
  'use strict';

  const NS = 'http://www.w3.org/2000/svg';
  const reducido = () => !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
  const easeOut = t => 1 - Math.pow(1 - t, 3);
  const easeInOut = t => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const espera = ms => new Promise(r => setTimeout(r, ms));

  /* ---------- Avisos (toasts) ---------- */
  const MAX_AVISOS = 3;
  const cerrarSvg = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg>';

  /**
   * Muestra un aviso. opc: { error, accion: { texto, fn }, duracion }
   * (compatibilidad: un booleano como segundo argumento significa error).
   */
  function toast(msg, opc) {
    if (typeof opc === 'boolean') opc = { error: opc };
    opc = opc || {};
    const cont = document.getElementById('toasts');
    if (!cont) return { cerrar() {} };
    const el = document.createElement('div');
    el.className = 'toast-i' + (opc.error ? ' error' : '');
    el.setAttribute('role', opc.error ? 'alert' : 'status');
    el.innerHTML = `<span class="ti-punto" aria-hidden="true"></span><span class="ti-txt"></span>` +
      (opc.accion ? '<button class="ti-accion" type="button"></button>' : '') +
      `<button class="ti-cerrar" type="button" aria-label="Cerrar aviso">${cerrarSvg}</button>`;
    el.querySelector('.ti-txt').textContent = msg;
    if (opc.accion) el.querySelector('.ti-accion').textContent = opc.accion.texto;
    cont.appendChild(el);

    // Como máximo tres a la vez: el más viejo se va
    const vivos = [...cont.querySelectorAll('.toast-i:not(.saliendo)')];
    if (vivos.length > MAX_AVISOS) vivos.slice(0, vivos.length - MAX_AVISOS).forEach(v => v._cerrar && v._cerrar());

    requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add('visible')));

    let restante = opc.duracion || (opc.accion ? 6500 : opc.error ? 5200 : 3200);
    let inicio = Date.now(), tId = null, cerrado = false;
    const programar = () => { clearTimeout(tId); inicio = Date.now(); tId = setTimeout(cerrar, restante); };
    const pausar = () => { clearTimeout(tId); restante -= Date.now() - inicio; };
    function cerrar() {
      if (cerrado) return;
      cerrado = true; clearTimeout(tId);
      el.classList.add('saliendo'); el.classList.remove('visible');
      setTimeout(() => el.remove(), 200);
      document.removeEventListener('visibilitychange', alCambiarVisibilidad);
    }
    // Detalles invisibles: el tiempo se detiene con el mouse encima o con la pestaña oculta
    function alCambiarVisibilidad() { if (document.hidden) pausar(); else programar(); }
    el.addEventListener('mouseenter', pausar);
    el.addEventListener('mouseleave', programar);
    document.addEventListener('visibilitychange', alCambiarVisibilidad);
    el.querySelector('.ti-cerrar').addEventListener('click', cerrar);
    if (opc.accion) el.querySelector('.ti-accion').addEventListener('click', () => { cerrar(); opc.accion.fn(); });
    el._cerrar = cerrar;
    programar();
    return { cerrar };
  }

  /* ---------- Contadores que suben hasta su valor ---------- */
  function contar(el, hasta, ms = 700) {
    const dec = +(el.dataset.decimales || 0), suf = el.dataset.sufijo || '';
    const fmt = v => v.toLocaleString('es-GT', { minimumFractionDigits: dec, maximumFractionDigits: dec }) + suf;
    if (reducido() || !hasta || ms <= 0) { el.textContent = fmt(hasta || 0); return; }
    const t0 = performance.now();
    (function paso(t) {
      const k = Math.min(1, (t - t0) / ms);
      el.textContent = fmt(dec ? hasta * easeOut(k) : Math.round(hasta * easeOut(k)));
      if (k < 1) requestAnimationFrame(paso);
    })(t0);
  }

  /* ---------- Vuelo de la foto al carrito ----------
     Un clon de la foto sale de su lugar y aterriza en el botón del
     carrito siguiendo un arco: transform en dos ejes con curvas distintas. */
  function volarAlCarrito(img, destino) {
    if (!img || !destino || reducido()) return Promise.resolve();
    const a = img.getBoundingClientRect(), b = destino.getBoundingClientRect();
    const f = img.cloneNode();
    f.className = 'foto-vuela';
    Object.assign(f.style, { width: a.width + 'px', height: a.height + 'px', left: a.left + 'px', top: a.top + 'px' });
    document.body.appendChild(f);
    const dx = b.left + b.width / 2 - (a.left + a.width / 2), dy = b.top + b.height / 2 - (a.top + a.height / 2);
    const s = Math.max(0.08, 34 / a.width);
    const anim = f.animate([
      { transform: 'translate(0,0) scale(1)', opacity: 1, borderRadius: '18px' },
      { transform: `translate(${dx * 0.45}px, ${dy * 0.2 - 60}px) scale(${(1 + s) / 2.4})`, opacity: 1, offset: 0.55 },
      { transform: `translate(${dx}px, ${dy}px) scale(${s})`, opacity: 0.4, borderRadius: '50%' }
    ], { duration: 620, easing: 'cubic-bezier(0.5, 0, 0.3, 1)', fill: 'forwards' });
    return anim.finished.catch(() => {}).then(() => {
      f.remove();
      destino.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.18)' }, { transform: 'scale(1)' }],
        { duration: 280, easing: 'cubic-bezier(0.23, 1, 0.32, 1)' });
    });
  }

  /* ---------- Entrada al hacer scroll (una sola vez) ---------- */
  function revelar(raiz = document) {
    const els = [...raiz.querySelectorAll('[data-revela]:not(.revelado)')];
    if (reducido() || !('IntersectionObserver' in window)) { els.forEach(e => e.classList.add('revelado')); return; }
    const io = new IntersectionObserver(ents => ents.forEach(e => {
      if (!e.isIntersecting) return;
      e.target.classList.add('revelado');
      io.unobserve(e.target);
    }), { rootMargin: '0px 0px -8% 0px' });
    els.forEach(e => io.observe(e));
  }

  function sacudir(el) {
    el.classList.remove('sacudir'); void el.offsetWidth; el.classList.add('sacudir');
    setTimeout(() => el.classList.remove('sacudir'), 420);
  }

  /* ---------- Tema claro/oscuro con revelado circular ---------- */
  function cambiarTema(boton, aplicar) {
    const r = boton.getBoundingClientRect();
    const x = r.left + r.width / 2, y = r.top + r.height / 2;
    const radio = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
    if (!document.startViewTransition || reducido()) { aplicar(); return; }
    const raiz = document.documentElement;
    raiz.classList.add('tema-cambiando');
    const vt = document.startViewTransition(aplicar);
    vt.ready.then(() => {
      raiz.animate({ clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radio}px at ${x}px ${y}px)`] },
        { duration: 520, easing: 'cubic-bezier(0.23, 1, 0.32, 1)', pseudoElement: '::view-transition-new(root)' });
    }).catch(() => {});
    vt.finished.finally(() => raiz.classList.remove('tema-cambiando'));
  }

  return { reducido, espera, toast, contar, volarAlCarrito, revelar, sacudir, cambiarTema, easeOut, easeInOut };
})();
