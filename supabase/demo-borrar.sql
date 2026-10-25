-- Borra los datos de DEMO (pacientes @demo.invalid, sus turnos y el admin de demo).
-- ✏️ Cambia el email si usaste otro para el admin de demo. Ejecútalo antes de abrir al público.
delete from public.time_off where reason = 'Congreso de odontología';
delete from auth.users where email like '%@demo.invalid' or email = 'recepcion@demo.hn';
-- Los perfiles, turnos e historial se borran en cascada.
