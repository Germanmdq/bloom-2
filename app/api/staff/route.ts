import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
    try {
        const { email, phone, fullName, role } = await req.json();

        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        );

        const phoneClean = (phone ?? "").replace(/\D/g, "");
        if (!phoneClean) throw new Error("Teléfono requerido.");

        // 1. Crear usuario en Auth — contraseña = número de celular (solo dígitos)
        const { data: authData, error: authError } = await supabase.auth.admin.createUser({
            email,
            password: phoneClean,
            email_confirm: true,
            user_metadata: { full_name: fullName, phone }
        });

        if (authError) throw authError;

        // 2. Asegurar que en el perfil sea estrictamente PERSONAL (is_customer: false)
        const { error: profileError } = await supabase
            .from('profiles')
            .update({
                full_name: fullName,
                role: role || 'WAITER',
                phone: phone.trim(),
                is_customer: false // REGLA DE ORO: Si se crea acá, NO es cliente
            })
            .eq('id', authData.user.id);

        if (profileError) throw profileError;

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('Error creating staff:', error);
        return NextResponse.json({ message: error.message }, { status: 500 });
    }
}

export async function DELETE(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const id = searchParams.get('id');

        if (!id) return NextResponse.json({ message: 'ID requerido' }, { status: 400 });

        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        );

        // Borrar de Auth y de Profiles (vía Cascade)
        const { error } = await supabase.auth.admin.deleteUser(id);
        if (error) throw error;

        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ message: error.message }, { status: 500 });
    }
}
