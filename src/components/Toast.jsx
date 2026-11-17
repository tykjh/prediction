import React, { useEffect } from 'react';

// A short message that fades on its own, used instead of blocking alert() boxes.
const Toast = ({ message, onDone, duration = 3200 }) => {
    useEffect(() => {
        if (!message) return undefined;
        const timer = setTimeout(onDone, duration);
        return () => clearTimeout(timer);
    }, [message, onDone, duration]);

    if (!message) return null;

    return (
        <div className="pointer-events-none fixed inset-x-0 bottom-24 z-[1100] flex justify-center px-4 md:bottom-8" role="status" aria-live="polite">
            <div className="pointer-events-auto max-w-md rounded-xl bg-stone-100 px-4 py-3 text-sm font-medium text-stone-900 shadow-lg">
                {message}
            </div>
        </div>
    );
};

export default Toast;
