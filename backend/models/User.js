import mongoose from "mongoose";
import bcrypt from "bcrypt";
import crypto from "crypto";

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
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, "Please provide a valid email address"],
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

    // Saved shipping addresses for faster checkout
    addresses: [{
      label:     { type: String, trim: true },   // e.g. "Hostel Room", "Home"
      name:      { type: String, trim: true },
      phone:     { type: String, trim: true },
      address:   { type: String, trim: true },
      city:      { type: String, trim: true },
      state:     { type: String, trim: true },
      isDefault: { type: Boolean, default: false },
    }],

    // Earnings wallet for service providers (credited on booking completion)
    earningsBalance: { type: Number, default: 0, min: 0 },

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
      businessName:    { type: String, trim: true },
      headline:        { type: String, trim: true }, // short professional tagline
      bio:             { type: String, trim: true },
      categories:      [{ type: String, trim: true }],
      yearsExperience: { type: Number, default: 0 },
      location:        { type: String, trim: true },
      whatsapp:        { type: String, trim: true },
      portfolioUrl:    { type: String, trim: true },
      instagram:       { type: String, trim: true },
      twitter:         { type: String, trim: true },
      availability: {
        type: String,
        enum: ["available", "busy", "offline"],
        default: "available",
      },
      verified:              { type: Boolean, default: false },
      isSubscribed:          { type: Boolean, default: false },
      subscriptionPlan:      { type: String, enum: ["monthly", "annual"], default: null },
      subscriptionExpiresAt: { type: Date, default: null },
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
    // GOOGLE ACCOUNT LINKING
    // ===============================
    // true when the account was created via Google sign-in with a non-UNILAG email.
    // These accounts are "limited" until the user links and verifies their school email.
    googleAccount: { type: Boolean, default: false },
    schoolEmail:         { type: String, lowercase: true },
    schoolEmailVerified: { type: Boolean, default: false },
    schoolEmailOtp:      String,
    schoolEmailOtpExpire: Date,

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
      order:      { type: Boolean, default: true  },
      message:    { type: Boolean, default: true  },
      payout:     { type: Boolean, default: true  },
      inventory:  { type: Boolean, default: true  },
      account:    { type: Boolean, default: true  },
      platform:   { type: Boolean, default: true  },
      promotions: { type: Boolean, default: false },
    },

    // Support role for admin users (null = not a support contact)
    supportRole: {
      type: String,
      enum: ["technical", "administrative"],
      default: null,
    },

    status: {
      type: String,
      enum: ["active", "inactive", "banned"],
      default: "active",
    },

    // ===============================
    // REFERRAL
    // ===============================
    referralCode:   { type: String, unique: true, sparse: true },
    referredBy:     { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    // Site credit earned from referrals — spendable at checkout/booking, NOT withdrawable
    referralCredit: { type: Number, default: 0, min: 0 },
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
// REFERRAL CODE GENERATION
// ===============================
userSchema.pre("save", function (next) {
  if (!this.referralCode) {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let code = "UMP-";
    for (let i = 0; i < 8; i++) {
      code += chars[crypto.randomInt(chars.length)]; // cryptographically secure
    }
    this.referralCode = code;
  }
  next();
});

// ===============================
// METHODS
// ===============================
userSchema.methods.comparePassword = function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

userSchema.methods.createOTP = function () {
  const otp = String(crypto.randomInt(100000, 1000000)); // cryptographically secure 6-digit OTP
  // Hash before storing — a DB dump cannot be used to bypass verification
  this.otp = crypto.createHash("sha256").update(otp).digest("hex");
  this.otpExpire = Date.now() + 10 * 60 * 1000;
  return otp; // return plain OTP; only sent via email, never stored
};

// createResetToken() intentionally removed — it stored the raw token without hashing,
// which would expose valid reset tokens in a DB leak.
// Use the forgotPassword controller instead, which hashes with SHA-256 before saving.

// ===============================
// INDEXES FOR PERFORMANCE
// ===============================
// email and _id already indexed via schema options / MongoDB default
userSchema.index({ roles: 1, createdAt: -1 });   // admin user list filtered by role
userSchema.index({ status: 1, createdAt: -1 });   // ban/status filtering
userSchema.index({ createdAt: -1 });              // default sort, new-users-today count

export default mongoose.model("User", userSchema);

