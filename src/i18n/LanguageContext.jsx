import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { translations } from './translations';

const STORAGE_KEY = 'lottery_lang';

const LanguageContext = createContext(null);

const resolveKey = (dict, key) => {
    return key.split('.').reduce((acc, part) => (acc && acc[part] !== undefined ? acc[part] : undefined), dict);
};

const interpolate = (str, vars) => {
    if (!vars) return str;
    return str.replace(/\{(\w+)\}/g, (match, name) => (vars[name] !== undefined ? vars[name] : match));
};

export const LanguageProvider = ({ children }) => {
    const [lang, setLang] = useState(() => {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved === 'en' || saved === 'zh') return saved;
        } catch {
            // Storage blocked: fall through to the browser language.
        }
        return navigator.language?.startsWith('zh') ? 'zh' : 'en';
    });

    useEffect(() => {
        try {
            localStorage.setItem(STORAGE_KEY, lang);
        } catch {
            // Not being able to remember the language is not fatal.
        }
        document.documentElement.lang = lang === 'zh' ? 'zh-Hant' : 'en';
    }, [lang]);

    const toggleLang = useCallback(() => {
        setLang(prev => (prev === 'zh' ? 'en' : 'zh'));
    }, []);

    const t = useCallback((key, vars) => {
        const value = resolveKey(translations[lang], key) ?? resolveKey(translations.en, key);
        if (value === undefined) return key;
        return interpolate(value, vars);
    }, [lang]);

    return (
        <LanguageContext.Provider value={{ lang, setLang, toggleLang, t }}>
            {children}
        </LanguageContext.Provider>
    );
};

export const useLanguage = () => {
    const ctx = useContext(LanguageContext);
    if (!ctx) throw new Error('useLanguage must be used within a LanguageProvider');
    return ctx;
};
