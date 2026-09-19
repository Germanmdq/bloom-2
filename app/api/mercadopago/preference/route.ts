import { NextResponse } from 'next/server';
import { preference } from '@/lib/mercadopago';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { items, payer } = body;

        // Validar items
        if (!items || !Array.isArray(items)) {
            return NextResponse.json({ error: 'Items required' }, { status: 400 });
        }

        // Formatear items para MP
        // MP requiere: id, title, quantity, currency_id, unit_price
        const mpItems = items
            .filter((item: any) => !item.is_meta) // Filtrar metadatos
            .map((item: any) => ({
                id: String(item.id),
                title: item.name,
                quantity: Number(item.quantity),
                currency_id: 'ARS',
                unit_price: Number(item.price)
            }));

        // Detect Base URL automatically if env var is missing
        const requestUrl = new URL(req.url);
        const baseUrl = process.env.NEXT_PUBLIC_URL || requestUrl.origin;

        const result = await preference.create({
            body: {
                items: mpItems,
                payer: {
                    name: payer?.name || "Cliente",
                    // email es opcional, phone opcional
                },
                back_urls: {
                    success: `${baseUrl}/menu/success`,
                    failure: `${baseUrl}/menu/failure`,
                    pending: `${baseUrl}/menu/pending`
                },
                auto_return: "approved",
                statement_descriptor: "BLOOM CAFE"
            }
        });

        return NextResponse.json({
            id: result.id,
            init_point: result.init_point,
            sandbox_init_point: result.sandbox_init_point
        });

    } catch (error: any) {
        console.error("Mercado Pago Preference Error:", error);
        return NextResponse.json({ error: error.message || 'Error creating preference' }, { status: 500 });
    }
}
