import { IconCash, IconCreditCard, IconDeviceMobile, IconReceipt } from "@tabler/icons-react";

export function getPaymentIcon(method: string) {
    switch (method) {
        case 'CASH': return <IconCash size={16} className="text-green-600" />;
        case 'CARD': return <IconCreditCard size={16} className="text-blue-600" />;
        case 'MERCADO_PAGO': return <IconDeviceMobile size={16} className="text-sky-500" />;
        default: return <IconReceipt size={16} className="text-gray-400" />;
    }
}

export function getPaymentLabel(method: string): string {
    switch (method) {
        case 'CASH': return 'Efectivo';
        case 'CARD': return 'Tarjeta';
        case 'MERCADO_PAGO': return 'Mercado Pago';
        default: return method;
    }
}
