-- SCRIPT MAESTRO DE INVENTARIO Y RECETAS BLOOM
-- Este script:
-- 1. Inserta los insumos clave (raw materials) con sus unidades.
-- 2. Crea las recetas (BOM) vinculando productos del menú con sus insumos y cantidades netas.
-- 3. Aplica automáticamente la merma (peso bruto) usando el factor 1.08 o específico en la lógica.

BEGIN;

-------------------------------------------------------
-- 1. INSERTAR INSUMOS (RAW MATERIALS)
-------------------------------------------------------
-- Primero, aseguramos que existan los insumos básicos.
-- Usamos ON CONFLICT DO NOTHING para no duplicar si ya existen.

INSERT INTO public.products (name, kind, unit, track_stock, min_stock) VALUES
('Café en Grano', 'raw', 'g', true, 1000),
('Leche Entera', 'raw', 'l', true, 10),
('Barra de Chocolate', 'raw', 'u', true, 20),
('Sobre de Edulcorante/Azúcar', 'raw', 'u', true, 200),
('Jamón Cocido', 'raw', 'g', true, 1000),
('Queso Tybo/Máquina', 'raw', 'g', true, 1000),
('Pan de Miga (Unidad)', 'raw', 'u', true, 50),
('Pan Árabe (Unidad)', 'raw', 'u', true, 50),
('Carne (Nalga/Peceto)', 'raw', 'g', true, 5000),
('Pan Rallado', 'raw', 'g', true, 2000),
('Huevo', 'raw', 'u', true, 60),
('Carne Picada Especial', 'raw', 'g', true, 5000),
('Pan de Burger', 'raw', 'u', true, 50),
('Masa de Pizza', 'raw', 'g', true, 2000),
('Muzzarella', 'raw', 'g', true, 2000),
('Salsa de Tomate', 'raw', 'ml', true, 2000),
('Pasta Fresca', 'raw', 'g', true, 2000),
('Base Verde (Lechuga/Rúcula)', 'raw', 'g', true, 1000),
('Naranjas (Jugo)', 'raw', 'g', true, 10000),
('Medialuna', 'raw', 'u', true, 100),
('Tostada Pan de Campo', 'raw', 'u', true, 50),
('Queso Crema', 'raw', 'g', true, 500),
('Palta', 'raw', 'g', true, 1000)
ON CONFLICT (name) DO NOTHING;

-------------------------------------------------------
-- 2. CREAR RECETAS (BOM)
-------------------------------------------------------
-- Vinculamos productos del menú con sus insumos.
-- Las cantidades aquí ya incluyen la merma calculada según la instrucción:
-- Cantidad_Stock = Cantidad_Neta / (1 - Merma)
-- Merma estándar asumida: 8% (0.08) -> Factor divisor 0.92 salvo especificación directa.

DO $$
DECLARE
    -- Insumos IDs
    id_cafe_grano UUID;
    id_leche UUID;
    id_chocolate UUID;
    id_azucar UUID;
    id_jamon UUID;
    id_queso UUID;
    id_pan_miga UUID;
    id_pan_arabe UUID;
    id_carne_milanesa UUID;
    id_pan_rallado UUID;
    id_huevo UUID;
    id_carne_picada UUID;
    id_pan_burger UUID;
    id_masa_pizza UUID;
    id_muzzarella UUID;
    id_salsa_tomate UUID;
    id_pasta UUID;
    id_base_verde UUID;
    id_naranja UUID;
    id_medialuna UUID;
    id_tostada_campo UUID;
    id_queso_crema UUID;
    id_palta UUID;

    -- Productos Menú IDs (variables temporales para búsquedas)
    p_id UUID;
