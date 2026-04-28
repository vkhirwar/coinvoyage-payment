import crypto from "crypto";

export interface TgWebAppUser {
  id: number;
  is_bot?: boolean;
  first_name?: string;
  last_name?: string;
  username?: string;
  language_code?: string;
}

export interface VerifiedInitData {
  user?: TgWebAppUser;
  auth_date: number;
  query_id?: string;
  raw: Record<string, string>;
}

const MAX_AGE_SEC = 24 * 60 * 60;

export function verifyInitData(initData: string, maxAgeSec = MAX_AGE_SEC): VerifiedInitData | null {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return null;

  const params = new URLSearchParams(initData);
  const hash = params.get("hash");
  if (!hash) return null;
  params.delete("hash");

  const pairs: [string, string][] = [];
  params.forEach((v, k) => pairs.push([k, v]));
  pairs.sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
  const dcs = pairs.map(([k, v]) => `${k}=${v}`).join("\n");

  const secret = crypto.createHmac("sha256", "WebAppData").update(token).digest();
  const expected = crypto.createHmac("sha256", secret).update(dcs).digest("hex");

  const a = Buffer.from(expected, "hex");
  const b = Buffer.from(hash, "hex");
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;

  const raw: Record<string, string> = {};
  for (const [k, v] of pairs) raw[k] = v;

  const auth_date = Number(raw.auth_date ?? 0);
  if (!auth_date) return null;
  if (Date.now() / 1000 - auth_date > maxAgeSec) return null;

  let user: TgWebAppUser | undefined;
  if (raw.user) {
    try { user = JSON.parse(raw.user) as TgWebAppUser; } catch { /* ignore */ }
  }

  return { user, auth_date, query_id: raw.query_id, raw };
}
