import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const adminSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
    },
    avatar: {
      url: { type: String, default: "/images/admin-default.png" },
      publicId: { type: String, default: "" },
    },
    role: { type: String, default: "admin" },
    isActive: { type: Boolean, default: true },
    permissions: {
      canManageUsers: { type: Boolean, default: true },
      canManageProducts: { type: Boolean, default: true },
      canManageSellers: { type: Boolean, default: true },
      canManageListings: { type: Boolean, default: true },
      canManageServices: { type: Boolean, default: true },
      canViewReports: { type: Boolean, default: true },
      canManageOrders: { type: Boolean, default: true },
    },
    resetPasswordToken: String,
    resetPasswordExpire: Date,
  },
  { timestamps: true }
);

export default mongoose.model("Admin", adminSchema);
