import React, { useRef } from 'react';
import { IconChevronRight, IconChevronLeft } from "@tabler/icons-react";

interface HorizontalCategoryListProps {
    categories: any[];
    selectedCategory: string | number;
    onSelect: (id: string | number) => void;
}

export function HorizontalCategoryList({ categories, selectedCategory, onSelect }: HorizontalCategoryListProps) {
    const scrollRef = useRef<HTMLDivElement>(null);

    const scroll = (direction: 'left' | 'right') => {
        if (scrollRef.current) {
            scrollRef.current.scrollBy({ left: direction === 'left' ? -300 : 300, behavior: 'smooth' });
        }
    };

    return (
        <div className="relative flex items-center bg-white px-2 py-4 border-b border-gray-200">
            {/* Scroll Buttons (Large for Touch) */}
            <button
                onClick={() => scroll('left')}
                className="p-3 bg-gray-50 text-gray-400 hover:text-gray-900 rounded-full shadow-sm hover:bg-gray-200 disabled:opacity-50 shrink-0 mx-2"
            >
                <IconChevronLeft size={24} />
            </button>

            <div
                ref={scrollRef}
                className="flex gap-3 overflow-x-auto scrollbar-hide snap-x scroll-smooth px-2 w-full"
                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
                <button
                    onClick={() => onSelect('ALL')}
                    className={`
                        snap-start shrink-0 px-6 py-3 rounded-xl font-black text-lg shadow-sm border-2 transition-all flex items-center gap-2
                        ${selectedCategory === 'ALL'
                            ? 'bg-bloom-600 text-white border-bloom-600 scale-105 shadow-md'
                            : 'bg-gray-50 text-gray-500 border-transparent hover:bg-gray-100 hover:text-gray-900'
                        }
                    `}
                >
                    <span className="text-2xl">🍽️</span> TODOS
                </button>

                {categories.map((cat) => (
                    <button
                        key={cat.id}
                        onClick={() => onSelect(cat.id)}
                        className={`
                            snap-start shrink-0 px-6 py-3 rounded-xl font-bold text-lg shadow-sm border-2 transition-all flex items-center gap-2 whitespace-nowrap
                            ${selectedCategory === cat.id
                                ? 'bg-bloom-600 text-white border-bloom-600 scale-105 shadow-md z-10'
                                : 'bg-gray-50 text-gray-600 border-transparent hover:bg-gray-100 hover:text-gray-900'
                            }
                        `}
                    >
                        <span className="text-2xl">{cat.icon}</span>
                        {cat.name}
                    </button>
                ))}
            </div>

            <button
                onClick={() => scroll('right')}
                className="p-3 bg-gray-50 text-gray-400 hover:text-gray-900 rounded-full shadow-sm hover:bg-gray-200 disabled:opacity-50 shrink-0 mx-2"
            >
                <IconChevronRight size={24} />
            </button>
        </div>
    );
}
