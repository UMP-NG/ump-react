// app.js
import * as Sentry from "@sentry/node";
import logger from "./utils/logger.js";

// Initialise Sentry before anything else so it can instrument the app.
// Set SENTRY_DSN in your environment to enable it; omit to skip silently.
if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn:              process.env.SENTRY_DSN,
    environment:      process.env.NODE_ENV || "development",
    tracesSampleRate: 0.2, // capture 20% of transactions for performance monitoring
  });
}

import express from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import path from "path";
import cookieParser from "cookie-parser";
import { fileURLToPath } from "url";
// express-mongo-sanitize is incompatible with Express 5 (req.query is a read-only getter).
// Custom sanitizer below mutates query properties in-place instead of reassigning req.query.
function _sanitizeValue(v) {
  if (Array.isArray(v)) return v.map(_sanitizeValue);
  if (v !== null && typeof v === "object") return _sanitizeDoc(v);
  return v;
}
function _sanitizeDoc(doc) {
  const out = {};
  for (const k of Object.keys(doc)) {
    const clean = k.replace(/[$.]/g, "_");
    if (clean !== k && process.env.NODE_ENV !== "production")
      logger.warn(`⚠️  Sanitized key: ${k}`);
    out[clean] = _sanitizeValue(doc[k]);
  }
  return out;
}
function mongoSanitize() {
  return (req, _res, next) => {
    if (req.body && typeof req.body === "object") req.body = _sanitizeDoc(req.body);
    if (req.params && typeof req.params === "object") req.params = _sanitizeDoc(req.params);
    if (req.query && typeof req.query === "object") {
      // Express 5: req.query is getter-only — mutate the existing object in-place
      const q = req.query;
      const sanitized = _sanitizeDoc(q);
      for (const k of Object.keys(q)) delete q[k];
      Object.assign(q, sanitized);
    }
    next();
  };
}
import hpp from "hpp";
import mongoose from "mongoose";
import { globalLimiter } from "./middleware/rateLimits.js";

// 🧩 ROUTES
import authRoutes from "./routes/authroutes.js";
import productRoutes from "./routes/productRoutes.js";
import reviewRoutes from "./routes/reviewRoutes.js";
import followRoutes from "./routes/followRoutes.js";
import orderRoutes from "./routes/orderRoutes.js";
import messageRoutes from "./routes/messageRoutes.js";
import sellerRoutes from "./routes/sellerRoutes.js";
import serviceRoutes from "./routes/serviceRoutes.js";
import listingRoutes from "./routes/listingRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import searchRoutes from "./routes/searchRoutes.js";
import roleRoutes from "./routes/userRoleRoutes.js";
import categoryRoutes from "./routes/categoryRoutes.js";
import cartRoutes from "./routes/cartRoutes.js";
import paymentRoutes from "./routes/paymentRoutes.js";
import bookingRoutes from "./routes/bookingRoutes.js";
import sellerDashboardRoutes from "./routes/sellerAnalyticsRoutes.js";
import payoutRoutes from "./routes/payoutRoutes.js";
import notificationRoutes from "./routes/notificationRoutes.js";
import wishlistRoutes from "./routes/wishlistRoutes.js";
import serviceAnalytics from "./routes/serviceAnalyticsRoutes.js";
import reportRoutes from "./routes/reportRoutes.js";
import pushRoutes from "./routes/pushRoutes.js";
import negotiationRoutes from "./routes/negotiationRoutes.js";
import { errorHandler } from "./middleware/errorHandler.js";
import uploadRoute from "./routes/uploadRoute.js";
import couponRoutes from "./routes/couponRoutes.js";
import questionRoutes from "./routes/questionRoutes.js";

const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Fix #8: trust Render's reverse proxy so req.ip is the real client IP,
// making rate limiting work per-user instead of per-proxy-IP.
app.set("trust proxy", 1);

// ----------------------------
// ⚙️ MIDDLEWARE
// ----------------------------
const allowedOrigins = [
  // Local development only
  "http://127.0.0.1:5000",
  "http://localhost:5000",
  "http://127.0.0.1:5500",
  "http://localhost:5500",
  "http://localhost:3000",
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  // Production — HTTPS only (#4: removed file://, #6: removed http:// prod URLs)
  "https://ump-ng.github.io",
  "https://ump-html-1.onrender.com",
  "https://ump-react.onrender.com",
  "https://exquisite-cactus-a9264f.netlify.app",
  "https://moonlit-babka-b6237b.netlify.app",
  "https://cool-malabi-39da0c.netlify.app",
  "https://www.myump.com.ng",
  "https://myump.com.ng",
];

// Allow all Vercel preview + production deployments for this project
const VERCEL_PATTERN = /^https:\/\/ump-react[\w-]*\.vercel\.app$/;

// 🗜️ Enable gzip compression for all responses
app.use(compression());

