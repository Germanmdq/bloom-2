import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const MODEL = 'gemini-2.0-flash';

function getGenAI(): GoogleGenerativeAI | null {
    const apiKey = process.env.GEMINI_API_KEY?.trim();
    if (!apiKey) return null;
    return new GoogleGenerativeAI(apiKey);
}

type OrderLine = { name: string };
type MenuProduct = { name: string; price: number };

export async function POST(request: NextRequest) {
    try {
        const genAI = getGenAI();
        if (!genAI) {
            return NextResponse.json({ suggestions: [] });
        }

        const { currentOrder, availableProducts } = await request.json() as {
            currentOrder: OrderLine[];
            availableProducts: MenuProduct[];
        };

        // Valida que tengas productos disponibles
        if (!availableProducts || availableProducts.length === 0) {
            return NextResponse.json({ suggestions: [] });
        }

        const orderItems = (currentOrder || []).map((i) => i.name).join(', ');

        // Lista de productos disponibles para que la IA elija SOLO de ahí
        const menuList = availableProducts.map((p) => `${p.name} ($${p.price})`).join(', ');

        const model = genAI.getGenerativeModel({
            model: MODEL,
            systemInstruction: `Eres un asistente de ventas de restaurante. SOLO puedes sugerir productos que existen en el menú. 
          
REGLA CRÍTICA: Responde ÚNICAMENTE con productos de la lista del menú proporcionada. NO inventes productos.

Respondes SOLO en JSON válido, sin texto adicional.`,
            generationConfig: {
                temperature: 0.5,
                maxOutputTokens: 300,
                responseMimeType: 'application/json',
            },
        });

        const userPrompt = `Orden actual del cliente: ${orderItems || 'vacía'}

MENÚ DISPONIBLE (SOLO sugiere de esta lista):
${menuList}

Instrucciones:
1. Sugiere 2 productos del MENÚ que complementen la orden
2. Usa el NOMBRE EXACTO y PRECIO EXACTO del menú
3. Si la orden está vacía, sugiere los productos más populares
4. NO inventes productos que no estén en el menú

Responde EXACTAMENTE en este formato JSON:
{
  "suggestions": [
    {"item": "nombre_exacto_del_menu", "reason": "razón en máximo 8 palabras", "price": precio_exacto},
    {"item": "otro_producto_del_menu", "reason": "razón corta", "price": precio_exacto}
  ]
}`;

        const result = await model.generateContent({
            contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
        });

        const response = result.response.text();
        const cleanJson = response?.replace(/```json\n?|\n?```/g, '').trim();
        const parsed = JSON.parse(cleanJson || '{"suggestions":[]}');

        type RawSuggestion = { item: string; reason?: string; price?: number };
        const raw = (parsed.suggestions || []) as RawSuggestion[];

        // 🔒 VALIDACIÓN: Solo devuelve productos que existen en el menú
        const validSuggestions = raw.filter((s) =>
            availableProducts.some((p) => p.name.toLowerCase() === String(s.item).toLowerCase())
        );

        return NextResponse.json({ suggestions: validSuggestions });

    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Error desconocido';
        console.error('❌ Error in API route:', error);
        return NextResponse.json({ error: message, suggestions: [] }, { status: 500 });
    }
}