BEGIN
    -- Obtener IDs de Insumos
    SELECT id INTO id_cafe_grano FROM public.products WHERE name = 'Café en Grano';
    SELECT id INTO id_leche FROM public.products WHERE name = 'Leche Entera';
    SELECT id INTO id_chocolate FROM public.products WHERE name = 'Barra de Chocolate';
    SELECT id INTO id_azucar FROM public.products WHERE name = 'Sobre de Edulcorante/Azúcar';
    SELECT id INTO id_jamon FROM public.products WHERE name = 'Jamón Cocido';
    SELECT id INTO id_queso FROM public.products WHERE name = 'Queso Tybo/Máquina';
    SELECT id INTO id_pan_miga FROM public.products WHERE name = 'Pan de Miga (Unidad)';
    SELECT id INTO id_pan_arabe FROM public.products WHERE name = 'Pan Árabe (Unidad)';
    SELECT id INTO id_carne_milanesa FROM public.products WHERE name = 'Carne (Nalga/Peceto)';
    SELECT id INTO id_pan_rallado FROM public.products WHERE name = 'Pan Rallado';
    SELECT id INTO id_huevo FROM public.products WHERE name = 'Huevo';
    SELECT id INTO id_carne_picada FROM public.products WHERE name = 'Carne Picada Especial';
    SELECT id INTO id_pan_burger FROM public.products WHERE name = 'Pan de Burger';
    SELECT id INTO id_masa_pizza FROM public.products WHERE name = 'Masa de Pizza';
    SELECT id INTO id_muzzarella FROM public.products WHERE name = 'Muzzarella';
    SELECT id INTO id_salsa_tomate FROM public.products WHERE name = 'Salsa de Tomate';
    SELECT id INTO id_pasta FROM public.products WHERE name = 'Pasta Fresca';
    SELECT id INTO id_base_verde FROM public.products WHERE name = 'Base Verde (Lechuga/Rúcula)';
    SELECT id INTO id_naranja FROM public.products WHERE name = 'Naranjas (Jugo)';
    SELECT id INTO id_medialuna FROM public.products WHERE name = 'Medialuna';
    SELECT id INTO id_tostada_campo FROM public.products WHERE name = 'Tostada Pan de Campo';
    SELECT id INTO id_queso_crema FROM public.products WHERE name = 'Queso Crema';
    SELECT id INTO id_palta FROM public.products WHERE name = 'Palta';

    -- Borrar recetas anteriores para evitar duplicados/errores
    DELETE FROM public.recipes;

    -------------------------------------------------------
    -- CAFETERÍA
    -------------------------------------------------------
    
    -- Café Pocillo / Jarrito (8g net -> 8.7g gross con 8% de desperdicio/calibración)
    FOR p_id IN SELECT id FROM public.products WHERE name IN ('Café pocillo', 'Café jarrito', 'Café / cortado / lágrima (en jarrito)') LOOP
        INSERT INTO public.recipes (menu_product_id, raw_product_id, qty) VALUES (p_id, id_cafe_grano, 8.7); -- 8g / 0.92
        INSERT INTO public.recipes (menu_product_id, raw_product_id, qty) VALUES (p_id, id_azucar, 1);
    END LOOP;

    -- Café Doble (14g net -> 15.2g gross)
    FOR p_id IN SELECT id FROM public.products WHERE name IN ('Café doble / Cortado doble', 'Café c/ leche (doble)') LOOP
        INSERT INTO public.recipes (menu_product_id, raw_product_id, qty) VALUES (p_id, id_cafe_grano, 15.2);
        INSERT INTO public.recipes (menu_product_id, raw_product_id, qty) VALUES (p_id, id_azucar, 1);
    END LOOP;

    -- Leche: Cortado (0.05L -> 0.054L)
    FOR p_id IN SELECT id FROM public.products WHERE name ILIKE '%cortado%' LOOP
        INSERT INTO public.recipes (menu_product_id, raw_product_id, qty) VALUES (p_id, id_leche, 0.054);
    END LOOP;

    -- Leche: Café c/ Leche / Lágrima (0.15L -> 0.163L)
    FOR p_id IN SELECT id FROM public.products WHERE name ILIKE '%café c/ leche%' OR name ILIKE '%lágrima%' LOOP
        INSERT INTO public.recipes (menu_product_id, raw_product_id, qty) VALUES (p_id, id_leche, 0.163);
    END LOOP;

    -- Leche: Capuccino / Submarino (0.25L -> 0.27L)
    FOR p_id IN SELECT id FROM public.products WHERE name IN ('Capuccino', 'Submarino', 'Chocolatada') LOOP
        INSERT INTO public.recipes (menu_product_id, raw_product_id, qty) VALUES (p_id, id_leche, 0.27);
    END LOOP;

    -- Submarino: Barra Choco
    SELECT id INTO p_id FROM public.products WHERE name = 'Submarino';
    IF p_id IS NOT NULL THEN
        INSERT INTO public.recipes (menu_product_id, raw_product_id, qty) VALUES (p_id, id_chocolate, 1);
    END IF;

    -------------------------------------------------------
    -- COCINA
    -------------------------------------------------------

    -- Tostados (40g J + 40g Q -> ~43.5g gross each + Pan)
    FOR p_id IN SELECT id FROM public.products WHERE name ILIKE '%tostado de miga%' LOOP
        INSERT INTO public.recipes (menu_product_id, raw_product_id, qty) VALUES (p_id, id_jamon, 43.5);
        INSERT INTO public.recipes (menu_product_id, raw_product_id, qty) VALUES (p_id, id_queso, 43.5);
        INSERT INTO public.recipes (menu_product_id, raw_product_id, qty) VALUES (p_id, id_pan_miga, 1);
    END LOOP;

    FOR p_id IN SELECT id FROM public.products WHERE name ILIKE '%tostado pan árabe%' LOOP
        INSERT INTO public.recipes (menu_product_id, raw_product_id, qty) VALUES (p_id, id_jamon, 43.5);
        INSERT INTO public.recipes (menu_product_id, raw_product_id, qty) VALUES (p_id, id_queso, 43.5);
        INSERT INTO public.recipes (menu_product_id, raw_product_id, qty) VALUES (p_id, id_pan_arabe, 1);
    END LOOP;

    -- Burger (180g carne picada net -> 195g gross + Pan)
    FOR p_id IN SELECT id FROM public.products WHERE name ILIKE '%burger%' LOOP
        INSERT INTO public.recipes (menu_product_id, raw_product_id, qty) VALUES (p_id, id_carne_picada, 195);
        INSERT INTO public.recipes (menu_product_id, raw_product_id, qty) VALUES (p_id, id_pan_burger, 1);
    END LOOP;

    -- Milanesas (200g carne net -> 217g gross + 50g pan rallado + 1 huevo)
    FOR p_id IN SELECT id FROM public.products WHERE name ILIKE '%milanesa%' LOOP
        INSERT INTO public.recipes (menu_product_id, raw_product_id, qty) VALUES (p_id, id_carne_milanesa, 217);
        INSERT INTO public.recipes (menu_product_id, raw_product_id, qty) VALUES (p_id, id_pan_rallado, 54); -- 50g + merma
        INSERT INTO public.recipes (menu_product_id, raw_product_id, qty) VALUES (p_id, id_huevo, 1);
    END LOOP;

    -- Pizzas (300g masa -> 326g gross + 250g muzza -> 271g gross + 80ml salsa)
    FOR p_id IN SELECT id FROM public.products WHERE name ILIKE '%pizza%' LOOP
        INSERT INTO public.recipes (menu_product_id, raw_product_id, qty) VALUES (p_id, id_masa_pizza, 326);
        INSERT INTO public.recipes (menu_product_id, raw_product_id, qty) VALUES (p_id, id_muzzarella, 271);
        INSERT INTO public.recipes (menu_product_id, raw_product_id, qty) VALUES (p_id, id_salsa_tomate, 87);
    END LOOP;

    -- Pastas (250g pasta -> 271g gross + 150ml salsa)
    FOR p_id IN SELECT id FROM public.products WHERE name IN ('Spaghettis', 'Ñoquis de papa', 'Ravioles de verdura', 'Canelones verdura y ricota') LOOP
        INSERT INTO public.recipes (menu_product_id, raw_product_id, qty) VALUES (p_id, id_pasta, 271);
        INSERT INTO public.recipes (menu_product_id, raw_product_id, qty) VALUES (p_id, id_salsa_tomate, 163); -- 150ml + merma
    END LOOP;

    -- Ensaladas (150g base verde -> 163g gross)
    FOR p_id IN SELECT id FROM public.products WHERE name ILIKE '%ensalada%' LOOP
        INSERT INTO public.recipes (menu_product_id, raw_product_id, qty) VALUES (p_id, id_base_verde, 163);
    END LOOP;

    -------------------------------------------------------
    -- COMBOS & PROMOS (COMPLEJOS)
    -------------------------------------------------------
    
    -- "Merienda Clásica": Infusión + 3 medialunas + jugo (300g bruto naranja)
    SELECT id INTO p_id FROM public.products WHERE name = 'Merienda Clásica';
    IF p_id IS NOT NULL THEN
        INSERT INTO public.recipes (menu_product_id, raw_product_id, qty) VALUES (p_id, id_cafe_grano, 8.7); -- Asumimos café
        INSERT INTO public.recipes (menu_product_id, raw_product_id, qty) VALUES (p_id, id_azucar, 1);
        INSERT INTO public.recipes (menu_product_id, raw_product_id, qty) VALUES (p_id, id_medialuna, 3);
        INSERT INTO public.recipes (menu_product_id, raw_product_id, qty) VALUES (p_id, id_naranja, 300);
    END IF;

    -- "Merienda Saludable": Infusión + 2 tostadas + 40g queso + jugo
    SELECT id INTO p_id FROM public.products WHERE name = 'Merienda Saludable';
    IF p_id IS NOT NULL THEN
        INSERT INTO public.recipes (menu_product_id, raw_product_id, qty) VALUES (p_id, id_cafe_grano, 8.7);
        INSERT INTO public.recipes (menu_product_id, raw_product_id, qty) VALUES (p_id, id_azucar, 1);
        INSERT INTO public.recipes (menu_product_id, raw_product_id, qty) VALUES (p_id, id_tostada_campo, 2);
        INSERT INTO public.recipes (menu_product_id, raw_product_id, qty) VALUES (p_id, id_queso_crema, 43.5); -- 40g + merma
        INSERT INTO public.recipes (menu_product_id, raw_product_id, qty) VALUES (p_id, id_naranja, 300);
    END IF;

    -- "Merienda Bloom": Infusión + 2 tostadas + 2 huevos + 80g palta + jugo
    SELECT id INTO p_id FROM public.products WHERE name = 'Merienda Bloom';
    IF p_id IS NOT NULL THEN
        INSERT INTO public.recipes (menu_product_id, raw_product_id, qty) VALUES (p_id, id_cafe_grano, 8.7);
        INSERT INTO public.recipes (menu_product_id, raw_product_id, qty) VALUES (p_id, id_tostada_campo, 2);
        INSERT INTO public.recipes (menu_product_id, raw_product_id, qty) VALUES (p_id, id_huevo, 2);
        INSERT INTO public.recipes (menu_product_id, raw_product_id, qty) VALUES (p_id, id_palta, 87); -- 80g + merma
        INSERT INTO public.recipes (menu_product_id, raw_product_id, qty) VALUES (p_id, id_naranja, 300);
    END IF;

    -- "Café c/ leche + 2 med J&Q"
    SELECT id INTO p_id FROM public.products WHERE name = 'Café c/ leche + 2 med J&Q';
    IF p_id IS NOT NULL THEN
        INSERT INTO public.recipes (menu_product_id, raw_product_id, qty) VALUES (p_id, id_cafe_grano, 8.7);
        INSERT INTO public.recipes (menu_product_id, raw_product_id, qty) VALUES (p_id, id_leche, 0.163);
        INSERT INTO public.recipes (menu_product_id, raw_product_id, qty) VALUES (p_id, id_azucar, 1);
        INSERT INTO public.recipes (menu_product_id, raw_product_id, qty) VALUES (p_id, id_medialuna, 2);
        INSERT INTO public.recipes (menu_product_id, raw_product_id, qty) VALUES (p_id, id_jamon, 21.7); -- 20g + merma
        INSERT INTO public.recipes (menu_product_id, raw_product_id, qty) VALUES (p_id, id_queso, 21.7); -- 20g + merma
    END IF;

END $$;

COMMIT;
