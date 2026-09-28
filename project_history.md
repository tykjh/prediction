# Developer Activity Log

A chronological record of your work and accomplishments on the project.

> **Format note**: Entries are grouped by date (newest first), each with a `Time:` stamp (from the commit timestamp) and bullets tagged by change type — `Added` / `Changed` / `Fixed` / `Docs` / `Removed` — following the [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) convention. Routine automated data-sync commits (`chore: auto-update ... data`) are intentionally omitted here; they're already tracked in full in `git log` and don't reflect development work.

---

## 📅 2026-08-07

### 📱 Mobile-Friendly TopBar & Workspace
*Time: 00:05 – 00:17*
- **Changed**: Rebuilt `TopBar.jsx` for small screens — collapsed the navigation into a mobile-friendly layout and removed the side nav arrows, trimming ~50 lines of now-redundant logic out of `App.jsx`. ([a291be8])
- **Changed**: Applied responsive spacing/sizing adjustments to `InputSection`, `MagicHeader`, and `Workspace` so the main panel lays out correctly on phone widths. ([b84e829])
- **Added**: Restored the right-middle previous/next view arrow buttons in `App.jsx` after user feedback that they were still needed following the mobile nav cleanup. ([cf89a7d])

---

## 📅 2026-08-04

### 🌐 Bilingual UI & Operation Manual
*Time: 13:32 – 22:50*
- **Added**: Introduced full EN/繁中 bilingual support — a language switcher in the top bar plus translation dictionaries (`src/i18n/dict/*`) for the sidebar, TopBar, Prophet, Slot Machine, Trend Lines, Zone Radar, Zone Two Lab/Hybrid, Quick Pick Modal, and Prediction Row (~2,400 lines added across 76 files). ([b10d4a7])
- **Added**: Wrote an operation manual (`manual.js`) and per-panel help icons, translated into both languages, covering Backtest Lab, Backtest Lab Hybrid/Prophet, Chain Reactor, Chaos Hunter, Matrix Grid, Monte Carlo, Prophet, and Zone Two Lab. ([03b6269])

---

## 📅 2026-08-02

### 🛠️ Data Pipeline Hardening
*Time: 13:45 – 14:18*
- **Added**: Supported a manual `?month=` query override on the update endpoint to backfill lottery data gaps. ([3e9f053])
- **Fixed**: Fixed a hardcoded pick-count bug in `MonteCarlo.jsx` and `Prophet.jsx` that assumed a fixed number of picks regardless of game type. ([6e937ed])
- **Changed**: Hardened `taiwanLotteryApi.js` and `update-lottery.js` against malformed/incomplete API responses so a bad upstream payload can no longer corrupt stored draw history. ([6e937ed])

---

## 📅 2026-07-30

### ⏱️ Automated Daily Data Updates
*Time: 23:48 – 23:49*
- **Added**: Set up a daily auto-update pipeline for lottery draw results via Vercel Cron (`api/update-lottery.js`, `api/_lib/taiwanLotteryApi.js`, `api/_lib/githubContents.js`), which since this date has kept `539`, `LOTTO649`, and `SUPERLOTTO` history in sync automatically (see the recurring `chore: auto-update` commits in `git log`). ([429dfd1])
- **Changed**: Refreshed the bundled lottery history to the latest available draw (115/04/27) ahead of enabling automation. ([c8dc5f3])

---

## 📅 2026-01-25 ~ 02-06

### 🚀 Vercel Deployment & Pre-Automation Data Refreshes
*Time: 20:38 (01-25)*
- **Added**: Landed the initial commit for Vercel deployment, bringing the full early-stage app (Slot Machine, Chaos Lab, four fortune-temple datasets, prediction/algorithm utilities, LSTM model scaffold, secure RNG) into this deployment-ready repo. ([6ed2b15])
- **Changed**: Manually refreshed lottery data twice (115/02/05, 115/02/06) before the automated cron pipeline existed. ([a80fd30], [51e1386])

---

## 📅 2026-01-20

### 🎰 Slot Machine 2.0 & Casino Physics
*Time: 14:30*
- **Upgraded to 5-Reel Engine**: Expanded the Slot Machine from 3 to 5 reels, implementing standard "Left-to-Right" consecutive matching logic with Wild card support.
- **Infinite Economy (BigInt)**: Refactored the entire monetary system to use `BigInt`, allowing for quadrillion-dollar bets and 100% precise payouts without floating-point errors.
- **Tiered Celebration System**: Implemented visual tiers for wins:
    -   *Standard*: Base feedback.
    -   *High*: Party Confetti.
    -   *Jackpot*: **Infinite Money Rain** (with interactive "Stop" control).
- **Advanced Controls**: Added "Custom Input" fields for both Recharging and Betting, now offering massive 2.5x wide inputs for high-roller ease.
- **Smart Net Win**: Updated the UI to display "Net Profit" (Win - Bet) per round, persisting the result until the next spin.
- **Fair Mechanics**: Fixed "Hold" logic to be available after every spin (even losses) and corrected Gamble penalties to prevent double-deduction.

### ⚛️ Chaos Lab Stability
*Time: 14:15*
- **Fixed Double Pendulum**: Solved a critical "Canvas Shrink" bug where the simulation would collapse to zero width due to layout thrashing.
- **Optimized Rendering**: Implemented `ResizeObserver` and absolute positioning to decouple the physics canvas from the parent container's flow.

