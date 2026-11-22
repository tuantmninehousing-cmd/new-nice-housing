"use client";

import React, { useEffect, useRef, useState } from 'react';
import { useLanguage } from '@/context/LanguageContext';
import { HOME_TEXT } from '@/data/nine';

const ZALO_URL = 'https://zalo.me/0968071393';
const TEL_URL = 'tel:0968071393';
const STORE_KEY = 'nineChatV1';

interface Msg { role: 'user' | 'assistant'; content: string }

const UI = {
    typing: { vi: 'Nine đang trả lời…', en: 'Nine is typing…', ja: 'Nineが入力中…', ko: 'Nine이 입력 중…' },
    error: {
        vi: 'Em chưa gửi được tin. Anh/chị thử lại hoặc nhắn Zalo 0968.071.393 giúp em nhé.',
        en: 'Your message could not be sent. Please try again or contact us on Zalo 0968.071.393.',
        ja: '送信できませんでした。もう一度お試しいただくか、Zalo 0968.071.393 までご連絡ください。',
        ko: '메시지를 보내지 못했습니다. 다시 시도하시거나 Zalo 0968.071.393으로 연락해 주세요.',
    },
    note: {
        vi: 'Nine là trợ lý AI. Nội dung chat được gửi cho lễ tân Nine Housing để hỗ trợ anh/chị.',
        en: 'Nine is an AI assistant. This chat is shared with the Nine Housing front desk so they can help you.',
        ja: 'NineはAIアシスタントです。チャット内容はNine Housingのスタッフに共有されます。',
        ko: 'Nine은 AI 도우미입니다. 채팅 내용은 Nine Housing 프런트에 공유됩니다.',
    },
} as const;

const newId = () => Math.random().toString(36).slice(2, 8);

// Nút chat cố định ở góc màn hình: khách nhắn, Nine (Claude) trả lời qua /api/nine-chat,
// nội dung tư vấn được máy chủ gửi về nhóm Telegram CSKH.
export const ChatNine: React.FC = () => {
    const { language } = useLanguage();
    const c = HOME_TEXT[language].chat;
    const [open, setOpen] = useState(false);
    const [msgs, setMsgs] = useState<Msg[]>([]);
    const [text, setText] = useState('');
    const [busy, setBusy] = useState(false);
    const [failed, setFailed] = useState(false);
    const sid = useRef('');
    const endRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        try {
            const saved = JSON.parse(sessionStorage.getItem(STORE_KEY) || 'null');
            if (saved && Array.isArray(saved.msgs)) { sid.current = saved.sid || newId(); setMsgs(saved.msgs.slice(-30)); return; }
        } catch { /* bỏ qua */ }
        sid.current = newId();
    }, []);

    useEffect(() => {
        try { sessionStorage.setItem(STORE_KEY, JSON.stringify({ sid: sid.current, msgs })); } catch { /* bỏ qua */ }
        endRef.current?.scrollIntoView({ block: 'end' });
    }, [msgs, busy, open]);

    const send = async (raw: string) => {
        const content = raw.trim().slice(0, 1000);
        if (!content || busy) return;
        const next: Msg[] = [...msgs, { role: 'user', content }];
        setMsgs(next);
        setText('');
        setBusy(true);
        setFailed(false);
        try {
            const res = await fetch('/api/nine-chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sessionId: sid.current, lang: language, messages: next }),
            });
            const data = await res.json();
            if (!res.ok || !data.reply) throw new Error('no reply');
            setMsgs([...next, { role: 'assistant', content: String(data.reply) }]);
        } catch {
            setFailed(true);
        } finally {
            setBusy(false);
        }
    };

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
                        <a className="nh-chat-icon" href={ZALO_URL} target="_blank" rel="noopener noreferrer" aria-label="Zalo">Zalo</a>
                        <a className="nh-chat-icon" href={TEL_URL} aria-label="Hotline"><i className="fa-solid fa-phone"></i></a>
                        <button type="button" className="nh-chat-close" aria-label={c.close} onClick={() => setOpen(false)}>×</button>
                    </div>
                    <div className="nh-chat-body" id="nine-chat-root" aria-live="polite">
                        <div className="nh-chat-bubble">{c.hello}</div>
                        {msgs.length === 0 && (
                            <div className="nh-chat-chips">
                                {c.chips.map((chip) => (
                                    <button key={chip} type="button" disabled={busy} onClick={() => send(chip)}>{chip}</button>
                                ))}
                            </div>
                        )}
                        {msgs.map((m, i) => (
                            <div key={i} className={m.role === 'user' ? 'nh-chat-bubble me' : 'nh-chat-bubble'}>{m.content}</div>
                        ))}
                        {busy && <div className="nh-chat-bubble typing">{UI.typing[language]}</div>}
                        {failed && <div className="nh-chat-bubble err">{UI.error[language]}</div>}
                        <div ref={endRef}></div>
                    </div>
                    <form className="nh-chat-form" onSubmit={(e) => { e.preventDefault(); send(text); }}>
                        <input
                            className="nh-chat-input"
                            value={text}
                            onChange={(e) => setText(e.target.value)}
                            placeholder={c.ph}
                            aria-label={c.ph}
                            maxLength={1000}
                        />
                        <button type="submit" className="nh-btn-gold" disabled={busy || !text.trim()}>{c.send}</button>
                    </form>
                    <p className="nh-chat-note">{UI.note[language]}</p>
                </div>
            )}
            <button type="button" className="nh-chat-fab" onClick={() => setOpen(!open)} aria-expanded={open}>
                <span aria-hidden="true"><i className="fa-solid fa-comment-dots"></i></span>
                {c.open}
            </button>
        </div>
    );
};
