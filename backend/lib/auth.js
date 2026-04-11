import jwt from "jsonwebtoken";


export const authMiddleware = (req, res, next) => {
    const cookie = req.cookies;
    const token = cookie.token;
  if (!token) return res.status(401).json({ error: "Unauthorized" });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "dev-secret");
    req.user = { userId: decoded.userId };
    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid token" });
  }
};