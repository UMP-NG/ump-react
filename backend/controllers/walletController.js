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

    const wallet = await getOrCreateWallet(req.user._id);

    wallet.bankDetails = {
      bankName,
      bankCode,
      accountNumber: encrypt(accountNumber), // encrypted at rest
      accountName,
      verified: false, // Bank verification happens server-side in production
    };
    await wallet.save();

    res.json({ success: true, message: "Bank details saved", bankDetails: maskedBankDetails(wallet.bankDetails) });
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

    // Get sender's wallet
    const senderWallet = await getOrCreateWallet(senderId);

    // Can only transfer withdrawable funds
    if (senderWallet.withdrawableBalance < amount) {
      return res.status(400).json({ message: "Insufficient withdrawable balance. Gift credits cannot be transferred." });
    }

    // Get recipient's wallet
    const recipientWallet = await getOrCreateWallet(recipientId);

    // Execute transfer
    const transferId = `TXN_${crypto.randomBytes(6).toString("hex").toUpperCase()}`;
    const now = new Date();

    // Debit sender (only from withdrawable balance)
    senderWallet.withdrawableBalance -= amount;
    senderWallet.balance -= amount;
    senderWallet.transactions.push({
      type: "transfer_out",
      amount,
      description: `Transfer to ${recipient.name}`,
      reference: transferId,
      balanceAfter: senderWallet.withdrawableBalance,
      status: "completed",
      relatedUser: recipientId,
      withdrawable: true,
      createdAt: now,
    });
    await senderWallet.save();

    // Credit recipient (as withdrawable funds)
    recipientWallet.withdrawableBalance += amount;
    recipientWallet.balance += amount;
    recipientWallet.transactions.push({
      type: "transfer_in",
      amount,
      description: `Transfer from ${req.user.name}`,
      reference: transferId,
      balanceAfter: recipientWallet.withdrawableBalance,
      status: "completed",
      relatedUser: senderId,
      withdrawable: true,
      createdAt: now,
    });
    await recipientWallet.save();

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
      newBalance: senderWallet.withdrawableBalance,
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

    // Get wallet
    const wallet = await getOrCreateWallet(userId);

    // Check withdrawable balance only (gift credits cannot be withdrawn)
    if (wallet.withdrawableBalance < amount) {
      return res.status(400).json({
        message: "Insufficient withdrawable balance. Gift credits (site-only funds) cannot be withdrawn to your bank account.",
        withdrawableBalance: wallet.withdrawableBalance,
        giftCredits: wallet.giftCredits,
      });
    }

    // Check bank details
    if (!wallet.bankDetails?.accountNumber) {
      return res.status(400).json({ message: "Please add bank details first" });
    }

    // Reset daily/monthly limits if needed
    const now = new Date();
    const lastReset = wallet.lastWithdrawalReset ? new Date(wallet.lastWithdrawalReset) : null;

    if (!lastReset || lastReset.toDateString() !== now.toDateString()) {
      wallet.totalWithdrawnToday = 0;
    }

    if (!lastReset || lastReset.getMonth() !== now.getMonth() || lastReset.getFullYear() !== now.getFullYear()) {
      wallet.totalWithdrawnThisMonth = 0;
    }

    // Check daily limit
    if (wallet.totalWithdrawnToday + amount > wallet.dailyWithdrawalLimit) {
      return res.status(400).json({
        message: `Daily withdrawal limit (₦${wallet.dailyWithdrawalLimit.toLocaleString()}) exceeded. You've already withdrawn ₦${wallet.totalWithdrawnToday.toLocaleString()} today.`,
      });
    }

    // Check monthly limit
    if (wallet.totalWithdrawnThisMonth + amount > wallet.monthlyWithdrawalLimit) {
      return res.status(400).json({
        message: `Monthly withdrawal limit (₦${wallet.monthlyWithdrawalLimit.toLocaleString()}) exceeded. You've already withdrawn ₦${wallet.totalWithdrawnThisMonth.toLocaleString()} this month.`,
      });
    }

    // Create withdrawal transaction (only from withdrawable balance)
    const withdrawalId = `WD_${crypto.randomBytes(6).toString("hex").toUpperCase()}`;

    wallet.withdrawableBalance -= amount;
    wallet.balance -= amount;
    wallet.totalWithdrawnToday += amount;
    wallet.totalWithdrawnThisMonth += amount;
    wallet.lastWithdrawalReset = now;

    wallet.transactions.push({
      type: "withdrawal",
      amount,
      description: `Withdrawal to ${wallet.bankDetails.bankName} (${mask(wallet.bankDetails.accountNumber)})`,
      reference: withdrawalId,
      balanceAfter: wallet.withdrawableBalance,
      status: "pending", // Will be marked "completed" by admin/webhook
      withdrawable: true,
      createdAt: now,
    });
    await wallet.save();

    res.json({
      success: true,
      message: "Withdrawal request submitted. Transfer will process within 24-48 hours.",
      withdrawalId,
      newWithdrawableBalance: wallet.withdrawableBalance,
      remainingGiftCredits: wallet.giftCredits,
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

    const wallet = await getOrCreateWallet(userId);

    // Idempotency: check if this key was already processed
    if (idempotencyKey) {
      const existingTx = wallet.transactions.find((t) => t.idempotencyKey === idempotencyKey);
      if (existingTx) {
        return res.json({
          success: true,
          message: "Credit already processed (idempotent)",
          balanceAfter: existingTx.balanceAfter,
        });
      }
    }

    const oldWithdrawableBalance = wallet.withdrawableBalance;
    wallet.balance += amount;
    wallet.withdrawableBalance += amount; // Regular credits are withdrawable

    wallet.transactions.push({
      type,
      amount,
      description: description || "Wallet credit",
      reference,
      balanceAfter: wallet.withdrawableBalance,
      status: "completed",
      withdrawable: true,
      idempotencyKey,
      createdAt: new Date(),
    });
    await wallet.save();

    logger.info(`💰 Wallet credited: userId=${userId}, amount=₦${amount}, newBalance=₦${wallet.withdrawableBalance}`);

    res.json({
      success: true,
      message: "Wallet credited successfully",
      oldWithdrawableBalance,
      newWithdrawableBalance: wallet.withdrawableBalance,
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

    const wallet = await getOrCreateWallet(userId);

    // Idempotency: check if this key was already processed
    if (idempotencyKey) {
      const existingTx = wallet.transactions.find((t) => t.idempotencyKey === idempotencyKey);
      if (existingTx) {
        return res.json({
          success: true,
          message: "Gift already issued (idempotent)",
          balanceAfter: existingTx.balanceAfter,
        });
      }
    }

    const oldGiftCredits = wallet.giftCredits;
    wallet.balance += amount;
    wallet.giftCredits += amount; // Non-withdrawable gift credits

    wallet.transactions.push({
      type: "gift_credit",
      amount,
      description: description || `Gift credits - ${reason || "UMP reward"}`,
      reference,
      balanceAfter: wallet.giftCredits,
      status: "completed",
      withdrawable: false, // CANNOT be withdrawn
      idempotencyKey,
      createdAt: new Date(),
    });
    await wallet.save();

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
      oldGiftCredits,
      newGiftCredits: wallet.giftCredits,
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

    const wallet = await getOrCreateWallet(userId);

    // Idempotency: check if this key was already processed
    if (idempotencyKey) {
      const existingTx = wallet.transactions.find((t) => t.idempotencyKey === idempotencyKey);
      if (existingTx) {
        return res.json({
          success: true,
          message: "Debit already processed (idempotent)",
          balanceAfter: existingTx.balanceAfter,
        });
      }
    }

    // MUST debit from withdrawable balance to maintain invariant
    if (wallet.withdrawableBalance < amount) {
      return res.status(400).json({ message: "Insufficient withdrawable balance" });
    }

    const oldBalance = wallet.balance;
    wallet.balance -= amount;
    wallet.withdrawableBalance -= amount; // CRITICAL: maintain invariant

    wallet.transactions.push({
      type: "debit",
      amount,
      description: description || "Wallet debit",
      reference,
      balanceAfter: wallet.withdrawableBalance,
      status: "completed",
      withdrawable: true,
      idempotencyKey,
      createdAt: new Date(),
    });
    await wallet.save();

    logger.info(`💳 Wallet debited: userId=${userId}, amount=₦${amount}, newBalance=₦${wallet.withdrawableBalance}`);

    res.json({
      success: true,
      message: "Wallet debited successfully",
      oldBalance,
      newBalance: wallet.withdrawableBalance,
    });
  } catch (err) {
    logger.error("debitWallet error:", err);
    res.status(500).json({ message: "Failed to debit wallet" });
  }
};
