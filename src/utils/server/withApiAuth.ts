import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

import { authOptions } from "@/auth";
import { checkRateLimit } from "@/utils/server/rateLimit";
import { logger } from "@/utils/server/logger";

/**
 * Shared auth guard for image-generation API routes.
 * Returns `{ session, apiKey }` on success, or a NextResponse to return early.
 */
export async function withApiAuth(
  routeName: string,
): Promise<
  | { ok: true; session: { user: { email?: string | null } }; apiKey: string }
  | { ok: false; response: NextResponse }
> {
  // 1. Session check
  const session = await getServerSession(authOptions);
  if (!session) {
    return {
      ok: false,
      response: NextResponse.json({ error: "認証が必要です。" }, { status: 401 }),
    };
  }

  const userId = session.user?.email ?? "anonymous";

  // 2. Rate limit
  const rl = checkRateLimit(userId);
  if (!rl.allowed) {
    const retryAfter = rl.retryAfter ?? 60;
    const response = NextResponse.json(
      { error: `リクエストが多すぎます。${retryAfter}秒後にもう一度お試しください。` },
      { status: 429 },
    );
    response.headers.set("Retry-After", String(retryAfter));
    return { ok: false, response };
  }

  // 3. API key
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    logger.error(`${routeName}: missing GEMINI_API_KEY`);
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Gemini API キーが設定されていません。" },
        { status: 500 },
      ),
    };
  }

  return { ok: true, session: session as { user: { email?: string | null } }, apiKey };
}
