import { NextResponse } from "next/server";
import { readNineConfig, sendTelegram } from "@/lib/nineChat";
import { addStaffMessage, findSessionByTelegramMessage, getSession } from "@/lib/nineStore";

export const dynamic = "force-dynamic";

interface TgMessage {
  message_id: number;
  text?: string;
  chat?: { id: number };
  from?: { first_name?: string; last_name?: string; is_bot?: boolean };
  reply_to_message?: { message_id: number; text?: string };
}

// Telegram gọi vào đây mỗi khi trong nhóm CSKH có lệnh hoặc có người "Trả lời" tin của bot.
// Lễ tân trả lời khách bằng 1 trong 2 cách:
//   1) Bấm Trả lời (Reply) vào tin "🌐 Chat web #mã" rồi gõ nội dung.
//   2) Gõ lệnh:  /tl mã nội-dung
export async function POST(request: Request) {
  const cfg = await readNineConfig();
  const secret = request.headers.get("x-telegram-bot-api-secret-token") || "";
  if (!cfg.webhook_secret || secret !== cfg.webhook_secret) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  try {
    const update = (await request.json()) as { message?: TgMessage };
    const m = update.message;
    if (!m || !m.text || !m.chat || String(m.chat.id) !== String(cfg.telegram_chat_id) || m.from?.is_bot) {
      return NextResponse.json({ ok: true });
    }
    const text = m.text.trim();
    const name = [m.from?.first_name, m.from?.last_name].filter(Boolean).join(" ") || "Lễ tân";

    let sid = "";
    let body = "";
    const cmd = text.match(/^\/tl(?:@\w+)?\s+#?([a-zA-Z0-9]{4,12})\s+([\s\S]+)/i);
    if (cmd) {
      sid = cmd[1];
      body = cmd[2].trim();
    } else if (m.reply_to_message) {
      const s = await findSessionByTelegramMessage(m.reply_to_message.message_id);
      const tag = (m.reply_to_message.text || "").match(/Chat web #([a-zA-Z0-9]{4,12})/);
      sid = s?.sid || (tag ? tag[1] : "");
      body = text;
    } else if (/^\/(start|help|tl)(?:@\w+)?\s*$/i.test(text)) {
      await sendTelegram(cfg, "Nine đang nối với chat trên ninehousing.com.\nĐể trả lời khách: bấm Trả lời (Reply) vào tin “🌐 Chat web #mã” rồi gõ nội dung, hoặc gõ: /tl mã nội-dung", m.message_id);
      return NextResponse.json({ ok: true });
    }
    if (!sid || !body || body.startsWith("/")) return NextResponse.json({ ok: true });

    const session = await getSession(sid);
    if (!session) {
      await sendTelegram(cfg, `⚠️ Không tìm thấy cuộc chat #${sid} (đã quá 48 giờ hoặc web vừa khởi động lại). Hãy liên hệ khách qua số điện thoại khách để lại.`, m.message_id);
      return NextResponse.json({ ok: true });
    }
    await addStaffMessage(sid, body, name);
    await sendTelegram(cfg, `✅ Đã gửi cho khách #${sid}. Nine tạm ngừng trả lời khách này 10 phút để ${name} hỗ trợ.`, m.message_id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("POST /api/nine-chat/telegram", e);
    return NextResponse.json({ ok: true });
  }
}
