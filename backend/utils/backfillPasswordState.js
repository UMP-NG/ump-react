import User from "../models/User.js";
import logger from "./logger.js";

// One-time (but safe to run every boot) backfill for the passwordManuallySet
// flag added to gate the one-time setPassword flow. Only NEW users get the
// flag set correctly by signup/resetPassword/setPassword going forward —
// accounts created before this field existed all default to `false`, which
// would incorrectly let an existing non-Google user (who already has a real,
// self-chosen password) call setPassword and reset it without knowing their
// current one. Google-signup accounts are deliberately left at the default:
// we can't tell from existing data whether they've already run the old,
// unrestricted setPassword, and leaving them eligible for the one-time flow
// is the correct behaviour for anyone who genuinely hasn't set a password yet.
// Idempotent — after the first successful run the filter matches nothing.
export async function backfillPasswordManuallySet() {
  const result = await User.updateMany(
    { googleAccount: { $ne: true }, passwordManuallySet: { $ne: true } },
    { $set: { passwordManuallySet: true } }
  );
  if (result.modifiedCount > 0) {
    logger.info(`[backfill] Marked ${result.modifiedCount} existing account(s) as passwordManuallySet.`);
  }
  return result.modifiedCount;
}