---

## 📅 2026-01-18

### 🧪 Hybrid Prediction Stats & Backtest Lab
*Time: 04:37*
- **Built the Hybrid Evolution Lab**: Created a sophisticated new testing environment (`BacktestLabHybrid`) to fine-tune the Hybrid Strategy.
- **Implemented Configurable Strategies**: Added a "Config Deck" allowing independent tuning of 5 Hybrid columns (Hot/Cold counts, Trend Depth, Weight Decays).
- **Added Visualization**: Integrated "Jackpot" rainbow animations and detailed H/C/N (Hot/Cold/Neutral) probability stats for every prediction.
- **Refactored Core Logic**: Updated `prediction.js` to handle complex configuration objects.

---

## 📅 2026-01-17

### 💸 Enhanced Backtest Multi-Bet System
*Time: 15:34*
- **Unlocked Unlimited Bets**: Removed limits on "Hybrid" and "Monte Carlo" bet counts, allowing massive batch simulations.
- **Optimized Scoring**: Updated the Backtest engine to evaluate *all* generated bets and track the "Best Performing Ticket" for accurate quality assessment.
- **Improved UI**: Added toggle controls in results cells to inspect individual tickets within a batch.

### 💾 Data Persistence & Algorithm Tuning
*Time: 09:36*
- **Implemented Auto-Save**: Added `localStorage` synchronization so user-entered draw data survives page refreshes.
- **Refined Data Entry**: Enforced strict 9-digit Period validation and added "Smart Date Formatting" (typing `1150117` -> `115/01/17`).
- **Tuned the Algorithm**: Adjusted the weighting logic to award 1.0 points for hits in the "Recent 100" draws and 0.5 points for older history, sharpening the model's focus on recent trends.

### 🎨 Oracle Card Visibility (Light Mode)
*Time: 08:18*
- **Fixed Light Mode**: Adjusted text colors and background gradients for "Great Luck" (Red/Gold) and "Ominous" (Grey) cards to ensure they are readable when the app is in Light Mode.

---

## 📅 2026-01-13 ~ 01-17

### ⛩️ Integrated Four Great Fortune Temples
- **Expanded the Oracle**: Successfully integrated 4 distinct fortune-telling traditions into the Divination Room.
    1.  **Lei Yu Shi (雷雨師)**: Added 100 poems with rich metadata (Holy Intent, Stories).
    2.  **60 Jia Zi (六十甲子)**: Added 60 poems with a custom Indigo/Purple theme.
    3.  **Penghu Tianhou (澎湖天后宮)**: Added 100 poems with an Emerald/Teal theme.
    4.  **Guanyin (觀音)**: Initialized the classic 100 poem set.
- **Built Data Pipelines**: Wrote Python parsers to convert raw text files into structured JavaScript modules.
- **Dynamic UI**: Created a "Source Toggle" system to switch themes and data sources instantly.

---

## 📅 2026-01-11

### 🔮 Two-Stage Fortune Drawing & Sonic System
*Time: 04:22*
- **Created a Ritual**: Implemented a "True Random" 2-stage drawing process (Hardware RNG -> User Selection of Bamboo Stick) to add ceremonial weight to fortune telling.
- **Added Sound**: Integrated a Web Audio API engine (`synth.js`) to provide auditory feedback (clicks, success chords, sweeping delete sounds) for a premium feel.
- **Polished UX**: Added "Magical Header" glow effects and revamped the navigation system.

---

## 📅 2026-01-10

### 🔗 The Chain Reactor & Floating Menu
*Time: 05:14*
- **Analyzed Chains**: Built "The Chain Reactor" lab to analyze Consecutive Number patterns (e.g., 12-13).
- **Added Floating Menu**: Implemented a persistent "FAB" (Floating Action Button) in the bottom-left for quick access to tools without cluttering the header.

---

## 📅 2026-01-09

### 🚀 Initial Project Launch
*Time: 15:22*
- **Initialized the App**: Set up the Vite + React + Tailwind project structure.
- **Designed Core UI**: Built the "Glassmorphism" dark theme aesthetic.
- **Implemented Core Logic**: Coded the "Weighted Recency" algorithm and the "Hot/Cold" analysis engine.
- **Built Foundation**: Created the Input, History, and Statistics components.

<!-- Commit reference links -->
[cf89a7d]: https://github.com/tykjh/prediction/commit/cf89a7d
[a291be8]: https://github.com/tykjh/prediction/commit/a291be8
[b84e829]: https://github.com/tykjh/prediction/commit/b84e829
[b10d4a7]: https://github.com/tykjh/prediction/commit/b10d4a7
[03b6269]: https://github.com/tykjh/prediction/commit/03b6269
[3e9f053]: https://github.com/tykjh/prediction/commit/3e9f053
[6e937ed]: https://github.com/tykjh/prediction/commit/6e937ed
[429dfd1]: https://github.com/tykjh/prediction/commit/429dfd1
[c8dc5f3]: https://github.com/tykjh/prediction/commit/c8dc5f3
[6ed2b15]: https://github.com/tykjh/prediction/commit/6ed2b15
[a80fd30]: https://github.com/tykjh/prediction/commit/a80fd30
[51e1386]: https://github.com/tykjh/prediction/commit/51e1386