// ✅ CORS Configuration - More Robust
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) {
        // Allow requests with no origin (like mobile apps or curl requests)
        callback(null, true);
      } else {
        // Normalize origin by removing trailing slash for comparison
        const normalizedOrigin = origin.replace(/\/$/, '');
        const isAllowed =
          VERCEL_PATTERN.test(normalizedOrigin) ||
          allowedOrigins.some(allowed => allowed.replace(/\/$/, '') === normalizedOrigin);

        if (isAllowed) {
          logger.debug("✅ CORS allowed:", origin);
          callback(null, true);
        } else {
          logger.warn("❌ Blocked by CORS:", origin);
          callback(new Error("Not allowed by CORS"));
        }
      }
    },
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization", "Accept"],
    exposedHeaders: ["Content-Length", "X-JSON-Response-Header"],  // Fix #12: removed Authorization
    maxAge: 86400, // 24 hours for preflight caching
    optionsSuccessStatus: 200, // for compatibility with proxies and edge cases
  })
);

// ✅ Explicit OPTIONS handler for CORS preflight requests (using regex for wildcard)
app.options(/.*/, cors());

app.use("/api/payments/webhook", express.raw({ type: "application/json" }));

app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));
app.use(cookieParser());

// ── NoSQL injection prevention — strip $ and . from keys
app.use(mongoSanitize());

// ── HTTP Parameter Pollution — use last value for duplicated params
app.use(hpp());

