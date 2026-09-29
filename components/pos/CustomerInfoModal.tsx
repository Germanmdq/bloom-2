import React, { useState } from 'react';
import { IconX, IconMapPin, IconPhone, IconUser } from "@tabler/icons-react";

interface CustomerInfo {
    name: string;
    phone: string;
    address?: string;
    notes?: string;
}

interface CustomerInfoModalProps {
    isOpen: boolean;
    orderType: 'DELIVERY' | 'RETIRO';
    tableId: number;
    onClose: () => void;
    onSubmit: (data: CustomerInfo) => void;
}

export function CustomerInfoModal({ isOpen, orderType, tableId, onClose, onSubmit }: CustomerInfoModalProps) {
    const [formData, setFormData] = useState<CustomerInfo>({
        name: '',
        phone: '',
        address: '',
        notes: ''
    });

    if (!isOpen) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSubmit(formData);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-dark-900/50 backdrop-blur-sm animate-fadeIn">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-scaleIn">
                {/* Header */}
                <div className="px-6 py-4 bg-dark-50 border-b border-dark-100 flex justify-between items-center">
                    <div>
                        <h3 className="text-lg font-black text-dark-900 uppercase tracking-tight">Nuevo Pedido</h3>
                        <p className="text-xs font-bold text-dark-400 uppercase tracking-wider flex items-center gap-1">
                            {orderType === 'DELIVERY' ? '🛵 Delivery' : '🛍️ Retiro'} - Mesa {tableId}
                        </p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-dark-200 rounded-full transition-colors">
                        <IconX size={20} />
                    </button>
                </div>

                {/* Body */}
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-dark-500 uppercase tracking-wider ml-1">Nombre Cliente</label>
                        <div className="relative">
                            <IconUser className="absolute left-4 top-1/2 -translate-y-1/2 text-dark-400" size={18} />
                            <input
                                required
                                type="text"
                                placeholder="Juan Pérez"
                                value={formData.name}
                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                                className="w-full pl-11 pr-4 py-3 bg-dark-50 rounded-xl font-bold text-dark-900 focus:ring-2 focus:ring-bloom-500 focus:outline-none transition-all"
                            />
                        </div>
                    </div>

                    <div className="space-y-1">
                        <label className="text-xs font-bold text-dark-500 uppercase tracking-wider ml-1">Teléfono / WhatsApp</label>
                        <div className="relative">
                            <IconPhone className="absolute left-4 top-1/2 -translate-y-1/2 text-dark-400" size={18} />
                            <input
                                required
                                type="tel"
                                placeholder="223 123 4567"
                                value={formData.phone}
                                onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                className="w-full pl-11 pr-4 py-3 bg-dark-50 rounded-xl font-bold text-dark-900 focus:ring-2 focus:ring-bloom-500 focus:outline-none transition-all"
                            />
                        </div>
                    </div>

                    {orderType === 'DELIVERY' && (
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-dark-500 uppercase tracking-wider ml-1">Dirección de Entrega</label>
                            <div className="relative">
                                <IconMapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-dark-400" size={18} />
                                <input
                                    required
                                    type="text"
                                    placeholder="Av. Libertad 1234"
                                    value={formData.address}
                                    onChange={e => setFormData({ ...formData, address: e.target.value })}
                                    className="w-full pl-11 pr-4 py-3 bg-dark-50 rounded-xl font-bold text-dark-900 focus:ring-2 focus:ring-bloom-500 focus:outline-none transition-all"
                                />
                            </div>
                        </div>
                    )}

                    <div className="space-y-1">
                        <label className="text-xs font-bold text-dark-500 uppercase tracking-wider ml-1">Notas Adicionales</label>
                        <textarea
                            rows={2}
                            placeholder="Timbre no funciona, dejar en puerta..."
                            value={formData.notes}
                            onChange={e => setFormData({ ...formData, notes: e.target.value })}
                            className="w-full p-4 bg-dark-50 rounded-xl font-medium text-dark-900 focus:ring-2 focus:ring-bloom-500 focus:outline-none transition-all resize-none"
                        />
                    </div>

                    <div className="pt-4 flex gap-3">
                        <button type="button" onClick={onClose} className="flex-1 py-3.5 rounded-xl font-bold text-dark-500 hover:bg-dark-100 transition-colors">
                            Cancelar
                        </button>
                        <button type="submit" className="flex-[2] bg-bloom-500 hover:bg-bloom-600 text-white py-3.5 rounded-xl font-black uppercase tracking-widest shadow-lg shadow-bloom-500/20 transition-all active:scale-95">
                            Iniciar Pedido
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
