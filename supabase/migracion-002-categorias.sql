-- Migración 002: categorías y textos actualizados desde beacons (aplicar al publicar)
alter table public.productos add column if not exists categoria text not null default 'casuales'
  check (categoria in ('deportivos','casuales','tacones','ropa-ninos','ropa-ninas','charms','carteras','salud'));
update public.productos set categoria='casuales', talla='EU 37.5 · US Women 7 · 23.5 cm', descripcion='Si te gustan los tenis neutros y fáciles de combinar, ¡estos son para ti!

Diseño clásico en gris claro con detalles plateados que le dan un toque elegante a cualquier outfit. Ideales para el día a día y para crear looks casuales.' where id='puma-gris-claro';
update public.productos set categoria='casuales', talla='EU 38.5 · 24.5 cm', descripcion='¡Mira qué linda combinación de colores! 😍 Rosado pastel, blanco y detalles dorados para darle un toque delicado y moderno a tus outfits.

✨ Ideales para combinar con jeans, vestidos y looks casuales.' where id='puma-rosados';
update public.productos set categoria='casuales', talla='US 8 · UK 5.5 · EU 38.5 · 25 cm', descripcion='¿Te gustan los tenis con un estilo clásico y delicado? ¡Mira esta combinación! ✨

Su tono crema con detalles rosados es perfecto para complementar tus outfits casuales y darle un toque diferente a tu estilo. 🌷' where id='reebok-classic-crema-rosado';
update public.productos set categoria='deportivos', talla='US 6.5Y · UK 5.5 · EU 38.5 · 24 cm', descripcion='¿Buscas unos tenis con un diseño deportivo y diferente? ¡Mira este par! ✨

Su combinación de negro, verde neón y blanco les da un estilo moderno, perfecto para combinar con tus outfits casuales y deportivos.' where id='nike-negros-verde-neon';
update public.productos set categoria='casuales', talla='EU 39 · US 7 · UK 6 · 25 cm', descripcion='¿Buscas unos tenis fáciles de combinar y con un estilo clásico? Estos Puma negros con detalles dorados y suela blanca pueden ser una excelente opción para tus outfits diarios. 🤍' where id='puma-negros-dorado';
update public.productos set categoria='deportivos', talla='US 6 · EU 36.5 · 23 cm', descripcion='¡Mira esta combinación de colores!

Estos Nike blancos con detalles oscuros y naranja son ideales para darle un toque diferente a tus outfits deportivos y casuales.' where id='nike-deportivos';
update public.productos set categoria='deportivos', talla='Talla 7 · plantilla aprox. 24 cm', descripcion='¿Buscas unos tenis en tonos neutros que puedas combinar fácilmente? ¡Estos pueden ser para ti! ✨

Su diseño deportivo en gris claro con blanco es perfecto para un look casual, salir o complementar tus outfits diarios.

👟 Modelo: New Balance 860' where id='new-balance-grises';
update public.productos set categoria='casuales', talla='US 4.5 · UK 4 · EU 36⅔ · 23 cm', descripcion='¡Un color que hará destacar tus outfits!

Adidas Gazelle en un hermoso tono verde petróleo, con las icónicas tres franjas color crema y suela caramelo. Un diseño versátil, ideal para combinar con jeans, pantalones casuales y looks en tonos neutros.

✔️ Originales de outlet con etiquetas' where id='adidas-gazelle-verde-petroleo';
update public.productos set categoria='tacones', talla='', descripcion='Sandalias blancas con tacón cuadrado y listón para amarrar al tobillo. Perfectas para una salida o un evento.' where id='sandalias-blancas-tacon';
