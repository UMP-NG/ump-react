/**
 * Minimal structured logger.
 *
 * In production (NODE_ENV=production) debug/info logs are suppressed so they
 * never appear in Render logs for normal traffic. warn and error always print.
 *
 * Usage (drop-in replacement for console.log):
 *   import logger from "./utils/logger.js";
 *   logger.info("Server started on port", port);
 *   logger.warn("Slow query detected");
 *   logger.error("Payment failed", err);
 *   logger.debug("Raw body:", body);   // only prints outside production
 */

const isProd = process.env.NODE_ENV === "production";

function fmt(level, args) {
  const ts = new Date().toISOString();
  const prefix = `[${ts}] [${level.toUpperCase()}]`;
  return [prefix, ...args];
}

const logger = {
  debug: (...args) => { if (!isProd) console.debug(...fmt("debug", args)); },
  info:  (...args) => { if (!isProd) console.info(...fmt("info",  args)); },
  warn:  (...args) => { console.warn(...fmt("warn",  args)); },
  error: (...args) => { console.error(...fmt("error", args)); },
};

export default logger;
