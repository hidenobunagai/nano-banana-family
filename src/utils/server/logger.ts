/**
 * Structured server-side logger for API routes.
 * Emits JSON lines in production (machine-readable for log aggregators),
 * and a compact formatted message in development.
 */

type LogLevel = "info" | "warn" | "error";

interface LogFields {
  route?: string;
  userId?: string;
  status?: number;
  durationMs?: number;
  [key: string]: unknown;
}

function log(level: LogLevel, message: string, fields: LogFields = {}) {
  if (process.env.NODE_ENV === "production") {
    const entry = JSON.stringify({
      level,
      message,
      timestamp: new Date().toISOString(),
      ...fields,
    });
    if (level === "error") {
      console.error(entry);
    } else if (level === "warn") {
      console.warn(entry);
    } else {
      console.log(entry);
    }
  } else {
    const prefix = `[${level.toUpperCase()}]`;
    const context = Object.keys(fields).length
      ? ` ${JSON.stringify(fields)}`
      : "";
    const formatted = `${prefix} ${message}${context}`;
    if (level === "error") {
      console.error(formatted);
    } else if (level === "warn") {
      console.warn(formatted);
    } else {
      console.log(formatted);
    }
  }
}

export const logger = {
  info: (message: string, fields?: LogFields) => log("info", message, fields),
  warn: (message: string, fields?: LogFields) => log("warn", message, fields),
  error: (message: string, error?: unknown, fields?: LogFields) => {
    const errorFields: LogFields = { ...fields };
    if (error instanceof Error) {
      errorFields.errorMessage = error.message;
      if (process.env.NODE_ENV !== "production") {
        errorFields.stack = error.stack;
      }
    } else if (error !== undefined) {
      errorFields.error = String(error);
    }
    log("error", message, errorFields);
  },
};
