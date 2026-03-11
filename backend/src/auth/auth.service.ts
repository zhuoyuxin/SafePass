import {
  BadRequestException,
  HttpException,
  Injectable,
  UnauthorizedException
} from "@nestjs/common";
import jwt from "jsonwebtoken";

import { appConfig } from "../config/app-config";
import { DatabaseService } from "../database/database.service";
import {
  Argon2Params,
  deriveArgon2idBase64
} from "../utils/argon2.util";
import {
  isoNow,
  randomBase64,
  randomBase64Url,
  safeEqualBase64,
  sha256Base64
} from "../utils/crypto.util";
import type { JwtPayload } from "./auth.types";

interface AdminUserRow {
  id: number;
  username: string;
  password_salt: string;
  password_hash: string;
  hash_memory: number;
  hash_iterations: number;
  hash_parallelism: number;
  hash_length: number;
}

interface SessionRow {
  id: string;
  refresh_hash: string;
  device_fingerprint: string;
  expires_at: string;
  revoked_at: string | null;
}

interface LoginAttemptState {
  count: number;
  windowStart: number;
  blockedUntil: number;
}

@Injectable()
export class AuthService {
  private readonly attempts = new Map<string, LoginAttemptState>();

  constructor(private readonly databaseService: DatabaseService) {}

  async login(
    username: string,
    password: string,
    deviceFingerprint: string,
    requestIp: string
  ): Promise<{ accessToken: string; refreshToken: string; username: string }> {
    const key = `${username}|${requestIp}`;
    this.ensureNotBlocked(key);

    const admin = this.getAdmin();
    if (!admin || admin.username !== username) {
      this.recordFailure(key);
      throw new UnauthorizedException("用户名或密码错误");
    }

    const params: Argon2Params = {
      memorySize: admin.hash_memory,
      iterations: admin.hash_iterations,
      parallelism: admin.hash_parallelism,
      hashLength: admin.hash_length
    };
    const derived = await deriveArgon2idBase64(
      password,
      admin.password_salt,
      params
    );

    if (!safeEqualBase64(derived, admin.password_hash)) {
      this.recordFailure(key);
      throw new UnauthorizedException("用户名或密码错误");
    }

    this.attempts.delete(key);
    return this.issueSessionTokens(admin, deviceFingerprint);
  }

  async refresh(
    refreshToken: string,
    deviceFingerprint: string
  ): Promise<{ accessToken: string; refreshToken: string; username: string }> {
    const refreshHash = sha256Base64(refreshToken);
    const db = this.databaseService.connection;
    const session = db
      .prepare(
        `
        SELECT id, refresh_hash, device_fingerprint, expires_at, revoked_at
        FROM sessions
        WHERE refresh_hash = ?
      `
      )
      .get(refreshHash) as SessionRow | undefined;

    if (!session || session.revoked_at) {
      throw new UnauthorizedException("刷新令牌无效");
    }

    if (new Date(session.expires_at).getTime() <= Date.now()) {
      db.prepare("UPDATE sessions SET revoked_at = ? WHERE id = ?").run(
        isoNow(),
        session.id
      );
      throw new UnauthorizedException("刷新令牌已过期");
    }

    if (
      session.device_fingerprint &&
      session.device_fingerprint !== deviceFingerprint
    ) {
      throw new UnauthorizedException("设备指纹不匹配");
    }

    const admin = this.getAdmin();
    if (!admin) {
      throw new UnauthorizedException("管理员账号不存在");
    }

    const nextRefreshToken = randomBase64Url(48);
    const nextRefreshHash = sha256Base64(nextRefreshToken);
    const expiresAt = this.futureIso(appConfig.refreshTokenTtlDays * 24 * 3600);

    db.prepare(
      `
      UPDATE sessions
      SET refresh_hash = ?, expires_at = ?, revoked_at = NULL
      WHERE id = ?
    `
    ).run(nextRefreshHash, expiresAt, session.id);

    return {
      accessToken: this.signAccessToken(admin),
      refreshToken: nextRefreshToken,
      username: admin.username
    };
  }

  logout(refreshToken: string): void {
    const refreshHash = sha256Base64(refreshToken);
    this.databaseService.connection
      .prepare("UPDATE sessions SET revoked_at = ? WHERE refresh_hash = ?")
      .run(isoNow(), refreshHash);
  }

