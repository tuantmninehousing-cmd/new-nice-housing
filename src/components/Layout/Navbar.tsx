"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useLanguage, LANGUAGES } from '@/context/LanguageContext';
import { HOME_TEXT } from '@/data/nine';

interface NavbarProps {
    view?: string;
    goHome?: () => void;
    goList?: () => void;
}

export const HOTLINE = '0968.071.393';
export const HOTLINE_TEL = 'tel:0968071393';

const SECTIONS = [
    { id: 'gioi-thieu', key: 'intro' },
    { id: 'toa-nha', key: 'buildings' },
    { id: 'dat-phong', key: 'booking' },
    { id: 'khuyen-mai', key: 'promo' },
    { id: 'lien-he', key: 'contact' },
] as const;

export const Navbar: React.FC<NavbarProps> = ({ view, goHome }) => {
    const pathname = usePathname();
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const { language, setLanguage } = useLanguage();
    const nav = HOME_TEXT[language].nav;
    const isPromoPage = pathname?.startsWith('/blogs');

    useEffect(() => { document.body.style.overflow = isMenuOpen ? 'hidden' : ''; }, [isMenuOpen]);

    // Ở trang chủ: cuộn tới mục. Ở trang khác: Link sẽ chuyển về trang chủ kèm #mục.
    const onSectionClick = (id: string) => (e: React.MouseEvent) => {
        setIsMenuOpen(false);
        if (pathname !== '/') return;
        e.preventDefault();
        if (view && view !== 'home') goHome?.();
        window.setTimeout(() => {
            const el = document.getElementById(id);
            if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
            window.history.replaceState(null, '', `/#${id}`);
        }, view && view !== 'home' ? 120 : 0);
    };

    const onLogoClick = (e: React.MouseEvent) => {
        setIsMenuOpen(false);
        if (pathname !== '/') return;
        e.preventDefault();
        goHome?.();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const langSwitcher = (
        <div className="nh-langs" role="group" aria-label="Ngôn ngữ / Language">
            {LANGUAGES.map((l) => (
                <button
                    key={l.code}
                    type="button"
                    className={language === l.code ? 'on' : ''}
                    aria-pressed={language === l.code}
                    onClick={() => setLanguage(l.code)}
                >
                    {l.label}
                </button>
            ))}
        </div>
    );

    return (
        <>
            <nav className="nh-top">
                <Link href="/" className="nh-logo" aria-label="Nine Housing – Live your way" onClick={onLogoClick}>
                    <img src="/nine-logo.svg" alt="Nine Housing – Live your way" />
                </Link>
                <div className="nh-top-right desktop-actions">
                    <div className="nh-top-row">
                        {langSwitcher}
                        <a className="nh-hotline" href={HOTLINE_TEL}><i className="fa-solid fa-phone"></i> {HOTLINE}</a>
                    </div>
                    <div className="nh-menu" role="navigation" aria-label="Menu">
                        {SECTIONS.map((s) => (
                            <Link
                                key={s.id}
                                href={`/#${s.id}`}
                                className={s.key === 'promo' && isPromoPage ? 'active' : ''}
                                onClick={onSectionClick(s.id)}
                            >
                                {nav[s.key]}
                            </Link>
                        ))}
                    </div>
                </div>
                <div className="nh-mobile-bar">
                    {langSwitcher}
                    <button className="mobile-menu-btn" aria-label="Menu" onClick={() => setIsMenuOpen(true)}><i className="fa-solid fa-bars"></i></button>
                </div>
            </nav>

            <div className={`mobile-menu-overlay ${isMenuOpen ? 'open' : ''}`}>
                <div className="mobile-menu-header">
                    <Link href="/" className="nh-logo" onClick={onLogoClick}>
                        <img src="/nine-logo.svg" alt="Nine Housing" />
                    </Link>
                    <button className="mobile-menu-close" aria-label="Close" onClick={() => setIsMenuOpen(false)}><i className="fa-solid fa-xmark"></i></button>
                </div>
                <ul className="mobile-nav-links">
                    {SECTIONS.map((s) => (
                        <li key={s.id}><Link href={`/#${s.id}`} onClick={onSectionClick(s.id)}>{nav[s.key]}</Link></li>
                    ))}
                </ul>
                <div className="mobile-nav-actions" style={{ display: 'flex', flexDirection: 'column', gap: '18px', alignItems: 'center' }}>
                    {langSwitcher}
                    <a className="nh-hotline" href={HOTLINE_TEL}><i className="fa-solid fa-phone"></i> {HOTLINE}</a>
                </div>
            </div>
        </>
    );
};
