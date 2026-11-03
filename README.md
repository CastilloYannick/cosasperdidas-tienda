# Cosas Perdidas · tienda

Sitio estático de cosasperdidas.shop. La carpeta `docs/` es lo que se publica.

- `docs/index.html` tienda (catálogo, carrito, pedido por Instagram)
- `docs/admin.html` panel (se abre tocando 5 veces la flor del pie de página)
- `docs/js/config.js` URL y llave pública de Supabase
- `supabase/esquema.sql` tabla `productos`, permisos y bucket `fotos`
- `tools/` scripts para optimizar fotos y servir el sitio en local (`node tools/servidor.js`, publica desde `docs/`)

Fotos de portada de categorías en `docs/img/cat/`: Unsplash (licencia libre), se reemplazan solas por la foto del primer producto de cada categoría.
