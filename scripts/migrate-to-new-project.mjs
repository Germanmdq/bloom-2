import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Lee el archivo JSON exportado previamente
const seedDataPath = path.resolve('scripts', 'clean-seed-data.json');
if (!fs.existsSync(seedDataPath)) {
  console.error('No se encontró scripts/clean-seed-data.json. Ejecutá primero export-clean-database.mjs');
  process.exit(1);
}

const seedData = JSON.parse(fs.readFileSync(seedDataPath, 'utf-8'));

// Si se pasan argumentos: node migrate-to-new-project.mjs <NEW_URL> <NEW_KEY>
const newUrl = process.argv[2] || process.env.NEW_SUPABASE_URL;
const newKey = process.argv[3] || process.env.NEW_SUPABASE_KEY;

if (!newUrl || !newKey) {
  console.log('===============================================================');
  console.log('USO:');
  console.log('  node scripts/migrate-to-new-project.mjs <NEW_URL> <NEW_KEY>');
  console.log('===============================================================');
  console.log('Ejemplo:');
  console.log('  node scripts/migrate-to-new-project.mjs https://xyz.supabase.co eyJhbGci...');
  console.log('');
  console.log('Alternativamente, podés copiar y ejecutar directamente el script:');
  console.log('  supabase/clean_new_project_export.sql');
  console.log('en el SQL Editor de tu nuevo panel de Supabase.');
  process.exit(0);
}

const targetSupabase = createClient(newUrl, newKey);

async function migrate() {
  console.log(`--- MIGRANDO DATOS AL NUEVO PROYECTO: ${newUrl} ---`);

  // 1. Categorías
  console.log(`Insertando ${seedData.categories.length} categorías...`);
  const { error: errCats } = await targetSupabase
    .from('categories')
    .upsert(seedData.categories, { onConflict: 'id' });

  if (errCats) {
    console.error('Error insertando categorías:', errCats);
  } else {
    console.log('✓ Categorías migradas correctamente.');
  }

  // 2. Productos en lotes de 25
  console.log(`Insertando ${seedData.products.length} productos...`);
  const chunkSize = 25;
  for (let i = 0; i < seedData.products.length; i += chunkSize) {
    const chunk = seedData.products.slice(i, i + chunkSize);
    const { error: errProds } = await targetSupabase
      .from('products')
      .upsert(chunk, { onConflict: 'id' });

    if (errProds) {
      console.error(`Error en lote ${i} - ${i + chunk.length}:`, errProds);
    } else {
      console.log(`✓ Lote ${i + 1} a ${Math.min(i + chunkSize, seedData.products.length)} insertado.`);
    }
  }

  // 3. Settings
  if (seedData.appSettings && seedData.appSettings.length > 0) {
    console.log('Insertando app_settings...');
    const { error: errSet } = await targetSupabase
      .from('app_settings')
      .upsert(seedData.appSettings, { onConflict: 'id' });

    if (errSet) console.error('Error insertando settings:', errSet);
    else console.log('✓ Configuración del local migrada.');
  }

  console.log('\n--- ¡MIGRACIÓN COMPLETADA CON ÉXITO! ---');
}

migrate().catch(console.error);
