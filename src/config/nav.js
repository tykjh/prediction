// Main pages, in the order they appear in the navigation.
export const NAV_ITEMS = [
    { id: 'workspace', icon: '🎯', labelKey: 'shell.nav.pick' },
    { id: 'test-area', icon: '🧪', labelKey: 'shell.nav.labs' },
    { id: 'backtest', icon: '📊', labelKey: 'shell.nav.backtest' },
    { id: 'playground', icon: '🎡', labelKey: 'shell.nav.playground' },
];

export const NAV_IDS = NAV_ITEMS.map((item) => item.id);
