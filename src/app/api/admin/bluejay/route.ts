import { NextRequest, NextResponse } from "next/server";
import { ADMIN_COOKIE_NAME, verifyAdminToken } from "@/lib/auth";
import { bluejayRequest, readBluejayConfig, testBluejay, trimForView, writeBluejayConfig } from "@/lib/bluejay";

export const dynamic = "force-dynamic";

function isAdmin(request: NextRequest): boolean {
  const token = request.cookies.get(ADMIN_COOKIE_NAME)?.value;
  return !!token && !!verifyAdminToken(token);
}

// Không trả khóa API hay mật khẩu proxy ra ngoài.
async function publicState() {
  const cfg = await readBluejayConfig();
  let proxyHost = "";
  try {
    if (cfg.proxy_url) proxyHost = new URL(cfg.proxy_url).host;
  } catch { /* bỏ qua */ }
  return { has_api_key: !!cfg.api_key, header_name: cfg.header_name || "", property_id: cfg.property_id || "", proxy_host: proxyHost };
}

const isDate = (v: unknown): v is string => typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v);

export async function GET(request: NextRequest) {
  if (!isAdmin(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json(await publicState());
}

// Các thao tác ở đây chỉ ĐỌC dữ liệu từ Bluejay (không tạo, sửa hay hủy đặt phòng).
export async function POST(request: NextRequest) {
  if (!isAdmin(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const body = await request.json();
    const action = body.action as string;

    if (action === "save") {
      const patch: Record<string, string> = {};
      if (typeof body.api_key === "string" && body.api_key.trim()) patch.api_key = body.api_key; // để trống = giữ khóa cũ
      if (typeof body.property_id === "string") patch.property_id = body.property_id.replace(/[^0-9]/g, "");
      if (typeof body.proxy_url === "string" && body.proxy_url.trim()) patch.proxy_url = body.proxy_url;
      if (body.clear_proxy === true) patch.proxy_url = "";
      await writeBluejayConfig(patch);
      return NextResponse.json({ ok: true, state: await publicState() });
    }

    const cfg = await readBluejayConfig();

    if (action === "test") {
      const r = await testBluejay(cfg);
      return NextResponse.json({ ok: r.ok, header: r.header, tried: r.tried, data: trimForView(r.data), state: await publicState() });
    }

    if (action === "roomtypes") {
      const r = await bluejayRequest(cfg, "/roomtypes", { query: { property: cfg.property_id, lang: "vi-VN", limit: 100 } });
      return NextResponse.json({ ok: r.ok, status: r.status, error: r.error, data: trimForView(r.json), text: r.json ? "" : r.text.slice(0, 500) });
    }

    if (action === "search") {
      if (!isDate(body.from) || !isDate(body.to)) return NextResponse.json({ ok: false, error: "Ngày không hợp lệ" });
      const r = await bluejayRequest(cfg, "/search-roomtypes", {
        query: { property: cfg.property_id, from: body.from, to: body.to, adult: Number(body.adult) || 2, child: 0, lang: "vi-VN", limit: 100 },
      });
      return NextResponse.json({ ok: r.ok, status: r.status, error: r.error, data: trimForView(r.json), text: r.json ? "" : r.text.slice(0, 500) });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (e) {
    console.error("POST /api/admin/bluejay", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
