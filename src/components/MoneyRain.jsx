import React, { useEffect, useState } from 'react';

const MoneyRain = ({ onComplete, playSound }) => {
    const [money, setMoney] = useState([]);

    useEffect(() => {
        // Sound Loop
        const soundInterval = setInterval(() => {
            if (playSound && Math.random() > 0.4) { // 60% chance every 50ms (Slightly increased audio density)
                playSound('coin');
            }
        }, 50);

        // Generate random money particles with high density
        const emojis = ['💰', '💸', '💵', '🤑', '💎', '✨', '🪙'];
        const particleCount = 800; // Massively increased for 10s duration

        let maxDuration = 0;

        const newMoney = Array.from({ length: particleCount }).map((_, i) => {
            const duration = Math.random() * 1.5 + 2; // 2-3.5s fall duration (Fast)
            const delay = Math.random() * 7; // 0-7s delay spread (Continuous rain)

            // Track max duration to know when to stop
            const totalTime = duration + delay;
            if (totalTime > maxDuration) maxDuration = totalTime;

            return {
                id: i,
                emoji: emojis[Math.floor(Math.random() * emojis.length)],
                left: Math.random() * 100, // 0-100% width
                duration,
                delay,
                size: Math.random() * 2.5 + 1.5, // 1.5-4rem size (larger)
                rotation: Math.random() * 360, // Initial rotation
                zIndex: Math.floor(Math.random() * 50) + 100, // Depth
            };
        });
        setMoney(newMoney);

        // Infinite Rain: No auto-stop timer. User must click "Stop".
        // const timer = setTimeout(() => { ... });

        return () => {
            // clearTimeout(timer); // Removed since timer is no longer defined
            clearInterval(soundInterval);
        };
    }, [playSound, onComplete]);

    return (
        <div className="fixed inset-0 z-[100] overflow-hidden pointer-events-none">
            {/* Disco Background Layer */}
            <div className="absolute inset-0 animate-disco pointer-events-none"></div>

            {/* Stop Button (Interactive) */}
            <div className="absolute top-8 right-8 z-[200] pointer-events-auto">
                <button
                    onClick={onComplete}
                    className="bg-red-600 hover:bg-red-500 text-white font-black uppercase py-2 px-6 rounded-full border-4 border-white shadow-[0_0_20px_rgba(255,0,0,0.5)] active:scale-95 transition-all text-sm tracking-widest"
                >
                    Stop Rain 🛑
                </button>
            </div>

            {money.map((item) => (
                <div
                    key={item.id}
                    className="absolute top-[-100px] animate-fall drop-shadow-[0_0_10px_rgba(255,215,0,0.5)]"
                    style={{
                        left: `${item.left}%`,
                        fontSize: `${item.size}rem`,
                        animationDuration: `${item.duration}s`,
                        animationDelay: `${item.delay}s`,
                        transform: `rotate(${item.rotation}deg)`,
                        zIndex: item.zIndex,
                        opacity: 1,
                        textShadow: '0 0 10px rgba(255, 223, 0, 0.8)', // Gold glow
                    }}
                >
                    {item.emoji}
                </div>
            ))}
        </div>
    );
};

export default MoneyRain;
