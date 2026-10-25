-- ════════════════════════════════════════════════════════════════════
--  INSTALACIÓN COMPLETA — pegar en Supabase → SQL Editor → Run
--  Archivo generado con: npm run db:setup-sql (no editar a mano)
--  Incluye: esquema, datos base del consultorio y datos de DEMO.
--  ✏️ Antes de ejecutar, cambia el email/contraseña del admin en la sección DEMO.
-- ════════════════════════════════════════════════════════════════════

-- ┌─────────────── supabase/migrations/20261025000000_init.sql ───────────────┐
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


-- ┌─────────────── supabase/seed.sql ───────────────┐
-- Datos iniciales (placeholders editables desde el panel de administración).

update public.clinic_settings set
  name = 'Clínica Dental Sonríe',
  tagline = 'Odontología moderna, cálida y sin esperas',
  address = 'Col. Palmira, Av. República de Chile, Edificio Médico, Local 3',
  city = 'Tegucigalpa',
  phone = '+504 2232-0000',
  whatsapp = '+504 9999-0000',
  email = 'contacto@clinicasonrie.hn',
  maps_url = 'https://maps.google.com/?q=Colonia+Palmira+Tegucigalpa'
where id = 1;

insert into public.professionals (id, name, title, specialty, bio) values (
  '00000000-0000-4000-8000-000000000001',
  'Andrea Mejía',
  'Dra.',
  'Odontología general y ortodoncia',
  'Cirujana dentista egresada de la UNAH con especialidad en ortodoncia. Más de 10 años cuidando sonrisas en Tegucigalpa.'
);

insert into public.services (id, name, description, duration_min, price, color, icon, sort_order) values
  ('00000000-0000-4000-8000-000000000101', 'Control general', 'Revisión completa, diagnóstico y plan de tratamiento.', 30, 500, '#0ea5a4', 'stethoscope', 1),
  ('00000000-0000-4000-8000-000000000102', 'Limpieza dental', 'Profilaxis con ultrasonido y pulido para una sonrisa sana.', 45, 900, '#22d3ee', 'sparkles', 2),
  ('00000000-0000-4000-8000-000000000103', 'Ortodoncia — primera consulta', 'Evaluación, fotos y plan para brackets o alineadores.', 45, 800, '#6366f1', 'smile', 3),
  ('00000000-0000-4000-8000-000000000104', 'Ortodoncia — control', 'Ajuste mensual de brackets o seguimiento de alineadores.', 20, 1200, '#8b5cf6', 'smile-plus', 4),
  ('00000000-0000-4000-8000-000000000105', 'Blanqueamiento', 'Blanqueamiento profesional en consultorio.', 60, 3500, '#f59e0b', 'gem', 5),
  ('00000000-0000-4000-8000-000000000106', 'Extracción', 'Extracción simple con anestesia local.', 45, 1000, '#ef4444', 'syringe', 6),
  ('00000000-0000-4000-8000-000000000107', 'Endodoncia', 'Tratamiento de conducto para salvar la pieza dental.', 90, 4500, '#ec4899', 'activity', 7),
  ('00000000-0000-4000-8000-000000000108', 'Restauración / resina', 'Tratamiento de caries con resina del color del diente.', 45, 1100, '#10b981', 'shield-plus', 8),
  ('00000000-0000-4000-8000-000000000109', 'Implantes — evaluación', 'Valoración para implantes dentales.', 30, 600, '#0ea5e9', 'drill', 9),
  ('00000000-0000-4000-8000-000000000110', 'Odontopediatría', 'Atención dental para niños, con paciencia y cariño.', 30, 600, '#f97316', 'baby', 10),
  ('00000000-0000-4000-8000-000000000111', 'Urgencia', 'Dolor, inflamación o golpe: atención prioritaria.', 30, 700, '#dc2626', 'siren', 11);

insert into public.professional_services (professional_id, service_id)
select '00000000-0000-4000-8000-000000000001', id from public.services;

-- Lunes a viernes 8:00–12:00 y 14:00–18:00, sábados 8:00–12:00.
insert into public.working_hours (professional_id, weekday, start_time, end_time)
select '00000000-0000-4000-8000-000000000001', d, t.s, t.e
from generate_series(1, 5) as d,
     (values ('08:00'::time, '12:00'::time), ('14:00'::time, '18:00'::time)) as t(s, e);

insert into public.working_hours (professional_id, weekday, start_time, end_time)
values ('00000000-0000-4000-8000-000000000001', 6, '08:00', '12:00');


-- ┌─────────────── supabase/demo.sql ───────────────┐
-- ════════════════════════════════════════════════════════════════════
--  Datos de DEMO: administrador, pacientes ficticios y ~3 semanas de turnos
--  (pasados y futuros) relativos a la fecha en que se ejecuta.
--
--  ✏️  Antes de ejecutar, cambia el email y la contraseña del administrador
--      (las dos líneas marcadas abajo).
--
--  Los pacientes de demo usan emails "@demo.invalid": la app nunca les envía
--  correos. Para borrarlos antes de abrir al público: supabase/demo-borrar.sql
-- ════════════════════════════════════════════════════════════════════

