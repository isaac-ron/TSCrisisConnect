import express from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { rateLimit } from "express-rate-limit";
import { prisma } from "../db.js";
import { JWT_SECRET } from "../config.js";
import { authenticate, authorize } from "../middleware/authMiddleware.js";

const router = express.Router();

// Slow down credential stuffing / brute force against the login and register endpoints
const credentialLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { error: "Too many attempts. Please try again later." },
});

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

// Public self-registration always creates a community user. Elevated roles are
// never taken from the request body.
router.post("/register", credentialLimiter, async (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  try {
    const hashed = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashed,
        role: "user",
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

// Responder accounts are provisioned by an admin, not self-registered.
router.post("/responders", authenticate, authorize("admin"), async (req, res) => {
  const { name, email, password, badgeId } = req.body;

  if (!name || !password || !badgeId) {
    return res.status(400).json({ error: "Name, password, and badge ID are required" });
  }

  const normalizedBadge = badgeId.trim().toUpperCase();

  try {
    const hashed = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        name,
        email: email || `${normalizedBadge.toLowerCase()}@responder.local`,
        password: hashed,
        role: "first-responder",
        badgeId: normalizedBadge,
      },
    });

    return res.status(201).json({ user: sanitizeUser(user) });
  } catch (error) {
    if (error?.code === "P2002") {
      return res.status(400).json({ error: "A user with this badge ID or email already exists" });
    }
    return res.status(500).json({ error: "Failed to create responder" });
  }
});

router.post("/login", credentialLimiter, async (req, res) => {
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

router.post("/responder-login", credentialLimiter, async (req, res) => {
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

router.get("/me", authenticate, (req, res) => {
  return res.json({ user: req.user });
});

export default router;
