/**
 * URL safety checks to prevent SSRF when fetching user-supplied URLs.
 * Rejects non-http(s) schemes, credentials in the URL, non-standard ports,
 * private/reserved IP literals, private DNS results, and unbounded redirects.
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

function isPrivateIpv6(ip: string): boolean {
  const lower = ip.toLowerCase();
  if (lower.startsWith("::")) return true;
  if (lower.startsWith("fe80") || lower.startsWith("fc") || lower.startsWith("fd")) {
    return true;
  }
  if (lower.startsWith("ff")) return true;
  return false;
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
