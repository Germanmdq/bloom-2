import React from 'react';

interface CategoryButtonProps {
    category: {
        id: string | number;
        name: string;
        icon?: string;
        sort_order: number;
    };
    isActive: boolean;
    productsCount: number;
    onClick: () => void;
}

export function CategoryButton({ category, isActive, productsCount, onClick }: CategoryButtonProps) {
    return (
        <button
            onClick={onClick}
            className={`
                w-full text-left px-4 py-3 rounded-xl transition-all duration-200 group flex items-center justify-between mb-1
                ${isActive
                    ? 'bg-bloom-600 text-white shadow-md transform scale-[1.02]'
                    : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
                }
            `}
        >
            <div className="flex items-center gap-3 overflow-hidden">
                <span className={`text-xl transition-transform ${isActive ? 'scale-110' : 'grayscale group-hover:grayscale-0'}`}>
                    {category.icon || '📦'}
                </span>
                <span className={`font-bold text-xs uppercase tracking-wider truncate ${isActive ? 'text-white' : ''}`}>
                    {category.name}
                </span>
            </div>

            {productsCount > 0 && (
                <span className={`
                    text-[10px] font-black px-1.5 py-0.5 rounded-full min-w-[20px] text-center
                    ${isActive
                        ? 'bg-white/20 text-white'
                        : 'bg-gray-100 text-gray-400 group-hover:bg-gray-200'
                    }
                `}>
                    {productsCount}
                </span>
            )}
        </button>
    );
}
