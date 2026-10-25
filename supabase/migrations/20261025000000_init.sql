-- ════════════════════════════════════════════════════════════════════
--  DentalCare — esquema inicial
--  Toda la lógica de datos corre en el servidor (Next.js + Drizzle).
--  RLS está activado en todas las tablas SIN políticas: la API pública
--  de Supabase (anon / authenticated) no puede leer ni escribir nada.
-- ════════════════════════════════════════════════════════════════════

create extension if not exists btree_gist;

create type public.user_role as enum ('patient', 'admin');
create type public.appointment_status as enum (
  'pending', 'confirmed', 'rejected', 'cancelled', 'completed', 'no_show'
);

-- ─── Utilidad: updated_at automático ────────────────────────────────
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- ─── Perfiles (1:1 con auth.users) ──────────────────────────────────
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role public.user_role not null default 'patient',
  email text not null,
  first_name text not null default '',
  last_name text not null default '',
  dni text unique check (dni is null or dni ~ '^\d{4}-\d{4}-\d{5}$'),
  phone text,
  birth_date date,
  insurance text,
  privacy_accepted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index profiles_name_idx on public.profiles (lower(last_name), lower(first_name));
create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

-- Crea el perfil automáticamente al registrarse (email o Google).
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  full_name text := coalesce(meta ->> 'full_name', meta ->> 'name', '');
begin
  insert into public.profiles (
    id, email, first_name, last_name, dni, phone, birth_date, insurance, privacy_accepted_at
  ) values (
    new.id,
    new.email,
    coalesce(nullif(meta ->> 'first_name', ''), split_part(full_name, ' ', 1)),
    coalesce(nullif(meta ->> 'last_name', ''), nullif(substr(full_name, length(split_part(full_name, ' ', 1)) + 2), ''), ''),
    nullif(meta ->> 'dni', ''),
    nullif(meta ->> 'phone', ''),
    nullif(meta ->> 'birth_date', '')::date,
    nullif(meta ->> 'insurance', ''),
    case when (meta ->> 'privacy_accepted') = 'true' then now() end
  );
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Mantiene el email del perfil sincronizado si el usuario lo cambia.
create or replace function public.handle_user_email_change()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  update public.profiles set email = new.email where id = new.id;
  return new;
end $$;

create trigger on_auth_user_email_changed
  after update of email on auth.users
  for each row when (old.email is distinct from new.email)
  execute function public.handle_user_email_change();

-- ─── Profesionales y servicios ──────────────────────────────────────
create table public.professionals (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  title text not null default 'Dr.',
  specialty text not null default 'Odontología general',
  bio text,
  photo_url text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.services (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  duration_min integer not null check (duration_min between 5 and 480),
  price numeric(10, 2) check (price is null or price >= 0),
  color text not null default '#0ea5a4' check (color ~ '^#[0-9a-fA-F]{6}$'),
  icon text not null default 'sparkles',
  active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table public.professional_services (
  professional_id uuid not null references public.professionals (id) on delete cascade,
  service_id uuid not null references public.services (id) on delete cascade,
  primary key (professional_id, service_id)
);

-- ─── Agenda ─────────────────────────────────────────────────────────
-- Horario semanal en hora local del consultorio (weekday: 0 = domingo).
create table public.working_hours (
  id uuid primary key default gen_random_uuid(),
  professional_id uuid not null references public.professionals (id) on delete cascade,
  weekday smallint not null check (weekday between 0 and 6),
  start_time time not null,
  end_time time not null,
  check (end_time > start_time)
);
create index working_hours_prof_idx on public.working_hours (professional_id, weekday);

-- Bloqueos: feriados, vacaciones, congresos...
create table public.time_off (
  id uuid primary key default gen_random_uuid(),
  professional_id uuid not null references public.professionals (id) on delete cascade,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  reason text,
  created_at timestamptz not null default now(),
  check (ends_at > starts_at)
);
create index time_off_range_idx on public.time_off using gist (professional_id, tstzrange(starts_at, ends_at));

-- ─── Turnos ─────────────────────────────────────────────────────────
create table public.appointments (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.profiles (id) on delete cascade,
  professional_id uuid not null references public.professionals (id),
  service_id uuid not null references public.services (id),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  status public.appointment_status not null default 'pending',
  patient_notes text,
  admin_notes text,
  rejection_reason text,
  created_by uuid references public.profiles (id) on delete set null,
  confirmed_at timestamptz,
  cancelled_at timestamptz,
  reminder_sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at > starts_at),
  -- Garantía a nivel de base de datos: un profesional no puede tener dos
  -- turnos activos (pendientes o confirmados) que se superpongan.
  constraint appointments_no_overlap exclude using gist (
    professional_id with =,
    tstzrange(starts_at, ends_at) with &&
  ) where (status in ('pending', 'confirmed'))
);
create index appointments_starts_idx on public.appointments (starts_at);
create index appointments_patient_idx on public.appointments (patient_id, starts_at desc);
create index appointments_status_idx on public.appointments (status, starts_at);
create trigger appointments_updated_at before update on public.appointments
  for each row execute function public.set_updated_at();

-- Historial de cambios de estado (auditoría).
create table public.appointment_events (
  id bigint generated always as identity primary key,
  appointment_id uuid not null references public.appointments (id) on delete cascade,
  actor_id uuid references public.profiles (id) on delete set null,
  from_status public.appointment_status,
  to_status public.appointment_status not null,
  note text,
  created_at timestamptz not null default now()
);
create index appointment_events_appt_idx on public.appointment_events (appointment_id, created_at);

-- ─── Configuración del consultorio (fila única) ─────────────────────
create table public.clinic_settings (
  id smallint primary key default 1 check (id = 1),
  name text not null default 'Mi Consultorio Dental',
  tagline text not null default 'Tu sonrisa, en las mejores manos',
  address text not null default '',
  city text not null default 'Tegucigalpa',
  phone text not null default '',
  whatsapp text not null default '',
  email text not null default '',
  maps_url text not null default '',
  timezone text not null default 'America/Tegucigalpa',
  min_hours_before_booking integer not null default 2 check (min_hours_before_booking >= 0),
  max_days_ahead integer not null default 60 check (max_days_ahead between 1 and 365),
  cancellation_hours integer not null default 24 check (cancellation_hours >= 0),
  slot_step_min integer not null default 15 check (slot_step_min between 5 and 120),
  max_active_per_patient integer not null default 3 check (max_active_per_patient >= 1),
  updated_at timestamptz not null default now()
);
insert into public.clinic_settings (id) values (1);

-- ─── Seguridad: RLS activado, sin políticas (deny-all para la API pública) ──
alter table public.profiles enable row level security;
alter table public.professionals enable row level security;
alter table public.services enable row level security;
alter table public.professional_services enable row level security;
alter table public.working_hours enable row level security;
alter table public.time_off enable row level security;
alter table public.appointments enable row level security;
alter table public.appointment_events enable row level security;
alter table public.clinic_settings enable row level security;
