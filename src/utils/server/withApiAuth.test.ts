import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock dependencies
const mockGetServerSession = vi.hoisted(() => vi.fn());
const mockIsEmailAllowed = vi.hoisted(() => vi.fn());
vi.mock("next-auth", () => ({
  getServerSession: mockGetServerSession,
}));

vi.mock("@/utils/server/logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock("@/auth", () => ({
  authOptions: {},
  isEmailAllowed: mockIsEmailAllowed,
}));

vi.mock("next/server", () => ({
  NextResponse: {
    json: vi.fn((data, init) => {
      const response = {
        status: init?.status || 200,
        json: () => Promise.resolve(data),
        data,
        headers: new Map<string, string>(),
      };
      return response;
    }),
  },
}));

// Set environment variable for API key
process.env.GEMINI_API_KEY = "test-api-key";

import { withApiAuth } from "./withApiAuth";

describe("withApiAuth", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsEmailAllowed.mockReturnValue(true);
  });

  it("should return 401 when no session", async () => {
    mockGetServerSession.mockResolvedValue(null);

    const result = await withApiAuth("test-route");

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("Expected ok: false");
    expect(result.response.status).toBe(401);
  });

  it("should return session and apiKey when successful", async () => {
    const mockSession = { user: { email: "test@example.com" } };
    mockGetServerSession.mockResolvedValue(mockSession);

    const result = await withApiAuth("test-route");

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("Expected ok: true");
    expect(result.session).toEqual(mockSession);
    expect(result.apiKey).toBe("test-api-key");
  });

  it("should return 500 when API key missing", async () => {
    delete process.env.GEMINI_API_KEY;
    const mockSession = { user: { email: "test@example.com" } };
    mockGetServerSession.mockResolvedValue(mockSession);

    const result = await withApiAuth("test-route");

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("Expected ok: false");
    expect(result.response.status).toBe(500);

    // Restore for other tests
    process.env.GEMINI_API_KEY = "test-api-key";
  });

  it("should return 403 when the session email is not on the allow list", async () => {
    mockGetServerSession.mockResolvedValue({ user: { email: "stranger@example.com" } });
    mockIsEmailAllowed.mockReturnValue(false);

    const result = await withApiAuth("test-route");

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("Expected ok: false");
    expect(result.response.status).toBe(403);
    const body = (result.response as unknown as { data: { error: string } }).data;
    expect(body.error).toContain("許可");
  });

  it("should return 403 when the session has no email", async () => {
    mockGetServerSession.mockResolvedValue({ user: {} });
    mockIsEmailAllowed.mockReturnValue(false);

    const result = await withApiAuth("test-route");

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("Expected ok: false");
    expect(result.response.status).toBe(403);
  });

  it("should check the allow list for every call", async () => {
    mockGetServerSession.mockResolvedValue({ user: { email: "test@example.com" } });

    await withApiAuth("test-route");
    await withApiAuth("test-route");

    expect(mockIsEmailAllowed).toHaveBeenCalledTimes(2);
    expect(mockIsEmailAllowed).toHaveBeenCalledWith("test@example.com");
  });
});
