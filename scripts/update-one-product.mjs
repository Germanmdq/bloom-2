import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://elvifblvjvcbwabhrlco.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVsdmlmYmx2anZjYndhYmhybGNvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg0MDUwNjksImV4cCI6MjA4Mzk4MTA2OX0.-qQkxgfz9Sz6c77QLHLo1bELXSAJINrKDJ5ovwBeECY'
);

const [,, nameSearch, imageUrl] = process.argv;

const { data: products } = await supabase
  .from('products')
  .select('id, name')
  .ilike('name', `%${nameSearch}%`);

if (!products?.length) {
  console.log(`❌ No se encontró producto con: "${nameSearch}"`);
  process.exit(1);
}

for (const p of products) {
  await supabase.from('products').update({ image_url: imageUrl }).eq('id', p.id);
  console.log(`✅ ${p.name} → ${imageUrl}`);
}
