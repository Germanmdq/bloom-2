"use client";
import Link from "next/link";
import { IconMapPin, IconBrandInstagram, IconBrandFacebook } from "@tabler/icons-react";

export function SiteFooter() {
    return (
        <footer className="bg-bloom-page border-t border-english-200/70 pt-12 pb-8 mt-16">
            <div className="max-w-5xl mx-auto px-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-10">
                    {/* Brand */}
                    <div className="col-span-2">
                        <h3 className="text-2xl font-black text-gray-900 tracking-tighter mb-3">
                            BLOOM<span className="text-english-600">.</span>
                        </h3>
                        <p className="text-gray-400 text-sm leading-relaxed max-w-xs mb-4">
                            Café de especialidad, pastelería artesanal y mucho más.
                            Te esperamos para compartir un buen momento.
                        </p>
                        <div className="flex gap-3">
                            <a href="https://instagram.com" target="_blank" rel="noreferrer"
                                className="w-9 h-9 bg-gray-100 hover:bg-bloom-100 rounded-full flex items-center justify-center transition-colors">
                                <IconBrandInstagram size={16} className="text-gray-600" />
                            </a>
                            <a href="https://facebook.com" target="_blank" rel="noreferrer"
                                className="w-9 h-9 bg-gray-100 hover:bg-bloom-100 rounded-full flex items-center justify-center transition-colors">
                                <IconBrandFacebook size={16} className="text-gray-600" />
                            </a>
                        </div>
                    </div>

                    {/* Ubicación */}
                    <div>
                        <h4 className="font-black text-gray-800 text-sm uppercase tracking-wide mb-3">Ubicación</h4>
                        <ul className="space-y-2 text-sm text-gray-500">
                            <li className="flex items-start gap-1.5">
                                <IconMapPin size={14} className="shrink-0 mt-0.5 text-bloom-500" />
                                Almirante Brown 2005, Mar del Plata
                            </li>
                            <li className="text-bloom-600 font-bold cursor-pointer hover:underline text-xs mt-2">Ver en Maps →</li>
                        </ul>
                    </div>

                    {/* Links */}
                    <div>
                        <h4 className="font-black text-gray-800 text-sm uppercase tracking-wide mb-3">Menú</h4>
                        <ul className="space-y-2 text-sm">
                            <li><Link href="/menu" className="text-gray-500 hover:text-bloom-600 transition-colors">Carta completa</Link></li>
                            <li><Link href="/menu?cat=Platos Diarios" className="text-gray-500 hover:text-bloom-600 transition-colors">Platos del Día</Link></li>
                            <li><Link href="/menu?cat=Promociones" className="text-gray-500 hover:text-bloom-600 transition-colors">Promociones</Link></li>
                            <li><Link href="/cuenta" className="text-gray-500 hover:text-bloom-600 transition-colors">Mi Cuenta</Link></li>
                        </ul>
                    </div>
                </div>

                <div className="border-t border-gray-100 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-gray-400">
                    <span>© {new Date().getFullYear()} Bloom. Todos los derechos reservados.</span>
                    <Link href="/login" className="opacity-0 hover:opacity-100 transition-opacity duration-300 hover:text-gray-500 select-none">·</Link>
                </div>
            </div>
        </footer>
    );
}
