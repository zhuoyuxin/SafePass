import { BadRequestException, Body, Controller, Post, UseGuards } from "@nestjs/common";

import { AccessTokenGuard } from "../auth/access-token.guard";
import { SyncService } from "./sync.service";

type WebDavConfig = {
  url?: string;
  username?: string;
  password?: string;
  basePath?: string;
};

type PushBody = {
  config?: WebDavConfig;
  envelope?: Record<string, unknown>;
  revision?: number;
  contentHash?: string;
};

@Controller("sync/webdav")
@UseGuards(AccessTokenGuard)
export class SyncController {
  constructor(private readonly syncService: SyncService) {}

  @Post("test")
  test(@Body() body: { config?: WebDavConfig }): Promise<{ ok: true }> {
    return this.syncService.testConnection(this.assertConfig(body.config));
  }

  @Post("pull")
  pull(@Body() body: { config?: WebDavConfig }): Promise<{
    found: boolean;
    envelope: Record<string, unknown> | null;
    meta: { revision: number; contentHash: string; updatedAt: string } | null;
  }> {
    return this.syncService.pull(this.assertConfig(body.config));
  }

  @Post("push")
  push(@Body() body: PushBody): Promise<{
    ok: true;
    meta: { revision: number; contentHash: string; updatedAt: string };
  }> {
    if (!body.envelope) {
      throw new BadRequestException("envelope 不能为空");
    }

    return this.syncService.push(this.assertConfig(body.config), {
      envelope: body.envelope,
      revision: body.revision ?? -1,
      contentHash: body.contentHash ?? ""
    });
  }

  private assertConfig(config?: WebDavConfig): {
    url: string;
    username: string;
    password: string;
    basePath?: string;
  } {
    if (!config) {
      throw new BadRequestException("config 不能为空");
    }
    if (!config.url || !config.username || !config.password) {
      throw new BadRequestException("WebDAV 配置不完整");
    }

    return {
      url: config.url,
      username: config.username,
      password: config.password,
      basePath: config.basePath
    };
  }
}

