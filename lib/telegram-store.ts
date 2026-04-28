export interface BotStore {
  get<T = unknown>(key: string): Promise<T | null>;
  set(key: string, value: unknown, ttlSec?: number): Promise<void>;
  del(key: string): Promise<void>;
  incr(key: string, ttlSec?: number): Promise<number>;
}

interface MemEntry { v: unknown; exp: number }

class MemoryStore implements BotStore {
  private m = new Map<string, MemEntry>();

  private alive(k: string): MemEntry | null {
    const e = this.m.get(k);
    if (!e) return null;
    if (e.exp && e.exp < Date.now()) { this.m.delete(k); return null; }
    return e;
  }

  async get<T>(key: string): Promise<T | null> {
    return (this.alive(key)?.v as T | undefined) ?? null;
  }
  async set(key: string, value: unknown, ttlSec?: number) {
    this.m.set(key, { v: value, exp: ttlSec ? Date.now() + ttlSec * 1000 : 0 });
  }
  async del(key: string) { this.m.delete(key); }
  async incr(key: string, ttlSec?: number) {
    const cur = (this.alive(key)?.v as number | undefined) ?? 0;
    const next = cur + 1;
    const exp = this.alive(key)?.exp ?? (ttlSec ? Date.now() + ttlSec * 1000 : 0);
    this.m.set(key, { v: next, exp });
    return next;
  }
}

class UpstashStore implements BotStore {
  constructor(private url: string, private token: string) {}

  private async cmd<T>(parts: (string | number)[]): Promise<T> {
    const res = await fetch(this.url, {
      method: "POST",
      headers: { Authorization: `Bearer ${this.token}`, "Content-Type": "application/json" },
      body: JSON.stringify(parts),
    });
    if (!res.ok) throw new Error(`Upstash ${parts[0]}: HTTP ${res.status}`);
    const data = (await res.json()) as { result: T };
    return data.result;
  }

  async get<T>(key: string): Promise<T | null> {
    const r = await this.cmd<string | null>(["GET", key]);
    if (r == null) return null;
    try { return JSON.parse(r) as T; } catch { return r as unknown as T; }
  }
  async set(key: string, value: unknown, ttlSec?: number) {
    const v = JSON.stringify(value);
    if (ttlSec) await this.cmd(["SET", key, v, "EX", ttlSec]);
    else await this.cmd(["SET", key, v]);
  }
  async del(key: string) { await this.cmd(["DEL", key]); }
  async incr(key: string, ttlSec?: number) {
    const n = await this.cmd<number>(["INCR", key]);
    if (ttlSec && n === 1) await this.cmd(["EXPIRE", key, ttlSec]);
    return n;
  }
}

let _store: BotStore | null = null;

export function getStore(): BotStore {
  if (_store) return _store;
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const tok = process.env.UPSTASH_REDIS_REST_TOKEN;
  _store = url && tok ? new UpstashStore(url, tok) : new MemoryStore();
  return _store;
}
