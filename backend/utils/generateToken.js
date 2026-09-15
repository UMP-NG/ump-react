// utils/generateToken.js
import jwt from "jsonwebtoken";

const generateToken = (id, tokenVersion = 0) => {
  const token = jwt.sign({ id, v: tokenVersion }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  });

  return token;
};

export default generateToken;

