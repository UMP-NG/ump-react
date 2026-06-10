import Question from "../models/Question.js";
import Product from "../models/Product.js";
import { notify } from "../utils/notify.js";
import logger from "../utils/logger.js";

// GET /api/questions/:productId
export const getQuestions = async (req, res) => {
  try {
    const questions = await Question.find({ product: req.params.productId })
      .sort({ createdAt: -1 })
      .populate("asker", "name avatar")
      .populate("answers.user", "name avatar")
      .lean();
    res.json({ questions });
  } catch (err) {
    logger.error("getQuestions:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// POST /api/questions/:productId — buyer asks a question
export const askQuestion = async (req, res) => {
  try {
    const { question } = req.body;
    if (!question?.trim()) return res.status(400).json({ message: "Question text is required" });

    const product = await Product.findById(req.params.productId).select("seller name").lean();
    if (!product) return res.status(404).json({ message: "Product not found" });

    const q = await Question.create({ product: req.params.productId, asker: req.user._id, question: question.trim() });
    const populated = await Question.findById(q._id).populate("asker", "name avatar").lean();

    // Notify seller
    notify(product.seller, {
      type: "account",
      title: "New question on your product",
      message: `"${question.slice(0, 80)}" — on "${product.name}"`,
      link: `/products/${product._id}`,
    }).catch(() => {});

    res.status(201).json({ success: true, question: populated });
  } catch (err) {
    logger.error("askQuestion:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// POST /api/questions/:questionId/answer — seller or admin answers
export const answerQuestion = async (req, res) => {
  try {
    const { answer } = req.body;
    if (!answer?.trim()) return res.status(400).json({ message: "Answer text is required" });

    const q = await Question.findById(req.params.questionId).populate("product", "seller name");
    if (!q) return res.status(404).json({ message: "Question not found" });

    const sellerId = q.product?.seller?.toString();
    const isAdmin = req.user.roles?.includes("admin");
    if (!isAdmin && sellerId !== req.user._id.toString()) {
      return res.status(403).json({ message: "Only the seller can answer" });
    }

    q.answers.push({ user: req.user._id, answer: answer.trim(), createdAt: new Date() });
    await q.save();

    const populated = await Question.findById(q._id).populate("asker", "name avatar").populate("answers.user", "name avatar").lean();

    notify(q.asker, {
      type: "account",
      title: "Your question was answered",
      message: answer.slice(0, 100),
      link: `/products/${q.product._id}`,
    }).catch(() => {});

    res.json({ success: true, question: populated });
  } catch (err) {
    logger.error("answerQuestion:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// DELETE /api/questions/:questionId — asker or admin
export const deleteQuestion = async (req, res) => {
  try {
    const q = await Question.findById(req.params.questionId);
    if (!q) return res.status(404).json({ message: "Question not found" });
    if (q.asker.toString() !== req.user._id.toString() && !req.user.roles?.includes("admin")) {
      return res.status(403).json({ message: "Unauthorized" });
    }
    await q.deleteOne();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};
