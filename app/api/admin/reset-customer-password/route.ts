import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: Request) {
    try {
        const { phone } = await req.json();
        if (!phone) return NextResponse.json({ error: 'Teléfono requerido' }, { status: 400 });

        const phoneClean = phone.replace(/\D/g, '');
        const fakeEmail = `${phoneClean}@bloom.local`;

        const svc = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        );

        // Find user by email
        const { data: users, error: listError } = await svc.auth.admin.listUsers();
        if (listError) throw listError;

        const user = users.users.find(u => u.email === fakeEmail);
        if (!user) return NextResponse.json({ error: 'Usuario no encontrado. Verificá el número.' }, { status: 404 });

        // Reset password to last 4 digits of phone
        const { error: updateError } = await svc.auth.admin.updateUserById(user.id, {
            password: phoneClean.slice(-4),
        });
        if (updateError) throw updateError;

        return NextResponse.json({ success: true, message: `Contraseña restablecida para ${fakeEmail}` });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
