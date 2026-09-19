-- Opciones agrupadas (BloomChat `options.groups`)

UPDATE public.products
SET options = '{"groups": [{"name": "Tipo", "min": 1, "max": 1, "options": ["Vacuna", "Pollo"]}, {"name": "Guarnición", "min": 1, "max": 1, "options": ["Papas Fritas", "Puré de Papa", "Ensalada Mixta"]}]}'::jsonb
WHERE name ILIKE '%milanesa%' AND active = true;

UPDATE public.products
SET options = '{"groups": [{"name": "Guarnición", "min": 1, "max": 1, "options": ["Papas Fritas", "Puré de Papa", "Puré de Calabaza", "Ensalada Mixta"]}, {"name": "Punto de cocción", "min": 1, "max": 1, "options": ["A Punto", "Cocido", "Jugoso"]}]}'::jsonb
WHERE name ILIKE '%bife%' AND active = true;

UPDATE public.products
SET options = '{"groups": [{"name": "Guarnición", "min": 1, "max": 1, "options": ["Papas Fritas", "Puré de Papa", "Ensalada Mixta"]}, {"name": "Punto de cocción", "min": 1, "max": 1, "options": ["A Punto", "Cocido", "Jugoso"]}]}'::jsonb
WHERE name ILIKE '%lomo%' AND active = true;

UPDATE public.products
SET options = '{"groups": [{"name": "Preparación", "min": 1, "max": 1, "options": ["Empanado", "A la Romana"]}, {"name": "Guarnición", "min": 1, "max": 1, "options": ["Papas Fritas", "Ensalada", "Puré"]}]}'::jsonb
WHERE name ILIKE '%filet%' AND active = true;

UPDATE public.products
SET options = '{"groups": [{"name": "Salsa", "min": 1, "max": 1, "options": ["Filetto", "Crema", "Mixta", "Bolognesa", "Parisienne", "Pesto"]}]}'::jsonb
WHERE category_id IN (SELECT id FROM public.categories WHERE name ILIKE '%pasta%') AND active = true;

UPDATE public.products
SET options = '{"groups": [{"name": "Adicionales", "min": 0, "max": 5, "options": ["Bacon extra", "Cebolla caramelizada", "Huevo", "Cheddar"]}]}'::jsonb
WHERE category_id IN (SELECT id FROM public.categories WHERE name ILIKE '%hambur%') AND active = true;
