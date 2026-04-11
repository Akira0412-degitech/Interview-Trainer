import { Router } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { prisma } from "../lib/prisma.js";

const router = Router();



router.post("/signup", async (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password)
    return res.status(400).json({ error: "name, email, password are required" });

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing)
    return res.status(409).json({ error: "Email already in use" });

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: { name, email, passwordHash },
  });

  const token = jwt.sign(
    { userId: user.id },
    process.env.JWT_SECRET || "dev-secret",
    { expiresIn: "7d" }
  );

  res.status(201).json({ token, user: { id: user.id, name: user.name, email: user.email } });
});

router.post("/signin", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password)
    return res.status(400).json({ error: "email and password are required" });

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user)
    return res.status(401).json({ error: "Invalid email or password" });

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid)
    return res.status(401).json({ error: "Invalid email or password" });

  const token = jwt.sign(
    { userId: user.id },
    process.env.JWT_SECRET || "dev-secret",
    { expiresIn: "7d" }
  );
  
  res.cookie("token", token, { httpOnly: true, secure: false });
  res.json({ user: { id: user.id, name: user.name, email: user.email } });
});

export default router;
