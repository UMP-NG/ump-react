import Wallet from "../models/Wallet.js";
import User from "../models/User.js";
import logger from "../utils/logger.js";
import { notify } from "../utils/notify.js";
import { encrypt, mask } from "../utils/fieldEncryption.js";
import crypto from "crypto";

// Atomically fetch-or-create a wallet. Using findOneAndUpdate with upsert
// instead of findOne-then-create closes a race where two concurrent requests
// for a brand-new user both see `null` and both try to create a document,
// tripping the unique index on `user` (E11000 duplicate key).
async function getOrCreateWallet(userId) {
  return Wallet.findOneAndUpdate(
    { user: userId },
    { $setOnInsert: { user: userId } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
}

// Returns bankDetails with the account number masked (e.g. "****3210") instead
// of the encrypted ciphertext — safe to send to the client.
function maskedBankDetails(bankDetails) {
  if (!bankDetails?.accountNumber) return bankDetails;
  return { ...(bankDetails.toObject ? bankDetails.toObject() : bankDetails), accountNumber: mask(bankDetails.accountNumber) };
}

// ─── Atomic balance mutation ────────────────────────────────────────────────
// Moves `delta` on `balanceField` (and the mirrored `balance` total) in a
// single conditional findOneAndUpdate, so concurrent requests can never both
// read a stale balance and both succeed (the classic double-spend race).
// - `requireAtLeast`: if set, the filter only matches when balanceField >= this
//   amount, so an under-funded request atomically fails instead of racing.
// - `idempotencyKey`: if set, the filter also requires that no existing
//   transaction carries this key, so a retried request atomically no-ops
//   instead of double-crediting/debiting.
// Returns { wallet, alreadyProcessed, tx } — `wallet` is null when the op was
// rejected for insufficient balance (as opposed to idempotent replay).
async function atomicMutateBalance({ userId, balanceField, delta, requireAtLeast, idempotencyKey, tx, upsert = false }) {
  const filter = { user: userId };
  if (requireAtLeast != null) filter[balanceField] = { $gte: requireAtLeast };
  if (idempotencyKey) filter["transactions.idempotencyKey"] = { $ne: idempotencyKey };

  const reference = tx.reference || `${tx.type.toUpperCase()}_${crypto.randomBytes(6).toString("hex").toUpperCase()}`;
  const update = {
    $inc: { [balanceField]: delta, balance: delta },
    $push: { transactions: { $each: [{ ...tx, reference }], $slice: -100 } },
  };

  const wallet = await Wallet.findOneAndUpdate(filter, update, { new: true, upsert });
  if (wallet) {
    // balanceAfter depends on the post-increment value, which we only know now —
    // attach it in a follow-up update targeted at this transaction's unique
    // reference. This second write never touches balances, so it carries no
    // double-spend risk even if it races with other requests.
    const balanceAfter = wallet[balanceField];
    await Wallet.updateOne(
      { user: userId, "transactions.reference": reference },
      { $set: { "transactions.$.balanceAfter": balanceAfter } }
    );
    return { wallet, alreadyProcessed: false, reference, balanceAfter };
  }

  // No match — either insufficient balance or (if idempotencyKey given) a
  // duplicate of an already-processed request. Disambiguate with a plain read.
  if (idempotencyKey) {
    const existing = await Wallet.findOne(
      { user: userId, "transactions.idempotencyKey": idempotencyKey },
      { "transactions.$": 1 }
    );
    if (existing?.transactions?.[0]) {
      return { wallet: null, alreadyProcessed: true, tx: existing.transactions[0] };
    }
  }
  return { wallet: null, alreadyProcessed: false };
}

// ─── Get user's wallet balance and recent transactions ────────────────────
export const getWallet = async (req, res) => {
  try {
    const wallet = await getOrCreateWallet(req.user._id);

    res.json({
      balance: wallet.balance,
      withdrawableBalance: wallet.withdrawableBalance,
      giftCredits: wallet.giftCredits,
      bankDetails: maskedBankDetails(wallet.bankDetails),
      transactions: wallet.transactions.slice(-20), // Last 20 transactions
      limits: {
        dailyWithdrawalLimit: wallet.dailyWithdrawalLimit,
        monthlyWithdrawalLimit: wallet.monthlyWithdrawalLimit,
        totalWithdrawnToday: wallet.totalWithdrawnToday,
        totalWithdrawnThisMonth: wallet.totalWithdrawnThisMonth,
      },
    });
  } catch (err) {
    logger.error("getWallet error:", err);
    res.status(500).json({ message: "Failed to fetch wallet" });
  }
};

// ─── Save bank details for withdrawals ─────────────────────────────────────
export const saveBankDetails = async (req, res) => {
  try {
    const { bankName, bankCode, accountNumber, accountName } = req.body;

    if (!bankName || !bankCode || !accountNumber || !accountName) {
      return res.status(400).json({ message: "All bank details are required" });
    }
    if (!/^\d{6,12}$/.test(accountNumber)) {
      return res.status(400).json({ message: "Account number must be 6-12 digits" });
    }

    const wallet = await getOrCreateWallet(req.user._id);

    // New/changed bank details always start unverified — verification is a
    // separate admin action (see verifyBankDetails) required before withdrawal.
    wallet.bankDetails = {
      bankName,
      bankCode,
      accountNumber: encrypt(accountNumber), // encrypted at rest
      accountName,
      verified: false,
      verifiedAt: undefined,
    };
    await wallet.save();

    res.json({ success: true, message: "Bank details saved. They'll need to be verified before you can withdraw.", bankDetails: maskedBankDetails(wallet.bankDetails) });
  } catch (err) {
    logger.error("saveBankDetails error:", err);
    res.status(500).json({ message: "Failed to save bank details" });
  }
};

// ─── Transfer funds to another user ────────────────────────────────────────
export const transferFunds = async (req, res) => {
  try {
    const { recipientId, amount, note } = req.body;
    const senderId = req.user._id;

    if (!recipientId || !amount || amount <= 0) {
      return res.status(400).json({ message: "Invalid recipient or amount" });
    }

    if (senderId.toString() === recipientId.toString()) {
      return res.status(400).json({ message: "Cannot transfer to yourself" });
    }

    // Check recipient exists before touching any wallet
    const recipient = await User.findById(recipientId).select("name email");
    if (!recipient) {
      return res.status(404).json({ message: "Recipient not found" });
    }

    const transferId = `TXN_${crypto.randomBytes(6).toString("hex").toUpperCase()}`;
    const now = new Date();

    // Atomically debit sender — filter requires sufficient withdrawable
    // balance, so a concurrent double-spend can never both pass.
    const debit = await atomicMutateBalance({
      userId: senderId,
      balanceField: "withdrawableBalance",
      delta: -amount,
      requireAtLeast: amount,
      tx: {
        type: "transfer_out",
        amount,
        description: note ? `Transfer to ${recipient.name}: ${note}` : `Transfer to ${recipient.name}`,
        reference: transferId,
        status: "completed",
        relatedUser: recipientId,
        withdrawable: true,
        createdAt: now,
      },
    });

    if (!debit.wallet) {
      return res.status(400).json({ message: "Insufficient withdrawable balance. Gift credits cannot be transferred." });
    }

    // Credit recipient. If this somehow fails after the sender was already
    // debited, refund the sender so funds are never silently lost.
    try {
      await atomicMutateBalance({
        userId: recipientId,
        balanceField: "withdrawableBalance",
        delta: amount,
        tx: {
          type: "transfer_in",
          amount,
          description: `Transfer from ${req.user.name}`,
          reference: `${transferId}_IN`,
          status: "completed",
          relatedUser: senderId,
          withdrawable: true,
          createdAt: now,
        },
        upsert: true,
      });
    } catch (creditErr) {
      logger.error(`transferFunds: recipient credit failed after sender debit, refunding sender. ref=${transferId}`, creditErr);
      await atomicMutateBalance({
        userId: senderId,
        balanceField: "withdrawableBalance",
        delta: amount,
        tx: {
          type: "refund",
          amount,
          description: `Refund: transfer to ${recipient.name} failed`,
          reference: `${transferId}_REFUND`,
          status: "completed",
          withdrawable: true,
          createdAt: new Date(),
        },
      });
      return res.status(500).json({ message: "Transfer failed and was reversed. Please try again." });
    }

    // Notify recipient
    notify(recipientId, {
      type: "wallet",
      title: "Wallet Credit",
      message: `₦${amount.toLocaleString()} received from ${req.user.name}`,
      link: "/wallet",
    }).catch(() => {});

    res.json({
      success: true,
      message: "Transfer successful",
      transferId,
      newBalance: debit.balanceAfter,
    });
  } catch (err) {
    logger.error("transferFunds error:", err);
    res.status(500).json({ message: "Transfer failed. Please try again." });
  }
};

// ─── Request withdrawal (initiate bank transfer) ────────────────────────────
export const requestWithdrawal = async (req, res) => {
  try {
    const { amount } = req.body;
    const userId = req.user._id;

    if (!amount || amount <= 0) {
      return res.status(400).json({ message: "Invalid amount" });
    }

    const wallet = await getOrCreateWallet(userId);

    // Check bank details
    if (!wallet.bankDetails?.accountNumber) {
      return res.status(400).json({ message: "Please add bank details first" });
    }
    if (!wallet.bankDetails.verified) {
      return res.status(400).json({ message: "Your bank account is pending verification. We'll notify you once it's approved." });
    }

    // Reset daily/monthly limit counters if a new day/month has started.
    // This reset is best-effort (not part of the atomic decrement below) —
    // fund safety never depends on it, since the withdrawableBalance filter
    // always prevents the balance itself from going negative.
    const now = new Date();
    const lastReset = wallet.lastWithdrawalReset ? new Date(wallet.lastWithdrawalReset) : null;
    const newDay = !lastReset || lastReset.toDateString() !== now.toDateString();
    const newMonth = !lastReset || lastReset.getMonth() !== now.getMonth() || lastReset.getFullYear() !== now.getFullYear();
    if (newDay || newMonth) {
      await Wallet.updateOne(
        { user: userId },
        {
          $set: {
            ...(newDay ? { totalWithdrawnToday: 0 } : {}),
            ...(newMonth ? { totalWithdrawnThisMonth: 0 } : {}),
            lastWithdrawalReset: now,
          },
        }
      );
    }

    // Re-read post-reset limits for the pre-checks below (informational —
    // the withdrawableBalance $gte filter is what actually prevents overdraw).
    const fresh = await Wallet.findOne({ user: userId }).select("totalWithdrawnToday totalWithdrawnThisMonth dailyWithdrawalLimit monthlyWithdrawalLimit");
    if (fresh.totalWithdrawnToday + amount > fresh.dailyWithdrawalLimit) {
      return res.status(400).json({
        message: `Daily withdrawal limit (₦${fresh.dailyWithdrawalLimit.toLocaleString()}) exceeded. You've already withdrawn ₦${fresh.totalWithdrawnToday.toLocaleString()} today.`,
      });
    }
    if (fresh.totalWithdrawnThisMonth + amount > fresh.monthlyWithdrawalLimit) {
      return res.status(400).json({
        message: `Monthly withdrawal limit (₦${fresh.monthlyWithdrawalLimit.toLocaleString()}) exceeded. You've already withdrawn ₦${fresh.totalWithdrawnThisMonth.toLocaleString()} this month.`,
      });
    }

    const withdrawalId = `WD_${crypto.randomBytes(6).toString("hex").toUpperCase()}`;

    const result = await atomicMutateBalance({
      userId,
      balanceField: "withdrawableBalance",
      delta: -amount,
      requireAtLeast: amount,
      tx: {
        type: "withdrawal",
        amount,
        description: `Withdrawal to ${wallet.bankDetails.bankName} (${mask(wallet.bankDetails.accountNumber)})`,
        reference: withdrawalId,
        status: "pending", // Will be marked "completed" by admin/webhook
        withdrawable: true,
        createdAt: now,
      },
    });

    if (!result.wallet) {
      return res.status(400).json({
        message: "Insufficient withdrawable balance. Gift credits (site-only funds) cannot be withdrawn to your bank account.",
      });
    }

    await Wallet.updateOne(
      { user: userId },
      { $inc: { totalWithdrawnToday: amount, totalWithdrawnThisMonth: amount } }
    );

    res.json({
      success: true,
      message: "Withdrawal request submitted. Transfer will process within 24-48 hours.",
      withdrawalId,
      newWithdrawableBalance: result.balanceAfter,
    });
  } catch (err) {
    logger.error("requestWithdrawal error:", err);
    res.status(500).json({ message: "Withdrawal request failed. Please try again." });
  }
};

// ─── Get transaction history ───────────────────────────────────────────────
export const getTransactionHistory = async (req, res) => {
  try {
    const userId = req.user._id;
    const page = parseInt(req.query.page || "1", 10);
    const limit = parseInt(req.query.limit || "20", 10);
    const skip = (page - 1) * limit;

    const wallet = await getOrCreateWallet(userId);

    const transactions = wallet.transactions.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(skip, skip + limit);

    const total = wallet.transactions.length;

    res.json({
      transactions,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    logger.error("getTransactionHistory error:", err);
    res.status(500).json({ message: "Failed to fetch transaction history" });
  }
};

// ─── Add credit to wallet (admin function for earnings, refunds, etc.) ──────
export const creditWallet = async (req, res) => {
  try {
    const { userId, amount, description, reference, type = "credit", idempotencyKey } = req.body;

    if (!userId || !amount || amount <= 0) {
      return res.status(400).json({ message: "Invalid userId or amount" });
    }

    const targetUser = await User.findById(userId).select("_id");
    if (!targetUser) {
      return res.status(404).json({ message: "Target user not found" });
    }

    const result = await atomicMutateBalance({
      userId,
      balanceField: "withdrawableBalance",
      delta: amount,
      idempotencyKey,
      upsert: true,
      tx: {
        type,
        amount,
        description: description || "Wallet credit",
        reference,
        status: "completed",
        withdrawable: true,
        idempotencyKey,
        createdAt: new Date(),
      },
    });

    if (result.alreadyProcessed) {
      return res.json({ success: true, message: "Credit already processed (idempotent)", balanceAfter: result.tx.balanceAfter });
    }

    logger.info(`💰 Wallet credited: userId=${userId}, amount=₦${amount}, newBalance=₦${result.balanceAfter}`);

    res.json({
      success: true,
      message: "Wallet credited successfully",
      newWithdrawableBalance: result.balanceAfter,
    });
  } catch (err) {
    logger.error("creditWallet error:", err);
    res.status(500).json({ message: "Failed to credit wallet" });
  }
};

// ─── Gift non-withdrawable credits (admin only) ────────────────────────────
export const giftCredits = async (req, res) => {
  try {
    const { userId, amount, description, reference, reason, idempotencyKey } = req.body;

    if (!userId || !amount || amount <= 0) {
      return res.status(400).json({ message: "Invalid userId or amount" });
    }

    const targetUser = await User.findById(userId).select("_id");
    if (!targetUser) {
      return res.status(404).json({ message: "Target user not found" });
    }

    const result = await atomicMutateBalance({
      userId,
      balanceField: "giftCredits",
      delta: amount,
      idempotencyKey,
      upsert: true,
      tx: {
        type: "gift_credit",
        amount,
        description: description || `Gift credits - ${reason || "UMP reward"}`,
        reference,
        status: "completed",
        withdrawable: false, // CANNOT be withdrawn
        idempotencyKey,
        createdAt: new Date(),
      },
    });

    if (result.alreadyProcessed) {
      return res.json({ success: true, message: "Gift already issued (idempotent)", balanceAfter: result.tx.balanceAfter });
    }

    // Notify user
    notify(userId, {
      type: "wallet",
      title: "🎁 You received gift credits!",
      message: `₦${amount.toLocaleString()} gift credits added to your wallet. Use them to buy anything on UMP!`,
      link: "/wallet",
    }).catch(() => {});

    logger.info(`🎁 Gift credits issued: userId=${userId}, amount=₦${amount}, reason=${reason}`);

    res.json({
      success: true,
      message: "Gift credits issued successfully",
      newGiftCredits: result.balanceAfter,
    });
  } catch (err) {
    logger.error("giftCredits error:", err);
    res.status(500).json({ message: "Failed to gift credits" });
  }
};

// ─── Debit wallet (admin function) ─────────────────────────────────────────
export const debitWallet = async (req, res) => {
  try {
    const { userId, amount, description, reference, idempotencyKey } = req.body;

    if (!userId || !amount || amount <= 0) {
      return res.status(400).json({ message: "Invalid userId or amount" });
    }

    const targetUser = await User.findById(userId).select("_id");
    if (!targetUser) {
      return res.status(404).json({ message: "Target user not found" });
    }

    const result = await atomicMutateBalance({
      userId,
      balanceField: "withdrawableBalance",
      delta: -amount,
      requireAtLeast: amount,
      idempotencyKey,
      tx: {
        type: "debit",
        amount,
        description: description || "Wallet debit",
        reference,
        status: "completed",
        withdrawable: true,
        idempotencyKey,
        createdAt: new Date(),
      },
    });

    if (result.alreadyProcessed) {
      return res.json({ success: true, message: "Debit already processed (idempotent)", balanceAfter: result.tx.balanceAfter });
    }
    if (!result.wallet) {
      return res.status(400).json({ message: "Insufficient withdrawable balance" });
    }

    logger.info(`💳 Wallet debited: userId=${userId}, amount=₦${amount}, newBalance=₦${result.balanceAfter}`);

    res.json({
      success: true,
      message: "Wallet debited successfully",
      newBalance: result.balanceAfter,
    });
  } catch (err) {
    logger.error("debitWallet error:", err);
    res.status(500).json({ message: "Failed to debit wallet" });
  }
};

// ─── Verify a user's bank details (admin only) — required before withdrawal ─
export const verifyBankDetails = async (req, res) => {
  try {
    const { userId } = req.params;

    const wallet = await Wallet.findOne({ user: userId });
    if (!wallet?.bankDetails?.accountNumber) {
      return res.status(404).json({ message: "This user has no bank details on file" });
    }

    wallet.bankDetails.verified = true;
    wallet.bankDetails.verifiedAt = new Date();
    await wallet.save();

    notify(userId, {
      type: "wallet",
      title: "Bank account verified",
      message: "Your bank account has been verified. You can now withdraw from your wallet.",
      link: "/wallet",
    }).catch(() => {});

    res.json({ success: true, message: "Bank details verified" });
  } catch (err) {
    logger.error("verifyBankDetails error:", err);
    res.status(500).json({ message: "Failed to verify bank details" });
  }
};
