-- Consolidar el catálogo público en cuatro categorías simples.
-- No borra productos: primero reasigna todos los category_id y recién después
-- elimina las categorías anteriores.

DO $$
DECLARE
  menu_dia_id UUID := 'd0010000-0000-4000-8000-000000000001';
  cafeteria_id UUID := 'd0010000-0000-4000-8000-000000000002';
  platos_id UUID := 'd0010000-0000-4000-8000-000000000003';
  ofertas_id UUID := 'd0010000-0000-4000-8000-000000000004';
BEGIN
  INSERT INTO public.categories (id, name, icon, sort_order)
  VALUES
    (menu_dia_id, 'Menú del día', '⭐', 1),
    (cafeteria_id, 'Cafetería', '☕', 2),
    (platos_id, 'Platos', '🍽️', 3),
    (ofertas_id, 'Ofertas', '🏷️', 4)
  ON CONFLICT (id) DO UPDATE
    SET name = EXCLUDED.name, icon = EXCLUDED.icon, sort_order = EXCLUDED.sort_order;

  -- Agrupar los productos de cada categoría anterior.
  UPDATE public.products AS product
  SET category_id = CASE
    WHEN lower(category.name) IN ('plato del día', 'platos diarios') THEN menu_dia_id
    WHEN lower(category.name) = 'promociones' THEN ofertas_id
    WHEN lower(category.name) IN (
      'cafetería', 'cafetería delivery', 'bebidas', 'jugos y licuados',
      'desayunos y meriendas', 'panificados', 'pastelería', 'postres'
    ) THEN cafeteria_id
    ELSE platos_id
  END
  FROM public.categories AS category
  WHERE product.category_id = category.id
    AND category.id NOT IN (menu_dia_id, cafeteria_id, platos_id, ofertas_id);

  -- También cubre cualquier producto que no tuviera categoría.
  UPDATE public.products
  SET category_id = platos_id
  WHERE category_id IS NULL;

  -- Ya no queda ningún producto referenciando las categorías antiguas.
  DELETE FROM public.categories
  WHERE id NOT IN (menu_dia_id, cafeteria_id, platos_id, ofertas_id);
END $$;
