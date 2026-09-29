require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.log('Faltan variables de entorno');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function getAllProducts() {
  const { data, error } = await supabase
    .from('products')
    .select('name')
    .order('name');
    
  if (error) {
    console.error('Error fetching products:', error);
  } else {
    data.forEach(p => console.log('- ' + p.name));
  }
}

getAllProducts();
