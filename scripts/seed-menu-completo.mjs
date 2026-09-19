import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://elvifblvjvcbwabhrlco.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVsdmlmYmx2anZjYndhYmhybGNvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg0MDUwNjksImV4cCI6MjA4Mzk4MTA2OX0.-qQkxgfz9Sz6c77QLHLo1bELXSAJINrKDJ5ovwBeECY'
);

const menu = [
  // CAFETERÍA
  { cat: 'Cafetería', name: 'Café pocillo', description: 'Expresso / cortado / ristretto.', price: 2600 },
  { cat: 'Cafetería', name: 'Café en jarrito', description: 'Café / cortado / lágrima en jarrito.', price: 3500 },
  { cat: 'Cafetería', name: 'Café con crema', description: 'En jarrito.', price: 4800 },
  { cat: 'Cafetería', name: 'Café con leche / lágrima doble', description: 'Café con leche o lágrima doble.', price: 4800 },
  { cat: 'Cafetería', name: 'Café doble / cortado doble', description: 'Doble carga de espresso.', price: 5000 },
  { cat: 'Cafetería', name: 'Té / Té saborizado / Mate cocido', description: 'Selección de infusiones.', price: 3300 },
  { cat: 'Cafetería', name: 'Té con leche / Mate cocido con leche', description: 'Infusión con leche.', price: 3700 },
  { cat: 'Cafetería', name: 'Capuccino', description: 'Café, leche espumada y un toque de canela.', price: 6900 },
  { cat: 'Cafetería', name: 'Submarino', description: 'Leche caliente con barra de chocolate artesanal para disolver.', price: 6900 },
  { cat: 'Cafetería', name: 'Chocolatada', description: 'Leche con chocolate caliente.', price: 5200 },

  // DESAYUNOS Y MERIENDAS
  { cat: 'Desayunos y Meriendas', name: 'Desayuno Clásico', description: 'Infusión + 3 medialunas + ½ exprimido.', price: 12000 },
  { cat: 'Desayunos y Meriendas', name: 'Desayuno Saludable', description: 'Infusión + 2 tostadas de pan de campo con queso + ½ exprimido.', price: 12000 },
  { cat: 'Desayunos y Meriendas', name: 'Desayuno Continental', description: 'Infusión + 2 medialunas + ½ tostado + ½ exprimido.', price: 13700 },
  { cat: 'Desayunos y Meriendas', name: 'Desayuno Bloom', description: 'Infusión + tostadas con huevo revuelto y palta (2 uni) + ½ exprimido.', price: 16900 },
  { cat: 'Desayunos y Meriendas', name: 'Yogurt con fruta y granola', description: 'Yogurt con fruta fresca y granola artesanal.', price: 5700 },

  // PROMOCIONES
  { cat: 'Promociones', name: 'Café con leche + 2 facturas', description: 'Café con leche más 2 facturas a elección.', price: 6400 },
  { cat: 'Promociones', name: 'Café con leche + 2 medialunas con JyQ', description: 'Café con leche más 2 medialunas rellenas de jamón y queso.', price: 7900 },
  { cat: 'Promociones', name: 'Jarrito + 1 factura', description: 'Jarrito de café más 1 factura.', price: 4200 },
  { cat: 'Promociones', name: 'Jarrito + 2 facturas', description: 'Jarrito de café más 2 facturas.', price: 4600 },

  // JUGOS Y LICUADOS
  { cat: 'Jugos y Licuados', name: 'Exprimido de naranja', description: '100% natural, recién hecho.', price: 6500 },
  { cat: 'Jugos y Licuados', name: 'Medio exprimido', description: 'Media porción de exprimido de naranja.', price: 4500 },
  { cat: 'Jugos y Licuados', name: 'Naranjada', description: 'Jugo de naranja con agua y azúcar.', price: 7500 },
  { cat: 'Jugos y Licuados', name: 'Limonada', description: 'Limón fresco con menta y jengibre.', price: 7500 },
  { cat: 'Jugos y Licuados', name: 'Licuado', description: 'Banana o frutilla. Con leche o agua.', price: 7500 },

  // PANIFICADOS
  { cat: 'Panificados', name: 'Porción de tostadas (2 uni)', description: 'Pan tostado, 2 unidades.', price: 4500 },
  { cat: 'Panificados', name: '½ Porción de tostadas (1 uni)', description: 'Pan tostado, 1 unidad.', price: 2500 },
  { cat: 'Panificados', name: 'Facturas', description: 'Factura del día.', price: 1200 },
  { cat: 'Panificados', name: 'Medialunas con jamón y queso', description: 'Medialuna rellena de jamón y queso.', price: 2300 },
  { cat: 'Panificados', name: 'Tostado de miga', description: 'Tostado de pan de miga.', price: 6500 },
  { cat: 'Panificados', name: '½ Tostado de miga', description: 'Media porción de tostado de miga.', price: 3700 },
  { cat: 'Panificados', name: 'Tostado de pan árabe', description: 'Tostado en pan árabe.', price: 6500 },
  { cat: 'Panificados', name: 'Tostadas con huevo revuelto y palta', description: '2 unidades con huevo revuelto y palta.', price: 8500 },

  // PASTELERÍA
  { cat: 'Pastelería', name: 'Tarta de coco', description: 'Porción de tarta de coco artesanal.', price: 8700 },
  { cat: 'Pastelería', name: 'Lemon pie', description: 'Porción de lemon pie.', price: 8700 },
  { cat: 'Pastelería', name: 'Brownie con merengue', description: 'Brownie artesanal con merengue.', price: 8700 },
  { cat: 'Pastelería', name: 'Cookies', description: 'Cookies artesanales.', price: 5600 },
  { cat: 'Pastelería', name: 'Alfajores de Guido', description: 'Alfajores especiales de Guido.', price: 3500 },
  { cat: 'Pastelería', name: 'Alfajores de maicena', description: 'Alfajores de maicena artesanales.', price: 3900 },
  { cat: 'Pastelería', name: 'Porción sin TACC (budín)', description: 'Budín apto celíacos, sin TACC.', price: 5500 },
  { cat: 'Pastelería', name: 'Alfajores sin TACC', description: 'Alfajores aptos para celíacos.', price: 4500 },

  // ENSALADAS
  { cat: 'Ensaladas', name: 'Ensalada Caesar', description: 'Lechuga, pollo, croutons y salsa caesar.', price: 8200 },
  { cat: 'Ensaladas', name: 'Ensalada Bloom', description: 'Lechuga, tomate, zanahoria, huevo, palta y choclo.', price: 9500 },
  { cat: 'Ensaladas', name: 'Ensalada Liviana', description: 'Rúcula, parmesano, cherry, champignones y queso.', price: 9500 },
  { cat: 'Ensaladas', name: 'Ensalada Criolla', description: 'Lechuga, tomate y cebolla.', price: 7200 },
  { cat: 'Ensaladas', name: 'Lechuga y tomate', description: 'Ensalada simple de lechuga y tomate.', price: 6500 },
  { cat: 'Ensaladas', name: 'Zanahoria y huevo', description: 'Ensalada de zanahoria y huevo.', price: 6500 },
  { cat: 'Ensaladas', name: 'Rúcula y parmesano', description: 'Ensalada de rúcula con parmesano.', price: 7500 },
  { cat: 'Ensaladas', name: 'Zanahoria, huevo, choclo y lentejas', description: 'Ensalada completa y nutritiva.', price: 8200 },

  // TORTILLAS
  { cat: 'Tortillas', name: 'Tortilla Clásica', description: 'Papa, huevo, cebolla y morrón.', price: 8900 },
  { cat: 'Tortillas', name: 'Tortilla Bloom', description: 'Papa, huevo, cebolla, morrón, jamón y queso.', price: 9900 },

  // HAMBURGUESAS
  { cat: 'Hamburguesas', name: 'Hamburguesa sola', description: 'Con guarnición de papas fritas.', price: 12500 },
  { cat: 'Hamburguesas', name: 'Hamburguesa con jamón y queso', description: 'Con guarnición de papas fritas.', price: 13900 },
  { cat: 'Hamburguesas', name: 'Hamburguesa completa', description: 'Completa con guarnición de papas fritas.', price: 15000 },

  // PASTAS
  { cat: 'Pastas', name: 'Spaghettis', description: 'Salsa a elección: bolognesa, filetto, blanca o mixta.', price: 10500 },
  { cat: 'Pastas', name: 'Ñoquis de papa', description: 'Salsa a elección: bolognesa, filetto, blanca o mixta.', price: 11500 },
  { cat: 'Pastas', name: 'Ravioles de calabaza y ricota', description: 'Salsa a elección: bolognesa, filetto, blanca o mixta.', price: 11500 },
  { cat: 'Pastas', name: 'Sorrentinos de jamón y queso', description: 'Salsa a elección: bolognesa, filetto, blanca o mixta.', price: 11500 },
  { cat: 'Pastas', name: 'Ravioles de verdura', description: 'Salsa a elección: bolognesa, filetto, blanca o mixta.', price: 11500 },
  { cat: 'Pastas', name: 'Canelones de verdura y ricota', description: 'Salsa a elección: bolognesa, filetto, blanca o mixta.', price: 11500 },

  // MILANESAS
  { cat: 'Milanesas', name: 'Milanesa sola', description: 'Con guarnición de papas fritas.', price: 12500 },
  { cat: 'Milanesas', name: 'Milanesa con jamón y queso', description: 'Con guarnición de papas fritas.', price: 13900 },
  { cat: 'Milanesas', name: 'Milanesa napolitana especial', description: 'Con guarnición de papas fritas.', price: 16900 },
  { cat: 'Milanesas', name: 'Milanesa completa', description: 'Con guarnición de papas fritas.', price: 15000 },
  { cat: 'Milanesas', name: 'Sándwich de milanesa', description: 'Sándwich de milanesa.', price: 10500 },
  { cat: 'Milanesas', name: 'Sándwich completo de milanesa', description: 'Lechuga, tomate, jamón y queso, con fritas.', price: 12500 },

  // PIZZAS
  { cat: 'Pizzas', name: 'Pizza muzzarella', description: 'Pizza clásica de muzzarella.', price: 12500 },
  { cat: 'Pizzas', name: 'Pizza especial', description: 'Pizza especial de la casa.', price: 13900 },
  { cat: 'Pizzas', name: 'Pizza napolitana', description: 'Pizza napolitana con tomate y ajo.', price: 14900 },
  { cat: 'Pizzas', name: 'Pizza rúcula, crudo y parmesano', description: 'Pizza con rúcula, jamón crudo y parmesano.', price: 16900 },

  // EMPANADAS
  { cat: 'Empanadas', name: 'Empanada (c/u)', description: 'Carne / pollo / jamón y queso / choclo.', price: 1800 },
  { cat: 'Empanadas', name: '½ Docena de empanadas', description: '6 empanadas a elección.', price: 9900 },
  { cat: 'Empanadas', name: 'Docena de empanadas', description: '12 empanadas a elección.', price: 18000 },

  // PLATOS DIARIOS
  { cat: 'Platos Diarios', name: 'Arroz con pollo', description: 'Plato del día.', price: 13500 },
  { cat: 'Platos Diarios', name: 'Albóndigas con puré', description: 'Plato del día.', price: 13500 },
  { cat: 'Platos Diarios', name: 'Pechuga grille con guarnición', description: 'Papas fritas, ensalada o puré a elección.', price: 13500 },
  { cat: 'Platos Diarios', name: 'Patamuslo con guarnición', description: 'Papas fritas, ensalada o puré a elección.', price: 13500 },
  { cat: 'Platos Diarios', name: 'Pastel de papas', description: 'Plato del día.', price: 13500 },
  { cat: 'Platos Diarios', name: 'Filet de merluza', description: 'Empanado o a la romana.', price: 12900 },
  { cat: 'Platos Diarios', name: 'Lentejas a la española', description: 'Plato del día.', price: 14500 },
  { cat: 'Platos Diarios', name: 'Bife de costilla con guarnición', description: 'Papas fritas, ensalada o puré a elección.', price: 15900 },

  // POSTRES
  { cat: 'Postres', name: 'Flan casero', description: 'Flan casero con dulce de leche o crema.', price: 4000 },
  { cat: 'Postres', name: 'Budín de pan', description: 'Budín de pan casero.', price: 4000 },
  { cat: 'Postres', name: 'Helado', description: 'Helado artesanal. Consultar sabores.', price: 4900 },
  { cat: 'Postres', name: 'Ensalada de frutas', description: 'Ensalada de frutas frescas de estación.', price: 4900 },

  // BEBIDAS
  { cat: 'Bebidas', name: 'Agua mineral Ivess', description: 'Con o sin gas, 500ml.', price: 2900 },
  { cat: 'Bebidas', name: 'Gaseosa Coca-Cola 500ml', description: 'Línea Coca-Cola.', price: 3900 },
  { cat: 'Bebidas', name: 'Agua saborizada Aquarius 500ml', description: 'Agua saborizada.', price: 3900 },
  { cat: 'Bebidas', name: 'Cerveza', description: 'Consultar disponibilidad.', price: 0 },
  { cat: 'Bebidas', name: 'Vino', description: 'Consultar disponibilidad.', price: 0 },

  // WRAPS
  { cat: 'Wraps', name: 'Wrap de pollo', description: 'Pollo con lechuga, tomate y salsa.', price: 9500 },
  { cat: 'Wraps', name: 'Wrap de lomo', description: 'Lomo con lechuga, tomate y chimichurri.', price: 10500 },
  { cat: 'Wraps', name: 'Wrap de jamón y queso', description: 'Jamón, queso y vegetales frescos.', price: 8500 },
  { cat: 'Wraps', name: 'Wrap veggie', description: 'Vegetales asados, queso crema y rúcula.', price: 8500 },
];

