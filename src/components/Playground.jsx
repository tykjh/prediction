import React, { useState, useEffect, useRef } from 'react';
import ChaosLab from './playground/ChaosLab';
import NeonSynth from './playground/NeonSynth';
import AlchemyLab from './playground/AlchemyLab';
import DreamCatcher from './playground/DreamCatcher';
import SlotMachine from './playground/SlotMachine';
import { useLanguage } from '../i18n/LanguageContext';

const TOPICS = [
    { id: 'chaos', icon: '🪐' },
    { id: 'synth', icon: '🎹' },
    { id: 'alchemy', icon: '⚗️' },
    { id: 'dream', icon: '🕸️' },
    { id: 'slots', icon: '🎰' },
];

const Playground = () => {
    const { t } = useLanguage();
    const [activeTopic, setActiveTopic] = useState('chaos'); // Default to Chaos Lab
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const menuRef = useRef(null);

    // Close menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (menuRef.current && !menuRef.current.contains(event.target)) {
                setIsMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const renderContent = () => {
        switch (activeTopic) {
            case 'chaos':
                return <ChaosLab />;
            case 'synth':
                return <NeonSynth />;
            case 'alchemy':
                return <AlchemyLab />;
            case 'dream':
                return <DreamCatcher />;
            case 'slots':
                return <SlotMachine />;
            default:
                return (
                    <div className="text-center space-y-4 pt-20 animate-in fade-in zoom-in duration-500">
                        <div className="inline-block p-6 rounded-full bg-slate-800/50 mb-4 animate-bounce">
                            <span className="text-6xl">🎡</span>
                        </div>
                        <h2 className="text-3xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
                            {t('playground.hubTitle')}
                        </h2>
                        <p className="text-slate-400 max-w-md mx-auto">
                            {t('playground.hubDescription')}
                        </p>
                    </div>
                );
        }
    };

    const activeTopicData = TOPICS.find(t => t.id === activeTopic) || TOPICS[0];

    return (
        <div className="flex flex-col h-full w-full bg-[#020617] text-white overflow-hidden relative font-sans">
            {/* Background Ambience */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(99,102,241,0.05),transparent_70%)] pointer-events-none"></div>

            {/* Header / Navigation */}
            <div className="relative z-20 flex items-center justify-between px-6 py-4 border-b border-white/5 bg-slate-900/50 backdrop-blur-md">
                <div className="flex items-center gap-3">
                    <span className="text-2xl">🎡</span>
                    <h1 className="text-xl font-bold tracking-tight text-white/90">{t('playground.title')}</h1>
                </div>

                {/* Topic Selector Dropdown */}
                <div className="relative" ref={menuRef}>
                    <button
                        onClick={() => setIsMenuOpen(!isMenuOpen)}
                        className="flex items-center gap-3 px-4 py-2 bg-slate-800/80 hover:bg-slate-700 rounded-xl border border-white/10 transition-all shadow-lg active:scale-95 group"
                    >
                        <span className="text-xl group-hover:scale-110 transition-transform">{activeTopicData.icon}</span>
                        <div className="text-left hidden sm:block">
                            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{t('playground.currentModule')}</div>
                            <div className="text-sm font-bold text-white leading-tight">{t(`playground.topics.${activeTopicData.id}.name`)}</div>
                        </div>
                        <svg className={`w-4 h-4 text-slate-400 transition-transform ${isMenuOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                    </button>

                    {/* Dropdown Menu */}
                    {isMenuOpen && (
                        <div className="absolute right-0 top-full mt-2 w-72 bg-slate-900/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl p-2 z-50 animate-in slide-in-from-top-2 duration-200">
                            <div className="text-xs font-bold text-slate-500 px-3 py-2 uppercase tracking-widest">{t('playground.selectModule')}</div>
                            <div className="space-y-1">
                                {TOPICS.map(topic => (
                                    <button
                                        key={topic.id}
                                        onClick={() => { setActiveTopic(topic.id); setIsMenuOpen(false); }}
                                        className={`w-full flex items-start gap-3 p-3 rounded-xl transition-all ${activeTopic === topic.id ? 'bg-indigo-600/20 border border-indigo-500/50' : 'hover:bg-white/5 border border-transparent'}`}
                                    >
                                        <span className="text-2xl mt-0.5">{topic.icon}</span>
                                        <div className="text-left">
                                            <div className={`font-bold ${activeTopic === topic.id ? 'text-indigo-400' : 'text-white'}`}>{t(`playground.topics.${topic.id}.name`)}</div>
                                            <div className="text-xs text-slate-400">{t(`playground.topics.${topic.id}.description`)}</div>
                                        </div>
                                        {activeTopic === topic.id && (
                                            <div className="ml-auto w-1.5 h-1.5 rounded-full bg-white animate-pulse"></div>
                                        )}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 overflow-y-auto overflow-x-auto p-6 relative">
                <div className="max-w-7xl mx-auto h-full flex flex-col items-center justify-center">
                    {renderContent()}
                </div>
            </div>
        </div>
    );
};

export default Playground;
