-- Migración 003: reseñas con aprobación y seguimiento de envíos (solo texto, cabe en el plan gratis)

-- ---------- Reseñas ----------
create table if not exists public.resenas (
  id uuid primary key default gen_random_uuid(),
  nombre text not null check (char_length(nombre) between 2 and 40),
  producto_id text references public.productos(id) on delete set null,
  estrellas smallint not null check (estrellas between 1 and 5),
  texto text not null check (char_length(texto) between 5 and 500),
  aprobada boolean not null default false,
  creada timestamptz not null default now()
);
create index if not exists resenas_aprobada_idx on public.resenas (aprobada, creada desc);

alter table public.resenas enable row level security;
drop policy if exists "todos leen aprobadas" on public.resenas;
create policy "todos leen aprobadas" on public.resenas for select to anon using (aprobada);
drop policy if exists "cualquiera deja pendiente" on public.resenas;
create policy "cualquiera deja pendiente" on public.resenas for insert to anon, authenticated with check (aprobada = false);
drop policy if exists "admin maneja resenas" on public.resenas;
create policy "admin maneja resenas" on public.resenas for all to authenticated using (true) with check (true);
grant select, insert on public.resenas to anon;
grant select, insert, update, delete on public.resenas to authenticated;

-- ---------- Envíos ----------
create table if not exists public.envios (
  codigo text primary key check (codigo ~ '^CP-[A-Z0-9]{6}$'),
  cliente text not null default '',
  productos text not null default '',
  courier text not null default '',
  courier_url text not null default '',
  guia text not null default '',
  estado text not null default 'confirmado' check (estado in ('confirmado','empacado','enviado','en_camino','entregado')),
  fechas jsonb not null default '{}'::jsonb,
  notas text not null default '',
  creado timestamptz not null default now(),
  actualizado timestamptz not null default now()
);
drop trigger if exists envios_actualizado on public.envios;
create trigger envios_actualizado before update on public.envios for each row execute function public.tocar_actualizado();

-- Solo la administradora ve la tabla completa (incluye el @ del cliente)
alter table public.envios enable row level security;
drop policy if exists "admin maneja envios" on public.envios;
create policy "admin maneja envios" on public.envios for all to authenticated using (true) with check (true);
revoke all on public.envios from anon;
grant select, insert, update, delete on public.envios to authenticated;

-- El público consulta UN envío por su código, sin datos del cliente
create or replace function public.ver_envio(p_codigo text)
returns table (codigo text, productos text, courier text, courier_url text, guia text, estado text, fechas jsonb, actualizado timestamptz)
language sql stable security definer set search_path = public as $$
  select e.codigo, e.productos, e.courier, e.courier_url, e.guia, e.estado, e.fechas, e.actualizado
  from public.envios e where e.codigo = upper(trim(p_codigo));
$$;
revoke all on function public.ver_envio(text) from public;
grant execute on function public.ver_envio(text) to anon, authenticated;

-- Freno anti-spam: como máximo 200 reseñas pendientes a la vez (protege el espacio gratis)
create or replace function public.limitar_pendientes() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if (select count(*) from public.resenas where not aprobada) >= 200 then
    raise exception 'Demasiadas reseñas pendientes, intenta más tarde';
  end if;
  return new;
end $$;
drop trigger if exists resenas_limite on public.resenas;
create trigger resenas_limite before insert on public.resenas for each row execute function public.limitar_pendientes();
