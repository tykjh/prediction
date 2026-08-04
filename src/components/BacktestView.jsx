import React from 'react';
import MagicHeader from './MagicHeader';
import BacktestLab from './BacktestLab';
import BacktestLabProphet from './BacktestLabProphet';
import BacktestLabHybrid from './BacktestLabHybrid';
import { useLanguage } from '../i18n/LanguageContext';

const BacktestView = ({ historyData, bgTheme, isLightMode, reducedMotion, activeGameConfig }) => {
    const { t } = useLanguage();
    return (
        <div className="mx-auto space-y-6">

            {/* Header */}
            <MagicHeader
                title={t('backtestView.title')}
                subtitle={t('backtestView.subtitle')}
                icon="🎯"
                themeIndex={bgTheme}
                isLightMode={isLightMode}
                reducedMotion={reducedMotion}
            />

            {/* Content */}
            <div className="space-y-12">
                {/* 1. Main General Backtest */}
                <BacktestLab historyData={historyData} isLightMode={isLightMode} activeGameConfig={activeGameConfig} />

                {/* 2. Prophet Deep Dive */}
                <BacktestLabProphet historyData={historyData} isLightMode={isLightMode} activeGameConfig={activeGameConfig} />

                {/* 3. Hybrid Evolution Lab */}
                <BacktestLabHybrid historyData={historyData} isLightMode={isLightMode} activeGameConfig={activeGameConfig} />
            </div>

        </div>
    );
};

export default BacktestView;
