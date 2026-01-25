import React from 'react';
import { createPortal } from 'react-dom';
import DivinationRoom from './DivinationRoom';
import html2canvas from 'html2canvas';

const Sidebar = ({ isOpen, onClose, savedPredictions = [], onSavePrediction, onDeletePrediction, onClearVault, onImportVault, onCheckVault, systemSettings, onUpdateSettings, playSound, historyData = [], isLightMode, activeGameID, activeGameConfig, onSwitchGame, gameTypes }) => {
    const [currentView, setCurrentView] = React.useState('menu'); // menu, vault, config
    const [expandedGroups, setExpandedGroups] = React.useState({});

    // Reset to menu when sidebar opens
    React.useEffect(() => {
        if (isOpen) setCurrentView('menu');
    }, [isOpen]);

    // Poem Types constant for easy identification
    const POEM_TYPES = ['雷雨師', '六十甲子籤', '澎湖天后宮一百籤', '觀音一百籤', '東京淺草觀音寺'];

    // Group predictions by Category (Poems vs Games)
    const groupedPredictions = React.useMemo(() => {
        const groups = {
            'Poems': [],
            'LOTTO649': [],
            'SUPERLOTTO': [],
            '539': [],
            'Other': []
        };

        savedPredictions.forEach(item => {
            if (POEM_TYPES.includes(item.type) || item.type?.includes('Fortune') || item.type?.includes('Poem')) {
                groups['Poems'].push(item);
            } else if (item.gameID === 'LOTTO649' || (!item.gameID && item.type !== 'Other')) {
                groups['LOTTO649'].push(item); // Default to Lotto if no gameID but looks like a number prediction
            } else if (item.gameID === 'SUPERLOTTO') {
                groups['SUPERLOTTO'].push(item);
            } else if (item.gameID === '539') {
                groups['539'].push(item);
            } else {
                groups['Other'].push(item);
            }
        });

        // Filter out empty groups but KEEP the specific order
        const orderedGroups = {};
        if (groups['LOTTO649'].length > 0) orderedGroups['LOTTO649'] = groups['LOTTO649'];
        if (groups['SUPERLOTTO'].length > 0) orderedGroups['SUPERLOTTO'] = groups['SUPERLOTTO'];
        if (groups['539'].length > 0) orderedGroups['539'] = groups['539'];
        if (groups['Poems'].length > 0) orderedGroups['Poems'] = groups['Poems'];
        if (groups['Other'].length > 0) orderedGroups['Other'] = groups['Other'];

        return orderedGroups;
    }, [savedPredictions]);

    const getGroupInfo = (key) => {
        switch (key) {
            case 'Poems': return { title: '🔮 Fortune Poems', icon: '📜', color: 'bg-amber-500/20 text-amber-400 border-amber-500/30' };
            case 'LOTTO649': return { title: '🎱 Lotto 6/49', icon: '🎱', color: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30' };
            case 'SUPERLOTTO': return { title: '🪙 Super Lotto', icon: '🪙', color: 'bg-rose-500/20 text-rose-400 border-rose-500/30' };
            case '539': return { title: '💵 Jin Cai 539', icon: '💵', color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' };
            default: return { title: '📂 Other', icon: '📁', color: 'bg-slate-500/20 text-slate-400 border-slate-500/30' };
        }
    };

    const toggleGroup = (type) => {
        if (playSound) playSound('click');
        setExpandedGroups(prev => ({
            ...prev,
            [type]: !prev[type]
        }));
    };

    const fileInputRef = React.useRef(null);

    const verifyAccess = () => {
        const password = window.prompt("Enter System Password:");
        if (password === "2026111") {
            return true;
        } else {
            alert("⚠️ ACCESS DENIED ⚠️\nIncorrect system password.");
            if (playSound) playSound('error');
            return false;
        }
    };

    const handleFileUpload = (event) => {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const data = JSON.parse(e.target.result);
                    onImportVault(data);
                    if (playSound) playSound('success');
                } catch (error) {
                    alert("Error parsing JSON file");
                    if (playSound) playSound('error');
                }
            };
            reader.readAsText(file);
        }
        // Reset input value to allow re-importing same file
        event.target.value = '';
    };

    const handleExport = () => {
        if (!verifyAccess()) return;

        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(savedPredictions, null, 2));
        const downloadAnchorNode = document.createElement('a');
        downloadAnchorNode.setAttribute("href", dataStr);
        downloadAnchorNode.setAttribute("download", `lottery_vault_backup_${new Date().toISOString().split('T')[0]}.json`);
        document.body.appendChild(downloadAnchorNode);
        downloadAnchorNode.click();
        downloadAnchorNode.remove();
        if (playSound) playSound('success');
    };

    const renderOracle = () => (
        <div className="h-full overflow-y-auto p-8 space-y-10 custom-scrollbar animate-in fade-in slide-in-from-right-8 duration-500">
            <div className="flex items-center gap-4 px-2">
                <button
                    onClick={() => {
                        if (playSound) playSound('click');
                        setCurrentView('menu');
                    }}
                    className="group w-10 h-10 rounded-2xl bg-slate-800/80 light:bg-white text-slate-400 light:text-slate-600 flex items-center justify-center hover:bg-fuchsia-500 hover:text-white transition-all active:scale-90 border border-white/10 light:border-slate-200 shadow-xl"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5 group-hover:-translate-x-0.5 transition-transform">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                    </svg>
                </button>
                <div>
                    <h3 className="text-2xl font-black text-white light:text-slate-900 tracking-tight flex items-center gap-3">
                        <span className="p-2 bg-fuchsia-500/20 rounded-xl border border-fuchsia-500/30 text-xl shadow-inner">🔮</span> Oracle Room
                    </h3>
                    <p className="text-[10px] uppercase font-bold text-slate-500 tracking-widest mt-1 ml-1">Divination Nexus</p>
                </div>
            </div>
            {/* Embed Divination Room logic here visually */}
            <div className="relative rounded-[2.5rem] overflow-hidden border border-white/5 shadow-2xl">
                <DivinationRoom playSound={playSound} embedded={true} onSave={onSavePrediction} isLightMode={isLightMode} reducedMotion={systemSettings.reducedMotion} />
            </div>
        </div>
    );

    const renderMenu = () => (
        <div className="grid grid-cols-1 gap-6 p-8 animate-in fade-in slide-in-from-bottom-8 duration-500">
            {/* Vault Button */}
            <button
                onClick={() => {
                    if (playSound) playSound('click');
                    setCurrentView('vault');
                }}
                onMouseEnter={() => playSound && playSound('hover')}
                className="group relative h-28 rounded-[2rem] bg-gradient-to-br from-indigo-600/20 via-slate-900/40 to-slate-900/60 light:from-indigo-100/50 light:to-white border border-indigo-500/30 light:border-indigo-200 hover:border-indigo-400 p-5 text-left transition-all hover:shadow-[0_0_40px_-5px_rgba(99,102,241,0.3)] light:hover:shadow-xl active:scale-95 flex flex-col justify-between overflow-hidden"
            >
                <div className="absolute -top-4 -right-4 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl group-hover:bg-indigo-500/20 transition-all duration-700"></div>
                <div className="relative z-10 flex items-center justify-between">
                    <div className="bg-indigo-500/20 light:bg-indigo-100 w-14 h-14 rounded-2xl flex items-center justify-center text-3xl border border-indigo-500/30 light:border-indigo-300 group-hover:bg-indigo-500 group-hover:text-white transition-all duration-500 light:text-indigo-700 shadow-inner">
                        💾
                    </div>
                    <div className="text-[10px] uppercase font-black tracking-widest text-indigo-400 light:text-indigo-600 opacity-60 group-hover:opacity-100 transition-opacity">Storage Alpha</div>
                </div>
                <div className="relative z-10">
                    <h3 className="text-2xl font-black text-white light:text-slate-900 group-hover:translate-x-1 transition-transform tracking-tight">The Vault</h3>
                    <p className="text-xs text-slate-400 light:text-slate-500 font-bold mt-1 uppercase tracking-wider">{savedPredictions.length} Secure Records</p>
                </div>
            </button >

            {/* Oracle Button */}
            <button
                onClick={() => {
                    if (playSound) playSound('click');
                    setCurrentView('oracle');
                }}
                onMouseEnter={() => playSound && playSound('hover')}
                className="group relative h-28 rounded-[2rem] bg-gradient-to-br from-fuchsia-600/20 via-slate-900/40 to-slate-900/60 light:from-fuchsia-100/50 light:to-white border border-fuchsia-500/30 light:border-fuchsia-200 hover:border-fuchsia-400 p-5 text-left transition-all hover:shadow-[0_0_40px_-5px_rgba(217,70,239,0.3)] light:hover:shadow-xl active:scale-95 flex flex-col justify-between overflow-hidden"
            >
                <div className="absolute -top-4 -right-4 w-32 h-32 bg-fuchsia-500/10 rounded-full blur-3xl group-hover:bg-fuchsia-500/20 transition-all duration-700"></div>
                <div className="relative z-10 flex items-center justify-between">
                    <div className="bg-fuchsia-500/20 light:bg-fuchsia-100 w-14 h-14 rounded-2xl flex items-center justify-center text-3xl border border-fuchsia-500/30 light:border-fuchsia-300 group-hover:bg-fuchsia-500 group-hover:text-white transition-all duration-500 light:text-fuchsia-700 shadow-inner">
                        🔮
                    </div>
                    <div className="text-[10px] uppercase font-black tracking-widest text-fuchsia-400 light:text-fuchsia-600 opacity-60 group-hover:opacity-100 transition-opacity">Nexus Prime</div>
                </div>
                <div className="relative z-10">
                    <h3 className="text-2xl font-black text-white light:text-slate-900 group-hover:translate-x-1 transition-transform tracking-tight">Oracle Room</h3>
                    <p className="text-xs text-slate-400 light:text-slate-500 font-bold mt-1 uppercase tracking-wider">Divination Stream</p>
                </div>
            </button >

            {/* System Button */}
            <button
                onClick={() => {
                    if (playSound) playSound('click');
                    setCurrentView('config');
                }}
                onMouseEnter={() => playSound && playSound('hover')}
                className="group relative h-28 rounded-[2rem] bg-gradient-to-br from-slate-600/20 via-slate-900/40 to-slate-900/60 light:from-slate-100/50 light:to-white border border-slate-600/30 light:border-slate-300 hover:border-slate-400 p-5 text-left transition-all hover:shadow-[0_0_40px_-5px_rgba(148,163,184,0.3)] light:hover:shadow-xl active:scale-95 flex flex-col justify-between overflow-hidden"
            >
                <div className="absolute -top-4 -right-4 w-32 h-32 bg-slate-500/10 rounded-full blur-3xl group-hover:bg-slate-500/20 transition-all duration-700"></div>
                <div className="relative z-10 flex items-center justify-between">
                    <div className="bg-slate-700/50 light:bg-slate-200/50 w-14 h-14 rounded-2xl flex items-center justify-center text-3xl border border-white/10 light:border-slate-300 group-hover:bg-slate-700 group-hover:text-white transition-all duration-500 light:text-slate-900 shadow-inner">
                        ⚙️
                    </div>
                    <div className="text-[10px] uppercase font-black tracking-widest text-slate-400 light:text-slate-500 opacity-60 group-hover:opacity-100 transition-opacity">System Core</div>
                </div>
                <div className="relative z-10">
                    <h3 className="text-2xl font-black text-white light:text-slate-900 group-hover:translate-x-1 transition-transform tracking-tight">Configuration</h3>
                    <p className="text-xs text-slate-400 light:text-slate-500 font-bold mt-1 uppercase tracking-wider">Engine Tuning</p>
                </div>
            </button >
        </div >
    );

    const renderVault = () => (
        <div className="h-full overflow-y-auto p-8 space-y-8 custom-scrollbar animate-in fade-in slide-in-from-right-8 duration-300">
            <div className="flex flex-col gap-6">
                <div className="flex items-center justify-between px-2">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => {
                                if (playSound) playSound('click');
                                setCurrentView('menu');
                            }}
                            className="group w-10 h-10 rounded-2xl bg-slate-800/80 light:bg-white text-slate-400 light:text-slate-600 flex items-center justify-center hover:bg-indigo-500 hover:text-white transition-all active:scale-90 border border-white/10 light:border-slate-200 shadow-xl"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5 group-hover:-translate-x-0.5 transition-transform">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                            </svg>
                        </button>
                        <div>
                            <h3 className="text-2xl font-black text-white light:text-slate-900 tracking-tight flex items-center gap-3">
                                <span className="p-2 bg-indigo-500/20 rounded-xl border border-indigo-500/30 text-xl shadow-inner">💾</span> The Vault
                            </h3>
                            <p className="text-[10px] uppercase font-bold text-slate-500 tracking-widest mt-1 ml-1">Archive of Destinies</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <button
                            onClick={onCheckVault}
                            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-500/20 to-orange-500/20 text-amber-400 light:text-amber-700 hover:from-amber-500 hover:to-orange-500 hover:text-white rounded-2xl border border-amber-500/30 transition-all active:scale-95 group shadow-lg shadow-amber-500/10"
                            title="Auto-Check Results"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4 group-hover:rotate-[360deg] transition-transform duration-700">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                            </svg>
                            <span className="text-[10px] font-black uppercase tracking-widest">Verify All</span>
                        </button>
                    </div>
                </div>

                <div className="p-4 rounded-3xl bg-white/5 border border-white/5 text-center shadow-inner">
                    <div className="text-[10px] text-slate-500 uppercase font-black mb-1 tracking-[0.2em]">Total Predictions</div>
                    <div className="text-3xl font-black text-white">{savedPredictions.length}</div>
                </div>
            </div>

            {savedPredictions.length === 0 ? (
                <div className="p-8 rounded-2xl bg-white/[0.02] light:bg-slate-100/50 border border-white/5 light:border-slate-300 border-dashed flex flex-col items-center justify-center text-center space-y-3">
                    <span className="text-4xl opacity-20">📭</span>
                    <p className="text-slate-500 light:text-slate-400 font-medium">The Vault is empty.</p>
                    <p className="text-slate-600 light:text-slate-500 text-sm">Save your lucky numbers to track them here.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-4">
                    {['LOTTO649', 'SUPERLOTTO', '539', 'Poems', 'Other'].map(key => {
                        const items = groupedPredictions[key];
                        if (!items || items.length === 0) return null;

                        const groupInfo = getGroupInfo(key);
                        return (
                            <div key={key} className="bg-slate-800/30 light:bg-white rounded-2xl border border-white/5 light:border-slate-200 overflow-hidden shadow-sm light:shadow-md light:shadow-slate-200/50">
                                {/* Group Header */}
                                <button
                                    onClick={() => toggleGroup(key)}
                                    className="w-full flex items-center justify-between p-4 bg-white/5 light:bg-slate-50/80 hover:bg-white/10 light:hover:bg-slate-100 transition-colors border-b border-light-slate-100"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center border ${groupInfo.color}`}>
                                            {expandedGroups[key] ? '📂' : groupInfo.icon}
                                        </div>
                                        <div className="text-left">
                                            <div className="font-bold text-slate-200 light:text-slate-900">{groupInfo.title}</div>
                                            <div className="text-xs text-slate-500 light:text-slate-500">{items.length} prediction{items.length !== 1 && 's'}</div>
                                        </div>
                                    </div>
                                    <div className={`text-slate-500 transition-transform duration-300 ${expandedGroups[key] ? 'rotate-180' : ''}`}>
                                        ▼
                                    </div>
                                </button>

                                {/* Group Content - Accordion */}
                                <div className={`grid transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${expandedGroups[key] ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
                                    <div className="overflow-hidden">
                                        <div className="p-4 space-y-4 bg-black/20 light:bg-slate-100/30">
                                            {items.map((item) => (
                                                <div key={item.id} className="group relative overflow-hidden p-0 rounded-[1.5rem] bg-slate-900 border border-white/5 hover:border-indigo-500/40 transition-all duration-300 shadow-xl">
                                                    {/* Ticket Header (Stub) */}
                                                    <div className="flex justify-between items-center px-4 py-2 bg-gradient-to-r from-slate-800 to-slate-950 border-b border-white/5 font-mono text-[9px] text-slate-500 uppercase tracking-tighter">
                                                        <span>{new Date(item.date).toLocaleDateString()}</span>
                                                        <span className="text-indigo-400 font-black">Ticket: #{item.id.toString().slice(-6)}</span>
                                                    </div>

                                                    <div className="p-4">
                                                        <div className="flex justify-between items-start mb-4">
                                                            <div className="flex flex-col gap-1">
                                                                <div className="flex items-center gap-2">
                                                                    {item.period && (
                                                                        <span className="text-xs font-black text-indigo-300 uppercase tracking-tighter">
                                                                            P-{item.period}
                                                                        </span>
                                                                    )}
                                                                    {key !== 'Poems' && (
                                                                        <span className="px-2 py-0.5 rounded-full text-[8px] font-black bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 uppercase tracking-widest">
                                                                            {item.type || 'Manual'}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </div>

                                                            <div className="flex gap-2">
                                                                {/* Share Button */}
                                                                <button
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        handleShareClick(item);
                                                                    }}
                                                                    className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-indigo-400 hover:bg-indigo-500/10 rounded-xl border border-white/5 hover:border-indigo-500/30 transition-all active:scale-90"
                                                                    title="Share"
                                                                >
                                                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-3.5 h-3.5">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 103.933-2.185 2.25 2.25 0 00-3.933 2.185z" />
                                                                    </svg>
                                                                </button>

                                                                {/* Delete Button */}
                                                                <button
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        onDeletePrediction(item.id);
                                                                        if (playSound) playSound('delete');
                                                                    }}
                                                                    className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-xl border border-white/5 hover:border-red-500/30 transition-all active:scale-90"
                                                                    title="Delete"
                                                                >
                                                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-3.5 h-3.5">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                                                                    </svg>
                                                                </button>
                                                            </div>
                                                        </div>

                                                        {/* Number Strip */}
                                                        <div className="flex flex-wrap items-center justify-center gap-2 p-3 bg-white/5 rounded-2xl shadow-inner mb-4">
                                                            {Array.isArray(item.numbers) ? (
                                                                item.numbers.map((num, idx) => {
                                                                    const isSpecial = idx === 6;
                                                                    let isMatched = false;
                                                                    if (item.verification?.checked) {
                                                                        if (isSpecial) isMatched = !!item.verification.specialHit;
                                                                        else isMatched = item.verification.hits?.includes(num);
                                                                    }

                                                                    return (
                                                                        <div
                                                                            key={idx}
                                                                            className={`
                                                                                w-9 h-9 flex items-center justify-center rounded-xl text-[11px] font-black transition-all duration-700
                                                                                ${isMatched
                                                                                    ? (isSpecial ? 'bg-orange-500 text-white shadow-[0_0_15px_rgba(249,115,22,0.5)] scale-110 ring-2 ring-orange-300' : 'bg-emerald-500 text-white shadow-[0_0_15px_rgba(16,185,129,0.5)] scale-110 ring-2 ring-emerald-300')
                                                                                    : (isSpecial ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'bg-white/5 text-slate-300 border border-white/5')
                                                                                }
                                                                                shadow-lg
                                                                            `}
                                                                        >
                                                                            {num}
                                                                        </div>
                                                                    );
                                                                })
                                                            ) : (
                                                                <div className="text-amber-300 font-serif text-center italic text-lg leading-tight px-4">{item.numbers}</div>
                                                            )}
                                                        </div>

                                                        {/* Verification Footer */}
                                                        {item.verification?.checked && (
                                                            <div className="flex items-center justify-between mt-2 pt-3 border-t border-white/5">
                                                                <div className="flex items-center gap-2">
                                                                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                                                                    <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">Verified Target</span>
                                                                </div>
                                                                <span className="text-[9px] font-mono text-slate-600">
                                                                    {new Date(item.verification.checkDate).toLocaleDateString()}
                                                                </span>
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* Side Perforations (Visual Only) */}
                                                    <div className="absolute top-1/2 -left-2 w-4 h-4 bg-slate-900 border border-white/5 rounded-full -translate-y-1/2 z-20"></div>
                                                    <div className="absolute top-1/2 -right-2 w-4 h-4 bg-slate-900 border border-white/5 rounded-full -translate-y-1/2 z-20"></div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );

    const renderConfig = () => (
        <div className="h-full overflow-y-auto p-8 space-y-10 custom-scrollbar animate-in fade-in slide-in-from-right-8 duration-500">
            <div className="flex items-center gap-4 px-2">
                <button
                    onClick={() => {
                        if (playSound) playSound('click');
                        setCurrentView('menu');
                    }}
                    className="group w-10 h-10 rounded-2xl bg-slate-800/80 light:bg-white text-slate-400 light:text-slate-600 flex items-center justify-center hover:bg-slate-700 hover:text-white transition-all active:scale-90 border border-white/10 light:border-slate-200 shadow-xl"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5 group-hover:-translate-x-0.5 transition-transform">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                    </svg>
                </button>
                <div>
                    <h3 className="text-2xl font-black text-white light:text-slate-900 tracking-tight flex items-center gap-3">
                        <span className="p-2 bg-slate-500/20 rounded-xl border border-white/10 text-xl shadow-inner">⚙️</span> System Config
                    </h3>
                    <p className="text-[10px] uppercase font-bold text-slate-500 tracking-widest mt-1 ml-1">Kernel Configuration</p>
                </div>
            </div>

            <div className="space-y-6">
                {/* Game Core Settings (New) */}
                {/* Game Core Settings */}
                <div className="bg-slate-900/40 rounded-3xl border border-white/5 p-8 shadow-2xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-3xl group-hover:bg-indigo-500/10 transition-all"></div>
                    <div className="flex items-center gap-3 mb-6 relative z-10">
                        <span className="text-xl">🎲</span>
                        <h4 className="text-slate-200 font-black uppercase tracking-widest text-xs">Game Core Engine</h4>
                    </div>
                    <div className="grid grid-cols-1 gap-3 relative z-10">
                        {gameTypes && Object.values(gameTypes).map(game => (
                            <button
                                key={game.id}
                                onClick={() => {
                                    if (playSound) playSound('click');
                                    onSwitchGame(game.id);
                                }}
                                className={`group/btn w-full flex items-center justify-between p-4 rounded-2xl border transition-all duration-300 ${activeGameID === game.id
                                    ? `bg-${game.theme.primary}-500/10 border-${game.theme.primary}-500/40 shadow-lg shadow-${game.theme.primary}-500/5`
                                    : 'bg-white/5 border-white/5 hover:bg-white/10 hover:border-white/10'
                                    }`}
                            >
                                <div className="flex items-center gap-4">
                                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl transition-all duration-500 ${activeGameID === game.id ? `bg-${game.theme.primary}-500 text-white shadow-lg shadow-${game.theme.primary}-500/40 rotate-12` : 'bg-slate-800 text-slate-500'
                                        }`}>
                                        {game.id === 'LOTTO649' ? '🎱' : (game.id === '539' ? '🌈' : '⚡')}
                                    </div>
                                    <div className="text-left">
                                        <div className={`text-base font-black tracking-tight ${activeGameID === game.id ? 'text-white' : 'text-slate-500'}`}>
                                            {game.name}
                                        </div>
                                        <div className="text-[9px] text-slate-500 font-black uppercase tracking-widest mt-0.5">
                                            {game.settings.maxNumber} Balls • Pick {game.settings.pickCount}
                                        </div>
                                    </div>
                                </div>
                                {activeGameID === game.id && (
                                    <div className={`w-2 h-2 rounded-full bg-${game.theme.accent}-500 animate-pulse shadow-[0_0_10px] shadow-${game.theme.accent}-500`}></div>
                                )}
                            </button>
                        ))}
                    </div>
                </div>
                {/* Interface Settings */}
                <div className="bg-slate-900/40 rounded-3xl border border-white/5 p-8 shadow-2xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-sky-500/5 rounded-full blur-3xl group-hover:bg-sky-500/10 transition-all"></div>
                    <div className="flex items-center gap-3 mb-6 relative z-10">
                        <span className="text-xl">🎨</span>
                        <h4 className="text-slate-200 font-black uppercase tracking-widest text-xs">Aesthetic Layer</h4>
                    </div>
                    <div className="space-y-4 relative z-10">
                        {/* Toggle Item */}
                        {[
                            { id: 'highContrast', label: 'High Contrast', sub: 'Increase element visibility' },
                            { id: 'reducedMotion', label: 'Reduced Motion', sub: 'Disable complex physics' },
                            { id: 'autoSave', label: 'Quantum Sync', sub: 'Instant local persistence' }
                        ].map((item) => (
                            <div key={item.id} className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5 hover:border-white/10 transition-colors">
                                <div className="flex flex-col">
                                    <span className="text-sm text-white font-black tracking-tight">{item.label}</span>
                                    <span className="text-[10px] text-slate-500 font-black uppercase tracking-tighter">{item.sub}</span>
                                </div>
                                <button
                                    onClick={() => {
                                        if (playSound) playSound('click');
                                        onUpdateSettings(s => ({ ...s, [item.id]: !s[item.id] }));
                                    }}
                                    className={`w-14 h-7 rounded-full relative transition-all duration-500 shadow-inner ${systemSettings[item.id] ? 'bg-indigo-500 shadow-indigo-500/20' : 'bg-slate-800'}`}
                                >
                                    <div className={`absolute top-1 w-5 h-5 rounded-full bg-white shadow-lg transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${systemSettings[item.id] ? 'left-8' : 'left-1'}`}></div>
                                </button>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Immersion Settings */}
                <div className="bg-slate-900/40 rounded-3xl border border-white/5 p-8 shadow-2xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-fuchsia-500/5 rounded-full blur-3xl group-hover:bg-fuchsia-500/10 transition-all"></div>
                    <div className="flex items-center gap-3 mb-6 relative z-10">
                        <span className="text-xl">🎧</span>
                        <h4 className="text-slate-200 font-black uppercase tracking-widest text-xs">Sensory Immersion</h4>
                    </div>
                    <div className="space-y-4 relative z-10">
                        {/* Toggle Item */}
                        {[
                            { id: 'soundEnabled', label: 'Sonic Feedback', sub: 'High-fidelity audio spatialization' },
                            { id: 'hapticEnabled', label: 'Kinetic Engine', sub: 'Haptic feedback on interaction' },
                        ].map((item) => (
                            <div key={item.id} className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5 hover:border-white/10 transition-colors">
                                <div className="flex flex-col">
                                    <span className="text-sm text-white font-black tracking-tight">{item.label}</span>
                                    <span className="text-[10px] text-slate-500 font-black uppercase tracking-tighter">{item.sub}</span>
                                </div>
                                <button
                                    onClick={() => {
                                        if (playSound) playSound('click');
                                        onUpdateSettings(s => ({ ...s, [item.id]: !s[item.id] }));
                                    }}
                                    className={`w-14 h-7 rounded-full relative transition-all duration-500 shadow-inner ${systemSettings[item.id] ? 'bg-fuchsia-500 shadow-fuchsia-500/20' : 'bg-slate-800'}`}
                                >
                                    <div className={`absolute top-1 w-5 h-5 rounded-full bg-white shadow-lg transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${systemSettings[item.id] ? 'left-8' : 'left-1'}`}></div>
                                </button>
                            </div>
                        ))}

                        {/* Slider Item */}
                        <div className="flex flex-col p-5 bg-white/5 rounded-2xl border border-white/5 space-y-4">
                            <div className="flex justify-between items-center">
                                <div className="flex flex-col">
                                    <span className="text-sm text-white font-black tracking-tight">Reality Distortion</span>
                                    <span className="text-[10px] text-slate-500 font-black uppercase tracking-tighter">Visual anomaly scaling</span>
                                </div>
                                <span className="text-xs font-black text-fuchsia-400 font-mono bg-fuchsia-500/10 px-2 py-1 rounded-lg border border-fuchsia-500/20">{systemSettings.realityDistortion}%</span>
                            </div>
                            <input
                                type="range"
                                min="0"
                                max="100"
                                value={systemSettings.realityDistortion}
                                onChange={(e) => onUpdateSettings(s => ({ ...s, realityDistortion: parseInt(e.target.value) }))}
                                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-fuchsia-500"
                            />
                        </div>
                    </div>
                </div>

                {/* Data Center */}
                <div className="bg-slate-900/40 rounded-3xl border border-white/5 p-8 shadow-2xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-3xl group-hover:bg-emerald-500/10 transition-all"></div>
                    <div className="flex items-center gap-3 mb-6 relative z-10">
                        <span className="text-xl">💾</span>
                        <h4 className="text-slate-200 font-black uppercase tracking-widest text-xs">Secure Data Node</h4>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-6 relative z-10">
                        <button
                            onClick={handleExport}
                            className="group/item flex flex-col items-center justify-center p-6 bg-indigo-500/5 border border-indigo-500/20 rounded-2xl hover:bg-indigo-500 hover:text-white transition-all active:scale-95 shadow-lg shadow-indigo-500/5"
                        >
                            <span className="text-3xl mb-2 group-hover/item:-translate-y-1 transition-transform">📤</span>
                            <span className="text-[10px] font-black uppercase tracking-widest">Archive Vault</span>
                        </button>

                        <button
                            onClick={() => {
                                if (verifyAccess()) {
                                    fileInputRef.current.click();
                                }
                            }}
                            className="group/item flex flex-col items-center justify-center p-6 bg-emerald-500/5 border border-emerald-500/20 rounded-2xl hover:bg-emerald-500 hover:text-white transition-all active:scale-95 shadow-lg shadow-emerald-500/5"
                        >
                            <span className="text-3xl mb-2 group-hover/item:translate-y-1 transition-transform">📥</span>
                            <span className="text-[10px] font-black uppercase tracking-widest">Restore Link</span>
                            <input
                                ref={fileInputRef}
                                type="file"
                                className="hidden"
                                accept=".json"
                                onChange={handleFileUpload}
                            />
                        </button>
                    </div>

                    <div className="p-6 rounded-2xl bg-red-500/5 border border-red-500/20 relative z-10">
                        <div className="flex items-center gap-2 mb-2">
                            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
                            <h5 className="text-red-400 font-black uppercase tracking-widest text-[10px]">Critical Termination</h5>
                        </div>
                        <p className="text-[10px] text-slate-500 font-bold mb-4">Complete erasure of all stored synaptic records.</p>
                        <button
                            onClick={() => {
                                if (playSound) playSound('error');
                                if (verifyAccess()) {
                                    onClearVault();
                                }
                            }}
                            className="w-full py-3 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white text-[10px] font-black rounded-xl border border-red-500/30 transition-all uppercase tracking-widest shadow-lg shadow-red-500/5"
                        >
                            Execute Purge
                        </button>
                    </div>
                </div>

                {/* Diagnostics */}
                {/* Database Metrics - New Detailed Stats */}
                {/* Diagnostics & Metrics */}
                <div className="bg-slate-900/40 rounded-3xl border border-white/5 p-8 shadow-2xl relative overflow-hidden group">
                    <div className="flex items-center gap-3 mb-6 relative z-10">
                        <span className="text-xl">📊</span>
                        <h4 className="text-slate-200 font-black uppercase tracking-widest text-xs">System Telemetry</h4>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-6 relative z-10">
                        <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5">
                            <div className="text-[8px] text-slate-500 uppercase font-black tracking-widest mb-1">Database Entropy</div>
                            <div className="text-lg font-black text-indigo-400">{(historyData.reduce((acc, curr) => acc + (curr.numbers?.length || 0), 0)).toLocaleString()} pts</div>
                        </div>
                        <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5">
                            <div className="text-[8px] text-slate-500 uppercase font-black tracking-widest mb-1">Kernel Status</div>
                            <div className="text-lg font-black text-emerald-400">Stable v2.5</div>
                        </div>
                    </div>

                    <div className="space-y-3 font-mono text-[9px] text-slate-500 font-bold relative z-10">
                        <div className="flex justify-between border-b border-white/5 pb-2">
                            <span className="uppercase tracking-tighter text-[8px]">Temporal Range</span>
                            <span className="text-slate-300">
                                {historyData.length > 0 ? `${new Date(historyData[historyData.length - 1].date).getFullYear()} – ${new Date(historyData[0].date).getFullYear()}` : 'N/A'}
                            </span>
                        </div>
                        <div className="flex justify-between border-b border-white/5 pb-2">
                            <span className="uppercase tracking-tighter text-[8px]">Vault Payload</span>
                            <span className="text-slate-300">{(JSON.stringify(savedPredictions).length / 1024).toFixed(2)} KB</span>
                        </div>
                        <div className="flex justify-between border-b border-white/5 pb-2">
                            <span className="uppercase tracking-tighter text-[8px]">Entropy Leakage</span>
                            <span className="text-emerald-500">0.00% [Nominal]</span>
                        </div>
                    </div>
                </div>

                {/* Developer Activity Log */}
                <div className="bg-slate-900/40 rounded-3xl border border-white/5 p-8 shadow-2xl relative overflow-hidden group">
                    <div className="flex items-center gap-3 mb-6 relative z-10">
                        <span className="text-xl">📜</span>
                        <h4 className="text-slate-200 font-black uppercase tracking-widest text-xs">Acknowledge Log</h4>
                    </div>
                    <div className="space-y-6 font-mono text-[9px] text-slate-400 font-bold h-64 overflow-y-scroll custom-sidebar-scrollbar pr-6 relative z-10 transition-all scroll-smooth">

                        {/* 2026-01-20 (Today) */}
                        <div className="relative pl-6 border-l border-white/20">
                            <div className="absolute top-0 -left-[5px] w-2.5 h-2.5 rounded-full bg-white/20"></div>
                            <div className="text-[10px] font-black text-slate-200 uppercase mb-2">Jan 20, 2026 [Slot Machine 2.0]</div>
                            <ul className="space-y-2 text-slate-400">
                                <li><strong>5-Reel Casino Engine</strong>: Upgraded Slot Machine with Left-to-Right win logic, Wilds, and Tiered Win Effects (Money Rain).</li>
                                <li><strong>Infinite Economy</strong>: Implemented BigInt support for quadrillion-dollar bets and 100% precision.</li>
                                <li><strong>Physics Stability</strong>: Fixed critical Double Pendulum layout thrashing in Chaos Lab.</li>
                                <li><strong>UX Refinements</strong>: Added "Wide Mode" inputs for high-rollers and persistent Net Win display.</li>
                            </ul>
                        </div>

                        {/* 2026-01-18 */}
                        <div className="relative pl-6 border-l border-white/20 pt-4">
                            <div className="absolute top-4 -left-1.5 w-3 h-3 rounded-full bg-slate-800 border border-white/20"></div>
                            <div className="text-[10px] font-black text-slate-200 uppercase mb-2">Jan 18, 2026</div>
                            <ul className="space-y-2 text-slate-400">
                                <li><strong>Hybrid Evolution Lab</strong>: Sophisticated testing environment for configuring 5-column strategies.</li>
                                <li><strong>Strategy Config Deck</strong>: Independent tuning for Hot/Cold counts, Trend Depth, and Decays.</li>
                            </ul>
                        </div>

                        {/* 2026-01-17 */}
                        <div className="relative pl-6 border-l border-white/20 pt-4">
                            <div className="absolute top-4 -left-1.5 w-3 h-3 rounded-full bg-slate-800 border border-white/20"></div>
                            <div className="text-[10px] font-black text-slate-200 uppercase mb-2">Jan 17, 2026</div>
                            <ul className="space-y-2 text-slate-400">
                                <li><strong>Backtest Multi-Bet</strong>: Unlocked unlimited batch simulations.</li>
                                <li><strong>Data Persistence</strong>: Auto-save for user draw data (localStorage).</li>
                                <li><strong>Algorithm Tuning</strong>: Recency weighting optimization (1.0 vs 0.5 points).</li>
                            </ul>
                        </div>

                        {/* 2026-01-13 ~ 17 */}
                        <div className="relative pl-6 border-l border-white/20 pt-4">
                            <div className="absolute top-4 -left-1.5 w-3 h-3 rounded-full bg-slate-800 border border-white/20"></div>
                            <div className="text-[10px] font-black text-slate-200 uppercase mb-2">Jan 13-17, 2026 [Oracle Expansion]</div>
                            <ul className="space-y-2 text-slate-400">
                                <li><strong>Four Great Temples</strong>: Integrated Lei Yu Shi, 60 Jia Zi, Penghu, and Guanyin poems.</li>
                                <li><strong>Dynamic Themes</strong>: Unique coloring and metadata for each fortune source.</li>
                            </ul>
                        </div>

                        {/* 2026-01-11 */}
                        <div className="relative pl-6 border-l border-white/20 pt-4">
                            <div className="absolute top-4 -left-1.5 w-3 h-3 rounded-full bg-slate-800 border border-white/20"></div>
                            <div className="text-[10px] font-black text-slate-200 uppercase mb-2">Jan 11, 2026</div>
                            <ul className="space-y-2 text-slate-400">
                                <li><strong>Sonic System</strong>: Web Audio API integration for immersive UI sounds.</li>
                                <li><strong>Two-Stage Drawing</strong>: True RNG + User Selection ritual for fortune telling.</li>
                            </ul>
                        </div>

                        {/* 2026-01-10 */}
                        <div className="relative pl-6 border-l border-white/20 pt-4">
                            <div className="absolute top-4 -left-1.5 w-3 h-3 rounded-full bg-slate-800 border border-white/20"></div>
                            <div className="text-[10px] font-black text-slate-200 uppercase mb-2">Jan 10, 2026</div>
                            <ul className="space-y-2 text-slate-400">
                                <li><strong>Floating Menu (FAB)</strong>: Persistent quick-access toolbelt.</li>
                                <li><strong>Chain Reactor</strong>: Lab for analyzing consecutive number patterns.</li>
                            </ul>
                        </div>

                        {/* 2026-01-09 */}
                        <div className="relative pl-6 border-l border-white/20 pt-4">
                            <div className="absolute top-4 -left-1.5 w-3 h-3 rounded-full bg-slate-800 border border-white/20"></div>
                            <div className="text-[10px] font-black text-slate-200 uppercase mb-2">Jan 09, 2026 [Genesis]</div>
                            <ul className="space-y-2 text-slate-400">
                                <li><strong>Project Launch</strong>: Glassmorphism UI, Weighted Recency Algorithm, and core History/Stats components.</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );

    // --- Share Ticket Logic ---
    const [previewTicket, setPreviewTicket] = React.useState(null); // { numbers, period, date, type }
    const ticketRef = React.useRef(null);
    const [isDownloading, setIsDownloading] = React.useState(false);

    const handleShareClick = (item) => {
        if (playSound) playSound('click');
        setPreviewTicket(item);
    };

    const handleDownloadTicket = async () => {
        if (!ticketRef.current || isDownloading) return;
        setIsDownloading(true);
        if (playSound) playSound('click');

        try {
            // Wait a moment for fonts/styles to settle
            await new Promise(resolve => setTimeout(resolve, 200));

            const canvas = await html2canvas(ticketRef.current, {
                scale: 3, // Higher resolution
                useCORS: true,
                backgroundColor: null, // Keep transparency if needed, or set a solid bg
                logging: false,
                // Critical: Fix layout shifts by forcing the cloned element to a fixed size
                onclone: (clonedDoc) => {
                    const clonedElement = clonedDoc.querySelector('[data-ticket-content]');
                    const gradientText = clonedDoc.querySelector('[data-gradient-text]');

                    if (clonedElement) {
                        // Force specific width to prevent responsive squishing during capture
                        clonedElement.style.width = '350px';
                        clonedElement.style.height = 'auto';
                        clonedElement.style.margin = '0';
                        clonedElement.style.transform = 'none';
                    }

                    // Fix: html2canvas fails with text-transparent + bg-clip, so we fallback to solid color
                    if (gradientText) {
                        gradientText.classList.remove('text-transparent', 'bg-clip-text', 'bg-gradient-to-r');
                        gradientText.style.color = '#818cf8'; // Indigo-400 fallback
                    }
                }
            });

            const image = canvas.toDataURL("image/png");

            const link = document.createElement('a');
            link.href = image;
            link.download = `Lottery_Ticket_${previewTicket.period || 'Prediction'}_${previewTicket.id}.png`;
            link.click();

            if (playSound) playSound('success');
            setPreviewTicket(null);
        } catch (err) {
            console.error(err);
            alert("Failed to generate ticket image.");
            if (playSound) playSound('error');
        } finally {
            setIsDownloading(false);
        }
    };

    const renderTicketPreview = () => {
        if (!previewTicket) return null;

        const isSpecialType = ['Hybrid', 'AI-Weighted'].includes(previewTicket.type);

        return (
            <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-300">
                <div className="flex flex-col gap-6 max-w-sm w-full relative">

                    {/* Close Button */}
                    <button
                        onClick={() => setPreviewTicket(null)}
                        className="absolute -top-12 right-0 text-white/50 hover:text-white transition-colors"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-8 h-8">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>

                    {/* The Ticket (What will be captured) */}
                    <div
                        ref={ticketRef}
                        data-ticket-content
                        className="bg-slate-900 light:bg-white rounded-3xl overflow-hidden border border-amber-500/30 light:border-amber-400 shadow-2xl relative"
                    >
                        {/* Decorative Header */}
                        <div className="h-24 bg-gradient-to-r from-amber-600 via-orange-500 to-amber-600 p-6 flex flex-col items-center justify-center relative overflow-hidden">
                            {/* Pattern */}
                            <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white via-transparent to-transparent scale-150"></div>

                            <h2 className="text-3xl font-black text-white tracking-[0.2em] uppercase drop-shadow-md font-serif">Lottery Lab</h2>
                            <div className="flex items-center gap-2 mt-2">
                                <span className="text-[10px] text-amber-100 font-bold tracking-widest uppercase opacity-80">
                                    {previewTicket.period ? `No. ${previewTicket.period}` : new Date().getFullYear()}
                                </span>
                            </div>
                        </div>

                        {/* Ticket Body */}
                        <div className="p-8 flex flex-col items-center gap-6 bg-slate-900 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')]">

                            <div className="flex flex-col items-center gap-1">
                                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.3em]">Prediction</span>
                                <span
                                    data-gradient-text
                                    className="text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-indigo-300 via-indigo-100 to-indigo-300 tracking-wider font-serif italic"
                                >
                                    {previewTicket.type || 'Standard'}
                                </span>
                            </div>

                            {/* Numbers Display - Text Only Layout */}
                            <div className="grid grid-cols-3 gap-y-6 gap-x-10 justify-items-center my-2">
                                {previewTicket.numbers.map((num, idx) => {
                                    const isSpecial = idx === 6;
                                    if (isSpecial) return null;
                                    return (
                                        <div
                                            key={idx}
                                            className="text-4xl font-black text-white drop-shadow-2xl font-mono tracking-tighter"
                                        >
                                            {num}
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Special Number */}
                            {previewTicket.numbers[6] && (
                                <div className="flex flex-col items-center mt-2">
                                    <div className="text-[9px] uppercase font-bold text-red-400 tracking-[0.2em] mb-1">Special</div>
                                    <div className="text-5xl font-black text-red-500 drop-shadow-[0_0_15px_rgba(239,68,68,0.5)] font-mono tracking-tighter">
                                        {previewTicket.numbers[6]}
                                    </div>
                                </div>
                            )}

                            <div className="w-full flex items-center gap-4 opacity-30 mt-2">
                                <div className="h-px bg-white flex-1"></div>
                                <div className="text-white text-[10px]">☘</div>
                                <div className="h-px bg-white flex-1"></div>
                            </div>

                            <div className="flex justify-between w-full text-[10px] text-slate-500 font-mono tracking-wider">
                                <span>{new Date(previewTicket.date).toLocaleDateString()}</span>
                                <span>#{previewTicket.id.toString().slice(-4)}</span>
                            </div>
                        </div>
                    </div>

                    {/* Action Button */}
                    <button
                        onClick={handleDownloadTicket}
                        disabled={isDownloading}
                        className="w-full py-4 bg-emerald-500 hover:bg-emerald-400 text-white font-bold rounded-2xl shadow-lg shadow-emerald-500/20 text-lg flex items-center justify-center gap-3 active:scale-95 transition-all"
                    >
                        {isDownloading ? (
                            <span>Generating...</span>
                        ) : (
                            <>
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M12 12.75l-3-3m0 0l3-3m-3 3h7.5" />
                                </svg>
                                Save Ticket
                            </>
                        )}
                    </button>
                    <p className="text-center text-xs text-white/40">Previewing ticket before download</p>
                </div>
            </div>
        );
    };

    return createPortal(
        <div className={isLightMode ? 'light-theme' : ''}>
            {/* Backdrop Overlay */}
            <div
                className={`fixed inset-0 bg-black/60 backdrop-blur-sm z-[990] transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
                onClick={onClose}
            />

            {/* Sidebar Panel */}
            <div
                className={`
                    fixed top-0 left-0 h-full w-full md:w-[600px] bg-slate-950/90 light:bg-white/95 backdrop-blur-3xl border-r border-white/10 light:border-slate-300 shadow-[0_0_100px_rgba(0,0,0,0.5)] z-[999] 
                    transform transition-transform duration-700 ease-[cubic-bezier(0.23,1,0.32,1)]
                    ${isOpen ? 'translate-x-0' : '-translate-x-full'}
                `}
            >
                {/* Decorative Side Glow */}
                <div className="absolute top-0 right-0 w-[2px] h-full bg-gradient-to-b from-transparent via-indigo-500/50 to-transparent"></div>

                {/* Header */}
                <div className="h-28 flex items-center justify-between px-10 border-b border-white/5 light:border-slate-200 bg-white/[0.02] light:bg-slate-50 relative overflow-hidden">
                    {/* Animated Background Pulse */}
                    <div className="absolute top-0 left-0 w-full h-full opacity-10">
                        <div className="absolute top-1/2 left-1/4 w-96 h-96 bg-indigo-500 rounded-full blur-[100px] animate-pulse"></div>
                    </div>

                    <div className="relative z-10">
                        <div className="flex items-center gap-3">
                            <h2 className="text-4xl font-black italic tracking-tighter text-transparent bg-clip-text bg-gradient-to-br from-white via-slate-300 to-slate-500 light:from-slate-900 light:to-slate-600">
                                COMMAND
                            </h2>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
                            <p className="text-slate-500 light:text-slate-500 text-[10px] font-black uppercase tracking-[0.2em]">
                                {currentView === 'menu' ? 'System Services Active' :
                                    currentView === 'vault' ? 'Secure Archive Decrypted' :
                                        currentView === 'config' ? 'Kernel Access Granted' :
                                            currentView === 'oracle' ? 'Divination Link Stable' : ''}
                            </p>
                        </div>
                    </div>

                    <button
                        onClick={onClose}
                        className="group relative w-12 h-12 flex items-center justify-center rounded-2xl bg-white/5 light:bg-slate-100 text-slate-400 light:text-slate-500 hover:text-white light:hover:text-slate-900 transition-all duration-300 overflow-hidden border border-white/5 hover:border-white/20 active:scale-90"
                    >
                        <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5 relative z-10 group-hover:rotate-90 transition-transform duration-500">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Main Content Area Switcher */}
                <div className="h-[calc(100vh-7rem)] relative">
                    {currentView === 'menu' && renderMenu()}
                    {currentView === 'vault' && renderVault()}
                    {currentView === 'config' && renderConfig()}
                    {currentView === 'oracle' && renderOracle()}
                </div>
            </div>

            {/* Modals */}
            {renderTicketPreview()}

        </div>,
        document.body
    );
};

export default Sidebar;
