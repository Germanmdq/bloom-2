-- MIGración CONSOLIDADA: BLOOM COFFEE & MORE
-- Este script agrupa las 17 categorías originales en 6 grupos principales para mayor rapidez.

BEGIN;

-- 1. Limpiar datos anteriores
TRUNCATE public.products CASCADE;
TRUNCATE public.categories CASCADE;

-- 2. Insertar Categorías Consolidadas
DO $$
DECLARE
    cat_cafe_dulce UUID;
    cat_bebidas_jugos UUID;
    cat_desayunos_promos UUID;
    cat_platos_pastas UUID;
    cat_minutas_pizza UUID;
    cat_postres UUID;
BEGIN
    INSERT INTO public.categories (name) VALUES ('☕ CAFETERÍA & DULCES') RETURNING id INTO cat_cafe_dulce;
    INSERT INTO public.categories (name) VALUES ('🥤 BEBIDAS & JUGOS') RETURNING id INTO cat_bebidas_jugos;
    INSERT INTO public.categories (name) VALUES ('🥐 DESAYUNOS & PROMOS') RETURNING id INTO cat_desayunos_promos;
    INSERT INTO public.categories (name) VALUES ('🍝 PLATOS & PASTAS') RETURNING id INTO cat_platos_pastas;
    INSERT INTO public.categories (name) VALUES ('🍔 MINUTAS & PIZZA') RETURNING id INTO cat_minutas_pizza;
    INSERT INTO public.categories (name) VALUES ('🍰 POSTRES') RETURNING id INTO cat_postres;

    -- CAFETERÍA & DULCES (Combina Café, Panificados y Pastelería)
    INSERT INTO public.products (name, price, category_id) VALUES 
    ('Café pocillo (espresso / cortado / ristretto)', 2300, cat_cafe_dulce),
    ('Café / cortado / lágrima (en jarrito)', 3000, cat_cafe_dulce),
    ('Café con crema (en jarrito)', 4100, cat_cafe_dulce),
    ('Café c/ leche - lágrima doble', 4100, cat_cafe_dulce),
    ('Café doble / cortado doble', 4300, cat_cafe_dulce),
    ('Té / té saborizado / mate cocido', 2800, cat_cafe_dulce),
    ('Té c/ leche / mate cocido c/ leche', 3200, cat_cafe_dulce),
    ('Capuccino', 6000, cat_cafe_dulce),
    ('Submarino', 6000, cat_cafe_dulce),
    ('Chocolatada', 4500, cat_cafe_dulce),
    ('Facturas (unidad)', 1000, cat_cafe_dulce),
    ('Medialunas c/ jamón y queso', 2000, cat_cafe_dulce),
    ('Porción de tostadas (2 uni)', 3900, cat_cafe_dulce),
    ('1/2 porp. tostadas (1 uni)', 2100, cat_cafe_dulce),
    ('Tarta de coco', 7500, cat_cafe_dulce),
    ('Lemon pie', 7500, cat_cafe_dulce),
    ('Brownie c/ merengue', 7500, cat_cafe_dulce),
    ('Budín de limón y amapolas', 3900, cat_cafe_dulce),
    ('Alfajores de seguido / maicena', 3500, cat_cafe_dulce),
    ('Cookies / barritas', 2500, cat_cafe_dulce),
    ('Porciones sin TACC', 3900, cat_cafe_dulce);

    -- BEBIDAS & JUGOS (Combina Jugos y Bebidas)
    INSERT INTO public.products (name, price, category_id) VALUES 
    ('Exprimido de naranja', 5900, cat_bebidas_jugos),
    ('Medio exprimido', 3900, cat_bebidas_jugos),
    ('Naranjada', 6500, cat_bebidas_jugos),
    ('Limonada', 6500, cat_bebidas_jugos),
    ('Licuado (banana / frutilla)', 6500, cat_bebidas_jugos),
    ('Agua con o sin gas Ivess', 2500, cat_bebidas_jugos),
    ('Gaseosa línea Coca x 500 ml', 3900, cat_bebidas_jugos),
    ('Agua saborizada Aquarius x 500 ml', 3900, cat_bebidas_jugos),
    ('Cervezas (consultar)', 0, cat_bebidas_jugos),
    ('Vinos (consultar)', 0, cat_bebidas_jugos);

    -- DESAYUNOS & PROMOS
    INSERT INTO public.products (name, description, price, category_id) VALUES 
    ('Clásico', 'Infusión + 3 medialunas + 1/2 exprimido', 10500, cat_desayunos_promos),
    ('Saludable', 'Infusión + 2 tostadas pan campo c/ queso + 1/2 expr', 10500, cat_desayunos_promos),
    ('Continental', 'Infusión + 2 med + 1/2 tostado + 1/2 expr', 11900, cat_desayunos_promos),
    ('Combo Bloom', 'Infusión + tost. huevo/palta + 1/2 expr', 14900, cat_desayunos_promos),
    ('Yogurt c/ fruta y granola', '', 4900, cat_desayunos_promos),
    ('Café c/ leche + 2 facturas', '', 5500, cat_desayunos_promos),
    ('Café c/ leche + 2 med. J&Q', '', 6900, cat_desayunos_promos),
    ('Jarrito + 1 factura', '', 3600, cat_desayunos_promos),
    ('Jarrito + 2 facturas', '', 4000, cat_desayunos_promos);

    -- PLATOS & PASTAS (Combina Platos Diarios, Pastas, Tortillas y Ensaladas)
    INSERT INTO public.products (name, description, price, category_id) VALUES 
    ('Arroz con pollo', '', 11900, cat_platos_pastas),
    ('Albóndigas con puré', '', 11900, cat_platos_pastas),
    ('Pastel de papas', '', 11900, cat_platos_pastas),
    ('Lentejas a la española', '', 13900, cat_platos_pastas),
    ('Pechuga grille c/ guarnición', 'Papas, ensalada o puré', 11900, cat_platos_pastas),
    ('Patamuslo c/ guarnición', 'Papas, ensalada o puré', 11900, cat_platos_pastas),
    ('Bife de costilla c/ guarnición', 'Papas, ensalada o puré', 13900, cat_platos_pastas),
    ('Filet de merluza (frito o romana)', '', 12900, cat_platos_pastas),
    ('Ñoquis de papa', 'Boloñesa/Filetto/Blanca/Mixta', 9900, cat_platos_pastas),
    ('Sorrentinos J&Q', 'Boloñesa/Filetto/Blanca/Mixta', 9900, cat_platos_pastas),
    ('Ravioles (Calabaza o Verdura)', 'Boloñesa/Filetto/Blanca/Mixta', 9900, cat_platos_pastas),
    ('Canelones Verdura & Ricota', 'Boloñesa/Filetto/Blanca/Mixta', 9900, cat_platos_pastas),
    ('Spaghettis', 'Boloñesa/Filetto/Blanca/Mixta', 8900, cat_platos_pastas),
    ('Tortilla (Clásica o Bloom)', '', 8900, cat_platos_pastas),
    ('Ensalada Caesar', 'Pollo, croutons, salsa', 7400, cat_platos_pastas),
    ('Ensalada Bloom', 'Lechuga, tom, zan, huevo, palta, choclo', 8600, cat_platos_pastas),
    ('Ensalada Liviana', 'Rúcula, parmesano, cherry, champi', 8600, cat_platos_pastas),
    ('Ensaladas Varias (2-3 ing)', '', 6500, cat_platos_pastas);

    -- MINUTAS & PIZZA (Combina Tostados, Sándwiches, Burgers, Milanesas, Pizzas y Empanadas)
    INSERT INTO public.products (name, description, price, category_id) VALUES 
    ('Tostado de miga (Entero)', '', 5600, cat_minutas_pizza),
    ('Tostado de miga (1/2)', '', 3200, cat_minutas_pizza),
    ('Tostado Pan Árabe', '', 5600, cat_minutas_pizza),
    ('Sándwich de Milanesa solo', '', 8900, cat_minutas_pizza),
    ('Sándwich de Milanesa completo c/ fritas', '', 10900, cat_minutas_pizza),
    ('Burger (Sola / J&Q / Completa)', 'Con papas fritas', 12000, cat_minutas_pizza),
    ('Milanesa (Sola / J&Q / Completa)', 'Con papas fritas', 12000, cat_minutas_pizza),
    ('Milanesa Napolitana especial c/ fritas', '', 14500, cat_minutas_pizza),
    ('Pizza Muzzarella', '', 10900, cat_minutas_pizza),
    ('Pizza Especial / Napolitana', '', 11900, cat_minutas_pizza),
    ('Pizza Rúcula & Crudo', '', 13900, cat_minutas_pizza),
    ('Empanada (Unidad)', 'Carne/Pollo/J&Q/Choclo', 1600, cat_minutas_pizza),
    ('Docena de Empanadas', '', 17000, cat_minutas_pizza);

    -- POSTRES
    INSERT INTO public.products (name, price, category_id) VALUES 
    ('Flan casero', 3500, cat_postres),
    ('Budín de pan', 3500, cat_postres),
    ('Helado', 4000, cat_postres),
    ('Ensalada de frutas', 4000, cat_postres);

END $$;

COMMIT;
