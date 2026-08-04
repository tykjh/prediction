import React, { useState, useRef, useEffect } from 'react';
import { useLanguage } from '../i18n/LanguageContext';

const InputSection = ({ onAddEntry, existingPeriods, nextPeriod, activeGameConfig }) => {
    const { t } = useLanguage();
    const MAX = activeGameConfig?.settings?.maxNumber || 49;
    const PICK = activeGameConfig?.settings?.pickCount || 6;
    const HAS_SPECIAL = activeGameConfig?.settings?.specialNumber?.enabled || false;
    const IS_SEPARATE = activeGameConfig?.settings?.specialNumber?.isSeparate || false;
    const TOTAL_INPUTS = PICK + (HAS_SPECIAL ? 1 : 0);

    const [period, setPeriod] = useState('');
    const [date, setDate] = useState('');
    const [numbers, setNumbers] = useState(Array(TOTAL_INPUTS).fill(''));
    const [error, setError] = useState('');

    const inputRefs = useRef([]);

    // Reset fields when game config changes
    useEffect(() => {
        setNumbers(Array(TOTAL_INPUTS).fill(''));
        setPeriod('');
        setDate('');
        setError('');
    }, [activeGameConfig, TOTAL_INPUTS]);

    // Auto-fill Period
    useEffect(() => {
        if (nextPeriod && !period) {
            setPeriod(nextPeriod);
        }
    }, [nextPeriod]);

    const handleNumberChange = (index, value) => {
        if (!/^\d*$/.test(value)) return;
        if (value.length > 2) return;

        const newNumbers = [...numbers];
        newNumbers[index] = value;
        setNumbers(newNumbers);

        if (value.length === 2 && index < TOTAL_INPUTS - 1) {
            inputRefs.current[index + 1]?.focus();
        }
        // Remove error if user modifies valid input
        if (error && error.includes('Duplicate')) setError('');
    };

    const handleKeyDown = (index, e) => {
        if (e.key === 'Backspace' && !numbers[index] && index > 0) {
            inputRefs.current[index - 1]?.focus();
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        setError('');

        // --- Validation ---

        // 1. Period (9 digits)
        const cleanPeriod = period.trim();
        if (!/^\d{9}$/.test(cleanPeriod)) {
            setError(t('inputSection.errorPeriodDigits'));
            return;
        }
        if (existingPeriods.includes(cleanPeriod)) {
            setError(t('inputSection.errorPeriodExists', { period: cleanPeriod }));
            return;
        }

        // 2. Date
        let cleanDate = date.trim();
        if (cleanDate && !/^\d{7}$/.test(cleanDate)) {
            setError(t('inputSection.errorDateDigits'));
            return;
        }

        // 3. Numbers Validation
        if (numbers.some(n => n === '')) {
            setError(t('inputSection.errorFillAllNumbers', { n: numbers.length }));
            return;
        }
        const parsedAll = numbers.map(Number);

        // Split into Main and Special
        const mainNums = parsedAll.slice(0, PICK);
        const specialNum = HAS_SPECIAL ? parsedAll[PICK] : null;

        // A. Validate Main Numbers (1-MAX)
        const invalidMain = mainNums.find(n => n < 1 || n > MAX);
        if (invalidMain !== undefined) {
            setError(t('inputSection.errorMainOutOfRange', { num: invalidMain, max: MAX }));
            return;
        }

        // B. Validate Main Duplicates
        const uniqueMain = new Set(mainNums);
        if (uniqueMain.size !== mainNums.length) {
            setError(t('inputSection.errorDuplicateMain'));
            return;
        }

        // C. Validate Special Number
        if (HAS_SPECIAL && specialNum !== null) {
            const IS_SEPARATE = activeGameConfig?.settings?.specialNumber?.isSeparate || false;
            const SPECIAL_MAX = activeGameConfig?.settings?.specialNumber?.max || MAX;

            // Range Check
            if (specialNum < 1 || specialNum > SPECIAL_MAX) {
                setError(t('inputSection.errorSpecialOutOfRange', { num: specialNum, max: SPECIAL_MAX }));
                return;
            }

            // Uniqueness Check (Only if NOT separate pool)
            if (!IS_SEPARATE) {
                if (mainNums.includes(specialNum)) {
                    setError(t('inputSection.errorSpecialDuplicate', { num: specialNum }));
                    return;
                }
            }
        }

        // Submit
        // Submit
        let finalDate = cleanDate || '-';
        // Auto-format Date: YYYMMDD -> YYY/MM/DD
        if (/^\d{7}$/.test(finalDate)) {
            finalDate = finalDate.replace(/^(\d{3})(\d{2})(\d{2})$/, '$1/$2/$3');
        }

        onAddEntry({
            period: cleanPeriod,
            date: finalDate,
            numbers: parsedNumbers
        });

        // Reset
        setPeriod('');
        setDate('');
        setPeriod('');
        setDate('');
        setNumbers(Array(TOTAL_INPUTS).fill(''));
        // Do not focus, stay on form
    };

    return (
        <div className="bg-slate-900/40 light:bg-gradient-to-br light:from-white light:to-slate-100/90 backdrop-blur-md rounded-2xl p-8 border border-white/5 light:border-slate-200/60 shadow-inner light:shadow-lg h-full flex flex-col justify-center relative overflow-hidden group">
            {/* Subtle glow effect */}
            <div className="absolute -top-20 -right-20 w-40 h-40 bg-blue-500/10 rounded-full blur-3xl pointer-events-none group-hover:bg-blue-500/20 transition-colors duration-700"></div>

            <h2 className="text-xl font-bold mb-6 text-white flex items-center gap-3 relative z-10">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20 text-white border border-white/10">
                    ➕
                </div>
                <span className="bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400 light:from-slate-700 light:to-slate-500">{t('inputSection.heading')}</span>
            </h2>

            {error && (
                <div className="bg-red-500/10 border border-red-500/30 text-red-200 px-4 py-3 rounded-xl mb-6 text-sm font-medium flex items-center gap-2 animate-in slide-in-from-top-2">
                    <span className="text-lg">⚠️</span> {error}
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-slate-400 light:text-slate-600 text-xs uppercase font-bold mb-1 ml-1">{t('inputSection.periodLabel')}</label>
                        <input
                            type="text"
                            value={period}
                            onChange={(e) => setPeriod(e.target.value)}
                            placeholder={nextPeriod || "115000001"}
                            maxLength={9}
                            className="w-full bg-slate-900 light:bg-slate-50 border border-slate-600 light:border-slate-300 rounded-xl px-4 py-3 text-white light:text-slate-900 font-bold tracking-wide focus:border-blue-500 light:focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 font-mono transition-all"
                        />
                    </div>
                    <div>
                        <label className="block text-slate-400 light:text-slate-600 text-xs uppercase font-bold mb-1 ml-1">{t('inputSection.dateLabel')}</label>
                        <input
                            type="text"
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                            placeholder="1150110"
                            maxLength={7}
                            className="w-full bg-slate-900 light:bg-slate-50 border border-slate-600 light:border-slate-300 rounded-xl px-4 py-3 text-white light:text-slate-900 font-bold tracking-wide focus:border-blue-500 light:focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 font-mono transition-all"
                        />
                    </div>
                </div>

                <div>
                    <div className="flex justify-between items-center mb-1">
                        <label className="block text-slate-400 text-xs uppercase font-bold">{t('inputSection.winningNumbersLabel')}</label>
                        <span className="text-[10px] text-slate-500">
                            {(() => {
                                const SPECIAL_MAX = activeGameConfig?.settings?.specialNumber?.max || MAX;
                                if (IS_SEPARATE) return t('inputSection.rangeHintSeparate', { max: MAX, specialMax: SPECIAL_MAX });
                                return t('inputSection.rangeHintCombined', { max: MAX });
                            })()}
                        </span>
                    </div>

                    <div className="flex gap-2 justify-between">
                        {/* Regular Numbers */}
                        {numbers.slice(0, PICK).map((num, idx) => (
                            <input
                                key={idx}
                                ref={el => inputRefs.current[idx] = el}
                                type="text"
                                value={num}
                                onChange={(e) => handleNumberChange(idx, e.target.value)}
                                onKeyDown={(e) => handleKeyDown(idx, e)}
                                className="w-full aspect-square text-center bg-slate-950/50 light:bg-slate-50 border border-slate-700/50 light:border-slate-300 rounded-xl text-white light:text-slate-900 font-black text-2xl focus:border-blue-500 light:focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-all placeholder:text-slate-700 light:placeholder:text-slate-300 hover:border-slate-600 light:hover:border-slate-400"
                                placeholder="#"
                            />
                        ))}

                        {/* Special Number (Conditional) */}
                        {HAS_SPECIAL && (
                            <>
                                <div className="w-px bg-slate-700 mx-1"></div>
                                <div className="relative">
                                    <input
                                        ref={el => inputRefs.current[PICK] = el}
                                        type="text"
                                        value={numbers[PICK]}
                                        onChange={(e) => handleNumberChange(PICK, e.target.value)}
                                        onKeyDown={(e) => handleKeyDown(PICK, e)}
                                        className="w-full aspect-square text-center bg-slate-950/50 light:bg-slate-50 border-2 border-orange-500/30 light:border-orange-400/30 rounded-xl text-orange-400 light:text-orange-500 font-bold text-xl focus:border-orange-500 focus:outline-none focus:ring-4 focus:ring-orange-500/20 transition-all placeholder:text-orange-900/50 light:placeholder:text-orange-200"
                                        placeholder="S"
                                    />
                                    <div className="absolute -top-2 left-1/2 -translate-x-1/2 text-[9px] text-orange-500 font-bold bg-slate-800 px-1">
                                        SP
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                </div>

                <button
                    type="submit"
                    className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-black uppercase tracking-widest py-4 rounded-xl shadow-xl shadow-blue-900/20 hover:shadow-blue-500/40 transition-all duration-300 transform hover:-translate-y-1 active:translate-y-0 active:scale-95 border border-white/10 group-hover:from-blue-500 group-hover:to-indigo-500"
                >
                    {t('inputSection.submitButton')}
                </button>
            </form>
        </div>
    );
};

export default InputSection;
