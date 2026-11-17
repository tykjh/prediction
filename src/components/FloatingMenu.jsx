import React, { useEffect, useRef, useState } from 'react';
import { useLanguage } from '../i18n/LanguageContext';

// Small "extras" button. It opens a plain list where every action has a
// written label, replacing the old fan of unlabeled icons and long-presses.
// Desktop only: on phones the same actions live in the "Mine" panel.
const FloatingMenu = ({ onQuickPick, onToggleTheme, onResetTheme, onMoneyRain, playSound }) => {
    const { t } = useLanguage();
    const [isOpen, setIsOpen] = useState(false);
    const rootRef = useRef(null);

    useEffect(() => {
        if (!isOpen) return undefined;
        const onDown = (e) => {
            if (!rootRef.current?.contains(e.target)) setIsOpen(false);
        };
        const onKey = (e) => {
            if (e.key === 'Escape') setIsOpen(false);
        };
        document.addEventListener('mousedown', onDown);
        document.addEventListener('keydown', onKey);
        return () => {
            document.removeEventListener('mousedown', onDown);
            document.removeEventListener('keydown', onKey);
        };
    }, [isOpen]);

    const items = [
        { icon: '⚡', label: t('shell.tools.quickPick'), action: onQuickPick, close: true },
        { icon: '🎨', label: t('shell.tools.nextTheme'), action: onToggleTheme, close: false },
        { icon: '↺', label: t('shell.tools.resetTheme'), action: onResetTheme, close: false },
        { icon: '💸', label: t('shell.tools.moneyRain'), action: onMoneyRain, close: true },
    ];

    const run = (item) => {
        if (playSound) playSound('click');
        item.action();
        if (item.close) setIsOpen(false);
    };

    return (
        <div ref={rootRef} className="fixed bottom-6 left-6 z-40 hidden md:block">
            {isOpen && (
                <div className="mb-2 w-52 overflow-hidden rounded-xl border border-white/10 bg-[var(--app-raised)] py-1 shadow-xl light:border-stone-200 light:bg-white">
                    {items.map((item) => (
                        <button
                            key={item.label}
                            onClick={() => run(item)}
                            className="flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm text-stone-200 hover:bg-white/10 light:text-stone-700 light:hover:bg-stone-100"
                        >
                            <span className="w-5 text-center" aria-hidden="true">{item.icon}</span>
                            <span>{item.label}</span>
                        </button>
                    ))}
                </div>
            )}

            <button
                onClick={() => {
                    if (playSound) playSound('click');
                    setIsOpen((open) => !open);
                }}
                aria-expanded={isOpen}
                aria-label={t('shell.tools.open')}
                title={t('shell.tools.open')}
                className="flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-[var(--app-raised)] text-lg text-stone-200 shadow-lg transition-colors hover:brightness-125 light:border-stone-200 light:bg-white light:text-stone-700 light:hover:bg-stone-100"
            >
                {isOpen ? '✕' : '✨'}
            </button>
        </div>
    );
};

export default FloatingMenu;
