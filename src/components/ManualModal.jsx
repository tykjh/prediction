import React, { useState } from 'react';
import { useLanguage } from '../i18n/LanguageContext';

const GROUPS = [
    {
        id: 'workspace',
        icon: '🛠️',
        labelKey: 'manual.groupWorkspace',
        items: [
            { titleKey: 'workspace.help.predictionEngine.title', bodyKey: 'workspace.help.predictionEngine.body' },
            { titleKey: 'workspace.help.statisticalAnalysis.title', bodyKey: 'workspace.help.statisticalAnalysis.body' },
            { titleKey: 'workspace.help.historicalData.title', bodyKey: 'workspace.help.historicalData.body' },
            { titleKey: 'workspace.help.dataManagement.title', bodyKey: 'workspace.help.dataManagement.body' },
        ],
    },
    {
        id: 'labs',
        icon: '🧪',
        labelKey: 'manual.groupLabs',
        items: [
            { titleKey: 'prophet.help.title', bodyKey: 'prophet.help.body' },
            { titleKey: 'chainReactor.help.title', bodyKey: 'chainReactor.help.body' },
            { titleKey: 'matrixGrid.help.title', bodyKey: 'matrixGrid.help.body' },
            { titleKey: 'chaosHunter.help.title', bodyKey: 'chaosHunter.help.body' },
            { titleKey: 'monteCarlo.help.title', bodyKey: 'monteCarlo.help.body' },
            { titleKey: 'zoneTwoLab.help.title', bodyKey: 'zoneTwoLab.help.body' },
        ],
    },
    {
        id: 'quality',
        icon: '🎯',
        labelKey: 'manual.groupQuality',
        items: [
            { titleKey: 'backtestLab.help.title', bodyKey: 'backtestLab.help.body' },
            { titleKey: 'backtestLabProphet.help.title', bodyKey: 'backtestLabProphet.help.body' },
            { titleKey: 'backtestLabHybrid.help.title', bodyKey: 'backtestLabHybrid.help.body' },
        ],
    },
    {
        id: 'playground',
        icon: '🎡',
        labelKey: 'manual.groupPlayground',
        items: [
            { titleKey: 'playground.topics.chaos.name', bodyKey: 'playground.topics.chaos.description' },
            { titleKey: 'playground.topics.synth.name', bodyKey: 'playground.topics.synth.description' },
            { titleKey: 'playground.topics.alchemy.name', bodyKey: 'playground.topics.alchemy.description' },
            { titleKey: 'playground.topics.dream.name', bodyKey: 'playground.topics.dream.description' },
            { titleKey: 'playground.topics.slots.name', bodyKey: 'playground.topics.slots.description' },
        ],
    },
    {
        id: 'command',
        icon: '💾',
        labelKey: 'manual.groupCommand',
        items: [
            { titleKey: 'sidebar.help.vault.title', bodyKey: 'sidebar.help.vault.body' },
            { titleKey: 'sidebar.help.oracle.title', bodyKey: 'sidebar.help.oracle.body' },
            { titleKey: 'sidebar.help.config.title', bodyKey: 'sidebar.help.config.body' },
        ],
    },
];

const ManualModal = ({ onClose }) => {
    const { t } = useLanguage();
    const [openGroups, setOpenGroups] = useState(() => ({ workspace: true }));

    const toggleGroup = (id) => {
        setOpenGroups(prev => ({ ...prev, [id]: !prev[id] }));
    };

    return (
        <div
            className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-300"
            onClick={onClose}
        >
            <div
                className="w-full max-w-2xl max-h-[85vh] flex flex-col bg-slate-900 border border-slate-700 rounded-3xl shadow-2xl overflow-hidden"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-start justify-between gap-4 p-6 border-b border-white/5 bg-gradient-to-r from-indigo-600/10 via-transparent to-transparent">
                    <div className="flex items-start gap-4">
                        <div className="w-12 h-12 flex-shrink-0 rounded-2xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-2xl">
                            📖
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-white tracking-tight">{t('manual.title')}</h2>
                            <p className="text-xs text-slate-400 mt-1 leading-relaxed max-w-lg">{t('manual.subtitle')}</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        aria-label={t('manual.closeLabel')}
                        className="flex-shrink-0 w-9 h-9 flex items-center justify-center rounded-xl bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white transition-all active:scale-90"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                    {GROUPS.map(group => {
                        const isOpen = !!openGroups[group.id];
                        return (
                            <div key={group.id} className="rounded-2xl border border-white/5 bg-white/[0.02] overflow-hidden">
                                <button
                                    onClick={() => toggleGroup(group.id)}
                                    className="w-full flex items-center justify-between p-4 hover:bg-white/5 transition-colors"
                                >
                                    <div className="flex items-center gap-3">
                                        <span className="text-lg">{group.icon}</span>
                                        <span className="text-sm font-bold text-slate-200 uppercase tracking-wider">{t(group.labelKey)}</span>
                                    </div>
                                    <span className={`text-slate-500 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}>▼</span>
                                </button>
                                {isOpen && (
                                    <div className="px-4 pb-4 space-y-3">
                                        {group.id === 'command' && (
                                            <p className="text-[11px] text-slate-500 italic">{t('manual.commandHint')}</p>
                                        )}
                                        {group.items.map(item => (
                                            <div key={item.titleKey} className="p-3 rounded-xl bg-black/20 border border-white/5">
                                                <div className="text-xs font-black text-indigo-300 mb-1">{t(item.titleKey)}</div>
                                                <div className="text-xs text-slate-400 leading-relaxed">{t(item.bodyKey)}</div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export default ManualModal;
