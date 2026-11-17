import React from 'react';
import { formatNumber } from '../utils/drawSchedule';

const SIZES = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-11 h-11 sm:w-12 sm:h-12 text-base',
};

const TONES = {
    plain: 'bg-stone-100 text-stone-900 light:bg-stone-800 light:text-stone-50',
    muted: 'bg-white/5 text-stone-300 border border-white/10 light:bg-stone-100 light:text-stone-600 light:border-stone-200',
    special: 'bg-amber-400 text-stone-900',
    hit: 'bg-emerald-500 text-white',
    hot: 'bg-rose-500/90 text-white',
    cold: 'bg-sky-500/90 text-white',
    empty: 'border border-dashed border-white/15 light:border-stone-300',
};

// One lottery number. Kept deliberately plain: a filled circle, no glow.
const NumberBall = ({ value, tone = 'plain', size = 'md', title }) => (
    <span
        title={title}
        className={`inline-flex shrink-0 items-center justify-center rounded-full font-semibold tabular-nums ${SIZES[size] || SIZES.md} ${TONES[tone] || TONES.plain}`}
    >
        {value === undefined || value === null ? '' : formatNumber(value)}
    </span>
);

export default NumberBall;
