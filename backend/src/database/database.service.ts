import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { Injectable, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { DatabaseSync } from "node:sqlite";

import { appConfig } from "../config/app-config";
import {
  AUTH_ARGON2_PARAMS,
  deriveArgon2idBase64
} from "../utils/argon2.util";
import { isoNow, randomBase64 } from "../utils/crypto.util";

@Injectable()
export class DatabaseService implements OnModuleInit, OnModuleDestroy {
  private readonly db: DatabaseSync;

  constructor() {
    const dbFullPath = resolve(process.cwd(), appConfig.dbPath);
    mkdirSync(dirname(dbFullPath), { recursive: true });

    this.db = new DatabaseSync(dbFullPath);
    this.db.exec("PRAGMA journal_mode = WAL;");
    this.db.exec("PRAGMA foreign_keys = ON;");
  }

  get connection(): DatabaseSync {
    return this.db;
  }

  async onModuleInit(): Promise<void> {
    this.initializeSchema();
    await this.ensureBootstrapAdmin();
  }

  onModuleDestroy(): void {
    this.db.close();
  }

  private initializeSchema(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS admin_users (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        username TEXT NOT NULL UNIQUE,
        password_salt TEXT NOT NULL,
        password_hash TEXT NOT NULL,
        hash_memory INTEGER NOT NULL,
        hash_iterations INTEGER NOT NULL,
        hash_parallelism INTEGER NOT NULL,
        hash_length INTEGER NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        refresh_hash TEXT NOT NULL UNIQUE,
        device_fingerprint TEXT NOT NULL,
        created_at TEXT NOT NULL,
        expires_at TEXT NOT NULL,
        revoked_at TEXT
      );

      CREATE TABLE IF NOT EXISTS vault_state (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        envelope_json TEXT NOT NULL,
        revision INTEGER NOT NULL,
        content_hash TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS sync_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        action TEXT NOT NULL,
        status TEXT NOT NULL,
        message TEXT,
        created_at TEXT NOT NULL
      );
    `);
  }

  private async ensureBootstrapAdmin(): Promise<void> {
    const row = this.db
      .prepare("SELECT id FROM admin_users WHERE id = 1")
      .get() as { id: number } | undefined;

    if (row) {
      return;
    }

    // 首次启动时自动初始化唯一管理员，避免首版单用户流程再引入注册链路。
    const salt = randomBase64(16);
    const hash = await deriveArgon2idBase64(
      appConfig.adminPassword,
      salt,
      AUTH_ARGON2_PARAMS
    );
    const now = isoNow();

    this.db
      .prepare(
        `
        INSERT INTO admin_users (
          id, username, password_salt, password_hash,
          hash_memory, hash_iterations, hash_parallelism, hash_length,
          created_at, updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `
      )
      .run(
        1,
        appConfig.adminUsername,
        salt,
        hash,
        AUTH_ARGON2_PARAMS.memorySize,
        AUTH_ARGON2_PARAMS.iterations,
        AUTH_ARGON2_PARAMS.parallelism,
        AUTH_ARGON2_PARAMS.hashLength,
        now,
        now
      );
  }
}

