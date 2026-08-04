import React from 'react';
import MagicHeader from './MagicHeader';
import MatrixGrid from './MatrixGrid';
import MonteCarlo from './MonteCarlo';
import ChaosHunter from './ChaosHunter';
import Prophet from './Prophet';
import ChainReactor from './ChainReactor';
import ZoneTwoLab from './ZoneTwoLab';
import { useLanguage } from '../i18n/LanguageContext';

const ExperimentHeader = ({ icon, title, subtitle, badge }) => (
    <div className="flex items-center gap-5 mb-8 pb-6 border-b border-white/5 relative group">
        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center border text-3xl shadow-lg transition-transform duration-500 group-hover:scale-110 group-hover:rotate-6 ${badge === 'EXP-01' ? 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400 shadow-indigo-500/10' :
            badge === 'EXP-02' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400 shadow-emerald-500/10' :
                badge === 'EXP-03' ? 'bg-orange-500/10 border-orange-500/20 text-orange-400 shadow-orange-500/10' :
                    badge === 'EXP-04' ? 'bg-purple-500/10 border-purple-500/20 text-purple-400 shadow-purple-500/10' :
                        'bg-rose-500/10 border-rose-500/20 text-rose-400 shadow-rose-500/10'
            }`}>
            {icon}
        </div>
        <div>
            <div className="flex items-center gap-3">
                <h3 className="text-2xl font-black text-white tracking-tight">{title}</h3>
                <span className={`text-[10px] font-black px-2 py-0.5 rounded border tracking-widest uppercase ${badge === 'EXP-01' ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-300' :
                    badge === 'EXP-02' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' :
                        badge === 'EXP-03' ? 'bg-orange-500/10 border-orange-500/30 text-orange-300' :
                            badge === 'EXP-04' ? 'bg-purple-500/10 border-purple-500/30 text-purple-300' :
                                'bg-rose-500/10 border-rose-500/30 text-rose-300'}`}>
                    {badge}
                </span>
            </div>
            <p className="text-sm text-slate-400 mt-1 font-medium">{subtitle}</p>
        </div>
        {/* Hover accent line */}
        <div className="absolute -bottom-px left-0 w-0 h-px bg-gradient-to-r from-transparent via-white/50 to-transparent group-hover:w-full transition-all duration-700"></div>
    </div>
);

const TestArea = ({ historyData, bgTheme, onSavePrediction, isLightMode, reducedMotion, activeGameConfig }) => {
    const { t } = useLanguage();
    return (
        <div className="mx-auto space-y-6">

            {/* Main Header */}
            <MagicHeader
                title={t('testArea.title')}
                subtitle={t('testArea.subtitle')}
                icon="🧪"
                themeIndex={bgTheme}
                isLightMode={isLightMode}
                reducedMotion={reducedMotion}
            />

            {/* 1. AI Agents (Top Priority - Full Width Stack) */}
            <div className="flex flex-col gap-12">
                {/* Exp 04: Prophet */}
                <Prophet history={historyData} onSave={onSavePrediction} isLightMode={isLightMode} activeGameConfig={activeGameConfig} />

                {/* Exp 05: Reactor */}
                <ChainReactor history={historyData} isLightMode={isLightMode} activeGameConfig={activeGameConfig} />
            </div>

            {/* 2. Visual Tools */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">

                {/* Exp 01: Matrix */}
                <MatrixGrid history={historyData} isLightMode={isLightMode} activeGameConfig={activeGameConfig} />

                {/* Exp 03: Chaos Hunter */}
                <ChaosHunter history={historyData} onSave={onSavePrediction} isLightMode={isLightMode} activeGameConfig={activeGameConfig} />
            </div>


            {/* 3. Monte Carlo (Full Width) */}
            <MonteCarlo history={historyData} onSave={onSavePrediction} isLightMode={isLightMode} activeGameConfig={activeGameConfig} />

            {/* 4. Zone 2 Lab (Super Lotto Exclusive) */}
            {activeGameConfig?.id === 'SUPERLOTTO' && (
                <div className="animate-in fade-in slide-in-from-bottom-8 duration-700">
                    <ZoneTwoLab history={historyData} onSave={onSavePrediction} isLightMode={isLightMode} activeGameConfig={activeGameConfig} />
                </div>
            )}

        </div>
    );
};

export default TestArea;
