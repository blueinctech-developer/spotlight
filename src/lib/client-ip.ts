/**
 * The visitor's IP address, used only for rate limiting and abuse investigation (it is hashed
 * before storage). The left-most X-Forwarded-For entry is whatever the client sent, so it must
 * not be trusted. Instead:
 *
 * - TRUSTED_IP_HEADER (e.g. "cf-connecting-ip" behind Cloudflare) wins when set.
 * - On Vercel, the platform's own headers (x-vercel-forwarded-for / x-real-ip) are used.
 * - Otherwise the entry added by our own proxy is used: counting TRUSTED_PROXY_HOPS (default 1)
 *   entries from the right of X-Forwarded-For.
 */
export function clientIpFrom(h: Pick<Headers, "get">, env: Record<string, string | undefined> = process.env): string {
  const custom = env.TRUSTED_IP_HEADER?.trim().toLowerCase();
  if (custom) {
    const v = h.get(custom)?.split(",")[0].trim();
    if (v) return v;
  }
  if (env.VERCEL) {
    const v = (h.get("x-vercel-forwarded-for") ?? h.get("x-real-ip") ?? "").split(",")[0].trim();
    if (v) return v;
  }
  const chain = (h.get("x-forwarded-for") ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (chain.length) {
    const hops = Math.max(1, Number.parseInt(env.TRUSTED_PROXY_HOPS ?? "1", 10) || 1);
    return chain[Math.max(0, chain.length - hops)];
  }
  return h.get("x-real-ip")?.trim() || "unknown";
}