async function run() {
  const { data: cats } = await supabase.from('categories').select('id, name');
  const catMap = {};
  for (const c of cats) catMap[c.name.toLowerCase().trim()] = c.id;

  // Desactivar todos los productos antes de sincronizar
  await supabase.from('products').update({ active: false }).neq('id', '00000000-0000-0000-0000-000000000000');

  let inserted = 0, updated = 0, skipped = 0;

  for (const item of menu) {
    const catKey = Object.keys(catMap).find(k =>
      k.includes(item.cat.toLowerCase().split(' ')[0]) ||
      item.cat.toLowerCase().includes(k.split(' ')[0])
    );
    const categoryId = catKey ? catMap[catKey] : null;

    if (!categoryId) {
      console.warn(`⚠️  Sin categoría: "${item.cat}"`);
      skipped++;
      continue;
    }

    const { data: existing } = await supabase
      .from('products')
      .select('id')
      .eq('category_id', categoryId)
      .ilike('name', item.name)
      .maybeSingle();

    if (existing) {
      await supabase.from('products')
        .update({ price: item.price, description: item.description, active: true })
        .eq('id', existing.id);
      console.log(`✏️  ${item.name} → $${item.price}`);
      updated++;
    } else {
      const { error } = await supabase.from('products').insert({
        name: item.name,
        description: item.description,
        price: item.price,
        category_id: categoryId,
        active: true,
      });
      if (error) console.error(`❌ ${item.name}: ${error.message}`);
      else { console.log(`✅  ${item.name} ($${item.price})`); inserted++; }
    }
  }

  console.log(`\n🎉 Listo! Insertados: ${inserted} | Actualizados: ${updated} | Omitidos: ${skipped}`);
}

run();
