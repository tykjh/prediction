import React, { useEffect, useState } from 'react';
import NumberBall from './NumberBall';
import { useLanguage } from '../i18n/LanguageContext';
import { formatNumber } from '../utils/drawSchedule';

const smallButton = 'rounded-lg border border-white/10 px-3 py-1.5 text-xs font-medium text-stone-300 transition-colors hover:bg-white/10 light:border-stone-200 light:text-stone-600 light:hover:bg-stone-100';

// One way of picking numbers: a name, a one-line explanation, a button and
// the result. The colour props from the old design are accepted but unused.
const PredictionRow = ({
    title,
    subtitle,
    onGenerate,
    isLoading,
    numbers = [],
    stats,
    meta,
    type = 'standard', // standard, hybrid, ai
    progress = 0,
    onSave,
    pickCount = 6,
    disabled = false,
    note,
    copyLabel = '',
}) => {
    const { t } = useLanguage();
    const [justSaved, setJustSaved] = useState(false);
    const [copyState, setCopyState] = useState('idle'); // idle | done | failed
    const hasNumbers = Array.isArray(numbers) && numbers.length > 0;

    // A new result clears the "saved / copied" confirmations.
    useEffect(() => {
        setJustSaved(false);
        setCopyState('idle');
    }, [numbers]);

    const toneFor = (num) => {
        if (type !== 'hybrid' || !meta) return 'plain';
        if (meta.hot?.includes(num)) return 'hot';
        if (meta.cold?.includes(num)) return 'cold';
        return 'plain';
    };

    const handleSave = () => {
        onSave();
        setJustSaved(true);
    };

    const handleCopy = async () => {
        const text = `${copyLabel ? `${copyLabel} ` : ''}${numbers.map(formatNumber).join(' ')}`;
        try {
            await navigator.clipboard.writeText(text);
            setCopyState('done');
        } catch {
            setCopyState('failed');
        }
    };

    const sortedList = (list) => [...(list || [])].sort((a, b) => a - b).map(formatNumber).join(' ');

    return (
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 light:border-stone-200 light:bg-white">
            <div className="flex flex-col gap-4 md:flex-row md:items-center">
                <div className="md:w-56 md:shrink-0">
                    <h3 className="text-sm font-semibold text-stone-100 light:text-stone-900">{title}</h3>
                    <p className="mt-0.5 text-xs leading-relaxed text-stone-400 light:text-stone-500">{subtitle}</p>
                </div>

                <div className="flex grow flex-wrap items-center gap-2">
                    {hasNumbers
                        ? numbers.map((num, idx) => (
                            <NumberBall key={`${idx}-${num}`} value={num} size="lg" tone={toneFor(num)} />
                        ))
                        : Array.from({ length: pickCount }).map((_, idx) => (
                            <NumberBall key={`empty-${idx}`} size="lg" tone="empty" />
                        ))}
                </div>

                <div className="flex shrink-0 items-center gap-2">
                    {hasNumbers && (
                        <>
                            <button onClick={handleCopy} className={smallButton}>
                                {copyState === 'done' ? t('shell.pick.copied') : t('shell.pick.copy')}
                            </button>
                            {onSave && (
                                <button onClick={handleSave} disabled={justSaved} className={`${smallButton} disabled:opacity-60`}>
                                    {justSaved ? t('shell.pick.saved') : t('shell.pick.save')}
                                </button>
                            )}
                        </>
                    )}
                    <button
                        onClick={onGenerate}
                        disabled={isLoading || disabled}
                        className="min-w-[5.5rem] rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-stone-900 transition-colors hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {isLoading ? t('shell.pick.generating') : hasNumbers ? t('shell.pick.again') : t('shell.pick.generate')}
                    </button>
                </div>
            </div>

            {type === 'ai' && isLoading && (
                <div className="mt-3">
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10 light:bg-stone-200">
                        <div className="h-full bg-amber-500 transition-all duration-300" style={{ width: `${progress}%` }} />
                    </div>
                    <p className="mt-1.5 text-xs text-stone-500">{t('shell.pick.aiNote')}</p>
                </div>
            )}

            {copyState === 'failed' && (
                <p className="mt-3 text-xs text-rose-400">{t('shell.pick.copyFailed')}</p>
            )}

            {note && !isLoading && (
                <p className="mt-3 text-xs text-stone-500">{note}</p>
            )}

            {type === 'hybrid' && meta && hasNumbers && (
                <div className="mt-3 space-y-1 border-t border-white/10 pt-3 text-xs text-stone-400 light:border-stone-200 light:text-stone-500">
                    <p>
                        <span className="font-medium text-rose-400 light:text-rose-600">{t('predictionRow.hotLabel')}</span>{' '}
                        <span className="tabular-nums">{sortedList(meta.hot)}</span>
                        {stats && <span className="ml-2 opacity-70">({stats.avgHot})</span>}
                    </p>
                    <p>
                        <span className="font-medium text-sky-400 light:text-sky-600">{t('predictionRow.coldLabel')}</span>{' '}
                        <span className="tabular-nums">{sortedList(meta.cold)}</span>
                        {stats && <span className="ml-2 opacity-70">({stats.avgCold})</span>}
                    </p>
                </div>
            )}
        </div>
    );
};

export default PredictionRow;
