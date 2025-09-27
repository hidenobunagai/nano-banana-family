import type { NextAuthOptions } from "next-auth";
import type { GoogleProfile } from "next-auth/providers/google";
import GoogleProvider from "next-auth/providers/google";

const allowedEmails = new Set(
  process.env.ALLOWED_EMAILS
    ?.split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean),
);

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
        typeof googleProfile?.email_verified === "boolean"
          ? googleProfile.email_verified
          : true;

      if (!email || !emailVerified) {
        return false;
      }

      if (allowedEmails.size === 0) {
        return true;
      }

      return allowedEmails.has(email);
    },
  },
};
