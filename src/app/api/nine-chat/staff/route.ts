import { NextResponse } from "next/server";
import { readNineConfig, sendTelegram, staffKey } from "@/lib/nineChat";
import { addStaffMessage, getSession, logMessage, setManual, staffIsHandling } from "@/lib/nineStore";

export const dynamic = "force-dynamic";

// API cho trang /tra-loi/<mã>: lễ tân xem cuộc chat và trả lời khách.
// Chỉ dùng được khi có đúng mã k trong đường link (link nằm trong tin Telegram của nhóm CSKH).

const cleanSid = (v: unknown) => (typeof v === "string" ? v.replace(/[^a-zA-Z0-9]/g, "").slice(0, 12) : "");

async function allowed(sid: string, k: unknown): Promise<boolean> {
  if (sid.length < 4 || typeof k !== "string" || k.length < 10) return false;
  return k === (await staffKey(sid));
}

async function view(sid: string) {
  const s = await getSession(sid);
  if (!s) return { found: false };
  return {
    found: true,
    sid: s.sid,
    lang: s.lang,
    manual: staffIsHandling(s),
    log: (s.log || []).map((m) => ({ who: m.who, text: m.text, name: m.name || "", ts: m.ts })),
  };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const sid = cleanSid(searchParams.get("sid"));
  if (!(await allowed(sid, searchParams.get("k")))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  return NextResponse.json(await view(sid), { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const sid = cleanSid(body.sid);
    if (!(await allowed(sid, body.k))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    const name = (typeof body.name === "string" ? body.name.trim().slice(0, 40) : "") || "Lễ tân";
    const cfg = await readNineConfig();
    const session = await getSession(sid);
    if (!session) return NextResponse.json({ ok: false, error: "Không tìm thấy cuộc chat (đã quá 48 giờ)." });

    if (body.action === "take") {
      const was = staffIsHandling(session);
      await setManual(sid, true);
      if (!was) await sendTelegram(cfg, `👤 ${name} đã nhận cuộc chat web #${sid}. Nine ngừng trả lời khách này.`);
      return NextResponse.json({ ok: true, state: await view(sid) });
    }
    if (body.action === "release") {
      await setManual(sid, false);
      await sendTelegram(cfg, `▶️ ${name} đã trả cuộc chat web #${sid} lại cho Nine.`);
      return NextResponse.json({ ok: true, state: await view(sid) });
    }
    if (body.action === "send") {
      const text = typeof body.text === "string" ? body.text.trim().slice(0, 2000) : "";
      if (!text) return NextResponse.json({ ok: false, error: "Chưa có nội dung." });
      await addStaffMessage(sid, text, name);
      await logMessage(sid, "staff", text, name);
      await sendTelegram(cfg, `✅ ${name} đã trả lời khách web #${sid}:\n${text}`);
      return NextResponse.json({ ok: true, state: await view(sid) });
    }
    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (e) {
    console.error("POST /api/nine-chat/staff", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
