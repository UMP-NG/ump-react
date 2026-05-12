export default function requireRole(...allowedRoles) {
  return (req, res, next) => {
    try {
      // Make sure user is attached from protect middleware
      if (!req.user) {
        return res.status(401).json({ message: "Unauthorized: No user found" });
      }

      const userRoles = req.user.roles || [];

      // Check if the user has at least one allowed role
      const hasRole = allowedRoles.some((role) => userRoles.includes(role));

      if (!hasRole) {
        return res
          .status(403)
          .json({ message: "Access denied: insufficient role" });
      }

      // User is authorized
      next();
    } catch (error) {
      console.error("Role check failed:", error);
      res.status(500).json({ message: "Server error in role check" });
    }
  };
}
