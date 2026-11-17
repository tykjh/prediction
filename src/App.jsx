import React, { Suspense, lazy, useCallback, useEffect, useMemo, useState } from 'react';
import TopBar from './components/TopBar';
import BottomNav from './components/BottomNav';
import Workspace from './components/Workspace';
import QuickPickModal from './components/QuickPickModal';
import FloatingMenu from './components/FloatingMenu';
import Sidebar from './components/Sidebar';
import Toast from './components/Toast';
import { GAME_TYPES, DEFAULT_GAME } from './config/games';
import { NAV_IDS } from './config/nav';
import { THEMES, DEFAULT_THEME, LIGHT_BASE, LIGHT_BLOBS, themeAt } from './config/themes';
import initialHistoryLotto649 from './data/history.json';
import initialHistorySuperLotto from './data/history_superlotto.json';
import initialHistory539 from './data/history_539.json';
import { useLanguage } from './i18n/LanguageContext';
import { loadJSON, loadObject, saveJSON } from './utils/storage';
import { sanitizeVault, sanitizeDrawEntries, sanitizeDrawEntry } from './utils/sanitize';
import { checkVault } from './utils/prize';
import { nextPeriodOf } from './utils/drawSchedule';
import { playTone } from './utils/sound';

// Pages other than the first one are loaded when they are first opened.
const TestArea = lazy(() => import('./components/TestArea'));
const BacktestView = lazy(() => import('./components/BacktestView'));
const Playground = lazy(() => import('./components/Playground'));
const ManualModal = lazy(() => import('./components/ManualModal'));
const MoneyRain = lazy(() => import('./components/MoneyRain'));

const BUNDLED_HISTORY = {
  LOTTO649: initialHistoryLotto649,
  SUPERLOTTO: initialHistorySuperLotto,
  539: initialHistory539,
};

const STORAGE_KEYS = {
  entries: 'lottery_user_entries',
  vault: 'lottery_vault',
  settings: 'lottery_settings',
};

const DEFAULT_SYSTEM_SETTINGS = {
  highContrast: false,
  reducedMotion: false,
  soundEnabled: false,
  hapticEnabled: false,
  realityDistortion: 0, // 0 to 100
};

const DEFAULT_SETTINGS = {
  activeGameID: DEFAULT_GAME,
  bgTheme: DEFAULT_THEME,
  isLightMode: false,
  system: DEFAULT_SYSTEM_SETTINGS,
};

const loadSettings = () => {
  const stored = loadObject(STORAGE_KEYS.settings, DEFAULT_SETTINGS);
  return {
    activeGameID: GAME_TYPES[stored.activeGameID] ? stored.activeGameID : DEFAULT_GAME,
    bgTheme: THEMES[stored.bgTheme] ? stored.bgTheme : DEFAULT_THEME,
    isLightMode: stored.isLightMode === true,
    system: { ...DEFAULT_SYSTEM_SETTINGS, ...(stored.system && typeof stored.system === 'object' ? stored.system : {}) },
  };
};

