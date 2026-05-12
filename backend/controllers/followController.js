import Follow from "../models/Follow.js";
import User from "../models/User.js";

// ✅ Follow a user
export const followUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const followerId = req.user._id;

    if (followerId.toString() === userId)
      return res.status(400).json({ message: "You cannot follow yourself" });

    const userToFollow = await User.findById(userId);
    if (!userToFollow)
      return res.status(404).json({ message: "User not found" });

    // Prevent duplicate follow
    const existingFollow = await Follow.findOne({
      follower: followerId,
      following: userId,
    });

    if (existingFollow)
      return res.status(400).json({ message: "Already following this user" });

    const follow = await Follow.create({
      follower: followerId,
      following: userId,
    });

    res.status(201).json({ success: true, follow });
  } catch (error) {
    console.error("Error following user:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// ✅ Unfollow a user
export const unfollowUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const followerId = req.user._id;

    const follow = await Follow.findOneAndDelete({
      follower: followerId,
      following: userId,
    });

    if (!follow)
      return res.status(400).json({ message: "You are not following this user" });

    res.json({ success: true, message: "Unfollowed successfully" });
  } catch (error) {
    console.error("Error unfollowing user:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// ✅ Get all followers of a user
export const getFollowers = async (req, res) => {
  try {
    const { userId } = req.params;
    const followers = await Follow.find({ following: userId }).populate(
      "follower",
      "email role"
    );

    res.json({ count: followers.length, followers });
  } catch (error) {
    console.error("Error fetching followers:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// ✅ Get all users someone is following
export const getFollowing = async (req, res) => {
  try {
    const { userId } = req.params;
    const following = await Follow.find({ follower: userId }).populate(
      "following",
      "email role"
    );

    res.json({ count: following.length, following });
  } catch (error) {
    console.error("Error fetching following list:", error);
    res.status(500).json({ message: "Server error" });
  }
};
