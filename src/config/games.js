export const GAME_TYPES = {
    'LOTTO649': {
        id: 'LOTTO649',
        name: 'Lotto 6/49 (大樂透)',
        drawDays: [2, 5], // Tue, Fri
        logo: '🎱', // Default Ball
        settings: {
            maxNumber: 49,
            pickCount: 6,
            specialNumber: {
                enabled: true,
                isSeparate: false, // Integrated pool (1-49)
                max: 49,
                label: 'Special'
            },
            prizeRules: {
                // Simplified rules for display logic
                jackpotHits: 6,
                hasSpecialPrize: true
            }
        },
        theme: {
            primary: 'indigo',
            accent: 'amber'
        }
    },
    'SUPERLOTTO': {
        id: 'SUPERLOTTO',
        name: 'Super Lotto (威力彩)',
        drawDays: [1, 4], // Mon, Thu
        logo: '🪙', // Coin / Wealth
        settings: {
            maxNumber: 38,
            pickCount: 6,
            specialNumber: {
                enabled: true,
                isSeparate: true, // Second Zone (1-8)
                max: 8,
                label: '2nd Zone'
            },
            prizeRules: {
                jackpotHits: 6, // Plus special match
                hasSpecialPrize: true
            }
        },
        theme: {
            primary: 'rose',
            accent: 'emerald'
        }
    },
    '539': {
        id: '539',
        name: 'Jin Cai 539 (今彩539)',
        drawDays: [1, 2, 3, 4, 5, 6], // Mon - Sat
        logo: '💵', // Banknote
        settings: {
            maxNumber: 39,
            pickCount: 5,
            specialNumber: {
                enabled: false,
                isSeparate: false,
                max: 0,
                label: 'None'
            },
            prizeRules: {
                jackpotHits: 5,
                hasSpecialPrize: false
            }
        },
        theme: {
            primary: 'emerald',
            accent: 'cyan'
        }
    }
};

export const DEFAULT_GAME = 'LOTTO649';

// Display order. Object.keys() would put '539' first because it looks like a number.
export const GAME_ORDER = ['LOTTO649', 'SUPERLOTTO', '539'];
