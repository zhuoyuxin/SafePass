import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Put,
  UseGuards
} from "@nestjs/common";

import { AccessTokenGuard } from "../auth/access-token.guard";
import { VaultService } from "./vault.service";

type SaveVaultBody = {
  envelope?: Record<string, unknown>;
  expectedRevision: number;
  contentHash?: string;
};

@Controller("vault")
@UseGuards(AccessTokenGuard)
export class VaultController {
  constructor(private readonly vaultService: VaultService) {}

  @Get()
  getVault(): {
    hasVault: boolean;
    envelope: Record<string, unknown> | null;
    revision: number;
    contentHash: string | null;
    updatedAt: string | null;
  } {
    return this.vaultService.getVault();
  }

  @Put()
  saveVault(@Body() body: SaveVaultBody): {
    revision: number;
    contentHash: string;
    updatedAt: string;
  } {
    if (!body.envelope) {
      throw new BadRequestException("envelope 不能为空");
    }
    if (!Number.isInteger(body.expectedRevision) || body.expectedRevision < 0) {
      throw new BadRequestException("expectedRevision 不合法");
    }

    return this.vaultService.saveVault({
      envelope: body.envelope,
      expectedRevision: body.expectedRevision,
      contentHash: body.contentHash ?? ""
    });
  }
}
