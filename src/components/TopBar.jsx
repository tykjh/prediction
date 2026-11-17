import React from 'react';
import GamePicker from './GamePicker';
import { useLanguage } from '../i18n/LanguageContext';
import { NAV_ITEMS } from '../config/nav';

const iconButton = 'flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 text-sm text-stone-300 transition-colors hover:bg-white/10 light:border-stone-200 light:text-stone-600 light:hover:bg-stone-100';

const TopBar = ({ currentView, onViewChange, onOpenMine, onOpenManual, isLightMode, onToggleLightMode, activeGameID, onSwitchGame }) => {
    const { lang, toggleLang, t } = useLanguage();

    return (
        <div className="sticky top-0 z-50 border-b border-white/10 bg-[var(--app-base)] light:border-stone-200">
            <div className="mx-auto max-w-7xl px-3 sm:px-6 lg:px-8">
                <div className="flex h-14 items-center gap-3">
                    <button
                        onClick={() => onViewChange('workspace')}
                        className="text-lg font-bold tracking-tight text-stone-50 light:text-stone-900"
                    >
                        {t('shell.appName')}
                    </button>

                    {/* Page tabs: desktop only, phones use the bottom bar */}
                    <nav className="ml-4 hidden items-center gap-1 md:flex">
                        {NAV_ITEMS.map((item) => {
                            const active = currentView === item.id;
                            return (
                                <button
                                    key={item.id}
                                    onClick={() => onViewChange(item.id)}
                                    aria-current={active ? 'page' : undefined}
                                    className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${active
                                        ? 'bg-white/10 text-stone-50 light:bg-stone-200 light:text-stone-900'
                                        : 'text-stone-400 hover:text-stone-100 light:text-stone-500 light:hover:text-stone-900'
                                        }`}
                                >
                                    {t(item.labelKey)}
                                </button>
                            );
                        })}
                    </nav>

                    <div className="ml-auto flex items-center gap-2">
                        <GamePicker
                            activeGameID={activeGameID}
                            onSwitchGame={onSwitchGame}
                            className="hidden sm:flex"
                        />

                        <button onClick={onOpenManual} className={`${iconButton} hidden sm:flex`} title={t('shell.nav.manual')} aria-label={t('shell.nav.manual')}>
                            ?
                        </button>
                        <button
                            onClick={onToggleLightMode}
                            className={iconButton}
                            title={isLightMode ? t('topbar.darkMode') : t('topbar.lightMode')}
                            aria-label={isLightMode ? t('topbar.darkMode') : t('topbar.lightMode')}
                        >
                            {isLightMode ? '🌙' : '☀️'}
                        </button>
                        <button onClick={toggleLang} className={`${iconButton} text-xs font-semibold`} title={t('topbar.language')} aria-label={t('topbar.language')}>
                            {lang === 'zh' ? 'EN' : '中'}
                        </button>
                        <button
                            onClick={onOpenMine}
                            title={t('shell.nav.mineTitle')}
                            className="hidden h-9 items-center gap-1.5 rounded-lg bg-amber-500 px-3 text-sm font-semibold text-stone-900 transition-colors hover:bg-amber-400 md:flex"
                        >
                            {t('shell.nav.mine')}
                        </button>
                    </div>
                </div>

                {/* Phones: the game picker gets its own full-width row */}
                <div className="pb-3 sm:hidden">
                    <GamePicker activeGameID={activeGameID} onSwitchGame={onSwitchGame} />
                </div>
            </div>
        </div>
    );
};

export default TopBar;
