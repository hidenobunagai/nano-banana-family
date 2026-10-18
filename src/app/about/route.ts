import { legalPageResponse } from "@/lib/legal";

/**
 * The app's home page for OAuth branding purposes: a description of the app
 * itself, which Google requires to be more than a sign-in page. The text comes
 * from the legal-site registry, so nothing here can drift from the app.
 */
export function GET() {
  return legalPageResponse("home");
}
