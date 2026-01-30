import { useEffect, useRef } from 'react';

export const useInactivityTimer = (callback: () => void, timeoutMs: number = 60000) => {
    const timerRef = useRef<NodeJS.Timeout | null>(null);

    const resetTimer = () => {
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(callback, timeoutMs);
    };

    useEffect(() => {
        const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];

        const handleActivity = () => resetTimer();

        events.forEach(event => window.addEventListener(event, handleActivity));
        resetTimer();

        return () => {
            if (timerRef.current) clearTimeout(timerRef.current);
            events.forEach(event => window.removeEventListener(event, handleActivity));
        };
    }, [callback, timeoutMs]);
};
