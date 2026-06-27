import { describe, it, expect, vi, beforeEach } from "vitest";
import { logger } from "./logger";

describe("logger", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe("info", () => {
    it("logs formatted message in development", () => {
      vi.stubEnv("NODE_ENV", "development");
      const spy = vi.spyOn(console, "log").mockImplementation(() => {});

      logger.info("hello", { route: "/test" });

      expect(spy).toHaveBeenCalledWith("[INFO] hello {\"route\":\"/test\"}");
    });

    it("logs JSON in production", () => {
      vi.stubEnv("NODE_ENV", "production");
      const spy = vi.spyOn(console, "log").mockImplementation(() => {});

      logger.info("hello", { route: "/test" });

      expect(spy).toHaveBeenCalledTimes(1);
      const entry = JSON.parse(spy.mock.calls[0][0]);
      expect(entry.level).toBe("info");
      expect(entry.message).toBe("hello");
      expect(entry.route).toBe("/test");
      expect(entry.timestamp).toBeDefined();
    });

    it("logs without fields", () => {
      vi.stubEnv("NODE_ENV", "development");
      const spy = vi.spyOn(console, "log").mockImplementation(() => {});

      logger.info("bare message");

      expect(spy).toHaveBeenCalledWith("[INFO] bare message");
    });
  });

  describe("warn", () => {
    it("logs to console.warn", () => {
      vi.stubEnv("NODE_ENV", "development");
      const spy = vi.spyOn(console, "warn").mockImplementation(() => {});

      logger.warn("caution");

      expect(spy).toHaveBeenCalledWith("[WARN] caution");
    });
  });

  describe("error", () => {
    it("logs error message with stack in development", () => {
      vi.stubEnv("NODE_ENV", "development");
      const spy = vi.spyOn(console, "error").mockImplementation(() => {});
      const err = new Error("boom");

      logger.error("failed", err, { route: "/test" });

      expect(spy).toHaveBeenCalledTimes(1);
      const call = spy.mock.calls[0][0];
      expect(call).toContain("[ERROR] failed");
      expect(call).toContain("boom");
      expect(call).toContain("stack");
    });

    it("logs error without stack in production", () => {
      vi.stubEnv("NODE_ENV", "production");
      const spy = vi.spyOn(console, "error").mockImplementation(() => {});
      const err = new Error("boom");

      logger.error("failed", err, { route: "/test" });

      const entry = JSON.parse(spy.mock.calls[0][0]);
      expect(entry.level).toBe("error");
      expect(entry.message).toBe("failed");
      expect(entry.errorMessage).toBe("boom");
      expect(entry.stack).toBeUndefined();
    });

    it("handles non-Error values", () => {
      vi.stubEnv("NODE_ENV", "development");
      const spy = vi.spyOn(console, "error").mockImplementation(() => {});

      logger.error("unknown", "string error");

      expect(spy.mock.calls[0][0]).toContain("[ERROR] unknown");
      expect(spy.mock.calls[0][0]).toContain("string error");
    });
  });
});
