import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST() {
    try {
        const svc = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        );

        // Get all customers with a phone number
        const { data: profiles, error: pErr } = await svc
            .from('profiles')
            .select('id, phone')
            .eq('is_customer', true)
            .not('phone', 'is', null);

        if (pErr) throw pErr;

        let updated = 0;
        let skipped = 0;

        for (const profile of profiles ?? []) {
            const phoneClean = (profile.phone as string).replace(/\D/g, '');
            if (phoneClean.length < 4) { skipped++; continue; }

            const { error } = await svc.auth.admin.updateUserById(profile.id, {
                password: phoneClean.slice(-4),
            });

            if (error) { skipped++; } else { updated++; }
        }

        return NextResponse.json({ updated, skipped });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
