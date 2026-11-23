"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronLeft, Link2, Save } from "lucide-react";

interface State { has_api_key: boolean; header_name: string; property_id: string; proxy_host: string }

const hint: React.CSSProperties = { fontSize: "12px", color: "#64748b", margin: "4px 0 8px", lineHeight: 1.5 };
const btn: React.CSSProperties = { padding: "10px 16px", borderRadius: 8, border: "1px solid #cbd5e1", background: "#fff", cursor: "pointer", fontWeight: 600, fontSize: 13 };
const btnMain: React.CSSProperties = { ...btn, background: "#1B2541", color: "#F2CD6B", border: "1px solid #1B2541" };

const ymd = (d: Date) => d.toISOString().slice(0, 10);

export default function AdminBluejayPage() {
  const [state, setState] = useState<State | null>(null);
  const [apiKey, setApiKey] = useState("");
  const [propertyId, setPropertyId] = useState("");
  const [proxy, setProxy] = useState("");
  const [from, setFrom] = useState(ymd(new Date(Date.now() + 86400000)));
  const [to, setTo] = useState(ymd(new Date(Date.now() + 2 * 86400000)));
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [result, setResult] = useState("");

  useEffect(() => {
    fetch("/api/admin/bluejay")
      .then((r) => r.json())
      .then((d: State & { error?: string }) => { if (d && !d.error) { setState(d); setPropertyId(d.property_id); } })
      .catch(() => setMsg({ ok: false, text: "Không tải được cài đặt." }));
  }, []);

  const call = async (payload: Record<string, unknown>) => {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/admin/bluejay", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const d = await res.json();
      if (d.state) setState(d.state);
      return d;
    } catch {
      return { ok: false, error: "Lỗi mạng" };
    } finally {
      setBusy(false);
    }
  };

  const save = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const d = await call({ action: "save", api_key: apiKey, property_id: propertyId, proxy_url: proxy });
    if (d.ok) { setApiKey(""); setProxy(""); setMsg({ ok: true, text: "Đã lưu." }); } else setMsg({ ok: false, text: d.error || "Không lưu được." });
  };

  const run = async (payload: Record<string, unknown>, okText: string) => {
    const d = await call(payload);
    setResult(JSON.stringify(d.tried ? { tried: d.tried, data: d.data } : { status: d.status, error: d.error, text: d.text, data: d.data }, null, 2));
    setMsg(d.ok ? { ok: true, text: okText } : { ok: false, text: "Chưa được. Xem chi tiết ở khung kết quả bên dưới" + (d.error ? ": " + d.error : ".") });
  };

  return (
    <div className="admin-form-root">
      <div className="admin-form-header">
        <Link href="/admin/dashboard" className="admin-form-back" aria-label="Quay lại"><ChevronLeft size={18} /></Link>
        <div>
          <h1 className="admin-form-title">Kết nối Bluejay</h1>
          <p className="admin-form-subtitle">Để web xem phòng trống, giá theo ngày và tạo đặt phòng thẳng vào Bluejay</p>
        </div>
      </div>

      {msg && <div className="admin-form-error" style={{ backgroundColor: msg.ok ? "#dcfce7" : "#fee2e2", color: msg.ok ? "#166534" : "#991b1b", border: "none" }}>{msg.text}</div>}

      <form onSubmit={save}>
        <div className="admin-form-card" style={{ marginBottom: 24 }}>
          <div className="admin-form-card-header">
            <Link2 size={14} style={{ color: "var(--a-gold)" }} />
            <span className="admin-form-card-header-title">1. Thông tin kết nối</span>
            <div className="admin-form-card-header-dot" />
          </div>
          <div className="admin-form-card-body" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div className="admin-form-field">
              <label className="admin-form-label">Khóa API Bluejay (ApiKey) — {state?.has_api_key ? "ĐÃ LƯU" : "chưa có"}</label>
              <p style={hint}>Lấy trong tài liệu API của Bluejay (dòng “ApiKey”). Để trống nếu muốn giữ khóa đã lưu.</p>
              <input type="password" autoComplete="off" className="admin-form-input" value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder={state?.has_api_key ? "•••••• (đã lưu)" : "Dán khóa vào đây"} />
            </div>
            <div className="admin-form-field">
              <label className="admin-form-label">Mã cơ sở trên Bluejay (property id)</label>
              <p style={hint}>Ví dụ 6224. Chưa biết thì để trống, bấm “Kiểm tra kết nối” để xem danh sách cơ sở.</p>
              <input type="text" className="admin-form-input" value={propertyId} onChange={(e) => setPropertyId(e.target.value)} placeholder="6224" />
            </div>
            <div className="admin-form-field">
              <label className="admin-form-label">Proxy (không bắt buộc) — {state?.proxy_host ? "đang dùng " + state.proxy_host : "không dùng"}</label>
              <p style={hint}>Chỉ cần khi Bluejay chặn địa chỉ IP của máy chủ web. Dạng: http://tên:mật-khẩu@địa-chỉ:cổng. Để trống = giữ nguyên.</p>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <input type="password" autoComplete="off" className="admin-form-input" style={{ flex: "1 1 260px" }} value={proxy} onChange={(e) => setProxy(e.target.value)} placeholder="http://user:pass@144.79.12.110:port" />
                {state?.proxy_host && <button type="button" style={btn} disabled={busy} onClick={async () => { const d = await call({ action: "save", clear_proxy: true }); setMsg(d.ok ? { ok: true, text: "Đã bỏ proxy." } : { ok: false, text: "Không bỏ được." }); }}>Bỏ proxy</button>}
              </div>
            </div>
            <div><button type="submit" style={btnMain} disabled={busy}><Save size={14} style={{ verticalAlign: "-2px", marginRight: 6 }} />{busy ? "Đang xử lý..." : "Lưu"}</button></div>
          </div>
        </div>
      </form>

      <div className="admin-form-card" style={{ marginBottom: 24 }}>
        <div className="admin-form-card-header">
          <Link2 size={14} style={{ color: "var(--a-gold)" }} />
          <span className="admin-form-card-header-title">2. Kiểm tra (chỉ đọc, không tạo hay sửa đặt phòng)</span>
          <div className="admin-form-card-header-dot" />
        </div>
        <div className="admin-form-card-body" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            <button type="button" style={btnMain} disabled={busy} onClick={() => run({ action: "test" }, "Kết nối Bluejay thành công.")}>Kiểm tra kết nối</button>
            <button type="button" style={btn} disabled={busy} onClick={() => run({ action: "roomtypes" }, "Đã lấy danh sách loại phòng.")}>Xem loại phòng</button>
            <input type="date" className="admin-form-input" style={{ width: 160 }} value={from} onChange={(e) => setFrom(e.target.value)} aria-label="Ngày nhận phòng" />
            <input type="date" className="admin-form-input" style={{ width: 160 }} value={to} onChange={(e) => setTo(e.target.value)} aria-label="Ngày trả phòng" />
            <button type="button" style={btn} disabled={busy} onClick={() => run({ action: "search", from, to, adult: 2 }, "Đã lấy phòng trống và giá.")}>Xem phòng trống</button>
          </div>
          <p style={hint}>Tên header đang dùng: {state?.header_name || "(chưa xác định)"}. Nếu báo bị chặn: nhờ Bluejay cho phép địa chỉ IP của máy chủ web (103.75.184.88), hoặc nhập proxy ở trên.</p>
          {result && <pre style={{ background: "#0f172a", color: "#e2e8f0", padding: 12, borderRadius: 8, fontSize: 12, maxHeight: 420, overflow: "auto", whiteSpace: "pre-wrap" }}>{result}</pre>}
        </div>
      </div>
    </div>
  );
}
