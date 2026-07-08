import mongoose from "mongoose";

const walletSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    // Total balance split into withdrawable and non-withdrawable
    balance: {
      type: Number,
      default: 0,
      min: 0,
    },
    withdrawableBalance: {
      type: Number,
      default: 0,
      min: 0,
    },
    giftCredits: {
      type: Number,
      default: 0,
      min: 0,
    },
    // Store only last 100 transactions in document; rest go to WalletTransaction collection
    transactions: [
      {
        type: {
          type: String,
          enum: ["credit", "debit", "transfer_in", "transfer_out", "withdrawal", "refund", "gift_credit", "purchase"],
          required: true,
        },
        withdrawable: {
          type: Boolean,
          default: true,
        },
        amount: { type: Number, required: true, min: 0 },
        description: String,
        reference: String,
        balanceAfter: Number,
        status: {
          type: String,
          enum: ["pending", "completed", "failed"],
          default: "pending",
        },
        relatedUser: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        failureReason: String,
        idempotencyKey: String, // for deduplication on retries
        createdAt: { type: Date, default: Date.now, index: true },
      },
    ],

    // Bank details for withdrawals — accountNumber is encrypted at rest via
    // utils/fieldEncryption.js (same pattern as Seller.bankDetails); mask() is
    // used when returning it to the client so the raw digits are never exposed.
    bankDetails: {
      bankName: String,
      bankCode: String,
      accountName: String,
      accountNumber: String, // stored as "<iv>:<ciphertext>" via encrypt()
      verified: { type: Boolean, default: false },
      verifiedAt: Date,
    },

    // Withdrawal limits
    dailyWithdrawalLimit: { type: Number, default: 500000 }, // ₦500k per day
    monthlyWithdrawalLimit: { type: Number, default: 5000000 }, // ₦5M per month
    totalWithdrawnToday: { type: Number, default: 0 },
    totalWithdrawnThisMonth: { type: Number, default: 0 },
    lastWithdrawalReset: Date,
  },
  { timestamps: true }
);

// Verify invariant: balance = withdrawableBalance + giftCredits
walletSchema.pre("save", function (next) {
  const sum = this.withdrawableBalance + this.giftCredits;
  if (Math.abs(this.balance - sum) > 0.01) { // allow 1 paisa rounding
    return next(new Error(`Balance invariant violated: ${this.balance} !== ${this.withdrawableBalance} + ${this.giftCredits}`));
  }
  next();
});

// Prune transactions array to last 100 (prevent document size bloat)
walletSchema.pre("save", function (next) {
  if (this.transactions && this.transactions.length > 100) {
    this.transactions = this.transactions.slice(-100);
  }
  next();
});

// Index for fast lookups
walletSchema.index({ user: 1 });
walletSchema.index({ "transactions.createdAt": -1 });

export default mongoose.model("Wallet", walletSchema);
