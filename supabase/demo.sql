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
