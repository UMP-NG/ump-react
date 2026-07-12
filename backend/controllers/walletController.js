import Wallet from "../models/Wallet.js";
import User from "../models/User.js";
import WalletIdempotencyKey from "../models/WalletIdempotencyKey.js";
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
//
// - `requireAtLeast`: if set, the filter only matches when balanceField >= this
//   amount, so an under-funded request atomically fails instead of racing.
// - `extraFilter` / `extraInc`: merged into the same atomic filter/$inc, so
//   callers can fold additional conditions (e.g. daily withdrawal limits)
//   into the SAME atomic operation instead of checking them separately
//   (which would reopen a TOCTOU race).
// - `idempotencyKey`: claimed via a unique-indexed side collection *before*
//   the balance mutation runs, so a retried request atomically no-ops instead
//   of double-crediting/debiting. This is independent of the capped
//   `transactions` array (which only keeps the last 100 entries), so an
//   idempotency guarantee never silently expires as a wallet accumulates
//   history — and because the wallet's own filter no longer references
//   idempotencyKey at all, `upsert: true` callers can never hit the
//   "$ne condition + upsert = phantom insert on an existing user" failure.
//
// Returns { wallet, alreadyProcessed, balanceAfter, reference }. `wallet` is
// null when the op was rejected (insufficient balance / limit exceeded) or
// when it was a no-op idempotent replay.
async function atomicMutateBalance({ userId, balanceField, delta, requireAtLeast, extraFilter = {}, extraInc = {}, idempotencyKey, tx, upsert = false }) {
  if (idempotencyKey) {
    try {
      await WalletIdempotencyKey.create({ user: userId, idempotencyKey });
    } catch (err) {
      if (err.code === 11000) {
        // Someone already claimed this key. In the extremely rare case the
        // original request hasn't finished writing its result yet,
        // balanceAfter may briefly be null — the caller still gets an
        // accurate "already processed" signal with no risk of a double-spend.
        const existing = await WalletIdempotencyKey.findOne({ user: userId, idempotencyKey });
        return { wallet: null, alreadyProcessed: true, balanceAfter: existing?.balanceAfter ?? null, reference: existing?.reference };
      }
      throw err;
    }
  }

  const filter = { user: userId, ...extraFilter };
  if (requireAtLeast != null) filter[balanceField] = { $gte: requireAtLeast };

  const reference = tx.reference || `${tx.type.toUpperCase()}_${crypto.randomBytes(6).toString("hex").toUpperCase()}`;
  const update = {
    $inc: { [balanceField]: delta, balance: delta, ...extraInc },
    $push: { transactions: { $each: [{ ...tx, reference, idempotencyKey }], $slice: -100 } },
  };

  const wallet = await Wallet.findOneAndUpdate(filter, update, { new: true, upsert });

  if (!wallet) {
    // Genuine rejection (insufficient balance / limit exceeded), not a
    // replay. Release the idempotency claim so a legitimate retry — e.g.
    // after the user tops up — isn't permanently blocked by this failed
    // attempt.
    if (idempotencyKey) await WalletIdempotencyKey.deleteOne({ user: userId, idempotencyKey }).catch(() => {});
    return { wallet: null, alreadyProcessed: false };
  }

  // balanceAfter depends on the post-increment value, which we only know now —
  // attach it in a follow-up update targeted at this transaction's unique
  // reference. This second write never touches balances, so it carries no
  // double-spend risk even if it races with other requests.
  const balanceAfter = wallet[balanceField];
  await Wallet.updateOne(
    { user: userId, "transactions.reference": reference },
    { $set: { "transactions.$.balanceAfter": balanceAfter } }
  );
  if (idempotencyKey) {
    await WalletIdempotencyKey.updateOne({ user: userId, idempotencyKey }, { $set: { reference, balanceAfter } }).catch(() => {});
  }

  return { wallet, alreadyProcessed: false, reference, balanceAfter };
}

// ─── Spend from a wallet balance pool toward an order (called from checkout) ─
// Used by orderController.checkoutCart to apply gift credits / withdrawable
// wallet balance toward a purchase. Reuses atomicMutateBalance so this is
// exposed to exactly the same race protection as transfers/withdrawals — a
// concurrent checkout or withdrawal can never double-spend the same balance.
export async function spendWalletBalance({ userId, balanceField, amount, reference, description }) {
  return atomicMutateBalance({
    userId,
    balanceField,
    delta: -amount,
    requireAtLeast: amount,
    tx: {
      type: "purchase",
      amount,
      description: description || "Order payment",
      reference,
      status: "completed",
      withdrawable: balanceField === "withdrawableBalance",
      createdAt: new Date(),
    },
  });
}

