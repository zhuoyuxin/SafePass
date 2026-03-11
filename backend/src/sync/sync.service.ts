import { BadRequestException, Injectable } from "@nestjs/common";
import type { FileStat, WebDAVClient } from "webdav";
import { createClient } from "webdav";

import { appConfig } from "../config/app-config";
import { DatabaseService } from "../database/database.service";
import { isoNow } from "../utils/crypto.util";

interface WebDavConfig {
  url: string;
  username: string;
  password: string;
  basePath?: string;
}

interface WebDavMeta {
  revision: number;
  contentHash: string;
  updatedAt: string;
}

@Injectable()
export class SyncService {
  constructor(private readonly databaseService: DatabaseService) {}

  async testConnection(config: WebDavConfig): Promise<{ ok: true }> {
    const normalized = this.normalizeConfig(config);
    const client = this.createClient(normalized);
    const paths = this.resolvePaths(normalized.basePath);

    try {
      const exists = await client.exists(paths.basePath);
      if (!exists) {
        await client.createDirectory(paths.basePath, { recursive: true });
      }

      this.appendLog("test", "success", "webdav 连接测试成功");
      return { ok: true };
    } catch (error) {
      const message = this.sanitizeError(error);
      this.appendLog("test", "error", message);
      throw new BadRequestException(`WebDAV 连接失败: ${message}`);
    }
  }

  async pull(config: WebDavConfig): Promise<{
    found: boolean;
    envelope: Record<string, unknown> | null;
    meta: WebDavMeta | null;
  }> {
    const normalized = this.normalizeConfig(config);
    const client = this.createClient(normalized);
    const paths = this.resolvePaths(normalized.basePath);

    try {
      const exists = await client.exists(paths.vaultFile);
      if (!exists) {
        this.appendLog("pull", "success", "远端不存在 vault 文件");
        return { found: false, envelope: null, meta: null };
      }

      const envelopeText = (await client.getFileContents(paths.vaultFile, {
        format: "text"
      })) as string;
      const envelope = JSON.parse(envelopeText) as Record<string, unknown>;

      let meta: WebDavMeta | null = null;
      if (await client.exists(paths.metaFile)) {
        const metaText = (await client.getFileContents(paths.metaFile, {
          format: "text"
        })) as string;
        meta = JSON.parse(metaText) as WebDavMeta;
      }

      this.appendLog("pull", "success", "已从远端拉取 vault");
      return { found: true, envelope, meta };
    } catch (error) {
      const message = this.sanitizeError(error);
      this.appendLog("pull", "error", message);
      throw new BadRequestException(`WebDAV 拉取失败: ${message}`);
    }
  }

  async push(config: WebDavConfig, payload: {
    envelope: Record<string, unknown>;
    revision: number;
    contentHash: string;
  }): Promise<{ ok: true; meta: WebDavMeta }> {
    const normalized = this.normalizeConfig(config);
    const client = this.createClient(normalized);
    const paths = this.resolvePaths(normalized.basePath);

    if (!payload.envelope || typeof payload.envelope !== "object") {
      throw new BadRequestException("envelope 不能为空");
    }
    if (!Number.isInteger(payload.revision) || payload.revision < 0) {
      throw new BadRequestException("revision 不合法");
    }
    if (!payload.contentHash) {
      throw new BadRequestException("contentHash 不能为空");
    }

    try {
      await this.ensurePath(client, paths.basePath);
      await this.ensurePath(client, paths.versionsDir);

      // 覆盖前先做快照，保证误操作可回滚。
      const hasCurrent = await client.exists(paths.vaultFile);
      if (hasCurrent) {
        const stamp = new Date()
          .toISOString()
          .replace(/[:.]/g, "-");
        const backupVault = `${paths.versionsDir}/vault-${stamp}.enc`;
        const backupMeta = `${paths.versionsDir}/meta-${stamp}.json`;
        const oldEnvelope = (await client.getFileContents(paths.vaultFile, {
          format: "text"
        })) as string;
        await client.putFileContents(backupVault, oldEnvelope, { overwrite: true });

        if (await client.exists(paths.metaFile)) {
          const oldMeta = (await client.getFileContents(paths.metaFile, {
            format: "text"
          })) as string;
          await client.putFileContents(backupMeta, oldMeta, { overwrite: true });
        }
      }

      const nextMeta: WebDavMeta = {
        revision: payload.revision,
        contentHash: payload.contentHash,
        updatedAt: isoNow()
      };

      await client.putFileContents(
        paths.vaultFile,
        JSON.stringify(payload.envelope),
        { overwrite: true }
      );
      await client.putFileContents(paths.metaFile, JSON.stringify(nextMeta), {
        overwrite: true
      });

      await this.trimVersions(client, paths.versionsDir);
      this.appendLog("push", "success", "已推送 vault 到 WebDAV");
      return { ok: true, meta: nextMeta };
    } catch (error) {
      const message = this.sanitizeError(error);
      this.appendLog("push", "error", message);
      throw new BadRequestException(`WebDAV 推送失败: ${message}`);
    }
  }

  private normalizeConfig(config: WebDavConfig): Required<WebDavConfig> {
    const url = (config.url ?? "").trim();
    const username = (config.username ?? "").trim();
    const password = config.password ?? "";
    const basePath = (config.basePath ?? "/password-vault").trim() || "/password-vault";

    if (!url || !username || !password) {
      throw new BadRequestException("WebDAV 配置不完整");
    }
    return { url, username, password, basePath };
  }

  private createClient(config: Required<WebDavConfig>): WebDAVClient {
    return createClient(config.url, {
      username: config.username,
      password: config.password
    });
  }

  private resolvePaths(basePath: string): {
    basePath: string;
    vaultFile: string;
    metaFile: string;
    versionsDir: string;
  } {
    const normalized = basePath.startsWith("/") ? basePath : `/${basePath}`;
    return {
      basePath: normalized,
      vaultFile: `${normalized}/vault.enc`,
      metaFile: `${normalized}/meta.json`,
      versionsDir: `${normalized}/versions`
    };
  }

  private async ensurePath(client: WebDAVClient, path: string): Promise<void> {
    if (!(await client.exists(path))) {
      await client.createDirectory(path, { recursive: true });
    }
  }

  private async trimVersions(
    client: WebDAVClient,
    versionsDir: string
  ): Promise<void> {
    const entries = (await client.getDirectoryContents(versionsDir)) as FileStat[];
    const vaultBackups = entries
      .filter((entry) => entry.type === "file")
      .filter((entry) => entry.basename.startsWith("vault-"))
      .sort((a, b) => b.basename.localeCompare(a.basename));

    const toDelete = vaultBackups.slice(appConfig.webDavRetention);
    for (const backup of toDelete) {
      const stamp = backup.basename
        .replace(/^vault-/, "")
        .replace(/\.enc$/, "");
      const metaName = `meta-${stamp}.json`;
      const metaFile = `${versionsDir}/${metaName}`;

      await client.deleteFile(backup.filename);
      if (await client.exists(metaFile)) {
        await client.deleteFile(metaFile);
      }
    }
  }

  private appendLog(action: string, status: string, message: string): void {
    this.databaseService.connection
      .prepare(
        `
        INSERT INTO sync_logs (action, status, message, created_at)
        VALUES (?, ?, ?, ?)
      `
      )
      .run(action, status, message, isoNow());
  }

  private sanitizeError(error: unknown): string {
    if (error instanceof Error) {
      return error.message.slice(0, 240);
    }
    return "未知错误";
  }
}

