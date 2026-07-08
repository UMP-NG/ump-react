import { useState, useEffect, useCallback } from "react";
import { useUser } from "../context/UserContext";
import { useToast } from "../context/ToastContext";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../utils/api";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import BottomNav from "../components/BottomNav";

const naira = (n) => `₦${Number(n || 0).toLocaleString()}`;

export default function Wallet() {
  const { user } = useUser();
  const navigate = useNavigate();
  const showToast = useToast();

  const [tab, setTab] = useState("balance");
  const [loading, setLoading] = useState(true);
  const [wallet, setWallet] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [bankSaving, setBankSaving] = useState(false);
  const [transferring, setTransferring] = useState(false);
  const [showComingSoon, setShowComingSoon] = useState(false);

  // Form states
  const [bankForm, setBankForm] = useState({ bankName: "", bankCode: "", accountNumber: "", accountName: "" });
  const [transferForm, setTransferForm] = useState({ recipientEmail: "", amount: "", note: "" });
  const [withdrawForm, setWithdrawForm] = useState({ amount: "" });

  const loadWallet = useCallback(async () => {
    setLoading(true);
    try {
      const [w, t] = await Promise.all([
        apiFetch("/api/wallet"),
        apiFetch("/api/wallet/history"),
      ]);
      setWallet(w);
      setTransactions(t.transactions || []);
      if (w.bankDetails) {
        setBankForm(w.bankDetails);
      }
    } catch (err) {
      showToast(err?.message || "Failed to load wallet", "error");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    if (!user) return;
    loadWallet();
  }, [user, loadWallet]);

  async function saveBankDetails() {
    if (!bankForm.bankName || !bankForm.bankCode || !bankForm.accountNumber || !bankForm.accountName) {
      showToast("All fields are required", "error");
      return;
    }
    setBankSaving(true);
    try {
      const result = await apiFetch("/api/wallet/bank-details", {
        method: "POST",
        body: bankForm,
      });
      setWallet((prev) => ({ ...prev, bankDetails: result.bankDetails }));
      showToast("Bank details saved successfully", "success");
    } catch (err) {
      showToast(err?.message || "Failed to save bank details", "error");
    } finally {
      setBankSaving(false);
    }
  }

  async function handleTransfer() {
    if (!transferForm.recipientEmail || !transferForm.amount || transferForm.amount <= 0) {
      showToast("Enter recipient email and amount", "error");
      return;
    }

    // Find recipient by email
    setTransferring(true);
    try {
      // In a real app, you'd have an endpoint to find user by email
      // For now, we'll ask user to enter recipient ID
      showToast("Please enter recipient user ID in the email field", "info");
    } catch (err) {
      showToast(err?.message || "Transfer failed", "error");
    } finally {
      setTransferring(false);
    }
  }

  async function handleWithdraw() {
    // Show "Coming Soon" modal
    setShowComingSoon(true);
    return;

    // Original withdrawal logic (commented out for "Coming Soon")
    /*
    if (!wallet?.bankDetails?.accountNumber) {
      showToast("Please add bank details first", "error");
      setTab("bank");
      return;
    }

    if (!withdrawForm.amount || withdrawForm.amount <= 0) {
      showToast("Enter valid amount", "error");
      return;
    }

    if (withdrawForm.amount > wallet.withdrawableBalance) {
      showToast(err?.message || "Insufficient withdrawable balance. Gift credits cannot be withdrawn.", "error");
      return;
    }

    setWithdrawing(true);
    try {
      const result = await apiFetch("/api/wallet/withdraw", {
        method: "POST",
        body: { amount: parseFloat(withdrawForm.amount) },
      });
      showToast(result.message, "success");
      setWithdrawForm({ amount: "" });
      loadWallet();
    } catch (err) {
      showToast(err?.message || "Withdrawal failed", "error");
    } finally {
      setWithdrawing(false);
    }
    */
  }

  if (!user) {
    navigate("/login");
    return null;
  }

  if (loading) {
    return (
      <div className="page">
        <Navbar />
        <div style={{ padding: "80px 16px", textAlign: "center" }}>
          <i className="fas fa-spinner fa-spin" style={{ fontSize: "2rem", color: "var(--accent)", marginBottom: 12 }} />
          <p>Loading wallet...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <Navbar />

      <div style={{ padding: "16px", maxWidth: 600, margin: "0 auto 60px" }}>
        <h1 style={{ fontSize: "2.2rem", fontWeight: 800, margin: "0 0 12px" }}>UMP Wallet</h1>
        <p style={{ margin: "0 0 24px", color: "var(--ink-3)", fontSize: "1.3rem" }}>
          Send, receive, and withdraw money instantly
        </p>

        {/* Balance Cards */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 20 }}>
          {/* Withdrawable Balance */}
          <div className="card" style={{ padding: 20, background: "linear-gradient(135deg, var(--accent), #ea580c)", color: "#fff", borderRadius: "var(--r-xl)" }}>
            <div style={{ fontSize: "0.95rem", opacity: 0.9, marginBottom: 6 }}>Withdrawable</div>
            <div style={{ fontSize: "2rem", fontWeight: 800 }}>{naira(wallet?.withdrawableBalance || 0)}</div>
            <div style={{ fontSize: "0.85rem", opacity: 0.8, marginTop: 8 }}>
              Can transfer or withdraw to bank
            </div>
          </div>

          {/* Gift Credits */}
          <div className="card" style={{ padding: 20, background: "linear-gradient(135deg, #10b981, #059669)", color: "#fff", borderRadius: "var(--r-xl)" }}>
            <div style={{ fontSize: "0.95rem", opacity: 0.9, marginBottom: 6 }}>🎁 Gift Credits</div>
            <div style={{ fontSize: "2rem", fontWeight: 800 }}>{naira(wallet?.giftCredits || 0)}</div>
            <div style={{ fontSize: "0.85rem", opacity: 0.8, marginTop: 8 }}>
              For purchases only
            </div>
          </div>
        </div>

        {/* Total Balance */}
        <div className="card" style={{ padding: 16, marginBottom: 20, background: "rgba(59,130,246,.08)", borderRadius: "var(--r-md)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "1.3rem", fontWeight: 600 }}>Total Balance</span>
            <span style={{ fontSize: "1.6rem", fontWeight: 800, color: "var(--accent)" }}>{naira(wallet?.balance || 0)}</span>
          </div>
          {wallet?.limits && (
            <div style={{ marginTop: 12, fontSize: "0.95rem", color: "var(--ink-3)" }}>
              <div>Withdrawal today: {naira(wallet.limits.totalWithdrawnToday)} / {naira(wallet.limits.dailyWithdrawalLimit)}</div>
              <div>Withdrawal this month: {naira(wallet.limits.totalWithdrawnThisMonth)} / {naira(wallet.limits.monthlyWithdrawalLimit)}</div>
            </div>
          )}
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: 8, marginBottom: 20, borderBottom: "1px solid var(--line)", overflowX: "auto" }}>
          {[
            { id: "balance", label: "Balance", icon: "wallet" },
            { id: "transfer", label: "Send Money", icon: "arrow-right-arrow-left" },
            { id: "withdraw", label: "Withdraw", icon: "building" },
            { id: "bank", label: "Bank Details", icon: "credit-card" },
            { id: "history", label: "History", icon: "clock" },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              style={{
                padding: "12px 16px",
                border: "none",
                background: "transparent",
                cursor: "pointer",
                fontSize: "1.3rem",
                fontWeight: tab === t.id ? 700 : 500,
                color: tab === t.id ? "var(--accent)" : "var(--ink-3)",
                borderBottom: tab === t.id ? "3px solid var(--accent)" : "none",
                flexShrink: 0,
                transition: "all .2s",
              }}
            >
              <i className={`fas fa-${t.icon}`} style={{ marginRight: 6 }} />
              {t.label}
            </button>
          ))}
        </div>

        {/* Balance Tab */}
        {tab === "balance" && (
          <div style={{ paddingBottom: 40 }}>
            <div className="card" style={{ padding: 20, marginBottom: 16 }}>
              <h3 style={{ margin: "0 0 12px", fontSize: "1.5rem", fontWeight: 700 }}>Quick Actions</h3>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <button
                  onClick={() => setTab("transfer")}
                  style={{
                    padding: 16,
                    border: "1px solid var(--line)",
                    borderRadius: "var(--r-md)",
                    background: "transparent",
                    cursor: "pointer",
                    fontSize: "1.3rem",
                    fontWeight: 600,
                  }}
                >
                  <i className="fas fa-arrow-right-arrow-left" style={{ display: "block", marginBottom: 8, color: "var(--accent)" }} />
                  Send Money
                </button>
                <button
                  onClick={() => setTab("withdraw")}
                  style={{
                    padding: 16,
                    border: "1px solid var(--line)",
                    borderRadius: "var(--r-md)",
                    background: "transparent",
                    cursor: "pointer",
                    fontSize: "1.3rem",
                    fontWeight: 600,
                  }}
                >
                  <i className="fas fa-building" style={{ display: "block", marginBottom: 8, color: "var(--accent)" }} />
                  Withdraw
                </button>
              </div>
            </div>

            <div className="card" style={{ padding: 20 }}>
              <h3 style={{ margin: "0 0 12px", fontSize: "1.5rem", fontWeight: 700 }}>Recent Transactions</h3>
              {transactions.length === 0 ? (
                <p style={{ color: "var(--ink-3)", fontSize: "1.3rem" }}>No transactions yet</p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {transactions.slice(0, 5).map((t, i) => (
                    <div
                      key={i}
                      style={{
                        padding: 12,
                        background: "rgba(59,130,246,.05)",
                        borderRadius: "var(--r-md)",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 600, fontSize: "1.3rem" }}>{t.description}</div>
                        <div style={{ fontSize: "0.95rem", color: "var(--ink-3)" }}>
                          {new Date(t.createdAt).toLocaleDateString()} {new Date(t.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </div>
                      </div>
                      <div style={{ fontWeight: 700, fontSize: "1.3rem", color: t.type.includes("in") || t.type === "credit" ? "#10b981" : "#ef4444" }}>
                        {t.type.includes("in") || t.type === "credit" ? "+" : "-"}
                        {naira(t.amount)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Transfer Tab */}
        {tab === "transfer" && (
          <div style={{ paddingBottom: 40 }}>
            <div className="card" style={{ padding: 20 }}>
              <h3 style={{ margin: "0 0 16px", fontSize: "1.5rem", fontWeight: 700 }}>Send Money to Another User</h3>

              <div style={{ marginBottom: 12 }}>
                <label style={{ fontSize: "1.2rem", fontWeight: 600, display: "block", marginBottom: 6 }}>Recipient User ID</label>
                <input
                  type="text"
                  className="input"
                  placeholder="Paste recipient's user ID"
                  value={transferForm.recipientEmail}
                  onChange={(e) => setTransferForm((f) => ({ ...f, recipientEmail: e.target.value }))}
                  style={{ width: "100%", padding: "10px 14px", fontSize: "1.3rem" }}
                />
              </div>

              <div style={{ marginBottom: 12 }}>
                <label style={{ fontSize: "1.2rem", fontWeight: 600, display: "block", marginBottom: 6 }}>Amount (₦)</label>
                <input
                  type="number"
                  className="input"
                  placeholder="0"
                  value={transferForm.amount}
                  onChange={(e) => setTransferForm((f) => ({ ...f, amount: e.target.value }))}
                  style={{ width: "100%", padding: "10px 14px", fontSize: "1.3rem" }}
                />
              </div>

              <div style={{ marginBottom: 16 }}>
                <label style={{ fontSize: "1.2rem", fontWeight: 600, display: "block", marginBottom: 6 }}>Note (optional)</label>
                <textarea
                  className="input"
                  placeholder="Message to recipient"
                  value={transferForm.note}
                  onChange={(e) => setTransferForm((f) => ({ ...f, note: e.target.value }))}
                  style={{ width: "100%", padding: "10px 14px", fontSize: "1.3rem", minHeight: 80, resize: "vertical" }}
                />
              </div>

              <button
                onClick={handleTransfer}
                disabled={transferring}
                className="btn btn-primary"
                style={{ width: "100%" }}
              >
                {transferring ? <i className="fas fa-spinner fa-spin" /> : <><i className="fas fa-arrow-right" /> Send Money</>}
              </button>
            </div>
          </div>
        )}

        {/* Withdraw Tab */}
        {tab === "withdraw" && (
          <div style={{ paddingBottom: 40 }}>
            <div className="card" style={{ padding: 20 }}>
              <h3 style={{ margin: "0 0 16px", fontSize: "1.5rem", fontWeight: 700 }}>Withdraw to Bank Account</h3>

              {!wallet?.bankDetails?.accountNumber ? (
                <div style={{ padding: 16, background: "rgba(251,191,36,.1)", borderRadius: "var(--r-md)", marginBottom: 16, color: "#d97706" }}>
                  <i className="fas fa-circle-info" style={{ marginRight: 8 }} />
                  You need to add bank details first
                </div>
              ) : (
                <div style={{ padding: 12, background: "rgba(59,130,246,.05)", borderRadius: "var(--r-md)", marginBottom: 16, fontSize: "1.3rem" }}>
                  <div style={{ fontWeight: 600, marginBottom: 4 }}>{wallet.bankDetails.bankName}</div>
                  <div>{wallet.bankDetails.accountName}</div>
                  <div style={{ opacity: 0.7 }}>•••• {wallet.bankDetails.accountNumber.slice(-4)}</div>
                </div>
              )}

              <div style={{ marginBottom: 12 }}>
                <label style={{ fontSize: "1.2rem", fontWeight: 600, display: "block", marginBottom: 6 }}>Amount (₦)</label>
                <input
                  type="number"
                  className="input"
                  placeholder="0"
                  value={withdrawForm.amount}
                  onChange={(e) => setWithdrawForm({ amount: e.target.value })}
                  style={{ width: "100%", padding: "10px 14px", fontSize: "1.3rem" }}
                />
                <small style={{ color: "var(--ink-3)", display: "block", marginTop: 6 }}>
                  Available: {naira(wallet?.balance || 0)}
                </small>
              </div>

              <div style={{ padding: 12, background: "rgba(59,130,246,.05)", borderRadius: "var(--r-md)", marginBottom: 16, fontSize: "1.2rem" }}>
                <div>Daily limit: {naira(wallet?.limits?.dailyWithdrawalLimit || 0)}</div>
                <div>Monthly limit: {naira(wallet?.limits?.monthlyWithdrawalLimit || 0)}</div>
              </div>

              <button
                onClick={handleWithdraw}
                disabled={!wallet?.bankDetails?.accountNumber}
                className="btn btn-primary"
                style={{ width: "100%" }}
              >
                <i className="fas fa-arrow-down" /> Withdraw
              </button>
              <small style={{ display: "block", marginTop: 12, color: "var(--ink-3)" }}>
                Withdrawals process within 24-48 hours to your bank account
              </small>
            </div>
          </div>
        )}

        {/* Bank Details Tab */}
        {tab === "bank" && (
          <div style={{ paddingBottom: 40 }}>
            <div className="card" style={{ padding: 20 }}>
              <h3 style={{ margin: "0 0 16px", fontSize: "1.5rem", fontWeight: 700 }}>Bank Account Details</h3>

              <div style={{ marginBottom: 12 }}>
                <label style={{ fontSize: "1.2rem", fontWeight: 600, display: "block", marginBottom: 6 }}>Bank Name</label>
                <input
                  type="text"
                  className="input"
                  placeholder="e.g. Zenith Bank"
                  value={bankForm.bankName}
                  onChange={(e) => setBankForm((f) => ({ ...f, bankName: e.target.value }))}
                  style={{ width: "100%", padding: "10px 14px", fontSize: "1.3rem" }}
                />
              </div>

              <div style={{ marginBottom: 12 }}>
                <label style={{ fontSize: "1.2rem", fontWeight: 600, display: "block", marginBottom: 6 }}>Account Name</label>
                <input
                  type="text"
                  className="input"
                  placeholder="Full name on account"
                  value={bankForm.accountName}
                  onChange={(e) => setBankForm((f) => ({ ...f, accountName: e.target.value }))}
                  style={{ width: "100%", padding: "10px 14px", fontSize: "1.3rem" }}
                />
              </div>

              <div style={{ marginBottom: 12 }}>
                <label style={{ fontSize: "1.2rem", fontWeight: 600, display: "block", marginBottom: 6 }}>Account Number</label>
                <input
                  type="text"
                  className="input"
                  placeholder="10-digit account number"
                  value={bankForm.accountNumber}
                  onChange={(e) => setBankForm((f) => ({ ...f, accountNumber: e.target.value }))}
                  style={{ width: "100%", padding: "10px 14px", fontSize: "1.3rem" }}
                />
              </div>

              <div style={{ marginBottom: 16 }}>
                <label style={{ fontSize: "1.2rem", fontWeight: 600, display: "block", marginBottom: 6 }}>Bank Code</label>
                <input
                  type="text"
                  className="input"
                  placeholder="3-digit bank code"
                  value={bankForm.bankCode}
                  onChange={(e) => setBankForm((f) => ({ ...f, bankCode: e.target.value }))}
                  style={{ width: "100%", padding: "10px 14px", fontSize: "1.3rem" }}
                />
              </div>

              <button
                onClick={saveBankDetails}
                disabled={bankSaving}
                className="btn btn-primary"
                style={{ width: "100%" }}
              >
                {bankSaving ? <i className="fas fa-spinner fa-spin" /> : <><i className="fas fa-save" /> Save Bank Details</>}
              </button>
            </div>
          </div>
        )}

        {/* History Tab */}
        {tab === "history" && (
          <div style={{ paddingBottom: 40 }}>
            <div className="card" style={{ padding: 20 }}>
              <h3 style={{ margin: "0 0 16px", fontSize: "1.5rem", fontWeight: 700 }}>Transaction History</h3>
              {transactions.length === 0 ? (
                <p style={{ color: "var(--ink-3)", fontSize: "1.3rem", textAlign: "center", padding: 40 }}>
                  <i className="fas fa-inbox" style={{ fontSize: "2rem", marginBottom: 12, display: "block" }} />
                  No transactions yet
                </p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {transactions.map((t, i) => (
                    <div
                      key={i}
                      style={{
                        padding: 14,
                        background: "rgba(59,130,246,.05)",
                        borderRadius: "var(--r-md)",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "flex-start",
                      }}
                    >
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, fontSize: "1.3rem", marginBottom: 4 }}>{t.description}</div>
                        <div style={{ fontSize: "0.95rem", color: "var(--ink-3)" }}>
                          {new Date(t.createdAt).toLocaleDateString()} {new Date(t.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </div>
                        {t.reference && (
                          <div style={{ fontSize: "0.85rem", color: "var(--ink-3)", fontFamily: "monospace" }}>Ref: {t.reference}</div>
                        )}
                        <span
                          style={{
                            display: "inline-block",
                            marginTop: 6,
                            padding: "4px 8px",
                            borderRadius: "var(--r-sm)",
                            fontSize: "0.85rem",
                            fontWeight: 600,
                            background:
                              t.status === "completed"
                                ? "rgba(16,185,129,.15)"
                                : t.status === "pending"
                                  ? "rgba(251,191,36,.15)"
                                  : "rgba(239,68,68,.15)",
                            color:
                              t.status === "completed" ? "#10b981" : t.status === "pending" ? "#d97706" : "#ef4444",
                          }}
                        >
                          {t.status.charAt(0).toUpperCase() + t.status.slice(1)}
                        </span>
                      </div>
                      <div style={{ fontWeight: 700, fontSize: "1.3rem", color: t.type.includes("in") || t.type === "credit" ? "#10b981" : "#ef4444", textAlign: "right", marginLeft: 12 }}>
                        {t.type.includes("in") || t.type === "credit" ? "+" : "-"}
                        {naira(t.amount)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <Footer />
      <BottomNav />

      {/* Coming Soon Modal */}
      {showComingSoon && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 999 }}>
          <div className="card" style={{ padding: 32, textAlign: "center", maxWidth: 400, borderRadius: "var(--r-xl)" }}>
            <div style={{ fontSize: "3rem", marginBottom: 16 }}>🚀</div>
            <h2 style={{ fontSize: "1.8rem", fontWeight: 700, margin: "0 0 12px" }}>Coming Soon</h2>
            <p style={{ fontSize: "1.3rem", color: "var(--ink-2)", marginBottom: 24 }}>
              Withdrawal to bank accounts will be available soon! For now, use your wallet funds to purchase items on UMP.
            </p>
            <button
              onClick={() => setShowComingSoon(false)}
              className="btn btn-primary"
              style={{ width: "100%" }}
            >
              Got it!
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
