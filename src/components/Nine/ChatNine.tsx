"use client";

import React, { useState } from 'react';
import { useLanguage } from '@/context/LanguageContext';
import { HOME_TEXT } from '@/data/nine';

const ZALO_URL = 'https://zalo.me/0968071393';
const TEL_URL = 'tel:0968071393';

// Nút chat cố định ở góc màn hình. Hiện tại dẫn khách sang Zalo / gọi hotline.
// Khi agent Nine sẵn sàng: gắn khung chat của Nine vào phần tử id="nine-chat-root" bên dưới.
export const ChatNine: React.FC = () => {
    const { language } = useLanguage();
    const c = HOME_TEXT[language].chat;
    const [open, setOpen] = useState(false);

    return (
        <div className="nh-chat">
            {open && (
                <div className="nh-chat-panel" role="dialog" aria-label={c.open}>
                    <div className="nh-chat-head">
                        <div className="nh-chat-avatar" aria-hidden="true">N</div>
                        <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 700 }}>{c.title}</div>
                            <div style={{ fontSize: '12px', color: '#B9C2D6' }}>{c.sub}</div>
                        </div>
                        <button type="button" className="nh-chat-close" aria-label={c.close} onClick={() => setOpen(false)}>×</button>
                    </div>
                    <div className="nh-chat-body" id="nine-chat-root">
                        <div className="nh-chat-bubble">{c.hello}</div>
                        <div className="nh-chat-actions">
                            <a href={ZALO_URL} target="_blank" rel="noopener noreferrer" className="nh-btn-gold">Zalo 0968.071.393</a>
                            <a href={TEL_URL} className="nh-btn-navy"><i className="fa-solid fa-phone"></i> 0968.071.393</a>
                        </div>
                    </div>
                </div>
            )}
            <button type="button" className="nh-chat-fab" onClick={() => setOpen(!open)} aria-expanded={open}>
                <span aria-hidden="true"><i className="fa-solid fa-comment-dots"></i></span>
                {c.open}
            </button>
        </div>
    );
};
