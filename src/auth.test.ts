import { afterEach, describe, expect, it, vi } from "vitest";
import type { NextAuthOptions } from "next-auth";

type SignIn = NonNullable<NonNullable<NextAuthOptions["callbacks"]>["signIn"]>;
type SignInParams = Parameters<SignIn>[0];

type AuthModule = {
  authOptions: NextAuthOptions;
  hasGoogleAuthConfig: boolean;
  isEmailAllowed: (email: string | null | undefined) => boolean;
};

// auth.ts reads the environment (and throws) at module scope, so every case
// re-imports a fresh module instance with stubbed variables.
async function importAuth({
  allowedEmails,
  withGoogleConfig = true,
}: {
  allowedEmails?: string;
  withGoogleConfig?: boolean;
} = {}): Promise<AuthModule> {
  vi.resetModules();
  vi.stubEnv("AUTH_SECRET", "test-secret");
  vi.stubEnv("NEXTAUTH_SECRET", undefined);
  vi.stubEnv("ALLOWED_EMAILS", allowedEmails);
  vi.stubEnv("AUTH_GOOGLE_ID", withGoogleConfig ? "google-client-id" : "");
  vi.stubEnv("AUTH_GOOGLE_SECRET", withGoogleConfig ? "google-client-secret" : "");
  return import("./auth");
}

function getSignIn(auth: AuthModule): SignIn {
  const signIn = auth.authOptions.callbacks?.signIn;
  if (!signIn) throw new Error("signIn callback is not configured");
  return signIn;
}

function signInParams(profile: Record<string, unknown>): SignInParams {
  return {
    user: { id: "google-user-1", email: "user@example.com" },
    account: null,
    profile,
  } as unknown as SignInParams;
}

describe("auth", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  describe("signIn", () => {
    it("allows a whitelisted Google account regardless of email casing", async () => {
      const auth = await importAuth({ allowedEmails: "Mom@Example.com, dad@example.com" });

      expect(auth.hasGoogleAuthConfig).toBe(true);
      expect(auth.authOptions.providers).toHaveLength(1);

      const signIn = getSignIn(auth);
      await expect(
        signIn(signInParams({ email: "MOM@example.com", email_verified: true })),
      ).resolves.toBe(true);
      await expect(
        signIn(signInParams({ email: "dad@example.com", email_verified: true })),
      ).resolves.toBe(true);
      // Providers that omit email_verified keep the permissive default.
      await expect(signIn(signInParams({ email: "mom@example.com" }))).resolves.toBe(true);
    });

    it("denies a Google account that is not on the allow list", async () => {
      const auth = await importAuth({ allowedEmails: "mom@example.com" });

      await expect(
        getSignIn(auth)(signInParams({ email: "stranger@example.com", email_verified: true })),
      ).resolves.toBe(false);
    });

    it("denies profiles without a verified email address", async () => {
      const auth = await importAuth({ allowedEmails: "mom@example.com" });
      const signIn = getSignIn(auth);

      await expect(signIn(signInParams({ email_verified: true }))).resolves.toBe(false);
      await expect(
        signIn(signInParams({ email: "mom@example.com", email_verified: false })),
      ).resolves.toBe(false);
    });

    it("denies every Google account and logs an error when ALLOWED_EMAILS is empty", async () => {
      const error = vi.spyOn(console, "error").mockImplementation(() => {});
      const auth = await importAuth({ allowedEmails: "" });

      await expect(
        getSignIn(auth)(signInParams({ email: "anyone@example.com", email_verified: true })),
      ).resolves.toBe(false);
      expect(error).toHaveBeenCalledWith(expect.stringContaining("ALLOWED_EMAILS"));
    });
  });

  describe("isEmailAllowed", () => {
    it("allows an email on the list regardless of casing", async () => {
      const auth = await importAuth({ allowedEmails: "Mom@Example.com" });

      expect(auth.isEmailAllowed("mom@example.com")).toBe(true);
      expect(auth.isEmailAllowed("MOM@EXAMPLE.COM")).toBe(true);
    });

    it("denies an email that is not on the list", async () => {
      const auth = await importAuth({ allowedEmails: "mom@example.com" });

      expect(auth.isEmailAllowed("stranger@example.com")).toBe(false);
    });

    it("denies every email when the list is empty", async () => {
      vi.spyOn(console, "error").mockImplementation(() => {});
      const auth = await importAuth({ allowedEmails: "" });

      expect(auth.isEmailAllowed("mom@example.com")).toBe(false);
    });

    it("denies a missing email", async () => {
      const auth = await importAuth({ allowedEmails: "mom@example.com" });

      expect(auth.isEmailAllowed(null)).toBe(false);
      expect(auth.isEmailAllowed(undefined)).toBe(false);
      expect(auth.isEmailAllowed("")).toBe(false);
    });

    it("revokes access as soon as the email leaves the list", async () => {
      const auth = await importAuth({ allowedEmails: "mom@example.com" });
      expect(auth.isEmailAllowed("mom@example.com")).toBe(true);

      vi.stubEnv("ALLOWED_EMAILS", "dad@example.com");

      expect(auth.isEmailAllowed("mom@example.com")).toBe(false);
      expect(auth.isEmailAllowed("dad@example.com")).toBe(true);
    });
  });

  describe("hasGoogleAuthConfig", () => {
    it("registers no provider and warns when the Google credentials are missing", async () => {
      const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
      const auth = await importAuth({
        allowedEmails: "mom@example.com",
        withGoogleConfig: false,
      });

      expect(auth.hasGoogleAuthConfig).toBe(false);
      expect(auth.authOptions.providers).toEqual([]);
      expect(warn).toHaveBeenCalledWith(expect.stringContaining("Google OAuth"));
    });
  });

  it("throws when neither AUTH_SECRET nor NEXTAUTH_SECRET is set", async () => {
    vi.resetModules();
    vi.stubEnv("AUTH_SECRET", undefined);
    vi.stubEnv("NEXTAUTH_SECRET", undefined);

    await expect(import("./auth")).rejects.toThrow(/AUTH_SECRET or NEXTAUTH_SECRET/);
  });
});
