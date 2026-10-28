import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { normalizePhone } from '@/lib/phone';
import { requireManager } from '@/lib/dashboard/require-admin-api';

export async function POST(req: Request) {
    try {
        if (!(await requireManager())) return NextResponse.json({ message: 'No autorizado' }, { status: 403 });
        const { email, phone, fullName, role, password } = await req.json();
        if (typeof password !== 'string' || password.length < 10) throw new Error('La contraseña debe tener al menos 10 caracteres.');
        if (!['ADMIN', 'MANAGER', 'WAITER', 'KITCHEN'].includes(role || 'WAITER')) throw new Error('Rol inválido.');

        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        );

        const phoneClean = normalizePhone(phone);
        if (!phoneClean) throw new Error("Teléfono inválido (característica y número, ej. 223 615 1152).");

        // 1. Crear usuario en Auth con la contraseña indicada por el administrador
        const { data: authData, error: authError } = await supabase.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
            user_metadata: { full_name: fullName }
        });

        if (authError) throw authError;

        // 2. Asegurar que en el perfil sea estrictamente PERSONAL (is_customer: false)
        const { error: profileError } = await supabase
            .from('profiles')
            .update({
                full_name: fullName,
                role: role || 'WAITER',
                phone: phoneClean,
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
        const manager = await requireManager();
        if (!manager) return NextResponse.json({ message: 'No autorizado' }, { status: 403 });
        const { searchParams } = new URL(req.url);
        const id = searchParams.get('id');

        if (!id) return NextResponse.json({ message: 'ID requerido' }, { status: 400 });
        if (id === manager.id) return NextResponse.json({ message: 'No podés eliminar tu propio usuario.' }, { status: 400 });

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