// Refunds a wallet balance pool — used to compensate an earlier successful
// deduction if a later step in a multi-pool checkout fails, so a partial
// failure never leaves money silently deducted with no order created.
export async function refundWalletBalance({ userId, balanceField, amount, reference, description }) {
  return atomicMutateBalance({
    userId,
    balanceField,
    delta: amount,
    upsert: true,
    tx: {
      type: "refund",
      amount,
      description: description || "Order payment reversed",
      reference,
      status: "completed",
      withdrawable: balanceField === "withdrawableBalance",
      createdAt: new Date(),
    },
  });
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

// ─── Get any user's wallet (admin only) — same shape as getWallet ──────────
export const getWalletForAdmin = async (req, res) => {
  try {
    const { userId } = req.params;

    const targetUser = await User.findById(userId).select("_id");
    if (!targetUser) {
      return res.status(404).json({ message: "User not found" });
    }

    const wallet = await getOrCreateWallet(userId);

    res.json({
      balance: wallet.balance,
      withdrawableBalance: wallet.withdrawableBalance,
      giftCredits: wallet.giftCredits,
      bankDetails: maskedBankDetails(wallet.bankDetails),
      transactions: wallet.transactions.slice(-10),
    });
  } catch (err) {
    logger.error("getWalletForAdmin error:", err);
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
    let credit;
    try {
      credit = await atomicMutateBalance({
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
      if (!credit.wallet) throw new Error("Recipient credit returned no wallet");
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
      balanceAfter: debit.balanceAfter,
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
    // This reset itself doesn't need to be race-free — worst case at an exact
    // day/month boundary it runs redundantly, which is harmless (setting a
    // counter to 0 twice is idempotent). The actual limit *enforcement*
    // below is what must be atomic, and it is: it's folded into the same
    // conditional findOneAndUpdate as the balance decrement.
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

    const withdrawalId = `WD_${crypto.randomBytes(6).toString("hex").toUpperCase()}`;

    // Balance sufficiency AND both withdrawal limits are enforced by this one
    // atomic filter — no separate read-then-check step, so two concurrent
    // withdrawals can never both slip past the same limit (TOCTOU-safe).
    const result = await atomicMutateBalance({
      userId,
      balanceField: "withdrawableBalance",
      delta: -amount,
      requireAtLeast: amount,
      extraFilter: {
        $expr: {
          $and: [
            { $lte: [{ $add: ["$totalWithdrawnToday", amount] }, "$dailyWithdrawalLimit"] },
            { $lte: [{ $add: ["$totalWithdrawnThisMonth", amount] }, "$monthlyWithdrawalLimit"] },
          ],
        },
      },
      extraInc: { totalWithdrawnToday: amount, totalWithdrawnThisMonth: amount },
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
      // The atomic filter rejected the request — read fresh values purely to
      // produce an accurate error message. This read has no bearing on
      // enforcement, which already happened atomically above.
      const fresh = await Wallet.findOne({ user: userId })
        .select("withdrawableBalance totalWithdrawnToday totalWithdrawnThisMonth dailyWithdrawalLimit monthlyWithdrawalLimit");
      if (fresh.withdrawableBalance < amount) {
        return res.status(400).json({ message: "Insufficient withdrawable balance. Gift credits (site-only funds) cannot be withdrawn to your bank account." });
      }
      if (fresh.totalWithdrawnToday + amount > fresh.dailyWithdrawalLimit) {
        return res.status(400).json({
          message: `Daily withdrawal limit (₦${fresh.dailyWithdrawalLimit.toLocaleString()}) exceeded. You've already withdrawn ₦${fresh.totalWithdrawnToday.toLocaleString()} today.`,
        });
      }
      return res.status(400).json({
        message: `Monthly withdrawal limit (₦${fresh.monthlyWithdrawalLimit.toLocaleString()}) exceeded. You've already withdrawn ₦${fresh.totalWithdrawnThisMonth.toLocaleString()} this month.`,
      });
    }

    res.json({
      success: true,
      message: "Withdrawal request submitted. Transfer will process within 24-48 hours.",
      withdrawalId,
      balanceAfter: result.balanceAfter,
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
        createdAt: new Date(),
      },
    });

    logger.info(`💰 Wallet credited: userId=${userId}, amount=₦${amount}, newBalance=₦${result.balanceAfter}${result.alreadyProcessed ? " (idempotent replay)" : ""}`);

    res.json({
      success: true,
      message: result.alreadyProcessed ? "Credit already processed (idempotent)" : "Wallet credited successfully",
      balanceAfter: result.balanceAfter,
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
        relatedUser: req.user._id, // which admin issued this gift
        createdAt: new Date(),
      },
    });

    if (!result.alreadyProcessed) {
      notify(userId, {
        type: "wallet",
        title: "🎁 You received gift credits!",
        message: `₦${amount.toLocaleString()} gift credits added to your wallet. Use them to buy anything on UMP!`,
        link: "/wallet",
      }).catch(() => {});
    }

    logger.info(`🎁 Gift credits issued: userId=${userId}, amount=₦${amount}, reason=${reason}${result.alreadyProcessed ? " (idempotent replay)" : ""}`);

    res.json({
      success: true,
      message: result.alreadyProcessed ? "Gift already issued (idempotent)" : "Gift credits issued successfully",
      balanceAfter: result.balanceAfter,
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
        createdAt: new Date(),
      },
    });

    if (!result.wallet && !result.alreadyProcessed) {
      return res.status(400).json({ message: "Insufficient withdrawable balance" });
    }

    logger.info(`💳 Wallet debited: userId=${userId}, amount=₦${amount}, newBalance=₦${result.balanceAfter}${result.alreadyProcessed ? " (idempotent replay)" : ""}`);

    res.json({
      success: true,
      message: result.alreadyProcessed ? "Debit already processed (idempotent)" : "Wallet debited successfully",
      balanceAfter: result.balanceAfter,
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

// ─── List every gift-credit transaction across all users (admin only) ──────
// Flattens each wallet's transactions array down to just its gift_credit
// entries, joined with the recipient's and issuing admin's name/email, so
// admins can see everyone who's been gifted something without having to
// look up users one at a time. Route is gated behind protect + requireRole("admin").
//
// Cost note: $unwind runs over every wallet's full transactions array before
// $match can filter to gift_credit entries — Mongo can't use an index across
// an unwind+match on a subdocument array this way, so this is a full scan of
// all wallets' transaction history. Fine at campus-marketplace scale where
// gifting is an infrequent admin action, not a per-request hot path; if wallet
// transaction volume grows substantially, move gift_credit issuance into its
// own indexed collection instead of scanning it out of the embedded array.
export const getAllGifts = async (req, res) => {
  try {
    const page  = Math.max(1, parseInt(req.query.page, 10)  || 1);
    const limit = Math.min(50, parseInt(req.query.limit, 10) || 20);
    const skip  = (page - 1) * limit;

    const pipeline = [
      { $unwind: "$transactions" },
      { $match: { "transactions.type": "gift_credit" } },
      { $sort: { "transactions.createdAt": -1 } },
      {
        $facet: {
          data: [
            { $skip: skip },
            { $limit: limit },
            {
              $lookup: {
                from: "users",
                localField: "user",
                foreignField: "_id",
                as: "recipient",
              },
            },
            {
              $lookup: {
                from: "users",
                localField: "transactions.relatedUser",
                foreignField: "_id",
                as: "issuedByUser",
              },
            },
            {
              $project: {
                _id: 0,
                reference:    "$transactions.reference",
                amount:       "$transactions.amount",
                description:  "$transactions.description",
                status:       "$transactions.status",
                balanceAfter: "$transactions.balanceAfter",
                createdAt:    "$transactions.createdAt",
                recipient: {
                  _id:   { $arrayElemAt: ["$recipient._id", 0] },
                  name:  { $arrayElemAt: ["$recipient.name", 0] },
                  email: { $arrayElemAt: ["$recipient.email", 0] },
                },
                issuedBy: {
                  _id:  { $arrayElemAt: ["$issuedByUser._id", 0] },
                  name: { $arrayElemAt: ["$issuedByUser.name", 0] },
                },
              },
            },
          ],
          totalCount: [{ $count: "count" }],
        },
      },
    ];

    const [result] = await Wallet.aggregate(pipeline);
    const gifts = result?.data || [];
    const total = result?.totalCount?.[0]?.count || 0;

    res.json({ gifts, total, page, pages: Math.ceil(total / limit) });
  } catch (err) {
    logger.error("getAllGifts error:", err);
    res.status(500).json({ message: "Failed to fetch gift history" });
  }
};
