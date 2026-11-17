import React from 'react';
import NumberBall from './NumberBall';
import { useLanguage } from '../i18n/LanguageContext';
import { nextDrawDate, daysUntil, taipeiDateParts } from '../utils/drawSchedule';

// Shows the most recent draw and when the next one is expected, so the first
// thing on the page answers "what came out, and when is the next one?".
const LatestDrawCard = ({ historyData = [], activeGameConfig }) => {
    const { t, lang } = useLanguage();
    const colon = lang === 'zh' ? '：' : ': ';
    const latest = historyData[0];
    const { pickCount, specialNumber } = activeGameConfig.settings;

    const next = nextDrawDate(activeGameConfig.drawDays);
    let nextText = '';
    if (next) {
        const parts = taipeiDateParts(next);
        const weekdays = t('shell.weekday');
        const when = t('shell.latest.nextOn', {
            weekday: Array.isArray(weekdays) ? weekdays[parts.weekday] : '',
            month: parts.month,
            day: parts.day,
        });
        const days = daysUntil(next);
        const relative = days === 0
            ? t('shell.latest.tonight')
            : days === 1
                ? t('shell.latest.tomorrow')
                : t('shell.latest.inDays', { n: days });
        nextText = `${when} · ${relative}`;
    }

    return (
        <section className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 sm:p-6 light:border-stone-200 light:bg-white">
            <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                <h2 className="text-base font-semibold text-stone-100 light:text-stone-900">
                    {t('shell.latest.title')}
                </h2>
                {latest && (
                    <p className="text-xs text-stone-400 light:text-stone-500">
                        {t('shell.latest.period', { period: latest.period })} · {latest.date}
                    </p>
                )}
            </div>

            {latest ? (
                <div className="mt-4 flex flex-wrap items-center gap-2">
                    {latest.numbers.slice(0, pickCount).map((n, i) => (
                        <NumberBall key={`${i}-${n}`} value={n} size="lg" />
                    ))}
                    {specialNumber.enabled && latest.numbers[pickCount] !== undefined && (
                        <span className="ml-1 flex items-center gap-2 border-l border-white/10 pl-3 light:border-stone-200">
                            <NumberBall value={latest.numbers[pickCount]} size="lg" tone="special" />
                            <span className="text-xs text-stone-400 light:text-stone-500">
                                {specialNumber.isSeparate ? t('shell.latest.zoneTwo') : t('shell.latest.special')}
                            </span>
                        </span>
                    )}
                </div>
            ) : (
                <p className="mt-4 text-sm text-stone-400">{t('shell.latest.noData')}</p>
            )}

            {nextText && (
                <p className="mt-4 text-sm text-stone-300 light:text-stone-700" title={t('shell.latest.expected')}>
                    <span className="text-stone-400 light:text-stone-500">{t('shell.latest.next')}{colon}</span>
                    {nextText}
                </p>
            )}
        </section>
    );
};

export default LatestDrawCard;
