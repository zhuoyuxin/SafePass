import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException
} from "@nestjs/common";
import jwt from "jsonwebtoken";

import { appConfig } from "../config/app-config";
import type { AuthenticatedRequest, JwtPayload } from "./auth.types";

@Injectable()
export class AccessTokenGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw new UnauthorizedException("缺少访问令牌");
    }

    const token = authHeader.slice(7).trim();
    if (!token) {
      throw new UnauthorizedException("访问令牌为空");
    }

    try {
      const parsed = jwt.verify(token, appConfig.jwtAccessSecret);
      if (!parsed || typeof parsed === "string") {
        throw new UnauthorizedException("访问令牌无效");
      }

      const payload = parsed as unknown as JwtPayload;
      if (!payload.sub || payload.role !== "superadmin") {
        throw new UnauthorizedException("访问令牌无效");
      }

      request.user = payload;
      return true;
    } catch {
      throw new UnauthorizedException("访问令牌无效或已过期");
    }
  }
}
