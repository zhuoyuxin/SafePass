import type { AuthTokens, EncryptedVaultEnvelope } from "../types";

export class ApiError extends Error {
  status: number;
  payload: unknown;

  constructor(message: string, status: number, payload: unknown) {
    super(message);
    this.status = status;
    this.payload = payload;
  }
}

interface VaultResponse {
  hasVault: boolean;
  envelope: EncryptedVaultEnvelope | null;
  revision: number;
  contentHash: string | null;
  updatedAt: string | null;
}

interface WebDavConfig {
  url: string;
  username: string;
  password: string;
  basePath: string;
}

const DEVICE_KEY = "pv_device_fingerprint";

const getDeviceFingerprint = (): string => {
  const existing = localStorage.getItem(DEVICE_KEY);
  if (existing) {
    return existing;
  }
  const next =
    typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  localStorage.setItem(DEVICE_KEY, next);
  return next;
};

const parseJson = async (response: Response): Promise<unknown> => {
  const text = await response.text();
  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
};

export class ApiClient {
  private readonly baseUrl: string;
  private tokens: AuthTokens | null = null;
  private readonly deviceFingerprint = getDeviceFingerprint();

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl.replace(/\/$/, "");
  }

  getTokens(): AuthTokens | null {
    return this.tokens;
  }

  setTokens(tokens: AuthTokens | null): void {
    this.tokens = tokens;
  }

  async login(username: string, password: string): Promise<{
    accessToken: string;
    refreshToken: string;
    username: string;
  }> {
    const result = await this.request<{
      accessToken: string;
      refreshToken: string;
      username: string;
    }>("/auth/login", {
      method: "POST",
      body: {
        username,
        password,
        deviceFingerprint: this.deviceFingerprint
      }
    });

    this.tokens = {
      accessToken: result.accessToken,
      refreshToken: result.refreshToken
    };
    return result;
  }

  async logout(): Promise<void> {
    if (!this.tokens?.refreshToken) {
      return;
    }
    await this.request(
      "/auth/logout",
      {
        method: "POST",
        body: {
          refreshToken: this.tokens.refreshToken
        }
      },
      false
    );
    this.tokens = null;
  }

  me(): Promise<{ id: number; username: string; role: "superadmin" }> {
    return this.request("/auth/me", { method: "GET" }, true);
  }

  changePassword(
    oldPassword: string,
    newPassword: string
  ): Promise<{ ok: true }> {
    return this.request(
      "/auth/change-password",
      {
        method: "POST",
        body: { oldPassword, newPassword }
      },
      true
    );
  }

  getVault(): Promise<VaultResponse> {
    return this.request("/vault", { method: "GET" }, true);
  }

  saveVault(
    envelope: EncryptedVaultEnvelope,
    expectedRevision: number
  ): Promise<{ revision: number; contentHash: string; updatedAt: string }> {
    return this.request(
      "/vault",
      {
        method: "PUT",
        body: {
          envelope,
          contentHash: envelope.contentHash,
          expectedRevision
        }
      },
      true
    );
  }

  webDavTest(config: WebDavConfig): Promise<{ ok: true }> {
    return this.request(
      "/sync/webdav/test",
      { method: "POST", body: { config } },
      true
    );
  }

  webDavPull(config: WebDavConfig): Promise<{
    found: boolean;
    envelope: EncryptedVaultEnvelope | null;
    meta: { revision: number; contentHash: string; updatedAt: string } | null;
  }> {
    return this.request(
      "/sync/webdav/pull",
      { method: "POST", body: { config } },
      true
    );
  }

  webDavPush(
    config: WebDavConfig,
    envelope: EncryptedVaultEnvelope,
    revision: number
  ): Promise<{
    ok: true;
    meta: { revision: number; contentHash: string; updatedAt: string };
  }> {
    return this.request(
      "/sync/webdav/push",
      {
        method: "POST",
        body: {
          config,
          envelope,
          revision,
          contentHash: envelope.contentHash
        }
      },
      true
    );
  }

  private async request<T>(
    path: string,
    options: {
      method: string;
      body?: unknown;
    },
    withAuth = true,
    allowRetry = true
  ): Promise<T> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json"
    };
    if (withAuth && this.tokens?.accessToken) {
      headers.Authorization = `Bearer ${this.tokens.accessToken}`;
    }

    const response = await fetch(`${this.baseUrl}${path}`, {
      method: options.method,
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined
    });

    if (response.status === 401 && withAuth && allowRetry && this.tokens?.refreshToken) {
      const refreshed = await this.refreshTokens();
      if (refreshed) {
        return this.request(path, options, withAuth, false);
      }
    }

    const payload = await parseJson(response);
    if (!response.ok) {
      const message =
        typeof payload === "object" &&
        payload !== null &&
        "message" in payload &&
        typeof (payload as { message?: unknown }).message === "string"
          ? (payload as { message: string }).message
          : `请求失败: ${response.status}`;
      throw new ApiError(message, response.status, payload);
    }

    return payload as T;
  }

  private async refreshTokens(): Promise<boolean> {
    if (!this.tokens?.refreshToken) {
      return false;
    }

    const response = await fetch(`${this.baseUrl}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        refreshToken: this.tokens.refreshToken,
        deviceFingerprint: this.deviceFingerprint
      })
    });

    if (!response.ok) {
      this.tokens = null;
      return false;
    }

    const payload = (await parseJson(response)) as {
      accessToken: string;
      refreshToken: string;
    };

    if (!payload?.accessToken || !payload?.refreshToken) {
      this.tokens = null;
      return false;
    }

    this.tokens = {
      accessToken: payload.accessToken,
      refreshToken: payload.refreshToken
    };
    return true;
  }
}

