import mongoose from "mongoose";

const cartItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Product",
    required: true,
  },
  quantity: {
    type: Number,
    required: true,
    min: 1,
    default: 1,
  },
  price: {
    type: Number,
    required: true,
  },
  negotiatedPrice: { type: Number },
  negotiationId: { type: mongoose.Schema.Types.ObjectId },
});

const cartSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    items: [cartItemSchema],
    total: {
      type: Number,
      default: 0,
    },
    wishlist: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Product",
      },
    ],
  },
  { timestamps: true }
);

cartSchema.pre("save", function (next) {
  this.total = this.items.reduce(
    (sum, item) => sum + (item.negotiatedPrice ?? item.price) * item.quantity,
    0
  );
  next();
});

export default mongoose.model("Cart", cartSchema);

