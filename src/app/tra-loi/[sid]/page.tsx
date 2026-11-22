"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";

interface LogMsg { who: "guest" | "nine" | "staff"; text: string; name: string; ts: number }
interface View { found: boolean; sid?: string; lang?: string; manual?: boolean; log?: LogMsg[] }

const C = { navy: "#141C33", navy2: "#1B2541", gold: "#EDBF4F", goldText: "#F2CD6B", cream: "#F6F0E4", line: "#E8DFCB", ink: "#1B2541", muted: "#5B6275" };
const btn: React.CSSProperties = { minHeight: 46, padding: "0 16px", borderRadius: 10, border: "1px solid " + C.navy2, background: "#fff", color: C.ink, fontWeight: 700, fontSize: 14, cursor: "pointer" };

// Trang lễ tân trả lời khách đang chat trên web. Mở từ nút trong tin Telegram của nhóm CSKH.
export default function StaffReplyPage() {
  const params = useParams();
  const sid = String((params as { sid?: string })?.sid || "");
  const [k, setK] = useState("");
  const [view, setView] = useState<View | null>(null);
  const [denied, setDenied] = useState(false);
  const [name, setName] = useState("");
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");
  const endRef = useRef<HTMLDivElement>(null);
  const count = useRef(0);
  const took = useRef(false);

  const post = useCallback(async (payload: Record<string, unknown>) => {
    setBusy(true);
    setNote("");
    try {
      const res = await fetch("/api/nine-chat/staff", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sid, k, name, ...payload }) });
      const d = await res.json();
      if (d.state) setView(d.state);
      if (d.ok === false || d.error) setNote(d.error || "Không gửi được, thử lại giúp em.");
      return !!d.ok;
    } catch {
      setNote("Lỗi mạng, thử lại giúp em.");
      return false;
    } finally {
      setBusy(false);
    }
  }, [sid, k, name]);

  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    setK(q.get("k") || "");
    try { setName(localStorage.getItem("nineStaffName") || ""); } catch { /* bỏ qua */ }
  }, []);

  useEffect(() => {
    if (!k || !sid) return;
    let stop = false;
    const load = async () => {
      try {
        const res = await fetch(`/api/nine-chat/staff?sid=${sid}&k=${encodeURIComponent(k)}`, { cache: "no-store" });
        if (res.status === 403) { setDenied(true); return; }
        const d = (await res.json()) as View;
        if (!stop) setView(d);
      } catch { /* thử lại ở lượt sau */ }
    };
    load();
    const id = window.setInterval(load, 4000);
    return () => { stop = true; window.clearInterval(id); };
  }, [k, sid]);

  // Mở bằng nút «Lễ tân tự trả lời»: nhận cuộc chat ngay
  useEffect(() => {
    if (!k || took.current || !view?.found) return;
    if (new URLSearchParams(window.location.search).get("nhan") === "1") {
      took.current = true;
      if (!view.manual) post({ action: "take" });
    }
  }, [k, view, post]);

  useEffect(() => {
    const n = view?.log?.length || 0;
    if (n !== count.current) { count.current = n; endRef.current?.scrollIntoView({ block: "end" }); }
  }, [view]);

  const saveName = (v: string) => { setName(v); try { localStorage.setItem("nineStaffName", v); } catch { /* bỏ qua */ } };
  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || busy) return;
    if (await post({ action: "send", text })) setText("");
  };
  const time = (ts: number) => new Date(ts).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });

  const wrap: React.CSSProperties = { minHeight: "100vh", background: C.cream, color: C.ink, fontFamily: "'Be Vietnam Pro', system-ui, sans-serif", display: "flex", flexDirection: "column" };

  if (denied || (!k && view === null && typeof window !== "undefined" && !new URLSearchParams(window.location.search).get("k"))) {
    return <div style={{ ...wrap, alignItems: "center", justifyContent: "center", padding: 24, textAlign: "center" }}>Đường link không hợp lệ. Hãy mở lại từ nút «Trả lời khách» trong nhóm Telegram CSKH.</div>;
  }

  return (
    <div style={wrap}>
      <div style={{ background: C.navy, color: "#fff", padding: "14px 16px", borderBottom: "3px solid " + C.gold }}>
        <div style={{ fontWeight: 700, fontSize: 17 }}>Trả lời khách web <span style={{ color: C.goldText }}>#{sid}</span></div>
        <div style={{ fontSize: 13, color: "#C9C3B2", marginTop: 2 }}>
          {view?.found ? (view.manual ? "👤 Lễ tân đang trả lời — Nine tạm ngừng" : "🤖 Nine đang tự trả lời khách này") : view ? "Không tìm thấy cuộc chat (đã quá 48 giờ)" : "Đang tải…"}
          {view?.lang ? ` · Ngôn ngữ của khách: ${view.lang}` : ""}
        </div>
      </div>

      <div style={{ flex: 1, padding: 14, display: "flex", flexDirection: "column", gap: 10, maxWidth: 760, width: "100%", margin: "0 auto", boxSizing: "border-box" }}>
        {(view?.log || []).map((m, i) => (
          <div key={i} style={{ alignSelf: m.who === "guest" ? "flex-start" : "flex-end", maxWidth: "86%", background: m.who === "guest" ? "#fff" : m.who === "staff" ? "#FFF6DD" : C.navy2, color: m.who === "nine" ? "#fff" : C.ink, border: m.who === "staff" ? "1px solid " + C.gold : "1px solid " + C.line, borderRadius: 14, padding: "8px 12px", whiteSpace: "pre-wrap", overflowWrap: "anywhere", fontSize: 15, lineHeight: 1.5 }}>
            <div style={{ fontSize: 11, fontWeight: 700, opacity: 0.75, marginBottom: 2 }}>
              {m.who === "guest" ? "Khách" : m.who === "nine" ? "Nine (tự động)" : "Lễ tân · " + (m.name || "")} · {time(m.ts)}
            </div>
            {m.text}
          </div>
        ))}
        <div ref={endRef}></div>
      </div>

      {view?.found && (
        <form onSubmit={send} style={{ position: "sticky", bottom: 0, background: "#fff", borderTop: "1px solid " + C.line, padding: 12 }}>
          <div style={{ maxWidth: 760, margin: "0 auto", display: "flex", flexDirection: "column", gap: 8 }}>
            {note && <div style={{ background: "#FDECEC", color: "#8A1F1F", borderRadius: 8, padding: "8px 10px", fontSize: 13 }}>{note}</div>}
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <input value={name} onChange={(e) => saveName(e.target.value)} placeholder="Tên của bạn (ví dụ: Hà)" maxLength={40} aria-label="Tên lễ tân" style={{ flex: "1 1 160px", height: 46, borderRadius: 10, border: "1px solid #D9D2C1", padding: "0 12px", fontSize: 15 }} />
              {view.manual ? (
                <button type="button" style={btn} disabled={busy} onClick={() => post({ action: "release" })}>▶️ Để Nine tiếp tục</button>
              ) : (
                <button type="button" style={btn} disabled={busy} onClick={() => post({ action: "take" })}>👤 Lễ tân tự trả lời</button>
              )}
            </div>
            <textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="Gõ nội dung gửi cho khách…" maxLength={2000} aria-label="Nội dung trả lời" style={{ minHeight: 84, borderRadius: 10, border: "1px solid #D9D2C1", padding: 12, fontSize: 15, fontFamily: "inherit", resize: "vertical" }} />
            <button type="submit" disabled={busy || !text.trim()} style={{ ...btn, background: "linear-gradient(135deg,#FBE29A 0%,#EDBF4F 55%,#CF9A2B 100%)", border: 0, opacity: busy || !text.trim() ? 0.5 : 1 }}>
              ✅ Gửi cho khách
            </button>
            <div style={{ fontSize: 12, color: C.muted }}>Khách thấy tin ngay trong khung chat trên web nếu còn mở trang. Khi bạn gửi, Nine tự ngừng trả lời khách này 10 phút.</div>
          </div>
        </form>
      )}
    </div>
  );
}
