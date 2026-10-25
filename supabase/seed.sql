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
