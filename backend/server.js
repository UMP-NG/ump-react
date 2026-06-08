import http from "http";
import { Server } from "socket.io";
import mongoose from "mongoose";
import dotenv from "dotenv";
import jwt from "jsonwebtoken";
import cookie from "cookie";
import app from "./app.js";
import Message from "./models/Message.js";
import { setIO } from "./utils/socket.js";

dotenv.config();

const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI;

// 🚨 CRITICAL: Validate required environment variables at startup
console.log("\n🔍 [STARTUP] Validating environment configuration...");

if (!process.env.JWT_SECRET) {
  console.error("\n❌ [CRITICAL] JWT_SECRET is not defined!");
  console.error("   This will cause ERR_EMPTY_RESPONSE on login");
  console.error("   Fix: Add JWT_SECRET to Backend/.env");
  process.exit(1);
}
console.log(`✅ JWT_SECRET loaded: ${process.env.JWT_SECRET.length} chars available`);

if (!MONGO_URI) {
  console.error("\n❌ [CRITICAL] MONGO_URI is not defined!");
  console.error("   Fix: Add MONGO_URI to Backend/.env");
  process.exit(1);
}
console.log(`✅ MONGO_URI configured`);

if (!process.env.NODE_ENV) {
  console.error("\n❌ [CRITICAL] NODE_ENV is not defined!");
  console.error("   Fix: Add NODE_ENV=production to your deployment environment");
  process.exit(1);
}
console.log(`✅ NODE_ENV: ${process.env.NODE_ENV}`);

if (!process.env.FIELD_ENCRYPTION_KEY || process.env.FIELD_ENCRYPTION_KEY.length < 64) {
  console.error("\n❌ [CRITICAL] FIELD_ENCRYPTION_KEY is not defined or is shorter than 64 hex characters!");
  console.error("   Bank account numbers will NOT be encrypted securely without this key.");
  console.error("   Generate one with: node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\"");
  console.error("   Fix: Add FIELD_ENCRYPTION_KEY to Backend/.env");
  process.exit(1);
}
console.log(`✅ FIELD_ENCRYPTION_KEY configured`);

console.log(`✅ Environment validation passed\n`);

// 🧩 Create HTTP server first (Socket.io needs the server object before DB connects)
const server = http.createServer(app);

// Set timeout for file uploads (2 minutes)
server.timeout = 120000;
server.keepAliveTimeout = 120000;
server.headersTimeout = 120000;

// ⚡ Attach Socket.io
export const io = new Server(server, {
  cors: {
    origin: [
      "http://localhost:3000",
      "http://localhost:5173",
      "http://127.0.0.1:5173",
      "http://127.0.0.1:5500",
      "http://localhost:5500",
      "https://ump-ng.github.io",
      "https://ump-react.onrender.com",
      "https://exquisite-cactus-a9264f.netlify.app",
      "https://www.myump.com.ng",
      "https://myump.com.ng",
      "http://www.myump.com.ng",
      "http://myump.com.ng",
      /^https:\/\/ump-react[\w-]*\.vercel\.app$/,
    ],
    credentials: true,
  },
});

// Register io singleton so controllers can use it without importing server.js
setIO(io);

// 🧠 Track online users
const onlineUsers = new Map();

