import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://elvifblvjvcbwabhrlco.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVsdmlmYmx2anZjYndhYmhybGNvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg0MDUwNjksImV4cCI6MjA4Mzk4MTA2OX0.-qQkxgfz9Sz6c77QLHLo1bELXSAJINrKDJ5ovwBeECY'
);

const platos = [
  { name: 'Arroz con pollo', description: 'Plato del día.', price: 13500 },
  { name: 'Albóndigas con puré', description: 'Plato del día.', price: 13500 },
  { name: 'Pechuga grille con guarnición', description: 'Papas fritas, ensalada o puré a elección.', price: 13500 },
  { name: 'Patamuslo con guarnición', description: 'Papas fritas, ensalada o puré a elección.', price: 13500 },
  { name: 'Pastel de papas', description: 'Plato del día.', price: 13500 },
  { name: 'Filet de merluza', description: 'Empanado o a la romana.', price: 12900 },
  { name: 'Lentejas a la española', description: 'Plato del día.', price: 14500 },
  { name: 'Bife de costilla con guarnición', description: 'Papas fritas, ensalada o puré a elección.', price: 15900 },
];

// Usar la categoría "Platos Diarios" (la que no está en mayúsculas)
const categoryId = 'a7f85b13-f6ef-471f-8407-91eee4acc28f';

// Desactivar todos los productos de platos diarios primero
await supabase.from('products').update({ active: false }).eq('category_id', categoryId);
await supabase.from('products').update({ active: false }).eq('category_id', '9c7effb8-ac53-42d4-a430-5efc36ba9ab4');

let inserted = 0, updated = 0;

for (const plato of platos) {
  const { data: existing } = await supabase
    .from('products')
    .select('id')
    .eq('category_id', categoryId)
    .ilike('name', `%${plato.name.split(' ')[0]}%`)
    .maybeSingle();

  if (existing) {
    await supabase.from('products').update({
      name: plato.name,
      description: plato.description,
      price: plato.price,
      active: true,
      image_url: '/images/categories/platos-diarios.png'
    }).eq('id', existing.id);
    console.log(`✏️  ${plato.name} → $${plato.price}`);
    updated++;
  } else {
    const { error } = await supabase.from('products').insert({
      name: plato.name,
      description: plato.description,
      price: plato.price,
      category_id: categoryId,
      active: true,
      image_url: '/images/categories/platos-diarios.png'
    });
    if (error) console.error(`❌ ${plato.name}: ${error.message}`);
    else { console.log(`✅ ${plato.name} ($${plato.price})`); inserted++; }
  }
}

console.log(`\n🎉 Insertados: ${inserted} | Actualizados: ${updated}`);
