// Kết nối Bluejay Booking Engine API v2 (chỉ chạy phía máy chủ).
// Khóa API và đường proxy là bí mật: lưu ở config/bluejay.json (không đưa lên GitHub, không trả ra ngoài).
import fs from "fs/promises";
import path from "path";
import http from "http";
import https from "https";
import tls from "tls";

const CONFIG_FILE = path.join(process.cwd(), "config", "bluejay.json");
export const BLUEJAY_BASE = "https://api1.bluejaypms.com/api/v2";
// Tài liệu Bluejay ghi "apikey gửi trong Header" nhưng không nói rõ tên; thử lần lượt các tên này.
export const HEADER_NAMES = ["apikey", "ApiKey", "api-key", "x-api-key"];

export interface BluejayConfig {
  api_key?: string;
  header_name?: string;
  property_id?: string;
  proxy_url?: string; // ví dụ http://user:pass@144.79.12.110:8080 – dùng khi Bluejay chỉ cho phép địa chỉ IP của proxy
}

export async function readBluejayConfig(): Promise<BluejayConfig> {
  try {
    return JSON.parse(await fs.readFile(CONFIG_FILE, "utf-8")) as BluejayConfig;
  } catch {
    return {};
  }
}

export async function writeBluejayConfig(patch: BluejayConfig): Promise<BluejayConfig> {
  const next: BluejayConfig = { ...(await readBluejayConfig()) };
  (Object.keys(patch) as (keyof BluejayConfig)[]).forEach((k) => {
    const v = patch[k];
    if (typeof v === "string") next[k] = v.trim();
  });
  await fs.mkdir(path.dirname(CONFIG_FILE), { recursive: true });
  await fs.writeFile(CONFIG_FILE, JSON.stringify(next, null, 2), { encoding: "utf-8", mode: 0o600 });
  return next;
}

export interface BluejayResult {
  status: number; // 0 = không kết nối được
  ok: boolean;
  json: unknown;
  text: string;
  error?: string;
}

/** Gọi HTTPS, có thể đi qua proxy HTTP (CONNECT). */
function rawRequest(url: string, method: string, headers: Record<string, string>, body: string | undefined, proxyUrl: string | undefined, timeoutMs: number): Promise<{ status: number; text: string }> {
  return new Promise((resolve, reject) => {
    const target = new URL(url);
    const finish = (socket?: tls.TLSSocket) => {
      const req = https.request(
        {
          host: target.hostname,
          port: 443,
          path: target.pathname + target.search,
          method,
          headers: { ...headers, host: target.hostname, ...(body ? { "content-length": String(Buffer.byteLength(body)) } : {}) },
          ...(socket ? { createConnection: () => socket } : {}),
          timeout: timeoutMs,
        },
        (res) => {
          const chunks: Buffer[] = [];
          res.on("data", (c: Buffer) => chunks.push(c));
          res.on("end", () => resolve({ status: res.statusCode || 0, text: Buffer.concat(chunks).toString("utf-8") }));
        }
      );
      req.on("timeout", () => req.destroy(new Error("Quá thời gian chờ")));
      req.on("error", reject);
      if (body) req.write(body);
      req.end();
    };

    if (!proxyUrl) return finish();
    let proxy: URL;
    try {
      proxy = new URL(proxyUrl);
    } catch {
      return reject(new Error("Địa chỉ proxy không hợp lệ"));
    }
    const auth = proxy.username ? "Basic " + Buffer.from(decodeURIComponent(proxy.username) + ":" + decodeURIComponent(proxy.password)).toString("base64") : "";
    const connect = http.request({
      host: proxy.hostname,
      port: Number(proxy.port) || 80,
      method: "CONNECT",
      path: `${target.hostname}:443`,
      headers: { host: `${target.hostname}:443`, ...(auth ? { "proxy-authorization": auth } : {}) },
      timeout: timeoutMs,
    });
    connect.on("connect", (res, socket) => {
      if (res.statusCode !== 200) {
        socket.destroy();
        return reject(new Error(`Proxy từ chối (mã ${res.statusCode})`));
      }
      const secure = tls.connect({ socket, servername: target.hostname }, () => finish(secure));
      secure.on("error", reject);
    });
    connect.on("timeout", () => connect.destroy(new Error("Proxy quá thời gian chờ")));
    connect.on("error", reject);
    connect.end();
  });
}

