import mongoose from "mongoose";

// One document per browser subscription.
// A single user can have multiple subscriptions (phone + laptop etc.).
const pushSubSchema = new mongoose.Schema(
  {
    user:         { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    endpoint:     { type: String, required: true, unique: true },
    keys:         { p256dh: String, auth: String },
    // Mirror of User.roles so we can filter by audience without joining
    roles:        [{ type: String }],
    // Origin the subscription was created from (e.g. https://myump.com.ng)
    // Used in production to exclude stale localhost subscriptions
    origin:       { type: String },
  },
  { timestamps: true }
);

pushSubSchema.index({ user: 1 });
pushSubSchema.index({ roles: 1 });

export default mongoose.model("PushSub", pushSubSchema);
