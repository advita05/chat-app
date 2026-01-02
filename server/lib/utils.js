import jwt from "jsonwebtoken";

export const generateToken = (userId) => {  // ← Add userId parameter here
  const token = jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: "7d"  // Optional: add expiration
  });
  return token;
};