// 💬 Socket.io Events
io.on("connection", (socket) => {
  // Resolve the verified user identity from the JWT cookie at connection time.
  // This prevents a client from registering as a different user's ID.
  let verifiedUserId = null;
  try {
    const cookies = cookie.parse(socket.handshake.headers.cookie || "");
    const decoded = jwt.verify(cookies.token || "", process.env.JWT_SECRET);
    verifiedUserId = decoded.id?.toString();
  } catch {
    // Unauthenticated socket — real-time delivery won't work until user signs in
  }

  socket.on("register", (userId) => {
    if (!userId) return;
    // Reject if the client tries to impersonate a different user
    if (verifiedUserId && userId.toString() !== verifiedUserId) return;
    onlineUsers.set(userId, socket.id);
    socket.join(userId); // enables io.to(userId) in controllers
  });

  // Handle sending messages
  socket.on("send_message", async (data) => {
    try {
      const { sender, receiver, text, attachments = [] } = data;
      if (!sender || !receiver || (!text && !attachments.length)) return;

      // Require an authenticated socket — unauthenticated connections cannot send
      if (!verifiedUserId) return;
      // Reject if the client claims to be a different user than their JWT says
      if (sender.toString() !== verifiedUserId) return;

      // Fix #13: cap text length so the socket can't bypass the HTTP body-size limit
      if (text && text.length > 5000) return;

      const message = await Message.create({
        sender: verifiedUserId || sender, // always use the server-verified identity
        receiver,
        text,
        attachments,
      });

      const populated = await message.populate(
        "sender receiver",
        "name avatar role"
      );

      const senderSocket = onlineUsers.get(sender);
      const receiverSocket = onlineUsers.get(receiver);

      if (senderSocket) io.to(senderSocket).emit("new_message", populated);
      if (receiverSocket) io.to(receiverSocket).emit("new_message", populated);

      console.log(`💬 Message sent from ${sender} → ${receiver}`);
    } catch (err) {
      console.error("❌ Error handling send_message:", err);
    }
  });

  // Handle disconnects
  socket.on("disconnect", () => {
    for (const [userId, socketId] of onlineUsers.entries()) {
      if (socketId === socket.id) {
        onlineUsers.delete(userId);
        break;
      }
    }
  });
});

// Log Atlas connection state changes so drops are immediately visible in the terminal
// Mongoose 8 handles reconnection automatically — no manual reconnect needed here.
mongoose.connection.on("disconnected", () =>
  console.warn("⚠️  [MongoDB] Disconnected — Mongoose will reconnect automatically when network is available")
);
mongoose.connection.on("reconnected", () =>
  console.log("✅ [MongoDB] Reconnected")
);
mongoose.connection.on("error", (err) =>
  console.error("❌ [MongoDB] Connection error:", err.message)
);

// 🚀 Connect to MongoDB, then start accepting HTTP connections
// Starting the server before MongoDB is ready causes 500 "Database error" on
// the first few requests (race condition during Mongoose connection handshake).
mongoose
  .connect(MONGO_URI, {
    serverSelectionTimeoutMS: 30000, // 30 s — more time for Atlas to elect a primary
    connectTimeoutMS: 30000,
    socketTimeoutMS: 45000,          // 45 s — wait for slow Atlas responses
    bufferTimeoutMS: 10000,          // fail buffered ops after 10 s instead of hanging forever
  })
  .then(() => {
    console.log("✅ MongoDB connected");

    server.listen(PORT, () => {
      console.log(`✅ Server running on port ${PORT}`);

      // Keep-alive ping for Render free tier (spins down after 15min inactivity)
      const SELF_URL = process.env.RENDER_EXTERNAL_URL;
      if (SELF_URL) {
        let pingTimer = null;
        const scheduleNextPing = () => {
          const delay = Math.floor(Math.random() * (10 - 4 + 1) + 4) * 60 * 1000;
          pingTimer = setTimeout(async () => {
            try {
              const { default: https } = await import("https");
              https.get(`${SELF_URL}/health`, (res) => {
                console.log(`🏓 Keep-alive ping — ${res.statusCode}`);
              }).on("error", (err) => {
                console.warn(`⚠️  Keep-alive ping failed: ${err.message}`);
              });
            } catch (err) {
              console.warn(`⚠️  Keep-alive ping error: ${err.message}`);
            }
            scheduleNextPing();
          }, delay);
        };
        scheduleNextPing();
        console.log("✅ Keep-alive ping scheduled (4–10 min random interval)");
        server.on("close", () => { if (pingTimer) clearTimeout(pingTimer); });
      }
    });
  })
  .catch((err) => {
    console.error("❌ MongoDB connection failed:", err.message);
    console.error("   Server will NOT start — fix MONGO_URI or check network access.");
    process.exit(1);
  });

