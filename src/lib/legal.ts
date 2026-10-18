/**
 * The about, privacy policy and terms pages for this app.
 *
 * The text is not written here. It lives in the legal-site repository, which
 * renders one page per app from a single registry of the facts that app
 * actually handles, so a policy cannot drift away from what the app does.
 * Google expects the policy on the app's own domain, so these routes fetch
 * that site's rendering for this app and serve it here.
 */

const LEGAL_ORIGIN = "https://legal.misato-labs.com";
const APP_SLUG = "nano-banana-family";

export type LegalPage = "home" | "privacy" | "terms";

/** URL segments this app answers, and the legal-site page each one shows. */
export const LEGAL_ROUTES: Readonly<Record<string, LegalPage>> = {
  about: "home",
  privacy: "privacy",
  terms: "terms",
};

/**
 * How long a fetched copy may be reused. Deliberately short: legal-site is the
 * single source of truth, and a published policy that lagged behind it would be
 * wrong. The shared cache absorbs the traffic, so this is not a per-visitor cost.
 */
const CACHE_SECONDS = 5 * 60;

/**
 * `view=app` makes legal-site render its navigation for this domain, so the
 * links on the page stay on nb-studio.misato-labs.com instead of pointing back
 * to the other site.
 */
function sourceUrl(page: LegalPage): string {
  const path = page === "home" ? "" : `/${page}`;
  return `${LEGAL_ORIGIN}/apps/${APP_SLUG}${path}?view=app`;
}

/** The canonical address of one of this app's pages, used in the fallback. */
export function canonicalUrl(page: LegalPage): string {
  return `${LEGAL_ORIGIN}/apps/${APP_SLUG}${page === "home" ? "" : `/${page}`}`;
}

function looksLikePage(body: string): boolean {
  return body.startsWith("<!DOCTYPE html>") && body.includes("</html>");
}

function headers(): Record<string, string> {
  return {
    "content-type": "text/html; charset=utf-8",
    "cache-control": `public, max-age=0, s-maxage=${CACHE_SECONDS}, stale-while-revalidate=86400`,
    "x-content-type-options": "nosniff",
    "referrer-policy": "no-referrer",
  };
}

/**
 * Serve one of the policy pages. Next caches the fetch for CACHE_SECONDS and the
 * response is cacheable at the edge, so most readers are served without waiting
 * on the other site.
 */
export async function legalPageResponse(page: LegalPage): Promise<Response> {
  let body = "";
  try {
    const upstream = await fetch(sourceUrl(page), {
      headers: { accept: "text/html" },
      next: { revalidate: CACHE_SECONDS },
    });
    if (upstream.ok) body = await upstream.text();
  } catch {
    // Fall through to the pointer below rather than failing the request.
  }

  if (!looksLikePage(body)) return fallback(page);
  return new Response(body, { status: 200, headers: headers() });
}

/**
 * Used only when the page could not be fetched. It states nothing about data
 * handling, because guessing here is exactly what this arrangement exists to
 * avoid; it points at the canonical copy instead.
 */
function fallback(page: LegalPage): Response {
  const title =
    page === "home"
      ? "Nano Banana Family"
      : page === "privacy"
        ? "プライバシーポリシー"
        : "利用規約";
  const body = `<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title}</title>
</head>
<body style="font-family:sans-serif;max-width:44rem;margin:0 auto;padding:2rem 1rem;line-height:1.7">
<h1>${title}</h1>
<p>このページをいま読み込めませんでした。</p>
<p><a href="${canonicalUrl(page)}">${title}（原本）を開く</a></p>
</body>
</html>
`;
  return new Response(body, { status: 200, headers: headers() });
}
