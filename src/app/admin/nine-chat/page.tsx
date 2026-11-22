"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronLeft, MessageCircle, Send, Bot, Save } from "lucide-react";

interface State {
  has_anthropic_key: boolean;
  has_telegram_token: boolean;
  telegram_chat_id: string;
  model: string;
  extra_notes: string;
}

const hint: React.CSSProperties = { fontSize: "12px", color: "#64748b", margin: "4px 0 8px", lineHeight: 1.5 };
const btn: React.CSSProperties = { padding: "10px 16px", borderRadius: 8, border: "1px solid #cbd5e1", background: "#fff", cursor: "pointer", fontWeight: 600, fontSize: 13 };
const btnMain: React.CSSProperties = { ...btn, background: "#1B2541", color: "#F2CD6B", border: "1px solid #1B2541" };

export default function AdminNineChatPage() {
  const [state, setState] = useState<State | null>(null);
  const [anthropicKey, setAnthropicKey] = useState("");
  const [telegramToken, setTelegramToken] = useState("");
  const [chatId, setChatId] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [groups, setGroups] = useState<{ id: string; title: string }[]>([]);
  const [botInfo, setBotInfo] = useState<{ name: string; username: string; webhook_host: string; pending: number; last_error: string } | null>(null);

  const load = () =>
    fetch("/api/admin/nine-chat")
      .then((r) => r.json())
      .then((d: State & { error?: string }) => {
        if (d && !d.error) {
          setState(d);
          setChatId(d.telegram_chat_id);
          setNotes(d.extra_notes);
        }
      })
      .catch(() => setMsg({ ok: false, text: "Không tải được cài đặt." }));

  useEffect(() => { load(); }, []);

  const call = async (payload: Record<string, unknown>) => {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/admin/nine-chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      return await res.json();
    } catch {
      return { ok: false, error: "Lỗi mạng" };
    } finally {
      setBusy(false);
    }
  };

  const save = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const d = await call({ action: "save", anthropic_key: anthropicKey, telegram_token: telegramToken, telegram_chat_id: chatId, extra_notes: notes });
    if (d.ok) {
      setState(d.state);
      setAnthropicKey("");
      setTelegramToken("");
      setMsg({ ok: true, text: "Đã lưu." });
    } else setMsg({ ok: false, text: d.error || "Không lưu được." });
  };

  const findGroups = async () => {
    const d = await call({ action: "find_groups" });
    if (d.ok) {
      setGroups(d.groups || []);
      setMsg({ ok: (d.groups || []).length > 0, text: (d.groups || []).length ? "Bấm vào tên nhóm bên dưới để chọn, rồi bấm Lưu." : "Chưa thấy nhóm nào. Hãy thêm bot vào nhóm, gửi một tin bất kỳ trong nhóm (ví dụ /start), rồi bấm lại." });
    } else setMsg({ ok: false, text: d.error || "Không tìm được nhóm." });
  };

  const hook = async (action: string) => {
    const d = await call({ action });
    const info = d.info || d;
    if (info && info.username) setBotInfo(info);
    if (d.ok === false) setMsg({ ok: false, text: "Telegram báo lỗi: " + (d.error || "") });
  };

  const testTelegram = async () => {
    const d = await call({ action: "test_telegram" });
    setMsg(d.ok ? { ok: true, text: "Đã gửi tin thử vào nhóm Telegram." } : { ok: false, text: "Telegram báo lỗi: " + (d.error || "") });
  };

  const testAi = async () => {
    const d = await call({ action: "test_ai" });
    setMsg(d.ok ? { ok: true, text: "Nine trả lời thử: " + d.reply } : { ok: false, text: "Chưa gọi được Nine: " + (d.error || "") });
  };

  return (
    <div className="admin-form-root">
      <div className="admin-form-header">
        <Link href="/admin/dashboard" className="admin-form-back" aria-label="Quay lại">
          <ChevronLeft size={18} />
        </Link>
        <div>
          <h1 className="admin-form-title">Chat Nine trên website</h1>
          <p className="admin-form-subtitle">Nine tư vấn khách ở nút “Chat với Nine”; nội dung tư vấn gửi về nhóm Telegram CSKH</p>
        </div>
      </div>

      {msg && (
        <div className="admin-form-error" style={{ backgroundColor: msg.ok ? "#dcfce7" : "#fee2e2", color: msg.ok ? "#166534" : "#991b1b", border: "none", whiteSpace: "pre-wrap" }}>
          {msg.text}
        </div>
      )}

      <form onSubmit={save}>
        <div className="admin-form-card" style={{ marginBottom: 24 }}>
          <div className="admin-form-card-header">
            <Send size={14} style={{ color: "var(--a-gold)" }} />
            <span className="admin-form-card-header-title">1. Telegram – nơi nhận nội dung tư vấn</span>
            <div className="admin-form-card-header-dot" />
          </div>
          <div className="admin-form-card-body" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div className="admin-form-field">
              <label className="admin-form-label">Mã bot Telegram (token) — {state?.has_telegram_token ? "ĐÃ LƯU" : "chưa có"}</label>
              <p style={hint}>Lấy từ @BotFather. Thêm bot này vào nhóm “NineHousing CSKH”. Để trống nếu muốn giữ mã đã lưu.</p>
              <input type="password" autoComplete="off" className="admin-form-input" value={telegramToken} onChange={(e) => setTelegramToken(e.target.value)} placeholder={state?.has_telegram_token ? "•••••• (đã lưu)" : "123456789:AA..."} />
            </div>
            <div className="admin-form-field">
              <label className="admin-form-label">Mã nhóm Telegram (chat id)</label>
              <p style={hint}>Sau khi lưu mã bot và thêm bot vào nhóm: gửi một tin trong nhóm, rồi bấm “Tìm nhóm”.</p>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <input type="text" className="admin-form-input" style={{ flex: "1 1 220px" }} value={chatId} onChange={(e) => setChatId(e.target.value)} placeholder="-100..." />
                <button type="button" style={btn} disabled={busy} onClick={findGroups}>Tìm nhóm</button>
                <button type="button" style={btn} disabled={busy} onClick={testTelegram}>Gửi tin thử</button>
              </div>
              {groups.length > 0 && (
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
                  {groups.map((g) => (
                    <button key={g.id} type="button" style={{ ...btn, background: chatId === g.id ? "#F6F0E4" : "#fff" }} onClick={() => setChatId(g.id)}>
                      {g.title} ({g.id})
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="admin-form-card" style={{ marginBottom: 24 }}>
          <div className="admin-form-card-header">
            <Bot size={14} style={{ color: "var(--a-gold)" }} />
            <span className="admin-form-card-header-title">2. Nine (Claude) – tự trả lời khách</span>
            <div className="admin-form-card-header-dot" />
          </div>
          <div className="admin-form-card-body" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div className="admin-form-field">
              <label className="admin-form-label">Khóa Claude API — {state?.has_anthropic_key ? "ĐÃ LƯU" : "chưa có"}</label>
              <p style={hint}>
                Tạo ở trang Claude Platform (mục API keys). Có tính phí theo lượng dùng. Chưa có khóa thì Nine chỉ nhận tin, xin số điện thoại và chuyển về Telegram để lễ tân trả lời. Mẫu đang dùng: {state?.model}.
              </p>
              <input type="password" autoComplete="off" className="admin-form-input" value={anthropicKey} onChange={(e) => setAnthropicKey(e.target.value)} placeholder={state?.has_anthropic_key ? "•••••• (đã lưu)" : "sk-ant-..."} />
              <div style={{ marginTop: 8 }}>
                <button type="button" style={btn} disabled={busy} onClick={testAi}>Hỏi thử Nine</button>
              </div>
            </div>
            <div className="admin-form-field">
              <label className="admin-form-label"><MessageCircle size={13} /> Ghi chú thêm cho Nine (không bắt buộc)</label>
              <p style={hint}>Ví dụ: giờ nhận/trả phòng, chính sách hủy, khuyến mãi đang chạy, điều Nine không được nói. Nine đã biết sẵn tòa nhà, hạng phòng và giá theo báo giá ngắn hạn.</p>
              <textarea className="admin-form-input" style={{ minHeight: 140, padding: 10 }} value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={4000} />
            </div>
          </div>
        </div>

        <div className="admin-form-card" style={{ marginBottom: 24 }}>
          <div className="admin-form-card-header">
            <MessageCircle size={14} style={{ color: "var(--a-gold)" }} />
            <span className="admin-form-card-header-title">3. Lễ tân trả lời khách ngay trong Telegram</span>
            <div className="admin-form-card-header-dot" />
          </div>
          <div className="admin-form-card-body" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <p style={hint}>
              Mỗi tin “🌐 Chat web #mã” trong nhóm CSKH có 2 nút: «💬 Trả lời khách» mở trang trả lời (xem cả cuộc chat, gõ nội dung, khách thấy ngay trên web) và «👤 Lễ tân tự trả lời» để Nine ngừng trả lời khách đó. Không cần cài gì thêm; bot chỉ gửi tin đi nên không ảnh hưởng chương trình khác đang dùng bot này.
            </p>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button type="button" style={btn} disabled={busy} onClick={() => hook("telegram_info")}>Xem trạng thái bot</button>
            </div>
            {botInfo && (
              <p style={{ ...hint, color: "#0f172a" }}>
                Bot: {botInfo.name} (@{botInfo.username}) · Đường nhận tin riêng (webhook): {botInfo.webhook_host || "không có"} · Tin chờ: {botInfo.pending}
                {botInfo.last_error ? " · Lỗi gần nhất: " + botInfo.last_error : ""}
              </p>
            )}
          </div>
        </div>

        <button type="submit" style={btnMain} disabled={busy}>
          <Save size={14} style={{ verticalAlign: "-2px", marginRight: 6 }} />
          {busy ? "Đang xử lý..." : "Lưu"}
        </button>
      </form>
    </div>
  );
}
