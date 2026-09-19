"use client";

import Link from "next/link";
import { IconCircleCheck } from "@tabler/icons-react";

export default function SuccessPage() {
    return (
        <main className="min-h-screen bg-black flex flex-col items-center justify-center text-center p-6 text-white">
            <div className="bg-[#111] p-10 rounded-3xl border border-white/5 max-w-md w-full shadow-2xl">
                <div className="flex justify-center mb-6">
                    <div className="bg-green-500/20 p-4 rounded-full">
                        <IconCircleCheck className="text-green-500 w-16 h-16" />
                    </div>
                </div>

                <h1 className="font-serif text-4xl mb-4 text-white">¡Gracias!</h1>
                <p className="text-gray-400 text-lg mb-8 leading-relaxed">
                    Tu pago fue procesado con éxito. <br />
                    El local ya está preparando tu pedido.
                </p>

                <div className="space-y-4">
                    <Link href="/menu">
                        <button className="w-full bg-bloom-600 hover:bg-bloom-700 text-white font-bold py-4 rounded-xl transition-colors uppercase tracking-widest text-xs">
                            Volver al Menú
                        </button>
                    </Link>

                    <a
                        href={`https://wa.me/5491112345678?text=Hola! Acabo de pagar mi pedido, me confirman?`}
                        target="_blank"
                        className="block w-full text-center text-gray-500 hover:text-white text-sm mt-4 underline decoration-gray-700 hover:decoration-white transition-all"
                    >
                        Contactar al Local
                    </a>
                </div>
            </div>
        </main>
    );
}
