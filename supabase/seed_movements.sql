-- =============================================
-- SEED OPENING STOCK (Ejecutar Manualmente)
-- =============================================

DO $$
DECLARE
    -- Raw Materials IDs
    r_cafe UUID;
    r_leche UUID;
    r_azucar UUID;
    r_harina UUID;
    r_manteca UUID;
    r_huevos UUID;
    r_naranja UUID;
    r_jamon UUID;
    r_queso UUID;
    r_pan UUID;
    r_medialunas UUID;
BEGIN
    -- 1. GET IDs
    SELECT id INTO r_cafe FROM public.products WHERE name = 'Café Grano' AND kind = 'raw' LIMIT 1;
    SELECT id INTO r_leche FROM public.products WHERE name = 'Leche' AND kind = 'raw' LIMIT 1;
    SELECT id INTO r_azucar FROM public.products WHERE name = 'Azúcar' AND kind = 'raw' LIMIT 1;
    SELECT id INTO r_harina FROM public.products WHERE name = 'Harina 0000' AND kind = 'raw' LIMIT 1;
    SELECT id INTO r_manteca FROM public.products WHERE name = 'Manteca' AND kind = 'raw' LIMIT 1;
    SELECT id INTO r_huevos FROM public.products WHERE name = 'Huevos' AND kind = 'raw' LIMIT 1;
    SELECT id INTO r_naranja FROM public.products WHERE name = 'Naranja' AND kind = 'raw' LIMIT 1;
    SELECT id INTO r_jamon FROM public.products WHERE name = 'Jamón Cocido' AND kind = 'raw' LIMIT 1;
    SELECT id INTO r_queso FROM public.products WHERE name = 'Queso Tybo' AND kind = 'raw' LIMIT 1;
    SELECT id INTO r_pan FROM public.products WHERE name = 'Pan Miga' AND kind = 'raw' LIMIT 1;
    SELECT id INTO r_medialunas FROM public.products WHERE name = 'Medialunas' AND kind = 'raw' LIMIT 1;

    -- 2. INSERT MOVEMENTS (OPENING STOCK)
    -- Insert only if stock is 0 (no movements)
    
    -- Café (10kg)
    IF r_cafe IS NOT NULL THEN
        INSERT INTO public.inventory_movements (raw_product_id, qty, reason, note)
        VALUES (r_cafe, 10000, 'opening', 'Stock Inicial Manual');
    END IF;

    -- Leche (50L)
    IF r_leche IS NOT NULL THEN
        INSERT INTO public.inventory_movements (raw_product_id, qty, reason, note)
        VALUES (r_leche, 50000, 'opening', 'Stock Inicial Manual');
    END IF;

    -- Azúcar (10kg)
    IF r_azucar IS NOT NULL THEN
        INSERT INTO public.inventory_movements (raw_product_id, qty, reason, note)
        VALUES (r_azucar, 10000, 'opening', 'Stock Inicial Manual');
    END IF;

    -- Harina (10kg)
    IF r_harina IS NOT NULL THEN
        INSERT INTO public.inventory_movements (raw_product_id, qty, reason, note)
        VALUES (r_harina, 100, 'opening', 'Stock Inicial Manual');
    END IF;

    -- Manteca (2kg)
    IF r_manteca IS NOT NULL THEN
        INSERT INTO public.inventory_movements (raw_product_id, qty, reason, note)
        VALUES (r_manteca, 2000, 'opening', 'Stock Inicial Manual');
    END IF;

    -- Huevos (5 maples = 150u)
    IF r_huevos IS NOT NULL THEN
        INSERT INTO public.inventory_movements (raw_product_id, qty, reason, note)
        VALUES (r_huevos, 150, 'opening', 'Stock Inicial Manual');
    END IF;
    
    -- Naranja (20kg)
    IF r_naranja IS NOT NULL THEN
        INSERT INTO public.inventory_movements (raw_product_id, qty, reason, note)
        VALUES (r_naranja, 20, 'opening', 'Stock Inicial Manual');
    END IF;

    -- Jamon (5kg)
    IF r_jamon IS NOT NULL THEN
        INSERT INTO public.inventory_movements (raw_product_id, qty, reason, note)
        VALUES (r_jamon, 5000, 'opening', 'Stock Inicial Manual');
    END IF;

    -- Queso (5kg)
    IF r_queso IS NOT NULL THEN
        INSERT INTO public.inventory_movements (raw_product_id, qty, reason, note)
        VALUES (r_queso, 5000, 'opening', 'Stock Inicial Manual');
    END IF;

    -- Pan Miga (5u - paquetes?)
    IF r_pan IS NOT NULL THEN
        INSERT INTO public.inventory_movements (raw_product_id, qty, reason, note)
        VALUES (r_pan, 100, 'opening', 'Stock Inicial Manual');
    END IF;

END $$;
