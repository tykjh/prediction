import React, { Suspense, lazy, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import NumberBall from './NumberBall';
import GamePicker from './GamePicker';
import { useLanguage } from '../i18n/LanguageContext';
import { GAME_TYPES } from '../config/games';
import { THEMES } from '../config/themes';
import { summarizeByMethod, PRIZE_NONE } from '../utils/prize';
import { formatNumber } from '../utils/drawSchedule';
import { LIMITS } from '../utils/sanitize';

const DivinationRoom = lazy(() => import('./DivinationRoom'));

const POEM_TYPES = ['雷雨師', '六十甲子籤', '澎湖天后宮一百籤', '觀音一百籤', '東京淺草觀音寺'];
const GROUP_ORDER = ['LOTTO649', 'SUPERLOTTO', '539', 'poems'];
const CHANGELOG_IDS = ['nov17', 'aug07', 'aug04', 'aug02', 'jul30', 'jan25_feb06', 'jan20', 'jan18', 'jan17', 'jan13_17', 'jan11', 'jan10', 'jan09'];

const card = 'rounded-2xl border border-white/10 bg-white/[0.04] light:border-stone-200 light:bg-white';
const sectionTitle = 'text-sm font-semibold text-stone-100 light:text-stone-900';
const ghostButton = 'rounded-lg border border-white/10 px-3 py-2 text-sm text-stone-200 transition-colors hover:bg-white/10 light:border-stone-200 light:text-stone-700 light:hover:bg-stone-100';

const isPoem = (item) =>
    !Array.isArray(item.numbers) || POEM_TYPES.includes(item.type) || item.type?.includes('Fortune') || item.type?.includes('Poem');

const Toggle = ({ label, sub, checked, onChange }) => (
    <label className="flex cursor-pointer items-center justify-between gap-4 py-3">
        <span>
            <span className="block text-sm text-stone-100 light:text-stone-900">{label}</span>
            {sub && <span className="block text-xs text-stone-400 light:text-stone-500">{sub}</span>}
        </span>
        <button
            type="button"
            role="switch"
            aria-checked={checked}
            onClick={onChange}
            className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${checked ? 'bg-amber-500' : 'bg-white/15 light:bg-stone-300'}`}
        >
            <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${checked ? 'left-[22px]' : 'left-0.5'}`} />
        </button>
    </label>
);

