import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useLanguage } from '@/context/LanguageContext';
import { HOME_TEXT } from '@/data/nine';
import { HOTLINE, HOTLINE_TEL } from './Navbar';
import { ChatNine } from '../Nine/ChatNine';

interface FooterProps {
    goList?: () => void;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const Footer: React.FC<FooterProps> = (_props) => {
    const { t, language } = useLanguage();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [settings, setSettings] = useState<any>(null);
    const nav = HOME_TEXT[language].nav;

    useEffect(() => {
        fetch('/api/settings')
            .then(res => res.json())
            .then(data => {
                if (data && !data.error) setSettings(data);
            })
            .catch(console.error);
    }, []);

    const address = language === 'vi'
        ? (settings?.address_value_vi || t('footer.address_value'))
        : (settings?.address_value_en || t('footer.address_value'));
    const email = settings?.email_value || '';

    return (
        <>
            <footer className="nh-footer">
                <div className="footer-grid">
                    <div>
                        <div style={{ marginBottom: '16px' }}>
                            <img src="/nine-logo.svg" alt="Nine Housing – Live your way" style={{ height: '84px', width: 'auto' }} />
                        </div>
                        <div className="footer-desc">{t('footer.desc')}</div>
                    </div>
                    <div className="footer-col">
                        <h5>Nine Housing</h5>
                        <Link href="/#gioi-thieu">{nav.intro}</Link>
                        <Link href="/#toa-nha">{nav.buildings}</Link>
                        <Link href="/#dat-phong">{nav.booking}</Link>
                        <Link href="/blogs">{nav.promo}</Link>
                    </div>
                    <div className="footer-col">
                        <h5>{t('common.contact_support')}</h5>
                        <Link href="/#lien-he">{nav.contact}</Link>
                        <Link href="/policy">{t('common.policy')}</Link>
                        <Link href="/terms">{t('common.terms')}</Link>
                    </div>
                    <div className="footer-col" style={{ flex: 1.5, minWidth: '250px' }}>
                        <h5>{t('footer.contact_info')}</h5>
                        <p className="nh-footer-line">
                            <i className="fa-solid fa-location-dot" style={{ marginTop: '4px' }}></i>
                            <span>{address}</span>
                        </p>
                        <p className="nh-footer-line">
                            <i className="fa-solid fa-phone" style={{ marginTop: '4px' }}></i>
                            <a href={HOTLINE_TEL}>{HOTLINE}</a>
                        </p>
                        {email && (
                            <p className="nh-footer-line">
                                <i className="fa-regular fa-envelope" style={{ marginTop: '4px' }}></i>
                                <a href={`mailto:${email}`}>{email}</a>
                            </p>
                        )}
                    </div>
                </div>
                <div className="footer-bottom">
                    <div className="nh-footer-tag">Nine Housing · Live your way</div>
                    <div className="footer-copy">{t('footer.copyright')}</div>
                </div>
            </footer>
            <ChatNine />
        </>
    );
};
