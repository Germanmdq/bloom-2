const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const env = fs.readFileSync('.env.local', 'utf8');
const url = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)[1];
const key = env.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)[1];

const supabase = createClient(url, key);

async function run() {
  const { data: insumos, error: err1 } = await supabase.from('insumos').select('id, nombre, unidad').limit(2);
  const { data: supplies, error: err2 } = await supabase.from('supplies').select('id, name, unit').limit(2);
  const { data: products, error: err3 } = await supabase.from('products').select('id, name, unit').eq('kind', 'raw').limit(2);
  
  console.log('Insumos:', insumos ? insumos.length : err1.message);
  console.log('Supplies:', supplies ? supplies.length : err2.message);
  console.log('Products:', products ? products.length : err3.message);
}
run();