  async changePassword(
    userId: number,
    oldPassword: string,
    newPassword: string
  ): Promise<void> {
    if (userId !== 1) {
      throw new UnauthorizedException("无权限修改密码");
    }

    this.assertPasswordStrength(newPassword);

    const admin = this.getAdmin();
    if (!admin) {
      throw new UnauthorizedException("管理员账号不存在");
    }

    const oldDerived = await deriveArgon2idBase64(oldPassword, admin.password_salt, {
      memorySize: admin.hash_memory,
      iterations: admin.hash_iterations,
      parallelism: admin.hash_parallelism,
      hashLength: admin.hash_length
    });

    if (!safeEqualBase64(oldDerived, admin.password_hash)) {
      throw new UnauthorizedException("旧密码错误");
    }

    const newSalt = randomBase64(16);
    const nextParams: Argon2Params = {
      memorySize: 19 * 1024,
      iterations: 2,
      parallelism: 1,
      hashLength: 32
    };
    const nextHash = await deriveArgon2idBase64(newPassword, newSalt, nextParams);
    const now = isoNow();

    const db = this.databaseService.connection;
    db.prepare(
      `
      UPDATE admin_users
      SET password_salt = ?, password_hash = ?,
          hash_memory = ?, hash_iterations = ?, hash_parallelism = ?, hash_length = ?,
          updated_at = ?
      WHERE id = 1
    `
    ).run(
      newSalt,
      nextHash,
      nextParams.memorySize,
      nextParams.iterations,
      nextParams.parallelism,
      nextParams.hashLength,
      now
    );

    // 改密后吊销所有 refresh 会话，避免旧会话继续长期可用。
    db.prepare("UPDATE sessions SET revoked_at = ? WHERE revoked_at IS NULL").run(now);
  }

  me(userId: number): { id: number; username: string; role: "superadmin" } {
    if (userId !== 1) {
      throw new UnauthorizedException("无效用户");
    }

    const admin = this.getAdmin();
    if (!admin) {
      throw new UnauthorizedException("管理员账号不存在");
    }

    return { id: admin.id, username: admin.username, role: "superadmin" };
  }

  private issueSessionTokens(
    admin: AdminUserRow,
    deviceFingerprint: string
  ): { accessToken: string; refreshToken: string; username: string } {
    const refreshToken = randomBase64Url(48);
    const refreshHash = sha256Base64(refreshToken);
    const sessionId = randomBase64Url(18);
    const now = isoNow();
    const expiresAt = this.futureIso(appConfig.refreshTokenTtlDays * 24 * 3600);

    this.databaseService.connection
      .prepare(
        `
        INSERT INTO sessions (
          id, refresh_hash, device_fingerprint, created_at, expires_at, revoked_at
        )
        VALUES (?, ?, ?, ?, ?, NULL)
      `
      )
      .run(sessionId, refreshHash, deviceFingerprint, now, expiresAt);

    return {
      accessToken: this.signAccessToken(admin),
      refreshToken,
      username: admin.username
    };
  }

  private signAccessToken(admin: AdminUserRow): string {
    const payload: JwtPayload = {
      sub: admin.id,
      role: "superadmin",
      username: admin.username
    };

    return jwt.sign(payload, appConfig.jwtAccessSecret, {
      expiresIn: appConfig.accessTokenTtlSeconds
    });
  }

  private getAdmin(): AdminUserRow | undefined {
    return this.databaseService.connection
      .prepare(
        `
        SELECT
          id, username, password_salt, password_hash,
          hash_memory, hash_iterations, hash_parallelism, hash_length
        FROM admin_users
        WHERE id = 1
      `
      )
      .get() as AdminUserRow | undefined;
  }

  private ensureNotBlocked(key: string): void {
    const current = this.attempts.get(key);
    if (!current) {
      return;
    }

    if (current.blockedUntil > Date.now()) {
      throw new HttpException("登录尝试过多，请稍后再试", 429);
    }

    if (Date.now() - current.windowStart > appConfig.loginWindowMs) {
      this.attempts.delete(key);
    }
  }

  private recordFailure(key: string): void {
    const now = Date.now();
    const current = this.attempts.get(key);
    if (!current || now - current.windowStart > appConfig.loginWindowMs) {
      this.attempts.set(key, {
        count: 1,
        windowStart: now,
        blockedUntil: 0
      });
      return;
    }

    current.count += 1;
    if (current.count >= appConfig.loginMaxFailures) {
      current.blockedUntil = now + appConfig.loginBlockMs;
      current.count = 0;
      current.windowStart = now;
    }
    this.attempts.set(key, current);
  }

  private futureIso(seconds: number): string {
    return new Date(Date.now() + seconds * 1000).toISOString();
  }

  private assertPasswordStrength(value: string): void {
    if (typeof value !== "string" || value.length < 10) {
      throw new BadRequestException("新密码至少需要 10 位");
    }
  }
}