// ── Health check — registered before rate limiter so monitors are never throttled
app.get("/health", (req, res) => {
  const dbState = ["disconnected", "connected", "connecting", "disconnecting"][mongoose.connection.readyState] ?? "unknown";
  res.status(200).json({
    status: "✅ Server is running",
    db: dbState,
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// ── Global rate limiter
app.use(globalLimiter);

// ----------------------------
// 🛡️ Helmet with CSP tuned for your external assets
// ----------------------------
app.use(
  helmet({
    // X-Frame-Options: DENY — stops clickjacking; meta tags are ignored by browsers for this header
    frameguard: { action: "deny" },
    // X-Content-Type-Options: nosniff — prevents MIME-type sniffing
    noSniff: true,
    // Strict-Transport-Security — force HTTPS for 1 year
    hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
    // "same-origin-allow-popups" lets Firebase Auth's signInWithPopup communicate
    // back to the opener window without being blocked by the browser.
    crossOriginOpenerPolicy: { policy: "same-origin-allow-popups" },
    contentSecurityPolicy: {
      useDefaults: false,
      directives: {
        defaultSrc: ["'self'"],
        // Fix #10: removed 'unsafe-inline' — Vite production builds use external
        // module scripts only, so inline scripts are not needed in production.
        scriptSrc: [
          "'self'",
          "https://maps.googleapis.com",
          "https://maps.gstatic.com",
          "https://cdn.jsdelivr.net",
          "https://cdn.socket.io",
          "https://cdnjs.cloudflare.com",
        ],
        scriptSrcElem: [
          "'self'",
          "https://maps.googleapis.com",
          "https://maps.gstatic.com",
          "https://cdn.jsdelivr.net",
          "https://cdn.socket.io",
          "https://cdnjs.cloudflare.com",
        ],
        imgSrc: [
          "'self'",
          "data:",
          "blob:",
          "https://res.cloudinary.com",
          "https://via.placeholder.com",
          "https://cdn-icons-png.flaticon.com",
          "https://cdn-icons.flaticon.com",
          "https://maps.gstatic.com",
          "https://cdn.jsdelivr.net",
          // Google profile pictures (Firebase / Google Sign-In avatars)
          "https://lh3.googleusercontent.com",
          "https://lh4.googleusercontent.com",
          "https://lh5.googleusercontent.com",
          "https://lh6.googleusercontent.com",
          "https://googleusercontent.com",
        ],
        styleSrc: [
          "'self'",
          "'unsafe-inline'",
          "https://cdn.jsdelivr.net",
          "https://cdnjs.cloudflare.com",
          "https://fonts.googleapis.com",
          "https://use.fontawesome.com",
        ],
        fontSrc: [
          "'self'",
          "data:",
          "https://fonts.gstatic.com",
          "https://cdnjs.cloudflare.com",
          "https://cdn.jsdelivr.net",
        ],
        connectSrc: [
          "'self'",
          "http://localhost:5000",
          "http://127.0.0.1:5000",
          "http://localhost:5500",
          "http://127.0.0.1:5500",
          "https://cdn.jsdelivr.net",
          "https://cdn.socket.io",
          "https://maps.googleapis.com",
          "https://maps.gstatic.com",
          "https://ump-ng.github.io",
          "https://ump-html-1.onrender.com",
          "https://ump-backend.onrender.com",
        ],
        objectSrc: ["'none'"],
        upgradeInsecureRequests: [],
      },
    },
  })
);

// ----------------------------
// 📂 STATIC FILES — serve React build output only when frontend/dist exists (local monorepo)
// ----------------------------
import { existsSync } from "fs";
const STATIC_DIR = path.join(__dirname, "../frontend/dist");
const hasFrontendBuild = existsSync(path.join(STATIC_DIR, "index.html"));
if (hasFrontendBuild) app.use(express.static(STATIC_DIR));

// ----------------------------
// 🚏 ROUTES
// ----------------------------
// Guard: only block requests when Mongoose is fully disconnected (state=0).
// state=2 (reconnecting) is fine — Mongoose buffers the query until the connection is back.
app.use("/api", (req, res, next) => {
  const state = mongoose.connection.readyState; // 0=disconnected 1=connected 2=connecting
  if (state === 0) {
    logger.warn(`⚠️  [DB guard] DB disconnected on ${req.method} ${req.path}`);
    return res.status(503).json({ message: "Service temporarily unavailable, please retry in a moment" });
  }
  next();
});

// ⚠️ CRITICAL: Routes with specific paths MUST come before dynamic routes
// Otherwise "seller-dashboard" will be caught by "/:id" pattern
app.use("/api/auth", authRoutes);
app.use("/api/admins", adminRoutes);
app.use("/api/seller-dashboard", sellerDashboardRoutes);
app.use("/api/service-analytics", serviceAnalytics);
app.use("/api/products", productRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/follows", followRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/sellers", sellerRoutes);
app.use("/api/services", serviceRoutes);
app.use("/api/listings", listingRoutes);
app.use("/api/users", userRoutes);
app.use("/api/search", searchRoutes);
app.use("/api/users", roleRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/cart", cartRoutes);
app.use("/api/bookings", bookingRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/payouts", payoutRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/wishlist", wishlistRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/push",   pushRoutes);
app.use("/api/upload", uploadRoute);
app.use("/api/negotiations", negotiationRoutes);
app.use("/api/coupons",     couponRoutes);
app.use("/api/questions",   questionRoutes);

// ── Health check ─────────────────────────────────────────────────────────────
// Used by Render's health-check pings and uptime monitors.
// Returns DB state so you can tell apart "app running but DB down" from "app down".
app.get("/api/health", (req, res) => {
  const dbState = ["disconnected", "connected", "connecting", "disconnecting"];
  const db = mongoose.connection.readyState;
  res.status(db === 1 ? 200 : 503).json({
    status: db === 1 ? "ok" : "degraded",
    db:     dbState[db] || "unknown",
    uptime: Math.floor(process.uptime()),
    ts:     new Date().toISOString(),
  });
});

// Sentry must capture errors before the generic error handler
if (process.env.SENTRY_DSN) Sentry.setupExpressErrorHandler(app);

// 🧯 Centralized error handler
app.use(errorHandler);

// ----------------------------
// 🔗 CATCH-ALL ROUTES
// ----------------------------
app.get("/api/test", (req, res) => {
  res.json({ message: "Backend is working!" });
});

// OG meta tags for product pages — detected social crawlers get OG-enriched HTML;
// real browsers get the SPA index.html normally via the catch-all below.
const BOT_UA = /facebookexternalhit|twitterbot|whatsapp|linkedinbot|telegrambot|slackbot|discordbot|applebot|googlebot|bingbot/i;
// Escape HTML entities — safe for HTML attribute values and element text
function escHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;");
}
// Escape for JavaScript string literals inside <script> blocks.
// JSON.stringify adds surrounding quotes and escapes backslashes, quotes, and
// control characters; the regex then prevents </script> from closing the block.
function escJs(str) {
  return JSON.stringify(String(str)).replace(/<\/script/gi, "<\\/script");
}
app.get("/products/:id", async (req, res, next) => {
  try {
    if (!BOT_UA.test(req.headers["user-agent"] || "")) return next();
    const Product = (await import("./models/Product.js")).default;
    const product = await Product.findById(req.params.id)
      .select("name desc images price slug")
      .lean()
      .catch(() => null);
    if (!product) return next();
    const title = escHtml(product.name || "Product — UMP");
    const desc  = escHtml(product.desc ? product.desc.slice(0, 200) : `₦${Number(product.price).toLocaleString()} on UMP`);
    const image = product.images?.[0]?.url || "";
    const url   = `${req.protocol}://${req.get("host")}/products/${req.params.id}`;
    return res.type("html").send(`<!DOCTYPE html><html><head>
<meta charset="UTF-8"/>
<title>${title}</title>
<meta property="og:type" content="product"/>
<meta property="og:title" content="${title}"/>
<meta property="og:description" content="${desc}"/>
${image ? `<meta property="og:image" content="${escHtml(image)}"/>` : ""}
<meta property="og:url" content="${escHtml(url)}"/>
<meta name="twitter:card" content="summary_large_image"/>
<meta name="twitter:title" content="${title}"/>
<meta name="twitter:description" content="${desc}"/>
${image ? `<meta name="twitter:image" content="${escHtml(image)}"/>` : ""}
<script>window.location.replace(${escJs(url)});</script>
</head><body></body></html>`);
  } catch { next(); }
});

// Catch-all: serve React app for SPA routing (only when frontend build exists)
app.get(/./, (req, res) => {
  if (req.path.startsWith("/api")) {
    return res.status(404).json({ message: "API endpoint not found" });
  }
  if (hasFrontendBuild) {
    return res.sendFile(path.join(STATIC_DIR, "index.html"), (err) => {
      if (err && !res.headersSent) res.status(500).json({ message: "Failed to serve app" });
    });
  }
  res.status(404).json({ message: "Not found" });
});
export default app;
