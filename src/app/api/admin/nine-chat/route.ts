import { NextRequest, NextResponse } from "next/server";
import { ADMIN_COOKIE_NAME, verifyAdminToken } from "@/lib/auth";
import { DEFAULT_MODEL, askClaude, findTelegramGroups, readNineConfig, sendTelegram, writeNineConfig } from "@/lib/nineChat";

export const dynamic = "force-dynamic";

function isAdmin(request: NextRequest): boolean {
  const token = request.cookies.get(ADMIN_COOKIE_NAME)?.value;
  return !!token && !!verifyAdminToken(token);
}

// Không bao giờ trả khóa bí mật ra ngoài: chỉ báo đã có hay chưa.
async function publicState() {
  const cfg = await readNineConfig();
  return {
    has_anthropic_key: !!cfg.anthropic_key,
    has_telegram_token: !!cfg.telegram_token,
    telegram_chat_id: cfg.telegram_chat_id || "",
    model: cfg.model || DEFAULT_MODEL,
    extra_notes: cfg.extra_notes || "",
  };
}

export async function GET(request: NextRequest) {
  if (!isAdmin(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json(await publicState());
}

export async function POST(request: NextRequest) {
  if (!isAdmin(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const body = await request.json();
    const action = body.action as string;

    if (action === "save") {
      const patch: Record<string, string> = {};
      // Ô khóa để trống nghĩa là giữ nguyên khóa cũ
      if (typeof body.anthropic_key === "string" && body.anthropic_key.trim()) patch.anthropic_key = body.anthropic_key;
      if (typeof body.telegram_token === "string" && body.telegram_token.trim()) patch.telegram_token = body.telegram_token;
      if (typeof body.telegram_chat_id === "string") patch.telegram_chat_id = body.telegram_chat_id;
      if (typeof body.model === "string" && body.model.trim()) patch.model = body.model;
      if (typeof body.extra_notes === "string") patch.extra_notes = body.extra_notes.slice(0, 4000);
      await writeNineConfig(patch);
      return NextResponse.json({ ok: true, state: await publicState() });
    }

    const cfg = await readNineConfig();

    if (action === "find_groups") {
      if (!cfg.telegram_token) return NextResponse.json({ ok: false, error: "Chưa lưu mã bot Telegram" });
      try {
        return NextResponse.json({ ok: true, groups: await findTelegramGroups(cfg.telegram_token) });
      } catch (e) {
        return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : "Lỗi" });
      }
    }

    if (action === "test_telegram") {
      const r = await sendTelegram(cfg, "✅ Thử kết nối: chat Nine trên ninehousing.com sẽ gửi nội dung tư vấn khách vào nhóm này.");
      return NextResponse.json(r);
    }

    if (action === "test_ai") {
      if (!cfg.anthropic_key) return NextResponse.json({ ok: false, error: "Chưa lưu khóa Claude API" });
      try {
        const reply = await askClaude(cfg, [{ role: "user", content: "Chào Nine, bên mình có căn 2 phòng ngủ ở Tây Hồ không, giá bao nhiêu?" }]);
        return NextResponse.json({ ok: !!reply, reply });
      } catch (e) {
        return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : "Lỗi" });
      }
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (e) {
    console.error("POST /api/admin/nine-chat", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
