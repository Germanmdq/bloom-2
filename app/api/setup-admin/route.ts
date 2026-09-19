import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function GET() {
    try {
        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        );

        const email = 'admin@bloom.com';
        const password = 'Admin123!'; 

        // 1. Buscar si el usuario ya existe en Auth
        const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();
        if (listError) throw listError;

        const existingUser = users.find(u => u.email === email);
        let userId: string;

        if (existingUser) {
            // Si ya existe, forzamos el cambio de contraseña
            const { data: updated, error: updateError } = await supabase.auth.admin.updateUserById(
                existingUser.id,
                { password: password, email_confirm: true }
            );
            if (updateError) throw updateError;
            userId = updated.user.id;
        } else {
            // Si no existe, lo creamos de cero
            const { data: created, error: createError } = await supabase.auth.admin.createUser({
                email: email,
                password: password,
                email_confirm: true,
                user_metadata: { full_name: 'Administrador' }
            });
            if (createError) throw createError;
            userId = created.user.id;
        }

        // 2. Asegurar que el perfil exista y sea ADMIN
        const { error: profileError } = await supabase
            .from('profiles')
            .upsert({
                id: userId,
                full_name: 'Administrador Principal',
                role: 'ADMIN',
                is_customer: false
            });

        if (profileError) throw profileError;

        // 3. Inicializar app_settings si está vacía
        const { error: settingsError } = await supabase
            .from('app_settings')
            .upsert({
                id: 1,
                mesas: 10,
                barra: 3,
                updated_at: new Date().toISOString()
            }, { onConflict: 'id' });

        return NextResponse.json({ 
            success: true, 
            message: "Acceso Administrativo y Configuración Inicializados",
            credencliales: {
                email: email,
                password: password
            }
        });

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
