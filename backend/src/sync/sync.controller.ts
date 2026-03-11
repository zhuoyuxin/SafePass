import { Body, Controller, Post, UseGuards } from "@nestjs/common";

import { AccessTokenGuard } from "../auth/access-token.guard";
import {
  WebDavConfigRequestDto,
  WebDavPushBodyDto
} from "./dto/webdav.dto";
import { SyncService } from "./sync.service";

@Controller("sync/webdav")
@UseGuards(AccessTokenGuard)
export class SyncController {
  constructor(private readonly syncService: SyncService) {}

  @Post("test")
  test(@Body() body: WebDavConfigRequestDto): Promise<{ ok: true }> {
    return this.syncService.testConnection(body.config);
  }

  @Post("pull")
  pull(@Body() body: WebDavConfigRequestDto): Promise<{
    found: boolean;
    envelope: Record<string, unknown> | null;
    meta: { revision: number; contentHash: string; updatedAt: string } | null;
  }> {
    return this.syncService.pull(body.config);
  }

  @Post("push")
  push(@Body() body: WebDavPushBodyDto): Promise<{
    ok: true;
    meta: { revision: number; contentHash: string; updatedAt: string };
  }> {
    return this.syncService.push(body.config, {
      envelope: body.envelope,
      revision: body.revision,
      contentHash: body.contentHash
    });
  }
}