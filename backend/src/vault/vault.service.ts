import {
  BadRequestException,
  ConflictException,
  Injectable
} from "@nestjs/common";

import { DatabaseService } from "../database/database.service";
import { isoNow } from "../utils/crypto.util";

interface VaultRow {
  envelope_json: string;
  revision: number;
  content_hash: string;
  updated_at: string;
}

interface SaveVaultInput {
  envelope: Record<string, unknown>;
  expectedRevision: number;
  contentHash: string;
}

@Injectable()
export class VaultService {
  constructor(private readonly databaseService: DatabaseService) {}

  getVault(): {
    hasVault: boolean;
    envelope: Record<string, unknown> | null;
    revision: number;
    contentHash: string | null;
    updatedAt: string | null;
  } {
    const row = this.getVaultRow();
    if (!row) {
      return {
        hasVault: false,
        envelope: null,
        revision: 0,
        contentHash: null,
        updatedAt: null
      };
    }

    return {
      hasVault: true,
      envelope: JSON.parse(row.envelope_json) as Record<string, unknown>,
      revision: row.revision,
      contentHash: row.content_hash,
      updatedAt: row.updated_at
    };
  }

  saveVault(input: SaveVaultInput): {
    revision: number;
    contentHash: string;
    updatedAt: string;
  } {
    this.validateEnvelope(input.envelope);
    if (!Number.isInteger(input.expectedRevision) || input.expectedRevision < 0) {
      throw new BadRequestException("expectedRevision 不合法");
    }
    if (!input.contentHash || typeof input.contentHash !== "string") {
      throw new BadRequestException("contentHash 不合法");
    }

    const db = this.databaseService.connection;
    const current = this.getVaultRow();
    if (!current && input.expectedRevision !== 0) {
      throw new ConflictException({
        message: "版本冲突",
        currentRevision: 0
      });
    }
    if (current && input.expectedRevision !== current.revision) {
      throw new ConflictException({
        message: "版本冲突",
        currentRevision: current.revision
      });
    }

    const nextRevision = (current?.revision ?? 0) + 1;
    const now = isoNow();

    db.prepare(
      `
      INSERT INTO vault_state (id, envelope_json, revision, content_hash, updated_at)
      VALUES (1, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        envelope_json = excluded.envelope_json,
        revision = excluded.revision,
        content_hash = excluded.content_hash,
        updated_at = excluded.updated_at
    `
    ).run(JSON.stringify(input.envelope), nextRevision, input.contentHash, now);

    return {
      revision: nextRevision,
      contentHash: input.contentHash,
      updatedAt: now
    };
  }

  private getVaultRow(): VaultRow | undefined {
    return this.databaseService.connection
      .prepare(
        `
        SELECT envelope_json, revision, content_hash, updated_at
        FROM vault_state
        WHERE id = 1
      `
      )
      .get() as VaultRow | undefined;
  }

  private validateEnvelope(envelope: Record<string, unknown>): void {
    if (!envelope || typeof envelope !== "object") {
      throw new BadRequestException("envelope 不能为空");
    }

    const requiredStringFields = ["ciphertext", "contentHash"] as const;
    for (const field of requiredStringFields) {
      if (typeof envelope[field] !== "string") {
        throw new BadRequestException(`envelope.${field} 必须是字符串`);
      }
    }

    if (typeof envelope.version !== "number") {
      throw new BadRequestException("envelope.version 必须是数字");
    }
  }
}

