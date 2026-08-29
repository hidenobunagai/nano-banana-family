import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock dependencies
const mockGetServerSession = vi.hoisted(() => vi.fn());
vi.mock("next-auth", () => ({
  getServerSession: mockGetServerSession,
}));

const mockCheckRateLimit = vi.hoisted(() => vi.fn());
vi.mock("@/utils/server/rateLimit", () => ({
  checkRateLimit: mockCheckRateLimit,
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
  });

  it("should return 401 when no session", async () => {
    mockGetServerSession.mockResolvedValue(null);

    const result = await withApiAuth("test-route");

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("Expected ok: false");
    expect(result.response.status).toBe(401);
  });

  it("should return 429 when rate limit exceeded", async () => {
    const mockSession = { user: { email: "test@example.com" } };
    mockGetServerSession.mockResolvedValue(mockSession);
    mockCheckRateLimit.mockReturnValue({ allowed: false, retryAfter: 30 });

    const result = await withApiAuth("test-route");

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("Expected ok: false");
    expect(result.response.status).toBe(429);
    expect(mockCheckRateLimit).toHaveBeenCalledWith("test@example.com");
  });

  it("should return session and apiKey when successful", async () => {
    const mockSession = { user: { email: "test@example.com" } };
    mockGetServerSession.mockResolvedValue(mockSession);
    mockCheckRateLimit.mockReturnValue({ allowed: true });

    const result = await withApiAuth("test-route");

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("Expected ok: true");
    expect(result.session).toEqual(mockSession);
    expect(result.apiKey).toBe("test-api-key");
  });

  it("should use anonymous when no email in session", async () => {
    const mockSession = { user: {} };
    mockGetServerSession.mockResolvedValue(mockSession);
    mockCheckRateLimit.mockReturnValue({ allowed: true });

    const result = await withApiAuth("test-route");

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("Expected ok: true");
    expect(mockCheckRateLimit).toHaveBeenCalledWith("anonymous");
  });

  it("should return 500 when API key missing", async () => {
    delete process.env.GEMINI_API_KEY;
    const mockSession = { user: { email: "test@example.com" } };
    mockGetServerSession.mockResolvedValue(mockSession);
    mockCheckRateLimit.mockReturnValue({ allowed: true });

    const result = await withApiAuth("test-route");

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("Expected ok: false");
    expect(result.response.status).toBe(500);

    // Restore for other tests
    process.env.GEMINI_API_KEY = "test-api-key";
  });
});
