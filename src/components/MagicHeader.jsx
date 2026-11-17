import React from 'react';

// Page heading. It used to be an animated hero card; it is now a plain title
// so the content below it starts higher on the screen. The extra props are
// still accepted so existing callers do not need to change.
const MagicHeader = ({ title, subtitle, icon }) => (
    <header className="px-1 pt-1 sm:pt-2">
        <h1 className="flex items-center gap-2.5 text-2xl sm:text-3xl font-bold tracking-tight text-stone-50 light:text-stone-900">
            {icon && <span className="text-xl sm:text-2xl" aria-hidden="true">{icon}</span>}
            <span>{title}</span>
        </h1>
        {subtitle && (
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-stone-400 light:text-stone-600">
                {subtitle}
            </p>
        )}
    </header>
);

export default MagicHeader;
