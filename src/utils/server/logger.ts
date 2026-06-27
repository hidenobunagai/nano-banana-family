type LogLevel = "info" | "warn" | "error";

interface LogFields {
  route?: string;
  userId?: string;
  status?: number;
  durationMs?: number;
  [key: string]: unknown;
}

const LEVEL_MAP: Record<LogLevel, "log" | "warn" | "error"> = {
  info: "log",
  warn: "warn",
  error: "error",
};

function log(level: LogLevel, message: string, fields: LogFields = {}) {
  const consoleMethod = LEVEL_MAP[level];
  if (process.env.NODE_ENV === "production") {
    const entry = JSON.stringify({
      level,
      message,
      timestamp: new Date().toISOString(),
      ...fields,
    });
    console[consoleMethod](entry);
  } else {
    const prefix = `[${level.toUpperCase()}]`;
    const context = Object.keys(fields).length
      ? ` ${JSON.stringify(fields)}`
      : "";
    console[consoleMethod](`${prefix} ${message}${context}`);
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
