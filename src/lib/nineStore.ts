// Bộ nhớ các cuộc chat web để lễ tân trả lời từ Telegram.
// Lưu trong bộ nhớ của web (dùng chung giữa các API) và chép ra config/nine-chat-sessions.json để không mất khi khởi động lại.
import fs from "fs/promises";
import path from "path";

const FILE = path.join(process.cwd(), "config", "nine-chat-sessions.json");
const MAX_SESSIONS = 400;
const KEEP_MS = 48 * 3600 * 1000;
export const STAFF_PAUSE_MS = 10 * 60 * 1000; // sau khi lễ tân trả lời, Nine tạm im 10 phút

export interface StaffMsg { i: number; text: string; name: string; ts: number }
export interface LogMsg { who: 'guest' | 'nine' | 'staff'; text: string; name?: string; ts: number }
export interface Session { sid: string; lang: string; updated: number; staff: StaffMsg[]; lastStaffAt: number; tgIds: number[]; log?: LogMsg[]; manualUntil?: number }
interface Store { sessions: Record<string, Session>; loaded: boolean; saving: ReturnType<typeof setTimeout> | null }

const g = globalThis as unknown as { __nineStore?: Store };
const store: Store = g.__nineStore || (g.__nineStore = { sessions: {}, loaded: false, saving: null });

async function load() {
  if (store.loaded) return;
  store.loaded = true;
  try {
    const data = JSON.parse(await fs.readFile(FILE, "utf-8")) as Record<string, Session>;
    const now = Date.now();
    Object.values(data).forEach((s) => { if (s && s.sid && now - s.updated < KEEP_MS && !store.sessions[s.sid]) store.sessions[s.sid] = s; });
  } catch { /* chưa có file */ }
}

function saveSoon() {
  if (store.saving) return;
  store.saving = setTimeout(async () => {
    store.saving = null;
    try {
      await fs.mkdir(path.dirname(FILE), { recursive: true });
      await fs.writeFile(FILE, JSON.stringify(store.sessions), { encoding: "utf-8", mode: 0o600 });
    } catch (e) { console.error("nineStore save", e); }
  }, 1500);
}

function prune() {
  const now = Date.now();
  const all = Object.values(store.sessions);
  all.forEach((s) => { if (now - s.updated > KEEP_MS) delete store.sessions[s.sid]; });
  const rest = Object.values(store.sessions);
  if (rest.length > MAX_SESSIONS) {
    rest.sort((a, b) => a.updated - b.updated).slice(0, rest.length - MAX_SESSIONS).forEach((s) => delete store.sessions[s.sid]);
  }
}

export async function touchSession(sid: string, lang: string): Promise<Session> {
  await load();
  let s = store.sessions[sid];
  if (!s) { prune(); s = store.sessions[sid] = { sid, lang, updated: Date.now(), staff: [], lastStaffAt: 0, tgIds: [] }; }
  s.lang = lang;
  s.updated = Date.now();
  saveSoon();
  return s;
}

export async function getSession(sid: string): Promise<Session | null> {
  await load();
  return store.sessions[sid] || null;
}

/** Ghi nhớ tin Telegram nào thuộc cuộc chat nào (để biết lễ tân đang trả lời khách nào). */
export async function linkTelegramMessage(sid: string, messageId: number) {
  const s = await getSession(sid);
  if (!s) return;
  s.tgIds.push(messageId);
  if (s.tgIds.length > 60) s.tgIds = s.tgIds.slice(-60);
  saveSoon();
}

export async function findSessionByTelegramMessage(messageId: number): Promise<Session | null> {
  await load();
  return Object.values(store.sessions).find((s) => s.tgIds.includes(messageId)) || null;
}

export async function addStaffMessage(sid: string, text: string, name: string): Promise<Session | null> {
  const s = await getSession(sid);
  if (!s) return null;
  s.staff.push({ i: s.staff.length + 1, text: text.slice(0, 2000), name: name.slice(0, 40), ts: Date.now() });
  s.lastStaffAt = Date.now();
  s.updated = Date.now();
  saveSoon();
  return s;
}

export function staffIsHandling(s: Session | null): boolean {
  if (!s) return false;
  if (s.manualUntil && Date.now() < s.manualUntil) return true;
  return s.lastStaffAt > 0 && Date.now() - s.lastStaffAt < STAFF_PAUSE_MS;
}

/** Ghi lại nội dung cuộc chat để lễ tân xem ở trang trả lời. */
export async function logMessage(sid: string, who: LogMsg["who"], text: string, name?: string) {
  const s = await getSession(sid);
  if (!s || !text) return;
  if (!s.log) s.log = [];
  s.log.push({ who, text: text.slice(0, 2000), name, ts: Date.now() });
  if (s.log.length > 80) s.log = s.log.slice(-80);
  saveSoon();
}

/** Lễ tân nhận cuộc chat (Nine ngừng trả lời tối đa 60 phút) hoặc trả lại cho Nine. */
export async function setManual(sid: string, on: boolean): Promise<Session | null> {
  const s = await getSession(sid);
  if (!s) return null;
  s.manualUntil = on ? Date.now() + 60 * 60 * 1000 : 0;
  if (!on) s.lastStaffAt = 0;
  saveSoon();
  return s;
}
