import type { NextFunction, Request, Response } from "express";
import type { UserRole } from "@prisma/client";
import jwt from "jsonwebtoken";
import { config } from "../config.js";

type AuthTokenPayload = {
  sub: string;
  role: UserRole;
};

export function signAuthToken(payload: AuthTokenPayload): string {
  return jwt.sign(payload, config.jwtSecret, { expiresIn: "7d" });
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : undefined;

  if (!token) {
    res.status(401).json({ message: "Missing access token" });
    return;
  }

  try {
    const decoded = jwt.verify(token, config.jwtSecret) as AuthTokenPayload;
    req.auth = { userId: decoded.sub, role: decoded.role };
    next();
  } catch {
    res.status(401).json({ message: "Invalid or expired token" });
  }
}

export function requireRole(roles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.auth) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }
    if (!roles.includes(req.auth.role)) {
      res.status(403).json({ message: "Forbidden" });
      return;
    }
    next();
  };
}
