import React from 'react';
import { useLanguage } from '../i18n/LanguageContext';

const TopBar = ({ currentView, onViewChange, onLogoClick, onOpenManual, isLightMode, onToggleLightMode, activeGameID, onToggleGame, activeGameLogo }) => {
    const { lang, toggleLang, t } = useLanguage();
    return (
        <div className="bg-slate-950/80 light:bg-slate-100/80 backdrop-blur-xl border-b border-white/5 light:border-black/5 sticky top-0 z-50 supports-[backdrop-filter]:bg-slate-950/60 light:supports-[backdrop-filter]:bg-slate-100/60 transition-colors duration-500">
            <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
                <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 py-3 md:py-0 md:h-20 relative">

                    {/* Left Side: Manual + Logo */}
                    <div className="order-1 flex items-center gap-2 sm:gap-3 z-10">
                        {/* Operation Manual Button */}
                        <button
                            onClick={onOpenManual}
                            className="flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-slate-900 light:bg-white/80 border border-white/10 light:border-black/5 text-indigo-400 light:text-indigo-600 transition-all duration-300 hover:scale-110 shadow-lg hover:bg-slate-800 light:hover:bg-white"
                            title={t('manual.openLabel')}
                            aria-label={t('manual.openLabel')}
                        >
                            <span className="text-base sm:text-lg">📖</span>
                        </button>

                        {/* Logo Area */}
                        <div
                            className="flex items-center gap-2 sm:gap-4 group cursor-pointer"
                            onClick={onLogoClick}
                        >
                            <div className="relative w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center">
                                <div className="absolute inset-0 bg-indigo-500 rounded-xl rotate-6 group-hover:rotate-12 transition-transform duration-500 opacity-20 blur-md"></div>
                                <div className="relative w-9 h-9 sm:w-10 sm:h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center text-white font-black text-base sm:text-lg shadow-lg shadow-indigo-500/30 border border-white/10 group-hover:scale-105 transition-transform duration-300">
                                    L
                                </div>
                            </div>
                            <div className="flex flex-col">
                                <span className="text-base sm:text-xl font-black tracking-tight text-white light:text-slate-900 transition-colors">
                                    LottoOS
                                </span>
                                <span className="hidden sm:block text-[10px] uppercase font-bold text-indigo-400/80 light:text-indigo-600/80 tracking-widest leading-none">
                                    System v2.0
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Navigation Tabs (pill switcher): full-width row on mobile, absolute-centered on desktop */}
                    <div className="order-3 md:order-none w-full md:w-auto md:absolute md:left-1/2 md:top-1/2 md:-translate-x-1/2 md:-translate-y-1/2 flex justify-center md:justify-start overflow-x-auto">
                        <div className="flex bg-slate-900/50 light:bg-slate-200/50 p-1.5 rounded-xl border border-white/5 light:border-black/5 ring-1 ring-black/20 light:ring-black/5 transition-colors">
                            <button
                                onClick={() => onViewChange('workspace')}
                                className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-5 py-2 sm:py-2.5 rounded-lg text-[10px] sm:text-xs font-bold uppercase tracking-wider transition-all duration-300 ${currentView === 'workspace'
                                    ? 'bg-slate-800 text-white shadow-lg shadow-black/20 ring-1 ring-white/10 light:bg-white light:text-indigo-600 light:shadow-indigo-500/10 light:ring-black/5'
                                    : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/30 light:text-slate-500 light:hover:text-slate-700 light:hover:bg-black/5'
                                    }`}
                            >
                                <span className="text-sm sm:text-base">🛠️</span>
                                <span className="hidden sm:inline">{t('topbar.workspace')}</span>
                            </button>
                            <button
                                onClick={() => onViewChange('test-area')}
                                className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-5 py-2 sm:py-2.5 rounded-lg text-[10px] sm:text-xs font-bold uppercase tracking-wider transition-all duration-300 ${currentView === 'test-area'
                                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/20 ring-1 ring-white/20 light:bg-white light:text-indigo-600 light:shadow-indigo-500/20 light:ring-black/5'
                                    : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/30 light:text-slate-400 light:hover:text-slate-600 light:hover:bg-black/5'
                                    }`}
                            >
                                <span className="text-sm sm:text-base">🧪</span>
                                <span className="hidden sm:inline">{t('topbar.labs')}</span>
                            </button>
                            <button
                                onClick={() => onViewChange('backtest')}
                                className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-5 py-2 sm:py-2.5 rounded-lg text-[10px] sm:text-xs font-bold uppercase tracking-wider transition-all duration-300 ${currentView === 'backtest'
                                    ? 'bg-purple-600 text-white shadow-lg shadow-purple-900/20 ring-1 ring-white/20 light:bg-white light:text-purple-600 light:shadow-purple-500/20 light:ring-black/5'
                                    : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/30 light:text-slate-400 light:hover:text-slate-600 light:hover:bg-black/5'
                                    }`}
                            >
                                <span className="text-sm sm:text-base">🎯</span>
                                <span className="hidden sm:inline">{t('topbar.quality')}</span>
                            </button>
                        </div>
                    </div>

                    {/* Right Side: Operations */}
                    <div className="order-2 flex items-center gap-1.5 sm:gap-3">
                        {/* Playground Link (Standalone) */}
                        <button
                            onClick={() => onViewChange('playground')}
                            className={`flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 rounded-xl transition-all duration-300 shadow-lg border hover:scale-110 active:scale-95 ${currentView === 'playground'
                                ? 'bg-emerald-600 border-emerald-500 text-white shadow-emerald-900/40'
                                : 'bg-slate-900 light:bg-white/80 border-white/10 light:border-black/5 text-emerald-400 light:text-emerald-600 hover:bg-slate-800 light:hover:bg-white'
                                }`}
                            title={t('topbar.playground')}
                        >
                            <span className="text-lg sm:text-xl">🎡</span>
                        </button>
                        {/* Game Switcher */}
                        <button
                            onClick={onToggleGame}
                            className={`group flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-4 py-2 rounded-xl transition-all duration-300 font-bold border shadow-lg ${activeGameID === 'SUPERLOTTO'
                                ? 'bg-rose-600/20 border-rose-500/30 text-rose-400 hover:bg-rose-600 hover:text-white hover:border-rose-500 shadow-rose-900/20 light:bg-rose-100 light:text-rose-700 light:border-rose-300 light:hover:bg-rose-600 light:hover:text-white'
                                : activeGameID === '539'
                                    ? 'bg-emerald-600/20 border-emerald-500/30 text-emerald-400 hover:bg-emerald-600 hover:text-white hover:border-emerald-500 shadow-emerald-900/20 light:bg-emerald-100 light:text-emerald-700 light:border-emerald-300 light:hover:bg-emerald-600 light:hover:text-white'
                                    : 'bg-cyan-600/20 border-cyan-500/30 text-cyan-400 hover:bg-cyan-600 hover:text-white hover:border-cyan-500 shadow-cyan-900/20 light:bg-cyan-100 light:text-cyan-700 light:border-cyan-300 light:hover:bg-cyan-600 light:hover:text-white'
                                }`}
                            title={t('topbar.switchGame')}
                        >
                            <span className="text-base sm:text-lg group-hover:rotate-12 transition-transform duration-300">
                                {activeGameLogo || '🎱'}
                            </span>
                            <span className="hidden sm:inline text-xs uppercase tracking-wider">
                                {activeGameID === 'SUPERLOTTO' ? t('topbar.superLotto') : (activeGameID === '539' ? t('topbar.jinCai539') : t('topbar.lotto649'))}
                            </span>
                        </button>

                        {/* Toggle Theme Button */}
                        <button
                            onClick={onToggleLightMode}
                            className="bg-slate-900 light:bg-white/80 border border-white/10 light:border-black/5 p-1.5 sm:p-2 rounded-xl transition-all duration-300 hover:scale-110 shadow-lg text-lg sm:text-xl hover:bg-slate-800 light:hover:bg-white"
                            title={isLightMode ? t('topbar.darkMode') : t('topbar.lightMode')}
                        >
                            {isLightMode ? '🌙' : '☀️'}
                        </button>

                        {/* Language Toggle Button */}
                        <button
                            onClick={toggleLang}
                            className="bg-slate-900 light:bg-white/80 border border-white/10 light:border-black/5 w-9 h-9 sm:w-10 sm:h-10 rounded-xl transition-all duration-300 hover:scale-110 shadow-lg text-xs font-black uppercase tracking-wider text-slate-300 light:text-slate-700 hover:bg-slate-800 light:hover:bg-white flex items-center justify-center"
                            title={t('topbar.language')}
                        >
                            {lang === 'zh' ? 'EN' : '中'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TopBar;
