import { Module } from "@nestjs/common";

import { AuthController } from "./auth/auth.controller";
import { AccessTokenGuard } from "./auth/access-token.guard";
import { AuthService } from "./auth/auth.service";
import { DatabaseService } from "./database/database.service";
import { HealthController } from "./health/health.controller";
import { SyncController } from "./sync/sync.controller";
import { SyncService } from "./sync/sync.service";
import { VaultController } from "./vault/vault.controller";
import { VaultService } from "./vault/vault.service";

@Module({
  imports: [],
  controllers: [HealthController, AuthController, VaultController, SyncController],
  providers: [
    DatabaseService,
    AuthService,
    VaultService,
    SyncService,
    AccessTokenGuard
  ]
})
export class AppModule {}

