// Period numbers and draw dates.
//
// A period looks like "115000105": the first three digits are the ROC year
// (2026 -> 115), the rest is a running number that restarts every January.

const TAIPEI_OFFSET_MS = 8 * 60 * 60 * 1000;
const DRAW_HOUR = 20;
const DRAW_MINUTE = 30;

// Shift a Date so its UTC fields read as Taipei wall-clock time.
const toTaipei = (date) => new Date(date.getTime() + TAIPEI_OFFSET_MS);

export const rocYearOf = (date = new Date()) => toTaipei(date).getUTCFullYear() - 1911;

/**
 * The period the next draw will carry.
 * @param latestPeriod period string of the most recent known draw
 * @param now          current time (injectable for tests)
 */
export const nextPeriodOf = (latestPeriod, now = new Date()) => {
    const text = String(latestPeriod ?? '');
    if (!/^\d{9}$/.test(text)) return '';

    const year = Number(text.slice(0, 3));
    const sequence = Number(text.slice(3));
    const currentYear = rocYearOf(now);

    // A new year restarts the running number.
    if (currentYear > year) return `${currentYear}000001`;
    return `${year}${String(sequence + 1).padStart(6, '0')}`;
};

/**
 * Next scheduled draw as a Date (20:30 Taipei time on the next draw day).
 * Extra holiday draws are not modelled, so treat this as "expected".
 * @param drawDays weekdays with a draw, 0 = Sunday ... 6 = Saturday
 */
export const nextDrawDate = (drawDays, now = new Date()) => {
    if (!Array.isArray(drawDays) || drawDays.length === 0) return null;

    const taipeiNow = toTaipei(now);
    for (let offset = 0; offset < 8; offset += 1) {
        const candidate = new Date(Date.UTC(
            taipeiNow.getUTCFullYear(),
            taipeiNow.getUTCMonth(),
            taipeiNow.getUTCDate() + offset,
            DRAW_HOUR,
            DRAW_MINUTE,
        ));
        if (!drawDays.includes(candidate.getUTCDay())) continue;
        if (candidate.getTime() <= taipeiNow.getTime()) continue;
        // Convert the Taipei wall-clock value back to a real instant.
        return new Date(candidate.getTime() - TAIPEI_OFFSET_MS);
    }
    return null;
};

// Whole days from today to the given instant, both in Taipei time.
export const daysUntil = (target, now = new Date()) => {
    if (!target) return null;
    const a = toTaipei(now);
    const b = toTaipei(target);
    const startA = Date.UTC(a.getUTCFullYear(), a.getUTCMonth(), a.getUTCDate());
    const startB = Date.UTC(b.getUTCFullYear(), b.getUTCMonth(), b.getUTCDate());
    return Math.round((startB - startA) / 86400000);
};

// Weekday (0-6) and "MM/DD" of an instant in Taipei time.
export const taipeiDateParts = (date) => {
    const t = toTaipei(date);
    return {
        weekday: t.getUTCDay(),
        month: t.getUTCMonth() + 1,
        day: t.getUTCDate(),
    };
};

export const formatNumber = (n) => String(n).padStart(2, '0');
