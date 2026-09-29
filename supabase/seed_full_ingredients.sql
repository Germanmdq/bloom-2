-- =============================================
-- SEED FULL INGREDIENTS v3 (ALL INCLUSIVE)
-- =============================================
-- Insumos para CADA item del menú (incluyendo reventa)

DO $$
BEGIN

    -- 1. BEBIDAS (Insumos de Reventa)
    -- Se cargan como productos RAW que luego se asignan 1:1 en recetas
    INSERT INTO public.products (name, kind, unit, track_stock, min_stock, price) VALUES
    ('Agua mineral 500ml', 'raw', 'u', true, 24, 0),
    ('Agua con gas 500ml', 'raw', 'u', true, 24, 0),
    ('Coca Cola 500ml', 'raw', 'u', true, 24, 0),
    ('Coca Cola Zero 500ml', 'raw', 'u', true, 24, 0),
    ('Sprite 500ml', 'raw', 'u', true, 24, 0),
    ('Sprite Zero 500ml', 'raw', 'u', true, 24, 0),
    ('Fanta 500ml', 'raw', 'u', true, 24, 0),
    ('Agua Saborizada Naranja', 'raw', 'u', true, 12, 0),
    ('Agua Saborizada Pomelo', 'raw', 'u', true, 12, 0),
    ('Agua Saborizada Manzana', 'raw', 'u', true, 12, 0),
    ('Cerveza Lata 473ml', 'raw', 'u', true, 24, 0),
    ('Cerveza Botella 1L', 'raw', 'u', true, 12, 0),
    ('Vino Malbec 750ml', 'raw', 'u', true, 6, 0),
    ('Vino Blanco 750ml', 'raw', 'u', true, 6, 0)
    ON CONFLICT DO NOTHING;

    -- 2. VEGETALES Y FRUTAS (Menu Completo)
    INSERT INTO public.products (name, kind, unit, track_stock, min_stock, price) VALUES
    ('Limón', 'raw', 'kg', true, 5, 0),
    ('Banana', 'raw', 'kg', true, 5, 0),
    ('Frutilla', 'raw', 'kg', true, 2, 0),
    ('Lechuga', 'raw', 'kg', true, 10, 0),
    ('Tomate', 'raw', 'kg', true, 10, 0),
    ('Tomate Cherry', 'raw', 'kg', true, 2, 0),
    ('Zanahoria', 'raw', 'kg', true, 5, 0),
    ('Palta', 'raw', 'kg', true, 5, 0),
    ('Choclo', 'raw', 'kg', true, 5, 0),
    ('Rúcula', 'raw', 'kg', true, 3, 0),
    ('Cebolla', 'raw', 'kg', true, 10, 0),
    ('Morrón', 'raw', 'kg', true, 5, 0),
    ('Papa', 'raw', 'kg', true, 50, 0),
    ('Calabaza', 'raw', 'kg', true, 10, 0),
    ('Acelga/Espinaca', 'raw', 'kg', true, 5, 0),
    ('Champignones', 'raw', 'kg', true, 2, 0)
    ON CONFLICT DO NOTHING;

    -- 3. CARNES, PESCADOS Y HUEVOS
    INSERT INTO public.products (name, kind, unit, track_stock, min_stock, price) VALUES
    ('Pollo (Pechuga/Muslo)', 'raw', 'kg', true, 20, 0),
    ('Carne Picada', 'raw', 'kg', true, 10, 0),
    ('Nalga (Milanesa)', 'raw', 'kg', true, 15, 0),
    ('Bife de Costilla', 'raw', 'kg', true, 10, 0),
    ('Jamón Crudo', 'raw', 'kg', true, 2, 0),
    ('Filet de Merluza', 'raw', 'kg', true, 5, 0),
    ('Huevos', 'raw', 'u', true, 100, 0)
    ON CONFLICT DO NOTHING;

    -- 4. LÁCTEOS Y FIAMBRES
    INSERT INTO public.products (name, kind, unit, track_stock, min_stock, price) VALUES
    ('Leche', 'raw', 'l', true, 50, 0),
    ('Manteca', 'raw', 'g', true, 2000, 0),
    ('Queso Tybo (Barra)', 'raw', 'kg', true, 10, 0),
    ('Jamón Cocido', 'raw', 'kg', true, 10, 0),
    ('Queso Parmesano', 'raw', 'kg', true, 5, 0),
    ('Queso Muzzarella', 'raw', 'kg', true, 20, 0),
    ('Ricota', 'raw', 'kg', true, 5, 0),
    ('Dulce de Leche', 'raw', 'kg', true, 10, 0),
    ('Crema de Leche', 'raw', 'ml', true, 5000, 0)
    ON CONFLICT DO NOTHING;

    -- 5. ALMACÉN Y VARIOS
    INSERT INTO public.products (name, kind, unit, track_stock, min_stock, price) VALUES
    ('Café Grano', 'raw', 'kg', true, 10, 0),
    ('Azúcar', 'raw', 'kg', true, 10, 0),
    ('Chocolate Taza/Submarino', 'raw', 'g', true, 1000, 0),
    ('Té (Saquitos)', 'raw', 'u', true, 100, 0),
    ('Yerba Mate', 'raw', 'kg', true, 10, 0),
    ('Pan Rallado', 'raw', 'kg', true, 10, 0),
    ('Arroz', 'raw', 'kg', true, 10, 0),
    ('Lentejas', 'raw', 'kg', true, 5, 0),
    ('Fideos/Pasta Seca', 'raw', 'kg', true, 10, 0),
    ('Salsa de Tomate', 'raw', 'l', true, 20, 0),
    ('Aceite', 'raw', 'l', true, 50, 0),
    ('Vinagre/Aceto', 'raw', 'l', true, 5, 0),
    ('Sal', 'raw', 'kg', true, 5, 0),
    ('Granola', 'raw', 'g', true, 2000, 0),
    ('Cacao en polvo', 'raw', 'g', true, 1000, 0),
    ('Croutons', 'raw', 'kg', true, 2, 0),
    ('Salsa Caesar', 'raw', 'l', true, 5, 0)
    ON CONFLICT DO NOTHING;

    -- 6. PANIFICADOS (INSUMOS)
    INSERT INTO public.products (name, kind, unit, track_stock, min_stock, price) VALUES
    ('Pan Miga', 'raw', 'u', true, 5, 0),
    ('Pan Burger', 'raw', 'u', true, 24, 0),
    ('Pan Árabe', 'raw', 'u', true, 24, 0),
    ('Pan de Campo', 'raw', 'kg', true, 5, 0),
    ('Tapas de Empanada', 'raw', 'u', true, 100, 0),
    ('Prepizza', 'raw', 'u', true, 10, 0),
    ('Medialunas', 'raw', 'u', true, 50, 0),
    ('Facturas Surtidas', 'raw', 'u', true, 50, 0)
    ON CONFLICT DO NOTHING;

    -- ========================================================
    -- CARGA DE STOCK INICIAL (Auto-refill)
    -- ========================================================
    INSERT INTO public.inventory_movements (raw_product_id, qty, reason, note)
    SELECT id, 500, 'opening', 'Stock Inicial Automático'
    FROM public.products 
    WHERE kind = 'raw' 
    AND id NOT IN (SELECT raw_product_id FROM public.inventory_movements);

END $$;