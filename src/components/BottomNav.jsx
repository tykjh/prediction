import React from 'react';
import { NAV_ITEMS } from '../config/nav';
import { useLanguage } from '../i18n/LanguageContext';

// Phone navigation: every destination has an icon and a written label.
const BottomNav = ({ currentView, onViewChange, onOpenMine }) => {
    const { t } = useLanguage();
    const items = [...NAV_ITEMS, { id: 'mine', icon: '🔖', labelKey: 'shell.nav.mine' }];

    return (
        <nav
            className="fixed inset-x-0 bottom-0 z-50 border-t border-white/10 bg-[var(--app-base)] md:hidden light:border-stone-200"
            style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
        >
            <div className="mx-auto flex max-w-lg">
                {items.map((item) => {
                    const active = currentView === item.id;
                    return (
                        <button
                            key={item.id}
                            onClick={() => (item.id === 'mine' ? onOpenMine() : onViewChange(item.id))}
                            aria-current={active ? 'page' : undefined}
                            className={`flex min-h-[56px] flex-1 flex-col items-center justify-center gap-0.5 text-[11px] font-medium transition-colors ${active
                                ? 'text-amber-400 light:text-amber-700'
                                : 'text-stone-400 light:text-stone-500'
                                }`}
                        >
                            <span className="text-lg leading-none" aria-hidden="true">{item.icon}</span>
                            <span>{t(item.labelKey)}</span>
                        </button>
                    );
                })}
            </div>
        </nav>
    );
};

export default BottomNav;
