import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Post,
  Req,
  UnauthorizedException,
  UseGuards
} from "@nestjs/common";
import type { Request } from "express";

import { AccessTokenGuard } from "./access-token.guard";
import { AuthService } from "./auth.service";
import type { AuthenticatedRequest } from "./auth.types";

type LoginBody = {
  username?: string;
  password?: string;
  deviceFingerprint?: string;
};

type RefreshBody = {
  refreshToken?: string;
  deviceFingerprint?: string;
};

type ChangePasswordBody = {
  oldPassword?: string;
  newPassword?: string;
};

@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post("login")
  async login(@Body() body: LoginBody, @Req() req: Request): Promise<{
    accessToken: string;
    refreshToken: string;
    username: string;
  }> {
    const username = (body.username ?? "").trim();
    const password = body.password ?? "";
    const deviceFingerprint = (body.deviceFingerprint ?? "unknown-device").trim();

    if (!username || !password) {
      throw new BadRequestException("用户名和密码不能为空");
    }

    const ip = req.ip || req.socket.remoteAddress || "unknown-ip";
    return this.authService.login(username, password, deviceFingerprint, ip);
  }

  @Post("refresh")
  async refresh(@Body() body: RefreshBody): Promise<{
    accessToken: string;
    refreshToken: string;
    username: string;
  }> {
    const refreshToken = (body.refreshToken ?? "").trim();
    const deviceFingerprint = (body.deviceFingerprint ?? "unknown-device").trim();
    if (!refreshToken) {
      throw new BadRequestException("refreshToken 不能为空");
    }

    return this.authService.refresh(refreshToken, deviceFingerprint);
  }

  @Post("logout")
  logout(@Body() body: RefreshBody): { ok: true } {
    const refreshToken = (body.refreshToken ?? "").trim();
    if (!refreshToken) {
      throw new BadRequestException("refreshToken 不能为空");
    }

    this.authService.logout(refreshToken);
    return { ok: true };
  }

  @Get("me")
  @UseGuards(AccessTokenGuard)
  me(@Req() req: AuthenticatedRequest): {
    id: number;
    username: string;
    role: "superadmin";
  } {
    if (!req.user?.sub) {
      throw new UnauthorizedException("用户未登录");
    }
    return this.authService.me(req.user.sub);
  }

  @Post("change-password")
  @UseGuards(AccessTokenGuard)
  async changePassword(
    @Req() req: AuthenticatedRequest,
    @Body() body: ChangePasswordBody
  ): Promise<{ ok: true }> {
    const oldPassword = body.oldPassword ?? "";
    const newPassword = body.newPassword ?? "";

    if (!oldPassword || !newPassword) {
      throw new BadRequestException("旧密码和新密码不能为空");
    }

    await this.authService.changePassword(req.user.sub, oldPassword, newPassword);
    return { ok: true };
  }
}

