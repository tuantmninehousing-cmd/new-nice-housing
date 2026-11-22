import { NextResponse } from "next/server";
import { askClaude, ChatMessage, HOTLINE, readNineConfig, sendTelegram } from "@/lib/nineChat";

export const dynamic = "force-dynamic";

// Giới hạn để không bị lạm dụng (tính trong bộ nhớ, đặt lại khi khởi động lại web)
const PER_IP_LIMIT = 30; // tin nhắn / 10 phút / một địa chỉ
const PER_IP_WINDOW = 10 * 60 * 1000;
const DAILY_LIMIT = 1500; // tổng lượt gọi Nine / ngày
const hits = new Map<string, number[]>();
let dayKey = "";
let dayCount = 0;

const FALLBACK: Record<string, string> = {
  vi: `Nine Housing đã nhận tin nhắn của anh/chị. Anh/chị vui lòng để lại tên và số điện thoại (hoặc Zalo), lễ tân sẽ liên hệ ngay. Việc gấp xin gọi hotline ${HOTLINE}.`,
  en: `Nine Housing has received your message. Please leave your name and phone number (or WhatsApp/Zalo) and our front desk will contact you shortly. For urgent matters call ${HOTLINE}.`,
  ja: `メッセージを受け取りました。お名前と電話番号（またはLINE/WhatsApp）をお知らせください。スタッフよりご連絡いたします。お急ぎの場合は ${HOTLINE} までお電話ください。`,
  ko: `메시지를 받았습니다. 성함과 전화번호(또는 카카오톡/WhatsApp)를 남겨 주시면 프런트에서 연락드리겠습니다. 급한 일은 ${HOTLINE}로 전화해 주세요.`,
};
const BUSY: Record<string, string> = {
  vi: `Hiện có nhiều tin nhắn quá, anh/chị vui lòng nhắn Zalo hoặc gọi hotline ${HOTLINE} giúp em nhé.`,
  en: `We are receiving many messages right now. Please contact us on Zalo or call ${HOTLINE}.`,
  ja: `ただいま混み合っております。Zaloまたは ${HOTLINE} までご連絡ください。`,
  ko: `지금 문의가 많습니다. Zalo 또는 ${HOTLINE}로 연락해 주세요.`,
};

const clean = (s: unknown, max: number) => (typeof s === "string" ? s.replace(/\u0000/g, "").trim().slice(0, max) : "");
const PHONE = /(?:\+?\d[\d .\-()]{7,}\d)/;

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    if (!body || !Array.isArray(body.messages)) {
      return NextResponse.json({ error: "Bad request" }, { status: 400 });
    }
    const lang = ["vi", "en", "ja", "ko"].includes(body.lang) ? (body.lang as string) : "vi";
    const sessionId = clean(body.sessionId, 12).replace(/[^a-zA-Z0-9]/g, "") || "khach";
    const messages: ChatMessage[] = (body.messages as { role?: string; content?: unknown }[])
      .slice(-16)
      .map((m): ChatMessage => ({ role: m.role === "assistant" ? "assistant" : "user", content: clean(m.content, 1200) }))
      .filter((m) => m.content);
    // Claude yêu cầu bắt đầu bằng tin của khách và kết thúc bằng tin của khách
    while (messages.length && messages[0].role !== "user") messages.shift();
    if (!messages.length || messages[messages.length - 1].role !== "user") {
      return NextResponse.json({ error: "Bad request" }, { status: 400 });
    }
    const last = messages[messages.length - 1].content;

    const ip = (request.headers.get("x-forwarded-for") || "").split(",")[0].trim() || request.headers.get("x-real-ip") || "unknown";
    const now = Date.now();
    const recent = (hits.get(ip) || []).filter((t) => now - t < PER_IP_WINDOW);
    const today = new Date().toISOString().slice(0, 10);
    if (today !== dayKey) { dayKey = today; dayCount = 0; }
    if (recent.length >= PER_IP_LIMIT || dayCount >= DAILY_LIMIT) {
      return NextResponse.json({ reply: BUSY[lang], limited: true });
    }
    recent.push(now);
    hits.set(ip, recent);
    dayCount++;
    if (hits.size > 5000) hits.clear();

    const cfg = await readNineConfig();
    let reply: string | null = null;
    let aiError = "";
    try {
      reply = await askClaude(cfg, messages);
    } catch (e) {
      aiError = e instanceof Error ? e.message : "lỗi";
      console.error("nine-chat", aiError);
    }
    const usedAi = !!reply;
    if (!reply) reply = FALLBACK[lang];

    // Gửi nội dung tư vấn về nhóm Telegram CSKH
    const isFirst = messages.filter((m) => m.role === "user").length === 1;
    const hasPhone = PHONE.test(last);
    const head = `${hasPhone ? "📞 KHÁCH ĐỂ LẠI LIÊN HỆ\n" : ""}🌐 Chat web #${sessionId} (${lang})${isFirst ? " — khách mới" : ""}`;
    const note = usedAi ? "" : `\n⚠️ Nine chưa trả lời được${cfg.anthropic_key ? " (lỗi kết nối AI)" : " (chưa cài khóa AI)"} — lễ tân cần trả lời khách qua số khách để lại.`;
    await sendTelegram(cfg, `${head}\nKhách: ${last}\nNine: ${reply}${note}`);

    return NextResponse.json({ reply, ai: usedAi });
  } catch (e) {
    console.error("POST /api/nine-chat", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
