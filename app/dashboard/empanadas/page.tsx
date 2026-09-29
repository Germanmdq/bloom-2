"use client";
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export default function LoadEmpanadas() {
    const [status, setStatus] = useState('Cargando empanadas...');
    const supabase = createClient();

    useEffect(() => {
        async function run() {
            // 1. Categoria
            let { data: cat } = await supabase.from('categories').select('id').eq('name', 'Empanadas').single();
            if (!cat) {
                 const { data: newCat } = await supabase.from('categories').insert({ name: 'Empanadas', icon: '🥟' }).select().single();
                 cat = newCat;
            }
            
            if (!cat) { setStatus('Error creando categoría'); return; }

            const sabores = [
                { name: 'Empanada de Carne', price: 1200 },
                { name: 'Empanada de Pollo', price: 1200 },
                { name: 'Empanada de Jamón y Queso', price: 1200 },
                { name: 'Empanada de Choclo', price: 1200 }
            ];

            for (const s of sabores) {
                await supabase.from('products').upsert({
                    name: s.name,
                    price: s.price,
                    category_id: cat.id,
                    description: 'Empanada casera al horno',
                    active: true,
                    kind: 'standard'
                }, { onConflict: 'name' });
            }
            setStatus('¡Empanadas cargadas con éxito! Ya podés volver al Dashboard.');
        }
        run();
    }, []);

    return <div className="p-20 text-center font-black text-2xl">{status}</div>;
}
