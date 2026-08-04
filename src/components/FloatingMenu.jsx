import React, { useState, useRef } from 'react';
import { useLanguage } from '../i18n/LanguageContext';

const FloatingMenu = ({ onToggleView, onQuickPick, onToggleTheme, onMoneyRain, onResetTheme, currentTheme = 0, playSound, isLightMode, activeGameLogo, onSwitchGame, onOpenSidebar }) => {
    const { t } = useLanguage();
    const [isOpen, setIsOpen] = useState(false);
    const pressTimer = useRef(null);
    const isLongPressHandled = useRef(false);

    // Style for the "Mood Shift" button
    const getNextThemeStyle = () => {
        const next = (currentTheme + 1) % 7;
        switch (next) {
            case 1: return "bg-pink-600 border-pink-400"; // Next: Cyberpunk
            case 2: return "bg-emerald-600 border-emerald-400"; // Next: Forest
            case 3: return "bg-blue-600 border-blue-400"; // Next: Ocean
            case 4: return "bg-orange-600 border-orange-400"; // Next: Sunset (Default)
            case 5: return "bg-teal-600 border-teal-400"; // Next: Mint
            case 6: return "bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500"; // Next: Rainbow
            case 0: return "bg-indigo-600 border-indigo-400"; // Next: Deep Space
            default: return "bg-slate-700";
        }
    };

    // Menu Items Configuration
    const menuItems = [
        // Operations
        { icon: "⚡", label: t('floatingMenu.flashPick'), action: onQuickPick, color: "bg-amber-500", delay: "delay-[75ms]" },
        {
            icon: "🎨",
            label: t('floatingMenu.moodShift'),
            action: onToggleTheme,
            longPressAction: onResetTheme,
            color: getNextThemeStyle(), // Dynamic Color
            delay: "delay-[100ms]"
        },
        { icon: "💸", label: t('floatingMenu.makeItRain'), action: onMoneyRain, color: "bg-emerald-600", delay: "delay-[125ms]" },

        // Game Switchers (Separator visual not needed, just color distinct)
        {
            icon: "🎱",
            label: t('floatingMenu.switchLotto649'),
            action: () => onSwitchGame && onSwitchGame('LOTTO649'),
            color: "bg-indigo-500",
            delay: "delay-[150ms]"
        },
        {
            icon: "💰",
            label: t('floatingMenu.switchSuperLotto'),
            action: () => onSwitchGame && onSwitchGame('SUPERLOTTO'),
            color: "bg-rose-500",
            delay: "delay-[175ms]"
        },
        {
            icon: "💵",
            label: t('floatingMenu.switchJinCai539'),
            action: () => onSwitchGame && onSwitchGame('539'),
            color: "bg-emerald-500",
            delay: "delay-[200ms]"
        },
    ];

    // Generic Item Press
    const handlePressStart = (item) => {
        isLongPressHandled.current = false;
        if (item.longPressAction) {
            pressTimer.current = setTimeout(() => {
                item.longPressAction();
                if (playSound) playSound('success');
                isLongPressHandled.current = true;
                setIsOpen(false);
            }, 800);
        }
    };

    // Main Button Press (Open Sidebar)
    const handleMainPressStart = () => {
        isLongPressHandled.current = false;
        pressTimer.current = setTimeout(() => {
            if (onOpenSidebar) {
                onOpenSidebar();
                if (playSound) playSound('success');
                isLongPressHandled.current = true;
                setIsOpen(false); // Ensure menu doesn't pop open
            }
        }, 800);
    };

    const handlePressEnd = () => {
        if (pressTimer.current) {
            clearTimeout(pressTimer.current);
            pressTimer.current = null;
        }
    };

    const handleClick = (item) => {
        if (isLongPressHandled.current) {
            isLongPressHandled.current = false;
            return;
        }
        if (playSound) playSound('click');
        setIsOpen(false);
        item.action();
    };

    const handleMainClick = () => {
        if (isLongPressHandled.current) {
            isLongPressHandled.current = false;
            return;
        }
        if (playSound) playSound('click');
        setIsOpen(!isOpen);
    };

    return (
        <div className="fixed bottom-8 left-8 z-50 flex flex-col-reverse items-start gap-4 font-sans">

            {/* The Main Trigger Button */}
            <button
                onPointerDown={handleMainPressStart}
                onPointerUp={handlePressEnd}
                onPointerLeave={handlePressEnd}
                onClick={handleMainClick}
                onMouseEnter={() => playSound && playSound('hover')}
                className={`
                    relative z-50 w-12 h-12 flex items-center justify-center text-xl shadow-2xl transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)]
                    ${isOpen
                        ? 'bg-slate-800 light:bg-white text-white light:text-slate-900 rotate-90 scale-110 animate-blob-pulse'
                        : 'bg-gradient-to-tr from-rose-400 to-orange-300 hover:animate-blob-wild animate-blob-pulse text-white'}
                    border-2 border-white/20 light:border-slate-300 ring-4 ring-white/10 light:ring-slate-300/30 outline-none
                `}
            >
                <span className="mb-0.5 filter drop-shadow-md">{isOpen ? '✕' : (activeGameLogo || '✨')}</span>
            </button>

            {/* Menu Items Layer */}
            <div className="absolute bottom-1 left-1 w-10 h-10 pointer-events-none">
                {menuItems.map((item, index) => {
                    // Calculate Fan Angle (0 to 90 degrees)
                    // We have 7 items. Let's fan them from 0 (Right) to 90 (Top).
                    const totalAngle = 100; // slightly more than 90 for spread
                    const count = menuItems.length;
                    const angleStep = totalAngle / (count - 1);
                    const currentAngle = (index * angleStep); // 0 to 100

                    const radius = 90; // Distance from center
                    const rad = (currentAngle * Math.PI) / 180;

                    const x = Math.round(radius * Math.cos(rad)); // X goes right
                    const y = Math.round(radius * Math.sin(rad)); // Y goes up (negative in CSS translate)

                    // Adjust for bottom-left corner origin
                    // Angles: 0 deg = Right, 90 deg = Top.
                    // Correct mapping:
                    // x is positive
                    // y is positive (translateY will be negative)

                    return (
                        <button
                            key={index}
                            onPointerDown={() => handlePressStart(item)}
                            onPointerUp={handlePressEnd}
                            onPointerLeave={handlePressEnd}
                            onClick={() => handleClick(item)}
                            onMouseEnter={() => playSound && playSound('hover')}
                            style={{
                                transform: isOpen
                                    ? `translate(${x}px, -${y}px) scale(1)`
                                    : `translate(0px, 0px) scale(0)`,
                            }}
                            className={`
                                absolute bottom-0 left-0 w-10 h-10 rounded-full flex items-center justify-center text-sm text-white shadow-lg border-2 border-white/20 light:border-white/50
                                transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] pointer-events-auto ${item.delay}
                                ${isOpen ? 'opacity-100' : 'opacity-0'}
                                ${item.color}
                                hover:scale-125 hover:brightness-110
                                active:scale-95
                                z-40
                            `}
                            title={item.label}
                        >
                            {item.icon}
                        </button>
                    );
                })}
            </div>

            {/* Backdrop Blur (Optional, covers screen when open? Maybe too intrusive. Let's keep it localized) */}
        </div>
    );
};

export default FloatingMenu;
