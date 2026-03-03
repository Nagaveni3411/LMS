import { Router } from "express";
import bcrypt from "bcryptjs";
import { UserRole } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../prisma.js";
import { requireAuth, signAuthToken } from "../middleware/auth.js";
import { asyncHandler } from "../utils/async-handler.js";

const registerSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
  role: z.enum([UserRole.STUDENT, UserRole.INSTRUCTOR]).default(UserRole.STUDENT),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export const authRouter = Router();

authRouter.post(
  "/register",
  asyncHandler(async (req, res) => {
    const input = registerSchema.parse(req.body);
    const existing = await prisma.user.findUnique({ where: { email: input.email.toLowerCase() } });
    if (existing) {
      res.status(409).json({ message: "Email already in use" });
      return;
    }

    const passwordHash = await bcrypt.hash(input.password, 12);
    const user = await prisma.user.create({
      data: {
        name: input.name,
        email: input.email.toLowerCase(),
        passwordHash,
        role: input.role,
      },
      select: { id: true, name: true, email: true, role: true },
    });

    const token = signAuthToken({ sub: user.id, role: user.role });
    res.status(201).json({ token, user });
  }),
);

authRouter.post(
  "/login",
  asyncHandler(async (req, res) => {
    const input = loginSchema.parse(req.body);
    const user = await prisma.user.findUnique({ where: { email: input.email.toLowerCase() } });
    if (!user) {
      res.status(401).json({ message: "Invalid credentials" });
      return;
    }

    const isMatch = await bcrypt.compare(input.password, user.passwordHash);
    if (!isMatch) {
      res.status(401).json({ message: "Invalid credentials" });
      return;
    }

    const token = signAuthToken({ sub: user.id, role: user.role });
    res.json({
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    });
  }),
);

authRouter.get(
  "/me",
  requireAuth,
  asyncHandler(async (req, res) => {
    const userId = req.auth!.userId;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true, role: true },
    });
    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }
    res.json({ user });
  }),
);
