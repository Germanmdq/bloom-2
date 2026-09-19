import { NextResponse } from 'next/server';
import { MercadoPagoConfig, Preference } from 'mercadopago';

// Inicializar cliente
// IMPORTANTE: El usuario debe poner MP_ACCESS_TOKEN en .env.local
const client = new MercadoPagoConfig({
    accessToken: process.env.MP_ACCESS_TOKEN || ''
});

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { items, orderId } = body;

        if (!process.env.MP_ACCESS_TOKEN) {
            return NextResponse.json({ error: "Falta configurar MP_ACCESS_TOKEN" }, { status: 500 });
        }

        // Crear instancia de preferencia
        const preference = new Preference(client);

        // Crear la preferencia
        const result = await preference.create({
            body: {
                external_reference: orderId || undefined,
                // Mapear items al formato de MP
                items: items.map((item: any) => ({
                    id: item.id,
                    title: item.name,
                    quantity: Number(item.quantity),
                    unit_price: Number(item.price),
                    currency_id: 'ARS',
                })),

                // Redirecciones
                back_urls: {
                    success: `${process.env.NEXT_PUBLIC_URL || 'http://localhost:3000'}/menu/success`,
                    failure: `${process.env.NEXT_PUBLIC_URL || 'http://localhost:3000'}/menu?status=failure`,
                    pending: `${process.env.NEXT_PUBLIC_URL || 'http://localhost:3000'}/menu?status=pending`,
                },
                auto_return: 'approved',
            }
        });

        // Devolver la URL de pago (init_point para prod, sandbox_init_point para dev...
        // ...pero MP devuelve init_point que sirve para ambos dependiendo del token)
        return NextResponse.json({ url: result.init_point });

    } catch (error) {
        console.error("Error creando preferencia MP:", error);
        return NextResponse.json({ error: "Error al procesar pago" }, { status: 500 });
    }
}
