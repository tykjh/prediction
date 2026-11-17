// Background themes. Index 0 is the calm default: a flat, warm tone with no
// animated glow. The others keep the original coloured looks.

export const THEMES = [
    { id: 'plain', base: '#1d1c1a', blobs: null, swatch: '#8a8378' },
    { id: 'sunset', base: '#2B140B', blobs: ['bg-orange-600/20', 'bg-red-500/20', 'bg-amber-500/15'], swatch: '#ea580c' },
    { id: 'neon', base: '#2B0921', blobs: ['bg-pink-600/20', 'bg-yellow-500/15', 'bg-fuchsia-600/20'], swatch: '#db2777' },
    { id: 'forest', base: '#082918', blobs: ['bg-emerald-600/20', 'bg-lime-500/15', 'bg-teal-500/15'], swatch: '#059669' },
    { id: 'ocean', base: '#0C2438', blobs: ['bg-blue-600/20', 'bg-cyan-500/15', 'bg-sky-500/15'], swatch: '#2563eb' },
    { id: 'space', base: '#1E2038', blobs: ['bg-indigo-600/20', 'bg-violet-600/20', 'bg-blue-500/15'], swatch: '#4f46e5' },
    { id: 'mint', base: '#0A2E25', blobs: ['bg-teal-400/20', 'bg-emerald-300/15', 'bg-cyan-300/15'], swatch: '#0d9488' },
    {
        id: 'rainbow',
        base: '#111111',
        blobs: [
            'bg-[conic-gradient(at_center,_var(--tw-gradient-stops))] from-red-500 via-yellow-500 via-green-500 via-blue-500 to-purple-500 opacity-60 blur-[80px] animate-spin-slow mix-blend-screen',
            'bg-[conic-gradient(at_center,_var(--tw-gradient-stops))] from-cyan-400 via-fuchsia-500 via-orange-500 to-lime-500 opacity-50 blur-[90px] animate-spin-reverse-slow mix-blend-screen',
            'bg-white/10 opacity-20 mix-blend-overlay',
        ],
        swatch: '#a855f7',
    },
];

export const DEFAULT_THEME = 0;

export const LIGHT_BASE = '#f4f1ea';
export const LIGHT_BLOBS = ['bg-amber-200/30', 'bg-sky-200/30', 'bg-rose-200/20'];

export const themeAt = (index) => THEMES[index] || THEMES[DEFAULT_THEME];
