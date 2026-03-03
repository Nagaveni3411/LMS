import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";

export function notFound(_req: Request, res: Response): void {
  res.status(404).json({ message: "Route not found" });
}

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof ZodError) {
    res.status(400).json({
      message: "Validation error",
      issues: err.issues.map((issue) => ({ path: issue.path.join("."), message: issue.message })),
    });
    return;
  }

  if (err instanceof Error) {
    res.status(500).json({ message: err.message });
    return;
  }

  res.status(500).json({ message: "Unexpected server error" });
}
