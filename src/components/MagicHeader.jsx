import React, { useState, useRef } from 'react';

const MagicHeader = ({ title, subtitle, icon, themeIndex = 0, isLightMode = false, reducedMotion = false }) => {
    const cardRef = useRef(null);
    const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
    const [isHovering, setIsHovering] = useState(false);

    const handleMouseMove = (e) => {
        if (!cardRef.current || reducedMotion) return;
        const rect = cardRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        setMousePosition({ x, y });
    };

    // Colors mapping based on App.jsx theme index
    // 0: Deep Space (Indigo/Violet)
    // 1: Cyberpunk (Pink/Yellow)
    // 2: Forest (Emerald/Lime)
    // 3: Ocean (Blue/Cyan)
    // 4: Sunset (Orange/Red)
    // 5: Mint (Teal/Cyan)
    // 6: Rainbow (Multi-color)

    const getColorConfig = (index) => {
        switch (index) {
            case 1: // Cyberpunk
                return {
                    bgFrom: 'from-pink-500/5 light:from-pink-500/20',
                    lineVia: 'via-pink-300 light:via-pink-500',
                    shadow: 'shadow-pink-500/20',
                    textVia: 'via-pink-200 light:via-pink-600',
                    glow: 'rgba(236,72,153,0.6)', // Pink glow
                };
            case 2: // Forest
                return {
                    bgFrom: 'from-emerald-500/5 light:from-emerald-500/20',
                    lineVia: 'via-emerald-300 light:via-emerald-600',
                    shadow: 'shadow-emerald-500/20',
                    textVia: 'via-emerald-200 light:via-emerald-700',
                    glow: 'rgba(16,185,129,0.6)', // Emerald glow
                };
            case 3: // Ocean
                return {
                    bgFrom: 'from-blue-500/5 light:from-blue-500/20',
                    lineVia: 'via-blue-300 light:via-blue-600',
                    shadow: 'shadow-blue-500/20',
                    textVia: 'via-blue-200 light:via-blue-700',
                    glow: 'rgba(59,130,246,0.6)', // Blue glow
                };
            case 4: // Sunset (Orange)
                return {
                    bgFrom: 'from-orange-500/5 light:from-orange-500/20',
                    lineVia: 'via-orange-300 light:via-orange-600',
                    shadow: 'shadow-orange-500/20',
                    textVia: 'via-orange-200 light:via-orange-700',
                    glow: 'rgba(249,115,22,0.6)', // Orange glow
                };
            case 5: // Mint
                return {
                    bgFrom: 'from-teal-500/5 light:from-teal-500/20',
                    lineVia: 'via-teal-300 light:via-teal-600',
                    shadow: 'shadow-teal-500/20',
                    textVia: 'via-teal-200 light:via-teal-700',
                    glow: 'rgba(20,184,166,0.6)', // Teal glow
                };
            case 6: // Rainbow
                return {
                    bgFrom: 'from-fuchsia-500/5 light:from-fuchsia-500/20',
                    lineVia: 'via-fuchsia-300 light:via-fuchsia-600',
                    shadow: 'shadow-fuchsia-500/20',
                    textVia: 'via-yellow-200 light:via-purple-700',
                    glow: 'rgba(255,255,255,0.8)', // White/Prismatic glow
                };
            case 0: // Deep Space (Default)
            default:
                return {
                    bgFrom: 'from-indigo-500/5 light:from-indigo-500/20',
                    lineVia: 'via-indigo-300 light:via-indigo-600',
                    shadow: 'shadow-indigo-500/20',
                    textVia: 'via-indigo-100 light:via-indigo-700',
                    glow: 'rgba(129,140,248,0.6)', // Indigo glow
                };
        }
    };

    const c = getColorConfig(themeIndex);



    return (
        <header
            ref={cardRef}
            onMouseMove={handleMouseMove}
            onMouseEnter={() => !reducedMotion && setIsHovering(true)}
            onMouseLeave={() => !reducedMotion && setIsHovering(false)}
            className="relative py-10 sm:py-16 px-4 text-center rounded-[2rem] bg-slate-950/30 light:bg-white/40 border border-white/10 light:border-slate-300/50 overflow-hidden backdrop-blur-sm group transition-all duration-500 hover:border-white/20 light:hover:border-slate-400"
        >
            {/* 1. Base Gradient */}
            <div className={`absolute inset-0 bg-gradient-to-b ${c.bgFrom} to-transparent opacity-50`}></div>

            {/* Render Mouse Effects ONLY if Reduced Motion is OFF */}
            {!reducedMotion && (
                <>
                    {/* 2. Magical Mouse Glow Spotlight (Only the Dot) */}
                    <div
                        className="absolute pointer-events-none transition-opacity duration-200 blur-[40px]"
                        style={{
                            background: `radial-gradient(circle at center, ${c.glow}, transparent 70%)`,
                            width: '300px', // Slightly smaller for tighter control
                            height: '300px',
                            left: `${mousePosition.x - 150}px`,
                            top: `${mousePosition.y - 150}px`,
                            opacity: isHovering ? 0.5 : 0,
                        }}
                    />

                    {/* 3. Bright Cursor Dot (Synced Glow) */}
                    <div
                        className="absolute w-1.5 h-1.5 bg-white rounded-full pointer-events-none transition-opacity duration-200 z-50"
                        style={{
                            left: `${mousePosition.x}px`,
                            top: `${mousePosition.y}px`,
                            transform: 'translate(-50%, -50%)',
                            opacity: isHovering ? 1 : 0,
                            boxShadow: `0 0 15px 2px ${c.glow}` // Synced with theme
                        }}
                    />

                    {/* 4. Mouse Follow Line (Top) */}
                    <div
                        className={`absolute top-0 h-[1px] w-96 bg-gradient-to-r from-transparent ${c.lineVia} to-transparent opacity-50 transition-all duration-100 ease-out`}
                        style={{
                            left: isHovering ? `${mousePosition.x - 192}px` : '50%',
                            transform: isHovering ? 'none' : 'translateX(-50%)',
                            width: isHovering ? '384px' : '384px'
                        }}
                    ></div>
                </>
            )}

            {/* Content */}
            <div className={`relative z-10 w-16 h-16 sm:w-24 sm:h-24 bg-gradient-to-br from-slate-900 to-slate-950 light:from-white light:to-slate-100 rounded-3xl flex items-center justify-center text-3xl sm:text-5xl mx-auto mb-4 sm:mb-6 shadow-2xl border border-white/10 light:border-slate-200 group-hover:scale-105 ${c.shadow} transition-all duration-500`}>
                {icon}
            </div>

            <h1 className={`relative z-10 text-3xl sm:text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white light:from-slate-800 ${c.textVia} to-slate-400 light:to-slate-500 mb-3 sm:mb-4 tracking-tight drop-shadow-sm break-words`}>
                {title}
            </h1>

            <p className="relative z-10 text-slate-400 light:text-slate-600 text-xs sm:text-sm font-medium max-w-lg mx-auto leading-relaxed tracking-wide">
                {subtitle}
            </p>

            {/* Shine effect that moves across on hover entry */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent skew-x-12 translate-x-[-150%] group-hover:animate-shine pointer-events-none"></div>
        </header>
    );
};

export default MagicHeader;
