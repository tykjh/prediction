import React, { useState, useEffect, useRef } from 'react';
import MoneyRain from '../MoneyRain';
import { useLanguage } from '../../i18n/LanguageContext';

/*
 * 5-REEL VIDEO SLOT MACHINE
 * Left-to-Right Logic, 5 Reels, Wilds, Hold, Gamble
 */

const SYMBOLS = [
    { id: 'wild', char: '🃏', value: 100n, type: 'wild' }, // Base value (multiplier applied by count)
    { id: '7', char: '7️⃣', value: 20n, type: 'standard' },
    { id: 'diamond', char: '💎', value: 15n, type: 'standard' },
    { id: 'bar', char: '🎰', value: 10n, type: 'standard' },
    { id: 'bell', char: '🔔', value: 8n, type: 'standard' },
    { id: 'lemon', char: '🍋', value: 5n, type: 'standard' },
    { id: 'cherry', char: '🍒', value: 2n, type: 'standard' },
];

const PAYOUT_MULTIPLIERS = {
    3: 1n,    // Base Value * 1 * Bet
    4: 5n,    // Base Value * 5 * Bet
    5: 20n    // Base Value * 20 * Bet
};
// Example: 5 Wilds = 100 * 20 * Bet = 2000x Bet (Jackpot)
// Example: 5 Cherries = 2 * 20 * Bet = 40x Bet

const REEL_STRIP = [
    'wild', 'lemon', 'bell', 'cherry', 'diamond', 'lemon', 'bar', 'cherry', 'bell', '7', 'lemon', 'diamond', 'cherry', 'bar', 'bell', 'lemon', 'cherry', '7', 'diamond', 'wild'
];

// Coin Component for Gamble
const Coin = ({ result, flipping }) => {
    return (
        <div className="w-32 h-32 relative perspective-1000 mx-auto my-8">
            <div
                className={`w-full h-full relative preserve-3d transition-transform duration-[3000ms] ease-out-cubic`}
                style={{
                    transformStyle: 'preserve-3d',
                    transform: flipping
                        ? 'rotateY(1800deg) rotateX(720deg)' // Spin wildly
                        : result === 'tails' ? 'rotateY(180deg)' : 'rotateY(0deg)' // Settle
                }}
            >
                {/* Heads Side */}
                <div className="absolute inset-0 w-full h-full rounded-full bg-gradient-to-tr from-yellow-300 via-yellow-500 to-yellow-600 border-4 border-yellow-700 shadow-xl flex items-center justify-center backface-hidden">
                    <span className="text-4xl font-bold text-yellow-900 drop-shadow-md">👑</span>
                </div>
                {/* Tails Side */}
                <div
                    className="absolute inset-0 w-full h-full rounded-full bg-gradient-to-tr from-slate-300 via-slate-400 to-slate-500 border-4 border-slate-600 shadow-xl flex items-center justify-center backface-hidden"
                    style={{ transform: 'rotateY(180deg)' }}
                >
                    <span className="text-4xl font-bold text-slate-800 drop-shadow-md">1</span>
                </div>
            </div>
            {/* Shadow underneath */}
            <div className={`absolute -bottom-10 left-1/2 -translate-x-1/2 w-20 h-4 bg-black/40 blur-md rounded-[100%] transition-all duration-300 ${flipping ? 'scale-50 opacity-20' : 'scale-100 opacity-100'}`}></div>
        </div>
    );
};

// Confetti Component
const Confetti = () => {
    const particles = Array.from({ length: 50 }).map((_, i) => ({
        id: i,
        left: Math.random() * 100 + '%',
        delay: Math.random() * 0.5 + 's',
        color: ['#ff0', '#f00', '#0f0', '#00f', '#f0f'][Math.floor(Math.random() * 5)]
    }));

    return (
        <div className="absolute inset-0 pointer-events-none overflow-hidden z-50">
            {particles.map(p => (
                <div
                    key={p.id}
                    className="absolute top-0 w-2 h-2 rounded-full animate-fall"
                    style={{ left: p.left, animationDelay: p.delay, backgroundColor: p.color }}
                />
            ))}
        </div>
    );
};

