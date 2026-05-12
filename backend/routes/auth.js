import express from "express";
import User from "../models/User.js";

const router = express.Router();

// --- SIGN UP ---
router.post("/signup", async (req, res) => {
  try {
    const { username, email, password } = req.body;

    // Create new user
    const user = await User.create({ username, email, password });

    res.status(201).json({
      success: true,
      message: "Account created successfully!",
      user: { id: user._id, email: user.email },
    });
  } catch (error) {
    console.error(error);
    res.status(400).json({ success: false, message: error.message });
  }
});

// --- LOGIN ---
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    const isMatch = await user.comparePassword(password);
    if (!isMatch) return res.status(401).json({ success: false, message: "Invalid password" });

    res.status(200).json({ success: true, message: "Login successful!" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

export default router;
