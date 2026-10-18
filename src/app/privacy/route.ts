import { legalPageResponse } from "@/lib/legal";

export function GET() {
  return legalPageResponse("privacy");
}
