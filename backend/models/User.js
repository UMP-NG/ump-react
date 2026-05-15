import mongoose from "mongoose";
import bcrypt from "bcrypt";

const userSchema = new mongoose.Schema(
  {
    // ===============================
    // AUTH
    // ===============================
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      match: [
        /^[1-9]\d{1}\d{5,}@live\.unilag\.edu\.ng$/,
        "Please use your valid school email (matric ≥ 19xxxxxxx)",
      ],
    },
    password: {
      type: String,
      required: true,
      minlength: [8, "Password must be at least 8 characters"],
    },

    // ===============================
    // ROLES
    // ===============================
    roles: {
      type: [String],
      enum: ["user", "seller", "service_provider", "admin"],
      default: ["user"],
    },

    // ===============================
    // BASIC PROFILE
    // ===============================
    name: { type: String, trim: true },
    avatar: {
      url: { type: String, default: "" },
      publicId: { type: String, default: "" },
    },
    phone: { type: String, trim: true },
    address: { type: String, trim: true },
    bio: { type: String, trim: true },

    // ===============================
    // SELLER SNAPSHOT (LIGHT ONLY)
    // ===============================
    sellerInfo: {
      storeName: String,
      description: String,
      location: String,
      phone: String,
    },

    // ===============================
    // SERVICE PROVIDER INFO (FULL)
    // ===============================
    serviceProviderInfo: {
      businessName: { type: String, trim: true },
      skills: [{ type: String, trim: true }],
      rate: { type: Number },
      bio: { type: String, trim: true },
      availability: {
        type: String,
        enum: ["available", "busy", "offline"],
        default: "available",
      },
      verified: { type: Boolean, default: false },
    },

    // Services owned by this provider
    services: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Service",
      },
    ],

    // ===============================
    // SOCIAL
    // ===============================
    // Users follow SELLERS, not other users
    following: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Seller",
      },
    ],

    // ===============================
    // E-COMMERCE
    // ===============================
    wishlist: [{ type: mongoose.Schema.Types.ObjectId, ref: "Product" }],
    cart: [
      {
        product: { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
        quantity: { type: Number, default: 1 },
      },
    ],
    orders: [{ type: mongoose.Schema.Types.ObjectId, ref: "Order" }],

    // ===============================
    // SECURITY & VERIFICATION
    // ===============================
    isVerified: { type: Boolean, default: false },
    otp: String,
    otpExpire: Date,
    resetPasswordToken: String,
    resetPasswordExpire: Date,
    lastLogin: Date,
    twoFactorEnabled: { type: Boolean, default: false },

    // Brute-force lockout
    loginAttempts: { type: Number, default: 0 },
    lockUntil: { type: Date },

    // ===============================
    // NOTIFICATIONS & STATUS
    // ===============================
    notificationPreferences: {
      order: { type: Boolean, default: true },
      message: { type: Boolean, default: true },
      payout: { type: Boolean, default: true },
      inventory: { type: Boolean, default: true },
    },

    status: {
      type: String,
      enum: ["active", "inactive", "banned"],
      default: "active",
    },
  },
  { timestamps: true }
);

// ===============================
// LOCKOUT VIRTUAL + METHOD
// ===============================
const MAX_LOGIN_ATTEMPTS = 5;
const LOCK_TIME_MS = 15 * 60 * 1000; // 15 minutes

userSchema.virtual("isLocked").get(function () {
  return !!(this.lockUntil && this.lockUntil > Date.now());
});

userSchema.methods.incLoginAttempts = function () {
  // If a previous lock has expired, restart the counter
  if (this.lockUntil && this.lockUntil < Date.now()) {
    return this.updateOne({ $set: { loginAttempts: 1 }, $unset: { lockUntil: 1 } });
  }
  const update = { $inc: { loginAttempts: 1 } };
  if (this.loginAttempts + 1 >= MAX_LOGIN_ATTEMPTS && !this.isLocked) {
    update.$set = { lockUntil: Date.now() + LOCK_TIME_MS };
  }
  return this.updateOne(update);
};

// ===============================
// PASSWORD HASHING
// ===============================
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// ===============================
// METHODS
// ===============================
userSchema.methods.comparePassword = function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

userSchema.methods.createOTP = function () {
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  this.otp = otp;
  this.otpExpire = Date.now() + 10 * 60 * 1000;
  return otp;
};

userSchema.methods.createResetToken = function () {
  const resetToken = require("crypto").randomBytes(32).toString("hex");
  this.resetPasswordToken = resetToken;
  this.resetPasswordExpire = Date.now() + 10 * 60 * 1000; // 10 minutes
  return resetToken;
};

// ===============================
// INDEXES FOR PERFORMANCE
// ===============================
// Note: email already has unique index via "unique: true" property
// Note: _id already has default index from MongoDB

export default mongoose.model("User", userSchema);

