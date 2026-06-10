import mongoose from "mongoose";

const questionSchema = new mongoose.Schema(
  {
    product:  { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
    asker:    { type: mongoose.Schema.Types.ObjectId, ref: "User",    required: true },
    question: { type: String, required: true, trim: true, maxlength: 500 },
    answers: [{
      user:      { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
      answer:    { type: String, required: true, trim: true, maxlength: 1000 },
      createdAt: { type: Date, default: Date.now },
    }],
  },
  { timestamps: true }
);

questionSchema.index({ product: 1, createdAt: -1 });

export default mongoose.model("Question", questionSchema);
