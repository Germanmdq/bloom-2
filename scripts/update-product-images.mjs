import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://elvifblvjvcbwabhrlco.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVsdmlmYmx2anZjYndhYmhybGNvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg0MDUwNjksImV4cCI6MjA4Mzk4MTA2OX0.-qQkxgfz9Sz6c77QLHLo1bELXSAJINrKDJ5ovwBeECY'
);

// Mapa: fragmento del nombre → imagen
const imageMap = [
  { match: 'jarrito', image: '/images/categories/cafeteria.png' },
  { match: 'jarrito + 1', image: '/images/categories/promociones.png' },
  { match: 'jarrito + 2', image: '/images/categories/promociones.png' },
  { match: 'café c/ leche + 2', image: '/images/categories/promociones.png' },
  { match: 'café con leche + 2', image: '/images/categories/promociones.png' },
  { match: 'café pocillo', image: '/images/categories/cafeteria.png' },
  { match: 'café en jarrito', image: '/images/categories/cafeteria.png' },
  { match: 'café con crema', image: '/images/categories/cafeteria.png' },
  { match: 'café con leche', image: '/images/categories/cafeteria.png' },
  { match: 'café doble', image: '/images/categories/cafeteria.png' },
  { match: 'capuccino', image: '/images/categories/cafeteria.png' },
  { match: 'submarino', image: '/images/categories/cafeteria.png' },
  { match: 'chocolatada', image: '/images/categories/cafeteria.png' },
  { match: 'té', image: '/images/categories/cafeteria.png' },
  { match: 'milanesa', image: '/images/categories/milanesas.png' },
  { match: 'sándwich de milanesa', image: '/images/categories/milanesas.png' },
  { match: 'pasta', image: '/images/categories/pastas.png' },
  { match: 'spaghetti', image: '/images/categories/pastas.png' },
  { match: 'ñoqui', image: '/images/categories/pastas.png' },
  { match: 'raviole', image: '/images/categories/pastas.png' },
  { match: 'sorrentino', image: '/images/categories/pastas.png' },
  { match: 'canelon', image: '/images/categories/pastas.png' },
  { match: 'wrap', image: '/images/categories/wraps.png' },
  { match: 'empanada', image: '/images/categories/empanadas.png' },
  { match: 'tortilla', image: '/images/categories/tortilla.png' },
  { match: 'desayuno', image: '/images/categories/desayunos.png' },
  { match: 'yogurt', image: '/images/categories/desayunos.png' },
  { match: 'tostada', image: '/images/categories/desayunos.png' },
  { match: 'exprimido', image: '/images/categories/jugos.png' },
  { match: 'naranjada', image: '/images/categories/jugos.png' },
  { match: 'limonada', image: '/images/categories/jugos.png' },
  { match: 'licuado', image: '/images/categories/jugos.png' },
  { match: 'bebida', image: '/images/categories/bebidas.png' },
  { match: 'agua', image: '/images/categories/bebidas.png' },
  { match: 'gaseosa', image: '/images/categories/bebidas.png' },
  { match: 'cerveza', image: '/images/categories/bebidas.png' },
  { match: 'vino', image: '/images/categories/bebidas.png' },
  { match: 'flan', image: '/images/categories/postres.png' },
  { match: 'budín de pan', image: '/images/categories/postres.png' },
  { match: 'helado', image: '/images/categories/postres.png' },
  { match: 'ensalada de frutas', image: '/images/categories/postres.png' },
  { match: 'alfajor', image: '/images/categories/pasteleria.png' },
  { match: 'medialuna', image: '/images/categories/cafeteria.png' },
  { match: 'torta', image: '/images/categories/pasteleria.png' },
  { match: 'brownie', image: '/images/categories/pasteleria.png' },
  { match: 'cookie', image: '/images/categories/pasteleria.png' },
  { match: 'ensalada caesar', image: '/images/categories/ensaladas.png' },
  { match: 'ensalada bloom', image: '/images/categories/ensaladas.png' },
  { match: 'ensalada', image: '/images/categories/ensaladas.png' },
  { match: 'lechuga', image: '/images/categories/ensaladas.png' },
  { match: 'rúcula', image: '/images/categories/ensaladas.png' },
  { match: 'plato diario', image: '/images/categories/platos-diarios.png' },
  { match: 'arroz con pollo', image: '/images/categories/platos-diarios.png' },
  { match: 'albóndiga', image: '/images/categories/platos-diarios.png' },
  { match: 'pechuga', image: '/images/categories/platos-diarios.png' },
  { match: 'patamuslo', image: '/images/categories/platos-diarios.png' },
  { match: 'pastel de papa', image: '/images/categories/platos-diarios.png' },
  { match: 'filet', image: '/images/categories/platos-diarios.png' },
  { match: 'lenteja', image: '/images/categories/platos-diarios.png' },
  { match: 'bife', image: '/images/categories/platos-diarios.png' },
];

const { data: products } = await supabase.from('products').select('id, name');

let updated = 0;
for (const p of products) {
  const n = p.name.toLowerCase();
  // Buscar la imagen más específica (mayor match)
  const entry = imageMap.find(e => n.includes(e.match.toLowerCase()));
  if (entry) {
    const { error } = await supabase
      .from('products')
      .update({ image_url: entry.image })
      .eq('id', p.id);
    if (!error) {
      console.log(`🖼️  ${p.name} → ${entry.image}`);
      updated++;
    }
  }
}

console.log(`\n✅ ${updated} productos actualizados con imagen.`);
