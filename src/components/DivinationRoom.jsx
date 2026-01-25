import React, { useState } from 'react';
import MagicHeader from './MagicHeader';

const TAROT_CARDS = [
    { name: "The Fool", meaning: "New beginnings, optimism, trust in life." },
    { name: "The Magician", meaning: "Action, the power to manifest." },
    { name: "The High Priestess", meaning: "Intuition, higher powers, mystery." },
    { name: "The Empress", meaning: "Fertility, creativity, abundance." },
    { name: "The Emperor", meaning: "Structure, stability, rules and power." },
    { name: "The Hierophant", meaning: "Tradition, conformity, spiritual guidance." },
    { name: "The Lovers", meaning: "Love, union, relationships, values alignment." },
    { name: "The Chariot", meaning: "Control, will power, victory, assertion." },
    { name: "Strength", meaning: "Courage, persuasion, influence, compassion." },
    { name: "The Hermit", meaning: "Soul-searching, introspection, being alone." },
    { name: "Wheel of Fortune", meaning: "Good luck, karma, life cycles, destiny." },
    { name: "Justice", meaning: "Justice, fairness, truth, cause and effect." },
    { name: "The Hanged Man", meaning: "Suspension, restriction, letting go." },
    { name: "Death", meaning: "Endings, change, transformation, transition." },
    { name: "Temperance", meaning: "Balance, moderation, patience, purpose." },
    { name: "The Devil", meaning: "Addiction, materialism, playfulness." },
    { name: "The Tower", meaning: "Sudden change, upheaval, chaos, revelation." },
    { name: "The Star", meaning: "Hope, spirituality, renewal, inspiration." },
    { name: "The Moon", meaning: "Illusion, fear, anxiety, subconscious." },
    { name: "The Sun", meaning: "Fun, warmth, success, positivity." },
    { name: "Judgement", meaning: "Judgement, rebirth, inner calling." },
    { name: "The World", meaning: "Completion, integration, accomplishment, travel." }
];


import { FORTUNE_POEMS } from '../data/fortunePoems';
import { LEI_YU_SHI_POEMS } from '../data/leiyushi_poems';
import { SIXTY_JIAZI_POEMS } from '../data/sixty_jiazi_poems';
import { PENGHU_POEMS } from '../data/penghu_poems';
import { GUANYIN_POEMS } from '../data/guanyin_poems';

