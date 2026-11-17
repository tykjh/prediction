import React from 'react';

const TEXT = {
    zh: {
        title: '出了點問題',
        body: '頁面遇到錯誤，重新整理通常就能恢復。',
        reload: '重新整理',
        reset: '重設顯示設定並重新整理',
        resetNote: '重設只會清除顯示設定，收藏的號碼會保留。',
    },
    en: {
        title: 'Something went wrong',
        body: 'The page ran into a problem. Reloading usually fixes it.',
        reload: 'Reload',
        reset: 'Reset settings and reload',
        resetNote: 'Resetting keeps your saved picks and only clears display settings.',
    },
};

const currentLang = () => {
    try {
        return localStorage.getItem('lottery_lang') === 'en' ? 'en' : 'zh';
    } catch {
        return 'zh';
    }
};

// Catches render errors anywhere below it and offers a way out instead of a
// blank page. It sits outside the language provider, so it carries its own text.
class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { error: null };
    }

    static getDerivedStateFromError(error) {
        return { error };
    }

    componentDidCatch(error, info) {
        console.error('App crashed:', error, info);
    }

    handleReset = () => {
        try {
            localStorage.removeItem('lottery_settings');
        } catch {
            // Storage unavailable: reloading is still worth trying.
        }
        window.location.reload();
    };

    render() {
        if (!this.state.error) return this.props.children;
        const text = TEXT[currentLang()];

        return (
            <div className="flex min-h-screen items-center justify-center bg-[#1d1c1a] p-6 text-stone-200">
                <div className="w-full max-w-md rounded-2xl border border-white/10 bg-white/[0.04] p-6">
                    <h1 className="text-xl font-bold text-stone-50">{text.title}</h1>
                    <p className="mt-2 text-sm leading-relaxed text-stone-400">{text.body}</p>
                    <div className="mt-6 flex flex-col gap-3">
                        <button
                            onClick={() => window.location.reload()}
                            className="rounded-xl bg-amber-500 px-4 py-2.5 text-sm font-semibold text-stone-900 hover:bg-amber-400"
                        >
                            {text.reload}
                        </button>
                        <button
                            onClick={this.handleReset}
                            className="rounded-xl border border-white/10 px-4 py-2.5 text-sm text-stone-300 hover:bg-white/10"
                        >
                            {text.reset}
                        </button>
                    </div>
                    <p className="mt-3 text-xs text-stone-500">{text.resetNote}</p>
                </div>
            </div>
        );
    }
}

export default ErrorBoundary;
