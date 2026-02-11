/**
 * URL metadata extraction utility for Icon Creator.
 * Fetches a page and extracts title, description, and OG image.
 */

export interface UrlMetadata {
  title: string | null;
  description: string | null;
  ogImage: string | null;
}

const FETCH_TIMEOUT_MS = 5000;

/**
 * Fetch a URL and extract metadata (title, meta description, og:image).
 * Returns partial results even if some fields are missing.
 * Returns null if the fetch fails entirely.
 */
export async function fetchUrlMetadata(url: string): Promise<UrlMetadata | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; HideNBStudio/1.0; +https://hide-nb-studio.vercel.app)",
        Accept: "text/html,application/xhtml+xml",
      },
      redirect: "follow",
    });

    clearTimeout(timeout);

    if (!response.ok) {
      return null;
    }

    const contentType = response.headers.get("content-type") ?? "";
    if (!contentType.includes("text/html")) {
      return null;
    }

    const html = await response.text();

    return {
      title: extractTitle(html),
      description: extractMetaContent(html, "description"),
      ogImage: extractOgImage(html),
    };
  } catch {
    return null;
  }
}

function extractTitle(html: string): string | null {
  const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return match ? decodeHtmlEntities(match[1].trim()) : null;
}

function extractMetaContent(html: string, name: string): string | null {
  const pattern = new RegExp(`<meta[^>]+name=["']${name}["'][^>]+content=["']([^"']+)["']`, "i");
  const match = html.match(pattern);
  if (match) return decodeHtmlEntities(match[1].trim());

  // Try reversed attribute order: content before name
  const reversedPattern = new RegExp(
    `<meta[^>]+content=["']([^"']+)["'][^>]+name=["']${name}["']`,
    "i",
  );
  const reversedMatch = html.match(reversedPattern);
  return reversedMatch ? decodeHtmlEntities(reversedMatch[1].trim()) : null;
}

function extractOgImage(html: string): string | null {
  const pattern = /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i;
  const match = html.match(pattern);
  if (match) return match[1].trim();

  // Try reversed attribute order
  const reversedPattern = /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i;
  const reversedMatch = html.match(reversedPattern);
  return reversedMatch ? reversedMatch[1].trim() : null;
}

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number.parseInt(code, 10)));
}
