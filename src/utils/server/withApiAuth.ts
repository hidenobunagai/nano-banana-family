import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

import { authOptions, isEmailAllowed } from "@/auth";
import { logger } from "@/utils/server/logger";

const EMAIL_NOT_ALLOWED_MESSAGE =
  "このアカウントは利用が許可されていません。アクセス権をご確認ください。";

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

  // 2. Allow list check: a valid session is not enough, the email must still
  // be allowed, so removing an address revokes access right away.
  const email = session.user?.email ?? null;
  if (!isEmailAllowed(email)) {
    logger.error(`${routeName}: email is not on the allow list`, undefined, {
      route: routeName,
      email: email ?? "unknown",
    });
    return {
      ok: false,
      response: NextResponse.json({ error: EMAIL_NOT_ALLOWED_MESSAGE }, { status: 403 }),
    };
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
