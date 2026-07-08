import mongoose from "mongoose";

// Tracks idempotency keys for wallet balance mutations, independent of the
// capped `Wallet.transactions` array (which only keeps the last 100 entries).
// Uniqueness is enforced by the DB, so claiming a key is a single atomic
// insert — the first caller wins, every retry gets a clean duplicate-key error
// it can treat as "already processed" and read the result back from here.
const walletIdempotencyKeySchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    idempotencyKey: { type: String, required: true },
    reference: String,
    balanceAfter: Number,
  },
  { timestamps: true }
);

walletIdempotencyKeySchema.index({ user: 1, idempotencyKey: 1 }, { unique: true });

export default mongoose.model("WalletIdempotencyKey", walletIdempotencyKeySchema);
