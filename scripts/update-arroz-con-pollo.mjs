import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://elvifblvjvcbwabhrlco.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVsdmlmYmx2anZjYndhYmhybGNvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg0MDUwNjksImV4cCI6MjA4Mzk4MTA2OX0.-qQkxgfz9Sz6c77QLHLo1bELXSAJINrKDJ5ovwBeECY'
);

const { data, error } = await supabase
  .from('products')
  .update({ image_url: '/images/products/arroz-con-pollo.png' })
  .ilike('name', '%arroz%pollo%');

if (error) console.error('Error:', error);
else console.log('Actualizado:', data);

// Verificar
const { data: check } = await supabase
  .from('products')
  .select('id, name, image_url')
  .ilike('name', '%arroz%');

console.log('Productos:', check);
