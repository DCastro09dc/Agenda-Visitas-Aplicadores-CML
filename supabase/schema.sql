-- Agenda de Visitas CML
-- Ejecutar completo en Supabase > SQL Editor.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  role text not null default 'worker' check (role in ('admin','worker')),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.programaciones (
  id uuid primary key default gen_random_uuid(),
  import_id uuid,
  aplicador_id uuid references public.profiles(id) on delete set null,
  aplicador_nombre text,
  fecha date,
  codigo text,
  centro_escolar text,
  departamento text,
  municipio text,
  distrito text,
  grupo text,
  datos jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.importaciones (
  id uuid primary key default gen_random_uuid(),
  archivo_nombre text not null,
  filas integer not null default 0,
  creador_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists programaciones_aplicador_id_idx on public.programaciones(aplicador_id);
create index if not exists programaciones_fecha_idx on public.programaciones(fecha);
create index if not exists programaciones_codigo_idx on public.programaciones(codigo);

-- Normaliza nombres para poder vincular una programación importada
-- con el usuario cuando este crea su cuenta después.
create or replace function public.normalize_person_name(p_text text)
returns text
language sql
immutable
as $
  select regexp_replace(lower(trim(coalesce(p_text, ''))), '[^a-z0-9áéíóúüñ ]', '', 'g');
$;

create or replace function public.claim_programaciones_for_user(p_user_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $
declare
  updated_count integer;
begin
  if p_user_id <> auth.uid() then
    raise exception 'No autorizado';
  end if;

  update public.programaciones p
  set aplicador_id = p_user_id
  where p.aplicador_id is null
    and public.normalize_person_name(p.aplicador_nombre) =
        public.normalize_person_name(
          (select full_name from public.profiles where id = p_user_id)
        );

  get diagnostics updated_count = row_count;
  return updated_count;
end;
$;

revoke all on function public.claim_programaciones_for_user(uuid) from public;
grant execute on function public.claim_programaciones_for_user(uuid) to authenticated;

alter table public.profiles enable row level security;
alter table public.programaciones enable row level security;
alter table public.importaciones enable row level security;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin' and active = true
  );
$$;

drop policy if exists "profiles own row" on public.profiles;
create policy "profiles own row" on public.profiles
for select to authenticated using (id = auth.uid() or public.is_admin());

drop policy if exists "users create own profile" on public.profiles;
create policy "users create own profile" on public.profiles
for insert to authenticated
with check (id = auth.uid() and role = 'worker' and active = true);

drop policy if exists "admins manage profiles" on public.profiles;
create policy "admins manage profiles" on public.profiles
for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "workers see own programming" on public.programaciones;
create policy "workers see own programming" on public.programaciones
for select to authenticated using (aplicador_id = auth.uid() or public.is_admin());

drop policy if exists "admins insert programming" on public.programaciones;
create policy "admins insert programming" on public.programaciones
for insert to authenticated with check (public.is_admin());

drop policy if exists "admins delete programming" on public.programaciones;
create policy "admins delete programming" on public.programaciones
for delete to authenticated using (public.is_admin());

drop policy if exists "admins see imports" on public.importaciones;
create policy "admins see imports" on public.importaciones
for select to authenticated using (public.is_admin());

drop policy if exists "admins insert imports" on public.importaciones;
create policy "admins insert imports" on public.importaciones
for insert to authenticated with check (public.is_admin());

-- El perfil de los nuevos usuarios se crea como worker desde la aplicación.
-- La función anterior vincula automáticamente las programaciones pendientes
-- cuando el aplicador inicia sesión.
--
-- Para convertir el primer usuario en admin, después de registrarlo ejecutá:
-- update public.profiles set role='admin' where id='UUID_DEL_USUARIO';
