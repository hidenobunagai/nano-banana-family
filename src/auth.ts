import type { NextAuthOptions } from "next-auth";
import type { GoogleProfile } from "next-auth/providers/google";
import GoogleProvider from "next-auth/providers/google";

/**
 * Parse the comma separated allow list into a normalized set.
 * The sign-in callback and the per-request check share this parsing so the
 * two can never disagree about who is allowed.
 */
function parseAllowedEmails(raw: string | undefined): Set<string> {
  return new Set(
    raw
      ?.split(",")
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean) ?? [],
  );
}

const allowedEmails = parseAllowedEmails(process.env.ALLOWED_EMAILS);

const authSecret = process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET;

if (!authSecret) {
  throw new Error(
    "Missing NextAuth secret. Set AUTH_SECRET or NEXTAUTH_SECRET in the environment.",
  );
}

const googleClientId = process.env.AUTH_GOOGLE_ID;
const googleClientSecret = process.env.AUTH_GOOGLE_SECRET;

export const hasGoogleAuthConfig = Boolean(googleClientId && googleClientSecret);

if (!hasGoogleAuthConfig) {
  console.warn("Google OAuth のクライアントID/シークレットが設定されていません。");
}

if (allowedEmails.size === 0) {
  console.error(
    "ALLOWED_EMAILS が未設定のため、どのアカウントもサインインできません。家族用のメールアドレスを ALLOWED_EMAILS に設定してください。",
  );
}

/**
 * Whether the email may use the app.
 *
 * Fails closed: an empty allow list allows nobody. The list is read on every
 * call, so removing an address revokes access for sessions that already
 * exist.
 */
export function isEmailAllowed(email: string | null | undefined): boolean {
  if (!email) {
    return false;
  }

  const allowed = parseAllowedEmails(process.env.ALLOWED_EMAILS);
  if (allowed.size === 0) {
    return false;
  }

  return allowed.has(email.trim().toLowerCase());
}

export const authOptions: NextAuthOptions = {
  secret: authSecret,
  providers:
    googleClientId && googleClientSecret
      ? [
          GoogleProvider({
            clientId: googleClientId,
            clientSecret: googleClientSecret,
          }),
        ]
      : [],
  callbacks: {
    async signIn({ profile }) {
      const googleProfile = profile as GoogleProfile | undefined;
      const email = googleProfile?.email?.toLowerCase();
      const emailVerified =
        typeof googleProfile?.email_verified === "boolean" ? googleProfile.email_verified : true;

      if (!email || !emailVerified) {
        return false;
      }

      return isEmailAllowed(email);
    },
  },
};
