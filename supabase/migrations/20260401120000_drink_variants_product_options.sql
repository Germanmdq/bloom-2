-- Variantes de bebidas en products.options (jsonb) para Bloom / menú web
UPDATE public.products
SET options = '{"variants": ["Coca Cola", "Coca Zero"]}'::jsonb
WHERE name ILIKE '%coca%' AND active = true;

UPDATE public.products
SET options = '{"variants": ["Sprite", "Sprite Zero"]}'::jsonb
WHERE name ILIKE '%sprite%' AND active = true;

UPDATE public.products
SET options = '{"variants": ["Aquarius Manzana", "Aquarius Pomelo", "Aquarius Naranja", "Aquarius Pera"]}'::jsonb
WHERE name ILIKE '%aquarius%' AND active = true;

UPDATE public.products
SET options = '{"variants": ["Con gas", "Sin gas"]}'::jsonb
WHERE name ILIKE '%ivess%' AND active = true;

-- Fanta y Schweppes: sin variants (un solo ítem; no tocar options si ya tienen extras)
