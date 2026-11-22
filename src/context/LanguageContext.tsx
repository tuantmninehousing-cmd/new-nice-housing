"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import en from '../i18n/en.json';
import vi from '../i18n/vi.json';
import ja from '../i18n/ja.json';
import ko from '../i18n/ko.json';

export type Language = 'vi' | 'en' | 'ja' | 'ko';
export const LANGUAGES: { code: Language; label: string }[] = [
    { code: 'vi', label: 'VI' },
    { code: 'en', label: 'EN' },
    { code: 'ja', label: '日本語' },
    { code: 'ko', label: '한국어' },
];

interface LanguageContextProps {
    language: Language;
    setLanguage: (lang: Language) => void;
    t: (key: string, vars?: Record<string, string | number>) => string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const dictionaries: Record<Language, any> = { en, vi, ja, ko };

const isLanguage = (v: unknown): v is Language => v === 'vi' || v === 'en' || v === 'ja' || v === 'ko';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const lookup = (dict: any, key: string): unknown => {
    let current = dict;
    for (const k of key.split('.')) {
        if (current == null || current[k] === undefined) return undefined;
        current = current[k];
    }
    return current;
};

const LanguageContext = createContext<LanguageContextProps | undefined>(undefined);

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
    const [language, setLanguageState] = useState<Language>('vi');

    useEffect(() => {
        const savedLang = localStorage.getItem('appLang');
        if (isLanguage(savedLang)) {
            setLanguageState(savedLang);
            return;
        }
        // Lần đầu vào trang: chọn theo ngôn ngữ trình duyệt của khách
        const nav = (navigator.language || '').toLowerCase();
        if (nav.startsWith('ja')) setLanguageState('ja');
        else if (nav.startsWith('ko')) setLanguageState('ko');
        else if (nav && !nav.startsWith('vi')) setLanguageState('en');
    }, []);

    useEffect(() => {
        if (typeof document !== 'undefined') {
            document.documentElement.lang = language;
        }
    }, [language]);

    // Memoize setLanguage so its reference stays stable
    const setLanguage = React.useCallback((lang: Language) => {
        setLanguageState(lang);
        localStorage.setItem('appLang', lang);
    }, []);

    // Memoize t so its reference only changes when language changes.
    // Tiếng Nhật / Hàn thiếu khóa nào thì dùng tiếng Anh.
    const t = React.useCallback((key: string, vars?: Record<string, string | number>): string => {
        let found = lookup(dictionaries[language], key);
        if (found === undefined && (language === 'ja' || language === 'ko')) found = lookup(dictionaries.en, key);
        if (typeof found !== 'string') return key;
        let str = found;
        if (vars) {
            Object.entries(vars).forEach(([k, v]) => {
                str = str.replace(new RegExp(`\\{\\{${k}\\}\\}`, 'g'), String(v));
            });
        }
        return str;
    }, [language]);

    // Memoize context value to prevent unnecessary consumer re-renders
    const contextValue = React.useMemo(
        () => ({ language, setLanguage, t }),
        [language, setLanguage, t]
    );

    // Always render Provider so t() resolves keys from first paint (no more "common.home" raw keys)
    // Server & client both start with 'en' → no hydration mismatch
    return (
        <LanguageContext.Provider value={contextValue}>
            {children}
        </LanguageContext.Provider>
    );
};

export const useLanguage = () => {
    const context = useContext(LanguageContext);
    if (!context) {
        return {
            language: 'en' as Language,
            setLanguage: () => { },
            t: (key: string) => key,
        };
    }
    return context;
};
