import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';

// Small "?" trigger that pops up a floating instructions card.
// Rendered via a portal so it always sits on top, regardless of any
// ancestor's overflow-hidden / backdrop-blur stacking context.
const HelpIcon = ({ title, body, className = '' }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [pos, setPos] = useState(null);
    const btnRef = useRef(null);

    const computePosition = () => {
        if (!btnRef.current) return;
        const rect = btnRef.current.getBoundingClientRect();
        const width = Math.min(320, window.innerWidth - 24);
        let left = rect.right - width;
        left = Math.max(12, Math.min(left, window.innerWidth - width - 12));
        let top = rect.bottom + 8;
        if (top + 160 > window.innerHeight) {
            top = Math.max(12, rect.top - 8 - 160);
        }
        setPos({ top, left, width });
    };

    const toggle = (e) => {
        e.stopPropagation();
        if (!isOpen) computePosition();
        setIsOpen(o => !o);
    };

    useEffect(() => {
        if (!isOpen) return;

        const close = () => setIsOpen(false);
        const onDocClick = (e) => {
            if (btnRef.current?.contains(e.target)) return;
            if (e.target.closest?.('[data-help-popover]')) return;
            close();
        };
        const onKey = (e) => { if (e.key === 'Escape') close(); };

        document.addEventListener('mousedown', onDocClick);
        document.addEventListener('keydown', onKey);
        window.addEventListener('scroll', close, true);
        window.addEventListener('resize', close);
        return () => {
            document.removeEventListener('mousedown', onDocClick);
            document.removeEventListener('keydown', onKey);
            window.removeEventListener('scroll', close, true);
            window.removeEventListener('resize', close);
        };
    }, [isOpen]);

    return (
        <>
            <button
                ref={btnRef}
                type="button"
                onClick={toggle}
                title={title}
                aria-label={title}
                className={`flex-shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-white/5 light:bg-slate-100 border border-white/10 light:border-slate-300 text-slate-400 light:text-slate-500 hover:bg-indigo-500 hover:text-white hover:border-indigo-400 transition-all duration-300 text-xs font-black shadow-md active:scale-90 ${className}`}
            >
                ?
            </button>
            {isOpen && pos && createPortal(
                <div
                    data-help-popover
                    onClick={(e) => e.stopPropagation()}
                    style={{ position: 'fixed', top: pos.top, left: pos.left, width: pos.width }}
                    className="z-[1000] bg-slate-900/95 border border-white/10 rounded-2xl shadow-2xl backdrop-blur-xl p-5 animate-in fade-in zoom-in-95 duration-200"
                >
                    <div className="flex items-start justify-between gap-3 mb-2">
                        <h4 className="text-sm font-black text-white tracking-tight">{title}</h4>
                        <button
                            onClick={() => setIsOpen(false)}
                            aria-label="Close"
                            className="text-slate-500 hover:text-white text-lg leading-none flex-shrink-0"
                        >
                            ×
                        </button>
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-line">{body}</p>
                </div>,
                document.body
            )}
        </>
    );
};

export default HelpIcon;
