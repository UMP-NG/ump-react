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
    transactions: [
      {
        type: {
          type: String,
          enum: ["credit", "debit", "transfer_in", "transfer_out", "withdrawal", "refund", "gift_credit", "purchase"],
          required: true,
        },
        // Whether this fund is withdrawable to bank account
        withdrawable: {
          type: Boolean,
          default: true, // most credits are withdrawable; gifts are not
        },
        amount: { type: Number, required: true, min: 0 },
        description: String,
        reference: String, // order ID, transfer ID, etc.
        balanceAfter: Number, // balance after transaction
        status: {
          type: String,
          enum: ["pending", "completed", "failed"],
          default: "pending",
        },
        relatedUser: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User", // who transferred to/from
        },
        bankDetails: {
          bankName: String,
          accountNumber: String,
          accountName: String,
        },
        failureReason: String,
        createdAt: { type: Date, default: Date.now },
      },
    ],

    // Bank details for withdrawals
    bankDetails: {
      bankName: String,
      bankCode: String,
      accountName: String,
      accountNumber: String,
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

// Auto-reset daily/monthly limits
walletSchema.pre("save", function (next) {
  const now = new Date();
  const lastReset = this.lastWithdrawalReset ? new Date(this.lastWithdrawalReset) : null;

  // Reset daily limit (midnight)
  if (!lastReset || lastReset.toDateString() !== now.toDateString()) {
    this.totalWithdrawnToday = 0;
  }

  // Reset monthly limit (1st of month)
  if (!lastReset || lastReset.getMonth() !== now.getMonth() || lastReset.getFullYear() !== now.getFullYear()) {
    this.totalWithdrawnThisMonth = 0;
  }

  if (!lastReset || lastReset.toDateString() !== now.toDateString()) {
    this.lastWithdrawalReset = now;
  }

  next();
});

// Index for fast lookups
walletSchema.index({ user: 1 });
walletSchema.index({ "transactions.createdAt": -1 });

export default mongoose.model("Wallet", walletSchema);