export async function bluejayRequest(
  cfg: BluejayConfig,
  endpoint: string,
  opts: { method?: "GET" | "POST"; query?: Record<string, string | number | undefined>; body?: unknown; headerName?: string } = {}
): Promise<BluejayResult> {
  if (!cfg.api_key) return { status: 0, ok: false, json: null, text: "", error: "Chưa lưu khóa API Bluejay" };
  const url = new URL(BLUEJAY_BASE + endpoint);
  Object.entries(opts.query || {}).forEach(([k, v]) => {
    if (v !== undefined && v !== "") url.searchParams.set(k, String(v));
  });
  const headers: Record<string, string> = { accept: "application/json", [opts.headerName || cfg.header_name || HEADER_NAMES[0]]: cfg.api_key };
  const body = opts.body !== undefined ? JSON.stringify(opts.body) : undefined;
  if (body) headers["content-type"] = "application/json";
  try {
    const r = await rawRequest(url.toString(), opts.method || "GET", headers, body, cfg.proxy_url || undefined, 25000);
    let json: unknown = null;
    try {
      json = JSON.parse(r.text);
    } catch { /* không phải JSON (ví dụ trang chặn của Cloudflare) */ }
    return { status: r.status, ok: r.status >= 200 && r.status < 300, json, text: r.text.slice(0, 4000) };
  } catch (e) {
    return { status: 0, ok: false, json: null, text: "", error: e instanceof Error ? e.message : "Lỗi mạng" };
  }
}

/** Thử kết nối: tìm tên header đúng, lưu lại nếu thành công. */
export async function testBluejay(cfg: BluejayConfig) {
  const tried: { header: string; status: number; note: string }[] = [];
  const names = cfg.header_name ? [cfg.header_name, ...HEADER_NAMES.filter((h) => h !== cfg.header_name)] : HEADER_NAMES;
  for (const headerName of names) {
    const r = await bluejayRequest(cfg, "/properties", { headerName, query: { limit: 50 } });
    const blocked = !r.json && /cloudflare|access denied|forbidden|blocked/i.test(r.text);
    tried.push({ header: headerName, status: r.status, note: r.error || (blocked ? "Bị chặn trước khi tới Bluejay (thường do địa chỉ IP chưa được cho phép)" : r.ok ? "Thành công" : r.text.replace(/\s+/g, " ").slice(0, 200)) });
    if (r.ok && r.json) {
      if (cfg.header_name !== headerName) await writeBluejayConfig({ header_name: headerName });
      return { ok: true, header: headerName, tried, data: r.json };
    }
    if (r.status === 0 || blocked) break; // lỗi mạng hoặc bị chặn IP: thử tên header khác cũng vô ích
  }
  return { ok: false, header: "", tried, data: null };
}

/** Cắt bớt dữ liệu trả về để xem cấu trúc mà không quá dài, và bỏ thông tin liên hệ. */
export function trimForView(value: unknown, depth = 0): unknown {
  if (Array.isArray(value)) {
    const max = depth === 0 ? 60 : 40;
    const out = value.slice(0, max).map((v) => trimForView(v, depth + 1));
    if (value.length > max) out.push(`… còn ${value.length - max} mục`);
    return out;
  }
  if (value && typeof value === "object") {
    const o: Record<string, unknown> = {};
    Object.entries(value as Record<string, unknown>).forEach(([k, v]) => {
      if (/photo|image|description|descsription|content|amenit/i.test(k)) {
        o[k] = Array.isArray(v) ? `[${v.length} mục]` : typeof v === "string" ? v.slice(0, 60) : v && typeof v === "object" ? "{…}" : v;
      } else if (/email|phone/i.test(k)) {
        o[k] = v ? "(có)" : v;
      } else o[k] = depth > 10 ? "…" : trimForView(v, depth + 1);
    });
    return o;
  }
  if (typeof value === "string") return value.slice(0, 200);
  return value;
}