const Sidebar = ({
    isOpen,
    onClose,
    savedPredictions = [],
    onSavePrediction,
    onDeletePrediction,
    onClearVault,
    onImportVault,
    onCheckVault,
    systemSettings,
    onUpdateSettings,
    playSound,
    historyData = [],
    isLightMode,
    onToggleLightMode,
    bgTheme = 0,
    onSetTheme,
    activeGameID,
    onSwitchGame,
    onOpenManual,
    onQuickPick,
    onNextTheme,
    onMoneyRain,
    notify,
}) => {
    const { t, lang, toggleLang } = useLanguage();
    const [view, setView] = useState('menu'); // menu | vault | oracle | settings
    const [collapsed, setCollapsed] = useState({});
    const [previewTicket, setPreviewTicket] = useState(null);
    const [isDownloading, setIsDownloading] = useState(false);
    const colon = lang === 'zh' ? '：' : ': ';
    const fileInputRef = useRef(null);
    const ticketRef = useRef(null);

    useEffect(() => {
        if (isOpen) setView('menu');
    }, [isOpen]);

    // Keep the page behind the panel from scrolling while it is open.
    useEffect(() => {
        if (!isOpen) return undefined;
        const previous = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = previous;
        };
    }, [isOpen]);

    useEffect(() => {
        if (!isOpen) return undefined;
        const onKey = (e) => {
            if (e.key === 'Escape') onClose();
        };
        document.addEventListener('keydown', onKey);
        return () => document.removeEventListener('keydown', onKey);
    }, [isOpen, onClose]);

    const click = () => playSound && playSound('click');

    const methodLabel = (type) => {
        if (!type) return t('shell.method.Manual');
        const key = `shell.method.${type}`;
        const text = t(key);
        return text === key ? type : text;
    };

    const groups = useMemo(() => {
        const result = { LOTTO649: [], SUPERLOTTO: [], 539: [], poems: [] };
        savedPredictions.forEach((item) => {
            if (isPoem(item)) result.poems.push(item);
            else (result[item.gameID] || result.LOTTO649).push(item);
        });
        return result;
    }, [savedPredictions]);

    const scoreboard = useMemo(() => summarizeByMethod(savedPredictions), [savedPredictions]);

    // ---------- Backup ----------

    const handleExport = () => {
        const blob = new Blob([JSON.stringify(savedPredictions, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `lottery_backup_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(url);
        if (playSound) playSound('success');
    };

    const handleFileUpload = (event) => {
        const file = event.target.files[0];
        event.target.value = '';
        if (!file) return;
        if (file.size > LIMITS.maxImportBytes) {
            notify(t('shell.settings.importInvalid'));
            if (playSound) playSound('error');
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                onImportVault(JSON.parse(e.target.result));
            } catch {
                notify(t('shell.settings.importInvalid'));
                if (playSound) playSound('error');
            }
        };
        reader.readAsText(file);
    };

    const handleClear = () => {
        if (savedPredictions.length === 0) return;
        if (window.confirm(t('shell.settings.clearConfirm', { n: savedPredictions.length }))) {
            onClearVault();
            if (playSound) playSound('delete');
        }
    };

    // ---------- Ticket image ----------

    const handleDownloadTicket = async () => {
        if (!ticketRef.current || isDownloading) return;
        setIsDownloading(true);
        try {
            const { default: html2canvas } = await import('html2canvas');
            const canvas = await html2canvas(ticketRef.current, { scale: 3, backgroundColor: '#fbf8f2', logging: false });
            const link = document.createElement('a');
            link.href = canvas.toDataURL('image/png');
            link.download = `lottery_${previewTicket.period || 'pick'}_${previewTicket.id}.png`;
            link.click();
            if (playSound) playSound('success');
            setPreviewTicket(null);
        } catch (err) {
            console.error(err);
            notify(t('shell.vault.ticketFailed'));
        } finally {
            setIsDownloading(false);
        }
    };

    // ---------- Pieces ----------

    const renderTicket = (item, gameID) => {
        const config = GAME_TYPES[gameID];
        const pickCount = config ? config.settings.pickCount : item.numbers.length;
        const v = item.verification?.checked ? item.verification : null;
        const matched = Array.isArray(v?.matchedNumbers) ? v.matchedNumbers : [];
        const won = v?.prizeKey && v.prizeKey !== PRIZE_NONE;

        // Lotto 6/49: the special number can match one of the ticket's own numbers.
        const drawnSpecialInPool = v?.specialHit && gameID === 'LOTTO649' && Array.isArray(v.drawNumbers)
            ? v.drawNumbers[pickCount]
            : null;
        const drawnText = Array.isArray(v?.drawNumbers)
            ? [
                v.drawNumbers.slice(0, pickCount).map(formatNumber).join(' '),
                v.drawNumbers[pickCount] !== undefined ? formatNumber(v.drawNumbers[pickCount]) : '',
            ].filter(Boolean).join(' ＋ ')
            : '';

        let resultText = t('shell.vault.waiting');
        if (v) {
            if (v.zoneTwoOnly) {
                resultText = v.specialHit ? t('shell.vault.zoneTwoHit') : t('shell.vault.zoneTwoMiss');
            } else {
                const hitText = t('shell.vault.hits', { n: typeof v.hits === 'number' ? v.hits : matched.length });
                const special = v.specialHit ? ` ${t('shell.vault.specialHit')}` : '';
                const prize = v.prizeKey ? t(`shell.prize.${v.prizeKey}`) : '';
                resultText = [`${hitText}${special}`, prize].filter(Boolean).join(' · ');
            }
        }

        return (
            <li key={item.id} className="rounded-xl border border-white/10 p-3 light:border-stone-200">
                <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 text-xs text-stone-400 light:text-stone-500">
                        <span className="font-medium text-stone-200 light:text-stone-800">{methodLabel(item.type)}</span>
                        {item.period && <span> · {t('shell.vault.period', { period: item.period })}</span>}
                    </div>
                    <div className="flex shrink-0 gap-1">
                        <button
                            onClick={() => { click(); setPreviewTicket({ ...item, gameID }); }}
                            className="rounded-md px-2 py-1 text-xs text-stone-400 hover:bg-white/10 hover:text-stone-100 light:hover:bg-stone-100 light:hover:text-stone-900"
                        >
                            {t('shell.vault.share')}
                        </button>
                        <button
                            onClick={() => {
                                if (!window.confirm(t('shell.vault.deleteConfirm'))) return;
                                onDeletePrediction(item.id);
                                if (playSound) playSound('delete');
                            }}
                            className="rounded-md px-2 py-1 text-xs text-stone-400 hover:bg-rose-500/15 hover:text-rose-300 light:hover:text-rose-600"
                        >
                            {t('shell.vault.delete')}
                        </button>
                    </div>
                </div>

                <div className="mt-2.5 flex flex-wrap gap-1.5">
                    {item.numbers.map((num, idx) => {
                        let tone = 'plain';
                        if (v?.zoneTwoOnly) tone = v.specialHit ? 'hit' : 'muted';
                        else if (idx >= pickCount) tone = v ? (v.specialHit ? 'hit' : 'muted') : 'special';
                        else if (v) tone = matched.includes(num) ? 'hit' : (drawnSpecialInPool === num ? 'special' : 'muted');
                        return <NumberBall key={`${idx}-${num}`} value={num} tone={tone} />;
                    })}
                </div>

                <p className={`mt-2.5 text-xs ${won ? 'font-semibold text-emerald-400 light:text-emerald-600' : 'text-stone-400 light:text-stone-500'}`}>
                    {resultText}
                </p>
                {drawnText && (
                    <p className="mt-1 text-xs tabular-nums text-stone-500">
                        {t('shell.vault.drawn')}{colon}{drawnText}
                    </p>
                )}
            </li>
        );
    };

    const renderPoem = (item) => (
        <li key={item.id} className="rounded-xl border border-white/10 p-3 light:border-stone-200">
            <div className="flex items-start justify-between gap-3">
                <span className="text-xs font-medium text-stone-200 light:text-stone-800">{item.type}</span>
                <button
                    onClick={() => {
                        if (!window.confirm(t('shell.vault.deleteConfirm'))) return;
                        onDeletePrediction(item.id);
                        if (playSound) playSound('delete');
                    }}
                    className="rounded-md px-2 py-1 text-xs text-stone-400 hover:bg-rose-500/15 hover:text-rose-300 light:hover:text-rose-600"
                >
                    {t('shell.vault.delete')}
                </button>
            </div>
            <p className="mt-2 whitespace-pre-line font-serif text-sm leading-relaxed text-stone-200 light:text-stone-700">
                {Array.isArray(item.numbers) ? item.numbers.join(' ') : item.numbers}
            </p>
        </li>
    );

    const renderMenu = () => {
        const rows = [
            { id: 'vault', icon: '🔖', title: t('shell.mine.vault'), sub: t('shell.mine.vaultSub', { n: savedPredictions.length }) },
            { id: 'oracle', icon: '🎋', title: t('shell.mine.oracle'), sub: t('shell.mine.oracleSub') },
            { id: 'settings', icon: '⚙️', title: t('shell.mine.settings'), sub: t('shell.mine.settingsSub') },
        ];
        return (
            <div className="space-y-3 p-4 sm:p-6">
                {rows.map((row) => (
                    <button
                        key={row.id}
                        onClick={() => { click(); setView(row.id); }}
                        className={`${card} flex w-full items-center gap-4 p-4 text-left transition-colors hover:bg-white/[0.08] light:hover:bg-stone-50`}
                    >
                        <span className="text-2xl" aria-hidden="true">{row.icon}</span>
                        <span className="min-w-0 grow">
                            <span className="block text-base font-semibold text-stone-100 light:text-stone-900">{row.title}</span>
                            <span className="block text-xs text-stone-400 light:text-stone-500">{row.sub}</span>
                        </span>
                        <span className="text-stone-500" aria-hidden="true">›</span>
                    </button>
                ))}
                <div className="flex flex-wrap gap-2 pt-2">
                    <button onClick={() => { click(); onClose(); onQuickPick(); }} className={ghostButton}>⚡ {t('shell.tools.quickPick')}</button>
                    <button onClick={() => { click(); onNextTheme(); }} className={ghostButton}>🎨 {t('shell.tools.nextTheme')}</button>
                    <button onClick={() => { click(); onClose(); onMoneyRain(); }} className={ghostButton}>💸 {t('shell.tools.moneyRain')}</button>
                    <button onClick={() => { click(); onClose(); onOpenManual(); }} className={ghostButton}>? {t('shell.nav.manual')}</button>
                </div>
            </div>
        );
    };

    const renderVault = () => (
        <div className="space-y-4 p-4 sm:p-6">
            {savedPredictions.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-white/15 p-8 text-center light:border-stone-300">
                    <p className="text-sm font-medium text-stone-200 light:text-stone-800">{t('shell.vault.empty')}</p>
                    <p className="mt-1 text-xs text-stone-400 light:text-stone-500">{t('shell.vault.emptyHint')}</p>
                </div>
            ) : (
                <>
                    <button
                        onClick={onCheckVault}
                        title={t('shell.vault.checkAllHint')}
                        className="w-full rounded-xl bg-amber-500 px-4 py-2.5 text-sm font-semibold text-stone-900 transition-colors hover:bg-amber-400"
                    >
                        {t('shell.vault.checkAll')}
                    </button>

                    {scoreboard.length > 0 && (
                        <div className={`${card} p-4`}>
                            <h4 className={sectionTitle}>{t('shell.vault.scoreboard')}</h4>
                            <p className="mt-1 text-xs text-stone-400 light:text-stone-500">{t('shell.vault.scoreboardHint')}</p>
                            <div className="mt-3 overflow-x-auto">
                                <table className="w-full text-left text-xs tabular-nums">
                                    <thead className="text-stone-400 light:text-stone-500">
                                        <tr>
                                            <th className="py-1.5 pr-3 font-medium">{t('shell.vault.colMethod')}</th>
                                            <th className="py-1.5 pr-3 font-medium">{t('shell.vault.colChecked')}</th>
                                            <th className="py-1.5 pr-3 font-medium">{t('shell.vault.colAvg')}</th>
                                            <th className="py-1.5 pr-3 font-medium">{t('shell.vault.colBest')}</th>
                                            <th className="py-1.5 font-medium">{t('shell.vault.colWins')}</th>
                                        </tr>
                                    </thead>
                                    <tbody className="text-stone-200 light:text-stone-800">
                                        {scoreboard.map((row) => (
                                            <tr key={`${row.gameID}-${row.type}`} className="border-t border-white/10 light:border-stone-200">
                                                <td className="py-1.5 pr-3">
                                                    {methodLabel(row.type)}
                                                    <span className="ml-1.5 text-stone-500">{t(`shell.game.${row.gameID}`)}</span>
                                                </td>
                                                <td className="py-1.5 pr-3">{row.checked}</td>
                                                <td className="py-1.5 pr-3">{row.avgHits.toFixed(1)}</td>
                                                <td className="py-1.5 pr-3">{row.bestHits}</td>
                                                <td className="py-1.5">{row.wins}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {GROUP_ORDER.map((key) => {
                        const items = groups[key];
                        if (!items || items.length === 0) return null;
                        const title = key === 'poems' ? t('shell.vault.poems') : t(`shell.game.${key}`);
                        const open = !collapsed[key];
                        return (
                            <div key={key} className={card}>
                                <button
                                    onClick={() => { click(); setCollapsed((prev) => ({ ...prev, [key]: !prev[key] })); }}
                                    aria-expanded={open}
                                    className="flex w-full items-center justify-between p-4 text-left"
                                >
                                    <span className={sectionTitle}>{title}</span>
                                    <span className="text-xs text-stone-400 light:text-stone-500">
                                        {t('shell.vault.count', { n: items.length })} {open ? '▾' : '▸'}
                                    </span>
                                </button>
                                {open && (
                                    <ul className="space-y-2 px-4 pb-4">
                                        {items.map((item) => (key === 'poems' ? renderPoem(item) : renderTicket(item, key)))}
                                    </ul>
                                )}
                            </div>
                        );
                    })}
                </>
            )}
        </div>
    );

    const renderOracle = () => (
        <div className="p-4 sm:p-6">
            <Suspense fallback={<p className="p-6 text-center text-sm text-stone-400">{t('shell.loading')}</p>}>
                <div className="overflow-hidden rounded-2xl border border-white/10 light:border-stone-200">
                    <DivinationRoom
                        playSound={playSound}
                        embedded={true}
                        onSave={onSavePrediction}
                        isLightMode={isLightMode}
                        reducedMotion={systemSettings.reducedMotion}
                    />
                </div>
            </Suspense>
        </div>
    );

    const renderChangelog = () => (
        <ul className="max-h-64 space-y-4 overflow-y-auto pr-2 text-xs leading-relaxed text-stone-400 light:text-stone-600">
            {CHANGELOG_IDS.map((id) => {
                const dateKey = `sidebar.changelog.${id}.date`;
                const date = t(dateKey);
                if (date === dateKey) return null;
                const lines = [];
                for (let i = 1; i <= 8; i += 1) {
                    const labelKey = `sidebar.changelog.${id}.item${i}Label`;
                    const label = t(labelKey);
                    if (label === labelKey) break;
                    lines.push({ label, desc: t(`sidebar.changelog.${id}.item${i}Desc`) });
                }
                return (
                    <li key={id}>
                        <p className="font-semibold text-stone-200 light:text-stone-800">{date}</p>
                        <ul className="mt-1 space-y-1">
                            {lines.map((line) => (
                                <li key={line.label}>
                                    <span className="text-stone-300 light:text-stone-700">{line.label}</span>{colon}{line.desc}
                                </li>
                            ))}
                        </ul>
                    </li>
                );
            })}
        </ul>
    );

    const renderSettings = () => {
        const toggleSetting = (id) => {
            click();
            onUpdateSettings((s) => ({ ...s, [id]: !s[id] }));
        };
        const oldest = historyData[historyData.length - 1];
        const newest = historyData[0];
        const config = GAME_TYPES[activeGameID];

        return (
            <div className="space-y-4 p-4 sm:p-6">
                <div className={`${card} p-4`}>
                    <h4 className={sectionTitle}>{t('shell.settings.game')}</h4>
                    <GamePicker activeGameID={activeGameID} onSwitchGame={(id) => { click(); onSwitchGame(id); }} className="mt-3" />
                    <p className="mt-2 text-xs text-stone-400 light:text-stone-500">
                        {t('shell.settings.gameInfo', { max: config.settings.maxNumber, pick: config.settings.pickCount })}
                    </p>
                </div>

                <div className={`${card} px-4 py-2`}>
                    <h4 className={`${sectionTitle} pt-2`}>{t('shell.settings.display')}</h4>
                    <div className="divide-y divide-white/10 light:divide-stone-200">
                        <Toggle label={t('shell.settings.lightMode')} sub={t('shell.settings.lightModeSub')} checked={isLightMode} onChange={() => { click(); onToggleLightMode(); }} />
                        <Toggle label={t('shell.settings.highContrast')} sub={t('shell.settings.highContrastSub')} checked={systemSettings.highContrast} onChange={() => toggleSetting('highContrast')} />
                        <Toggle label={t('shell.settings.reducedMotion')} sub={t('shell.settings.reducedMotionSub')} checked={systemSettings.reducedMotion} onChange={() => toggleSetting('reducedMotion')} />
                        <div className="py-3">
                            <span className="block text-sm text-stone-100 light:text-stone-900">{t('shell.settings.background')}</span>
                            <div className="mt-2 flex flex-wrap gap-2">
                                {THEMES.map((theme, index) => (
                                    <button
                                        key={theme.id}
                                        onClick={() => { click(); onSetTheme(index); }}
                                        aria-pressed={bgTheme === index}
                                        className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition-colors ${bgTheme === index
                                            ? 'border-amber-500 text-stone-50 light:text-stone-900'
                                            : 'border-white/10 text-stone-400 hover:text-stone-100 light:border-stone-200 light:text-stone-500 light:hover:text-stone-900'
                                            }`}
                                    >
                                        <span className="h-3 w-3 rounded-full" style={{ backgroundColor: theme.swatch }} />
                                        {t(`shell.theme.${theme.id}`)}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div className="flex items-center justify-between py-3">
                            <span className="text-sm text-stone-100 light:text-stone-900">{t('shell.settings.language')}</span>
                            <button onClick={() => { click(); toggleLang(); }} className={ghostButton}>
                                {lang === 'zh' ? '繁體中文 → English' : 'English → 繁體中文'}
                            </button>
                        </div>
                    </div>
                </div>

                <div className={`${card} px-4 py-2`}>
                    <h4 className={`${sectionTitle} pt-2`}>{t('shell.settings.feel')}</h4>
                    <div className="divide-y divide-white/10 light:divide-stone-200">
                        <Toggle label={t('shell.settings.sound')} sub={t('shell.settings.soundSub')} checked={systemSettings.soundEnabled} onChange={() => toggleSetting('soundEnabled')} />
                        <Toggle label={t('shell.settings.haptic')} sub={t('shell.settings.hapticSub')} checked={systemSettings.hapticEnabled} onChange={() => toggleSetting('hapticEnabled')} />
                        <div className="py-3">
                            <div className="flex items-center justify-between">
                                <span>
                                    <span className="block text-sm text-stone-100 light:text-stone-900">{t('shell.settings.distortion')}</span>
                                    <span className="block text-xs text-stone-400 light:text-stone-500">{t('shell.settings.distortionSub')}</span>
                                </span>
                                <span className="text-xs tabular-nums text-stone-400">{systemSettings.realityDistortion}%</span>
                            </div>
                            <input
                                type="range"
                                min="0"
                                max="100"
                                value={systemSettings.realityDistortion}
                                onChange={(e) => onUpdateSettings((s) => ({ ...s, realityDistortion: parseInt(e.target.value, 10) }))}
                                className="mt-3 w-full accent-amber-500"
                            />
                        </div>
                    </div>
                </div>

                <div className={`${card} p-4`}>
                    <h4 className={sectionTitle}>{t('shell.settings.data')}</h4>
                    <p className="mt-1 text-xs leading-relaxed text-stone-400 light:text-stone-500">{t('shell.settings.dataNote')}</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                        <button onClick={handleExport} className={ghostButton}>{t('shell.settings.export')}</button>
                        <button onClick={() => fileInputRef.current?.click()} className={ghostButton}>{t('shell.settings.import')}</button>
                        <input ref={fileInputRef} type="file" className="hidden" accept=".json,application/json" onChange={handleFileUpload} />
                        <button
                            onClick={handleClear}
                            disabled={savedPredictions.length === 0}
                            className="rounded-lg border border-rose-500/30 px-3 py-2 text-sm text-rose-300 transition-colors hover:bg-rose-500/15 disabled:opacity-40 light:text-rose-600"
                        >
                            {t('shell.settings.clear')}
                        </button>
                    </div>
                </div>

                <div className={`${card} p-4`}>
                    <h4 className={sectionTitle}>{t('shell.settings.about')}</h4>
                    <dl className="mt-3 space-y-1.5 text-xs text-stone-400 light:text-stone-500">
                        <div className="flex justify-between gap-4">
                            <dt>{t('shell.settings.draws')} · {t(`shell.game.${activeGameID}`)}</dt>
                            <dd className="text-stone-200 light:text-stone-800">
                                {historyData.length}
                                {oldest && newest && ` · ${t('shell.settings.range', { from: oldest.date, to: newest.date })}`}
                            </dd>
                        </div>
                        <div className="flex justify-between gap-4">
                            <dt>{t('shell.settings.vaultSize')}</dt>
                            <dd className="text-stone-200 light:text-stone-800">{(JSON.stringify(savedPredictions).length / 1024).toFixed(1)} KB</dd>
                        </div>
                    </dl>
                    <p className="mt-4 text-xs leading-relaxed text-stone-500">{t('shell.disclaimer')}</p>
                </div>

                <div className={`${card} p-4`}>
                    <h4 className={`${sectionTitle} mb-3`}>{t('shell.settings.changelog')}</h4>
                    {renderChangelog()}
                </div>
            </div>
        );
    };

    const renderTicketPreview = () => {
        if (!previewTicket) return null;
        const config = GAME_TYPES[previewTicket.gameID];
        const pickCount = config ? config.settings.pickCount : previewTicket.numbers.length;

        return (
            <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/70 p-4" onClick={() => setPreviewTicket(null)}>
                <div className="w-full max-w-sm space-y-4" onClick={(e) => e.stopPropagation()}>
                    {/* Captured as an image: fixed colours, no theme classes. */}
                    <div ref={ticketRef} style={{ backgroundColor: '#fbf8f2', color: '#292524' }} className="rounded-2xl p-6">
                        <p style={{ color: '#78716c' }} className="text-xs">
                            {config ? t(`shell.game.${previewTicket.gameID}`) : ''}
                            {previewTicket.period ? ` · ${t('shell.vault.period', { period: previewTicket.period })}` : ''}
                        </p>
                        <p className="mt-1 text-lg font-bold">{t('shell.vault.ticketTitle')}</p>
                        <div className="mt-5 flex flex-wrap gap-2">
                            {previewTicket.numbers.map((num, idx) => (
                                <span
                                    key={`${idx}-${num}`}
                                    style={{
                                        backgroundColor: idx >= pickCount ? '#f59e0b' : '#292524',
                                        color: idx >= pickCount ? '#292524' : '#fafaf9',
                                    }}
                                    className="inline-flex h-11 w-11 items-center justify-center rounded-full text-base font-semibold tabular-nums"
                                >
                                    {formatNumber(num)}
                                </span>
                            ))}
                        </div>
                        <p style={{ color: '#a8a29e' }} className="mt-5 text-xs">
                            {methodLabel(previewTicket.type)} · {new Date(previewTicket.date).toLocaleDateString()}
                        </p>
                    </div>

                    <div className="flex gap-2">
                        <button
                            onClick={handleDownloadTicket}
                            disabled={isDownloading}
                            className="grow rounded-xl bg-amber-500 px-4 py-2.5 text-sm font-semibold text-stone-900 hover:bg-amber-400 disabled:opacity-60"
                        >
                            {isDownloading ? t('shell.vault.ticketGenerating') : t('shell.vault.ticketDownload')}
                        </button>
                        <button onClick={() => setPreviewTicket(null)} className="rounded-xl border border-white/20 px-4 py-2.5 text-sm text-stone-100 hover:bg-white/10">
                            {t('shell.mine.close')}
                        </button>
                    </div>
                </div>
            </div>
        );
    };

    const titles = {
        menu: t('shell.mine.title'),
        vault: t('shell.mine.vault'),
        oracle: t('shell.mine.oracle'),
        settings: t('shell.mine.settings'),
    };

    return createPortal(
        <div className={isLightMode ? 'light-theme' : ''}>
            <div
                className={`fixed inset-0 z-[990] bg-black/50 transition-opacity duration-200 ${isOpen ? 'opacity-100' : 'pointer-events-none opacity-0'}`}
                onClick={onClose}
            />

            <aside
                aria-hidden={!isOpen}
                className={`fixed right-0 top-0 z-[999] flex h-full w-full flex-col border-l border-white/10 bg-[var(--app-base)] text-stone-300 shadow-2xl transition-transform duration-300 md:w-[520px] light:border-stone-200 light:text-stone-700 ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}
            >
                <div className="flex h-14 shrink-0 items-center gap-2 border-b border-white/10 px-4 light:border-stone-200">
                    {view !== 'menu' && (
                        <button
                            onClick={() => { click(); setView('menu'); }}
                            className="rounded-lg px-2 py-1.5 text-sm text-stone-400 hover:bg-white/10 hover:text-stone-100 light:hover:bg-stone-100 light:hover:text-stone-900"
                        >
                            ‹ {t('shell.mine.back')}
                        </button>
                    )}
                    <h2 className="grow text-base font-semibold text-stone-50 light:text-stone-900">{titles[view]}</h2>
                    <button
                        onClick={onClose}
                        aria-label={t('shell.mine.close')}
                        className="flex h-9 w-9 items-center justify-center rounded-lg text-stone-400 hover:bg-white/10 hover:text-stone-100 light:hover:bg-stone-100 light:hover:text-stone-900"
                    >
                        ✕
                    </button>
                </div>

                <div className="min-h-0 grow overflow-y-auto overscroll-contain">
                    {view === 'menu' && renderMenu()}
                    {view === 'vault' && renderVault()}
                    {isOpen && view === 'oracle' && renderOracle()}
                    {view === 'settings' && renderSettings()}
                </div>
            </aside>

            {renderTicketPreview()}
        </div>,
        document.body,
    );
};

export default Sidebar;
