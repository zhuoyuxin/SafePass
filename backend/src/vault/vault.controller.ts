import { Body, Controller, Get, Put, UseGuards } from "@nestjs/common";

import { AccessTokenGuard } from "../auth/access-token.guard";
import { SaveVaultBodyDto } from "./dto/save-vault.dto";
import { VaultService } from "./vault.service";

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
  saveVault(@Body() body: SaveVaultBodyDto): {
    revision: number;
    contentHash: string;
    updatedAt: string;
  } {
    return this.vaultService.saveVault({
      envelope: body.envelope,
      expectedRevision: body.expectedRevision,
      contentHash: body.contentHash
    });
  }
}