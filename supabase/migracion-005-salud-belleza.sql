-- Migración 005: categorías de Salud y belleza + 11 productos nuevos sin precio
-- Pégala completa en Supabase > SQL Editor > Run. Se puede correr varias veces sin duplicar nada.
-- Las fotos viven en GitHub Pages (docs/img/p), así que no usan almacenamiento de Supabase.

do $$
declare c text;
begin
  for c in select conname from pg_constraint
    where conrelid = 'public.productos'::regclass and contype = 'c' and pg_get_constraintdef(oid) ilike '%categoria%'
  loop
    execute format('alter table public.productos drop constraint %I', c);
  end loop;
end $$;

alter table public.productos add constraint productos_categoria_check
  check (categoria in ('deportivos','casuales','tacones','ropa-ninos','ropa-ninas','charms','carteras','salud','vitaminas','piel-cuerpo','cabello'));

insert into public.productos (id, nombre, marca, emoji, categoria, descripcion, precio, precio_oferta, talla, estado, orden, fotos) values
('solanum-omega-3-max', 'Omega 3 Max Solanum', 'Solanum', '🐟', 'vitaminas', 'Omega 3 de salmón salvaje de Alaska con vitaminas A, D3 y E y astaxantina. 🐟

Frasco de 180 cápsulas de 1.4 g. Se toma una cápsula dos veces al día con un vaso de agua.

Este producto no es un medicamento.', null, null, '', 'disponible', 10, array['img/p/solanum-omega-3-max-1.webp','img/p/solanum-omega-3-max-2.webp','img/p/solanum-omega-3-max-3.webp']::text[]),
('solanum-3-magnesios', '3 Magnesios con espirulina y vitamina D3 Solanum', 'Solanum', '💚', 'vitaminas', 'Tres tipos de magnesio (citrato, glicinato y óxido) con espirulina y vitamina D3. 💚

Frasco de 220 cápsulas. Se toman dos cápsulas al día con un vaso de agua, de preferencia con los alimentos.

Este producto no es un medicamento.', null, null, '', 'disponible', 11, array['img/p/solanum-3-magnesios-1.webp','img/p/solanum-3-magnesios-2.webp','img/p/solanum-3-magnesios-3.webp']::text[]),
('justfx-glucosamina', 'Glucosamina Just Fx con condroitina y colágeno', 'Just Fx', '🦴', 'vitaminas', 'Suplemento con glucosamina, condroitina, ácido hialurónico, colágeno, zinc y boro. Fórmula premium de 180 tabletas. ✨

Este producto no es un medicamento.', null, null, '', 'disponible', 12, array['img/p/justfx-glucosamina-1.webp','img/p/justfx-glucosamina-2.webp','img/p/justfx-glucosamina-3.webp']::text[]),
('rocavit-fem', 'Rocavit Fem', 'Vitae', '🌸', 'vitaminas', 'Suplemento alimenticio pensado para mujeres, con vitaminas, minerales, isoflavonas de soya, colágeno y coenzima Q-10. 🌸

Caja con 30 cápsulas.', null, null, '', 'disponible', 13, array['img/p/rocavit-fem-1.webp','img/p/rocavit-fem-2.webp']::text[]),
('honeykeeper-kit-shampoo-crema', 'Kit The Honeykeeper: 2 shampoo 3 en 1 y crema corporal', 'The Honeykeeper', '🍯', 'piel-cuerpo', '¡El kit más tierno! 🐻🍯

Trae 2 shampoo 3 en 1 de manzanilla y miel (700 ml cada uno) y 1 crema corporal de avena (700 ml). Fórmula hipoalergénica, libre de parabenos, sulfatos y lágrimas, con miel orgánica.', null, null, '', 'disponible', 14, array['img/p/honeykeeper-kit-shampoo-crema-1.webp','img/p/honeykeeper-kit-shampoo-crema-2.webp','img/p/honeykeeper-kit-shampoo-crema-3.webp','img/p/honeykeeper-kit-shampoo-crema-4.webp','img/p/honeykeeper-kit-shampoo-crema-5.webp','img/p/honeykeeper-kit-shampoo-crema-6.webp']::text[]),
('lubriderm-reparacion-intensiva', 'Lubriderm Reparación Intensiva 1.5 L', 'Lubriderm', '🧴', 'piel-cuerpo', 'Tamaño familiar de 1.5 litros con dispensador. 🧴

Crema para piel áspera y extra seca, ayuda a reparar la piel de forma continua. Rinde muchísimo.', null, null, '', 'disponible', 15, array['img/p/lubriderm-reparacion-intensiva-1.webp','img/p/lubriderm-reparacion-intensiva-2.webp']::text[]),
('lubriderm-proteccion-solar-fps15', 'Lubriderm Protección Solar FPS 15', 'Lubriderm', '☀️', 'piel-cuerpo', 'Tamaño familiar de 946 ml con dispensador. ☀️

Humectación y protección solar FPS 15 para cara y cuerpo, de rápida absorción y sin sensación grasosa.', null, null, '', 'disponible', 16, array['img/p/lubriderm-proteccion-solar-fps15-1.webp','img/p/lubriderm-proteccion-solar-fps15-2.webp']::text[]),
('lubriderm-humectacion-delicada', 'Lubriderm Humectación Delicada 400 ml', 'Lubriderm', '🩵', 'piel-cuerpo', 'Para piel sensible. 🩵

Mejora la hidratación y está libre de fragancia, colorantes, parabenos y lanolina. Botella de 400 ml.', null, null, '', 'disponible', 17, array['img/p/lubriderm-humectacion-delicada-1.webp','img/p/lubriderm-humectacion-delicada-2.webp']::text[]),
('lubriderm-humectacion-diaria', 'Lubriderm Humectación Diaria 400 ml', 'Lubriderm', '💙', 'piel-cuerpo', 'Para piel normal a seca. 💙

Fórmula ligera con glicerina y emolientes, de rápida absorción. Botella de 400 ml.', null, null, '', 'disponible', 18, array['img/p/lubriderm-humectacion-diaria-1.webp','img/p/lubriderm-humectacion-diaria-2.webp']::text[]),
('elvive-oleo-extraordinario', 'Elvive Óleo Extraordinario L''Oréal', 'L''Oréal', '✨', 'cabello', 'El aceite capilar favorito para cabello seco. ✨

Unas gotitas dejan el cabello suave, brillante y sin frizz.', null, null, '', 'disponible', 19, array['img/p/elvive-oleo-extraordinario-1.webp','img/p/elvive-oleo-extraordinario-2.webp']::text[]),
('perfect-care-mascarilla-biotina', 'Mascarilla capilar Perfect Care con biotina y colágeno', 'Perfect Care', '💜', 'cabello', 'Mascarilla tipo salón con biotina y colágeno, acondicionamiento profundo de 48 horas para un cabello más suave. 💜

Frasco de 800 g. Se aplica en el cabello húmedo después del shampoo, se deja 5 minutos y se enjuaga.', null, null, '', 'disponible', 20, array['img/p/perfect-care-mascarilla-biotina-1.webp','img/p/perfect-care-mascarilla-biotina-2.webp','img/p/perfect-care-mascarilla-biotina-3.webp']::text[])
on conflict (id) do nothing;