const SlotMachine = () => {
    const { t } = useLanguage();
    // Economy (BigInt Support)
    const [credits, setCredits] = useState(100n);
    const [bet, setBet] = useState(5n);

    // Game State
    // 5 Reels now
    const [spinning, setSpinning] = useState(false);
    const [results, setResults] = useState([0, 1, 2, 3, 4]);
    const [reelSpinning, setReelSpinning] = useState([false, false, false, false, false]);

    // Hold Feature (5 slots)
    const [heldReels, setHeldReels] = useState([false, false, false, false, false]);
    const [canHold, setCanHold] = useState(false);

    // Win / Gamble State
    const [winAmount, setWinAmount] = useState(0n);
    const [message, setMessage] = useState({ key: 'goodLuck' });
    const [gambleOpen, setGambleOpen] = useState(false);

    // Win Effects
    const [effectTier, setEffectTier] = useState('none'); // none, medium, high, jackpot
    const [lastNetWin, setLastNetWin] = useState(null); // Track settled profit/loss

    // Input States
    const [showRecharge, setShowRecharge] = useState(false);
    const [rechargeAmount, setRechargeAmount] = useState('100');

    // Coin Flip State (Restored)
    const [coinFlipping, setCoinFlipping] = useState(false);
    const [coinResult, setCoinResult] = useState(null);


    const spin = () => {
        if (credits < bet) {
            setMessage({ key: 'insufficientCredits' });
            return;
        }
        if (spinning) return;
        if (gambleOpen) return;

        // Deduct Bet
        setCredits(c => c - bet);
        setWinAmount(0n);
        setLastNetWin(null); // Clear previous result
        setEffectTier('none'); // Reset effects
        setMessage({ key: 'spinning' });
        setSpinning(true);
        setCanHold(false);

        // Targets
        const newResults = results.map((current, i) => {
            if (heldReels[i]) return current;
            return Math.floor(Math.random() * REEL_STRIP.length);
        });

        // Delays
        // 5 reels standard delays: 600, 1000, 1400, 1800, 2200
        const baseDelays = [600, 1000, 1400, 1800, 2200];
        const activeDelays = baseDelays.map((d, i) => heldReels[i] ? 0 : d);
        const maxDelay = Math.max(...activeDelays, 500);

        // Visuals
        const activeSpinners = heldReels.map(h => !h);
        setReelSpinning(activeSpinners);

        // Sequence
        activeSpinners.forEach((isSpinning, index) => {
            if (!isSpinning) return;

            setTimeout(() => {
                setReelSpinning(prev => {
                    const next = [...prev];
                    next[index] = false;
                    return next;
                });
                setResults(prev => {
                    const next = [...prev];
                    next[index] = newResults[index];
                    return next;
                });
            }, activeDelays[index]);
        });

        // Finalize
        setTimeout(() => {
            checkWin(newResults);
            setSpinning(false);
            setHeldReels([false, false, false, false, false]);
            setCanHold(true); // Always allow Hold (User Request: "Cancel lose cannot held")
        }, maxDelay);
    };

    const checkWin = (indices) => {
        const symbols = indices.map(i => SYMBOLS.find(s => s.id === REEL_STRIP[i]));

        // Left-to-Right Logic (Consecutive)
        // Check for ANY symbol match starting from Reel 1 (Index 0)
        // Wilds substitute for anything.
        // We need to determine the "Match Symbol" by looking at the first non-wild.
        // If first is Wild, we keep looking. If all 5 wild, it's a 5-Wild Jackpot.

        let matchSymbol = null;
        let count = 0;

        // 1. Determine the target symbol (first non-wild)
        for (let s of symbols) {
            if (s.id !== 'wild') {
                matchSymbol = s;
                break;
            }
        }

        if (!matchSymbol) {
            // All Wilds!
            matchSymbol = SYMBOLS.find(s => s.id === 'wild');
        }

        // 2. Count consecutive matches from left
        for (let s of symbols) {
            if (s.id === matchSymbol.id || s.id === 'wild') {
                count++;
            } else {
                break; // Chain broken
            }
        }

        let win = 0n;
        let msgKey = 'tryAgain';

        if (count >= 3) { // Min 3 match
            const multiplier = PAYOUT_MULTIPLIERS[count];
            win = matchSymbol.value * multiplier * bet;

            if (count === 5) msgKey = 'jackpot5';
            else if (count === 4) msgKey = 'bigWin4';
            else msgKey = 'niceWin';
        } else {
            // Check Scatters? (e.g. Cherry anywhere)
            // Let's stick to the Classic "Cherry Logic" if simple line fails?
            // "Any 3 Cherries" anywhere?
            const cherryCount = symbols.filter(s => s.id === 'cherry').length;
            if (win === 0n && cherryCount >= 2) {
                if (cherryCount === 2) win = bet * 2n;
                if (cherryCount === 3) win = bet * 5n;
                if (cherryCount >= 4) win = bet * 10n;
                if (win > 0n) msgKey = 'cherryPicked';
            }
        }

        if (win > 0n) {
            setWinAmount(win);
            setMessage({ key: msgKey });

            // Determine Effect Tier
            // Use simple division for BigInt logic
            const multiplier = win / bet;
            if (multiplier >= 50n) setEffectTier('jackpot');
            else if (multiplier >= 20n) setEffectTier('high');
            // else if (multiplier >= 5n) setEffectTier('medium'); // Removed per user request
            else setEffectTier('low');

            setGambleOpen(true);
            setCoinResult(null);
        } else {
            setMessage({ key: 'tryAgain' });
            setLastNetWin(-bet); // Settled Loss
        }
    };

    const toggleHold = (index) => {
        if (!canHold || spinning || winAmount > 0n) return;
        setHeldReels(prev => {
            const next = [...prev];
            next[index] = !next[index];
            return next;
        });
    };

    const handleGamble = (guessSide) => {
        if (coinFlipping) return;
        setCoinFlipping(true);
        setCoinResult(null);

        setTimeout(() => {
            const array = new Uint32Array(1);
            window.crypto.getRandomValues(array);
            const outcome = array[0] % 2 === 0 ? 'heads' : 'tails';

            setCoinResult(outcome);
            setCoinFlipping(false);

            setTimeout(() => {
                const isWin = guessSide === outcome;
                if (isWin) {
                    const doubled = winAmount * 2n;
                    setWinAmount(doubled);
                    setMessage({ key: 'doubled', vars: { amount: doubled.toString() } });
                } else {
                    setWinAmount(0n);
                    setLastNetWin(-bet); // Gambled and lost everything -> Net Loss = Bet
                    // Credits were never added, so just clearing winAmount is sufficient.
                    setMessage({ key: 'tooBad' });
                    setTimeout(() => setGambleOpen(false), 2000);
                }
            }, 600);
        }, 2000);
    };

    const collectWin = () => {
        setCredits(prev => prev + winAmount);
        setLastNetWin(winAmount - bet); // Settled Win
        setWinAmount(0n);
        setGambleOpen(false);
        setCanHold(true);
        setMessage({ key: 'collected' });
    };

    return (
        <div className={`flex flex-col items-center gap-8 w-full animate-in zoom-in duration-500 relative pb-10 ${effectTier === 'medium' ? 'animate-pulse' : ''}`}>
            {effectTier === 'high' && <Confetti />}
            {effectTier === 'jackpot' && <MoneyRain onComplete={() => setEffectTier('none')} />}

            {/* Gamble Modal */}
            {gambleOpen && (
                <div className="absolute inset-0 z-50 flex items-center justify-center -m-4">
                    <div className="absolute inset-0 bg-black/80 backdrop-blur-sm rounded-none sm:rounded-[3rem]"></div>
                    <div className="relative bg-slate-900 border-2 border-yellow-500 p-8 rounded-2xl text-center space-y-6 shadow-2xl animate-in zoom-in w-full max-w-sm mx-4">
                        <h3 className="text-2xl font-bold text-yellow-400 uppercase tracking-widest">{t('slotMachine.doubleOrNothing')}</h3>
                        <div className="text-4xl font-black text-white">{winAmount.toString()}</div>
                        <div className="h-48 flex items-center justify-center">
                            <Coin result={coinResult} flipping={coinFlipping} />
                        </div>
                        <div className="flex gap-4 justify-center">
                            <button
                                onClick={() => handleGamble('heads')}
                                disabled={coinFlipping || coinResult}
                                className="w-32 py-4 bg-yellow-600 rounded-xl border-4 border-yellow-400/50 shadow-lg flex flex-col items-center justify-center gap-1 hover:scale-105 transition-transform disabled:opacity-50"
                            >
                                <span className="text-2xl">👑</span>
                                <span className="font-bold text-white uppercase text-sm">{t('slotMachine.heads')}</span>
                            </button>
                            <button
                                onClick={() => handleGamble('tails')}
                                disabled={coinFlipping || coinResult}
                                className="w-32 py-4 bg-slate-600 rounded-xl border-4 border-slate-400/50 shadow-lg flex flex-col items-center justify-center gap-1 hover:scale-105 transition-transform disabled:opacity-50"
                            >
                                <span className="text-2xl">1️⃣</span>
                                <span className="font-bold text-white uppercase text-sm">{t('slotMachine.tails')}</span>
                            </button>
                        </div>
                        {!coinFlipping && !coinResult && (
                            <button onClick={collectWin} className="w-full py-3 bg-green-600 rounded-xl font-bold text-white uppercase tracking-wider hover:bg-green-500 shadow-lg">{t('slotMachine.collect')}</button>
                        )}
                        {coinResult && winAmount > 0n && (
                            <button onClick={() => setCoinResult(null)} className="w-full py-3 bg-indigo-600 rounded-xl font-bold text-white uppercase tracking-wider hover:bg-indigo-500 shadow-lg animate-pulse">{t('slotMachine.doubleAgain')}</button>
                        )}
                        {coinResult && winAmount > 0n && (<div className="mt-2"><button onClick={collectWin} className="text-xs text-slate-400 underline hover:text-white">{t('slotMachine.collectAmount', { amount: winAmount.toString() })}</button></div>)}
                    </div>
                </div>
            )}

            {/* Machine Casing */}
            {/* Widen container for 5 reels */}
            <div className="relative z-20 bg-gradient-to-br from-yellow-600 via-yellow-400 to-yellow-700 p-8 rounded-t-[4rem] rounded-b-3xl shadow-[0_20px_60px_rgba(0,0,0,0.6)] border-4 border-yellow-800 w-full max-w-3xl">
                <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-red-800 text-white px-8 py-2 rounded-xl border-2 border-yellow-400 font-bold uppercase tracking-widest shadow-lg text-sm whitespace-nowrap z-30 flex gap-2">
                    <span>👑</span> {t('slotMachine.grandJackpot')} <span>👑</span>
                </div>

                <div className="mb-4 flex justify-between items-center text-yellow-100 font-mono text-xs border border-yellow-600/30 bg-black/40 p-2 rounded-lg">
                    <div className="flex flex-col relative">
                        <span className="text-yellow-500 uppercase text-[10px]">{t('slotMachine.credits')}</span>
                        <div className="flex items-center gap-2">
                            <span className="text-xl font-bold">{credits.toString()}</span>
                            <button
                                onClick={() => setShowRecharge(!showRecharge)}
                                className="w-5 h-5 rounded-full bg-slate-700/50 hover:bg-green-600 text-white flex items-center justify-center text-[10px] transition-colors"
                                title={t('slotMachine.recharge')}
                            >
                                +
                            </button>
                        </div>
                        {/* Recharge Popover */}
                        {showRecharge && (
                            <div className="absolute top-10 left-0 bg-slate-800 border border-slate-600 p-2 rounded shadow-xl z-50 flex gap-1 animate-in slide-in-from-top-2">
                                <input
                                    type="number"
                                    value={rechargeAmount}
                                    onChange={(e) => setRechargeAmount(e.target.value)}
                                    className="w-60 bg-black text-white text-xs p-1 rounded border border-slate-600 focus:border-yellow-500 outline-none"
                                />
                                <button
                                    onClick={() => {
                                        try {
                                            const val = BigInt(rechargeAmount);
                                            if (val > 0n) setCredits(c => c + val);
                                        } catch (e) { }
                                        setShowRecharge(false);
                                    }}
                                    className="bg-green-600 hover:bg-green-500 text-white text-[10px] px-2 rounded font-bold"
                                >
                                    {t('slotMachine.add')}
                                </button>
                            </div>
                        )}
                    </div>
                    <div className="flex flex-col items-end">
                        <span className="text-yellow-500 uppercase text-[10px]">{t('slotMachine.netWin')}</span>
                        <span className={`text-xl font-bold ${winAmount > 0n ? 'text-green-400 animate-pulse' : (lastNetWin !== null && lastNetWin < 0n) ? 'text-red-400' : 'text-slate-300'}`}>
                            {winAmount > 0n ? (winAmount - bet).toString() : (lastNetWin !== null ? lastNetWin.toString() : '0')}
                        </span>
                    </div>
                </div>

                {/* Reels Area */}
                <div className="bg-slate-900 p-4 rounded-xl border-4 border-slate-700 shadow-inner relative overflow-hidden group">
                    <div className="absolute top-1/2 left-0 w-full h-0.5 bg-red-500/50 z-20 pointer-events-none"></div>

                    {/* 5-Column Grid */}
                    <div className="flex justify-center bg-white/10 rounded-lg overflow-hidden border border-white/20">
                        {[0, 1, 2, 3, 4].map(i => (
                            <div key={i} className="flex flex-col border-r border-black/20 last:border-0">
                                <ReelIndex id={REEL_STRIP[results[i]]} spinning={reelSpinning[i]} />
                                <button
                                    onClick={() => toggleHold(i)}
                                    disabled={!canHold || spinning}
                                    className={`h-8 text-[10px] font-bold uppercase tracking-wider transition-colors border-t border-slate-900 w-full
                                    ${heldReels[i] ? 'bg-red-600 text-white animate-pulse' : 'bg-slate-300 text-slate-500'}
                                    ${canHold && !heldReels[i] ? 'hover:bg-red-200' : ''}
                                    disabled:opacity-50`}
                                >
                                    {heldReels[i] ? t('slotMachine.held') : t('slotMachine.hold')}
                                </button>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Control Panel */}
                <div className="mt-6 flex flex-wrap gap-3 items-center justify-between">
                    <div className="flex flex-wrap items-center bg-slate-800 rounded-lg p-1 gap-1">
                        {[1, 5, 10, 25, 50].map(amt => (
                            <button
                                key={amt}
                                onClick={() => !spinning && setBet(BigInt(amt))}
                                disabled={spinning}
                                className={`px-3 py-1 rounded text-[10px] font-bold transition-all ${bet === BigInt(amt) ? 'bg-yellow-500 text-black' : 'text-slate-400 hover:text-white'}`}
                            >
                                {amt}
                            </button>
                        ))}
                        {/* Custom Bet Input */}
                        <div className="flex items-center ml-2 border-l border-slate-600 pl-2">
                            <span className="text-[10px] text-slate-500 mr-1">{t('slotMachine.bet')}</span>
                            <input
                                type="number"
                                value={bet.toString()}
                                onChange={(e) => {
                                    try {
                                        const val = BigInt(e.target.value);
                                        if (val > 0n && !spinning) setBet(val);
                                    } catch (e) { }
                                }}
                                disabled={spinning}
                                className="w-48 bg-black/50 text-white text-xs py-1 px-2 rounded border border-slate-600 focus:border-yellow-500 outline-none text-center font-bold"
                            />
                        </div>
                    </div>
                    <button
                        onClick={spin}
                        disabled={spinning || gambleOpen}
                        className="bg-red-600 px-8 h-10 rounded-lg text-sm font-bold shadow-lg active:scale-95 disabled:grayscale border-b-4 border-red-800"
                    >
                        {t('slotMachine.spin')}
                    </button>
                </div>

                {/* Lever (Repositioned for wider case) */}
                <div className="absolute top-1/2 -right-12 w-8 h-48 bg-transparent -z-10 flex flex-col items-center justify-center transform -translate-y-1/2">
                    <div className="absolute left-0 w-6 h-12 bg-slate-600 rounded-r-lg border-l border-slate-800 shadow-xl"></div>
                    <div className={`w-2 h-32 bg-gradient-to-r from-slate-300 to-slate-500 rounded-full origin-bottom transition-transform duration-500 ${spinning ? 'rotate-[180deg]' : 'rotate-0'}`}></div>
                    <button onClick={spin} disabled={spinning} className={`absolute top-0 w-12 h-12 rounded-full border-b-4 border-red-900 shadow-[0_10px_20px_rgba(0,0,0,0.5)] z-10 ${spinning ? 'bg-red-800 top-[140px]' : 'bg-red-600'}`}></button>
                </div>
            </div>

            <div className={`text-2xl font-bold font-mono tracking-tight h-8 ${winAmount > 0 ? 'text-yellow-400 animate-bounce' : 'text-slate-500'}`}>{t(`slotMachine.messages.${message.key}`, message.vars)}</div>

            {/* Paytable (Enhanced) */}
            <div className="bg-slate-900/80 p-4 rounded-xl border border-white/10 text-xs w-full max-w-3xl">
                <div className="flex justify-between items-center mb-4">
                    <h4 className="text-slate-500 uppercase font-bold">{t('slotMachine.paytableTitle')}</h4>
                    <span className="text-[10px] text-indigo-400">{t('slotMachine.paytableHint')}</span>
                </div>
                <div className="grid grid-cols-3 sm:grid-cols-7 gap-2 text-center text-slate-300 font-mono text-[10px]">
                    <div className="text-left font-sans text-slate-500 font-bold col-span-1">{t('slotMachine.symbol')}</div>
                    <div className="text-indigo-400">{t('slotMachine.value')}</div>
                    <div className="text-slate-500">{t('slotMachine.match3')}</div>
                    <div className="text-slate-400">{t('slotMachine.match4')}</div>
                    <div className="text-yellow-400 font-bold col-span-3">{t('slotMachine.jackpotCol')}</div>

                    {SYMBOLS.map(s => (
                        <React.Fragment key={s.id}>
                            <div className="col-span-1 text-left text-2xl">{s.char}</div>
                            <div className="self-center">{s.value.toString()}</div>
                            <div className="self-center">x1</div>
                            <div className="self-center">x5</div>
                            <div className="col-span-3 self-center text-yellow-500 font-bold">x20</div>
                        </React.Fragment>
                    ))}
                </div>
            </div>
        </div>
    );
};

// Reel Index (Slightly narrower for 5 reels)
const ReelIndex = ({ id, spinning }) => {
    const symbol = SYMBOLS.find(s => s.id === id);
    return (
        <div className="w-16 sm:w-24 h-28 bg-gradient-to-b from-slate-100 to-slate-200 flex items-center justify-center relative overflow-hidden">
            {spinning ? (
                <div className="absolute inset-0 flex flex-col animate-slot-spin opacity-60">
                    <div className="text-4xl py-4 grayscale">🃏</div>
                    <div className="text-4xl py-4 grayscale">7️⃣</div>
                    <div className="text-4xl py-4 grayscale">💎</div>
                </div>
            ) : (
                <div className={`text-4xl sm:text-6xl drop-shadow-xl animate-in slide-in-from-top-4 duration-300 ease-out-back ${symbol.id === 'wild' ? 'animate-pulse scale-110' : ''}`}>
                    {symbol?.char}
                </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/30 pointer-events-none shadow-inner"></div>
        </div>
    );
};

// Styles
const styleSheet = document.createElement("style");
styleSheet.innerText = `
@keyframes slot-spin { 0% { transform: translateY(-50%); } 100% { transform: translateY(0%); } }
@keyframes fall { 0% { transform: translateY(-100%); } 100% { transform: translateY(100vh) rotate(360deg); } }
.animate-slot-spin { animation: slot-spin 0.2s linear infinite; will-change: transform; }
.animate-fall { animation: fall 3s linear infinite; }
.perspective-1000 { perspective: 1000px; }
.preserve-3d { transform-style: preserve-3d; }
.backface-hidden { backface-visibility: hidden; }
`;
document.head.appendChild(styleSheet);

export default SlotMachine;