do $$
declare
  -- ✏️ Credenciales del administrador (cámbialas):
  v_admin_email    text := 'recepcion@demo.hn';
  v_admin_password text := 'Demo2026!';

  -- Paciente de demo con acceso, para probar la vista del paciente:
  v_demo_patient_email    text := 'paciente@demo.invalid';
  v_demo_patient_password text := 'Demo2026!';

  tz   text := 'America/Tegucigalpa';
  pro  uuid := '00000000-0000-4000-8000-000000000001';
  today date := (now() at time zone tz)::date;

  people text[][] := array[
    ['María José', 'López Castillo', '0801-1990-04512', '+504 9876-5432', '1990-05-10', 'IHSS'],
    ['Carlos', 'Reyes Medina', '0801-1985-11234', '+504 3344-5566', '1985-02-21', ''],
    ['Ana Lucía', 'Martínez Flores', '0501-1995-02231', '+504 9712-3344', '1995-08-03', 'Seguro privado'],
    ['José Antonio', 'Hernández Paz', '0801-1978-07765', '+504 9988-1122', '1978-11-30', ''],
    ['Daniela', 'Zelaya Ordóñez', '0801-2001-03456', '+504 8765-4321', '2001-01-15', ''],
    ['Luis Fernando', 'Mejía Rivera', '0301-1988-05543', '+504 9654-7788', '1988-06-27', 'IHSS'],
    ['Sofía', 'Aguilar Banegas', '0801-2012-09981', '+504 9432-1100', '2012-04-09', ''],
    ['Jorge', 'Castro Matute', '1501-1969-00321', '+504 3211-4455', '1969-09-18', 'Seguro privado'],
    ['Gabriela', 'Funes Velásquez', '0801-1993-06677', '+504 9877-6655', '1993-12-02', ''],
    ['Ricardo', 'Sosa Pineda', '0801-1982-02219', '+504 9555-2233', '1982-03-14', ''],
    ['Valeria', 'Cruz Andino', '0801-1999-08812', '+504 8899-0011', '1999-07-22', 'IHSS'],
    ['Miguel Ángel', 'Rodríguez Lagos', '0601-1975-04490', '+504 9321-6677', '1975-10-05', ''],
    ['Fernanda', 'Ramos Ochoa', '0801-2015-01123', '+504 9765-4433', '2015-02-28', ''],
    ['Óscar', 'Turcios Bonilla', '0801-1991-07734', '+504 3398-7766', '1991-05-19', ''],
    ['Paola', 'Maradiaga Cáceres', '0801-1987-03348', '+504 9601-2345', '1987-08-11', 'Seguro privado']
  ];
  notes text[] := array[
    'Me duele una muela del lado derecho desde hace 3 días.',
    'Sensibilidad al frío al tomar bebidas.',
    'Quisiera saber si necesito brackets.',
    'Control de brackets del mes.',
    'Me sangran las encías al cepillarme.',
    'Es para mi hija de 10 años, primera visita.',
    'Se me cayó una calza.',
    'Quiero cotizar un blanqueamiento.'
  ];

  pats uuid[] := '{}';
  uid uuid;
  i int;
  d date;
  blk record;
  svc record;
  t timestamp;
  starts timestamptz;
  occ float;
  r float;
  st public.appointment_status;
  appt uuid;
  admin_id uuid;
  pat uuid;

  -- Crea un usuario de Auth con email confirmado (el trigger crea su perfil).
  -- Si password es null, el usuario no puede ingresar (paciente cargado por el consultorio).
