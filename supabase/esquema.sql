-- Esquema de la tienda Cosas Perdidas
create table if not exists public.productos (
  id text primary key,
  nombre text not null,
  marca text default 'Otros',
  emoji text default '',
  descripcion text default '',
  precio integer check (precio is null or precio >= 0),
  precio_oferta integer check (precio_oferta is null or precio_oferta >= 0),
  talla text default '',
  estado text not null default 'disponible' check (estado in ('disponible','apartado','vendido')),
  visible boolean not null default true,
  orden integer not null default 0,
  fotos text[] not null default '{}',
  creado timestamptz not null default now(),
  actualizado timestamptz not null default now()
);

create or replace function public.tocar_actualizado() returns trigger language plpgsql as $$
begin new.actualizado = now(); return new; end $$;
drop trigger if exists productos_actualizado on public.productos;
create trigger productos_actualizado before update on public.productos for each row execute function public.tocar_actualizado();

alter table public.productos enable row level security;
drop policy if exists "todos leen" on public.productos;
create policy "todos leen" on public.productos for select to anon, authenticated using (true);
drop policy if exists "admin escribe" on public.productos;
create policy "admin escribe" on public.productos for all to authenticated using (true) with check (true);
grant select on public.productos to anon;
grant select, insert, update, delete on public.productos to authenticated;

-- Fotos: lectura pública, solo la administradora sube o borra
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('fotos', 'fotos', true, 5242880, array['image/webp','image/jpeg','image/png'])
on conflict (id) do update set public = true;
drop policy if exists "admin sube fotos" on storage.objects;
create policy "admin sube fotos" on storage.objects for insert to authenticated with check (bucket_id = 'fotos');
drop policy if exists "admin cambia fotos" on storage.objects;
create policy "admin cambia fotos" on storage.objects for update to authenticated using (bucket_id = 'fotos');
drop policy if exists "admin borra fotos" on storage.objects;
create policy "admin borra fotos" on storage.objects for delete to authenticated using (bucket_id = 'fotos');

-- Catálogo inicial (de beacons.ai + fotos del zip)
insert into public.productos (id, nombre, marca, emoji, descripcion, precio, precio_oferta, talla, estado, orden, fotos) values
('puma-gris-claro', 'Puma en color gris claro', 'Puma', '🩶', 'Gris clarito con detalle plateado en el talón. Combinan con todo: jeans, faldas o pants. De esos tenis que terminas usando toda la semana.', 600, null, '', 'disponible', 1, array['img/p/puma-gris-claro-1.webp','img/p/puma-gris-claro-2.webp','img/p/puma-gris-claro-3.webp','img/p/puma-gris-claro-4.webp','img/p/puma-gris-claro-5.webp']::text[]),
('puma-rosados', 'Puma rosados', 'Puma', '🎀', 'Rosado pastel con blanco y suela de plataforma. Dulces, cómodos y con ese toque retro que se ve lindo en fotos.', 550, null, '', 'disponible', 2, array['img/p/puma-rosados-1.webp','img/p/puma-rosados-2.webp','img/p/puma-rosados-3.webp','img/p/puma-rosados-4.webp','img/p/puma-rosados-5.webp']::text[]),
('reebok-classic-crema-rosado', 'Reebok Classic en crema y rosado', 'Reebok', '🌸', 'Un clásico de siempre en crema con detalles rosados. Suela gruesa, estilo vintage y muy fáciles de combinar.', 500, null, '', 'disponible', 3, array['img/p/reebok-classic-crema-rosado-1.webp','img/p/reebok-classic-crema-rosado-2.webp','img/p/reebok-classic-crema-rosado-3.webp','img/p/reebok-classic-crema-rosado-4.webp','img/p/reebok-classic-crema-rosado-5.webp']::text[]),
('nike-negros-verde-neon', 'Nike negros con verde neón', 'Nike', '💚', 'Negros con jaladeras verde neón y suela moteada. Para el día a día o para salir a caminar, con un detalle que llama la atención.', 500, null, '', 'disponible', 4, array['img/p/nike-negros-verde-neon-1.webp','img/p/nike-negros-verde-neon-2.webp','img/p/nike-negros-verde-neon-3.webp','img/p/nike-negros-verde-neon-4.webp','img/p/nike-negros-verde-neon-5.webp','img/p/nike-negros-verde-neon-6.webp','img/p/nike-negros-verde-neon-7.webp']::text[]),
('puma-negros-dorado', 'Tenis Puma negros con dorado', 'Puma', '🖤', 'Negros de piel con el logo dorado y suela blanca. Elegantes, limpios y fáciles de cuidar.', 500, null, '', 'disponible', 5, array['img/p/puma-negros-dorado-1.webp','img/p/puma-negros-dorado-2.webp','img/p/puma-negros-dorado-3.webp','img/p/puma-negros-dorado-4.webp']::text[]),
('nike-deportivos', 'Nike deportivos', 'Nike', '🧡', 'Blancos con swoosh morado y detalles naranja. Ligeros y acolchonados, ideales para correr, ir al gym o caminar mucho.', 500, null, '', 'disponible', 6, array['img/p/nike-deportivos-1.webp','img/p/nike-deportivos-2.webp','img/p/nike-deportivos-3.webp','img/p/nike-deportivos-4.webp','img/p/nike-deportivos-5.webp','img/p/nike-deportivos-6.webp']::text[]),
('new-balance-grises', 'New Balance grises', 'New Balance', '🩶', 'Gris claro en malla transpirable con suela blanca acolchonada. Comodidad total para todo el día.', 600, null, '', 'disponible', 7, array['img/p/new-balance-grises-1.webp','img/p/new-balance-grises-2.webp','img/p/new-balance-grises-3.webp','img/p/new-balance-grises-4.webp']::text[]),
('adidas-gazelle-verde-petroleo', 'Adidas Gazelle verde petróleo', 'Adidas', '💚', 'Las Gazelle en verde petróleo con rayas crema y suela de goma color miel. Un ícono retro que nunca pasa de moda.', 630, null, '', 'disponible', 8, array['img/p/adidas-gazelle-verde-petroleo-1.webp','img/p/adidas-gazelle-verde-petroleo-2.webp','img/p/adidas-gazelle-verde-petroleo-3.webp','img/p/adidas-gazelle-verde-petroleo-4.webp','img/p/adidas-gazelle-verde-petroleo-5.webp']::text[]),
('sandalias-blancas-tacon', 'Sandalias blancas de tacón', 'Otros', '🤍', 'Sandalias blancas con tacón cuadrado y listón para amarrar al tobillo. Perfectas para una salida o un evento.', null, null, '', 'disponible', 9, array['img/p/sandalias-blancas-tacon-1.webp','img/p/sandalias-blancas-tacon-2.webp','img/p/sandalias-blancas-tacon-3.webp']::text[])
on conflict (id) do nothing;
