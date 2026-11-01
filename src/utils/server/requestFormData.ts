import { NextResponse } from "next/server";

/**
 * Message shown when the request body is not a valid multipart form.
 */
export const INVALID_FORM_DATA_MESSAGE =
  "リクエストの形式が正しくありません。フォームデータとして送信してください。";

/**
 * Read the multipart form data of a request.
 *
 * `Request.formData()` throws when the body is missing, malformed or not a
 * multipart payload, so the failure is turned into a 400 response here
 * instead of escaping as an unhandled exception.
 */
export async function readFormData(
  request: Request,
): Promise<{ ok: true; formData: FormData } | { ok: false; response: NextResponse }> {
  try {
    return { ok: true, formData: await request.formData() };
  } catch {
    return {
      ok: false,
      response: NextResponse.json({ error: INVALID_FORM_DATA_MESSAGE }, { status: 400 }),
    };
  }
}
