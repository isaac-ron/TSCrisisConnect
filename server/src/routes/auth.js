import express from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { PrismaClient } from "@prisma/client";

const router = express.Router();
const prisma = new PrismaClient();

const JWT_SECRET = process.env.JWT_SECRET || "development-secret-key-change-me";

const sanitizeUser = (user) => ({
  id: user.id,
  name: user.name,
  email: user.email,
  role: user.role,
  badgeId: user.badgeId,
});

const signToken = (user) =>
  jwt.sign({ userId: user.id, role: user.role }, JWT_SECRET, {
    expiresIn: "1d",
  });

router.post("/register", async (req, res) => {
  const { name, email, password, role = "user", badgeId } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  const normalizedBadge = badgeId ? badgeId.trim().toUpperCase() : null;

  if (role === "first-responder" && !normalizedBadge) {
    return res.status(400).json({ error: "Badge ID is required for first responders" });
  }

  try {
    const hashed = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashed,
        role,
        badgeId: normalizedBadge,
      },
    });

    const token = signToken(user);
    return res.status(201).json({ token, user: sanitizeUser(user) });
  } catch (error) {
    if (error?.code === "P2002") {
      return res.status(400).json({ error: "User already exists" });
    }
    return res.status(500).json({ error: "Failed to create user" });
  }
});

router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required" });
  }

  const user = await prisma.user.findUnique({ where: { email } });

  if (!user) {
    return res.status(400).json({ error: "Invalid credentials" });
  }

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) {
    return res.status(400).json({ error: "Invalid credentials" });
  }

  const token = signToken(user);
  return res.json({ token, user: sanitizeUser(user) });
});

router.post("/responder-login", async (req, res) => {
  const { badgeId, password } = req.body;

  if (!badgeId || !password) {
    return res.status(400).json({ error: "Badge ID and password are required" });
  }

  const normalizedBadge = badgeId.trim().toUpperCase();

  const user = await prisma.user.findUnique({
    where: { badgeId: normalizedBadge },
  });

  if (!user || user.role !== "first-responder") {
    return res.status(400).json({ error: "Invalid credentials" });
  }

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) {
    return res.status(400).json({ error: "Invalid credentials" });
  }

  const token = signToken(user);
  return res.json({ token, user: sanitizeUser(user) });
});

router.get("/me", async (req, res) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Authorization header missing" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await prisma.user.findUnique({ where: { id: decoded.userId } });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    return res.json({ user: sanitizeUser(user) });
  } catch (error) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
});

export default router;