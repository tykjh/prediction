import React, { useState, useEffect } from 'react';
import TopBar from './components/TopBar';
import Workspace from './components/Workspace';
import TestArea from './components/TestArea';
import BacktestView from './components/BacktestView';
import QuickPickModal from './components/QuickPickModal';
import FloatingMenu from './components/FloatingMenu';
import Sidebar from './components/Sidebar';
import MoneyRain from './components/MoneyRain';
import Playground from './components/Playground';
import { GAME_TYPES, DEFAULT_GAME } from './config/games';
import initialHistoryLotto649 from './data/history.json';
import initialHistorySuperLotto from './data/history_superlotto.json';
import initialHistory539 from './data/history_539.json';
import { useLanguage } from './i18n/LanguageContext';

function App() {
  const { t } = useLanguage();
  const [activeGameID, setActiveGameID] = useState(DEFAULT_GAME);
  const activeGameConfig = GAME_TYPES[activeGameID];

  const [currentView, setCurrentView] = useState('workspace'); // 'workspace' | 'test-area'
  const [completeHistory, setCompleteHistory] = useState([]);
  const [quickPickModalOpen, setQuickPickModalOpen] = useState(false);
  const [quickPickOpen, setQuickPickOpen] = useState(false);
  const [bgTheme, setBgTheme] = useState(3); // Default to 3: Ocean (Blue)
  const [isRaining, setIsRaining] = useState(false);
  const [rainKey, setRainKey] = useState(0);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isLightMode, setIsLightMode] = useState(false);

  // 1. User Entries State (Persisted)
  const [userEntries, setUserEntries] = useState(() => {
    const saved = localStorage.getItem('lottery_user_entries');
    return saved ? JSON.parse(saved) : [];
  });

  // 2. Persist User Entries
  useEffect(() => {
    localStorage.setItem('lottery_user_entries', JSON.stringify(userEntries));
  }, [userEntries]);

  // 3. Combine History (User Entries > Initial History)
  useEffect(() => {
    let baseHistory = [];
    if (activeGameID === 'LOTTO649') {
      baseHistory = initialHistoryLotto649;
    } else if (activeGameID === 'SUPERLOTTO') {
      baseHistory = initialHistorySuperLotto;
    } else if (activeGameID === '539') {
      baseHistory = initialHistory539;
    }

    // Filter user entries for current game (assuming userEntries has gameID, if not default to LOTTO649)
    // For now, let's assume all userEntries are for LOTTO649 unless we add gameID to userEntries.
    // Ideally, userEntries should store gameID.
    // Backward compatibility: If no gameID, assume LOTTO649.

    const gameUserEntries = userEntries.filter(e => {
      const gId = e.gameID || 'LOTTO649';
      return gId === activeGameID;
    });

    const userPeriodSet = new Set(gameUserEntries.map(e => e.period));
    const filteredInitial = baseHistory.filter(e => !userPeriodSet.has(e.period));
    const combined = [...gameUserEntries, ...filteredInitial].sort((a, b) => b.period - a.period);
    setCompleteHistory(combined);

  }, [userEntries, activeGameID]);

  // State for "The Vault" (Saved Predictions)
  const [savedPredictions, setSavedPredictions] = useState(() => {
    const saved = localStorage.getItem('lottery_vault');
    return saved ? JSON.parse(saved) : [];
  });

  // Persist Vault
  useEffect(() => {
    localStorage.setItem('lottery_vault', JSON.stringify(savedPredictions));
  }, [savedPredictions]);

  const handleSavePrediction = (numbers, type = 'Standard') => {
    if (!numbers || numbers.length === 0) return;

    // Calculate Next Period
    let nextPeriodRaw = '000000';
    if (completeHistory && completeHistory.length > 0) {
      // Assuming sorted desc, first is latest
      const latestPeriod = BigInt(completeHistory[0].period);
      nextPeriodRaw = (latestPeriod + 1n).toString();
    }

    const newEntry = {
      id: Date.now(),
      date: new Date().toISOString(),
      period: nextPeriodRaw, // Added Period
      numbers,
      type,
      note: 'Saved manually',
      gameID: activeGameID, // Store active game
      specialNumber: null // Placeholder for Section 2 (Super Lotto)
    };

    setSavedPredictions(prev => [newEntry, ...prev]);
    playSound('success'); // Global success feedback
  };

  const handleDeletePrediction = (id) => {
    setSavedPredictions(prev => prev.filter(item => item.id !== id));
  };

  // Clear all predictions
  const handleClearVault = () => {
    if (window.confirm(t('app.confirmClearVault'))) {
      setSavedPredictions([]);
    }
  };

  // Import predictions
  const handleImportVault = (data) => {
    try {
      // Validate data structure roughly
      if (Array.isArray(data)) {
        setSavedPredictions(prev => {
          // Merge and deduplicate by ID
          const existingIds = new Set(prev.map(p => p.id));
          const newItems = data.filter(p => !existingIds.has(p.id));
          return [...newItems, ...prev];
        });
        alert(t('app.importSuccess', { n: data.length }));
      } else {
        alert(t('app.importInvalidFormat'));
      }
    } catch (e) {
      console.error("Import failed", e);
      alert(t('app.importFailed', { message: e.message }));
    }
  };

  const handleAddEntry = (newEntry) => {
    setUserEntries(prev => [newEntry, ...prev]);
    playSound('success');
  };

  // Auto-Check Vault Logic
  const handleCheckVault = () => {
    // 1. Identify which predictions can be checked
    if (!completeHistory || completeHistory.length === 0) {
      alert(t('app.noHistoryForVerification'));
      return;
    }

    const updatedPredictions = savedPredictions.map(pred => {
      // 1. Skip if game ID doesn't match active game (or if pred has no gameID, assume LOTTO649)
      const predGameID = pred.gameID || 'LOTTO649';
      if (predGameID !== activeGameID) return pred;

      // 2. Find the draw result for this prediction's period
      const drawResult = completeHistory.find(h => h.period === pred.period);

      if (!drawResult) return pred; // Not drawn yet

      // 3. Compare Numbers
      const MAX = activeGameConfig.settings.maxNumber;
      const PICK = activeGameConfig.settings.pickCount;
      const drawnNumbers = drawResult.numbers.slice(0, PICK);
      const specialNum = drawResult.numbers[PICK]; // Special number index

      // Compare Matches
      const matchedNumbers = pred.numbers.filter(n => drawnNumbers.includes(n));
      const hitCount = matchedNumbers.length;

      // Check Special Number
      let specialHit = false;
      if (activeGameConfig.settings.specialNumber.enabled) {
        if (!activeGameConfig.settings.specialNumber.isSeparate) {
          // 6/49 Style: Special is in same pool
          if (pred.numbers.includes(specialNum)) specialHit = true;
        } else {
          // Super Lotto Style (Separate Pool)
          specialHit = false;
        }
      }

      // 5. Determine Prize (Dynamic Rules)
      let prize = 'No Prize';

      // Rules Engine
      if (predGameID === '539') {
        if (hitCount === 5) prize = 'Jackpot (頭獎)';
        else if (hitCount === 4) prize = '2nd Prize (貳獎)';
        else if (hitCount === 3) prize = '3rd Prize (參獎)';
        else if (hitCount === 2) prize = '4th Prize (肆獎)';
      } else if (predGameID === 'LOTTO649') {
        if (hitCount === 6) prize = 'Jackpot';
        else if (hitCount === 5 && specialHit) prize = '2nd Prize';
        else if (hitCount === 5) prize = '3rd Prize';
        else if (hitCount === 4 && specialHit) prize = '4th Prize';
        else if (hitCount === 4) prize = '5th Prize';
        else if (hitCount === 3 && specialHit) prize = '6th Prize';
        else if (hitCount === 3) prize = '7th Prize';
      } else if (predGameID === 'SUPERLOTTO') {
        // Simplified Super Lotto Rules
        if (hitCount === 6) prize = 'Jackpot (Main)';
        else if (hitCount === 5) prize = '2nd Prize';
        else if (hitCount === 4) prize = '3rd Prize';
        else if (hitCount === 3) prize = '4th Prize';
      }

      return {
        ...pred,
        verification: {
          checked: true,
          hits: hitCount,
          specialHit: specialHit,
          matchedNumbers: matchedNumbers,
          prize: prize,
          checkDate: new Date().toISOString()
        }
      };
    });

    setSavedPredictions(updatedPredictions);

    // UX Feedback
    const winCount = updatedPredictions.filter(p =>
      p.gameID === activeGameID && p.verification?.prize !== 'No Prize'
    ).length;

    if (updatedPredictions.some(p => p.gameID === activeGameID)) {
      if (winCount > 0) {
        if (playSound) playSound('win');
        alert(t('app.verifiedWinners', { n: winCount, game: activeGameConfig.name }));
      } else {
        if (playSound) playSound('click');
        alert(t('app.verifiedNoWinners'));
      }
    } else {
      alert(t('app.noTicketsForGame', { game: activeGameConfig.name }));
    }
  };

  // State for System Settings
  const [systemSettings, setSystemSettings] = useState({
    highContrast: false,
    reducedMotion: false,
    autoSave: true,
    soundEnabled: false,
    hapticEnabled: false,
    realityDistortion: 0 // 0 to 100
  });

  // Apply Reduced Motion to Body
  useEffect(() => {
    if (systemSettings.reducedMotion) {
      document.body.classList.add('reduce-motion');
    } else {
      document.body.classList.remove('reduce-motion');
    }
  }, [systemSettings.reducedMotion]);

  // Sound Engine
  const playSound = (type) => {
    if (!systemSettings.soundEnabled) return;
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;

    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    const now = ctx.currentTime;

    switch (type) {
      case 'click': // Standard interaction
        osc.type = 'sine';
        osc.frequency.setValueAtTime(800, now);
        osc.frequency.exponentialRampToValueAtTime(300, now + 0.1);
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
        osc.start(now);
        osc.stop(now + 0.1);
        break;

      case 'hover': // Subtle air feel
        osc.type = 'sine';
        osc.frequency.setValueAtTime(1200, now);
        gain.gain.setValueAtTime(0.02, now);
        gain.gain.linearRampToValueAtTime(0, now + 0.05);
        osc.start(now);
        osc.stop(now + 0.05);
        break;

      case 'delete': // Descending zap
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(200, now);
        osc.frequency.exponentialRampToValueAtTime(50, now + 0.2);
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
        osc.start(now);
        osc.stop(now + 0.2);
        break;

      case 'success': // High ping
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(600, now);
        osc.frequency.linearRampToValueAtTime(1200, now + 0.1);
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.linearRampToValueAtTime(0, now + 0.3);
        osc.start(now);
        osc.stop(now + 0.3);
        break;

      case 'predict': // Magic chord arp
        const notes = [440, 554, 659]; // A major
        notes.forEach((freq, i) => {
          const o = ctx.createOscillator();
          const g = ctx.createGain();
          o.connect(g);
          g.connect(ctx.destination);
          o.type = 'sine';
          o.frequency.value = freq;
          g.gain.setValueAtTime(0.05, now + i * 0.05);
          g.gain.exponentialRampToValueAtTime(0.001, now + i * 0.05 + 0.3);
          o.start(now + i * 0.05);
          o.stop(now + i * 0.05 + 0.3);
        });
        break;

      case 'error': // Low buzz
        osc.type = 'square';
        osc.frequency.setValueAtTime(100, now);
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.linearRampToValueAtTime(0, now + 0.15);
        osc.start(now);
        osc.stop(now + 0.15);
        break;

      case 'coin': // Metallic ping for Money Rain
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(2200, now);
        osc.frequency.exponentialRampToValueAtTime(2000, now + 0.1);
        gain.gain.setValueAtTime(0.05, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
        osc.start(now);
        osc.stop(now + 0.3);
        break;

      default:
        break;
    }
  };

  /* State for Visual Haptics */
  const [isShaking, setIsShaking] = useState(false);

  useEffect(() => {
    if (isShaking) {
      const timer = setTimeout(() => setIsShaking(false), 200);
      return () => clearTimeout(timer);
    }
  }, [isShaking]);

  // Haptic Engine (Visual Override)
  const triggerHaptic = () => {
    if (systemSettings.hapticEnabled) {
      setIsShaking(true);
    }
  };

  const wrapInteraction = (fn) => (...args) => {
    playSound('click');
    triggerHaptic();
    if (fn) fn(...args);
  };

  const getThemeColors = () => {
    // High Contrast Mode Override
    if (systemSettings.highContrast) {
      return {
        base: '#000000',
        blob1: 'bg-transparent',
        blob2: 'bg-transparent',
        blob3: 'bg-transparent',
        text: 'text-white'
      };
    }

    if (isLightMode) {
      return {
        base: '#f1f5f9', // Slate 100 (Not pure white)
        // Blobs with a bit more presence to tint the page functionality
        blob1: 'bg-indigo-300/40 mix-blend-multiply filter blur-3xl opacity-60 animate-blob-slow',
        blob2: 'bg-sky-300/40 mix-blend-multiply filter blur-3xl opacity-60 animate-blob-slow animation-delay-2000',
        blob3: 'bg-violet-300/40 mix-blend-multiply filter blur-3xl opacity-60 animate-blob-slow animation-delay-4000',
        text: 'text-slate-700'
      };
    }

    let themeObj;
    switch (bgTheme) {
      // 0: Sunset (Default - Orange)
      case 0: themeObj = { base: '#2B140B', blob1: 'bg-orange-600/20', blob2: 'bg-red-500/20', blob3: 'bg-amber-500/15' }; break;
      // 1: Cyberpunk (Neon)
      case 1: themeObj = { base: '#2B0921', blob1: 'bg-pink-600/20', blob2: 'bg-yellow-500/15', blob3: 'bg-fuchsia-600/20' }; break;
      // 2: Forest (Nature)
      case 2: themeObj = { base: '#082918', blob1: 'bg-emerald-600/20', blob2: 'bg-lime-500/15', blob3: 'bg-teal-500/15' }; break;
      // 3: Ocean (Deep Blue)
      case 3: themeObj = { base: '#0C2438', blob1: 'bg-blue-600/20', blob2: 'bg-cyan-500/15', blob3: 'bg-sky-500/15' }; break;
      // 4: Deep Space (Indigo - Moved from Default)
      case 4: themeObj = { base: '#1E2038', blob1: 'bg-indigo-600/20', blob2: 'bg-violet-600/20', blob3: 'bg-blue-500/15' }; break;
      // 5: Mint (Fresh)
      case 5: themeObj = { base: '#0A2E25', blob1: 'bg-teal-400/20', blob2: 'bg-emerald-300/15', blob3: 'bg-cyan-300/15' }; break;
      // 6: Rainbow (Prismatic)
      case 6: themeObj = {
        base: '#111111',
        blob1: 'bg-[conic-gradient(at_center,_var(--tw-gradient-stops))] from-red-500 via-yellow-500 via-green-500 via-blue-500 to-purple-500 opacity-60 blur-[80px] animate-spin-slow mix-blend-screen',
        blob2: 'bg-[conic-gradient(at_center,_var(--tw-gradient-stops))] from-cyan-400 via-fuchsia-500 via-orange-500 to-lime-500 opacity-50 blur-[90px] animate-spin-reverse-slow delay-1000 mix-blend-screen',
        blob3: 'bg-white/10 opacity-20 mix-blend-overlay animate-pulse'
      }; break;
      default: themeObj = { base: '#2B140B', blob1: 'bg-orange-600/20', blob2: 'bg-red-500/20', blob3: 'bg-amber-500/15' };
    }

    // Reduced Motion Override: Strip animation classes
    if (systemSettings.reducedMotion) {
      themeObj.blob1 = themeObj.blob1.replace(/animate-[\w-]+/g, '');
      themeObj.blob2 = themeObj.blob2.replace(/animate-[\w-]+/g, '');
      themeObj.blob3 = themeObj.blob3.replace(/animate-[\w-]+/g, '');
    }

    return themeObj;
  };

  const theme = getThemeColors();

  const handleGlobalMouseDown = () => {
    triggerHaptic();
    // Optional: We could also play a very subtle click sound here if purely distinct from button clicks
    // playSound('click'); 
  };

  const navViews = ['workspace', 'test-area', 'backtest'];

  const changeView = (direction) => {
    wrapInteraction()(); // Play sound/haptic

    // If we are in playground, we "exit" to workspace or backtest
    let currentIndex = navViews.indexOf(currentView);
    if (currentIndex === -1) {
      // We are in playground (or some other custom view)
      setCurrentView(direction === 'next' ? navViews[0] : navViews[navViews.length - 1]);
      return;
    }

    let nextIndex;
    if (direction === 'next') {
      nextIndex = (currentIndex + 1) % navViews.length;
    } else {
      nextIndex = (currentIndex - 1 + navViews.length) % navViews.length;
    }
    setCurrentView(navViews[nextIndex]);
  };

  return (
    <div
      onMouseDown={handleGlobalMouseDown}
      className={`min-h-screen font-sans relative overflow-x-hidden selection:bg-indigo-500/30 transition-colors duration-1000 ${systemSettings.highContrast ? 'text-white' : 'text-slate-300 light:text-slate-700'} ${isShaking ? 'animate-screen-shake' : ''} ${isLightMode ? 'light-theme' : ''}`}
      style={{
        backgroundColor: theme.base,
        filter: systemSettings.realityDistortion > 0
          ? `contrast(${100 + systemSettings.realityDistortion * 4}%) 
             saturate(${100 + systemSettings.realityDistortion * 5}%) 
             sepia(${systemSettings.realityDistortion}%) 
             hue-rotate(${systemSettings.realityDistortion * 2}deg)
             invert(${systemSettings.realityDistortion * 0.2}%)
             blur(${systemSettings.realityDistortion * 0.02}px)`
          : 'none',
        transition: 'filter 0.3s ease-out, background-color 1s ease'
      }}
    >

      {/* Premium Background Layer */}
      <div className="fixed inset-0 z-0 pointer-events-none transition-all duration-1000" style={{ transform: systemSettings.realityDistortion > 0 ? `scale(${1 + systemSettings.realityDistortion * 0.002}) skew(${systemSettings.realityDistortion * 0.1}deg)` : 'none' }}>
        {/* Base handled by parent style to avoid flash */}


        {/* Nebula Glows */}
        {!systemSettings.highContrast && (
          <>
            <div className={`absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full blur-[120px] transition-all duration-1000 ${systemSettings.reducedMotion ? '' : 'animate-pulse-slow'} ${theme.blob1}`}></div>
            <div className={`absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full blur-[120px] delay-1000 transition-all duration-1000 ${systemSettings.reducedMotion ? '' : 'animate-pulse-slow'} ${theme.blob2}`}></div>
            <div className={`absolute top-[40%] left-[50%] translate-x-[-50%] w-[60%] h-[40%] rounded-full blur-[100px] transition-all duration-1000 ${theme.blob3}`}></div>
          </>
        )}

      </div>

      {/* Main Content (Z-Index 10) */}
      <div className="relative z-10 flex flex-col min-h-screen">
        {/* Top Navigation */}
        <TopBar
          currentView={currentView}
          onViewChange={setCurrentView}
          onLogoClick={() => setIsSidebarOpen(true)}
          isLightMode={isLightMode}
          onToggleLightMode={() => setIsLightMode(!isLightMode)}
          activeGameID={activeGameID}
          activeGameLogo={activeGameConfig.logo} // Pass Logo
          onToggleGame={() => {
            // Cycle: LOTTO649 -> SUPERLOTTO -> 539 -> LOTTO649
            const nextGame = activeGameID === 'LOTTO649' ? 'SUPERLOTTO' : (activeGameID === 'SUPERLOTTO' ? '539' : 'LOTTO649');
            setActiveGameID(nextGame);
            if (playSound) playSound('click');
          }}
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
          activeGameID={activeGameID}
          activeGameConfig={activeGameConfig}
          onSwitchGame={setActiveGameID}
          gameTypes={GAME_TYPES}
        />

        {/* Main Content Area */}
        <div className="p-4 md:p-8 flex-1">
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
            <Playground
              isLightMode={isLightMode}
              bgTheme={bgTheme}
            />
          )}
        </div>
      </div>

      {/* Floating Action Menu (Fixed Bottom-Left) */}
      <FloatingMenu
        onToggleView={() => setCurrentView(prev => {
          const idx = navViews.indexOf(prev);
          if (idx === -1) return navViews[0]; // Exit playground to workspace
          const nextIdx = (idx + 1) % navViews.length;
          return navViews[nextIdx];
        })}
        onQuickPick={() => setQuickPickOpen(true)}
        onToggleTheme={() => setBgTheme(prev => (prev + 1) % 7)}
        onResetTheme={() => setBgTheme(3)} // Reset to default (Blue)
        currentTheme={bgTheme}
        playSound={playSound}
        onMoneyRain={() => {
          setRainKey(prev => prev + 1); // Force re-mount
          setIsRaining(true);
        }}
        isLightMode={isLightMode}
        activeGameLogo={activeGameConfig.logo} // Pass Logo
        onSwitchGame={setActiveGameID} // Allow switching
        onOpenSidebar={() => setIsSidebarOpen(true)} // Long Press Action
      />

      {/* Side Navigation Arrows - Minimalist Glass */}
      <div className="fixed top-1/2 right-0 -translate-y-1/2 z-40 flex flex-col gap-0 items-center group/nav">
        {/* Previous View */}
        <button
          onClick={() => changeView('prev')}
          className="w-10 h-10 rounded-full bg-white/5 light:bg-slate-200 backdrop-blur-md border border-white/10 light:border-slate-300 text-white/40 light:text-slate-500 shadow-lg hover:bg-white/10 light:hover:bg-slate-300 hover:text-white light:hover:text-slate-800 hover:scale-110 hover:border-white/30 active:scale-95 transition-all duration-300 flex items-center justify-center"
          title={t('app.previousView')}
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
        </button>

        {/* Indicator Dots (Optional context) */}
        <div className="flex flex-row gap-1 items-center py-0.5 opacity-0 group-hover/nav:opacity-100 transition-opacity duration-500">
          {navViews.map(v => (
            <div key={v} className={`w-1 h-1 rounded-full transition-all ${v === currentView ? 'bg-indigo-400 scale-125' : 'bg-slate-700'}`} />
          ))}
        </div>

        {/* Next View */}
        <button
          onClick={() => changeView('next')}
          className="w-10 h-10 rounded-full bg-white/5 light:bg-slate-200 backdrop-blur-md border border-white/10 light:border-slate-300 text-white/40 light:text-slate-500 shadow-lg hover:bg-white/10 light:hover:bg-slate-300 hover:text-white light:hover:text-slate-800 hover:scale-110 hover:border-white/30 active:scale-95 transition-all duration-300 flex items-center justify-center"
          title={t('app.nextView')}
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
          </svg>
        </button>
      </div>

      {/* Modal */}
      {quickPickOpen && <QuickPickModal onClose={() => setQuickPickOpen(false)} activeGameConfig={activeGameConfig} />}

      {/* Money Rain Effect */}
      {isRaining && (
        <MoneyRain
          key={rainKey}
          onComplete={() => setIsRaining(false)}
          playSound={playSound}
        />
      )}
    </div>

  );
}

export default App;
