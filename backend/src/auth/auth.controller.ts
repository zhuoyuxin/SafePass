import {
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
import {
  ChangePasswordBodyDto,
  LoginBodyDto,
  RefreshBodyDto
} from "./dto/auth.dto";
import { AuthService } from "./auth.service";
import type { AuthenticatedRequest } from "./auth.types";

@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post("login")
  async login(@Body() body: LoginBodyDto, @Req() req: Request): Promise<{
    accessToken: string;
    refreshToken: string;
    username: string;
  }> {
    const deviceFingerprint = body.deviceFingerprint || "unknown-device";
    const ip = req.ip || req.socket.remoteAddress || "unknown-ip";
    return this.authService.login(body.username, body.password, deviceFingerprint, ip);
  }

  @Post("refresh")
  async refresh(@Body() body: RefreshBodyDto): Promise<{
    accessToken: string;
    refreshToken: string;
    username: string;
  }> {
    const deviceFingerprint = body.deviceFingerprint || "unknown-device";
    return this.authService.refresh(body.refreshToken, deviceFingerprint);
  }

  @Post("logout")
  logout(@Body() body: RefreshBodyDto): { ok: true } {
    this.authService.logout(body.refreshToken);
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
    @Body() body: ChangePasswordBodyDto
  ): Promise<{ ok: true }> {
    await this.authService.changePassword(req.user.sub, body.oldPassword, body.newPassword);
    return { ok: true };
  }
}