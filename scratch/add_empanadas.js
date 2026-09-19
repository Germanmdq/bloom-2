
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function addEmpanadas() {
  // 1. Buscar o crear la categoría "Empanadas"
  let { data: cat } = await supabase.from('categories').select('id').eq('name', 'Empanadas').single();
  
  if (!cat) {
    const { data: newCat, error: catErr } = await supabase
      .from('categories')
      .insert({ name: 'Empanadas', icon: '🥟' })
      .select()
      .single();
    if (catErr) { console.error(catErr); return; }
    cat = newCat;
  }

  const sabores = [
    { name: 'Empanada de Carne', price: 1200 },
    { name: 'Empanada de Pollo', price: 1200 },
    { name: 'Empanada de Jamón y Queso', price: 1200 },
    { name: 'Empanada de Choclo', price: 1200 }
  ];

  for (const s of sabores) {
    const { error: pErr } = await supabase.from('products').upsert({
      name: s.name,
      price: s.price,
      category_id: cat.id,
      description: 'Empanada casera al horno',
      active: true,
      kind: 'standard'
    }, { onConflict: 'name' });
    
    if (pErr) console.error(`Error con ${s.name}:`, pErr.message);
    else console.log(`✓ ${s.name} lista.`);
  }
}

addEmpanadas();
