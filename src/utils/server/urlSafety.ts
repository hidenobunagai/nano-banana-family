/**
 * URL safety checks to prevent SSRF when fetching user-supplied URLs.
 * Rejects non-http(s) schemes, credentials in the URL, non-standard ports,
 * private/reserved IP literals, private DNS results, and unbounded redirects.
 * Also caps how much of a response body a caller can read.
 *
 * Limitation: resolved addresses are validated but not pinned to the socket, so
 * a hostname that resolves to a public address here and to a private one at
 * connect time (DNS rebinding TOCTOU) is still reachable. Pinning would mean
 * connecting to the resolved address while passing the hostname in the Host
 * header; that is a larger change and is deliberately not done here.
 */

import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

export const MAX_REDIRECTS = 3;
const SAFE_PORTS = new Set([80, 443]);
const REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308]);
const PRIVATE_HOSTNAME_SUFFIXES = [".localhost", ".local", ".internal"];

export class UnsafeUrlError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UnsafeUrlError";
  }
}

function isPrivateIpv4(ip: string): boolean {
  const [a, b] = ip.split(".").map(Number);
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 198 && (b === 18 || b === 19)) ||
    a >= 224
  );
}

/**
 * Canonicalize an IPv6 literal to the compressed lowercase form Node uses, so
 * equivalent spellings compare equal: "0:0:0:0:0:ffff:7f00:1",
 * "0:0:0:0:0:ffff:127.0.0.1" and "::FFFF:127.0.0.1" all become "::ffff:7f00:1".
 * The WHATWG URL parser is reused for the compression instead of hand-rolling
 * it. Returns null when the input is not an IPv6 literal (e.g. it carries a
 * scope/zone suffix such as "fe80::1%eth0", which the URL parser refuses).
 */
function canonicalizeIpv6(ip: string): string | null {
  try {
    const { hostname } = new URL(`http://[${ip}]/`);
    if (!hostname.startsWith("[") || !hostname.endsWith("]")) return null;
    return hostname.slice(1, -1).toLowerCase();
  } catch {
    return null;
  }
}

/**
 * Extract the embedded IPv4 octets of an IPv4-mapped IPv6 address in canonical
 * form ("::ffff:7f00:1" -> "127.0.0.1"). Returns null for any other address.
 */
function mappedIpv4Of(canonicalIpv6: string): string | null {
  const match = /^::ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/.exec(canonicalIpv6);
  if (!match) return null;
  const high = Number.parseInt(match[1], 16);
  const low = Number.parseInt(match[2], 16);
  return `${high >> 8}.${high & 0xff}.${low >> 8}.${low & 0xff}`;
}

function isPrivateIpv6(ip: string): boolean {
  const canonical = canonicalizeIpv6(ip) ?? ip.toLowerCase();

  // IPv4-mapped addresses (::ffff:a.b.c.d) are routed to the embedded IPv4
  // address, so judge that address instead of the wrapper: that both rejects
  // internal targets and keeps public ones reachable.
  const mapped = mappedIpv4Of(canonical);
  if (mapped !== null) return isPrivateIpv4(mapped);

  // any other ::-prefixed form (::1, ::, ::7f00:1) stays private
  if (canonical.startsWith("::")) return true;

  // Judge the leading 16 bits numerically rather than by string prefix: the
  // link-local block is the /10 fe80:: through febf::, so matching "fe80"
  // only caught its first sixteenth and let fe8f::1 / fe90::1 / febf::1
  // through. A non-hextet head is impossible here (canonical IPv6 that does
  // not start with "::"), and NaN matches no mask anyway.
  const head = Number.parseInt(canonical.split(":", 1)[0], 16);
  return (
    (head & 0xffc0) === 0xfe80 || // fe80::/10 link-local
    (head & 0xfe00) === 0xfc00 || // fc00::/7 unique local
    (head & 0xff00) === 0xff00 // ff00::/8 multicast
  );
}

function isPrivateHostname(hostname: string): boolean {
  if (hostname === "localhost") return true;
  return PRIVATE_HOSTNAME_SUFFIXES.some((suffix) => hostname.endsWith(suffix));
}

/**
 * Validate a URL and verify its hostname does not resolve to a private
 * or reserved address. Returns the normalized URL on success.
 */
export async function assertSafeUrl(rawUrl: string): Promise<string> {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new UnsafeUrlError("URLの形式が正しくありません。");
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new UnsafeUrlError("http/httpsのURLのみ利用できます。");
  }

  if (url.username || url.password) {
    throw new UnsafeUrlError("認証情報を含むURLは利用できません。");
  }

  const port = url.port ? Number(url.port) : url.protocol === "https:" ? 443 : 80;
  if (!SAFE_PORTS.has(port)) {
    throw new UnsafeUrlError("許可されていないポートのURLです。");
  }

  const rawHostname = url.hostname;
  const hostname = (
    rawHostname.startsWith("[") && rawHostname.endsWith("]")
      ? rawHostname.slice(1, -1)
      : rawHostname
  ).toLowerCase();
  if (isPrivateHostname(hostname)) {
    throw new UnsafeUrlError("プライベートなホスト名へのアクセスは許可されていません。");
  }

  const ipVersion = isIP(hostname);
  if (ipVersion === 4) {
    if (isPrivateIpv4(hostname)) {
      throw new UnsafeUrlError("プライベートアドレスへのアクセスは許可されていません。");
    }
    return url.toString();
  }
  if (ipVersion === 6) {
    if (isPrivateIpv6(hostname)) {
      throw new UnsafeUrlError("プライベートアドレスへのアクセスは許可されていません。");
    }
    return url.toString();
  }

  const addresses = await lookup(hostname, { all: true });
  for (const { address } of addresses) {
    const version = isIP(address);
    if (version === 4 && isPrivateIpv4(address)) {
      throw new UnsafeUrlError("プライベートアドレスへのアクセスは許可されていません。");
    }
    if (version === 6 && isPrivateIpv6(address)) {
      throw new UnsafeUrlError("プライベートアドレスへのアクセスは許可されていません。");
    }
  }

  return url.toString();
}

/**
 * Fetch a URL following redirects manually, re-validating every hop
 * against the same safety rules.
 */
export async function fetchWithRedirects(url: string, init: RequestInit = {}): Promise<Response> {
  let currentUrl = await assertSafeUrl(url);

  for (let hop = 0; ; hop += 1) {
    const response = await fetch(currentUrl, { ...init, redirect: "manual" });

    if (!REDIRECT_STATUSES.has(response.status)) {
      return response;
    }

    const location = response.headers.get("location");
    response.body?.cancel();

    if (!location) {
      return new Response(null, { status: 502 });
    }

    if (hop >= MAX_REDIRECTS) {
      throw new UnsafeUrlError("リダイレクトが多すぎます。");
    }

    currentUrl = await assertSafeUrl(new URL(location, currentUrl).toString());
  }
}

/**
 * Read a response body of at most `limit` bytes.
 * Rejects up front when content-length already exceeds the limit, then stops
 * reading as soon as the streamed body passes it, so a chunked response that
 * never ends cannot exhaust memory. Returns null when the body is too large.
 */
export async function readBodyWithLimit(response: Response, limit: number): Promise<Buffer | null> {
  const declared = response.headers.get("content-length");
  if (declared && Number(declared) > limit) {
    await response.body?.cancel();
    return null;
  }

  if (!response.body) return Buffer.alloc(0);

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > limit) {
        await reader.cancel();
        return null;
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  return Buffer.concat(chunks, total);
}
