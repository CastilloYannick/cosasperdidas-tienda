-- Migración 004: ajustes de la tienda editables desde el panel (fotos de portada y políticas)
create table if not exists public.ajustes (
  clave text primary key check (clave in ('portada', 'politicas')),
  valor jsonb not null default '{}'::jsonb,
  actualizado timestamptz not null default now()
);
drop trigger if exists ajustes_actualizado on public.ajustes;
create trigger ajustes_actualizado before update on public.ajustes for each row execute function public.tocar_actualizado();

alter table public.ajustes enable row level security;
drop policy if exists "todos leen ajustes" on public.ajustes;
create policy "todos leen ajustes" on public.ajustes for select to anon, authenticated using (true);
drop policy if exists "admin cambia ajustes" on public.ajustes;
create policy "admin cambia ajustes" on public.ajustes for all to authenticated using (true) with check (true);
grant select on public.ajustes to anon;
grant select, insert, update, delete on public.ajustes to authenticated;

insert into public.ajustes (clave, valor) values
('portada', '{"fotos": ["img/p/puma-rosados-1.webp", "img/p/adidas-gazelle-verde-petroleo-1.webp", "img/p/reebok-classic-crema-rosado-1.webp"]}'),
('politicas', '{
  "compra": "Aparto tu pieza en cuanto confirmamos el pago por mensaje. Cada artículo es único: si alguien más lo paga primero, ya no estará disponible.\nAcepto transferencia o depósito; te paso los datos por Instagram.",
  "envio": "Hago envíos a toda Guatemala. El costo depende de tu ubicación y de la paquetería, y lo pagas tú.\nDespacho de 1 a 3 días hábiles después de confirmar el pago y te envío tu número de guía para que sigas tu paquete aquí mismo.",
  "devoluciones": "No tengo devoluciones ni cambios. Por eso te mando todas las fotos, la talla según etiqueta y las medidas antes de que compres: pregúntame lo que necesites."
}')
on conflict (clave) do nothing;