begin
  if exists (select 1 from auth.users where email = v_admin_email) then
    raise exception 'Los datos de demo ya fueron cargados (existe %). Usa demo-borrar.sql para empezar de nuevo.', v_admin_email;
  end if;
  perform setseed(0.42);

  -- ── Usuarios ──────────────────────────────────────────────────────
  for i in 0 .. array_length(people, 1) + 1 loop
    uid := gen_random_uuid();
    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
      confirmation_token, recovery_token, email_change_token_new, email_change
    ) values (
      '00000000-0000-0000-0000-000000000000', uid, 'authenticated', 'authenticated',
      case
        when i = 0 then v_admin_email
        when i = array_length(people, 1) + 1 then v_demo_patient_email
        else lower(translate(split_part(people[i][1], ' ', 1) || '.' || split_part(people[i][2], ' ', 1), 'áéíóúÁÉÍÓÚñÑ', 'aeiouAEIOUnN')) || '@demo.invalid'
      end,
      case
        when i = 0 then extensions.crypt(v_admin_password, extensions.gen_salt('bf'))
        when i = array_length(people, 1) + 1 then extensions.crypt(v_demo_patient_password, extensions.gen_salt('bf'))
        else ''
      end,
      now(),
      '{"provider":"email","providers":["email"]}',
      case
        when i = 0 then jsonb_build_object('first_name', 'Recepción', 'last_name', 'Clínica', 'privacy_accepted', 'true')
        when i = array_length(people, 1) + 1 then jsonb_build_object(
          'first_name', 'Paciente', 'last_name', 'Demo', 'dni', '0801-2000-99999',
          'phone', '+504 9999-9999', 'birth_date', '2000-01-01', 'privacy_accepted', 'true')
        else jsonb_build_object(
          'first_name', people[i][1], 'last_name', people[i][2], 'dni', people[i][3],
          'phone', people[i][4], 'birth_date', people[i][5], 'insurance', people[i][6],
          'privacy_accepted', 'true')
      end,
      now() - (random() * interval '120 days'), now(),
      '', '', '', ''
    );
    insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    select gen_random_uuid(), u.id, u.id::text,
           jsonb_build_object('sub', u.id::text, 'email', u.email, 'email_verified', true),
           'email', now(), now(), now()
    from auth.users u where u.id = uid;

    if i = 0 then
      admin_id := uid;
    else
      pats := pats || uid;
    end if;
  end loop;

  update public.profiles set role = 'admin' where id = admin_id;

  -- ── Un bloqueo de agenda de ejemplo (viernes de la próxima semana, tarde) ──
  insert into public.time_off (professional_id, starts_at, ends_at, reason)
  select pro, (x.fri + time '14:00') at time zone tz, (x.fri + time '18:00') at time zone tz, 'Congreso de odontología'
  from (select (today + 7 + ((5 - extract(dow from today)::int + 7) % 7))::date as fri) x;

  -- ── Turnos: 3 semanas atrás y 2 adelante ─────────────────────────
  for d in select generate_series(today - 21, today + 14, interval '1 day')::date loop
    for blk in
      select start_time, end_time from public.working_hours
      where professional_id = pro and weekday = extract(dow from d)
      order by start_time
    loop
      t := d + blk.start_time;
      loop
        select * into svc from public.services where active order by random() limit 1;
        exit when t + make_interval(mins => svc.duration_min) > d + blk.end_time;
        starts := t at time zone tz;
        if exists (
          select 1 from public.time_off o
          where o.professional_id = pro
            and tstzrange(o.starts_at, o.ends_at) && tstzrange(starts, starts + make_interval(mins => svc.duration_min))
        ) then
          t := t + interval '30 minutes';
          continue;
        end if;

        -- Ocupación: alta en el pasado, decreciente hacia el futuro.
        occ := case when starts < now() then 0.6 when d <= today + 7 then 0.45 else 0.25 end;
        if random() < occ then
          r := random();
          if starts < now() then
            st := case when r < 0.82 then 'completed' when r < 0.91 then 'no_show' else 'cancelled' end;
          else
            st := case when d <= today + 7 and r < 0.35 then 'pending' when r > 0.95 then 'cancelled' else 'confirmed' end;
          end if;
          pat := pats[1 + floor(random() * array_length(pats, 1))::int];

          insert into public.appointments (
            patient_id, professional_id, service_id, starts_at, ends_at, status, patient_notes,
            created_by, confirmed_at, cancelled_at, created_at
          ) values (
            pat, pro, svc.id, starts, starts + make_interval(mins => svc.duration_min), st,
            case when random() < 0.35 then notes[1 + floor(random() * array_length(notes, 1))::int] end,
            pat,
            case when st in ('confirmed', 'completed', 'no_show') then least(now(), starts - interval '2 days') end,
            case when st = 'cancelled' then least(now(), starts - interval '1 day') end,
            case when st = 'pending' then now() - (random() * interval '20 hours')
                 else least(now(), starts) - (interval '3 days' + random() * interval '10 days') end
          ) returning id into appt;

          insert into public.appointment_events (appointment_id, actor_id, from_status, to_status, created_at)
          values (appt, pat, null, 'pending', now() - interval '3 days');
          if st <> 'pending' then
            insert into public.appointment_events (appointment_id, actor_id, from_status, to_status, note, created_at)
            values (appt, case when st = 'cancelled' then pat else admin_id end,
                    (case when st in ('completed', 'no_show') then 'confirmed' else 'pending' end)::public.appointment_status, st,
                    case when st = 'cancelled' then 'Cancelado por el paciente' end, least(now(), starts));
          end if;

          -- Siguiente inicio redondeado a bloques de 15 min (como los ofrece la app).
          t := t + make_interval(mins => svc.duration_min);
          t := date_trunc('hour', t) + ceil(extract(minute from t) / 15.0) * interval '15 minutes';
        else
          t := t + interval '30 minutes';
        end if;
      end loop;
    end loop;
  end loop;

  raise notice 'Demo cargada: % pacientes, % turnos. Admin: %', array_length(pats, 1),
    (select count(*) from public.appointments), v_admin_email;
end $$;
