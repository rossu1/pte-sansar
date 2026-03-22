/**
 * Structured logging utility for Edge Functions.
 */

interface LogEntry {
  timestamp: string;
  level: "info" | "warn" | "error";
  function_name: string;
  action: string;
  user_id?: string;
  duration_ms?: number;
  error?: string;
  details?: Record<string, unknown>;
}

export function createLogger(functionName: string) {
  const log = (level: LogEntry["level"], action: string, extra?: Partial<LogEntry>) => {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      function_name: functionName,
      action,
      ...extra,
    };
    const msg = JSON.stringify(entry);
    if (level === "error") console.error(msg);
    else if (level === "warn") console.warn(msg);
    else console.log(msg);
  };

  return {
    info: (action: string, extra?: Partial<LogEntry>) => log("info", action, extra),
    warn: (action: string, extra?: Partial<LogEntry>) => log("warn", action, extra),
    error: (action: string, extra?: Partial<LogEntry>) => log("error", action, extra),
    /** Time an async operation */
    async timed<T>(action: string, fn: () => Promise<T>, extra?: Partial<LogEntry>): Promise<T> {
      const start = Date.now();
      try {
        const result = await fn();
        log("info", action, { ...extra, duration_ms: Date.now() - start });
        return result;
      } catch (e) {
        log("error", action, {
          ...extra,
          duration_ms: Date.now() - start,
          error: e instanceof Error ? e.message : String(e),
        });
        throw e;
      }
    },
  };
}