function App() {
  const { t } = useLanguage();
  const [initialSettings] = useState(loadSettings);

  const [activeGameID, setActiveGameID] = useState(initialSettings.activeGameID);
  const [bgTheme, setBgTheme] = useState(initialSettings.bgTheme);
  const [isLightMode, setIsLightMode] = useState(initialSettings.isLightMode);
  const [systemSettings, setSystemSettings] = useState(initialSettings.system);
  const activeGameConfig = GAME_TYPES[activeGameID];

  const [currentView, setCurrentView] = useState('workspace');
  const [quickPickOpen, setQuickPickOpen] = useState(false);
  const [isRaining, setIsRaining] = useState(false);
  const [rainKey, setRainKey] = useState(0);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isManualOpen, setIsManualOpen] = useState(false);
  const [toast, setToast] = useState('');
  const [isShaking, setIsShaking] = useState(false);

  // Stored data is rebuilt field by field, so damaged or tampered values are dropped.
  const [userEntries, setUserEntries] = useState(() => sanitizeDrawEntries(loadJSON(STORAGE_KEYS.entries, [])));
  const [savedPredictions, setSavedPredictions] = useState(() => sanitizeVault(loadJSON(STORAGE_KEYS.vault, []))?.items || []);

  // ---------- Persistence ----------

  useEffect(() => {
    saveJSON(STORAGE_KEYS.entries, userEntries);
  }, [userEntries]);

  useEffect(() => {
    saveJSON(STORAGE_KEYS.vault, savedPredictions);
  }, [savedPredictions]);

  useEffect(() => {
    saveJSON(STORAGE_KEYS.settings, { activeGameID, bgTheme, isLightMode, system: systemSettings });
  }, [activeGameID, bgTheme, isLightMode, systemSettings]);

  // ---------- Draw history (bundled data + anything the user typed in) ----------

  const historyByGame = useMemo(() => {
    const result = {};
    Object.keys(BUNDLED_HISTORY).forEach((gameID) => {
      // Entries saved before multi-game support have no gameID: they were Lotto 6/49.
      const own = userEntries.filter((e) => (e.gameID || 'LOTTO649') === gameID);
      const ownPeriods = new Set(own.map((e) => String(e.period)));
      const bundled = BUNDLED_HISTORY[gameID].filter((e) => !ownPeriods.has(String(e.period)));
      result[gameID] = [...own, ...bundled].sort((a, b) => Number(b.period) - Number(a.period));
    });
    return result;
  }, [userEntries]);

  const completeHistory = historyByGame[activeGameID];

  // ---------- Feedback: sound, shake, toast ----------

  const playSound = useCallback((type) => {
    if (systemSettings.soundEnabled) playTone(type);
  }, [systemSettings.soundEnabled]);

  const notify = useCallback((message) => setToast(message), []);
  const clearToast = useCallback(() => setToast(''), []);

  useEffect(() => {
    if (!isShaking) return undefined;
    const timer = setTimeout(() => setIsShaking(false), 200);
    return () => clearTimeout(timer);
  }, [isShaking]);

  const triggerHaptic = () => {
    if (systemSettings.hapticEnabled) setIsShaking(true);
  };

  useEffect(() => {
    document.body.classList.toggle('reduce-motion', systemSettings.reducedMotion);
  }, [systemSettings.reducedMotion]);

  // ---------- Saved picks ----------

  const handleSavePrediction = (numbers, type = 'Standard') => {
    if (!numbers || numbers.length === 0) return;

    const newEntry = {
      id: Date.now(),
      date: new Date().toISOString(),
      period: completeHistory.length > 0 ? nextPeriodOf(completeHistory[0].period) : '',
      numbers,
      type,
      gameID: activeGameID,
      specialNumber: null,
    };

    setSavedPredictions((prev) => [newEntry, ...prev]);
    playSound('success');
    notify(t('shell.toast.saved'));
  };

  const handleDeletePrediction = (id) => {
    setSavedPredictions((prev) => prev.filter((item) => item.id !== id));
  };

  const handleClearVault = () => setSavedPredictions([]);

  const handleImportVault = (data) => {
    const result = sanitizeVault(data);
    if (!result || (result.items.length === 0 && result.rejected > 0)) {
      notify(t('shell.settings.importInvalid'));
      playSound('error');
      return;
    }

    const existingIds = new Set(savedPredictions.map((p) => p.id));
    const newItems = result.items.filter((p) => !existingIds.has(p.id));
    setSavedPredictions((prev) => [...newItems, ...prev]);
    notify(t('shell.settings.importDone', { n: newItems.length }));
    playSound('success');
  };

  const handleAddEntry = (newEntry) => {
    const entry = sanitizeDrawEntry({ ...newEntry, gameID: newEntry.gameID || activeGameID });
    if (!entry) return;
    setUserEntries((prev) => [entry, ...prev]);
    playSound('success');
    notify(t('shell.toast.added'));
  };

  // Picks are checked on their own as soon as their draw is in the data.
  useEffect(() => {
    const result = checkVault(savedPredictions, historyByGame, GAME_TYPES, { onlyUnchecked: true });
    if (result.newlyChecked === 0) return;
    setSavedPredictions(result.predictions);
    notify(t('shell.toast.autoChecked', { n: result.newlyChecked }));
  }, [savedPredictions, historyByGame, notify, t]);

  const handleCheckVault = () => {
    const result = checkVault(savedPredictions, historyByGame, GAME_TYPES);
    setSavedPredictions(result.predictions);

    if (result.newlyChecked === 0) {
      playSound('click');
      notify(t('shell.toast.checkedNone'));
    } else if (result.winners > 0) {
      playSound('win');
      notify(t('shell.toast.checkedWin', { n: result.newlyChecked, w: result.winners }));
    } else {
      playSound('click');
      notify(t('shell.toast.checked', { n: result.newlyChecked }));
    }
  };

  // ---------- Look ----------

  const theme = themeAt(bgTheme);
  const baseColor = systemSettings.highContrast ? '#000000' : isLightMode ? LIGHT_BASE : theme.base;
  const blobs = systemSettings.highContrast || !theme.blobs ? null : isLightMode ? LIGHT_BLOBS : theme.blobs;

  // The top bar, bottom bar and side panel read the page colour from here.
  useEffect(() => {
    document.documentElement.style.setProperty('--app-base', baseColor);
    document.body.style.backgroundColor = baseColor;
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', baseColor);
  }, [baseColor]);

  // ---------- Navigation ----------

  const goTo = (view) => {
    playSound('click');
    setCurrentView(view);
    window.scrollTo({ top: 0 });
  };

  const nextTheme = () => setBgTheme((prev) => (prev + 1) % THEMES.length);
  const startMoneyRain = () => {
    setRainKey((prev) => prev + 1);
    setIsRaining(true);
  };

  const stepView = (direction) => {
    const index = Math.max(0, NAV_IDS.indexOf(currentView));
    const next = (index + direction + NAV_IDS.length) % NAV_IDS.length;
    goTo(NAV_IDS[next]);
  };

  const switchGame = (gameID) => {
    if (gameID === activeGameID) return;
    playSound('click');
    setActiveGameID(gameID);
  };

  const distortion = systemSettings.realityDistortion;
  const arrowButton = 'flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-[var(--app-raised)] text-stone-400 transition-colors hover:text-stone-100 light:border-stone-200 light:bg-white light:text-stone-500 light:hover:text-stone-900';
  const pageFallback = <p className="py-16 text-center text-sm text-stone-400">{t('shell.loading')}</p>;

  return (
    <div
      onMouseDown={triggerHaptic}
      className={`relative min-h-screen overflow-x-hidden font-sans selection:bg-amber-500/30 ${systemSettings.highContrast ? 'text-white' : 'text-stone-300 light:text-stone-700'} ${isShaking ? 'animate-screen-shake' : ''} ${isLightMode ? 'light-theme' : ''}`}
      style={{
        backgroundColor: baseColor,
        filter: distortion > 0
          ? `contrast(${100 + distortion * 4}%) saturate(${100 + distortion * 5}%) sepia(${distortion}%) hue-rotate(${distortion * 2}deg) invert(${distortion * 0.2}%) blur(${distortion * 0.02}px)`
          : 'none',
        transition: 'background-color 0.4s ease',
      }}
    >
      {/* Soft colour wash, only for the coloured backgrounds */}
      {blobs && (
        <div className="pointer-events-none fixed inset-0 z-0" aria-hidden="true">
          <div className={`absolute left-[-10%] top-[-10%] h-[50%] w-[50%] rounded-full blur-[120px] ${blobs[0]}`} />
          <div className={`absolute bottom-[-10%] right-[-10%] h-[50%] w-[50%] rounded-full blur-[120px] ${blobs[1]}`} />
          <div className={`absolute left-1/2 top-[40%] h-[40%] w-[60%] -translate-x-1/2 rounded-full blur-[100px] ${blobs[2]}`} />
        </div>
      )}

      <div className="relative z-10 flex min-h-screen flex-col">
        <TopBar
          currentView={currentView}
          onViewChange={goTo}
          onOpenMine={() => setIsSidebarOpen(true)}
          onOpenManual={() => setIsManualOpen(true)}
          isLightMode={isLightMode}
          onToggleLightMode={() => setIsLightMode((v) => !v)}
          activeGameID={activeGameID}
          onSwitchGame={switchGame}
        />

        <main className="mx-auto w-full max-w-7xl flex-1 px-4 pb-28 pt-5 sm:px-6 md:pb-10 md:pt-8 lg:px-8">
          {currentView === 'workspace' && (
            <Workspace
              historyData={completeHistory}
              onAddEntry={handleAddEntry}
              bgTheme={bgTheme}
              onSavePrediction={handleSavePrediction}
              playSound={playSound}
              isLightMode={isLightMode}
              reducedMotion={systemSettings.reducedMotion}
              activeGameConfig={activeGameConfig}
            />
          )}
          <Suspense fallback={pageFallback}>
            {currentView === 'test-area' && (
              <TestArea
                historyData={completeHistory}
                bgTheme={bgTheme}
                onSavePrediction={handleSavePrediction}
                playSound={playSound}
                isLightMode={isLightMode}
                reducedMotion={systemSettings.reducedMotion}
                activeGameConfig={activeGameConfig}
              />
            )}
            {currentView === 'backtest' && (
              <BacktestView
                historyData={completeHistory}
                bgTheme={bgTheme}
                playSound={playSound}
                isLightMode={isLightMode}
                reducedMotion={systemSettings.reducedMotion}
                activeGameConfig={activeGameConfig}
              />
            )}
            {currentView === 'playground' && (
              <Playground isLightMode={isLightMode} bgTheme={bgTheme} />
            )}
          </Suspense>

          <footer className="mx-auto mt-10 max-w-2xl px-2 text-center text-xs leading-relaxed text-stone-500">
            {t('shell.disclaimer')}
          </footer>
        </main>
      </div>

      <BottomNav
        currentView={currentView}
        onViewChange={goTo}
        onOpenMine={() => setIsSidebarOpen(true)}
      />

      <Sidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        savedPredictions={savedPredictions}
        onSavePrediction={handleSavePrediction}
        onDeletePrediction={handleDeletePrediction}
        onClearVault={handleClearVault}
        onImportVault={handleImportVault}
        onCheckVault={handleCheckVault}
        systemSettings={systemSettings}
        onUpdateSettings={setSystemSettings}
        playSound={playSound}
        historyData={completeHistory}
        isLightMode={isLightMode}
        onToggleLightMode={() => setIsLightMode((v) => !v)}
        bgTheme={bgTheme}
        onSetTheme={setBgTheme}
        activeGameID={activeGameID}
        onSwitchGame={switchGame}
        onOpenManual={() => setIsManualOpen(true)}
        onQuickPick={() => setQuickPickOpen(true)}
        onNextTheme={nextTheme}
        onMoneyRain={startMoneyRain}
        notify={notify}
      />

      <FloatingMenu
        onQuickPick={() => setQuickPickOpen(true)}
        onToggleTheme={nextTheme}
        onResetTheme={() => setBgTheme(DEFAULT_THEME)}
        onMoneyRain={startMoneyRain}
        playSound={playSound}
      />

      {/* Previous / next page arrows */}
      <div className="fixed right-2 top-1/2 z-40 hidden -translate-y-1/2 flex-col gap-2 sm:flex">
        <button onClick={() => stepView(-1)} className={arrowButton} title={t('shell.nav.previous')} aria-label={t('shell.nav.previous')}>
          ‹
        </button>
        <button onClick={() => stepView(1)} className={arrowButton} title={t('shell.nav.next')} aria-label={t('shell.nav.next')}>
          ›
        </button>
      </div>

      {quickPickOpen && <QuickPickModal onClose={() => setQuickPickOpen(false)} activeGameConfig={activeGameConfig} />}

      <Suspense fallback={null}>
        {isManualOpen && <ManualModal onClose={() => setIsManualOpen(false)} />}
        {isRaining && (
          <MoneyRain key={rainKey} onComplete={() => setIsRaining(false)} playSound={playSound} />
        )}
      </Suspense>

      <Toast message={toast} onDone={clearToast} />
    </div>
  );
}

export default App;
