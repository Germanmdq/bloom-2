import React, { useState } from 'react';
import IconPhoto from 'next/image';
import { IconPlus, IconShoppingBag } from "@tabler/icons-react";

interface ProductCardProps {
    product: {
        id: string;
        name: string;
        description: string;
        price: number;
        image_url?: string;
        active: boolean;
        category_id?: number | string;
    };
    onAdd: (product: any) => void;
}

export function ProductCard({ product, onAdd }: ProductCardProps) {
    const isActive = product.active !== false;
    const [imgError, setImgError] = useState(false);

    // Fallback icon based on category logic could be added here if needed
    // For now, consistent placeholder 

    return (
        <div
            onClick={() => isActive && onAdd(product)}
            className={`
                group bg-white rounded-2xl shadow-sm border border-gray-100 flex flex-col h-full overflow-hidden transition-all duration-300
                ${isActive
                    ? 'hover:shadow-lg hover:-translate-y-1 hover:border-bloom-200 cursor-pointer'
                    : 'opacity-50 grayscale cursor-not-allowed pointer-events-none'
                }
            `}
        >
            {/* IconPhoto Area (Fixed aspect ratio 16:9 for compactness) */}
            <div className="relative aspect-video bg-gray-50 overflow-hidden">
                {!imgError && product.image_url ? (
                    <IconPhoto
                        src={product.image_url}
                        alt={product.name}
                        fill
                        className="object-cover transition-transform duration-500 group-hover:scale-110"
                        onError={() => setImgError(true)}
                    />
                ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-gray-300 group-hover:text-bloom-300 transition-colors">
                        <IconShoppingBag size={32} strokeWidth={1} />
                    </div>
                )}

                {/* Price IconTag Overlay */}
                <div className="absolute bottom-2 right-2 bg-white/95 backdrop-blur shadow-sm px-2.5 py-1 rounded-lg text-sm font-black text-gray-900 border border-gray-100 group-hover:border-bloom-600 group-hover:text-bloom-600 transition-colors">
                    ${Number(product.price || 0).toLocaleString()}
                </div>
            </div>

            {/* Content */}
            <div className="p-3 flex flex-col flex-1">
                <h3 className="font-bold text-gray-800 text-sm leading-tight mb-1 line-clamp-1 group-hover:text-bloom-600 transition-colors">
                    {product.name}
                </h3>
                <p className="text-[11px] text-gray-400 line-clamp-2 mb-2 flex-1 leading-relaxed">
                    {product.description || 'Sin descripción'}
                </p>

                {/* Action Footer (Implicit action via card click, but button for affordance) */}
                <div className="mt-auto flex justify-end">
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            isActive && onAdd(product);
                        }}
                        className={`
                            p-2 rounded-full shadow-sm transition-all duration-200 active:scale-95
                            ${isActive
                                ? 'bg-bloom-50 text-bloom-600 hover:bg-bloom-600 hover:text-white'
                                : 'bg-gray-100 text-gray-400'
                            }
                        `}
                    >
                        <IconPlus size={16} strokeWidth={3} />
                    </button>
                </div>
            </div>
        </div>
    );
}
