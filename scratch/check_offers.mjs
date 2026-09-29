import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://elvifblvjvcbwabhrlco.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVsdmlmYmx2anZjYndhYmhybGNvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg0MDUwNjksImV4cCI6MjA4Mzk4MTA2OX0.-qQkxgfz9Sz6c77QLHLo1bELXSAJINrKDJ5ovwBeECY";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function diagnose() {
    console.log("--- DIAGNÓSTICO DE OFERTAS ---");
    const { data, error } = await supabase
        .from('products')
        .select('id, name, price, active, kind, category_id')
        .eq('kind', 'oferta_del_dia');

    if (error) {
        console.error("Error al consultar:", error.message);
        return;
    }

    console.log(`Se encontraron ${data?.length || 0} ofertas.`);
    data?.forEach((o, i) => {
        console.log(`[${i+1}] ID: ${o.id} | Nombre: "${o.name}" | Precio: ${o.price} | Activo: ${o.active} | Cat: ${o.category_id}`);
    });
    console.log("------------------------------");
}

diagnose();
