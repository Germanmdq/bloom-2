-- =============================================
-- SEED RECIPES (Ejecutar Manualmente)
-- =============================================

DO $$
DECLARE
    -- Products (Menu)
    p_jarrito UUID;
    p_tostado UUID;
    
    -- Raw Materials (Insumos)
    r_cafe UUID;
    r_leche UUID;
    r_pan_miga UUID;
    r_jamon UUID;
    r_queso UUID;
BEGIN
    -- 1. GET IDs
    SELECT id INTO p_jarrito FROM public.products WHERE name = 'Café jarrito' LIMIT 1;
    SELECT id INTO p_tostado FROM public.products WHERE name = 'Tostado de miga' LIMIT 1;
    
    SELECT id INTO r_cafe FROM public.products WHERE name = 'Café Grano' AND kind = 'raw' LIMIT 1;
    SELECT id INTO r_leche FROM public.products WHERE name = 'Leche' AND kind = 'raw' LIMIT 1;
    SELECT id INTO r_pan_miga FROM public.products WHERE name = 'Pan Miga' AND kind = 'raw' LIMIT 1;
    SELECT id INTO r_jamon FROM public.products WHERE name = 'Jamón Cocido' AND kind = 'raw' LIMIT 1;
    SELECT id INTO r_queso FROM public.products WHERE name = 'Queso Tybo' AND kind = 'raw' LIMIT 1;

    -- 2. INSERT RECIPES
    -- Recipe: Café jarrito (18g coffee)
    IF p_jarrito IS NOT NULL AND r_cafe IS NOT NULL THEN
        INSERT INTO public.recipes (menu_product_id, raw_product_id, qty)
        VALUES (p_jarrito, r_cafe, 18)
        ON CONFLICT (menu_product_id, raw_product_id) DO UPDATE SET qty = EXCLUDED.qty;
    END IF;

    -- Recipe: Tostado (2 pan, 30g jamon, 30g queso)
    IF p_tostado IS NOT NULL AND r_pan_miga IS NOT NULL THEN
        INSERT INTO public.recipes (menu_product_id, raw_product_id, qty)
        VALUES (p_tostado, r_pan_miga, 2)
        ON CONFLICT (menu_product_id, raw_product_id) DO UPDATE SET qty = EXCLUDED.qty;
        
        INSERT INTO public.recipes (menu_product_id, raw_product_id, qty)
        VALUES (p_tostado, r_jamon, 30)
        ON CONFLICT (menu_product_id, raw_product_id) DO UPDATE SET qty = EXCLUDED.qty;
        
        INSERT INTO public.recipes (menu_product_id, raw_product_id, qty)
        VALUES (p_tostado, r_queso, 30)
        ON CONFLICT (menu_product_id, raw_product_id) DO UPDATE SET qty = EXCLUDED.qty;
    END IF;
    
END $$;
