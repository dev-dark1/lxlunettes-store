import { getAuth } from "@clerk/express";
import type { Request, Response, NextFunction } from "express";

export function requireClerkAuth(req: Request, res: Response, next: NextFunction): void {
  const auth = getAuth(req);
  const userId = auth?.userId;
  if (!userId) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }
  (req as any).clerkUserId = userId;
  next();
}

export function optionalClerkAuth(req: Request, _res: Response, next: NextFunction): void {
  const auth = getAuth(req);
  (req as any).clerkUserId = auth?.userId ?? null;
  next();
}
