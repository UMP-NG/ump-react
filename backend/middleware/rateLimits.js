import rateLimit, { ipKeyGenerator } from "express-rate-limit";

// Key by authenticated user ID when available, falling back to IP.
// Uses ipKeyGenerator so IPv6 addresses are normalised correctly.
function keyByUser(req) {
  return req.user?._id?.toString() || ipKeyGenerator(req);
}

const make = (windowMs, max, message) =>
  rateLimit({
    windowMs,
    max,
    keyGenerator: keyByUser,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message },
    skip: () => process.env.NODE_ENV === "test",
  });

// Fix #14: tightened from 300 to 150 req / 15 min for a student-only platform
export const globalLimiter = make(15 * 60 * 1000, 150, "Too many requests, please slow down.");

// 15 req / 15 min — login, signup
export const authLimiter = make(15 * 60 * 1000, 15, "Too many auth attempts. Try again in 15 minutes.");

// 5 req / 15 min — OTP send/verify, password reset
export const otpLimiter = make(15 * 60 * 1000, 5, "Too many OTP attempts. Try again in 15 minutes.");

// 5 req / 60 min — forgot-password
export const passwordResetLimiter = make(60 * 60 * 1000, 5, "Too many password reset attempts. Try again in 1 hour.");

// 30 req / 15 min — payment initialize/verify
export const paymentLimiter = make(15 * 60 * 1000, 30, "Too many payment requests. Please slow down.");

// 20 req / 5 min — file uploads
export const uploadLimiter = make(5 * 60 * 1000, 20, "Too many uploads. Please slow down.");

// 5 req / 15 min — delivery code confirmation (brute-force protection on escrow release)
export const deliveryCodeLimiter = make(15 * 60 * 1000, 5, "Too many delivery confirmation attempts. Try again in 15 minutes.");

// 3 req / 60 min — identity verification submit & dispute (prevents queue flooding)
export const identityLimiter = make(60 * 60 * 1000, 3, "Too many verification attempts. Try again in 1 hour.");

// 20 req / 15 min — referral code lookups (prevents enumeration of user identities)
export const referralLimiter = make(15 * 60 * 1000, 20, "Too many referral lookups. Please slow down.");

// 30 req / 60 sec — message sending (prevents spam flood)
export const messageLimiter = make(60 * 1000, 30, "Too many messages. Please slow down.");

// 40 req / 5 min — delivery quote (calls external Shipbubble API; open to guests)
export const quoteLimiter = make(5 * 60 * 1000, 40, "Too many delivery quote requests. Please slow down.");
