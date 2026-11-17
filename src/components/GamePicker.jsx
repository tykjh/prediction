import React from 'react';
import { useLanguage } from '../i18n/LanguageContext';
import { GAME_ORDER } from '../config/games';

// All three games are visible at once, so switching is one tap and the
// current game is always obvious.
const GamePicker = ({ activeGameID, onSwitchGame, className = '' }) => {
    const { t } = useLanguage();

    return (
        <div
            role="tablist"
            aria-label={t('shell.game.choose')}
            className={`flex rounded-xl border border-white/10 bg-white/[0.04] p-1 light:border-stone-200 light:bg-stone-100 ${className}`}
        >
            {GAME_ORDER.map((id) => {
                const active = id === activeGameID;
                return (
                    <button
                        key={id}
                        role="tab"
                        aria-selected={active}
                        onClick={() => onSwitchGame(id)}
                        className={`flex-1 whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${active
                            ? 'bg-stone-100 text-stone-900 light:bg-white light:shadow-sm'
                            : 'text-stone-400 hover:text-stone-100 light:text-stone-500 light:hover:text-stone-900'
                            }`}
                    >
                        {t(`shell.game.${id}`)}
                    </button>
                );
            })}
        </div>
    );
};

export default GamePicker;
