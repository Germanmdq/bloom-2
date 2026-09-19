import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const MODEL = 'gemini-2.0-flash';

function getGenAI(): GoogleGenerativeAI | null {
    const apiKey = process.env.GEMINI_API_KEY?.trim();
    if (!apiKey) return null;
    return new GoogleGenerativeAI(apiKey);
}

export async function POST(request: NextRequest) {
    try {
        const genAI = getGenAI();
        if (!genAI) {
            return NextResponse.json({ time: 15, message: 'GEMINI_API_KEY no configurada' }, { status: 503 });
        }

        const { items } = await request.json();

        const itemsList = (items as { name: string }[]).map((i) => i.name).join(', ');

        const model = genAI.getGenerativeModel({
            model: MODEL,
            systemInstruction: 'Eres un chef experto. Respondes SOLO con un número (minutos).',
            generationConfig: {
                temperature: 0.3,
                maxOutputTokens: 10,
            },
        });

        const result = await model.generateContent({
            contents: [
                {
                    role: 'user',
                    parts: [
                        {
                            text: `Items a preparar: ${itemsList}

Estima el tiempo TOTAL de preparación en minutos. Solo el número.`,
                        },
                    ],
                },
            ],
        });

        const response = result.response.text().trim();
        const time = parseInt(response || '15', 10);

        return NextResponse.json({ time: isNaN(time) ? 15 : time });

    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Error desconocido';
        console.error('❌ Error in API route (Prep Time):', error);
        return NextResponse.json({ error: message, time: 15 }, { status: 500 });
    }
}
