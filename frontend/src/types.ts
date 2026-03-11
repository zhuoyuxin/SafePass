export interface VaultEntry {
  id: string;
  title: string;
  url: string;
  username: string;
  password: string;
  note: string;
  tags: string[];
  customFields: Array<{ key: string; value: string }>;
  createdAt: string;
  updatedAt: string;
}

export interface WebDavConfig {
  url: string;
  username: string;
  password: string;
  basePath: string;
}

export interface VaultData {
  version: number;
  entries: VaultEntry[];
  webdavConfig?: WebDavConfig;
  lastWebdavSyncHash?: string;
  updatedAt: string;
}

export interface EncryptedVaultEnvelope {
  version: number;
  contentHash: string;
  kdf: {
    name: "argon2id";
    salt: string;
    params: {
      memorySize: number;
      iterations: number;
      parallelism: number;
      hashLength: number;
    };
  };
  cipher: {
    name: "aes-256-gcm";
    iv: string;
    aad: string;
  };
  ciphertext: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