const DivinationRoom = ({ bgTheme, playSound, embedded = false, onSave, isLightMode }) => {
    const [poemSource, setPoemSource] = useState('leiyushi'); // 'leiyushi' | 'daily' | 'sixty' | 'penghu' | 'guanyin'
    const [poem, setPoem] = useState(null);
    const [candidates, setCandidates] = useState([]); // Stage 1 result
    const [isThinking, setIsThinking] = useState(false);
    const [tarot, setTarot] = useState(null);
    const [direction, setDirection] = useState(null);
    const [cookie, setCookie] = useState(null);
    const [showSecondary, setShowSecondary] = useState(false);

    // Stage 1: Draw 5 Candidates (True Random)
    const drawCandidates = () => {
        if (playSound) playSound('predict');
        setIsThinking(true);
        setPoem(null);
        setCandidates([]);
        setShowSecondary(false);

        const sourceData = poemSource === 'leiyushi' ? LEI_YU_SHI_POEMS : (poemSource === 'sixty' ? SIXTY_JIAZI_POEMS : (poemSource === 'penghu' ? PENGHU_POEMS : (poemSource === 'guanyin' ? GUANYIN_POEMS : FORTUNE_POEMS)));

        setTimeout(() => {
            const newCandidates = [];
            const indices = new Uint32Array(5);
            window.crypto.getRandomValues(indices);

            for (let i = 0; i < 5; i++) {
                // Modulo to get valid index
                const index = indices[i] % sourceData.length;
                newCandidates.push(sourceData[index]);
            }

            setCandidates(newCandidates);
            setIsThinking(false);
            if (playSound) playSound('coin');
        }, 1000); // Shaking animation time
    };

    // Stage 2: Select One
    const selectCandidate = (selectedPoem) => {
        if (playSound) playSound('success');
        setPoem(selectedPoem);
        setCandidates([]); // Clear candidates
    };

    // Determine Background Style
    const getCardStyle = (data) => {
        // Lei Yu Shi logic
        if (poemSource === 'leiyushi') {
            const luck = data?.header?.luck;
            if (luck && luck.includes('吉')) {
                return isLightMode
                    ? "bg-gradient-to-br from-red-50 via-amber-50 to-orange-50 border-red-200 shadow-xl shadow-red-200/50"
                    : "bg-gradient-to-br from-red-600 via-red-500 to-amber-500 shadow-2xl shadow-red-500/50 border-amber-300";
            }
            if (luck && luck.includes('凶')) {
                return isLightMode ? "bg-slate-100 border-slate-300 shadow-xl" : "bg-slate-950 border-slate-700 shadow-xl shadow-black";
            }
            return isLightMode ? "bg-red-50 border-red-200" : "bg-red-900/20 border-red-500/30";
        }
        // 60 Jia Zi logic
        else if (poemSource === 'sixty') {
            return isLightMode
                ? "bg-gradient-to-br from-indigo-50 via-purple-50 to-blue-50 border-indigo-200 shadow-xl shadow-indigo-200/50"
                : "bg-gradient-to-br from-indigo-900 via-purple-900 to-indigo-950 shadow-2xl shadow-indigo-500/50 border-indigo-300";
        }
        // Penghu logic
        else if (poemSource === 'penghu') {
            return isLightMode
                ? "bg-gradient-to-br from-teal-50 via-emerald-50 to-cyan-50 border-emerald-200 shadow-xl shadow-emerald-200/50"
                : "bg-gradient-to-br from-teal-900 via-emerald-900 to-teal-950 shadow-2xl shadow-emerald-500/50 border-emerald-300";
        }
        // Guanyin logic
        else if (poemSource === 'guanyin') {
            return isLightMode
                ? "bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50 border-amber-200 shadow-xl shadow-amber-200/50"
                : "bg-gradient-to-br from-orange-950 via-amber-900 to-yellow-950 shadow-2xl shadow-amber-500/50 border-amber-300";
        }
        // Daily Fortune logic
        else {
            if (data.title && data.title.includes('大吉')) {
                return isLightMode
                    ? "bg-gradient-to-br from-red-50 via-amber-50 to-orange-50 border-red-200 shadow-xl shadow-red-200/50"
                    : "bg-gradient-to-br from-red-600 via-red-500 to-amber-500 shadow-2xl shadow-red-500/50 border-amber-300";
            }
            if (data.title && data.title.includes('凶')) {
                return isLightMode ? "bg-slate-200 border-slate-300 shadow-xl" : "bg-slate-950 border-slate-700 shadow-xl shadow-black";
            }
            return isLightMode ? "bg-red-50 border-red-200" : "bg-red-900/20 border-red-500/30";
        }
    };

    const getTextStyle = (data) => {
        // Lei Yu Shi logic
        if (poemSource === 'leiyushi') {
            const luck = data?.header?.luck;
            if (luck && luck.includes('凶')) return isLightMode ? "text-slate-700" : "text-slate-400";
            if (luck && luck.includes('吉')) return isLightMode ? "text-red-700 drop-shadow-sm" : "text-white drop-shadow-md";
            return isLightMode ? "text-amber-700" : "text-amber-400";
        }
        // 60 Jia Zi logic
        else if (poemSource === 'sixty') {
            return isLightMode ? "text-indigo-800 drop-shadow-sm" : "text-indigo-100 drop-shadow-md";
        }
        // Penghu logic
        else if (poemSource === 'penghu') {
            return isLightMode ? "text-emerald-800 drop-shadow-sm" : "text-emerald-100 drop-shadow-md";
        }
        // Guanyin logic
        else if (poemSource === 'guanyin') {
            return isLightMode ? "text-amber-800 drop-shadow-sm" : "text-amber-100 drop-shadow-md";
        }
        // Daily Fortune logic
        else {
            if (data.title && data.title.includes('凶')) return isLightMode ? "text-slate-700" : "text-slate-400";
            if (data.title && data.title.includes('大吉')) return isLightMode ? "text-red-700 drop-shadow-sm" : "text-white drop-shadow-md";
            return isLightMode ? "text-amber-700" : "text-amber-400";
        }
    };

    const drawTarot = () => {
        if (playSound) playSound('success');
        const randomCard = TAROT_CARDS[Math.floor(Math.random() * TAROT_CARDS.length)];
        setTarot(randomCard);
    };

    const spinCompass = () => {
        if (playSound) playSound('coin');
        const dirs = ['North', 'North-East', 'East', 'South-East', 'South', 'South-West', 'West', 'North-West'];
        const randomDir = dirs[Math.floor(Math.random() * dirs.length)];
        setDirection(randomDir);
    };

    const crackCookie = () => {
        if (playSound) playSound('click');
        const randomMsg = FORTUNE_COOKIES[Math.floor(Math.random() * FORTUNE_COOKIES.length)];
        setCookie(randomMsg);
    };

    return (
        <div className={`mx-auto space-y-6 ${embedded ? 'p-0' : ''}`}>
            {!embedded && (
                <MagicHeader
                    title="Oracle Room"
                    subtitle="Consult the mystic forces for daily guidance."
                    icon="🔮"
                    themeIndex={bgTheme}
                    isLightMode={isLightMode}
                />
            )}

            <div className={`grid grid-cols-1 ${embedded ? 'gap-6' : 'gap-8'}`}>
                {/* 1. Fortune Poem */}
                <div className="bg-slate-900/60 light:bg-white p-6 rounded-3xl border border-white/10 light:border-slate-200 flex flex-col items-center text-center shadow-lg light:shadow-xl">
                    <div className="text-4xl mb-4">📜</div>

                    {/* Header showing current source */}
                    <h3 className="text-xl font-bold text-amber-100 light:text-amber-800 mb-2">
                        {poemSource === 'leiyushi' ? '雷雨師 (Lei Yu Shi)' : (poemSource === 'sixty' ? '六十甲子籤 (60 Jia Zi)' : (poemSource === 'penghu' ? '澎湖天后宮 (Penghu Temple)' : (poemSource === 'guanyin' ? '觀音一百籤 (Guanyin 100)' : '東京淺草觀音寺 (Tokyo Asakusa)')))}
                    </h3>

                    {/* Source Toggle */}
                    {!poem && candidates.length === 0 && !isThinking && (
                        <div className="flex bg-black/40 light:bg-slate-100 p-1 rounded-full mb-6 border border-white/10 light:border-slate-200">
                            <button
                                onClick={() => setPoemSource('leiyushi')}
                                className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${poemSource === 'leiyushi' ? 'bg-amber-500 light:bg-amber-400 text-black light:text-amber-900 shadow-lg' : 'text-slate-400 light:text-slate-500 hover:text-white light:hover:text-amber-600'}`}
                            >
                                雷雨師
                            </button>
                            <button
                                onClick={() => setPoemSource('sixty')}
                                className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${poemSource === 'sixty' ? 'bg-indigo-500 light:bg-indigo-400 text-white shadow-lg' : 'text-slate-400 light:text-slate-500 hover:text-white light:hover:text-indigo-600'}`}
                            >
                                六十甲子
                            </button>
                            <button
                                onClick={() => setPoemSource('penghu')}
                                className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${poemSource === 'penghu' ? 'bg-emerald-500 light:bg-emerald-400 text-white shadow-lg' : 'text-slate-400 light:text-slate-500 hover:text-white light:hover:text-emerald-600'}`}
                            >
                                澎湖天后宮
                            </button>
                            <button
                                onClick={() => setPoemSource('guanyin')}
                                className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${poemSource === 'guanyin' ? 'bg-orange-600 light:bg-orange-400 text-white shadow-lg' : 'text-slate-400 light:text-slate-500 hover:text-white light:hover:text-orange-600'}`}
                            >
                                觀音一百籤
                            </button>
                            <button
                                onClick={() => setPoemSource('daily')}
                                className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${poemSource === 'daily' ? 'bg-amber-500 light:bg-amber-400 text-black light:text-amber-900 shadow-lg' : 'text-slate-400 light:text-slate-500 hover:text-white light:hover:text-amber-600'}`}
                            >
                                東京淺草
                            </button>
                        </div>
                    )}

                    <p className="text-sm text-slate-400 light:text-slate-500 mb-6">
                        虔誠祈求，抽一支靈籤指引迷津。
                        <br />(Sincerely pray and draw a lot for guidance)
                    </p>

                    {/* Stage 0: Initial State */}
                    {!poem && candidates.length === 0 && !isThinking && (
                        <div className="animate-in fade-in zoom-in duration-500">
                            <div className="text-6xl mb-4 opacity-80 light:text-slate-800">筒</div>
                            <h3 className="text-2xl font-bold text-amber-100 light:text-slate-900 mb-2">
                                {poemSource === 'leiyushi' ? '雷雨師' : (poemSource === 'sixty' ? '六十甲子' : (poemSource === 'penghu' ? '澎湖天后宮' : (poemSource === 'guanyin' ? '觀音一百籤' : '東京淺草觀音寺')))}
                            </h3>
                            <button
                                onClick={drawCandidates}
                                className="px-8 py-3 rounded-full bg-gradient-to-r from-red-700 to-red-900 light:from-red-500 light:to-red-600 hover:from-red-600 hover:to-red-800 light:hover:from-red-400 light:hover:to-red-500 text-amber-100 light:text-white font-bold transition-all active:scale-95 shadow-lg shadow-red-900/40 light:shadow-red-500/30 border border-red-500/20 light:border-red-400"
                            >
                                抽籤 (Draw Lot)
                            </button>
                        </div>
                    )}

                    {/* Stage 1: Animation */}
                    {isThinking && (
                        <div className="flex flex-col items-center justify-center animate-in fade-in duration-300 py-12">
                            <div className="text-6xl mb-4 animate-bounce">🎲</div>
                            <p className="text-amber-200 light:text-slate-700 font-mono animate-pulse">Shaking the cylinder...</p>
                        </div>
                    )}

                    {/* Stage 2: Selection (Bamboo Sticks) */}
                    {candidates.length > 0 && !poem && (
                        <div className="animate-in fade-in zoom-in duration-500 w-full mb-6">
                            <h3 className="text-xl font-bold text-amber-100 light:text-slate-900 mb-6 animate-pulse">Pick a stick...</h3>
                            <div className="flex justify-center gap-4 h-48 items-end">
                                {candidates.map((cand, idx) => (
                                    <button
                                        key={idx}
                                        onClick={() => selectCandidate(cand)}
                                        className="group relative w-8 h-32 bg-amber-200 rounded-t-full hover:h-40 hover:-translate-y-2 transition-all duration-300 shadow-lg shadow-black/50 border border-amber-400 overflow-hidden"
                                        title="Pick this fortune"
                                    >
                                        <div className="absolute inset-0 bg-gradient-to-b from-amber-100 to-amber-600 opacity-80"></div>
                                        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 text-xs font-bold text-amber-900 rotate-90 whitespace-nowrap opacity-50 text-[8px]">
                                            FORTUNE
                                        </div>
                                    </button>
                                ))}
                            </div>
                            <p className="text-xs text-slate-400 mt-6">(True Random Selection)</p>
                        </div>
                    )}

                    {/* Stage 3: Result */}
                    {poem && (
                        <div className={`mb-6 animate-in zoom-in duration-500 p-8 rounded-xl border w-full max-w-2xl relative overflow-hidden ${getCardStyle(poem)}`}>
                            {/* Save Button (Top Left) */}
                            {onSave && (
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        if (poemSource === 'leiyushi') {
                                            const saveText = `${poem.header.number}籤 ${poem.header.luck}\n${poem.poem}\n[聖意]\n${poem.shengYi.join('\n')}`;
                                            onSave(saveText, '雷雨師');
                                        } else if (poemSource === 'sixty') {
                                            const saveText = `${poem.header.number} ${poem.header.stemBranch}\n${poem.poem}\n[Nature] ${poem.meta.nature} [Direction] ${poem.meta.direction}\n[Stories] ${poem.stories.join(', ')}`;
                                            onSave(saveText, '六十甲子籤');
                                        } else if (poemSource === 'penghu') {
                                            const predictionsText = Object.entries(poem.predictions).map(([k, v]) => `[${k}] ${v}`).join('\n');
                                            const saveText = `${poem.header.number}\n${poem.poem}\n\n${predictionsText}`;
                                            onSave(saveText, '澎湖天后宮一百籤');
                                        } else if (poemSource === 'guanyin') {
                                            const intentText = Object.entries(poem.intent).map(([k, v]) => `[${k}] ${v}`).sort().join('  ');
                                            const saveText = `${poem.header.number} ${poem.header.luck}\n${poem.poem}\n[意]${poem.meaning}\n[解]${poem.explanation}\n${intentText}`;
                                            onSave(saveText, '觀音一百籤');
                                        } else {
                                            onSave(`${poem.title}\n\n${poem.text}`, '東京淺草觀音寺');
                                        }
                                    }}
                                    className="absolute top-4 left-4 w-10 h-10 rounded-full bg-black/20 light:bg-white hover:bg-white/20 light:hover:bg-slate-50 text-white/50 light:text-indigo-400 hover:text-white light:hover:text-indigo-600 flex items-center justify-center transition-all active:scale-95 border border-white/10 light:border-slate-200 hover:border-white/30 shadow-sm"
                                    title="Save to Vault"
                                >
                                    💾
                                </button>
                            )}

                            {/* LEI YU SHI RENDER LAYOUT */}
                            {poemSource === 'leiyushi' && (
                                <>
                                    <div className="absolute top-0 right-0 p-2 opacity-10 font-serif text-6xl text-red-500 font-bold">{poem.header.luck && poem.header.luck.includes('吉') ? '吉' : '運'}</div>
                                    <div className={`text-2xl font-black mb-2 pt-2 ${getTextStyle(poem)}`}>
                                        第{poem.header.number}籤 {poem.header.luck}
                                    </div>
                                    <div className="text-sm font-serif opacity-70 mb-6 light:text-slate-600">{poem.header.cycle}</div>

                                    <div className="text-white/90 light:text-slate-900 text-2xl font-serif leading-loose whitespace-pre-line tracking-widest mb-8 bg-black/20 light:bg-slate-100/50 p-6 rounded-lg shadow-inner light:border light:border-slate-200">
                                        {poem.poem}
                                    </div>

                                    {/* Primary Info: ShengYi */}
                                    <div className="text-slate-200 light:text-slate-700 text-base font-sans leading-relaxed whitespace-pre-line mb-6 bg-slate-900/40 light:bg-slate-100/50 p-6 rounded border border-white/5 light:border-slate-200 text-left">
                                        <span className="text-amber-400 light:text-amber-700 font-bold text-lg block mb-3 border-b border-amber-400/20 light:border-amber-700/20 pb-2">【聖意 Holy Intent】</span>
                                        <ul className="list-disc list-inside space-y-1 text-sm">
                                            {poem.shengYi.map((item, i) => (
                                                <li key={i}>{item}</li>
                                            ))}
                                        </ul>
                                    </div>

                                    {/* Secondary Info Toggle */}
                                    <button
                                        onClick={() => setShowSecondary(!showSecondary)}
                                        className={`mb-4 text-xs underline underline-offset-4 ${isLightMode ? 'text-slate-500 hover:text-slate-800' : 'text-white/50 hover:text-white'}`}
                                    >
                                        {showSecondary ? "Hide Details" : "Show Interpretation & Stories"}
                                    </button>

                                    {/* Secondary Info Content */}
                                    {showSecondary && (
                                        <div className="space-y-4 animate-in slide-in-from-top-2 duration-300">
                                            {/* DongPoJie */}
                                            {poem.dongPoJie && poem.dongPoJie.length > 0 && (
                                                <div className="text-slate-300 light:text-slate-700 text-sm font-sans leading-relaxed text-left bg-slate-900/40 light:bg-slate-100/50 p-4 rounded border border-white/5 light:border-slate-200">
                                                    <span className="text-emerald-400 light:text-emerald-700 font-bold block mb-2">【東坡解 Dongpo's Interpretation】</span>
                                                    {poem.dongPoJie.map((line, i) => <p key={i} className="mb-1">{line}</p>)}
                                                </div>
                                            )}

                                            {/* JieYue & ShiYi */}
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                {poem.jieYue && (
                                                    <div className="text-slate-300 light:text-slate-700 text-xs font-sans leading-relaxed text-left bg-slate-900/40 light:bg-slate-100/50 p-4 rounded border border-white/5 light:border-slate-200">
                                                        <span className="text-indigo-400 light:text-indigo-700 font-bold block mb-2">【解曰 Explanation】</span>
                                                        <p>{poem.jieYue}</p>
                                                    </div>
                                                )}
                                                {poem.shiYi && (
                                                    <div className="text-slate-300 light:text-slate-700 text-xs font-sans leading-relaxed text-left bg-slate-900/40 light:bg-slate-100/50 p-4 rounded border border-white/5 light:border-slate-200">
                                                        <span className="text-indigo-400 light:text-indigo-700 font-bold block mb-2">【釋義 Meaning】</span>
                                                        <p>{poem.shiYi}</p>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Stories */}
                                            {poem.stories && poem.stories.length > 0 && (
                                                <div className="text-slate-300 light:text-slate-700 text-sm font-sans leading-relaxed text-left bg-slate-900/40 light:bg-slate-100/50 p-4 rounded border border-white/5 light:border-slate-200">
                                                    <span className="text-pink-400 light:text-pink-700 font-bold block mb-2">【故事 Stories】</span>
                                                    {poem.stories.map((story, i) => (
                                                        <div key={i} className="mb-3 last:mb-0">
                                                            <p className="whitespace-pre-line">{story}</p>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </>
                            )}

                            {/* DAILY FORTUNE RENDER LAYOUT */}
                            {poemSource === 'daily' && (
                                <>
                                    <div className="absolute top-0 right-0 p-2 opacity-10 font-serif text-6xl text-red-500 font-bold">吉</div>
                                    <div className={`text-2xl font-black mb-6 pb-4 border-b border-white/10 ${getTextStyle(poem)}`}>{poem.title}</div>
                                    <div className="text-white/90 light:text-slate-900 text-2xl font-serif leading-loose whitespace-pre-line tracking-widest mb-8 bg-black/20 light:bg-slate-100/50 p-6 rounded-lg shadow-inner light:border light:border-slate-200">
                                        {poem.text}
                                    </div>

                                    {/* Meaning */}
                                    <div className="text-slate-200 light:text-slate-700 text-base font-sans leading-relaxed whitespace-pre-line mb-6 bg-slate-900/40 light:bg-slate-100/50 p-6 rounded border border-white/5 light:border-slate-200 text-left">
                                        <span className="text-amber-400 light:text-amber-700 font-bold text-lg block mb-3 border-b border-amber-400/20 light:border-amber-700/20 pb-2">【釋義 Meaning】</span>
                                        {poem.meaning}
                                    </div>

                                    {/* Predictions */}
                                    <div className="text-slate-300 light:text-slate-700 text-sm font-sans leading-relaxed whitespace-pre-line text-left bg-slate-900/40 light:bg-slate-100/50 p-6 rounded border border-white/5 light:border-slate-200">
                                        <span className="text-emerald-400 light:text-emerald-700 font-bold text-lg block mb-3 border-b border-emerald-400/20 light:border-emerald-700/20 pb-2">【判定 Predictions】</span>
                                        {poem.predictions}
                                    </div>
                                </>
                            )}

                            {/* SIXTY JIA ZI RENDER LAYOUT */}
                            {poemSource === 'sixty' && (
                                <>
                                    <div className="absolute top-0 right-0 p-2 opacity-10 font-serif text-6xl text-indigo-500 font-bold">{poem.header.stemBranch}</div>
                                    <div className={`text-2xl font-black mb-2 pt-2 ${getTextStyle(poem)}`}>
                                        {poem.header.number} 【{poem.header.stemBranch}】
                                    </div>

                                    {/* Meta Badges */}
                                    <div className="flex flex-wrap justify-center gap-2 mb-6">
                                        {poem.meta.nature && <span className="bg-white/10 px-2 py-0.5 rounded text-xs text-white/70">{poem.meta.nature}</span>}
                                        {poem.meta.direction && <span className="bg-white/10 px-2 py-0.5 rounded text-xs text-white/70">{poem.meta.direction}</span>}
                                    </div>

                                    {/* Poem */}
                                    <div className="text-white/90 light:text-slate-900 text-2xl font-serif leading-loose whitespace-pre-line tracking-widest mb-8 bg-black/20 light:bg-indigo-50/50 p-6 rounded-lg shadow-inner light:border light:border-indigo-200">
                                        {poem.poem}
                                    </div>

                                    {/* Secondary Info Toggle */}
                                    <button
                                        onClick={() => setShowSecondary(!showSecondary)}
                                        className={`mb-4 text-xs underline underline-offset-4 ${isLightMode ? 'text-slate-500 hover:text-slate-800' : 'text-white/50 hover:text-white'}`}
                                    >
                                        {showSecondary ? "Hide Dictionary & Stories" : "Show Predictions (籤解) & Stories"}
                                    </button>

                                    {/* Secondary Info Content */}
                                    {showSecondary && (
                                        <div className="space-y-4 animate-in slide-in-from-top-2 duration-300">
                                            {/* Predictions */}
                                            <div className="text-slate-300 light:text-slate-700 text-sm font-sans leading-relaxed text-left bg-indigo-900/40 light:bg-indigo-50 p-4 rounded border border-white/5 light:border-indigo-200">
                                                <span className="text-indigo-300 light:text-indigo-700 font-bold block mb-2 border-b border-white/10 light:border-indigo-200 pb-1">【籤解 Predictions】</span>
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1">
                                                    {Object.entries(poem.predictions).map(([key, val], i) => (
                                                        <div key={i} className="flex text-xs">
                                                            <span className="text-indigo-400 font-bold min-w-[3em]">{key}:</span>
                                                            <span className="text-slate-300 ml-1">{val}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>

                                            {/* Stories */}
                                            {poem.stories && poem.stories.length > 0 && (
                                                <div className="text-slate-300 light:text-slate-700 text-sm font-sans leading-relaxed text-left bg-indigo-900/40 light:bg-indigo-50 p-4 rounded border border-white/5 light:border-indigo-200">
                                                    <span className="text-pink-300 light:text-pink-700 font-bold block mb-2 border-b border-white/10 light:border-indigo-200 pb-1">【故事 Stories】</span>
                                                    {poem.stories.map((story, i) => (
                                                        <div key={i} className="mb-3 last:mb-0">
                                                            <p className="whitespace-pre-line">{story}</p>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </>
                            )}

                            {/* GUANYIN RENDER LAYOUT */}
                            {poemSource === 'guanyin' && (
                                <>
                                    <div className="absolute top-0 right-0 p-2 opacity-20 font-serif text-6xl text-amber-500 font-bold">{poem.header.luck}</div>
                                    <div className={`text-2xl font-black mb-1 pt-2 drop-shadow-md ${isLightMode ? 'text-amber-800' : 'text-amber-100'}`}>
                                        {poem.header.number} {poem.header.luck}
                                    </div>
                                    <div className={`text-sm font-serif opacity-70 mb-6 ${isLightMode ? 'text-amber-700' : 'text-amber-200'}`}>{poem.header.palace}</div>

                                    <div className={`text-2xl font-serif leading-loose whitespace-pre-line tracking-widest mb-8 p-6 rounded-lg shadow-inner ${isLightMode ? 'bg-amber-50/50 text-amber-900 border border-amber-200' : 'bg-black/20 text-white/95'}`}>
                                        {poem.poem}
                                    </div>

                                    {/* Primary Info: Meaning Only */}
                                    <div className="space-y-4 mb-6 text-left">
                                        <div className={`${isLightMode ? 'bg-amber-100/50' : 'bg-black/20'} p-4 rounded-lg`}>
                                            <h4 className="text-amber-400 light:text-amber-700 font-bold mb-1">【詩意】(Meaning)</h4>
                                            <p className={`${isLightMode ? 'text-amber-900' : 'text-amber-100/90'}`}>{poem.meaning}</p>
                                        </div>
                                    </div>

                                    {/* Toggle Secondary Info (Intent & Story) */}
                                    <button
                                        onClick={() => setShowSecondary(!showSecondary)}
                                        className={`mb-4 text-xs underline decoration-dotted underline-offset-4 ${isLightMode ? 'text-amber-700 hover:text-amber-900' : 'text-amber-400 hover:text-amber-200'}`}
                                    >
                                        {showSecondary ? "Hide Details" : "Show Details (Intent & Story)"}
                                    </button>

                                    {showSecondary && (
                                        <div className="animate-in fade-in slide-in-from-top-4 duration-500 space-y-4 text-left">
                                            {/* Explanation (Moved here) */}
                                            <div className={`${isLightMode ? 'bg-amber-100/50' : 'bg-black/20'} p-4 rounded-lg`}>
                                                <h4 className="text-amber-400 light:text-amber-700 font-bold mb-1">【解曰】(Explanation)</h4>
                                                <p className={`${isLightMode ? 'text-amber-900' : 'text-amber-100/90'}`}>{poem.explanation}</p>
                                            </div>

                                            {/* Holy Intent Grid */}
                                            {poem.intent && Object.keys(poem.intent).length > 0 && (
                                                <div className={`${isLightMode ? 'bg-amber-100/50' : 'bg-black/20'} p-4 rounded-lg`}>
                                                    <h4 className={`font-bold mb-3 border-b pb-2 ${isLightMode ? 'text-amber-700 border-amber-500/30' : 'text-amber-400 border-amber-500/30'}`}>【聖意】(Holy Intent)</h4>
                                                    <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                                                        {Object.entries(poem.intent).map(([key, value]) => (
                                                            <div key={key} className={`flex justify-between border-b pb-1 last:border-0 px-1 rounded ${isLightMode ? 'border-amber-900/10 hover:bg-amber-200/50' : 'border-white/5 hover:bg-white/5'}`}>
                                                                <span className={`${isLightMode ? 'text-amber-800/70' : 'text-amber-200/70'}`}>{key}</span>
                                                                <span className={`${isLightMode ? 'text-amber-900' : 'text-amber-100'} font-medium`}>{value}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            {/* Story */}
                                            {poem.story && (
                                                <div className={`${isLightMode ? 'bg-amber-100/50' : 'bg-black/20'} p-4 rounded-lg`}>
                                                    <h4 className={`font-bold mb-2 border-b pb-1 ${isLightMode ? 'text-amber-700 border-amber-500/30' : 'text-amber-400 border-amber-500/30'}`}>【故事】{poem.story.title}</h4>
                                                    <p className={`text-sm leading-relaxed whitespace-pre-line ${isLightMode ? 'text-amber-900/90' : 'text-amber-100/80'}`}>
                                                        {poem.story.content}
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </>
                            )}

                            {poemSource === 'penghu' && (
                                <>
                                    <div className="absolute top-0 right-0 p-2 opacity-10 font-serif text-6xl text-emerald-500 font-bold">{poem.header.number.replace(/第|籤/g, '')}</div>
                                    <div className={`text-2xl font-black mb-2 pt-2 ${getTextStyle(poem)}`}>
                                        {poem.header.number}
                                    </div>

                                    {/* Poem */}
                                    {/* Poem */}
                                    {poem.poem.includes('【籤詩二】') ? (
                                        <div className="space-y-6 mb-8">
                                            {poem.poem.split('\n\n【籤詩二】\n').map((part, idx) => (
                                                <div key={idx} className="relative">
                                                    <div className="text-emerald-300/50 text-xs font-bold mb-1 ml-1">
                                                        {idx === 0 ? '【籤詩一 Poem 1】' : '【籤詩二 Poem 2】'}
                                                    </div>
                                                    <div className="text-white/90 light:text-slate-900 text-2xl font-serif leading-loose whitespace-pre-line tracking-widest bg-black/20 light:bg-emerald-50/50 p-6 rounded-lg shadow-inner border border-emerald-500/10 light:border-emerald-200">
                                                        {part}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="text-white/90 light:text-slate-900 text-2xl font-serif leading-loose whitespace-pre-line tracking-widest mb-8 bg-black/20 light:bg-emerald-50/50 p-6 rounded-lg shadow-inner light:border light:border-emerald-200">
                                            {poem.poem}
                                        </div>
                                    )}

                                    {/* Secondary Info Toggle */}
                                    <button
                                        onClick={() => setShowSecondary(!showSecondary)}
                                        className={`mb-4 text-xs underline underline-offset-4 ${isLightMode ? 'text-slate-500 hover:text-emerald-700' : 'text-white/50 hover:text-white'}`}
                                    >
                                        {showSecondary ? "Hide Predictions" : "Show Predictions (籤解)"}
                                    </button>

                                    {/* Secondary Info Content */}
                                    {showSecondary && (
                                        <div className="space-y-4 animate-in slide-in-from-top-2 duration-300">
                                            {/* Predictions */}
                                            <div className="text-slate-300 light:text-slate-700 text-sm font-sans leading-relaxed text-left bg-emerald-900/40 light:bg-emerald-50 p-4 rounded border border-white/5 light:border-emerald-200">
                                                <span className="text-emerald-300 light:text-emerald-700 font-bold block mb-2 border-b border-white/10 light:border-emerald-700/20 pb-1">【籤解 Predictions】</span>
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1">
                                                    {Object.entries(poem.predictions).map(([key, val], i) => (
                                                        <div key={i} className="flex text-xs">
                                                            <span className="text-emerald-400 light:text-emerald-700 font-bold min-w-[3em]">{key}:</span>
                                                            <span className="text-slate-300 light:text-slate-700 ml-1">{val}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </>
                            )}

                            <button
                                onClick={drawCandidates}
                                className="mt-8 px-8 py-3 rounded-full bg-black/40 light:bg-emerald-100 hover:bg-black/60 light:hover:bg-emerald-200 text-amber-100 light:text-emerald-700 font-bold transition-all active:scale-95 border border-white/10 light:border-emerald-300 mx-auto block shadow-sm"
                            >
                                重抽 (Redraw)
                            </button>
                        </div>
                    )}
                </div>

                {/* 2. Tarot Card */}
                <div className="bg-slate-900/40 light:bg-white p-6 rounded-3xl border border-white/10 light:border-slate-200 flex flex-col items-center text-center shadow-lg light:shadow-xl">
                    <div className="text-4xl mb-4">🎴</div>
                    <h3 className="text-xl font-bold text-indigo-300 light:text-indigo-700 mb-2">Daily Tarot</h3>
                    <p className="text-sm text-slate-400 light:text-slate-500 mb-6 min-h-[3rem]">
                        Draw a card from the Major Arcana to understand the energy of your day.
                    </p>

                    {tarot && (
                        <div className="mb-6 animate-in zoom-in duration-500">
                            <div className="text-2xl font-black text-white light:text-slate-800 mb-1">{tarot.name}</div>
                            <div className="text-indigo-400 light:text-indigo-600 text-sm italic">"{tarot.meaning}"</div>
                        </div>
                    )}

                    <button
                        onClick={drawTarot}
                        className="mt-auto px-6 py-2 rounded-full bg-indigo-600 light:bg-indigo-500 hover:bg-indigo-500 light:hover:bg-indigo-400 text-white font-bold transition-all active:scale-95 shadow-lg shadow-indigo-500/20 light:shadow-indigo-500/30"
                    >
                        {tarot ? 'Draw Again' : 'Draw Card'}
                    </button>
                </div>

                {/* 3. Lucky Compass */}
                <div className="bg-slate-900/40 light:bg-white p-6 rounded-3xl border border-white/10 light:border-slate-200 flex flex-col items-center text-center shadow-lg light:shadow-xl">
                    <div className="text-4xl mb-4">🧭</div>
                    <h3 className="text-xl font-bold text-emerald-300 light:text-emerald-700 mb-2">Lucky Compass</h3>
                    <p className="text-sm text-slate-400 light:text-slate-500 mb-6 min-h-[3rem]">
                        Find your auspicious direction for wealth and travel today.
                    </p>

                    {direction && (
                        <div className="mb-6 animate-in zoom-in duration-500">
                            <div className="text-3xl font-black text-emerald-400 light:text-emerald-600 mb-1">{direction}</div>
                            <div className="text-emerald-500/60 light:text-emerald-700/60 text-xs uppercase tracking-widest font-bold">Direction</div>
                        </div>
                    )}

                    <button
                        onClick={spinCompass}
                        className="mt-auto px-6 py-2 rounded-full bg-emerald-600 light:bg-emerald-500 hover:bg-emerald-500 light:hover:bg-emerald-400 text-white font-bold transition-all active:scale-95 shadow-lg shadow-emerald-500/20 light:shadow-emerald-500/30"
                    >
                        Spin Compass
                    </button>
                </div>

                {/* 4. Fortune Cookie */}
                <div className="bg-slate-900/40 light:bg-white p-6 rounded-3xl border border-white/10 light:border-slate-200 flex flex-col items-center text-center shadow-lg light:shadow-xl">
                    <div className="text-4xl mb-4">🥠</div>
                    <h3 className="text-xl font-bold text-amber-300 light:text-amber-700 mb-2">Fortune Cookie</h3>
                    <p className="text-sm text-slate-400 light:text-slate-500 mb-6 min-h-[3rem]">
                        Crack open a cookie to reveal a hidden truth or advice.
                    </p>

                    {cookie && (
                        <div className="mb-6 animate-in zoom-in duration-500 bg-black/20 light:bg-amber-100/50 p-4 rounded-xl border border-white/5 light:border-amber-200">
                            <div className="text-amber-200 light:text-amber-800 italic font-medium">"{cookie}"</div>
                        </div>
                    )}

                    <button
                        onClick={crackCookie}
                        className="mt-auto px-6 py-2 rounded-full bg-amber-600 light:bg-amber-500 hover:bg-amber-500 light:hover:bg-amber-400 text-white font-bold transition-all active:scale-95 shadow-lg shadow-amber-500/20 light:shadow-amber-500/30"
                    >
                        Crack Cookie
                    </button>
                </div>
            </div>
        </div>
    );
};

export default DivinationRoom;
