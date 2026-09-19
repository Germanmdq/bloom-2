import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://elvifblvjvcbwabhrlco.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVsdmlmYmx2anZjYndhYmhybGNvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg0MDUwNjksImV4cCI6MjA4Mzk4MTA2OX0.-qQkxgfz9Sz6c77QLHLo1bELXSAJINrKDJ5ovwBeECY'
);

// Productos organizados por categoría
const menu = [
  // CAFETERÍA
  { category: 'Cafetería', name: 'Café Chico', description: 'Café espresso tradicional.', price: 2500 },
  { category: 'Cafetería', name: 'Café Mediano', description: 'Porción estándar de café.', price: 2800 },
  { category: 'Cafetería', name: 'Café Jarrito', description: 'Café servido en jarro de vidrio.', price: 3000 },
  { category: 'Cafetería', name: 'Café Doble', description: 'Doble carga de espresso.', price: 3300 },
  { category: 'Cafetería', name: 'Café con Leche', description: 'Café con leche espumada.', price: 3500 },
  { category: 'Cafetería', name: 'Capuchino', description: 'Café, leche, espuma y un toque de canela/cacao.', price: 3800 },
  { category: 'Cafetería', name: 'Submarino', description: 'Leche caliente con una barra de chocolate para disolver.', price: 3800 },
  { category: 'Cafetería', name: 'Té', description: 'Selección de tés clásicos y frutales.', price: 2300 },

  // PASTELERÍA
  { category: 'Pastelería', name: 'Medialuna', description: 'Tradicional de grasa o manteca.', price: 900 },
  { category: 'Pastelería', name: 'Medialuna con JyQ', description: 'Rellena de jamón y queso.', price: 1800 },
  { category: 'Pastelería', name: 'Torta (Porción)', description: 'Consultar variedades del día: Lemon Pie, Cheesecake, etc.', price: 4500 },
  { category: 'Pastelería', name: 'Alfajor Artesanal', description: 'Variedad de chocolate o maicena.', price: 2200 },
  { category: 'Pastelería', name: 'Porción de Budín', description: 'Casero, sabores vainilla, limón o naranja.', price: 1900 },
  { category: 'Pastelería', name: 'Tostadas con Untables', description: 'Pan blanco o integral con queso crema y mermelada.', price: 3200 },

  // DESAYUNOS Y MERIENDAS (sándwiches / salados)
  { category: 'Desayunos y Meriendas', name: 'Tostado de JyQ', description: 'En pan de miga o pan de campo, bien dorado.', price: 5500 },
  { category: 'Desayunos y Meriendas', name: 'Sándwich de Lomito', description: 'Lomo, lechuga, tomate y huevo.', price: 8200 },
  { category: 'Desayunos y Meriendas', name: 'Sándwich de Pollo', description: 'Pollo desmenuzado, palta y mayonesa especial.', price: 7800 },
  { category: 'Desayunos y Meriendas', name: 'Bagel Veggie', description: 'Vegetales asados, queso crema y rúcula.', price: 6900 },
  { category: 'Desayunos y Meriendas', name: 'Ensalada César', description: 'Lechuga, pollo, croutons, parmesano y aderezo.', price: 7500 },

  // BEBIDAS / JUGOS Y LICUADOS
  { category: 'Jugos y Licuados', name: 'Exprimido de Naranja', description: '100% natural, recién hecho.', price: 3500 },
  { category: 'Jugos y Licuados', name: 'Limonada con Menta', description: 'Limón, menta fresca y jengibre.', price: 3200 },
  { category: 'Jugos y Licuados', name: 'Licuado de Frutas', description: 'Preparado con agua o leche. Frutilla, Banana o Durazno.', price: 3800 },

  { category: 'Bebidas', name: 'Gaseosa 500ml', description: 'Línea Coca-Cola / Pepsi.', price: 2000 },
  { category: 'Bebidas', name: 'Agua Mineral', description: 'Con o sin gas.', price: 1800 },
];

async function run() {
  // Traer categorías existentes
  const { data: cats, error: catsError } = await supabase.from('categories').select('id, name');
  if (catsError) { console.error('Error trayendo categorías:', catsError.message); process.exit(1); }

  const catMap = {};
  for (const c of cats) catMap[c.name.toLowerCase().trim()] = c.id;

  console.log('Categorías encontradas:', Object.keys(catMap));

  let inserted = 0, updated = 0, skipped = 0;

  for (const item of menu) {
    // Buscar categoría (flexible)
    const catKey = Object.keys(catMap).find(k => k.includes(item.category.toLowerCase().split(' ')[0]));
    const categoryId = catKey ? catMap[catKey] : null;

    if (!categoryId) {
      console.warn(`⚠️  Categoría no encontrada: "${item.category}"`);
      skipped++;
      continue;
    }

    // Buscar si ya existe el producto
    const { data: existing } = await supabase
      .from('products')
      .select('id, price')
      .eq('category_id', categoryId)
      .ilike('name', item.name)
      .single();

    if (existing) {
      // Actualizar precio
      const { error } = await supabase
        .from('products')
        .update({ price: item.price, description: item.description })
        .eq('id', existing.id);
      if (error) console.error(`Error actualizando ${item.name}:`, error.message);
      else { console.log(`✏️  Actualizado: ${item.name} → $${item.price}`); updated++; }
    } else {
      // Insertar nuevo
      const { error } = await supabase.from('products').insert({
        name: item.name,
        description: item.description,
        price: item.price,
        category_id: categoryId,
        active: true,
      });
      if (error) console.error(`Error insertando ${item.name}:`, error.message);
      else { console.log(`✅  Agregado: ${item.name} ($${item.price})`); inserted++; }
    }
  }

  console.log(`\n🎉 Listo! Insertados: ${inserted} | Actualizados: ${updated} | Omitidos: ${skipped}`);
}

run();
