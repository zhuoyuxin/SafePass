import type { Request } from "express";

export interface JwtPayload {
  sub: number;
  role: "superadmin";
  username: string;
}

export interface AuthenticatedRequest extends Request {
  user: JwtPayload;
}

