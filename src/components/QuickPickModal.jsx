import React, { useState, useEffect } from 'react';
import { getSecureRandomSet } from '../utils/secureRandom';
import { useLanguage } from '../i18n/LanguageContext';

const QuickPickModal = ({ onClose, activeGameConfig }) => {
    const { t } = useLanguage();
    const [numbers, setNumbers] = useState([]);

    useEffect(() => {
        // Generate on mount
        const MAX = activeGameConfig?.settings?.maxNumber || 49;
        const PICK = activeGameConfig?.settings?.pickCount || 6;

        const nums = getSecureRandomSet(PICK, 1, MAX);
        setNumbers(nums);
    }, [activeGameConfig]);

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-300" onClick={onClose}>
            <div className="bg-slate-900 border border-slate-700 p-8 rounded-3xl shadow-2xl transform scale-100 flex flex-col items-center gap-6" onClick={e => e.stopPropagation()}>
                <h2 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-300 to-orange-500 uppercase tracking-widest">
                    ⚡ {activeGameConfig?.name || t('quickPickModal.flashPick')}
                </h2>

                <div className="flex gap-3">
                    {numbers.map((n, i) => (
                        <div key={i} className="w-12 h-12 md:w-16 md:h-16 rounded-full bg-gradient-to-br from-slate-800 to-slate-900 border border-amber-500/30 flex items-center justify-center text-xl md:text-2xl font-bold text-white shadow-[0_0_15px_rgba(245,158,11,0.3)] animate-bounce" style={{ animationDelay: `${i * 100}ms` }}>
                            {n}
                        </div>
                    ))}
                </div>

                <p className="text-slate-500 text-xs uppercase tracking-widest mt-2">{t('quickPickModal.goodLuck')}</p>
            </div>
        </div>
    );
};

export default QuickPickModal;
