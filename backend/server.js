import http from "http";
import { Server } from "socket.io";
import mongoose from "mongoose";
import dotenv from "dotenv";
import app from "./app.js";
import Message from "./models/Message.js";

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

console.log(`✅ Environment validation passed\n`);

// 🧩 Connect to MongoDB
let mongoConnected = false;
mongoose
  .connect(MONGO_URI, {
    serverSelectionTimeoutMS: 5000,
    connectTimeoutMS: 5000,
  })
  .then(() => {
    console.log("✅ MongoDB connected");
    mongoConnected = true;
  })
  .catch((err) => {
    console.error("❌ MongoDB connection error:", err.message);
    console.warn("⚠️  Server will start anyway, but database queries will fail");
  });

// 🧩 Create HTTP server with extended timeout
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
      "https://exquisite-cactus-a9264f.netlify.app",
      "https://www.myump.com.ng",
      "https://myump.com.ng",
      "http://www.myump.com.ng",
      "http://myump.com.ng",
    ],
    credentials: true,
  },
});

// 🧠 Track online users
const onlineUsers = new Map();

// 💬 Socket.io Events
io.on("connection", (socket) => {
  // Register user
  socket.on("register", (userId) => {
    if (userId) {
      onlineUsers.set(userId, socket.id);
    }
  });

  // Handle sending messages
  socket.on("send_message", async (data) => {
    try {
      const { sender, receiver, text, attachments = [] } = data;
      if (!sender || !receiver || (!text && !attachments.length)) return;

      const message = await Message.create({
        sender,
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

// 🚀 Start server
server.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});
