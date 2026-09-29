import { useEffect } from 'react';

export function useEscape(onEscape: () => void) {
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                onEscape();
            }
        };
        
        // Listener para el evento nativo
        window.addEventListener('keydown', handleKeyDown);
        
        // Listener para el evento personalizado global (por si acaso)
        window.addEventListener('bloom-close-all', onEscape);
        
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('bloom-close-all', onEscape);
        };
    }, [onEscape]);
}
